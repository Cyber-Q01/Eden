import NetInfo from '@react-native-community/netinfo';

// ─── Error types ───────────────────────────────────────────────────────────────
export type AppErrorType = 'no_internet' | 'network' | 'server' | 'auth' | 'error' | 'validation' | 'unknown';

export interface AppError {
    type: AppErrorType;
    title: string;
    message: string;
    raw?: string; // the original error string for debugging
}

// ─── Friendly messages per type ────────────────────────────────────────────────
const ERROR_MAP: Record<AppErrorType, { title: string; message: string }> = {
    no_internet: {
        title: 'No Internet Connection',
        message: 'Please check your Wi-Fi or mobile data and try again.',
    },
    network: {
        title: 'Connection Problem',
        message: 'We couldn\'t reach our servers. Please try again in a moment.',
    },
    server: {
        title: 'Something Went Wrong',
        message: 'Our servers hit a snag. Please try again shortly.',
    },
    auth: {
        title: 'Authentication Error',
        message: 'Your session may have expired. Please sign in again.',
    },
    error: {
        title: 'Action Error',
        message: 'An error occurred while processing your request.',
    },
    validation: {
        title: 'Validation Error',
        message: 'Please check your inputs and try again.',
    },
    unknown: {
        title: 'Unexpected Error',
        message: 'Something went wrong. Please try again.',
    },
};

// ─── Classify an error into one of our types ──────────────────────────────────
function classifyError(error: any): AppErrorType {
    const msg = (error?.message || error?.toString() || '').toLowerCase();

    // Auth errors from Supabase
    if (
        msg.includes('jwt') ||
        msg.includes('token') ||
        msg.includes('not authenticated') ||
        msg.includes('invalid login') ||
        msg.includes('email not confirmed') ||
        msg.includes('session')
    ) {
        return 'auth';
    }

    // Network / fetch errors
    if (
        msg.includes('network request failed') ||
        msg.includes('failed to fetch') ||
        msg.includes('networkerror') ||
        msg.includes('econnrefused') ||
        msg.includes('timeout') ||
        msg.includes('aborted')
    ) {
        return 'network';
    }

    // Supabase / Postgres server errors
    if (
        msg.includes('500') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('internal server') ||
        msg.includes('relation') ||
        msg.includes('column') ||
        msg.includes('violates') ||
        msg.includes('duplicate key')
    ) {
        return 'server';
    }

    return 'unknown';
}

// ─── Main handler: call this from any hook / screen ───────────────────────────
export async function handleError(error: any): Promise<AppError> {
    // First, check if the device is actually offline
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
        return {
            type: 'no_internet',
            ...ERROR_MAP.no_internet,
            raw: error?.message,
        };
    }

    const type = classifyError(error);
    const friendly = ERROR_MAP[type];
    const rawMessage = error?.message || String(error);

    // If it's an unknown error but we have a specific message (e.g. from an Edge Function), 
    // use that message instead of the generic "Something went wrong"
    const displayMessage = (type === 'unknown' && rawMessage && !rawMessage.includes('Error'))
        ? rawMessage
        : friendly.message;

    return {
        type,
        title: friendly.title,
        message: displayMessage,
        raw: rawMessage,
    };
}

// ─── Convenience: wrap an async operation with error handling ──────────────────
// Returns { data, error } — `error` is a friendly AppError or null
export async function safeAsync<T>(
    fn: () => Promise<T>
): Promise<{ data: T | null; error: AppError | null }> {
    try {
        const data = await fn();
        return { data, error: null };
    } catch (e) {
        const error = await handleError(e);
        return { data: null, error };
    }
}
