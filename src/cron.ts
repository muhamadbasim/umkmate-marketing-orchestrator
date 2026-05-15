/**
 * UMKMate Marketing Orchestrator — Cron Scheduler
 *
 * Optional time-based trigger that executes the marketing pipeline
 * for all stored Business Profiles at a configured interval using node-cron.
 *
 * Validates: Requirements 10.2, 10.3
 */

import cron from 'node-cron';
import crypto from 'node:crypto';
import type { AgentConfig } from './types.js';
import { createProfileManager } from './profile-manager.js';
import { executeMarketingPipeline } from './pipeline.js';
import { createAuditLogger } from './logger.js';

/**
 * Starts the cron scheduler if enabled in configuration.
 *
 * - If cron is not enabled or no schedule is set, returns immediately.
 * - On each tick, loads all stored profiles and executes the pipeline for each.
 * - If no profiles exist, logs a warning and skips execution (Requirement 10.3).
 *
 * @param config - Full agent configuration
 */
export function startCronScheduler(config: AgentConfig): void {
  if (!config.cron.enabled || !config.cron.schedule) return;

  const profileManager = createProfileManager(config.profile.profilePath);
  const logger = createAuditLogger(config.logger);

  cron.schedule(config.cron.schedule, async () => {
    const profiles = await profileManager.loadAll();

    if (profiles.length === 0) {
      logger.logEvent('warn', 'cron_skip_no_profiles', {});
      return;
    }

    for (const profile of profiles) {
      const correlationId = crypto.randomUUID();
      try {
        await executeMarketingPipeline(profile, config, logger, correlationId);
        logger.logEvent('info', 'cron_execution_success', { user_id: profile.user_id });
      } catch (error) {
        logger.logEvent('error', 'cron_execution_failed', {
          user_id: profile.user_id,
          reason: String(error),
        });
      }
    }
  });

  console.log(`Cron scheduler active: ${config.cron.schedule}`);
}
