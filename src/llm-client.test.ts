/**
 * Unit tests for LLM Client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildExtractionPrompt, callOpenClawLLM } from './llm-client.js';
import type { LLMConfig } from './types.js';

describe('buildExtractionPrompt', () => {
  it('should include the user message in the prompt', () => {
    const message = 'Saya punya toko sepatu bernama SepatuKu';
    const prompt = buildExtractionPrompt(message);

    expect(prompt).toContain(message);
  });

  it('should include extraction instructions for all BusinessContext fields', () => {
    const prompt = buildExtractionPrompt('test message');

    expect(prompt).toContain('business_name');
    expect(prompt).toContain('product_description');
    expect(prompt).toContain('price');
    expect(prompt).toContain('target_audience');
    expect(prompt).toContain('photo_url');
    expect(prompt).toContain('phone_number');
    expect(prompt).toContain('platforms');
  });

  it('should instruct the LLM to return JSON format', () => {
    const prompt = buildExtractionPrompt('test');

    expect(prompt).toContain('JSON');
    expect(prompt).toContain('extracted');
    expect(prompt).toContain('confidence');
  });

  it('should include supported platform names', () => {
    const prompt = buildExtractionPrompt('test');

    expect(prompt).toContain('instagram');
    expect(prompt).toContain('facebook');
    expect(prompt).toContain('tiktok');
    expect(prompt).toContain('twitter');
    expect(prompt).toContain('linkedin');
  });

  it('should instruct inference for missing fields', () => {
    const prompt = buildExtractionPrompt('test');

    expect(prompt).toContain('infer');
  });
});

describe('callOpenClawLLM', () => {
  const defaultConfig: LLMConfig = {
    model: 'test-model',
    maxTokens: 512,
    temperature: 0.3,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env['LLM_ENDPOINT'];
  });

  it('should return LLMResponse on successful call', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'test-model',
        response: '{"extracted": {"business_name": "Toko Sepatu"}, "confidence": {"business_name": 0.9}}',
        done: true,
        prompt_eval_count: 50,
        eval_count: 30,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await callOpenClawLLM('test prompt', defaultConfig);

    expect(result).not.toBeNull();
    expect(result!.content).toContain('business_name');
    expect(result!.usage.promptTokens).toBe(50);
    expect(result!.usage.completionTokens).toBe(30);
  });

  it('should return null when LLM endpoint is unavailable', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await callOpenClawLLM('test prompt', defaultConfig);

    expect(result).toBeNull();
  });

  it('should return null on non-OK HTTP response', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await callOpenClawLLM('test prompt', defaultConfig);

    expect(result).toBeNull();
  });

  it('should use LLM_ENDPOINT env var when set', async () => {
    process.env['LLM_ENDPOINT'] = 'http://custom-host:8080/api/generate';

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'test-model',
        response: 'test',
        done: true,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await callOpenClawLLM('test prompt', defaultConfig);

    expect(fetch).toHaveBeenCalledWith(
      'http://custom-host:8080/api/generate',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('should use default endpoint when LLM_ENDPOINT is not set', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'test-model',
        response: 'test',
        done: true,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await callOpenClawLLM('test prompt', defaultConfig);

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('should use config model in request body', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'custom-model',
        response: 'test',
        done: true,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await callOpenClawLLM('test prompt', { ...defaultConfig, model: 'custom-model' });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(callArgs![1]!.body as string) as { model: string };
    expect(body.model).toBe('custom-model');
  });

  it('should use default model when config model is undefined', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'growthcircle/gpt-5.4-free',
        response: 'test',
        done: true,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await callOpenClawLLM('test prompt', { ...defaultConfig, model: undefined });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(callArgs![1]!.body as string) as { model: string };
    expect(body.model).toBe('growthcircle/gpt-5.4-free');
  });

  it('should include temperature and maxTokens in request options', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'test-model',
        response: 'test',
        done: true,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await callOpenClawLLM('test prompt', { model: 'test', maxTokens: 1024, temperature: 0.7 });

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(callArgs![1]!.body as string) as {
      options: { temperature: number; num_predict: number };
    };
    expect(body.options.temperature).toBe(0.7);
    expect(body.options.num_predict).toBe(1024);
  });

  it('should set stream to false in request body', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'test-model',
        response: 'test',
        done: true,
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await callOpenClawLLM('test prompt', defaultConfig);

    const callArgs = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(callArgs![1]!.body as string) as { stream: boolean };
    expect(body.stream).toBe(false);
  });

  it('should handle missing usage fields gracefully', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        model: 'test-model',
        response: 'some content',
        done: true,
        // No prompt_eval_count or eval_count
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    const result = await callOpenClawLLM('test prompt', defaultConfig);

    expect(result).not.toBeNull();
    expect(result!.usage.promptTokens).toBe(0);
    expect(result!.usage.completionTokens).toBe(0);
  });
});
