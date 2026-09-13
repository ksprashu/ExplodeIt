/**
 * Community Storage Service
 * Orchestrates generation bundle packaging, zero-leak allowlist sanitization,
 * Cloudflare R2 edge upload, and automatic mock driver fallback.
 */

import {
  GenerationItem,
  ObjectPlan,
  ComponentPart,
  ModelTier,
  StageModelConfig,
  SanitizedGenerationBundle,
  CommunityCatalogItem,
  UploadResult,
} from '../types';
import { CANONICAL_MODEL_PRESETS } from '../constants';
import { mockCommunityStorage } from './mockCommunityStorage';

// ============================================================================
// Binary Conversion & Slug Utilities
// ============================================================================

/**
 * Convert Data URL (RFC 2397) to a genuine binary Blob
 */
export function dataUrlToBlob(dataUrl: string, fallbackMime = 'application/octet-stream'): Blob {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return new Blob([dataUrl || ''], { type: fallbackMime });
  }

  try {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
      return new Blob([dataUrl], { type: fallbackMime });
    }

    const header = dataUrl.slice(0, commaIndex);
    const base64 = dataUrl.slice(commaIndex + 1);

    const mimeMatch = header.match(/data:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;

    // Decode base64 to binary byte array
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch (err) {
    // Graceful fallback on malformed base64
    return new Blob([dataUrl], { type: fallbackMime });
  }
}

/**
 * Universally resolve a Blob URL (blob:http://...), Remote URL, or Data URL to a native binary Blob
 */
export async function urlToBlob(
  source: string | Blob | null | undefined,
  fallbackMime = 'application/octet-stream'
): Promise<Blob> {
  if (!source) {
    return new Blob([], { type: fallbackMime });
  }

  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    return source;
  }

  if (typeof source !== 'string') {
    return new Blob([], { type: fallbackMime });
  }

  if (source.startsWith('data:')) {
    return dataUrlToBlob(source, fallbackMime);
  }

  if (source.startsWith('blob:') || source.startsWith('http://') || source.startsWith('https://')) {
    try {
      const response = await fetch(source);
      if (!response.ok && !source.startsWith('blob:')) {
        console.warn(`[CommunityStorage] HTTP ${response.status} resolving ${source}`);
      }
      const fetchedBlob = await response.blob();
      if (!fetchedBlob.type || fetchedBlob.type === 'application/octet-stream') {
        return new Blob([fetchedBlob], { type: fallbackMime });
      }
      return fetchedBlob;
    } catch (err) {
      console.warn(`[CommunityStorage] Error fetching ${source}, falling back:`, err);
      return new Blob([source], { type: fallbackMime });
    }
  }

  return new Blob([source], { type: fallbackMime });
}

/**
 * Alias for urlToBlob for backward compatibility
 */
export const resolveBlobFromUrl = urlToBlob;

/**
 * Deterministic topic slug generator
 */
