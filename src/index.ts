/**
 * UMKMate Marketing Orchestrator Agent — Entry Point
 *
 * Exports `register()` function following the OpenClaw skill pattern.
 * Loads configuration, validates required API keys at registration time,
 * and returns the skill object with parameters schema and execute handler.
 *
 * Requirements: 1.1, 1.2, 1.3
 */

import { loadConfig, validateRequiredKeys } from './config.js';
import { executeOrchestrator } from './orchestrator.js';
import type { OpenClawSkill } from './types.js';

/**
 * Register the marketing orchestrator as an OpenClaw skill.
 *
 * Validates required API keys at registration time — throws a descriptive
 * error if BIVER_API_KEY or REPLIZ_API_KEY is missing.
 *
 * @returns OpenClawSkill object with name, description, parameters, and execute
 */
export function register(): OpenClawSkill {
  const config = loadConfig();
  validateRequiredKeys(config);

  return {
    name: 'openclaw_marketing_agent',
    description:
      'Orchestrator marketing UMKM: buat landing page via Biver + posting sosmed via Repliz dalam satu eksekusi otomatis. Cukup kirim info bisnis, semua berjalan.',
    parameters: {
      type: 'object',
      required: ['message'],
      properties: {
        message: {
          type: 'string',
          description:
            'Pesan dari user berisi info bisnis (nama, produk, harga, target)',
        },
        user_id: {
          type: 'string',
          description: 'ID user untuk menyimpan profil bisnis (opsional)',
        },
      },
    },
    execute: async (input: unknown) => {
      const parsed = input as { message: string; user_id?: string };
      return executeOrchestrator(
        { message: parsed.message, user_id: parsed.user_id },
        config,
      );
    },
  };
}

// Direct execution support
const isDirectExecution = process.argv[1]?.endsWith('index.js') ?? false;
if (isDirectExecution) {
  const skill = register();
  console.log(`✓ ${skill.name} registered`);
  console.log(`  Description: ${skill.description}`);
}

export { executeOrchestrator } from './orchestrator.js';
export { executeMarketingPipeline } from './pipeline.js';
export { loadConfig } from './config.js';
export type {
  OpenClawSkill,
  ExecutionSummary,
  BusinessContext,
} from './types.js';
