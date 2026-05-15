/**
 * UMKMate Marketing Orchestrator Agent — Webhook Server
 *
 * Optional HTTP server for external triggers. Accepts POST /trigger
 * with user_id and optional message, executes the pipeline using
 * stored Business Profile.
 *
 * Requirements: 10.1, 10.3, 10.4
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AgentConfig } from './types.js';
import { executeOrchestrator } from './orchestrator.js';

/**
 * Starts the webhook HTTP server if enabled in config.
 * Listens for POST /trigger requests with { user_id, message? } payload.
 */
export function startWebhookServer(config: AgentConfig): void {
  if (!config.webhook.enabled) return;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST' || req.url !== '/trigger') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    try {
      const body = await readBody(req);
      const payload = JSON.parse(body) as { message?: string; user_id?: string };

      if (!payload.message && !payload.user_id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errors: ['Either message or user_id is required'] }));
        return;
      }

      const result = await executeOrchestrator(
        { message: payload.message ?? '', user_id: payload.user_id },
        config,
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(error) }));
    }
  });

  server.listen(config.webhook.port, () => {
    console.log(`Webhook server listening on port ${config.webhook.port}`);
  });
}

/**
 * Reads the full request body from an IncomingMessage stream.
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}
