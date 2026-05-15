/**
 * UMKMate Marketing Orchestrator Agent — Configuration Loader
 *
 * Loads all configuration from environment variables with sensible defaults.
 * Validates that required API keys are present at registration time.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import type { AgentConfig, LoggerConfig } from './types.js';

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Read a string environment variable with an optional default.
 */
function env(key: string, defaultValue: string): string;
function env(key: string, defaultValue: undefined): string | undefined;
function env(key: string, defaultValue: string | undefined): string | undefined {
  return process.env[key] ?? defaultValue;
}

/**
 * Read an integer environment variable with a default.
 */
function envInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Read a log level environment variable with validation.
 */
function envLogLevel(
  key: string,
  defaultValue: LoggerConfig['level'],
): LoggerConfig['level'] {
  const validLevels: LoggerConfig['level'][] = ['debug', 'info', 'warn', 'error'];
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const lower = raw.toLowerCase() as LoggerConfig['level'];
  return validLevels.includes(lower) ? lower : defaultValue;
}

// ─── Configuration Loader ────────────────────────────────────────────────────

/**
 * Load the full agent configuration from environment variables.
 * All optional values have sensible defaults.
 */
export function loadConfig(): AgentConfig {
  return {
    biver: {
      apiKey: env('BIVER_API_KEY', ''),
      baseUrl: env('BIVER_BASE_URL', 'https://api.biver.id'),
      timeoutMs: envInt('BIVER_TIMEOUT_MS', 30_000),
    },
    repliz: {
      apiKey: env('REPLIZ_ACCESS_KEY', ''),
      baseUrl: env('REPLIZ_BASE_URL', 'https://api.repliz.com'),
      timeoutMs: envInt('REPLIZ_TIMEOUT_MS', 30_000),
    },
    llm: {
      model: env('LLM_MODEL', undefined),
      maxTokens: envInt('LLM_MAX_TOKENS', 1024),
      temperature: parseFloat(env('LLM_TEMPERATURE', '0.3')),
    },
    logger: {
      logFilePath: env('AUDIT_LOG_PATH', './logs/audit.jsonl'),
      level: envLogLevel('LOG_LEVEL', 'info'),
    },
    retry: {
      maxRetries: 1,
      delayMs: 2_000,
      retryableStatuses: [429, 500, 502, 503, 504],
      retryOnTimeout: true,
    },
    webhook: {
      port: envInt('WEBHOOK_PORT', 3000),
      enabled: !!process.env.WEBHOOK_PORT,
    },
    cron: {
      schedule: env('CRON_SCHEDULE', ''),
      enabled: !!process.env.CRON_SCHEDULE,
    },
    profile: {
      profilePath: env('BUSINESS_PROFILE_PATH', './data/profiles'),
    },
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate that all required environment variables are set.
 * Throws a descriptive error naming every missing key.
 *
 * Requirement 12.3: Throw descriptive error at registration time
 * indicating which key is missing.
 */
export function validateRequiredKeys(config: AgentConfig): void {
  const missing: string[] = [];
  if (!config.biver.apiKey) missing.push('BIVER_API_KEY');
  if (!config.repliz.apiKey) missing.push('REPLIZ_ACCESS_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
