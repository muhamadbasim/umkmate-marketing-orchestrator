/**
 * UMKMate Marketing Orchestrator — Pipeline Orchestrator
 *
 * Executes the two-step marketing pipeline sequentially:
 *   Step 1: Biver (landing page creation)
 *   Step 2: Repliz (social media content & scheduling)
 *
 * The Repliz step always runs, even if Biver fails — it receives
 * the LP URL on success or the WhatsApp fallback URL on failure.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 */

import type {
  BusinessContext,
  AgentConfig,
  AuditLogger,
  ExecutionSummary,
} from './types.js';
import { executeBiverStep } from './biver-step.js';
import { executeReplizStep } from './repliz-step.js';
import { compileSummary } from './summary.js';

/**
 * Executes the marketing pipeline in strict sequential order:
 * 1. Biver step — creates landing page (with retry + fallback)
 * 2. Repliz step — generates content & schedules posts (always runs)
 * 3. Compiles results into a single ExecutionSummary
 *
 * @param context - Validated BusinessContext
 * @param config - Agent configuration (API keys, retry options, etc.)
 * @param logger - Audit logger with correlation ID
 * @param correlationId - Unique ID for tracing this execution
 * @returns ExecutionSummary with overall status and details
 */
export async function executeMarketingPipeline(
  context: BusinessContext,
  config: AgentConfig,
  logger: AuditLogger,
  correlationId: string,
): Promise<ExecutionSummary> {
  logger.logEvent('info', 'pipeline_started', { business_name: context.business_name });

  // Step 1: Biver (landing page) — may succeed or fall back to WhatsApp link
  const biverResult = await executeBiverStep(context, config, logger);

  // Step 2: Repliz (social media) — always runs regardless of Biver outcome.
  // Uses the LP URL if Biver succeeded, otherwise uses the fallback URL.
  const destinationUrl = biverResult.lpUrl ?? biverResult.fallbackUrl;
  const replizResult = await executeReplizStep(context, destinationUrl, config, logger);

  // Step 3: Compile results from both steps into a single summary
  const summary = compileSummary(biverResult, replizResult, correlationId);

  logger.logEvent('info', 'pipeline_completed', { status: summary.status });

  return summary;
}
