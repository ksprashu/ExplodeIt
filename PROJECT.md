# Project: ExplodeIt Community Contribution Storage & Public Showcase System

## Architecture
ExplodeIt is a React 19 + TypeScript + Vite educational application utilizing Google GenAI SDK.
The system is enhanced with:
1. **Model Tier Architecture (R2)**: Unified `MODEL_REGISTRY`, `MODEL_PRESETS` ('Pro Studio' vs 'Budget Saver'), and granular stage config persisting to `localStorage`. Dynamic token cost engine calculating run estimates and real-time session spend.
2. **Kinematic Prompt Engineering (R3)**: 4-tier anatomical deconstruction and isometric leader lines for infographics; 4-phase spatial motion directives with correct start/end frame alignment for Veo assembly videos.
3. **Community Storage & Sanitization (R1)**: Packaging client-side generation items into R2-compatible binary Blobs; strict allowlist serialization preventing any API key/token leakage; Cloudflare Pages Function `/api/contribute` with R2 binding and `catalog.json` indexing + static local mock driver.
4. **Multi-Tier Media Caching (R5)**: 3-tier caching (Cloudflare edge immutable HTTP headers, client-side IndexedDB Blob cache `explodeit_media_cache_v1` with LRU eviction, in-memory ObjectURL pool) to eliminate redundant network transfers.
5. **Keyless Showcase & Carousel (R4)**: Decoupled startup authentication enabling instant home-screen exploration of pre-generated topics without an API key; keyword search filtering; one-click interactive loading into `DisplayArea.tsx`; seamless transition to generation workspace for custom prompts.
6. **Isolated Git Worktree (R6)**: Dedicated worktree on branch `feature/community-store-and-models` with Vitest contract testing and typecheck gates.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Baseline Worktree & Type Safety | Commit pending M1 files, create worktree `feature/community-store-and-models`, fix 2 tsc errors, add test runner | M1 | ORIGINAL_REQUEST §R6 |
| 2 | Model Registry & Pricing Engine | Unified registry, dynamic cost calculation, run cost estimation for all models | M2 | ORIGINAL_REQUEST §R2 |
| 3 | Model Tier UI & Persistence | Segmented header control [Pro Studio \| Budget Saver], settings modal with advanced overrides, localStorage persistence | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Infographic Prompt Upgrade | Multi-tier component separation, internal cutaways, isometric leader lines, 5600K studio illumination | M2 | ORIGINAL_REQUEST §R3 |
| 5 | Veo Assembly Kinematic Prompt Upgrade | Spatial motion directives, interlocking sub-assemblies, correct start=infographic/end=assembled frame orientation | M2 | ORIGINAL_REQUEST §R3 |
| 6 | Bundle Packaging & Allowlist Sanitization | Convert base64/Blob to binary Blobs; strip all keys, tokens, credentials, and session state | M3 | ORIGINAL_REQUEST §R1 |
| 7 | Cloudflare R2 Upload & Worker Endpoint | Cloudflare Pages Function `/api/contribute`, R2 bucket integration, catalog manifest index, and offline mock driver | M3 | ORIGINAL_REQUEST §R1 |
| 8 | Post-Generation Opt-In Contribution Flow | Non-intrusive dialog at `App.tsx:185` with zero-cost and privacy reassurance badges | M3 | ORIGINAL_REQUEST §R1 |
| 9 | Multi-Tier Media Cache & Egress Elimination | IndexedDB Blob cache (`explodeit_media_cache_v1`), in-memory ObjectURL pool, LRU eviction, immutable HTTP headers | M4 | ORIGINAL_REQUEST §R5 |
| 10 | Keyless Home Exploration & Startup Decoupling | Decouple API key modal from initial load, render showcase on idle | M5 | ORIGINAL_REQUEST §R4 |
| 11 | Showcase Carousel & Topic Card Grid | Responsive hero carousel, topic card gallery, category/keyword search filtering | M5 | ORIGINAL_REQUEST §R4 |
| 12 | One-Click Interactive Showcase Loading | Instant load of full deconstruction into DisplayArea without API key; transition to generation on custom query | M5 | ORIGINAL_REQUEST §R4 |
| 13 | Final Integration & E2E Test Suite Pass | 100% pass of Tiers 1-4 test suite, Tier 5 adversarial hardening | M6 | ORIGINAL_REQUEST Acceptance |
| 14 | Safe Git Merge to Main | Clean, conflict-free merge of feature branch into main with passing verification | M6 | ORIGINAL_REQUEST §R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Git Worktree, Type Safety & Test Harness | Commit M1 files, create worktree `feature/community-store-and-models`, fix tsc errors, install Vitest | none | DONE |
| M2 | Model Tiers, Dynamic Pricing & Kinematic Prompts | Types, MODEL_REGISTRY, presets, UI controls, calculateModelCost, upgraded prompts | M1 | DONE |
| M3 | Community Cloud Storage & Contribution Flow | Packaging, allowlist sanitization, Pages function, mock driver, opt-in contribution dialog | M1, M2 | DONE |
| M4 | Multi-Tier Media Caching & Egress Elimination | IndexedDB media cache, ObjectURL pool, LRU policy, immutable headers | M3 | DONE |
| M5 | Community Showcase Carousel & Keyless Exploration | Decouple key modal, CommunityShowcase component, search filter, one-click load | M2, M4 | DONE |
| M6 | Final Integration, E2E Pass, Adversarial Hardening & Main Merge | 100% E2E test pass, Tier 5 adversarial audit, clean merge to main | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts

