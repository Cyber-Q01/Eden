/**
 * Wraps a promise with a timeout.
 * 
 * @param promise The promise to wrap
 * @param timeoutMs Timeout duration in milliseconds (default: 15000)
 * @param errorMessage Custom error message (default: 'Request timed out. Please try again.')
 * @returns A promise that resolves or rejects with the original promise's result, or rejects with a timeout error
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 15000,
    errorMessage: string = 'Connection timed out. Please check your internet and try again.'
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(errorMessage));
            }, timeoutMs);
        })
    ]);
}
