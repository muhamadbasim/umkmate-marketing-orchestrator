import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAuditLogger } from './logger.js';
import { readFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { LoggerConfig } from './types.js';

describe('createAuditLogger', () => {
  let testDir: string;
  let logFilePath: string;
  let config: LoggerConfig;

  beforeEach(() => {
    testDir = join(tmpdir(), `audit-logger-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
    logFilePath = join(testDir, 'audit.jsonl');
    config = { logFilePath, level: 'debug' };
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Helper to flush pino's async destination and read log lines.
   * Pino uses async writes, so we need a short delay for the buffer to flush.
   */
  async function flushAndReadLines(): Promise<Record<string, unknown>[]> {
    // Give pino time to flush its async buffer
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!existsSync(logFilePath)) return [];
    const content = readFileSync(logFilePath, 'utf-8').trim();
    if (!content) return [];
    return content.split('\n').map(line => JSON.parse(line) as Record<string, unknown>);
  }

  it('generates a unique correlation_id (UUID format)', () => {
    const logger = createAuditLogger(config);
    const id = logger.getCorrelationId();

    // UUID v4 format: 8-4-4-4-12 hex characters
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('generates different correlation_ids for different logger instances', () => {
    const logger1 = createAuditLogger(config);
    const logger2 = createAuditLogger(config);

    expect(logger1.getCorrelationId()).not.toBe(logger2.getCorrelationId());
  });

  it('getCorrelationId returns consistent value within same logger instance', () => {
    const logger = createAuditLogger(config);
    const id1 = logger.getCorrelationId();
    const id2 = logger.getCorrelationId();
    const id3 = logger.getCorrelationId();

    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
  });

  it('logEvent writes structured entries with correlation_id', async () => {
    const logger = createAuditLogger(config);
    const correlationId = logger.getCorrelationId();

    logger.logEvent('info', 'test_event', { key: 'value', count: 42 });

    const lines = await flushAndReadLines();
    expect(lines.length).toBe(1);

    const entry = lines[0]!;
    expect(entry['correlation_id']).toBe(correlationId);
    expect(entry['event']).toBe('test_event');
    expect(entry['key']).toBe('value');
    expect(entry['count']).toBe(42);
    expect(entry['level']).toBe(30); // pino info level
    expect(entry['time']).toBeDefined();
  });

  it('logEvent includes timestamp in ISO format', async () => {
    const logger = createAuditLogger(config);

    logger.logEvent('info', 'timestamp_test', {});

    const lines = await flushAndReadLines();
    expect(lines.length).toBe(1);

    const entry = lines[0]!;
    // pino isoTime format includes the "time" field as ISO string
    expect(typeof entry['time']).toBe('string');
    // Verify it's a valid ISO date string
    const parsed = new Date(entry['time'] as string);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it('logError includes step name and error message', async () => {
    const logger = createAuditLogger(config);
    const correlationId = logger.getCorrelationId();

    logger.logError('biver_step', new Error('Connection timeout'));

    const lines = await flushAndReadLines();
    expect(lines.length).toBe(1);

    const entry = lines[0]!;
    expect(entry['correlation_id']).toBe(correlationId);
    expect(entry['event']).toBe('step_error');
    expect(entry['step']).toBe('biver_step');
    expect(entry['error']).toBe('Connection timeout');
    expect(entry['level']).toBe(50); // pino error level
  });

  it('logError handles non-Error objects', async () => {
    const logger = createAuditLogger(config);

    logger.logError('repliz_step', 'string error message');

    const lines = await flushAndReadLines();
    expect(lines.length).toBe(1);

    const entry = lines[0]!;
    expect(entry['step']).toBe('repliz_step');
    expect(entry['error']).toBe('string error message');
  });

  it('creates log directory if it does not exist', () => {
    const nestedDir = join(testDir, 'nested', 'deep', 'logs');
    const nestedLogPath = join(nestedDir, 'audit.jsonl');
    const nestedConfig: LoggerConfig = { logFilePath: nestedLogPath, level: 'info' };

    // Should not throw
    const logger = createAuditLogger(nestedConfig);
    expect(logger.getCorrelationId()).toBeDefined();
    expect(existsSync(nestedDir)).toBe(true);
  });

  it('writes multiple log entries as separate JSON lines', async () => {
    const logger = createAuditLogger(config);

    logger.logEvent('info', 'event_one', { a: 1 });
    logger.logEvent('warn', 'event_two', { b: 2 });
    logger.logError('step_x', new Error('fail'));

    const lines = await flushAndReadLines();
    expect(lines.length).toBe(3);

    expect(lines[0]!['event']).toBe('event_one');
    expect(lines[1]!['event']).toBe('event_two');
    expect(lines[2]!['event']).toBe('step_error');
  });
});
