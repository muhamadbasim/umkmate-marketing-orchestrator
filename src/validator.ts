/**
 * UMKMate Marketing Orchestrator — Input Validator
 *
 * Uses Zod for runtime schema validation of BusinessContext.
 * Returns all validation errors at once (no early exit).
 */

import { z } from 'zod';
import type { BusinessContext, ValidationResult } from './types.js';

export const SUPPORTED_PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'twitter',
  'linkedin',
] as const;

export const businessContextSchema = z.object({
  business_name: z
    .string({ required_error: 'business_name is required' })
    .min(1, 'business_name must not be empty')
    .max(100, 'business_name must be at most 100 characters')
    .transform((s) => s.trim()),
  product_description: z
    .string({ required_error: 'product_description is required' })
    .min(20, 'product_description must be at least 20 characters')
    .max(2000, 'product_description must be at most 2000 characters')
    .transform((s) => s.trim()),
  price: z
    .number({
      required_error: 'price is required',
      invalid_type_error: 'price must be a number',
    })
    .min(0, 'price must be >= 0')
    .finite('price must be a finite number'),
  target_audience: z
    .string()
    .max(500, 'target_audience must be at most 500 characters')
    .optional(),
  photo_url: z
    .string()
    .url('photo_url must be a valid URL')
    .refine((url) => url.startsWith('https://'), {
      message: 'photo_url must use HTTPS',
    })
    .optional(),
  phone_number: z.string().optional(),
  platforms: z
    .array(z.enum(SUPPORTED_PLATFORMS))
    .optional(),
});

/**
 * Validates a BusinessContext input using Zod schema.
 * Returns all validation errors at once (safeParse does not early-exit).
 */
export function validateBusinessContext(input: unknown): ValidationResult<BusinessContext> {
  const result = businessContextSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data as BusinessContext };
  }

  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { success: false, errors };
}
