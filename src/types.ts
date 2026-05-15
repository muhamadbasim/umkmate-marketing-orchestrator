/**
 * UMKMate Marketing Orchestrator Agent — Type Definitions
 *
 * All interfaces for the orchestrator's input, output, configuration,
 * API client models, and error types.
 */

// ─── Input ───────────────────────────────────────────────────────────────────

export interface OrchestratorInput {
  message: string;
  user_id?: string;
}

export interface BusinessContext {
  business_name: string;
  product_description: string;
  price: number;
  target_audience?: string;
  photo_url?: string;
  phone_number?: string;
  platforms?: Platform[];
}

export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'linkedin';

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface BusinessProfile extends BusinessContext {
  user_id: string;
  created_at: string;
  updated_at: string;
}

// ─── Output ──────────────────────────────────────────────────────────────────

export type OrchestratorResponse = ExecutionSummary | FollowUpResponse | ErrorResponse;

export type OverallStatus = 'success' | 'partial' | 'failed';

export interface ExecutionSummary {
  type: 'summary';
  text: string;
  status: OverallStatus;
  correlationId: string;
  lpUrl: string;
  postsScheduled: ContentPost[];
  autoReplyActive: boolean;
}

export interface FollowUpResponse {
  type: 'follow_up';
  question: string;
  missingFields: string[];
  questionsRemaining: number;
}

export interface ErrorResponse {
  type: 'error';
  errors: string[];
  correlationId: string;
}

export interface ContentPost {
  platform: string;
  scheduledDate: string;
  status: 'scheduled' | 'failed';
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface AgentConfig {
  biver: BiverClientConfig;
  repliz: ReplizClientConfig;
  llm: LLMConfig;
  logger: LoggerConfig;
  retry: RetryOptions;
  webhook: WebhookConfig;
  cron: CronConfig;
  profile: ProfileConfig;
}

export interface BiverClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

export interface ReplizClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

export interface LLMConfig {
  model?: string;
  maxTokens: number;
  temperature: number;
}

export interface WebhookConfig {
  port: number;
  enabled: boolean;
}

export interface CronConfig {
  schedule: string;
  enabled: boolean;
}

export interface ProfileConfig {
  profilePath: string;
}

export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  retryableStatuses: number[];
  retryOnTimeout: boolean;
}

export interface LoggerConfig {
  logFilePath: string;
  level: 'debug' | 'info' | 'warn' | 'error';
}

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  errors: string[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ─── Error Types ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ─── OpenClaw Skill ──────────────────────────────────────────────────────────

export interface OpenClawSkill {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (input: unknown) => Promise<OrchestratorResponse>;
}

// ─── Logger ──────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AuditLogEntry {
  correlation_id: string;
  timestamp: string;
  level: LogLevel;
  event: string;
  data: Record<string, unknown>;
}

export interface AuditLogger {
  logEvent(level: LogLevel, event: string, data: Record<string, unknown>): void;
  logError(step: string, error: unknown): void;
  getCorrelationId(): string;
}

// ─── Context Extraction ──────────────────────────────────────────────────────

export interface ExtractionResult {
  context: Partial<BusinessContext>;
  confidence: Record<string, number>;
  missingCritical: string[];
}

// ─── LLM ─────────────────────────────────────────────────────────────────────

export interface LLMResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
}

// ─── Biver Step ──────────────────────────────────────────────────────────────

export interface BiverStepResult {
  success: boolean;
  lpUrl: string | null;
  fallbackUrl: string;
  paymentActive: boolean;
  dokuMerchantId: string | null;
}

// ─── Repliz Step ─────────────────────────────────────────────────────────────

export interface ReplizStepResult {
  success: boolean;
  contentGenerated: number;
  postsScheduled: ContentPost[];
  autoReplyActive: boolean;
  error?: string;
}

// ─── Profile Manager ─────────────────────────────────────────────────────────

export interface ProfileManager {
  load(userId: string): Promise<BusinessProfile | null>;
  save(userId: string, context: BusinessContext): Promise<void>;
  update(userId: string, partial: Partial<BusinessContext>): Promise<void>;
  exists(userId: string): Promise<boolean>;
  loadAll(): Promise<BusinessProfile[]>;
}

// ─── Repliz Client ───────────────────────────────────────────────────────────

export interface ContentGenParams {
  productDescription: string;
  targetAudience?: string;
  landingPageUrl: string;
  variationCount: number;
}

export interface ContentGenResponse {
  variations: ContentVariation[];
}

export interface ContentVariation {
  caption: string;
  hashtags: string[];
  platform?: string;
}

export interface ScheduleParams {
  content: ContentVariation[];
  platforms?: Platform[];
}

export interface ScheduleResponse {
  posts: ContentPost[];
}

export interface AutoReplyParams {
  message: string;
}

export interface AutoReplyResponse {
  active: boolean;
}

export interface ReplizClient {
  generateContent(params: ContentGenParams): Promise<ContentGenResponse>;
  scheduleAutoPost(params: ScheduleParams): Promise<ScheduleResponse>;
  activateAutoReply(params: AutoReplyParams): Promise<AutoReplyResponse>;
}

// ─── Biver Client ────────────────────────────────────────────────────────────

export interface BiverPageResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    slug?: string;
    description?: string;
    content?: { sections: unknown[] };
    suggestedSlug?: string;
    status?: string;
  };
}

export interface SubdomainParams {
  subdomain: string;
  title: string;
  description: string;
  pageId: string;
}

export interface SubdomainResponse {
  success: boolean;
  data: {
    id: string;
    subdomain: string;
    status: 'draft' | 'published' | 'archived';
  };
}

export interface ProductParams {
  name: string;
  slug?: string;
  description: string;
  price: number;
  images?: string[];
  isActive: boolean;
  pageId: string;
}

export interface ProductResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    price: number;
    dokuMerchantId?: string;
  };
}

export interface DeployResponse {
  success: boolean;
  data: {
    url: string;
    deployedAt: number;
  };
}

export interface BiverClient {
  generatePage(context: BusinessContext): Promise<BiverPageResponse>;
  createSubdomain(params: SubdomainParams): Promise<SubdomainResponse>;
  createProduct(params: ProductParams): Promise<ProductResponse>;
  deployPage(pageId: string): Promise<DeployResponse>;
  addSection(pageId: string, section: { type: string; name: string; order: number; visible: boolean; htmlContent: string }): Promise<unknown>;
}
