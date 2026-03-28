/**
 * Image Processing Utility for Client-Side OCR Optimization
 *
 * Two pipelines:
 * 1. compressForGemini() — compresses images for Gemini Vision API (new receipt scanning)
 * 2. preprocessImage()   — Tesseract.js preprocessing (kept for regex fallback path)
 */

interface ProcessingOptions {
    maxWidth?: number;
    quality?: number;
}

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

/**
 * Maps a currency code to the best Tesseract language string for that region.
 * Always includes 'eng' as base for mixed receipts (prices, brand names).
 *
 * Only includes languages where Tesseract has well-trained models (≥90% accuracy
 * on clean text). Latin-script currencies (EUR, USD, GBP, etc.) default to 'eng'
 * since Tesseract's English model handles all Latin alphabets adequately.
 */
export function getTesseractLangs(currencyCode: string): string {
    const map: Record<string, string> = {
        // East Asian
        JPY: 'eng+jpn',
        KRW: 'eng+kor',
        CNY: 'eng+chi_sim',
        TWD: 'eng+chi_tra',
        HKD: 'eng+chi_tra+chi_sim',
        MOP: 'eng+chi_tra+chi_sim',

        // Arabic script
        SAR: 'eng+ara',
        AED: 'eng+ara',
        EGP: 'eng+ara',
        QAR: 'eng+ara',
        KWD: 'eng+ara',
        BHD: 'eng+ara',
        OMR: 'eng+ara',
        JOD: 'eng+ara',
        IQD: 'eng+ara',
        DZD: 'eng+ara',
        MAD: 'eng+ara',
        LYD: 'eng+ara',
        TND: 'eng+ara',
        YER: 'eng+ara',
        PKR: 'eng+ara',

        // Indic scripts
        INR: 'eng+hin',
        LKR: 'eng+sin',
        NPR: 'eng+nep',
        BDT: 'eng+ben',

        // Southeast Asian
        THB: 'eng+tha',
        VND: 'eng+vie',
        KHR: 'eng+khm',

        // Cyrillic
        RUB: 'eng+rus',
        UAH: 'eng+ukr',
        BGN: 'eng+bul',
        RSD: 'eng+srp',
        MKD: 'eng+mkd',

        // Other non-Latin
        TRY: 'eng+tur', // Turkish uses Latin but has unique chars; tur model improves accuracy
        GEL: 'eng+kat',
        AMD: 'eng+hye',
        ETB: 'eng+amh',
    };

    return map[currencyCode?.toUpperCase()] ?? 'eng';
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
