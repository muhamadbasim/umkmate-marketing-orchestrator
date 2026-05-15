import { describe, it, expect } from 'vitest';
import { buildFollowUpQuestion, MAX_FOLLOW_UP_QUESTIONS } from './follow-up.js';

describe('follow-up handler', () => {
  describe('MAX_FOLLOW_UP_QUESTIONS', () => {
    it('is set to 3', () => {
      expect(MAX_FOLLOW_UP_QUESTIONS).toBe(3);
    });
  });

  describe('buildFollowUpQuestion', () => {
    it('returns null when questionsAsked >= MAX_FOLLOW_UP_QUESTIONS', () => {
      const result = buildFollowUpQuestion(['business_name'], 3);
      expect(result).toBeNull();
    });

    it('returns null when questionsAsked exceeds MAX_FOLLOW_UP_QUESTIONS', () => {
      const result = buildFollowUpQuestion(['business_name'], 5);
      expect(result).toBeNull();
    });

    it('returns null when missingFields is empty', () => {
      const result = buildFollowUpQuestion([], 0);
      expect(result).toBeNull();
    });

    it('returns a FollowUpResponse for a single missing field', () => {
      const result = buildFollowUpQuestion(['business_name'], 0);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('follow_up');
      expect(result!.missingFields).toEqual(['business_name']);
      expect(result!.questionsRemaining).toBe(2);
      expect(result!.question).toContain('nama bisnis');
    });

    it('returns a FollowUpResponse for multiple missing fields', () => {
      const result = buildFollowUpQuestion(['business_name', 'price'], 0);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('follow_up');
      expect(result!.missingFields).toEqual(['business_name', 'price']);
      expect(result!.question).toContain('nama bisnis');
      expect(result!.question).toContain('harga produk');
    });

    it('formats question in Bahasa Indonesia', () => {
      const result = buildFollowUpQuestion(['product_description'], 1);
      expect(result).not.toBeNull();
      expect(result!.question).toContain('Mohon informasikan');
      expect(result!.question).toContain('deskripsi produk');
    });

    it('calculates questionsRemaining correctly', () => {
      const result0 = buildFollowUpQuestion(['business_name'], 0);
      expect(result0!.questionsRemaining).toBe(2);

      const result1 = buildFollowUpQuestion(['business_name'], 1);
      expect(result1!.questionsRemaining).toBe(1);

      const result2 = buildFollowUpQuestion(['business_name'], 2);
      expect(result2!.questionsRemaining).toBe(0);
    });

    it('uses multi-field format when more than one field is missing', () => {
      const result = buildFollowUpQuestion(
        ['business_name', 'product_description', 'price'],
        0,
      );
      expect(result).not.toBeNull();
      expect(result!.question).toContain('Saya butuh beberapa informasi tambahan');
      expect(result!.question).toContain('Mohon berikan detailnya');
    });

    it('handles unknown field names gracefully', () => {
      const result = buildFollowUpQuestion(['unknown_field'], 0);
      expect(result).not.toBeNull();
      expect(result!.question).toContain('unknown_field');
    });
  });
});
