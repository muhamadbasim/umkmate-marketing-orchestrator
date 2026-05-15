/**
 * UMKMate Marketing Orchestrator — Landing Page Template Builder
 *
 * Generates HTML sections for a Biver landing page based on business context.
 * Sections: Hero, Keunggulan, Testimoni, Product List (Doku checkout), CTA.
 */

import type { BusinessContext } from './types.js';

export interface SectionPayload {
  type: string;
  name: string;
  order: number;
  visible: boolean;
  htmlContent: string;
}

/**
 * Builds a complete set of landing page sections from business context.
 */
export function buildLandingPageSections(context: BusinessContext): SectionPayload[] {
  const waLink = context.phone_number
    ? `https://wa.me/${context.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo, saya mau pesan ${context.business_name}`)}`
    : '#';

  const priceFormatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(context.price);

  return [
    buildHeroSection(context, priceFormatted, waLink),
    buildFeaturesSection(context),
    buildTestimonialSection(context),
    buildProductListSection(),
    buildCtaSection(context, waLink),
  ];
}

function buildHeroSection(
  context: BusinessContext,
  priceFormatted: string,
  waLink: string,
): SectionPayload {
  return {
    type: 'hero',
    name: `Hero ${context.business_name}`,
    order: 1,
    visible: true,
    htmlContent: `<div style="text-align:center;padding:60px 20px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:white;">
  <h1 style="font-size:2.5rem;margin-bottom:16px;">${escapeHtml(context.business_name)}</h1>
  <p style="font-size:1.2rem;opacity:0.9;max-width:600px;margin:0 auto 24px;">${escapeHtml(context.product_description)}</p>
  <p style="font-size:2rem;font-weight:bold;color:#f59e0b;">${priceFormatted}</p>
  <a href="${waLink}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:#f59e0b;color:#1a1a2e;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1.1rem;">Pesan Sekarang</a>
</div>`,
  };
}

function buildFeaturesSection(context: BusinessContext): SectionPayload {
  const audience = context.target_audience
    ? `<p style="opacity:0.8;">Target: ${escapeHtml(context.target_audience)}</p>`
    : '';

  return {
    type: 'text',
    name: 'Keunggulan',
    order: 2,
    visible: true,
    htmlContent: `<div style="padding:40px 20px;max-width:800px;margin:0 auto;color:white;">
  <h2 style="text-align:center;margin-bottom:30px;font-size:1.8rem;">Kenapa ${escapeHtml(context.business_name)}?</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;">
    <div style="text-align:center;padding:20px;">
      <div style="font-size:2rem;margin-bottom:8px;">⭐</div>
      <h3>Kualitas Premium</h3>
      <p style="opacity:0.8;">Produk berkualitas tinggi yang dibuat dengan penuh perhatian terhadap detail</p>
    </div>
    <div style="text-align:center;padding:20px;">
      <div style="font-size:2rem;margin-bottom:8px;">🚀</div>
      <h3>Pengiriman Cepat</h3>
      <p style="opacity:0.8;">Proses cepat dan pengiriman ke seluruh Indonesia</p>
    </div>
    <div style="text-align:center;padding:20px;">
      <div style="font-size:2rem;margin-bottom:8px;">💯</div>
      <h3>Garansi Kepuasan</h3>
      <p style="opacity:0.8;">Jaminan kualitas dan layanan after-sales terbaik</p>
      ${audience}
    </div>
  </div>
</div>`,
  };
}

function buildTestimonialSection(context: BusinessContext): SectionPayload {
  return {
    type: 'text',
    name: 'Testimoni',
    order: 3,
    visible: true,
    htmlContent: `<div style="padding:40px 20px;background:#0f3460;color:white;">
  <h2 style="text-align:center;margin-bottom:30px;">Apa Kata Pelanggan</h2>
  <div style="max-width:700px;margin:0 auto;">
    <blockquote style="border-left:3px solid #f59e0b;padding-left:16px;margin-bottom:20px;">
      <p>Kualitasnya luar biasa! Sangat puas dengan ${escapeHtml(context.business_name)}. Recommended!</p>
      <cite style="opacity:0.7;">— Pelanggan Puas</cite>
    </blockquote>
    <blockquote style="border-left:3px solid #f59e0b;padding-left:16px;margin-bottom:20px;">
      <p>Pelayanan ramah, produk sesuai deskripsi. Pasti order lagi!</p>
      <cite style="opacity:0.7;">— Pelanggan Setia</cite>
    </blockquote>
  </div>
</div>`,
  };
}

function buildProductListSection(): SectionPayload {
  return {
    type: 'product_list',
    name: 'Produk Kami',
    order: 4,
    visible: true,
    htmlContent: '',
  };
}

function buildCtaSection(context: BusinessContext, waLink: string): SectionPayload {
  return {
    type: 'button',
    name: 'CTA WhatsApp',
    order: 5,
    visible: true,
    htmlContent: `<div style="text-align:center;padding:40px 20px;background:#1a1a2e;">
  <h2 style="color:white;margin-bottom:16px;">Jangan Sampai Kehabisan!</h2>
  <p style="color:white;opacity:0.8;margin-bottom:24px;">Hubungi kami sekarang untuk pemesanan ${escapeHtml(context.business_name)}</p>
  <a href="${waLink}" style="display:inline-block;padding:16px 40px;background:#22c55e;color:white;border-radius:8px;text-decoration:none;font-weight:bold;font-size:1.2rem;">💬 Chat WhatsApp Sekarang</a>
</div>`,
  };
}

/**
 * Basic HTML escaping to prevent XSS in user-provided content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
