/**
 * UMKMate Marketing Orchestrator — Auto-Reply Message Builder
 *
 * Builds the auto-reply DM message containing business info and landing page URL.
 * The message is in Bahasa Indonesia and includes the business name,
 * a brief product description, and the destination URL.
 *
 * Validates: Requirements 6.5
 */

/**
 * Builds an auto-reply DM message for social media platforms.
 *
 * @param context - Business context containing business_name and product_description
 * @param destinationUrl - The landing page URL or fallback URL to include
 * @returns Formatted auto-reply message in Bahasa Indonesia
 */
export function buildAutoReplyMessage(
  context: { business_name: string; product_description: string },
  destinationUrl: string,
): string {
  return (
    `Halo! Terima kasih sudah menghubungi ${context.business_name}. ` +
    `${context.product_description} ` +
    `Kunjungi halaman kami: ${destinationUrl}`
  );
}
