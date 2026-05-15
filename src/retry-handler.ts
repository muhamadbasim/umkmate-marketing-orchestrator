/**
 * UMKMate Marketing Orchestrator — Retry Handler
 *
 * Generic retry utility: retries once on 5xx/429/timeout errors
 * after a configurable delay. Throws immediately on non-retryable
 * errors (4xx except 429).
 */

import { ApiError, TimeoutError } from './types.js';
import type { RetryOptions } from './types.js';

/**
 * Delays execution for the specified number of milliseconds.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determines whether an error is retryable based on the retry options.
 *
 * Retryable errors:
 * - TimeoutError (if retryOnTimeout is enabled)
 * - ApiError with a status code in retryableStatuses (5xx, 429)
 *
 * Non-retryable errors:
 * - ApiError with 4xx status codes (except 429)
 * - Any other ApiError not in retryableStatuses
 */
export function isRetryableError(error: unknown, options: RetryOptions): boolean {
  if (error instanceof TimeoutError) {
    return options.retryOnTimeout;
  }
  if (error instanceof ApiError) {
    return options.retryableStatuses.includes(error.statusCode);
  }
  // Unknown errors (network failures, etc.) are retryable
  return true;
}

/**
 * Executes an async operation with retry support.
 *
 * - Retries up to `options.maxRetries` times on retryable errors
 * - Waits `options.delayMs` between attempts
 * - Throws immediately on non-retryable errors (4xx except 429)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;

      // Throw immediately if the error is not retryable
      if (!isRetryableError(error, options)) {
        throw error;
      }

      // Throw if we've exhausted all retries
      if (attempt >= options.maxRetries) {
        throw error;
      }

      // Wait before retrying
      await delay(options.delayMs);
    }
  }

  // Should never reach here, but TypeScript requires it
  throw lastError;
}
