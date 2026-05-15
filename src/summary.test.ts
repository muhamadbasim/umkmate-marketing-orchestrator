import { describe, it, expect } from 'vitest';
import { deriveStatus, compileSummary, buildErrorSummary } from './summary.js';
import type { BiverStepResult, ReplizStepResult } from './types.js';

describe('deriveStatus', () => {
  it('returns success when both steps succeed', () => {
    expect(deriveStatus(true, true)).toBe('success');
  });

  it('returns failed when both steps fail', () => {
    expect(deriveStatus(false, false)).toBe('failed');
  });

  it('returns partial when only biver succeeds', () => {
    expect(deriveStatus(true, false)).toBe('partial');
  });

  it('returns partial when only repliz succeeds', () => {
    expect(deriveStatus(false, true)).toBe('partial');
  });
});

describe('compileSummary', () => {
  const baseBiverResult: BiverStepResult = {
    success: true,
    lpUrl: 'https://tokosepatu.lp.biver.id',
    fallbackUrl: 'https://wa.me/628123456789?text=Halo',
    paymentActive: true,
    dokuMerchantId: 'doku-123',
  };

  const baseReplizResult: ReplizStepResult = {
    success: true,
    contentGenerated: 3,
    postsScheduled: [
      { platform: 'instagram', scheduledDate: '2026-05-16T10:00:00.000Z', status: 'scheduled' },
      { platform: 'facebook', scheduledDate: '2026-05-18T10:00:00.000Z', status: 'scheduled' },
      { platform: 'tiktok', scheduledDate: '2026-05-20T10:00:00.000Z', status: 'scheduled' },
    ],
    autoReplyActive: true,
  };

  it('compiles a full success summary', () => {
    const result = compileSummary(baseBiverResult, baseReplizResult, 'corr-001');

    expect(result.type).toBe('summary');
    expect(result.status).toBe('success');
    expect(result.correlationId).toBe('corr-001');
    expect(result.lpUrl).toBe('https://tokosepatu.lp.biver.id');
    expect(result.postsScheduled).toHaveLength(3);
    expect(result.autoReplyActive).toBe(true);
  });

  it('uses fallback URL when lpUrl is null', () => {
    const biverFailed: BiverStepResult = {
      ...baseBiverResult,
      success: false,
      lpUrl: null,
    };

    const result = compileSummary(biverFailed, baseReplizResult, 'corr-002');

    expect(result.status).toBe('partial');
    expect(result.lpUrl).toBe('https://wa.me/628123456789?text=Halo');
  });

  it('includes status indicator in text', () => {
    const result = compileSummary(baseBiverResult, baseReplizResult, 'corr-003');

    expect(result.text).toContain('✅ Berhasil');
    expect(result.text).toContain('RINGKASAN EKSEKUSI');
  });

  it('includes landing page URL in text', () => {
    const result = compileSummary(baseBiverResult, baseReplizResult, 'corr-004');

    expect(result.text).toContain('https://tokosepatu.lp.biver.id');
  });

  it('includes payment status in text', () => {
    const result = compileSummary(baseBiverResult, baseReplizResult, 'corr-005');

    expect(result.text).toContain('Payment Doku: Aktif');
  });

  it('shows inactive payment when paymentActive is false', () => {
    const biverNoPayment: BiverStepResult = {
      ...baseBiverResult,
      paymentActive: false,
    };

    const result = compileSummary(biverNoPayment, baseReplizResult, 'corr-006');

    expect(result.text).toContain('Payment Doku: Tidak aktif');
  });

  it('includes scheduled dates in Bahasa Indonesia format', () => {
    const result = compileSummary(baseBiverResult, baseReplizResult, 'corr-007');

    expect(result.text).toContain('Instagram: 16 Mei 2026');
    expect(result.text).toContain('Facebook: 18 Mei 2026');
    expect(result.text).toContain('Tiktok: 20 Mei 2026');
  });

  it('includes auto-reply status in text', () => {
    const result = compileSummary(baseBiverResult, baseReplizResult, 'corr-008');

    expect(result.text).toContain('Auto-reply DM: Aktif');
  });

  it('shows inactive auto-reply when autoReplyActive is false', () => {
    const replizNoAutoReply: ReplizStepResult = {
      ...baseReplizResult,
      autoReplyActive: false,
    };

    const result = compileSummary(baseBiverResult, replizNoAutoReply, 'corr-009');

    expect(result.text).toContain('Auto-reply DM: Tidak aktif');
  });

  it('handles empty posts scheduled', () => {
    const replizNoPosts: ReplizStepResult = {
      ...baseReplizResult,
      postsScheduled: [],
    };

    const result = compileSummary(baseBiverResult, replizNoPosts, 'corr-010');

    expect(result.text).toContain('tidak ada konten terjadwal');
  });

  it('shows partial status text when one step fails', () => {
    const biverFailed: BiverStepResult = {
      ...baseBiverResult,
      success: false,
      lpUrl: null,
    };

    const result = compileSummary(biverFailed, baseReplizResult, 'corr-011');

    expect(result.text).toContain('⚠️ Sebagian Berhasil');
  });

  it('shows failed status text when both steps fail', () => {
    const biverFailed: BiverStepResult = {
      ...baseBiverResult,
      success: false,
      lpUrl: null,
    };
    const replizFailed: ReplizStepResult = {
      ...baseReplizResult,
      success: false,
      postsScheduled: [],
      autoReplyActive: false,
    };

    const result = compileSummary(biverFailed, replizFailed, 'corr-012');

    expect(result.text).toContain('❌ Gagal');
  });

  it('only shows scheduled posts (not failed ones)', () => {
    const replizMixed: ReplizStepResult = {
      ...baseReplizResult,
      postsScheduled: [
        { platform: 'instagram', scheduledDate: '2026-05-16T10:00:00.000Z', status: 'scheduled' },
        { platform: 'facebook', scheduledDate: '2026-05-18T10:00:00.000Z', status: 'failed' },
      ],
    };

    const result = compileSummary(baseBiverResult, replizMixed, 'corr-013');

    expect(result.text).toContain('Instagram: 16 Mei 2026');
    expect(result.text).not.toContain('Facebook: 18 Mei 2026');
  });
});

describe('buildErrorSummary', () => {
  it('returns an error response with the given errors and correlationId', () => {
    const result = buildErrorSummary(['business_name: Required', 'price: Expected number'], 'corr-err-001');

    expect(result.type).toBe('error');
    expect(result.errors).toEqual(['business_name: Required', 'price: Expected number']);
    expect(result.correlationId).toBe('corr-err-001');
  });

  it('handles empty errors array', () => {
    const result = buildErrorSummary([], 'corr-err-002');

    expect(result.type).toBe('error');
    expect(result.errors).toEqual([]);
    expect(result.correlationId).toBe('corr-err-002');
  });
});
