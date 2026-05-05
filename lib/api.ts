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
    const query = new URLSearchParams(params).toString();
    path += `?${query}`;
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
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
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
      // FunctionsHttpError carries a context with the response body
      const message =
        (error as any)?.context?.json?.error ||
        error.message ||
        'An unexpected error occurred.';
      throw new Error(message);
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