import { describe, it, expect } from 'vitest';
import { generateWhatsAppFallbackUrl } from './fallback.js';

describe('generateWhatsAppFallbackUrl', () => {
  it('generates a valid wa.me URL with phone, business name, and description', () => {
    const url = generateWhatsAppFallbackUrl(
      '628123456789',
      'Toko Sepatu Jaya',
      'Sepatu kulit handmade berkualitas tinggi untuk pria dan wanita',
    );

    expect(url).toMatch(/^https:\/\/wa\.me\/628123456789\?text=/);
    expect(url).toContain(encodeURIComponent('Halo, saya tertarik dengan Toko Sepatu Jaya.'));
    expect(url).toContain(encodeURIComponent('Sepatu kulit handmade berkualitas tinggi untuk pria dan wanita'));
  });

  it('strips non-digit characters from phone number', () => {
    const url = generateWhatsAppFallbackUrl(
      '+62-812-345-6789',
      'Warung Makan',
      'Nasi goreng spesial dengan bumbu rahasia keluarga',
    );

    expect(url).toMatch(/^https:\/\/wa\.me\/628123456789\?text=/);
    expect(url).not.toContain('+');
    expect(url).not.toContain('-');
  });

  it('returns generic wa.me link without phone when phone number is empty', () => {
    const url = generateWhatsAppFallbackUrl(
      '',
      'Bakso Pak Joko',
      'Bakso sapi premium dengan kuah kaldu spesial',
    );

    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(url).toContain(encodeURIComponent('Bakso Pak Joko'));
  });

  it('returns generic wa.me link when phone contains only non-digit characters', () => {
    const url = generateWhatsAppFallbackUrl(
      '---',
      'Toko ABC',
      'Produk berkualitas tinggi untuk kebutuhan sehari-hari',
    );

    expect(url).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('properly encodes special characters in business name and description', () => {
    const url = generateWhatsAppFallbackUrl(
      '628111222333',
      'Café & Resto "Bintang"',
      'Kopi spesial & makanan ringan (harga mulai Rp10.000)',
    );

    // Characters that encodeURIComponent encodes should not appear raw
    expect(url).not.toContain(' ');
    // The decoded text should contain the original special characters
    const textParam = url.split('?text=')[1]!;
    const decoded = decodeURIComponent(textParam);
    expect(decoded).toContain('Café & Resto "Bintang"');
    expect(decoded).toContain('Kopi spesial & makanan ringan (harga mulai Rp10.000)');
  });

  it('truncates very long product descriptions to keep URL reasonable', () => {
    const longDescription = 'A'.repeat(1000);
    const url = generateWhatsAppFallbackUrl(
      '628111222333',
      'Toko Test',
      longDescription,
    );

    // The decoded message should be truncated (not contain the full 1000 chars)
    const textParam = url.split('?text=')[1]!;
    const decoded = decodeURIComponent(textParam);
    expect(decoded.length).toBeLessThan(600);
    expect(decoded).toContain('...');
  });

  it('includes business name and product description in the message', () => {
    const url = generateWhatsAppFallbackUrl(
      '628999888777',
      'Batik Nusantara',
      'Koleksi batik tulis asli Solo dengan motif tradisional',
    );

    const textParam = url.split('?text=')[1]!;
    const decoded = decodeURIComponent(textParam);
    expect(decoded).toBe(
      'Halo, saya tertarik dengan Batik Nusantara. Koleksi batik tulis asli Solo dengan motif tradisional',
    );
  });
});
