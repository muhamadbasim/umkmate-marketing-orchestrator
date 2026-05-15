/**
 * UMKMate Marketing Orchestrator — WhatsApp Fallback URL Generator
 *
 * Generates WhatsApp click-to-chat links as fallback when Biver API fails.
 * Format: https://wa.me/{phone}?text={encoded_message}
 *
 * Validates: Requirements 3.6
 */

/** Maximum length for the pre-encoded message to keep URLs reasonable */
const MAX_MESSAGE_LENGTH = 500;

/**
 * Generates a WhatsApp fallback URL for click-to-chat.
 *
 * @param phoneNumber - Phone number (non-digit characters are stripped)
 * @param businessName - Name of the business
 * @param productDescription - Description of the product/service
 * @returns WhatsApp click-to-chat URL
 */
export function generateWhatsAppFallbackUrl(
  phoneNumber: string,
  businessName: string,
  productDescription: string,
): string {
  // Strip all non-digit characters from phone number
  const phone = phoneNumber.replace(/\D/g, '');

  // Truncate product description if needed to keep URL reasonable
  const truncatedDescription = truncateText(productDescription, MAX_MESSAGE_LENGTH - businessName.length - 50);

  // Build the message text
  const message = `Halo, saya tertarik dengan ${businessName}. ${truncatedDescription}`;

  // Encode the message for URL use
  const encoded = encodeURIComponent(message);

  // Handle empty phone number — return generic wa.me link without phone
  if (phone === '') {
    return `https://wa.me/?text=${encoded}`;
  }

  return `https://wa.me/${phone}?text=${encoded}`;
}

/**
 * Truncates text to a maximum length, appending ellipsis if truncated.
 */
function truncateText(text: string, maxLength: number): string {
  if (maxLength < 1) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
