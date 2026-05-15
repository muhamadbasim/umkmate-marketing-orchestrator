import { describe, it, expect } from 'vitest';
import { buildAutoReplyMessage } from './auto-reply.js';

describe('buildAutoReplyMessage', () => {
  it('contains the business_name in the message', () => {
    const message = buildAutoReplyMessage(
      { business_name: 'Sepatu Rizal', product_description: 'Kami menjual sepatu kulit handmade berkualitas' },
      'https://sepatu-rizal.lp.biver.id',
    );

    expect(message).toContain('Sepatu Rizal');
  });

  it('contains the destinationUrl in the message', () => {
    const message = buildAutoReplyMessage(
      { business_name: 'Toko Baju Indah', product_description: 'Koleksi baju batik modern untuk wanita karir' },
      'https://toko-baju-indah.lp.biver.id',
    );

    expect(message).toContain('https://toko-baju-indah.lp.biver.id');
  });

  it('contains the product description in the message', () => {
    const message = buildAutoReplyMessage(
      { business_name: 'Kopi Nusantara', product_description: 'Kopi arabika premium dari dataran tinggi Gayo' },
      'https://kopi-nusantara.lp.biver.id',
    );

    expect(message).toContain('Kopi arabika premium dari dataran tinggi Gayo');
  });

  it('is written in Bahasa Indonesia (contains Indonesian greeting)', () => {
    const message = buildAutoReplyMessage(
      { business_name: 'Warung Sate', product_description: 'Sate ayam dan kambing dengan bumbu kacang spesial' },
      'https://warung-sate.lp.biver.id',
    );

    // Check for Indonesian language markers
    expect(message).toContain('Halo');
    expect(message).toContain('Terima kasih');
    expect(message).toContain('Kunjungi halaman kami');
  });

  it('produces the expected full message format', () => {
    const message = buildAutoReplyMessage(
      { business_name: 'Sepatu Rizal', product_description: 'Kami menjual sepatu kulit handmade berkualitas' },
      'https://sepatu-rizal.lp.biver.id',
    );

    expect(message).toBe(
      'Halo! Terima kasih sudah menghubungi Sepatu Rizal. ' +
      'Kami menjual sepatu kulit handmade berkualitas ' +
      'Kunjungi halaman kami: https://sepatu-rizal.lp.biver.id',
    );
  });

  it('works with a WhatsApp fallback URL as destination', () => {
    const fallbackUrl = 'https://wa.me/628123456789?text=Halo';
    const message = buildAutoReplyMessage(
      { business_name: 'Bakso Pak Joko', product_description: 'Bakso sapi premium dengan kuah kaldu spesial homemade' },
      fallbackUrl,
    );

    expect(message).toContain('Bakso Pak Joko');
    expect(message).toContain(fallbackUrl);
    expect(message).toContain('Bakso sapi premium');
  });
});
