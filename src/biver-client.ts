/**
 * UMKMate Marketing Orchestrator — Biver API Client
 *
 * HTTP client for the Biver.id REST API using native fetch.
 * Handles page generation, subdomain creation, product creation, and deployment.
 * Auth via X-API-Key header. Configurable timeout per request via AbortController.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { ApiError, TimeoutError } from './types.js';
import type {
  BiverClient,
  BiverClientConfig,
  BiverPageResponse,
  BusinessContext,
  DeployResponse,
  ProductParams,
  ProductResponse,
  SubdomainParams,
  SubdomainResponse,
} from './types.js';

/**
 * Creates a Biver API client configured with the given settings.
 *
 * Uses native fetch with AbortController for timeout management.
 * Throws ApiError on non-2xx responses and TimeoutError on abort/network errors.
 */
export function createBiverClient(config: BiverClientConfig): BiverClient {
  /**
   * Internal helper: performs an HTTP request with timeout and error handling.
   */
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${config.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      // Parse response body
      let responseBody: unknown;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        try {
          responseBody = await response.json();
        } catch {
          throw new ApiError(
            `Failed to parse JSON response from ${path}`,
            response.status,
          );
        }
      } else {
        const text = await response.text();
        throw new ApiError(
          `Non-JSON response from ${path}: ${text.slice(0, 200)}`,
          response.status,
          text,
        );
      }

      // Check for HTTP errors
      if (!response.ok) {
        const errorMsg =
          typeof responseBody === 'object' &&
          responseBody !== null &&
          'error' in responseBody
            ? (responseBody as { error: { message: string } }).error.message
            : `HTTP ${response.status}`;
        throw new ApiError(errorMsg, response.status, responseBody);
      }

      return responseBody as T;
    } catch (error: unknown) {
      if (error instanceof ApiError || error instanceof TimeoutError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError(
          `Request to ${path} timed out after ${config.timeoutMs}ms`,
        );
      }
      if (
        error instanceof TypeError &&
        (error.message.includes('fetch') || error.message.includes('network'))
      ) {
        throw new TimeoutError(`Network error calling ${path}: ${error.message}`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    /**
     * Create a landing page via Biver REST API.
     * Uses POST /v1/pages to create the page with title, slug, and description.
     *
     * Requirement 5.1: Call Biver_API to create a page using business info.
     */
    async generatePage(context: BusinessContext): Promise<BiverPageResponse> {
      return request<BiverPageResponse>('POST', '/v1/pages', {
        title: context.business_name,
        slug: context.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: context.product_description,
      });
    },

    /**
     * Create a subdomain for the landing page.
     *
     * Requirement 5.2: Create a subdomain using the business name as slug.
     */
    async createSubdomain(params: SubdomainParams): Promise<SubdomainResponse> {
      return request<SubdomainResponse>('POST', '/v1/subdomains', params);
    },

    /**
     * Create a product entry associated with the page.
     *
     * Requirement 5.3: Create a product entry with price and description.
     */
    async createProduct(params: ProductParams): Promise<ProductResponse> {
      return request<ProductResponse>('POST', '/v1/products', params);
    },

    /**
     * Deploy a page to make it publicly accessible.
     *
     * Requirement 5.4: Deploy the page to make the Landing_Page publicly accessible.
     */
    async deployPage(pageId: string): Promise<DeployResponse> {
      return request<DeployResponse>('POST', `/v1/pages/${pageId}/deploy`, {});
    },

    /**
     * Add a section to a page.
     * Uses POST /v1/sections?pageId={pageId}
     */
    async addSection(pageId: string, section: { type: string; name: string; order: number; visible: boolean; htmlContent: string }): Promise<unknown> {
      return request<unknown>('POST', `/v1/sections?pageId=${pageId}`, section);
    },
  };
}