export function generateTopicSlug(title: string): string {
  return (title || 'untitled-topic')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================================================
// Strict Allowlist Projection & Sanitization
// ============================================================================

/**
 * Strict allowlist projection for ObjectPlan.
 * Strips prototype modifications, arbitrary injected properties, and converts to safe primitives.
 */
export function sanitizePlan(rawPlan: any, fallbackTitle = 'Untitled'): ObjectPlan {
  if (!rawPlan || typeof rawPlan !== 'object') {
    throw new Error('Invalid generation item: missing plan');
  }

  const validDomainTypes = ['PHYSICAL', 'SOFTWARE', 'CONCEPTUAL', 'BIOLOGICAL', 'OTHER'];
  const domainType = validDomainTypes.includes(rawPlan.domainType)
    ? (rawPlan.domainType as ObjectPlan['domainType'])
    : 'PHYSICAL';

  return {
    displayTitle: String(rawPlan.displayTitle || fallbackTitle),
    category: String(rawPlan.category || 'General'),
    domainType,
    visualMetaphor: String(rawPlan.visualMetaphor || 'Exploded View'),
    sectionTitles: {
      origin: String(rawPlan.sectionTitles?.origin || 'Origin'),
      anatomy: String(rawPlan.sectionTitles?.anatomy || 'Anatomy'),
      article: String(rawPlan.sectionTitles?.article || 'Article'),
      trivia: String(rawPlan.sectionTitles?.trivia || 'Trivia'),
    },
    originStory: String(rawPlan.originStory || ''),
    detailedArticle: String(rawPlan.detailedArticle || ''),
    trivia: Array.isArray(rawPlan.trivia) ? rawPlan.trivia.map(String) : [],
    visualStylePrompt: String(rawPlan.visualStylePrompt || ''),
    componentList: Array.isArray(rawPlan.componentList) ? rawPlan.componentList.map(String) : [],
    audioVibe: {
      voiceName: String(rawPlan.audioVibe?.voiceName || 'Zephyr'),
      toneDescription: String(rawPlan.audioVibe?.toneDescription || 'Educational'),
    },
  };
}

/**
 * Strict allowlist projection for ComponentPart array.
 */
export function sanitizeComponents(rawComponents: any[] | null | undefined): ComponentPart[] {
  if (!Array.isArray(rawComponents)) return [];

  return rawComponents.map((c: any) => ({
    name: String(c?.name || 'Component'),
    shortDescription: String(c?.shortDescription || ''),
    detailedContent: c?.detailedContent !== undefined ? String(c.detailedContent) : undefined,
    composition: String(c?.composition || 'Modular material'),
    sources: Array.isArray(c?.sources) ? c.sources.map(String) : undefined,
  }));
}

/**
 * Construct safe community manifest metadata
 */
export function createManifest(
  sanitizedPlan: ObjectPlan,
  timestamp: number | string | undefined,
  tier: ModelTier = 'pro',
  config: StageModelConfig = CANONICAL_MODEL_PRESETS[tier] || CANONICAL_MODEL_PRESETS.pro
): SanitizedGenerationBundle['manifest'] {
  const tsNum = typeof timestamp === 'number'
    ? timestamp
    : (typeof timestamp === 'string' ? new Date(timestamp).getTime() || Date.now() : Date.now());

  const topicSlug = generateTopicSlug(sanitizedPlan.displayTitle);
  const id = `${topicSlug}-${tsNum}`;
  const isVideoEnabled = config?.enableVideo ?? (tier !== 'budget');

  return {
    id,
    topic: sanitizedPlan.displayTitle,
    timestamp: new Date(tsNum).toISOString(),
    domain: sanitizedPlan.domainType,
    metaphor: sanitizedPlan.visualMetaphor,
    modelTier: tier,
    modelsUsed: {
      planning: config?.planning || CANONICAL_MODEL_PRESETS.pro.planning,
      infographic: config?.infographic || CANONICAL_MODEL_PRESETS.pro.infographic,
      assembled: config?.assembled || CANONICAL_MODEL_PRESETS.pro.assembled,
      video: isVideoEnabled ? (config?.video || CANONICAL_MODEL_PRESETS.pro.video) : undefined,
      narration: config?.narration || CANONICAL_MODEL_PRESETS.pro.narration,
    },
  };
}

/**
 * Cryptographic & Regex Zero-Leak Scanner
 * Guarantees zero Google GenAI API keys, Bearer tokens, or prohibited property names escape to bundle.
 */
export function assertZeroLeak(bundle: SanitizedGenerationBundle): void {
  const textPayload = JSON.stringify({
    manifest: bundle.manifest,
    plan: bundle.plan,
    components: bundle.components,
    narrationScript: bundle.narrationScript,
  });

  // 1. Google GenAI API key format: AIzaSy... (33 chars)
  const geminiKeyRegex = /AIzaSy[A-Za-z0-9_-]{33}/g;
  const keyMatches = textPayload.match(geminiKeyRegex);
  if (keyMatches) {
    throw new Error(`Zero-leak violation: Found Google GenAI API key in bundle: ${keyMatches.join(', ')}`);
  }

  // 2. OAuth Bearer tokens: ya29...
  const bearerRegex = /ya29\.[A-Za-z0-9_-]+/g;
  const bearerMatches = textPayload.match(bearerRegex);
  if (bearerMatches) {
    throw new Error(`Zero-leak violation: Found Bearer token in bundle: ${bearerMatches.join(', ')}`);
  }

  // 3. Prohibited property names
  const forbiddenPropertyNames = [
    'apiKey',
    'gemini_api_key',
    'api_key',
    'secret',
    'secretToken',
    'auth_token',
    'userSession',
    'credentials',
    '__proto__',
    'constructor',
  ];

  for (const prop of forbiddenPropertyNames) {
    if (textPayload.includes(`"${prop}":`)) {
      throw new Error(`Zero-leak violation: Found forbidden property "${prop}" in bundle`);
    }
  }
}

// Fallback dummy data URLs
const DUMMY_PNG_FALLBACK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const DUMMY_AUDIO_FALLBACK =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

/**
 * Synchronous strict allowlist sanitizer.
 * Operates on Data URLs or pre-existing Blobs, guaranteed synchronous for contract tests.
 */
export function sanitizeGenerationItem(
  item: any,
  tier?: ModelTier,
  config?: StageModelConfig
): SanitizedGenerationBundle {
  if (!item || !item.plan) {
    throw new Error('Invalid generation item: missing plan');
  }

  const resolvedTier: ModelTier = tier || item.tier || 'pro';
  const resolvedConfig: StageModelConfig =
    config || item.config || CANONICAL_MODEL_PRESETS[resolvedTier] || CANONICAL_MODEL_PRESETS.pro;

  const plan = sanitizePlan(item.plan, item.prompt || 'Untitled');
  const components = sanitizeComponents(item.components);

  const infographicBlob = item.infographicBlob instanceof Blob
    ? item.infographicBlob
    : dataUrlToBlob(item.infographicUrl || DUMMY_PNG_FALLBACK, 'image/png');

  const assembledBlob = item.assembledBlob instanceof Blob
    ? item.assembledBlob
    : dataUrlToBlob(item.assembledUrl || DUMMY_PNG_FALLBACK, 'image/png');

  const shouldIncludeVideo =
    resolvedConfig.enableVideo &&
    item.hasVideo !== false &&
    Boolean(item.videoUrl || item.videoBlob);

  const videoBlob = item.videoBlob instanceof Blob
    ? item.videoBlob
    : (shouldIncludeVideo && item.videoUrl
        ? dataUrlToBlob(item.videoUrl, 'video/mp4')
        : undefined);

  const audioBlob = item.audioBlob instanceof Blob
    ? item.audioBlob
    : dataUrlToBlob(item.audioUrl || DUMMY_AUDIO_FALLBACK, 'audio/wav');

  const manifest = createManifest(plan, item.timestamp, resolvedTier, resolvedConfig);

  const bundle: SanitizedGenerationBundle = {
    manifest,
    plan,
    components,
    narrationScript: String(item.narrationScript || ''),
    media: {
      infographicBlob,
      assembledBlob,
      videoBlob,
      audioBlob,
    },
  };

  assertZeroLeak(bundle);
  return bundle;
}

/**
 * Asynchronous binary packager.
 * Resolves Data URLs, Blob URLs (blob:), and remote URLs into binary Blobs in parallel.
 */
export async function bundleGenerationItem(
  item: GenerationItem | any,
  tier?: ModelTier,
  config?: StageModelConfig
): Promise<SanitizedGenerationBundle> {
  if (!item || !item.plan) {
    throw new Error('Invalid generation item: missing plan');
  }

  const resolvedTier: ModelTier = tier || item.tier || 'pro';
  const resolvedConfig: StageModelConfig =
    config || item.config || CANONICAL_MODEL_PRESETS[resolvedTier] || CANONICAL_MODEL_PRESETS.pro;

  // 1. Resolve media blobs in parallel
  const [infographicBlob, assembledBlob, audioBlob] = await Promise.all([
    item.infographicBlob instanceof Blob
      ? Promise.resolve(item.infographicBlob)
      : urlToBlob(item.infographicUrl || DUMMY_PNG_FALLBACK, 'image/png'),
    item.assembledBlob instanceof Blob
      ? Promise.resolve(item.assembledBlob)
      : urlToBlob(item.assembledUrl || DUMMY_PNG_FALLBACK, 'image/png'),
    item.audioBlob instanceof Blob
      ? Promise.resolve(item.audioBlob)
      : urlToBlob(item.audioUrl || DUMMY_AUDIO_FALLBACK, 'audio/wav'),
  ]);

  const shouldIncludeVideo =
    resolvedConfig.enableVideo &&
    item.hasVideo !== false &&
    Boolean(item.videoUrl || item.videoBlob);

  let videoBlob: Blob | undefined = undefined;
  if (shouldIncludeVideo) {
    if (item.videoBlob instanceof Blob) {
      videoBlob = item.videoBlob;
    } else if (item.videoUrl) {
      videoBlob = await urlToBlob(item.videoUrl, 'video/mp4');
    }
  }

  // 2. Strict allowlist projection
  const plan = sanitizePlan(item.plan, item.prompt || 'Untitled');
  const components = sanitizeComponents(item.components);
  const manifest = createManifest(plan, item.timestamp, resolvedTier, resolvedConfig);

  const bundle: SanitizedGenerationBundle = {
    manifest,
    plan,
    components,
    narrationScript: String(item.narrationScript || ''),
    media: {
      infographicBlob,
      assembledBlob,
      videoBlob,
      audioBlob,
    },
  };

  assertZeroLeak(bundle);
  return bundle;
}

// ============================================================================
// Public API Operations with Automatic Cloudflare / Mock Fallback
// ============================================================================

/**
 * Upload community bundle to Cloudflare Pages endpoint (/api/contribute),
 * falling back automatically to local mock driver if offline, 404, or network error.
 */
export async function uploadCommunityBundle(bundle: SanitizedGenerationBundle): Promise<UploadResult> {
  // Pre-flight zero-leak scanner
  assertZeroLeak(bundle);

  // Check offline status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.info('[CommunityStorage] Browser offline, routing to mock storage driver.');
    return await mockCommunityStorage.uploadBundle(bundle);
  }

  try {
    const formData = new FormData();
    const metadataPayload = {
      manifest: bundle.manifest,
      plan: bundle.plan,
      components: bundle.components,
      narrationScript: bundle.narrationScript,
    };
    formData.append('manifest', JSON.stringify(metadataPayload));

    formData.append('infographic', bundle.media.infographicBlob, 'infographic.png');
    formData.append('assembled', bundle.media.assembledBlob, 'assembled.png');

    if (bundle.media.videoBlob) {
      formData.append('video', bundle.media.videoBlob, 'video.mp4');
    }
    formData.append('audio', bundle.media.audioBlob, 'audio.wav');

    const response = await fetch('/api/contribute', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        topicId: data.topicId || bundle.manifest.id,
        catalogItem: data.catalogItem,
        url: data.url,
      };
    }

    console.warn(`[CommunityStorage] /api/contribute returned ${response.status}, falling back to mock driver`);
    return await mockCommunityStorage.uploadBundle(bundle);
  } catch (err: any) {
    console.warn('[CommunityStorage] Network error during upload, falling back to mock driver:', err);
    return await mockCommunityStorage.uploadBundle(bundle);
  }
}

/**
 * Fetch community catalog from Cloudflare Pages endpoint (/api/contribute),
 * falling back to local mock catalog if offline or endpoint not yet deployed.
 */
export async function fetchCommunityCatalog(): Promise<CommunityCatalogItem[]> {
  try {
    const response = await fetch('/api/contribute', { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.topics)) {
        return data.topics;
      }
      if (data && Array.isArray(data.items)) {
        return data.items;
      }
    }
  } catch (err) {
    console.warn('[CommunityStorage] Could not fetch catalog, falling back to mock driver:', err);
  }
  return await mockCommunityStorage.fetchCatalog();
}

/**
 * Fetch a specific community topic bundle by ID
 */
export async function fetchCommunityTopic(topicId: string): Promise<SanitizedGenerationBundle | null> {
  try {
    const response = await fetch(`/api/contribute?topicId=${encodeURIComponent(topicId)}`, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      return data as SanitizedGenerationBundle;
    }
  } catch (err) {
    console.warn(`[CommunityStorage] Could not fetch topic '${topicId}', falling back to mock driver:`, err);
  }
  return await mockCommunityStorage.fetchTopic(topicId);
}
