import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhonwljtmlevpsiqgvvl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZob253bGp0bWxldnBzaXFndnZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODQ3MjgsImV4cCI6MjA3OTc2MDcyOH0.iZfUakrpf_D6PaoIoWXrz0lP9C7OyQmwrdZWHPRV3PE';

const TRANSIENT_ERROR_PATTERNS = [
  'refused stream',
  'networkerror',
  'failed to fetch',
  'fetch failed',
  'load failed',
  'http2',
];

function isTransientFetchError(error: unknown) {
  const message = String((error as Error)?.message || error || '').toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some(pattern => message.includes(pattern));
}

async function retryingFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = String(init?.method || 'GET').toUpperCase();
  const shouldRetry = method === 'GET' || method === 'HEAD';
  const maxAttempts = shouldRetry ? 3 : 1;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (!shouldRetry || !isTransientFetchError(error) || attempt === maxAttempts) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Supabase fetch failed');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: retryingFetch,
  },
});
