import { useState, useEffect, useRef } from 'react';
import { usePermissions } from './usePermissions';

// Type definitions for Web Speech API
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

interface SpeechRecognition extends EventTarget {
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
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

export function useVoiceInput() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const { ensurePermission } = usePermissions();

    useEffect(() => {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError('Browser not supported');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Update transcript with what we have (prioritizing current interim or final)
            setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error', event.error);
            setError(event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }, []);

    const startListening = async () => {
        if (recognitionRef.current && !isListening) {
            setTranscript('');
            setError(null);

            // Request microphone permission first
            const hasPermission = await ensurePermission('microphone');
            if (!hasPermission) {
                setError('Microphone access denied. Please enable in device settings.');
                return;
            }

            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error("Failed to start speech recognition:", e);
                setError('Failed to start voice recording. Please try again.');
            }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    const toggleListening = async () => {
        if (isListening) {
            stopListening();
        } else {
            await startListening();
        }
    };

    // Enhanced parser with multiple patterns to extract amount and merchant
    // Handles various natural language patterns
    const parseCommand = (text: string) => {
        const lowerText = text.toLowerCase().trim();

        // Pattern 1: "spent/paid X at/for Y" → amount first
        // E.g., "spent 20 at Starbucks", "paid 50 for groceries"
        const pattern1 = /(?:spent|paid)\s+(\d+(?:[.,]\d{1,2})?)\s+(?:at|for)\s+(.+)/i;
        const match1 = lowerText.match(pattern1);
        if (match1) {
            return {
                amount: parseFloat(match1[1].replace(',', '.')),
                merchant: match1[2].trim(),
                raw: text
            };
        }

        // Pattern 2: "X dollars/bucks at/for Y"
        // E.g., "15 dollars at McDonald's", "20 bucks for coffee"
        const pattern2 = /(\d+(?:[.,]\d{1,2})?)\s+(?:dollars?|bucks?)\s+(?:at|for)\s+(.+)/i;
        const match2 = lowerText.match(pattern2);
        if (match2) {
            return {
                amount: parseFloat(match2[1].replace(',', '.')),
                merchant: match2[2].trim(),
                raw: text
            };
        }

        // Pattern 3: "bought Y for X"
        // E.g., "bought coffee for 5", "bought lunch for 12.50"
        const pattern3 = /bought\s+(.+?)\s+for\s+(\d+(?:[.,]\d{1,2})?)/i;
        const match3 = lowerText.match(pattern3);
        if (match3) {
            return {
                amount: parseFloat(match3[2].replace(',', '.')),
                merchant: match3[1].trim(),
                raw: text
            };
        }

        // Pattern 4: "Merchant Amount" (original pattern, fallback)
        // E.g., "Starbucks 5 dollars", "Pizza 25"
        const pattern4 = /(.+?)\s+(\d+(?:[.,]\d{1,2})?)\s*(?:dollars?|bucks?)?$/i;
        const match4 = lowerText.match(pattern4);
        if (match4) {
            return {
                amount: parseFloat(match4[2].replace(',', '.')),
                merchant: match4[1].trim(),
                raw: text
            };
        }

        // No match - return raw text only
        return { raw: text };
    };

    return {
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        toggleListening,
        parseCommand
    };
}