### M2: Model Config ↔ Gemini Service
```typescript
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
}

export function calculateModelCost(modelId: string, inputTokens: number, outputTokens: number, charCount?: number): number;
export function estimateRunCost(config: StageModelConfig): number;
```

### M3: Generation Item ↔ Community Storage
```typescript
export interface SanitizedGenerationBundle {
  manifest: {
    id: string;
    topic: string;
    timestamp: string;
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

export interface CommunityCatalogItem {
  id: string;
  topic: string;
  timestamp: string;
  domain: string;
  metaphor: string;
  infographicUrl: string;
  assembledUrl: string;
  videoUrl?: string;
  audioUrl: string;
  previewUrl: string;
}

export function bundleGenerationItem(item: GenerationItem, tier: ModelTier, config: StageModelConfig): Promise<SanitizedGenerationBundle>;
export function uploadCommunityBundle(bundle: SanitizedGenerationBundle): Promise<{ success: boolean; topicId: string }>;
export function fetchCommunityCatalog(): Promise<CommunityCatalogItem[]>;
```

### M4: Media Cache ↔ App / Showcase
```typescript
export interface MediaCacheService {
  getMediaBlob(urlOrKey: string): Promise<Blob | null>;
  setMediaBlob(urlOrKey: string, blob: Blob): Promise<void>;
  getCachedObjectURL(urlOrKey: string, blob: Blob): string;
  clearCache(): Promise<void>;
}
```

## Code Layout
- `App.tsx`: Main state machine, completion hook, showcase toggle, keyless routing.
- `types.ts`: Global interfaces, ModelTier, StageModelConfig, SanitizedBundle.
- `constants.ts`: MODEL_REGISTRY, MODEL_PRESETS, PROMPTS (upgraded infographic & assembly).
- `services/geminiService.ts`: Dynamic cost calculation, stage overrides, Veo frame alignment.
- `services/communityStorage.ts`: Bundle packaging, zero-leak sanitization, R2 upload & fetch.
- `services/mockCommunityStorage.ts`: Static local mock driver and pre-seeded showcase fixtures.
- `services/mediaCache.ts`: IndexedDB media blob caching and ObjectURL lifecycle.
- `components/ModelSettingsModal.tsx`: Preset switcher, video toggle, advanced accordion.
- `components/CommunityContributeModal.tsx`: Post-generation contribution dialog with transparency badges.
- `components/CommunityShowcase.tsx`: Responsive carousel, topic card grid, search bar.
- `functions/api/contribute.ts`: Cloudflare Pages Function endpoint with R2 binding.
- `tests/`: Automated contract and E2E test suites.
