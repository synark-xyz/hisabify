import { z } from 'zod';

/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables at runtime.
 * Throws descriptive errors if variables are missing or invalid.
 */

const envSchema = z.object({
  // Supabase - Required
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required'),
  
  // Optional with defaults
  VITE_SUPABASE_PROJECT_ID: z.string().optional(),
  VITE_APP_URL: z.string().url().optional(),
  VITE_APP_NAME: z.string().default('Hisabify'),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_ENABLE_ANALYTICS: z.string().transform(v => v === 'true').default('false'),
  
  // Node environment
  MODE: z.enum(['development', 'production', 'test']).default('development'),
});

type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const rawEnv = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID,
    VITE_APP_URL: import.meta.env.VITE_APP_URL,
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS,
    MODE: import.meta.env.MODE,
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(', ')}`)
      .join('\n');
    
    console.error('❌ Environment validation failed:\n' + errorMessages);
    
    // In development, show detailed errors
    if (import.meta.env.DEV) {
      throw new Error(`Environment validation failed:\n${errorMessages}`);
    }
  }

  return result.data as Env;
}

export const env = validateEnv();

export const isDev = env.MODE === 'development';
export const isProd = env.MODE === 'production';
export const isTest = env.MODE === 'test';
