/**
 * Audit Logger — Structured JSON Lines logging with correlation ID.
 *
 * Uses pino for structured logging. Each logger instance generates a unique
 * correlation_id (via crypto.randomUUID) that is included in every log entry,
 * enabling end-to-end tracing of a single pipeline execution.
 *
 * Validates: Requirements 11.1, 11.2, 11.3
 */

import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pino } from 'pino';
import type { AuditLogger, LoggerConfig, LogLevel } from './types.js';

/**
 * Creates an AuditLogger instance that writes structured JSON Lines
 * to the configured file path with a unique correlation_id per execution.
 */
export function createAuditLogger(config: LoggerConfig): AuditLogger {
  const correlationId = crypto.randomUUID();

  // Ensure the log directory exists
  const logDir = dirname(config.logFilePath);
  mkdirSync(logDir, { recursive: true });

  const logger = pino(
    {
      level: config.level,
      base: { correlation_id: correlationId },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.destination({ dest: config.logFilePath, sync: false }),
  );

  return {
    logEvent(level: LogLevel, event: string, data: Record<string, unknown>): void {
      logger[level]({ event, ...data });
    },

    logError(step: string, error: unknown): void {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error({ event: 'step_error', step, error: errorMessage });
    },

    getCorrelationId(): string {
      return correlationId;
    },
  };
}
