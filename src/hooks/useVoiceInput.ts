import { useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// ─── Web Speech API type declarations ────────────────────────────────────────

interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface WebSpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
}

declare global {
    interface Window {
        SpeechRecognition: { new(): WebSpeechRecognition };
        webkitSpeechRecognition: { new(): WebSpeechRecognition };
    }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
    'not-allowed': 'Microphone access denied. Please enable it in your browser or device settings.',
    'audio-capture': 'No microphone detected. Please connect a microphone and try again.',
    'network': 'A network error occurred. Please check your connection.',
    'no-speech': 'No speech was detected. Please try again.',
    'aborted': 'Recording was cancelled.',
    'service-not-allowed': 'Speech recognition is not allowed. Try using HTTPS.',
    'bad-grammar': 'Could not understand the input. Please try again.',
    'language-not-supported': 'The selected language is not supported.',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceInput() {
    const isNative = Capacitor.isNativePlatform();

    // Ref to the active web recognition instance so stop() can reach it
    const webRecognitionRef = useRef<WebSpeechRecognition | null>(null);

    // ── Native listen (Capacitor plugin, partialResults: false) ─────────────

    const listenNative = async (): Promise<string> => {
        const { available } = await SpeechRecognition.available();
        if (!available) {
            throw new Error('Speech recognition is not available on this device.');
        }

        const permStatus = await SpeechRecognition.requestPermissions();
        if (permStatus.speechRecognition === 'denied') {
            throw new Error('Speech recognition permission denied. Please enable it in device settings.');
        }

        const result = await SpeechRecognition.start({
            language: 'en-US',
            maxResults: 5,
            partialResults: false,
            popup: false,
        });

        return result.matches?.[0] ?? '';
    };

    // ── Web listen (Web Speech API, continuous: false) ──────────────────────

    const listenWeb = (): Promise<string> => {
        const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionImpl) {
            return Promise.reject(new Error('Speech recognition is not supported in this browser.'));
        }

        return new Promise<string>((resolve, reject) => {
            const recognition = new SpeechRecognitionImpl();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            webRecognitionRef.current = recognition;

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        transcript += result[0].transcript;
                    }
                }
                resolve(transcript.trim());
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                webRecognitionRef.current = null;
                const message = ERROR_MESSAGES[event.error] ?? `Speech recognition error: ${event.error}`;
                reject(new Error(message));
            };

            recognition.onend = () => {
                webRecognitionRef.current = null;
                // If onresult never fired, resolve with empty string
                resolve('');
            };

            try {
                recognition.start();
            } catch (e) {
                webRecognitionRef.current = null;
                reject(new Error('Failed to start voice recording. Please try again.'));
            }
        });
    };

    // ── Public API ──────────────────────────────────────────────────────────

    const listen = useCallback(async (): Promise<string> => {
        if (isNative) {
            return listenNative();
        }
        return listenWeb();
    }, [isNative]);

    const stop = useCallback(async (): Promise<void> => {
        if (isNative) {
            try {
                await SpeechRecognition.stop();
            } catch {
                // no-op: not listening
            }
        } else {
            if (webRecognitionRef.current) {
                try {
                    webRecognitionRef.current.stop();
                } catch {
                    // no-op
                }
            }
        }
    }, [isNative]);

    // ── Number word normalisation ─────────────────────────────────────────────

    const normalizeNumberWords = (text: string): string => {
        const wordValues: Record<string, number> = {
            zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
            six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
            eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
            sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
            twenty: 20, thirty: 30, forty: 40, fifty: 50,
            sixty: 60, seventy: 70, eighty: 80, ninety: 90,
            hundred: 100, thousand: 1000,
        };

        const numWords = Object.keys(wordValues).join('|');
        const numWordRe = new RegExp(
            `\\b((?:${numWords})(?:[\\s\\-](?:and[\\s\\-])?(?:${numWords}))*?)\\b`,
            'gi'
        );

        const normalized = text.replace(/\ba\s+(hundred|thousand)\b/gi, 'one $1');

        return normalized.replace(numWordRe, (match) => {
            const words = match.toLowerCase().replace(/-/g, ' ').split(/\s+/).filter(w => w !== 'and');
            let total = 0, current = 0;
            for (const word of words) {
                const val = wordValues[word];
                if (val === undefined) return match;
                if (val === 1000) { total += (current || 1) * 1000; current = 0; }
                else if (val === 100) { current = (current || 1) * 100; }
                else { current += val; }
            }
            const result = total + current;
            return result > 0 ? String(result) : match;
        });
    };

    // ── Command parser ────────────────────────────────────────────────────────

    const currencyWords: Record<string, string> = {
        yen: 'jpy', jpy: 'jpy',
        taka: 'bdt', bdt: 'bdt', tk: 'bdt',
        rupee: 'inr', rupees: 'inr', rs: 'inr', inr: 'inr',
        dollar: 'usd', dollars: 'usd', usd: 'usd', buck: 'usd', bucks: 'usd',
        euro: 'eur', euros: 'eur', eur: 'eur',
        pound: 'gbp', gbp: 'gbp',
    };

    const currencyWordList = Object.keys(currencyWords).join('|');
    const fillerWords = /^(spent|paid|bought|for|at|on|in|from|to|the|a|an|my|some)\s+/i;
    const incomeKeywords = ['income', 'salary', 'wage', 'wages', 'pay', 'payment', 'earned', 'earnings', 'bonus', 'refund', 'received', 'deposit', 'credit'];

    const cleanMerchant = (merchant: string): string => {
        const currencyWordRegex = new RegExp(`\\b(${currencyWordList})\\b`, 'gi');
        return merchant
            .replace(currencyWordRegex, '')
            .replace(fillerWords, '')
            .replace(/\s+/g, ' ')
            .replace(/\s+for\s*$/i, '')
            .replace(/\s+at\s*$/i, '')
            .replace(/\s+on\s*$/i, '')
            .replace(/\s+in\s*$/i, '')
            .trim() || 'Unknown';
    };

    const parseCommand = (text: string) => {
        if (!text || text.trim().length === 0) {
            return { raw: text, currency: undefined };
        }

        const normalizedText = normalizeNumberWords(text.toLowerCase().trim());
        const rawText = text.trim();
        let detectedCurrency: string | undefined = undefined;
        let detectedType: 'expense' | 'income' = 'expense';

        const hasIncomeKeyword = incomeKeywords.some(k => normalizedText.includes(k));
        const expenseKeywords = ['spent', 'paid', 'bought', 'purchase', 'cost', 'expense', 'for', 'at'];
        const hasExpenseKeyword = expenseKeywords.some(k => normalizedText.includes(k));
        if (hasIncomeKeyword && !hasExpenseKeyword) detectedType = 'income';

        const currencyWordRegex = new RegExp(`\\b(${currencyWordList})\\b`, 'gi');
        const currencyMatch = normalizedText.match(currencyWordRegex);
        if (currencyMatch) {
            detectedCurrency = currencyWords[currencyMatch[currencyMatch.length - 1].toLowerCase()];
        }

        // Pattern 1: Currency symbols
        const currencySymbolPattern = /([a-z\s]+?)\s*[৳$€£¥]|(?:rs\.?\s*)\s*(\d+(?:[.,]\d{1,2})?)/gi;
        let match = currencySymbolPattern.exec(normalizedText);
        if (match) {
            const merchant = match[1]?.trim() || rawText.split(/[৳$€£¥]|rs\.?\s*\d/i)[0]?.trim();
            const amountStr = match[2] || rawText.match(/(\d+(?:[.,]\d{1,2})?)/)?.[1];
            if (amountStr) {
                return { amount: parseFloat(amountStr.replace(',', '.')), merchant: cleanMerchant(merchant ?? ''), raw: rawText, confidence: 'high', currency: detectedCurrency, type: detectedType };
            }
        }

        // Pattern 2: spent/paid X at/for Y
        const spentPattern = /(?:spent|paid)\s+(?:\$|৳|rs\.?\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:at|for|on)\s+(.+)/i;
        match = spentPattern.exec(normalizedText);
        if (match) return { amount: parseFloat(match[1].replace(',', '.')), merchant: cleanMerchant(match[2].trim()), raw: rawText, confidence: 'high', currency: detectedCurrency, type: 'expense' };

        // Pattern 3: X dollars/taka at/for Y
        const dollarsPattern = /(\d+(?:[.,]\d{1,2})?)\s*(?:dollars?|bucks?|taka|tk\.?)\s+(?:at|for|on)\s+(.+)/i;
        match = dollarsPattern.exec(normalizedText);
        if (match) return { amount: parseFloat(match[1].replace(',', '.')), merchant: cleanMerchant(match[2].trim()), raw: rawText, confidence: 'high', currency: detectedCurrency, type: detectedType };

        // Pattern 4: bought Y for X
        const boughtPattern = /bought\s+(.+?)\s+(?:for|at)\s+(?:\$|৳|rs\.?\s*)?(\d+(?:[.,]\d{1,2})?)/i;
        match = boughtPattern.exec(normalizedText);
        if (match) return { amount: parseFloat(match[2].replace(',', '.')), merchant: cleanMerchant(match[1].trim()), raw: rawText, confidence: 'high', currency: detectedCurrency, type: 'expense' };

        // Pattern 5: received/got/earned X from Y
        const incomePattern = /(?:received|got|earned)\s+(?:\$|৳|rs\.?\s*)?(\d+(?:[.,]\d{1,2})?)\s+(?:from|for)\s+(.+)/i;
        match = incomePattern.exec(normalizedText);
        if (match) return { amount: parseFloat(match[1].replace(',', '.')), merchant: cleanMerchant(match[2].trim()), raw: rawText, confidence: 'high', currency: detectedCurrency, type: 'income' };

        // Pattern 6: merchant + amount at end
        const endAmountPattern = /(.+?)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:dollars?|bucks?|taka|tk\.?|rs\.?|yen|euros?|pounds?|income|salary|wage)?\s*$/i;
        match = endAmountPattern.exec(normalizedText);
        if (match) return { amount: parseFloat(match[2].replace(',', '.')), merchant: cleanMerchant(match[1].trim()), raw: rawText, confidence: 'medium', currency: detectedCurrency, type: detectedType };

        // Pattern 7: just a number
        const amountOnlyPattern = /(?:\$|৳|rs\.?\s*)?(\d{1,5}(?:[.,]\d{1,2})?)(?:\s*(?:dollars?|bucks?|taka|tk\.?|rs\.?|yen|euros?|pounds?|income|salary))?/i;
        match = amountOnlyPattern.exec(normalizedText);
        if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            if (amount > 0 && amount < 100000) {
                const remaining = normalizedText.replace(match[0], '').trim();
                return { amount, merchant: cleanMerchant(remaining) || 'Unknown', raw: rawText, confidence: 'low', currency: detectedCurrency, type: detectedType };
            }
        }

        // Pattern 8: fallback
        const anyNumberPattern = /(\d+(?:[.,]\d{1,2})?)/;
        match = anyNumberPattern.exec(normalizedText);
        if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            const merchant = normalizedText.replace(match[0], '').trim();
            if (merchant.length > 0) return { amount, merchant: cleanMerchant(merchant), raw: rawText, confidence: 'low', currency: detectedCurrency, type: detectedType };
        }

        return { raw: rawText, confidence: 'none', currency: detectedCurrency, type: detectedType };
    };

    return { listen, stop, parseCommand };
}
