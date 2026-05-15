import { describe, it, expect } from 'vitest';
import { validateBusinessContext, SUPPORTED_PLATFORMS } from './validator.js';

describe('validateBusinessContext', () => {
  const validInput = {
    business_name: 'Toko Sepatu Jaya',
    product_description: 'Sepatu kulit handmade berkualitas tinggi untuk pria dan wanita',
    price: 250000,
  };

  describe('valid input', () => {
    it('passes with all required fields', () => {
      const result = validateBusinessContext(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.business_name).toBe('Toko Sepatu Jaya');
        expect(result.data.product_description).toBe(
          'Sepatu kulit handmade berkualitas tinggi untuk pria dan wanita',
        );
        expect(result.data.price).toBe(250000);
      }
    });

    it('passes with all optional fields included', () => {
      const result = validateBusinessContext({
        ...validInput,
        target_audience: 'Profesional muda usia 25-40 tahun',
        photo_url: 'https://example.com/photo.jpg',
        phone_number: '6281234567890',
        platforms: ['instagram', 'facebook'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.target_audience).toBe('Profesional muda usia 25-40 tahun');
        expect(result.data.photo_url).toBe('https://example.com/photo.jpg');
        expect(result.data.phone_number).toBe('6281234567890');
        expect(result.data.platforms).toEqual(['instagram', 'facebook']);
      }
    });

    it('trims whitespace from business_name and product_description', () => {
      const result = validateBusinessContext({
        ...validInput,
        business_name: '  Toko Sepatu Jaya  ',
        product_description: '  Sepatu kulit handmade berkualitas tinggi untuk pria dan wanita  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.business_name).toBe('Toko Sepatu Jaya');
        expect(result.data.product_description).toBe(
          'Sepatu kulit handmade berkualitas tinggi untuk pria dan wanita',
        );
      }
    });

    it('accepts price of 0', () => {
      const result = validateBusinessContext({ ...validInput, price: 0 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price).toBe(0);
      }
    });
  });

  describe('missing required fields', () => {
    it('returns error when business_name is missing', () => {
      const { business_name: _, ...input } = validInput;
      const result = validateBusinessContext(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('business_name'))).toBe(true);
      }
    });

    it('returns error when product_description is missing', () => {
      const { product_description: _, ...input } = validInput;
      const result = validateBusinessContext(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('product_description'))).toBe(true);
      }
    });

    it('returns error when price is missing', () => {
      const { price: _, ...input } = validInput;
      const result = validateBusinessContext(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('price'))).toBe(true);
      }
    });
  });

  describe('invalid types', () => {
    it('returns error when business_name is not a string', () => {
      const result = validateBusinessContext({ ...validInput, business_name: 123 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('business_name'))).toBe(true);
      }
    });

    it('returns error when price is not a number', () => {
      const result = validateBusinessContext({ ...validInput, price: 'free' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('price'))).toBe(true);
      }
    });

    it('returns error when input is null', () => {
      const result = validateBusinessContext(null);
      expect(result.success).toBe(false);
    });

    it('returns error when input is undefined', () => {
      const result = validateBusinessContext(undefined);
      expect(result.success).toBe(false);
    });
  });

  describe('all errors returned at once', () => {
    it('returns multiple errors for multiple invalid fields', () => {
      const result = validateBusinessContext({
        business_name: '',
        product_description: 'too short',
        price: -5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
        expect(result.errors.some((e) => e.includes('business_name'))).toBe(true);
        expect(result.errors.some((e) => e.includes('product_description'))).toBe(true);
        expect(result.errors.some((e) => e.includes('price'))).toBe(true);
      }
    });

    it('returns errors for all missing required fields at once', () => {
      const result = validateBusinessContext({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('optional fields validation', () => {
    it('returns error when target_audience exceeds 500 characters', () => {
      const result = validateBusinessContext({
        ...validInput,
        target_audience: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('target_audience'))).toBe(true);
      }
    });

    it('accepts target_audience at exactly 500 characters', () => {
      const result = validateBusinessContext({
        ...validInput,
        target_audience: 'a'.repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('photo_url HTTPS validation', () => {
    it('rejects HTTP photo_url', () => {
      const result = validateBusinessContext({
        ...validInput,
        photo_url: 'http://example.com/photo.jpg',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('photo_url') && e.includes('HTTPS'))).toBe(
          true,
        );
      }
    });

    it('rejects invalid URL for photo_url', () => {
      const result = validateBusinessContext({
        ...validInput,
        photo_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('photo_url'))).toBe(true);
      }
    });

    it('accepts valid HTTPS photo_url', () => {
      const result = validateBusinessContext({
        ...validInput,
        photo_url: 'https://cdn.example.com/images/product.png',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('platforms enum validation', () => {
    it('accepts valid platform values', () => {
      const result = validateBusinessContext({
        ...validInput,
        platforms: ['instagram', 'tiktok', 'linkedin'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.platforms).toEqual(['instagram', 'tiktok', 'linkedin']);
      }
    });

    it('rejects invalid platform values', () => {
      const result = validateBusinessContext({
        ...validInput,
        platforms: ['instagram', 'snapchat'],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('platforms'))).toBe(true);
      }
    });

    it('accepts all supported platforms', () => {
      const result = validateBusinessContext({
        ...validInput,
        platforms: [...SUPPORTED_PLATFORMS],
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty platforms array', () => {
      const result = validateBusinessContext({
        ...validInput,
        platforms: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('boundary values', () => {
    it('rejects business_name exceeding 100 characters', () => {
      const result = validateBusinessContext({
        ...validInput,
        business_name: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('business_name'))).toBe(true);
      }
    });

    it('accepts business_name at exactly 100 characters', () => {
      const result = validateBusinessContext({
        ...validInput,
        business_name: 'a'.repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it('rejects product_description shorter than 20 characters', () => {
      const result = validateBusinessContext({
        ...validInput,
        product_description: 'short desc',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('product_description'))).toBe(true);
      }
    });

    it('accepts product_description at exactly 20 characters', () => {
      const result = validateBusinessContext({
        ...validInput,
        product_description: 'a'.repeat(20),
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative price', () => {
      const result = validateBusinessContext({ ...validInput, price: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('price'))).toBe(true);
      }
    });

    it('rejects Infinity price', () => {
      const result = validateBusinessContext({ ...validInput, price: Infinity });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.includes('price'))).toBe(true);
      }
    });
  });
});
