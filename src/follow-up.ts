/**
 * Follow-Up Handler
 *
 * Manages follow-up questions in Bahasa Indonesia when critical business
 * information is missing from the user's message. Enforces a maximum of
 * 3 follow-up questions before proceeding with available data.
 *
 * Validates: Requirements 2.3, 2.6, 9.4
 */

import type { FollowUpResponse } from './types.js';

export const MAX_FOLLOW_UP_QUESTIONS = 3;

/**
 * Field labels in Bahasa Indonesia for user-friendly follow-up questions.
 */
const FIELD_LABELS: Record<string, string> = {
  business_name: 'nama bisnis',
  product_description: 'deskripsi produk (minimal 20 karakter)',
  price: 'harga produk (dalam Rupiah)',
};

/**
 * Builds a follow-up question in Bahasa Indonesia referencing missing fields.
 *
 * Returns null when:
 * - questionsAsked >= MAX_FOLLOW_UP_QUESTIONS (proceed with what we have)
 * - missingFields is empty (nothing to ask about)
 */
export function buildFollowUpQuestion(
  missingFields: string[],
  questionsAsked: number,
): FollowUpResponse | null {
  if (questionsAsked >= MAX_FOLLOW_UP_QUESTIONS) return null;
  if (missingFields.length === 0) return null;

  const question = formatFollowUpQuestion(missingFields);

  return {
    type: 'follow_up',
    question,
    missingFields,
    questionsRemaining: MAX_FOLLOW_UP_QUESTIONS - questionsAsked - 1,
  };
}

/**
 * Formats a friendly Bahasa Indonesia question combining all missing fields.
 */
function formatFollowUpQuestion(missingFields: string[]): string {
  const labels = missingFields.map((f) => FIELD_LABELS[f] ?? f);

  if (labels.length === 1) {
    return `Mohon informasikan ${labels[0]} Anda agar saya bisa melanjutkan.`;
  }

  return `Saya butuh beberapa informasi tambahan: ${labels.join(', ')}. Mohon berikan detailnya.`;
}
