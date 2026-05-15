/**
 * UMKMate Marketing Orchestrator — Summary Compiler
 *
 * Compiles results from both Biver and Repliz steps into a Bahasa Indonesia
 * text summary for non-technical UMKM users.
 *
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import type {
  BiverStepResult,
  ReplizStepResult,
  ExecutionSummary,
  OverallStatus,
  ContentPost,
  ErrorResponse,
} from './types.js';

/**
 * Derives the overall pipeline status from individual step outcomes.
 *
 * - success: both Biver and Repliz succeeded
 * - partial: one step succeeded, the other failed
 * - failed: both steps failed
 */
export function deriveStatus(biverSuccess: boolean, replizSuccess: boolean): OverallStatus {
  if (biverSuccess && replizSuccess) return 'success';
  if (!biverSuccess && !replizSuccess) return 'failed';
  return 'partial';
}

/**
 * Compiles the final ExecutionSummary from both step results.
 */
export function compileSummary(
  biverResult: BiverStepResult,
  replizResult: ReplizStepResult,
  correlationId: string,
): ExecutionSummary {
  const status = deriveStatus(biverResult.success, replizResult.success);
  const lpUrl = biverResult.lpUrl ?? biverResult.fallbackUrl;
  const text = formatSummaryText(status, lpUrl, biverResult, replizResult);

  return {
    type: 'summary',
    text,
    status,
    correlationId,
    lpUrl,
    postsScheduled: replizResult.postsScheduled,
    autoReplyActive: replizResult.autoReplyActive,
  };
}

/**
 * Builds an error summary response for validation failures.
 */
export function buildErrorSummary(errors: string[], correlationId: string): ErrorResponse {
  return {
    type: 'error',
    errors,
    correlationId,
  };
}

/**
 * Formats the summary text in Bahasa Indonesia with status, LP URL,
 * payment status, scheduled posts, and auto-reply status.
 */
function formatSummaryText(
  status: OverallStatus,
  lpUrl: string,
  biverResult: BiverStepResult,
  replizResult: ReplizStepResult,
): string {
  const statusLine = formatStatusLine(status);
  const paymentStatus = biverResult.paymentActive ? 'Aktif' : 'Tidak aktif';
  const autoReplyStatus = replizResult.autoReplyActive ? 'Aktif' : 'Tidak aktif';
  const scheduledSection = formatScheduledPosts(replizResult.postsScheduled);

  const lines = [
    '📋 RINGKASAN EKSEKUSI',
    '',
    `Status: ${statusLine}`,
    '',
    `🌐 Landing Page: ${lpUrl}`,
    `💳 Payment Doku: ${paymentStatus}`,
    '',
    '📅 Konten Terjadwal:',
    scheduledSection,
    '',
    `💬 Auto-reply DM: ${autoReplyStatus}`,
  ];

  return lines.join('\n');
}

/**
 * Formats the status indicator line in Bahasa Indonesia.
 */
function formatStatusLine(status: OverallStatus): string {
  switch (status) {
    case 'success':
      return '✅ Berhasil';
    case 'partial':
      return '⚠️ Sebagian Berhasil';
    case 'failed':
      return '❌ Gagal';
  }
}

/**
 * Formats the scheduled posts section with platform names and dates.
 */
function formatScheduledPosts(posts: ContentPost[]): string {
  if (posts.length === 0) {
    return '  (tidak ada konten terjadwal)';
  }

  return posts
    .filter((post) => post.status === 'scheduled')
    .map((post) => {
      const platformName = capitalizePlatform(post.platform);
      const formattedDate = formatDateBahasa(post.scheduledDate);
      return `  - ${platformName}: ${formattedDate}`;
    })
    .join('\n') || '  (tidak ada konten terjadwal)';
}

/**
 * Capitalizes the first letter of a platform name.
 */
function capitalizePlatform(platform: string): string {
  if (platform.length === 0) return platform;
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

/**
 * Formats an ISO date string into Bahasa Indonesia format (e.g., "16 Mei 2026").
 */
function formatDateBahasa(isoDate: string): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;

  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  return `${day} ${month} ${year}`;
}
