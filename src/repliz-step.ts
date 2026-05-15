/**
 * UMKMate Marketing Orchestrator — Repliz Step
 *
 * Handles social media content generation, scheduling auto-posts,
 * and activating auto-reply DM. Includes retry logic and graceful
 * degradation on failure.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import type {
  BusinessContext,
  AgentConfig,
  AuditLogger,
  ReplizStepResult,
  ContentPost,
} from './types.js';
import { createReplizClient } from './repliz-client.js';
import { withRetry } from './retry-handler.js';
import { buildAutoReplyMessage } from './auto-reply.js';

/**
 * Executes the Repliz step of the marketing pipeline:
 * 1. Generates minimum 3 content variations
 * 2. Schedules auto-posts (defaults to all connected platforms when none specified)
 * 3. Activates auto-reply DM with product info and destination URL
 *
 * Wrapped in retry handler; returns graceful degradation result on failure.
 */
export async function executeReplizStep(
  context: BusinessContext,
  destinationUrl: string,
  config: AgentConfig,
  logger: AuditLogger,
): Promise<ReplizStepResult> {
  const client = createReplizClient(config.repliz);

  try {
    // 1. Generate content (minimum 3 variations)
    const content = await withRetry(
      () =>
        client.generateContent({
          productDescription: context.product_description,
          targetAudience: context.target_audience,
          landingPageUrl: destinationUrl,
          variationCount: 3,
        }),
      config.retry,
    );

    // 2. Schedule auto-posts — empty platforms array means all connected platforms
    const platforms = context.platforms ?? [];
    const scheduled = await withRetry(
      () =>
        client.scheduleAutoPost({
          content: content.variations,
          platforms: platforms.length > 0 ? platforms : undefined,
        }),
      config.retry,
    );

    // 3. Activate auto-reply DM
    const autoReplyMessage = buildAutoReplyMessage(context, destinationUrl);
    await withRetry(
      () => client.activateAutoReply({ message: autoReplyMessage }),
      config.retry,
    );

    const postsScheduled: ContentPost[] = scheduled.posts.map((p) => ({
      platform: p.platform,
      scheduledDate: p.scheduledDate,
      status: p.status,
    }));

    logger.logEvent('info', 'repliz_step_success', {
      contentGenerated: content.variations.length,
      postsScheduled: postsScheduled.length,
    });

    return {
      success: true,
      contentGenerated: content.variations.length,
      postsScheduled,
      autoReplyActive: true,
    };
  } catch (error: unknown) {
    logger.logEvent('error', 'repliz_step_failed', { reason: String(error) });
    return {
      success: false,
      contentGenerated: 0,
      postsScheduled: [],
      autoReplyActive: false,
      error: String(error),
    };
  }
}
