import { describe, it, expect, vi, afterEach } from 'vitest';
import { callGeminiVision, GEMINI_KEY_MISSING } from '../geminiVision';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const call = () => callGeminiVision('AAAA', 'image/jpeg', 'USD');

describe('callGeminiVision api key guard', () => {
  it.each(['', 'your_gemini_api_key', 'YOUR-API-KEY', '<your key>', 'changeme'])(
    'rejects %j without calling the API',
    async (key) => {
      vi.stubEnv('VITE_GEMINI_API_KEY', key);
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      await expect(call()).rejects.toThrow(GEMINI_KEY_MISSING);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it('calls the API when a real-looking key is set', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'AIzaSyExampleKeyValueForTestOnly12345678');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"merchant":"X","amount":1}' }] } }],
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    await expect(call()).resolves.toMatchObject({ merchant: 'X', amount: 1, confidence: 'low' });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
