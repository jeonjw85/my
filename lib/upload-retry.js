// @ts-check

/** @typedef {(delayMs: number) => Promise<void>} RetryWait */

/** @type {RetryWait} */
const defaultWait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

/** @param {unknown} error */
function isRetryable(error) {
    if (error instanceof TypeError) return true;
    if (!(error instanceof Error) || !("status" in error)) return false;

    const status = error.status;
    return typeof status === "number" &&
        (status === 408 || status === 409 || status === 429 ||
            (status >= 500 && status <= 599));
}

/**
 * @template T
 * @param {() => Promise<T>} operation
 * @param {RetryWait} [wait]
 * @returns {Promise<T>}
 */
export async function retryUploadOperation(operation, wait = defaultWait) {
    const maxAttempts = 3;
    for (let attempt = 1;; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            if (attempt >= maxAttempts || !isRetryable(error)) throw error;
            await wait(100 * 2 ** (attempt - 1));
        }
    }
}
