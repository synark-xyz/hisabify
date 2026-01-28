/**
 * Image Processing Utility for Client-Side OCR Optimization
 * Optimizes images for Tesseract.js by adjusting contrast, grayscale, and resolution.
 */

interface ProcessingOptions {
    maxWidth?: number;
    quality?: number;
}

export async function preprocessImage(file: File, options: ProcessingOptions = {}): Promise<string> {
    const { maxWidth = 1500, quality = 0.9 } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // 1. Resize (Maintain Aspect Ratio)
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw original
                ctx.drawImage(img, 0, 0, width, height);

                // 2. Grayscale & Binarization (High Contrast)
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    // Standard grayscale formula
                    const avg = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);

                    // Binarization (Thresholding)
                    // Threshold of 128 is standard, but for receipts (faded text), adaptive might be better.
                    // For now, simpler contrast stretch:
                    const contrast = 1.2; // Increase contrast by 20%
                    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
                    const color = factor * (avg - 128) + 128;

                    const final = Math.min(255, Math.max(0, color)); // Clamp

                    data[i] = final;     // R
                    data[i + 1] = final; // G
                    data[i + 2] = final; // B
                    // Alpha (data[i+3]) remains unchanged
                }

                ctx.putImageData(imageData, 0, 0);

                // Return optimized data URL
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
