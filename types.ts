import { Type } from "@google/genai";

export type ModelTier = 'pro' | 'budget' | 'custom';

export interface StageModelConfig {
  planning: string;
  infographic: string;
  assembled: string;
  video: string;
  narration: string;
  enableVideo: boolean;
}

export interface ModelPricingEntry {
  id: string;
  displayName: string;
  type: 'token' | 'image' | 'video' | 'tts';
  rates: {
    inputPer1kTokens?: number;
    outputPer1kTokens?: number;
    perImage?: number;
    perVideo?: number;
    per1kChars?: number;
  };
  // Convenience aliases for backward compatibility
  inputPer1kTokens?: number;
  outputPer1kTokens?: number;
  perImage?: number;
  perVideo?: number;
  per1kChars?: number;
}

export interface ModelPreset {
  id: ModelTier;
  name: string;
  tagline: string;
  description: string;
  badgeColor?: string;
  config: StageModelConfig;
  estimatedCost?: number;
}

export interface UserPreferences {
  activeTier: ModelTier;
  customConfig: StageModelConfig;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING_RANDOM = 'GENERATING_RANDOM',
  PLANNING = 'PLANNING', // Flash: Structure & Headers
  GENERATING_INFOGRAPHIC = 'GENERATING_INFOGRAPHIC', // Pro Image: Exploded
  GENERATING_ASSEMBLY = 'GENERATING_ASSEMBLY', // Pro Image: Assembled (Image-to-Image)
  ENRICHING = 'ENRICHING', // Pro: Deep text details
  ANIMATING = 'ANIMATING', // Veo
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface ComponentPart {
  name: string;
  shortDescription: string;
  detailedContent?: string; // Long form educational content
  composition: string;
  sources?: string[]; // Google Search URLs
}

export interface ObjectPlan {
  displayTitle: string;
  category: string;
  domainType: 'PHYSICAL' | 'SOFTWARE' | 'CONCEPTUAL' | 'BIOLOGICAL' | 'OTHER';
  visualMetaphor: string; // Description of how to visualize this (e.g. "Exploded View", "Architecture Diagram", "Mind Map")
  sectionTitles: {
    origin: string;
    anatomy: string;
    article: string;
    trivia: string;
  };
  originStory: string; // Brief overview text
  detailedArticle: string; // Long form encyclopedic entry with Markdown
  trivia: string[]; // List of fun facts
  visualStylePrompt: string;
  componentList: string[];
  audioVibe: {
    voiceName: string;
    toneDescription: string;
  };
}

export interface AnalysisResult extends ObjectPlan {
  components: ComponentPart[];
}

export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
}

export interface GenerationItem {
  id: string;
  prompt: string;
  timestamp: number;
  
  // Data State
  plan: ObjectPlan | null;
  components: ComponentPart[]; // Populated progressively
  narrationScript: string | null;
  
  // Visual State
  infographicUrl: string | null;
  assembledUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  hasVideo: boolean;
  
  usage: TokenUsage[];

  // Model Tier & Configuration (Optional)
  tier?: ModelTier;
  config?: StageModelConfig;
}

/**
 * Sanitized Community Bundle (PROJECT.md § Interface Contracts)
 * Strictly scrubbed and allowlist-projected generation item with genuine binary Blobs.
 */
export interface SanitizedGenerationBundle {
  manifest: {
    id: string;
    topic: string;
    timestamp: string; // ISO 8601 string
    domain: string;
    metaphor: string;
    modelTier: ModelTier;
    modelsUsed: Partial<StageModelConfig>;
  };
  plan: ObjectPlan;
  components: ComponentPart[];
  narrationScript: string;
  media: {
    infographicBlob: Blob;
    assembledBlob: Blob;
    videoBlob?: Blob;
    audioBlob: Blob;
  };
}

/**
 * Public Community Catalog Item (PROJECT.md § Interface Contracts)
 * Represents an indexed topic item in Cloudflare R2 / showcase.
 */
export interface CommunityCatalogItem {
  id: string;
  topic: string;
  timestamp: string; // ISO 8601 string
  domain: string;
  metaphor: string;
  infographicUrl: string;
  assembledUrl: string;
  videoUrl?: string;
  audioUrl: string;
  previewUrl: string;
}

/**
 * Result of community contribution upload operation.
 */
export interface UploadResult {
  success: boolean;
  topicId: string;
  catalogItem?: CommunityCatalogItem;
  url?: string;
  isMock?: boolean;
  error?: string;
}

/**
 * Master catalog manifest stored in R2 (catalog.json)
 */
export interface CatalogManifest {
  version: string;
  lastUpdated: string;
  topics: CommunityCatalogItem[];
}