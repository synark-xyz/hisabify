import { useEffect, useRef, useCallback, useState } from 'react';
import { logger } from '@/lib/logger';
import { SuggestedCategory } from '@/types/localAI';

// Lazy-loaded TensorFlow modules to avoid bundle bloat
let tfModule: typeof import('@tensorflow/tfjs') | null = null;
let useModule: typeof import('@tensorflow-models/universal-sentence-encoder') | null = null;

const loadTensorFlow = async () => {
  if (!tfModule) {
    tfModule = await import('@tensorflow/tfjs');
  }
  return tfModule;
};

const loadUSE = async () => {
  if (!useModule) {
    useModule = await import('@tensorflow-models/universal-sentence-encoder');
  }
  return useModule;
};

interface ModelState {
  model: any | null; // UniversalSentenceEncoder model
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for loading and using TensorFlow.js with Universal Sentence Encoder
 * Lazy loads model on first use (non-blocking)
 */
export function useLocalAI() {
  const modelStateRef = useRef<ModelState>({
    model: null,
    isReady: false,
    isLoading: false,
    error: null,
  });

  const [state, setState] = useState<ModelState>({
    model: null,
    isReady: false,
    isLoading: false,
    error: null,
  });

  /**
   * Load the Universal Sentence Encoder model
   */
  const loadModel = useCallback(async (): Promise<any> => {
    // Return existing model if already loaded
    if (modelStateRef.current.model) {
      return modelStateRef.current.model;
    }

    // Return pending promise if loading
    if (modelStateRef.current.isLoading) {
      // Wait for model to load
      while (modelStateRef.current.isLoading && !modelStateRef.current.model) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (modelStateRef.current.model) {
        return modelStateRef.current.model;
      }
      throw modelStateRef.current.error || new Error('Model loading failed');
    }

    modelStateRef.current.isLoading = true;

    try {
      logger.debug('Loading Universal Sentence Encoder model...');

      // Lazy-load TensorFlow modules
      const tf = await loadTensorFlow();
      const use = await loadUSE();

      // Set backend to CPU (sufficient for inference on mobile)
      await tf.setBackend('cpu');

      // Load model
      const model = await use.load();

      modelStateRef.current.model = model;
      modelStateRef.current.isReady = true;
      modelStateRef.current.isLoading = false;

      setState({
        model,
        isReady: true,
        isLoading: false,
        error: null,
      });

      logger.debug('Universal Sentence Encoder model loaded successfully');
      return model;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      modelStateRef.current.error = error;
      modelStateRef.current.isLoading = false;

      setState({
        model: null,
        isReady: false,
        isLoading: false,
        error,
      });

      logger.error('Failed to load AI model', error);
      throw error;
    }
  }, []);

  /**
   * Initialize model on mount (background, non-blocking)
   */
  useEffect(() => {
    if (!modelStateRef.current.model && !modelStateRef.current.isLoading) {
      loadModel().catch(err => {
        logger.warn('AI model loading deferred', err);
        // Model loading failed, but app continues to work
        // User will get fallback to rule-based categorization
      });
    }
  }, [loadModel]);

  /**
   * Compute embedding for text
   */
  const getEmbedding = useCallback(
    async (text: string): Promise<Float32Array> => {
      if (!text.trim()) {
        throw new Error('Text cannot be empty');
      }

      try {
        const model = await loadModel();
        const embeddings = await model.embed([text.trim()]);
        const array = await embeddings.data() as Float32Array;
        embeddings.dispose();
        return array;
      } catch (err) {
        logger.error('Failed to compute embedding', err);
        throw err;
      }
    },
    [loadModel]
  );

  /**
   * Compute cosine similarity between two embeddings
   */
  const cosineSimilarity = useCallback((a: Float32Array, b: Float32Array): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, similarity)); // Clamp to [0, 1]
  }, []);

  /**
   * Find similar category by embedding
   */
  const findSimilarCategory = useCallback(
    async (
      merchant: string,
      categorySamples: Map<string, { categoryId: string; categoryName: string; embedding: Float32Array }>
    ): Promise<SuggestedCategory | null> => {
      try {
        if (categorySamples.size === 0) {
          return null;
        }

        const merchantEmbedding = await getEmbedding(merchant);

        let bestMatch: SuggestedCategory | null = null;
        let highestSimilarity = 0;

        for (const [, sample] of categorySamples) {
          const similarity = cosineSimilarity(merchantEmbedding, sample.embedding);

          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatch = {
              categoryId: sample.categoryId,
              categoryName: sample.categoryName,
              confidence: highestSimilarity,
              source: 'embedding',
            };
          }
        }

        return bestMatch && highestSimilarity > 0.3 ? bestMatch : null;
      } catch (err) {
        logger.warn('Embedding-based similarity search failed', err);
        return null;
      }
    },
    [getEmbedding, cosineSimilarity]
  );

  return {
    isReady: state.isReady,
    isLoading: state.isLoading,
    error: state.error,
    getEmbedding,
    findSimilarCategory,
    cosineSimilarity,
  };
}
