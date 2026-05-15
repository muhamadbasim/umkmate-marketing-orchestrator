/**
 * Slug Generator — Converts business names to URL-safe slugs for Biver subdomains.
 *
 * Handles edge cases:
 * - Empty/whitespace-only input → returns 'unnamed'
 * - All special characters → returns 'unnamed'
 * - Unicode characters → stripped
 * - Very long names → truncated to 50 characters (at word boundary)
 * - Consecutive hyphens → collapsed to single hyphen
 * - Leading/trailing hyphens → stripped
 */

const MAX_SLUG_LENGTH = 50;

export function slugify(businessName: string): string {
  const slug = businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slug.length === 0) {
    return 'unnamed';
  }

  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug;
  }

  // Truncate at word boundary (hyphen) to avoid cutting mid-word
  const truncated = slug.slice(0, MAX_SLUG_LENGTH);
  const lastHyphen = truncated.lastIndexOf('-');

  // If there's a hyphen in the truncated portion, cut there for cleaner slug
  const result = lastHyphen > 0 ? truncated.slice(0, lastHyphen) : truncated;

  // Strip any trailing hyphen that may result from truncation
  return result.replace(/-$/g, '');
}
