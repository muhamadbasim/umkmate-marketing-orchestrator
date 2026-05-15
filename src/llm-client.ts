/**
 * UMKMate Marketing Orchestrator Agent — LLM Client
 *
 * Interface to OpenClaw's built-in LLM for context extraction.
 * Uses a configurable HTTP endpoint (Ollama-compatible by default).
 * Gracefully returns null when the LLM is unavailable.
 *
 * Requirements: 2.1
 */

import type { LLMConfig, LLMResponse } from './types.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_LLM_ENDPOINT = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'growthcircle/gpt-5.4-free';
const REQUEST_TIMEOUT_MS = 30_000;

// ─── Extraction Prompt ───────────────────────────────────────────────────────

/**
 * Build the system+user prompt that instructs the LLM to extract
 * BusinessContext fields from a natural language message.
 *
 * The prompt instructs the LLM to return JSON with:
 * - extracted: object with business context fields
 * - confidence: object with 0-1 confidence per field
 */
export function buildExtractionPrompt(message: string): string {
  const systemPrompt = `Kamu adalah AI extractor untuk data bisnis UMKM Indonesia.
Dari pesan user, ekstrak field berikut dalam format JSON:
- business_name: nama bisnis (string, 1-100 karakter)
- product_description: deskripsi produk/jasa (string, min 20 karakter)
- price: harga dalam Rupiah (number, >= 0)
- target_audience: target audiens (string, opsional)
- photo_url: URL foto produk (string HTTPS, opsional)
- phone_number: nomor WA (string format 628xxx, opsional)
- platforms: platform sosmed target (array of: instagram, facebook, tiktok, twitter, linkedin)

Jika field tidak disebutkan eksplisit, infer dari konteks:
- target_audience: infer dari jenis produk/bisnis
- platforms: infer dari kategori bisnis
- price: jika tidak disebutkan, set null

Return JSON object dengan field "extracted" (data) dan "confidence" (0-1 per field).
HANYA return JSON, tanpa penjelasan tambahan.`;

  return `${systemPrompt}\n\n---\nPesan user:\n${message}`;
}

// ─── LLM Client ──────────────────────────────────────────────────────────────

/**
 * Call the OpenClaw LLM endpoint to generate a response.
 *
 * Makes an HTTP POST to the configured LLM endpoint (Ollama-compatible format).
 * Returns null gracefully if the LLM is unavailable (network error, timeout, etc.)
 * so the orchestrator can fall back to direct input parsing.
 */
export async function callOpenClawLLM(
  prompt: string,
  config: LLMConfig,
): Promise<LLMResponse | null> {
  const endpoint = process.env['LLM_ENDPOINT'] ?? DEFAULT_LLM_ENDPOINT;
  const model = config.model ?? DEFAULT_MODEL;

  const requestBody = {
    model,
    prompt,
    stream: false,
    options: {
      temperature: config.temperature,
      num_predict: config.maxTokens,
    },
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as OllamaGenerateResponse;

    return {
      content: data.response ?? '',
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
      },
    };
  } catch {
    // LLM unavailable — return null for graceful fallback
    return null;
  }
}

// ─── Internal Types ──────────────────────────────────────────────────────────

/**
 * Ollama-compatible /api/generate response shape.
 */
interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}
