/**
 * UMKMate Marketing Orchestrator Agent — Business Profile Manager
 *
 * Manages persistent storage and retrieval of Business Profiles.
 * Profiles are stored as JSON files keyed by user ID in a configurable directory.
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { BusinessContext, BusinessProfile, ProfileManager } from './types.js';

/**
 * Create a ProfileManager instance that persists profiles as JSON files.
 *
 * @param profilePath - Directory path where profile JSON files are stored
 */
export function createProfileManager(profilePath: string): ProfileManager {
  return {
    async load(userId: string): Promise<BusinessProfile | null> {
      const filePath = join(profilePath, `${userId}.json`);
      try {
        const content = await readFile(filePath, 'utf-8');
        return JSON.parse(content) as BusinessProfile;
      } catch {
        return null;
      }
    },

    async save(userId: string, context: BusinessContext): Promise<void> {
      const now = new Date().toISOString();
      const profile: BusinessProfile = {
        user_id: userId,
        ...context,
        created_at: now,
        updated_at: now,
      };
      const filePath = join(profilePath, `${userId}.json`);
      await mkdir(profilePath, { recursive: true });
      await writeFile(filePath, JSON.stringify(profile, null, 2));
    },

    async update(userId: string, partial: Partial<BusinessContext>): Promise<void> {
      const existing = await this.load(userId);
      if (!existing) {
        throw new Error(`Profile not found for user: ${userId}`);
      }
      const updated: BusinessProfile = {
        ...existing,
        ...partial,
        updated_at: new Date().toISOString(),
      };
      const filePath = join(profilePath, `${userId}.json`);
      await writeFile(filePath, JSON.stringify(updated, null, 2));
    },

    async exists(userId: string): Promise<boolean> {
      const filePath = join(profilePath, `${userId}.json`);
      try {
        await access(filePath);
        return true;
      } catch {
        return false;
      }
    },

    async loadAll(): Promise<BusinessProfile[]> {
      try {
        const files = await readdir(profilePath);
        const jsonFiles = files.filter((f) => f.endsWith('.json'));
        const profiles: BusinessProfile[] = [];

        for (const file of jsonFiles) {
          const filePath = join(profilePath, file);
          try {
            const content = await readFile(filePath, 'utf-8');
            profiles.push(JSON.parse(content) as BusinessProfile);
          } catch {
            // Skip malformed files
          }
        }

        return profiles;
      } catch {
        // Directory doesn't exist yet — no profiles
        return [];
      }
    },
  };
}
