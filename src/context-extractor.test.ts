import { describe, it, expect } from 'vitest';
import {
  extractBusinessContext,
  mergeWithProfile,
  identifyMissingCritical,
} from './context-extractor.js';
import type { BusinessProfile } from './types.js';

describe('extractBusinessContext', () => {
  describe('valid JSON parsing', () => {
    it('parses a plain JSON object', () => {
      const llmResponse = JSON.stringify({
        business_name: 'Toko Sepatu Jaya',
        product_description: 'Sepatu kulit handmade berkualitas tinggi',
        price: 250000,
        target_audience: 'Profesional muda',
      });

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.business_name).toBe('Toko Sepatu Jaya');
      expect(result.extracted.product_description).toBe('Sepatu kulit handmade berkualitas tinggi');
      expect(result.extracted.price).toBe(250000);
      expect(result.extracted.target_audience).toBe('Profesional muda');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('parses JSON wrapped in markdown code block', () => {
      const llmResponse = `Here is the extracted data:

\`\`\`json
{
  "business_name": "Warung Makan Bu Siti",
  "product_description": "Nasi goreng spesial dengan bumbu rahasia keluarga",
  "price": 15000
}
\`\`\`

Let me know if you need anything else.`;

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.business_name).toBe('Warung Makan Bu Siti');
      expect(result.extracted.price).toBe(15000);
    });

    it('parses JSON wrapped in generic code block (no language tag)', () => {
      const llmResponse = `\`\`\`
{"business_name": "Bakso Pak Joko", "product_description": "Bakso sapi premium dengan kuah kaldu spesial", "price": 20000}
\`\`\``;

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.business_name).toBe('Bakso Pak Joko');
      expect(result.extracted.price).toBe(20000);
    });

    it('extracts JSON embedded in surrounding text', () => {
      const llmResponse = `Based on the user message, I extracted:
{"business_name": "Kopi Nusantara", "product_description": "Kopi arabika single origin dari Toraja", "price": 45000}
That covers the main fields.`;

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.business_name).toBe('Kopi Nusantara');
      expect(result.extracted.price).toBe(45000);
    });

    it('handles nested "extracted" wrapper from LLM', () => {
      const llmResponse = JSON.stringify({
        extracted: {
          business_name: 'Batik Indah',
          product_description: 'Batik tulis premium dari Solo dengan motif klasik',
          price: 500000,
        },
        confidence: { business_name: 0.9, product_description: 0.8, price: 0.7 },
      });

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.business_name).toBe('Batik Indah');
      expect(result.extracted.price).toBe(500000);
    });
  });

  describe('malformed input handling', () => {
    it('returns empty extraction for empty string', () => {
      const result = extractBusinessContext('');
      expect(result.extracted).toEqual({});
      expect(result.confidence).toBe(0);
    });

    it('returns empty extraction for non-JSON text', () => {
      const result = extractBusinessContext('This is just a regular message without any JSON.');
      expect(result.extracted).toEqual({});
      expect(result.confidence).toBe(0);
    });

    it('returns empty extraction for invalid JSON', () => {
      const result = extractBusinessContext('{ broken json: }');
      expect(result.extracted).toEqual({});
      expect(result.confidence).toBe(0);
    });
  });

  describe('field type validation', () => {
    it('ignores non-string business_name', () => {
      const llmResponse = JSON.stringify({
        business_name: 123,
        product_description: 'Deskripsi produk yang cukup panjang',
        price: 10000,
      });

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.business_name).toBeUndefined();
    });

    it('parses numeric string price', () => {
      const llmResponse = JSON.stringify({
        business_name: 'Test Shop',
        product_description: 'A product with a good description here',
        price: '50000',
      });

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.price).toBe(50000);
    });

    it('rejects non-HTTPS photo_url', () => {
      const llmResponse = JSON.stringify({
        business_name: 'Test',
        photo_url: 'http://example.com/photo.jpg',
      });

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.photo_url).toBeUndefined();
    });

    it('accepts valid HTTPS photo_url', () => {
      const llmResponse = JSON.stringify({
        business_name: 'Test',
        photo_url: 'https://cdn.example.com/photo.jpg',
      });

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.photo_url).toBe('https://cdn.example.com/photo.jpg');
    });

    it('filters invalid platform values', () => {
      const llmResponse = JSON.stringify({
        business_name: 'Test',
        platforms: ['instagram', 'snapchat', 'tiktok'],
      });

      const result = extractBusinessContext(llmResponse);
      expect(result.extracted.platforms).toEqual(['instagram', 'tiktok']);
    });
  });

  describe('confidence scoring', () => {
    it('returns higher confidence for more extracted fields', () => {
      const minimal = extractBusinessContext(
        JSON.stringify({ business_name: 'Test' }),
      );
      const full = extractBusinessContext(
        JSON.stringify({
          business_name: 'Test',
          product_description: 'A detailed product description here',
          price: 100000,
          target_audience: 'Young adults',
          photo_url: 'https://example.com/img.jpg',
          phone_number: '6281234567890',
          platforms: ['instagram'],
        }),
      );

      expect(full.confidence).toBeGreaterThan(minimal.confidence);
    });

    it('returns 1.0 confidence when all 7 fields are extracted', () => {
      const result = extractBusinessContext(
        JSON.stringify({
          business_name: 'Full Shop',
          product_description: 'Complete product description text',
          price: 100000,
          target_audience: 'Everyone',
          photo_url: 'https://example.com/img.jpg',
          phone_number: '6281234567890',
          platforms: ['instagram'],
        }),
      );

      expect(result.confidence).toBe(1);
    });
  });
});

