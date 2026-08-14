import { supabase } from './supabase';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiOptions {
  /** Override the default 15s timeout */
  timeout?: number;
}

const DEFAULT_TIMEOUT = 15000;

/**
 * Central API client for calling Supabase Edge Functions.
 *
 * - Uses supabase.functions.invoke (handles auth + anon key automatically)
 * - Enforces a global timeout so the app never hangs forever
 * - Returns parsed JSON or throws a descriptive Error
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  method: HttpMethod = 'GET',
  body?: Record<string, any> | null,
  params?: Record<string, string>,
  options?: ApiOptions,
): Promise<T> {
  // Build query string path if params provided
  let path = functionName;
  if (params && Object.keys(params).length > 0) {
    const cleanParams: Record<string, string> = {};
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        cleanParams[key] = String(val);
      }
    });
    
    if (Object.keys(cleanParams).length > 0) {
      const query = new URLSearchParams(cleanParams).toString();
      path += `?${query}`;
    }
  }
  // Ensure we have a valid session before invoking
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please sign in again.');
  }
  // Race invoke against timeout
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  let timer: NodeJS.Timeout;

  try {
    console.log(`(api.ts) Invoking edge function: ${path}`);

    const invokePromise = supabase.functions.invoke<T>(path, {
      method,
      body: body ?? undefined,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        reject(error);
      }, timeout);
    });

    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

    clearTimeout(timer!);

    if (error) {
      let message = error.message;
      const context = (error as any).context;

      // Supabase's 'FunctionsHttpError' often hides the real error in 'context'
      if (context instanceof Response) {
        try {
          const body = await context.json();
          message = body.error || body.message || body.msg || message;
        } catch {
          try {
            const text = await context.text();
            if (text && text.length < 200) message = text;
          } catch { /* ignore */ }
        }
      } else if (context && typeof context === 'object') {
        // Handle cases where context is already parsed (older versions or custom)
        const ctx = context as any;
        message = ctx.error || ctx.message || ctx.json?.error || ctx.text || message;
      }

      // If we're still stuck with the generic message, fallback to a friendly default
      if (message === 'Edge Function returned a non-2xx status code') {
        message = 'Something went wrong. Please try again or contact support.';
      }

      console.log(`(api.ts) Extracted UX Error: ${message}`);
      throw new Error(String(message));
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timer);
    console.error('(api.ts) Error caught:', error);

    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000}s. Pull down to retry.`);
    }

    throw error;
  }
}