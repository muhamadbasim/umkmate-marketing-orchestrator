import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableError, delay } from './retry-handler.js';
import { ApiError, TimeoutError } from './types.js';
import type { RetryOptions } from './types.js';

const defaultOptions: RetryOptions = {
  maxRetries: 1,
  delayMs: 2_000,
  retryableStatuses: [429, 500, 502, 503, 504],
  retryOnTimeout: true,
};

describe('delay', () => {
  it('resolves after the specified time', async () => {
    vi.useFakeTimers();
    const promise = delay(100);
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe('isRetryableError', () => {
  it('returns true for TimeoutError when retryOnTimeout is true', () => {
    expect(isRetryableError(new TimeoutError(), defaultOptions)).toBe(true);
  });

  it('returns false for TimeoutError when retryOnTimeout is false', () => {
    const opts = { ...defaultOptions, retryOnTimeout: false };
    expect(isRetryableError(new TimeoutError(), opts)).toBe(false);
  });

  it('returns true for ApiError with 429 status', () => {
    expect(isRetryableError(new ApiError('rate limited', 429), defaultOptions)).toBe(true);
  });

  it('returns true for ApiError with 500 status', () => {
    expect(isRetryableError(new ApiError('server error', 500), defaultOptions)).toBe(true);
  });

  it('returns true for ApiError with 502 status', () => {
    expect(isRetryableError(new ApiError('bad gateway', 502), defaultOptions)).toBe(true);
  });

  it('returns true for ApiError with 503 status', () => {
    expect(isRetryableError(new ApiError('unavailable', 503), defaultOptions)).toBe(true);
  });

  it('returns true for ApiError with 504 status', () => {
    expect(isRetryableError(new ApiError('gateway timeout', 504), defaultOptions)).toBe(true);
  });

  it('returns false for ApiError with 400 status', () => {
    expect(isRetryableError(new ApiError('bad request', 400), defaultOptions)).toBe(false);
  });

  it('returns false for ApiError with 401 status', () => {
    expect(isRetryableError(new ApiError('unauthorized', 401), defaultOptions)).toBe(false);
  });

  it('returns false for ApiError with 403 status', () => {
    expect(isRetryableError(new ApiError('forbidden', 403), defaultOptions)).toBe(false);
  });

  it('returns false for ApiError with 404 status', () => {
    expect(isRetryableError(new ApiError('not found', 404), defaultOptions)).toBe(false);
  });

  it('returns true for unknown errors (network failures)', () => {
    expect(isRetryableError(new Error('ECONNRESET'), defaultOptions)).toBe(true);
  });
});

describe('withRetry', () => {
  it('returns the result on first success', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(op, defaultOptions);
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries once on 500 error and succeeds', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockRejectedValueOnce(new ApiError('server error', 500))
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(op, defaultOptions);
    await vi.advanceTimersByTimeAsync(defaultOptions.delayMs);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(op).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('retries once on 429 error and succeeds', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockRejectedValueOnce(new ApiError('rate limited', 429))
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(op, defaultOptions);
    await vi.advanceTimersByTimeAsync(defaultOptions.delayMs);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(op).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('retries once on TimeoutError and succeeds', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockRejectedValueOnce(new TimeoutError())
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(op, defaultOptions);
    await vi.advanceTimersByTimeAsync(defaultOptions.delayMs);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(op).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws immediately on non-retryable 4xx error', async () => {
    const op = vi.fn().mockRejectedValue(new ApiError('not found', 404));
    await expect(withRetry(op, defaultOptions)).rejects.toThrow(ApiError);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws immediately on 401 error', async () => {
    const op = vi.fn().mockRejectedValue(new ApiError('unauthorized', 401));
    await expect(withRetry(op, defaultOptions)).rejects.toThrow('unauthorized');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws after retry exhaustion on retryable error', async () => {
    const shortOpts: RetryOptions = { ...defaultOptions, delayMs: 10 };
    const serverError = new ApiError('server error', 500);
    const op = vi.fn()
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError);

    await expect(withRetry(op, shortOpts)).rejects.toThrow('server error');
    expect(op).toHaveBeenCalledTimes(2);
  });

  it('respects maxRetries configuration', async () => {
    const opts: RetryOptions = { ...defaultOptions, maxRetries: 2, delayMs: 10 };
    const serverError = new ApiError('server error', 500);
    const op = vi.fn()
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError);

    await expect(withRetry(op, opts)).rejects.toThrow('server error');
    expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('does not retry TimeoutError when retryOnTimeout is false', async () => {
    const opts: RetryOptions = { ...defaultOptions, retryOnTimeout: false };
    const op = vi.fn().mockRejectedValue(new TimeoutError());

    await expect(withRetry(op, opts)).rejects.toThrow(TimeoutError);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries unknown errors (network failures)', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce('recovered');

    const promise = withRetry(op, defaultOptions);
    await vi.advanceTimersByTimeAsync(defaultOptions.delayMs);
    const result = await promise;

    expect(result).toBe('recovered');
    expect(op).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