describe('mergeWithProfile', () => {
  const baseProfile: BusinessProfile = {
    user_id: 'user-123',
    business_name: 'Stored Business',
    product_description: 'Stored product description that is long enough',
    price: 100000,
    target_audience: 'Stored audience',
    phone_number: '6281111111111',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  it('returns extracted as-is when profile is null', () => {
    const extracted = { business_name: 'New Business' };
    const result = mergeWithProfile(extracted, null);
    expect(result).toEqual({ business_name: 'New Business' });
  });

  it('current extraction takes precedence over profile', () => {
    const extracted = { business_name: 'Updated Name', price: 200000 };
    const result = mergeWithProfile(extracted, baseProfile);
    expect(result.business_name).toBe('Updated Name');
    expect(result.price).toBe(200000);
  });

  it('fills gaps from profile when extraction is missing fields', () => {
    const extracted = { business_name: 'New Name' };
    const result = mergeWithProfile(extracted, baseProfile);
    expect(result.business_name).toBe('New Name');
    expect(result.product_description).toBe('Stored product description that is long enough');
    expect(result.price).toBe(100000);
    expect(result.target_audience).toBe('Stored audience');
    expect(result.phone_number).toBe('6281111111111');
  });

  it('does not overwrite extracted fields with profile data', () => {
    const extracted = {
      business_name: 'My New Shop',
      product_description: 'Brand new description for my products',
      price: 50000,
    };
    const result = mergeWithProfile(extracted, baseProfile);
    expect(result.business_name).toBe('My New Shop');
    expect(result.product_description).toBe('Brand new description for my products');
    expect(result.price).toBe(50000);
  });

  it('handles empty extraction with full profile', () => {
    const result = mergeWithProfile({}, baseProfile);
    expect(result.business_name).toBe('Stored Business');
    expect(result.product_description).toBe('Stored product description that is long enough');
    expect(result.price).toBe(100000);
  });
});

describe('identifyMissingCritical', () => {
  it('returns empty array when all critical fields are present', () => {
    const context = {
      business_name: 'Test',
      product_description: 'A valid product description',
      price: 10000,
    };
    expect(identifyMissingCritical(context)).toEqual([]);
  });

  it('identifies missing business_name', () => {
    const context = {
      product_description: 'A valid product description',
      price: 10000,
    };
    expect(identifyMissingCritical(context)).toContain('business_name');
  });

  it('identifies missing product_description', () => {
    const context = {
      business_name: 'Test',
      price: 10000,
    };
    expect(identifyMissingCritical(context)).toContain('product_description');
  });

  it('identifies missing price (undefined)', () => {
    const context = {
      business_name: 'Test',
      product_description: 'A valid product description',
    };
    expect(identifyMissingCritical(context)).toContain('price');
  });

  it('does NOT flag price of 0 as missing', () => {
    const context = {
      business_name: 'Test',
      product_description: 'A valid product description',
      price: 0,
    };
    expect(identifyMissingCritical(context)).not.toContain('price');
  });

  it('returns all three when context is empty', () => {
    const result = identifyMissingCritical({});
    expect(result).toEqual(['business_name', 'product_description', 'price']);
  });

  it('identifies empty string business_name as missing', () => {
    const context = {
      business_name: '',
      product_description: 'A valid product description',
      price: 10000,
    };
    expect(identifyMissingCritical(context)).toContain('business_name');
  });
});
