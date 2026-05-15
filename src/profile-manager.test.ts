/**
 * Tests for Business Profile Manager
 *
 * Uses a temporary directory for each test to ensure isolation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createProfileManager } from './profile-manager.js';
import type { BusinessContext } from './types.js';

describe('ProfileManager', () => {
  let tempDir: string;

  const sampleContext: BusinessContext = {
    business_name: 'Toko Sepatu Jaya',
    product_description: 'Sepatu kulit handmade berkualitas tinggi untuk pria dan wanita',
    price: 350000,
    target_audience: 'Profesional muda usia 25-40',
    phone_number: '6281234567890',
    platforms: ['instagram', 'facebook'],
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'profile-manager-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('save()', () => {
    it('should save a profile and create the directory if needed', async () => {
      const nestedDir = join(tempDir, 'nested', 'profiles');
      const pm = createProfileManager(nestedDir);

      await pm.save('user-1', sampleContext);

      const loaded = await pm.load('user-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.user_id).toBe('user-1');
      expect(loaded!.business_name).toBe('Toko Sepatu Jaya');
      expect(loaded!.price).toBe(350000);
      expect(loaded!.created_at).toBeDefined();
      expect(loaded!.updated_at).toBeDefined();
    });

    it('should include all context fields in the saved profile', async () => {
      const pm = createProfileManager(tempDir);

      await pm.save('user-2', sampleContext);

      const loaded = await pm.load('user-2');
      expect(loaded!.target_audience).toBe('Profesional muda usia 25-40');
      expect(loaded!.phone_number).toBe('6281234567890');
      expect(loaded!.platforms).toEqual(['instagram', 'facebook']);
    });
  });

  describe('load()', () => {
    it('should return null for non-existent profile', async () => {
      const pm = createProfileManager(tempDir);

      const result = await pm.load('non-existent');
      expect(result).toBeNull();
    });

    it('should load a previously saved profile', async () => {
      const pm = createProfileManager(tempDir);

      await pm.save('user-3', sampleContext);
      const loaded = await pm.load('user-3');

      expect(loaded).not.toBeNull();
      expect(loaded!.business_name).toBe('Toko Sepatu Jaya');
    });
  });

  describe('update()', () => {
    it('should merge partial data into existing profile', async () => {
      const pm = createProfileManager(tempDir);

      await pm.save('user-4', sampleContext);
      await pm.update('user-4', { price: 400000, target_audience: 'Semua usia' });

      const loaded = await pm.load('user-4');
      expect(loaded!.price).toBe(400000);
      expect(loaded!.target_audience).toBe('Semua usia');
      // Unchanged fields remain
      expect(loaded!.business_name).toBe('Toko Sepatu Jaya');
    });

    it('should update the updated_at timestamp', async () => {
      const pm = createProfileManager(tempDir);

      await pm.save('user-5', sampleContext);
      const original = await pm.load('user-5');

      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10));
      await pm.update('user-5', { price: 500000 });

      const updated = await pm.load('user-5');
      expect(updated!.updated_at).not.toBe(original!.updated_at);
      expect(updated!.created_at).toBe(original!.created_at);
    });

    it('should throw if profile does not exist', async () => {
      const pm = createProfileManager(tempDir);

      await expect(pm.update('ghost', { price: 100 })).rejects.toThrow(
        'Profile not found for user: ghost',
      );
    });
  });

  describe('exists()', () => {
    it('should return false for non-existent profile', async () => {
      const pm = createProfileManager(tempDir);

      const result = await pm.exists('nobody');
      expect(result).toBe(false);
    });

    it('should return true for existing profile', async () => {
      const pm = createProfileManager(tempDir);

      await pm.save('user-6', sampleContext);
      const result = await pm.exists('user-6');
      expect(result).toBe(true);
    });
  });

  describe('loadAll()', () => {
    it('should return empty array when no profiles exist', async () => {
      const pm = createProfileManager(tempDir);

      const profiles = await pm.loadAll();
      expect(profiles).toEqual([]);
    });

    it('should return empty array when directory does not exist', async () => {
      const pm = createProfileManager(join(tempDir, 'nonexistent'));

      const profiles = await pm.loadAll();
      expect(profiles).toEqual([]);
    });

    it('should return all saved profiles', async () => {
      const pm = createProfileManager(tempDir);

      await pm.save('user-a', sampleContext);
      await pm.save('user-b', {
        ...sampleContext,
        business_name: 'Warung Makan Bu Siti',
      });

      const profiles = await pm.loadAll();
      expect(profiles).toHaveLength(2);

      const names = profiles.map((p) => p.business_name).sort();
      expect(names).toEqual(['Toko Sepatu Jaya', 'Warung Makan Bu Siti']);
    });
  });
});
