/**
 * UMKMate Marketing Orchestrator — Context Extractor
 *
 * Parses LLM responses into structured BusinessContext.
 * Handles merging with existing profiles and identifying missing critical fields.
 *
 * Validates: Requirements 2.1, 2.2, 2.4, 2.5
 */

import type { BusinessContext, BusinessProfile } from './types.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractionResult {
  extracted: Partial<BusinessContext>;
  confidence: number; // 0-1
}

// ─── Critical Fields ─────────────────────────────────────────────────────────

const ALL_CONTEXT_FIELDS: readonly (keyof BusinessContext)[] = [
  'business_name',
  'product_description',
  'price',
  'target_audience',
  'photo_url',
  'phone_number',
  'platforms',
] as const;

// ─── Main Extraction ─────────────────────────────────────────────────────────

/**
 * Parse an LLM response string into a structured ExtractionResult.
 * Handles:
 * - Raw JSON
 * - JSON wrapped in markdown code blocks (```json ... ```)
 * - Partial/malformed JSON (best-effort)
 */
export function extractBusinessContext(llmResponse: string): ExtractionResult {
  const jsonStr = extractJsonString(llmResponse);

  if (!jsonStr) {
    return { extracted: {}, confidence: 0 };
  }

  try {
    const parsed: unknown = JSON.parse(jsonStr);
    const data = resolveExtractedObject(parsed);
    const extracted = mapToBusinessContext(data);
    const confidence = computeConfidence(extracted);
    return { extracted, confidence };
  } catch {
    return { extracted: {}, confidence: 0 };
  }
}

// ─── Merge With Profile ──────────────────────────────────────────────────────

/**
 * Merge extracted context with an existing BusinessProfile.
 * Current extraction takes precedence — profile only fills gaps.
 */
export function mergeWithProfile(
  extracted: Partial<BusinessContext>,
  profile: BusinessProfile | null,
): Partial<BusinessContext> {
  if (!profile) return { ...extracted };

  return {
    business_name: extracted.business_name ?? profile.business_name,
    product_description: extracted.product_description ?? profile.product_description,
    price: extracted.price ?? profile.price,
    target_audience: extracted.target_audience ?? profile.target_audience,
    photo_url: extracted.photo_url ?? profile.photo_url,
    phone_number: extracted.phone_number ?? profile.phone_number,
    platforms: extracted.platforms ?? profile.platforms,
  };
}

// ─── Missing Critical Fields ─────────────────────────────────────────────────

/**
 * Identify which critical fields (business_name, product_description, price)
 * are missing from the context. Price of 0 is valid; only undefined/null is missing.
 */
export function identifyMissingCritical(context: Partial<BusinessContext>): string[] {
  const missing: string[] = [];

  if (!context.business_name) {
    missing.push('business_name');
  }
  if (!context.product_description) {
    missing.push('product_description');
  }
  // price can be 0 (valid), so check for undefined/null specifically
  if (context.price === undefined || context.price === null) {
    missing.push('price');
  }

  return missing;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Extract a JSON string from an LLM response that may contain
 * markdown code blocks or surrounding text.
 */
function extractJsonString(response: string): string | null {
  const trimmed = response.trim();
  if (!trimmed) return null;

  // Try markdown code block: ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find a JSON object directly (first { to last })
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

/**
 * Resolve the parsed JSON to the actual extracted data object.
 * The LLM may return { extracted: {...}, confidence: {...} } or just the flat object.
 */
function resolveExtractedObject(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object') return {};

  const obj = parsed as Record<string, unknown>;

  // If the response has an "extracted" wrapper, use that
  if (obj['extracted'] && typeof obj['extracted'] === 'object') {
    return obj['extracted'] as Record<string, unknown>;
  }

  return obj;
}

/**
 * Map raw parsed data to a Partial<BusinessContext>, validating types.
 */
function mapToBusinessContext(data: Record<string, unknown>): Partial<BusinessContext> {
  const result: Partial<BusinessContext> = {};

  // business_name
  if (typeof data['business_name'] === 'string' && data['business_name'].trim()) {
    result.business_name = data['business_name'].trim();
  }

  // product_description
  if (typeof data['product_description'] === 'string' && data['product_description'].trim()) {
    result.product_description = data['product_description'].trim();
  }

  // price — accept number or numeric string
  if (typeof data['price'] === 'number' && isFinite(data['price'])) {
    result.price = data['price'];
  } else if (typeof data['price'] === 'string') {
    const parsed = parseFloat(data['price'].replace(/[^0-9.]/g, ''));
    if (isFinite(parsed)) {
      result.price = parsed;
    }
  }

  // target_audience
  if (typeof data['target_audience'] === 'string' && data['target_audience'].trim()) {
    result.target_audience = data['target_audience'].trim();
  }

  // photo_url
  if (typeof data['photo_url'] === 'string' && data['photo_url'].startsWith('https://')) {
    result.photo_url = data['photo_url'].trim();
  }

  // phone_number
  if (typeof data['phone_number'] === 'string' && data['phone_number'].trim()) {
    result.phone_number = data['phone_number'].trim();
  }

  // platforms
  if (Array.isArray(data['platforms'])) {
    const validPlatforms = ['instagram', 'facebook', 'tiktok', 'twitter', 'linkedin'];
    const platforms = data['platforms'].filter(
      (p): p is BusinessContext['platforms'] extends (infer U)[] | undefined ? U : never =>
        typeof p === 'string' && validPlatforms.includes(p),
    );
    if (platforms.length > 0) {
      result.platforms = platforms as BusinessContext['platforms'];
    }
  }

  return result;
}

/**
 * Compute a confidence score (0-1) based on how many fields were extracted.
 */
function computeConfidence(extracted: Partial<BusinessContext>): number {
  const totalFields = ALL_CONTEXT_FIELDS.length;
  let extractedCount = 0;

  for (const field of ALL_CONTEXT_FIELDS) {
    const value = extracted[field];
    if (value !== undefined && value !== null) {
      extractedCount++;
    }
  }

  return totalFields > 0 ? extractedCount / totalFields : 0;
}
