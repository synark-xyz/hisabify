/**
 * Image Processing Utility for Client-Side OCR Optimization
 *
 * compressForGemini() — compresses images for the Gemini Vision receipt scanner.
 */

/**
 * Compress image for Gemini Vision API.
 * Reduces 3-8MB phone photos to ~100-200KB while preserving text readability.
 * Uses JPEG quality 0.7 + 1024px max dimension.
 *
 * @param file - Raw image File from camera or gallery
 * @returns base64 string (no data: prefix) and mimeType
 */
export async function compressForGemini(file: File): Promise<{
    base64: string;
    mimeType: string;
}> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 1024; // 1024px max dimension for Gemini

                let { width, height } = img;
                if (width > MAX_SIZE || height > MAX_SIZE) {
                    const scale = MAX_SIZE / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }

                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

                // Quality 0.7 → ~100-200KB for receipt photo (vs 3-8MB raw)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');

                resolve({ base64, mimeType: 'image/jpeg' });
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
