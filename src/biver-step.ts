/**
 * UMKMate Marketing Orchestrator — Biver Step
 *
 * Handles the landing page creation flow:
 *   1. Create page via Biver API
 *   2. Add template sections (hero, keunggulan, testimoni, product_list, CTA)
 *   3. Create product with price for Doku checkout
 *   4. Deploy the page to make it publicly accessible
 *
 * Wraps the entire flow in retry logic. On failure, falls back to a
 * WhatsApp click-to-chat link so the Repliz step can still proceed.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import type { BusinessContext, AgentConfig, AuditLogger, BiverStepResult } from './types.js';
import { createBiverClient } from './biver-client.js';
import { withRetry } from './retry-handler.js';
import { slugify } from './slug.js';
import { generateWhatsAppFallbackUrl } from './fallback.js';
import { buildLandingPageSections } from './lp-template.js';

/**
 * Executes the Biver landing page creation step.
 *
 * Flow: create page → add sections → create product → deploy.
 * On success, returns the deployed LP URL with payment active.
 * On failure (after retry), returns a WhatsApp fallback URL.
 */
export async function executeBiverStep(
  context: BusinessContext,
  config: AgentConfig,
  logger: AuditLogger,
): Promise<BiverStepResult> {
  const client = createBiverClient(config.biver);
  const slug = slugify(context.business_name);

  try {
    // 1. Create page with slug
    const page = await withRetry(
      () => client.generatePage(context),
      config.retry,
    );

    const pageId = page.data.id;
    const pageSlug = page.data.slug ?? slug;

    logger.logEvent('info', 'biver_page_created', { pageId, slug: pageSlug });

    // 2. Add template sections (hero, features, testimonials, product_list, CTA)
    const sections = buildLandingPageSections(context);
    for (const section of sections) {
      try {
        await client.addSection(pageId, section);
      } catch (sectionError) {
        logger.logEvent('warn', 'biver_section_failed', {
          sectionName: section.name,
          reason: String(sectionError),
        });
      }
    }

    logger.logEvent('info', 'biver_sections_added', { count: sections.length });

    // 3. Create product with price for Doku checkout
    let dokuMerchantId: string | null = null;
    try {
      const product = await withRetry(
        () => client.createProduct({
          name: context.business_name,
          slug: slugify(context.business_name) + '-product',
          description: context.product_description,
          price: context.price,
          images: context.photo_url ? [context.photo_url] : undefined,
          isActive: true,
          pageId,
        }),
        config.retry,
      );
      dokuMerchantId = product.data.dokuMerchantId ?? null;
      logger.logEvent('info', 'biver_product_created', { productId: product.data.id });
    } catch (productError) {
      logger.logEvent('warn', 'biver_product_failed', { reason: String(productError) });
    }

    // 4. Deploy the page
    let deployUrl = `https://${pageSlug}.lp.biver.id`;
    try {
      const deploy = await withRetry(
        () => client.deployPage(pageId),
        { ...config.retry, retryOnTimeout: false },
      );
      deployUrl = deploy.data.url ?? deployUrl;
    } catch (deployError) {
      logger.logEvent('warn', 'biver_deploy_timeout', { reason: String(deployError), fallbackUrl: deployUrl });
    }

    logger.logEvent('info', 'biver_step_success', { lpUrl: deployUrl, slug: pageSlug });

    return {
      success: true,
      lpUrl: deployUrl,
      fallbackUrl: generateWhatsAppFallbackUrl(
        context.phone_number ?? '',
        context.business_name,
        context.product_description,
      ),
      paymentActive: dokuMerchantId !== null,
      dokuMerchantId,
    };
  } catch (error) {
    const fallbackUrl = generateWhatsAppFallbackUrl(
      context.phone_number ?? '',
      context.business_name,
      context.product_description,
    );
    logger.logEvent('warn', 'biver_fallback_activated', { reason: String(error) });

    return {
      success: false,
      lpUrl: null,
      fallbackUrl,
      paymentActive: false,
      dokuMerchantId: null,
    };
  }
}
