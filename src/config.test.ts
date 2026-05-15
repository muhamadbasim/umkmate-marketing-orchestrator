import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, validateRequiredKeys } from './config.js';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('loads required API keys from environment', () => {
      process.env.BIVER_API_KEY = 'biver-key-123';
      process.env.REPLIZ_ACCESS_KEY = 'repliz-key-456';

      const config = loadConfig();

      expect(config.biver.apiKey).toBe('biver-key-123');
      expect(config.repliz.apiKey).toBe('repliz-key-456');
    });

    it('applies sensible defaults for optional values', () => {
      const config = loadConfig();

      expect(config.biver.baseUrl).toBe('https://api.biver.id');
      expect(config.biver.timeoutMs).toBe(30_000);
      expect(config.repliz.baseUrl).toBe('https://api.repliz.com');
      expect(config.repliz.timeoutMs).toBe(30_000);
      expect(config.logger.logFilePath).toBe('./logs/audit.jsonl');
      expect(config.logger.level).toBe('info');
      expect(config.webhook.port).toBe(3000);
      expect(config.webhook.enabled).toBe(false);
      expect(config.cron.schedule).toBe('');
      expect(config.cron.enabled).toBe(false);
      expect(config.profile.profilePath).toBe('./data/profiles');
      expect(config.llm.maxTokens).toBe(1024);
      expect(config.llm.temperature).toBe(0.3);
      expect(config.llm.model).toBeUndefined();
    });

    it('reads optional env vars when set', () => {
      process.env.WEBHOOK_PORT = '8080';
      process.env.CRON_SCHEDULE = '0 9 * * *';
      process.env.AUDIT_LOG_PATH = '/var/log/agent.jsonl';
      process.env.BUSINESS_PROFILE_PATH = '/data/profiles';
      process.env.BIVER_BASE_URL = 'https://custom.biver.id';
      process.env.REPLIZ_BASE_URL = 'https://custom.repliz.com';

      const config = loadConfig();

      expect(config.webhook.port).toBe(8080);
      expect(config.webhook.enabled).toBe(true);
      expect(config.cron.schedule).toBe('0 9 * * *');
      expect(config.cron.enabled).toBe(true);
      expect(config.logger.logFilePath).toBe('/var/log/agent.jsonl');
      expect(config.profile.profilePath).toBe('/data/profiles');
      expect(config.biver.baseUrl).toBe('https://custom.biver.id');
      expect(config.repliz.baseUrl).toBe('https://custom.repliz.com');
    });

    it('uses default for invalid integer env vars', () => {
      process.env.WEBHOOK_PORT = 'not-a-number';

      const config = loadConfig();

      expect(config.webhook.port).toBe(3000);
    });

    it('validates log level and falls back to default for invalid values', () => {
      process.env.LOG_LEVEL = 'invalid';
      const config = loadConfig();
      expect(config.logger.level).toBe('info');

      process.env.LOG_LEVEL = 'debug';
      const config2 = loadConfig();
      expect(config2.logger.level).toBe('debug');
    });

    it('includes retry defaults', () => {
      const config = loadConfig();

      expect(config.retry.maxRetries).toBe(1);
      expect(config.retry.delayMs).toBe(2_000);
      expect(config.retry.retryableStatuses).toEqual([429, 500, 502, 503, 504]);
      expect(config.retry.retryOnTimeout).toBe(true);
    });
  });

  describe('validateRequiredKeys', () => {
    it('does not throw when both API keys are present', () => {
      process.env.BIVER_API_KEY = 'key1';
      process.env.REPLIZ_ACCESS_KEY = 'key2';
      const config = loadConfig();

      expect(() => validateRequiredKeys(config)).not.toThrow();
    });

    it('throws descriptive error when BIVER_API_KEY is missing', () => {
      process.env.REPLIZ_ACCESS_KEY = 'key2';
      const config = loadConfig();

      expect(() => validateRequiredKeys(config)).toThrow(
        'Missing required environment variables: BIVER_API_KEY',
      );
    });

    it('throws descriptive error when REPLIZ_ACCESS_KEY is missing', () => {
      process.env.BIVER_API_KEY = 'key1';
      const config = loadConfig();

      expect(() => validateRequiredKeys(config)).toThrow(
        'Missing required environment variables: REPLIZ_ACCESS_KEY',
      );
    });

    it('throws error naming all missing keys when both are absent', () => {
      const config = loadConfig();

      expect(() => validateRequiredKeys(config)).toThrow(
        'Missing required environment variables: BIVER_API_KEY, REPLIZ_ACCESS_KEY',
      );
    });
  });
});
