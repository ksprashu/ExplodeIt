import { Type } from "@google/genai";

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
}