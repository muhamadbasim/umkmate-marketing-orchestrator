import { describe, it, expect } from 'vitest';
import { slugify } from './slug.js';

describe('slugify', () => {
  it('converts a simple business name to lowercase slug', () => {
    expect(slugify('Toko Sepatu')).toBe('toko-sepatu');
  });

  it('removes special characters', () => {
    expect(slugify('Café & Bistro!')).toBe('caf-bistro');
  });

  it('replaces multiple spaces with single hyphen', () => {
    expect(slugify('My   Cool   Shop')).toBe('my-cool-shop');
  });

  it('collapses multiple hyphens into one', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('strips leading and trailing hyphens', () => {
    expect(slugify('-hello-world-')).toBe('hello-world');
  });

  it('returns "unnamed" for empty string', () => {
    expect(slugify('')).toBe('unnamed');
  });

  it('returns "unnamed" for whitespace-only input', () => {
    expect(slugify('   ')).toBe('unnamed');
  });

  it('returns "unnamed" for all special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('unnamed');
  });

  it('strips unicode characters', () => {
    expect(slugify('Toko Baju 日本語')).toBe('toko-baju');
  });

  it('truncates very long names to max 50 characters', () => {
    const longName = 'this is a very long business name that exceeds the maximum allowed slug length for subdomains';
    const result = slugify(longName);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).not.toMatch(/^-|-$/);
  });

  it('handles names with numbers', () => {
    expect(slugify('Shop 123 Online')).toBe('shop-123-online');
  });

  it('handles mixed case input', () => {
    expect(slugify('UPPER lower MiXeD')).toBe('upper-lower-mixed');
  });

  it('handles input with only hyphens', () => {
    expect(slugify('---')).toBe('unnamed');
  });
});
