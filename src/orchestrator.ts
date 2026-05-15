/**
 * UMKMate Marketing Orchestrator — Main Orchestrator
 *
 * Wires together the full execution flow:
 *   1. Parse input
 *   2. Load existing Business Profile (if user_id provided)
 *   3. Extract context from message via LLM (with direct JSON fallback)
 *   4. Merge extracted context with profile
 *   5. Check for missing critical fields → follow-up questions
 *   6. Validate merged context
 *   7. Persist/update Business Profile
 *   8. Execute marketing pipeline (Biver → Repliz)
 *
 * Validates: Requirements 2.3, 2.6, 3.1, 7.1, 9.1, 9.2, 9.3
 */

import type {
  OrchestratorInput,
  OrchestratorResponse,
  AgentConfig,
  BusinessContext,
} from './types.js';
import { createAuditLogger } from './logger.js';
import { createProfileManager } from './profile-manager.js';
import { buildExtractionPrompt, callOpenClawLLM } from './llm-client.js';
import {
  extractBusinessContext,
  mergeWithProfile,
  identifyMissingCritical,
} from './context-extractor.js';
import { buildFollowUpQuestion } from './follow-up.js';
import { validateBusinessContext } from './validator.js';
import { executeMarketingPipeline } from './pipeline.js';

/**
 * Main orchestrator entry point. Accepts a natural language message,
 * extracts business context, validates, persists profile, and executes
 * the marketing pipeline.
 *
 * @param input - The orchestrator input containing message and optional user_id
 * @param config - Full agent configuration
 * @param questionsAsked - Number of follow-up questions already asked (for recursion)
 */
export async function executeOrchestrator(
  input: OrchestratorInput,
  config: AgentConfig,
  questionsAsked: number = 0,
): Promise<OrchestratorResponse> {
  const logger = createAuditLogger(config.logger);
  const profileManager = createProfileManager(config.profile.profilePath);

  logger.logEvent('info', 'orchestrator_start', {
    hasUserId: !!input.user_id,
    messageLength: input.message.length,
    questionsAsked,
  });

  // 1. Load existing profile (if user_id provided)
  const existingProfile = input.user_id
    ? await profileManager.load(input.user_id)
    : null;

  // 2. Extract context from message via LLM
  const prompt = buildExtractionPrompt(input.message);
  const llmResponse = await callOpenClawLLM(prompt, config.llm);

  let extracted: Partial<BusinessContext>;
  if (llmResponse) {
    const result = extractBusinessContext(llmResponse.content);
    extracted = result.extracted;
    logger.logEvent('info', 'context_extracted_via_llm', {
      confidence: result.confidence,
      fieldsExtracted: Object.keys(extracted).filter(
        (k) => extracted[k as keyof typeof extracted] !== undefined,
      ),
    });
  } else {
    // LLM unavailable — try direct JSON parse of message
    extracted = tryDirectParse(input.message);
    logger.logEvent('info', 'context_extracted_via_direct_parse', {
      fieldsExtracted: Object.keys(extracted).filter(
        (k) => extracted[k as keyof typeof extracted] !== undefined,
      ),
    });
  }

  // 3. Merge with profile (current message takes precedence)
  const merged = mergeWithProfile(extracted, existingProfile);

  // 4. Check for missing critical fields
  const missingFields = identifyMissingCritical(merged);

  if (missingFields.length > 0) {
    const followUp = buildFollowUpQuestion(missingFields, questionsAsked);
    if (followUp) {
      logger.logEvent('info', 'follow_up_asked', {
        missingFields,
        questionsAsked,
        questionsRemaining: followUp.questionsRemaining,
      });
      return followUp;
    }
    // Max questions reached — proceed with what we have
    logger.logEvent('warn', 'max_follow_ups_reached', { missingFields });
  }

  // 5. Validate the merged context
  const validation = validateBusinessContext(merged);
  if (!validation.success) {
    logger.logEvent('warn', 'validation_failed', { errors: validation.errors });
    return {
      type: 'error',
      errors: validation.errors,
      correlationId: logger.getCorrelationId(),
    };
  }

  const validContext = validation.data;

  // 6. Persist/update profile
  if (input.user_id) {
    try {
      if (existingProfile) {
        await profileManager.update(input.user_id, validContext);
        logger.logEvent('info', 'profile_updated', { userId: input.user_id });
      } else {
        await profileManager.save(input.user_id, validContext);
        logger.logEvent('info', 'profile_saved', { userId: input.user_id });
      }
    } catch (error) {
      // Profile persistence failure is non-fatal — log and continue
      logger.logError('profile_persist', error);
    }
  }

  // 7. Execute pipeline (Biver → Repliz)
  logger.logEvent('info', 'pipeline_start', { correlationId: logger.getCorrelationId() });
  return executeMarketingPipeline(validContext, config, logger, logger.getCorrelationId());
}

/**
 * Attempts to parse the message directly as JSON when the LLM is unavailable.
 * This supports structured input scenarios (e.g., webhook payloads, testing).
 *
 * Returns an empty object if parsing fails — the orchestrator will then
 * rely on the existing profile or ask follow-up questions.
 */
export function tryDirectParse(message: string): Partial<BusinessContext> {
  try {
    const trimmed = message.trim();
    if (!trimmed.startsWith('{')) return {};

    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') return {};

    const obj = parsed as Record<string, unknown>;
    const result: Partial<BusinessContext> = {};

    if (typeof obj['business_name'] === 'string' && obj['business_name'].trim()) {
      result.business_name = obj['business_name'].trim();
    }

    if (typeof obj['product_description'] === 'string' && obj['product_description'].trim()) {
      result.product_description = obj['product_description'].trim();
    }

    if (typeof obj['price'] === 'number' && isFinite(obj['price'])) {
      result.price = obj['price'];
    } else if (typeof obj['price'] === 'string') {
      const numericPrice = parseFloat(obj['price'].replace(/[^0-9.]/g, ''));
      if (isFinite(numericPrice)) {
        result.price = numericPrice;
      }
    }

    if (typeof obj['target_audience'] === 'string' && obj['target_audience'].trim()) {
      result.target_audience = obj['target_audience'].trim();
    }

    if (typeof obj['photo_url'] === 'string' && obj['photo_url'].startsWith('https://')) {
      result.photo_url = obj['photo_url'].trim();
    }

    if (typeof obj['phone_number'] === 'string' && obj['phone_number'].trim()) {
      result.phone_number = obj['phone_number'].trim();
    }

    if (Array.isArray(obj['platforms'])) {
      const validPlatforms = ['instagram', 'facebook', 'tiktok', 'twitter', 'linkedin'];
      const platforms = obj['platforms'].filter(
        (p): p is BusinessContext['platforms'] extends (infer U)[] | undefined ? U : never =>
          typeof p === 'string' && validPlatforms.includes(p),
      );
      if (platforms.length > 0) {
        result.platforms = platforms as BusinessContext['platforms'];
      }
    }

    return result;
  } catch {
    return {};
  }
}
