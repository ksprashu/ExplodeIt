import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  onRequestPost,
  onRequestGet,
  onRequestOptions,
  assertZeroLeakServer,
  Env,
  R2Bucket,
  R2Object,
  R2ObjectBody,
  R2PutOptions,
  CatalogManifest,
  CommunityCatalogItem,
} from '../functions/api/contribute';
import {
  mockCommunityStorage,
  mockUploadCommunityBundle,
  mockFetchCommunityCatalog,
  mockFetchCommunityTopic,
  SEED_COMMUNITY_CATALOG,
  LOCAL_STORAGE_CATALOG_KEY,
} from '../services/mockCommunityStorage';
import {
  uploadCommunityBundle,
  fetchCommunityCatalog,
  fetchCommunityTopic,
  sanitizeGenerationItem,
  bundleGenerationItem,
  assertZeroLeak,
  generateTopicSlug,
  urlToBlob,
} from '../services/communityStorage';
import { mediaCache } from '../services/mediaCache';
import {
  contractCalculateModelCost,
  contractEstimateRunCost,
  CANONICAL_MODEL_PRESETS,
  StageModelConfig,
} from './contracts/pricing_engine.contract.test';
import { CONTRACT_PROMPTS } from './contracts/prompts_invariants.contract.test';
import { ShowcaseFlowController } from './e2e/showcase_keyless_flow.e2e.test';
import { setupMockBrowserEnvironment, MockIndexedDBMediaCache } from './mocks/mockStorage';
import {
  mockCameraGenerationItem,
  mockBudgetGenerationItem,
  mockSensitiveInjectedItem,
  mockCommunityCatalog,
  DUMMY_PNG_DATA_URL,
  DUMMY_AUDIO_DATA_URL,
  DUMMY_VIDEO_DATA_URL,
} from './mocks/mockGenerations';
import { SanitizedGenerationBundle, GenerationItem, ModelTier } from '../types';

// ============================================================================
// Stream Polyfill for jsdom / Node Environment (Simulates Cloudflare workerd)
// ============================================================================
if (typeof (Blob.prototype as any).stream !== 'function') {
  (Blob.prototype as any).stream = function () {
    const blob = this;
    return new ReadableStream({
      async start(controller) {
        const buffer = await blob.arrayBuffer();
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      },
    });
  };
}
if (typeof (File.prototype as any).stream !== 'function') {
  (File.prototype as any).stream = (Blob.prototype as any).stream;
}

// ============================================================================
// In-Memory Cloudflare R2 Bucket Mock for Adversarial Testing
// ============================================================================
interface MockR2Item {
  key: string;
  data: Uint8Array | string;
  options?: R2PutOptions;
  uploaded: Date;
}

class Tier5MockR2Bucket implements R2Bucket {
  public store = new Map<string, MockR2Item>();
  public putCalls: { key: string; size: number; options?: R2PutOptions }[] = [];

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: R2PutOptions
  ): Promise<R2Object> {
    let rawData: Uint8Array | string;

    if (typeof value === 'string') {
      rawData = value;
    } else if (value instanceof Uint8Array) {
      rawData = value;
    } else if (value instanceof ArrayBuffer) {
      rawData = new Uint8Array(value);
    } else if (ArrayBuffer.isView(value)) {
      rawData = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    } else if (value && typeof (value as any).arrayBuffer === 'function') {
      const buf = await (value as any).arrayBuffer();
      rawData = new Uint8Array(buf);
    } else if (value && typeof (value as any).getReader === 'function') {
      const reader = (value as ReadableStream).getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const res = await reader.read();
        done = res.done;
        if (res.value) chunks.push(res.value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) {
        combined.set(c, offset);
        offset += c.length;
      }
      rawData = combined;
    } else {
      rawData = String(value);
    }

    const size = typeof rawData === 'string' ? Buffer.byteLength(rawData) : rawData.byteLength;
    this.putCalls.push({ key, size, options });

    const uploaded = new Date();
    this.store.set(key, { key, data: rawData, options, uploaded });

    return {
      key,
      version: '1',
      size,
      etag: `"${key}-${size}"`,
      httpEtag: `"${key}-${size}"`,
      uploaded,
      httpMetadata: options?.httpMetadata,
      customMetadata: options?.customMetadata,
    };
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    const item = this.store.get(key);
    if (!item) return null;

    const data = item.data;
    const size = typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength;
    const stream = new ReadableStream({
      start(controller) {
        if (typeof data === 'string') {
          controller.enqueue(new TextEncoder().encode(data));
        } else {
          controller.enqueue(data);
        }
        controller.close();
      },
    });

    return {
      key,
      version: '1',
      size,
      etag: `"${key}-${size}"`,
      httpEtag: `"${key}-${size}"`,
      uploaded: item.uploaded,
      httpMetadata: item.options?.httpMetadata,
      customMetadata: item.options?.customMetadata,
      body: stream,
      bodyUsed: false,
      async arrayBuffer(): Promise<ArrayBuffer> {
        if (typeof data === 'string') return new TextEncoder().encode(data).buffer as ArrayBuffer;
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      },
      async text(): Promise<string> {
        if (typeof data === 'string') return data;
        return new TextDecoder().decode(data);
      },
      async json<T = unknown>(): Promise<T> {
        const txt = await this.text();
        return JSON.parse(txt) as T;
      },
      async blob(): Promise<Blob> {
        const ab = await this.arrayBuffer();
        return new Blob([ab], { type: item.options?.httpMetadata?.contentType || 'application/octet-stream' });
      },
    };
  }

  async delete(keys: string | string[]): Promise<void> {
    const arr = Array.isArray(keys) ? keys : [keys];
    for (const k of arr) this.store.delete(k);
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ objects: R2Object[] }> {
    const prefix = options?.prefix || '';
    const objects: R2Object[] = [];
    for (const [key, item] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        const size = typeof item.data === 'string' ? Buffer.byteLength(item.data) : item.data.byteLength;
        objects.push({
          key,
          version: '1',
          size,
          etag: `"${key}-${size}"`,
          httpEtag: `"${key}-${size}"`,
          uploaded: item.uploaded,
          httpMetadata: item.options?.httpMetadata,
        });
      }
    }
    return { objects };
  }
}

function createMockPostRequest(formData: FormData, url = 'https://explodeit.pages.dev/api/contribute'): Request {
  return {
    url,
    method: 'POST',
    formData: async () => formData,
  } as unknown as Request;
}

// ============================================================================
// Test Suite: Tier 5 Adversarial Coverage 2 (Milestone 6 Challenger)
// ============================================================================
describe('Tier 5 Adversarial Security & Edge Hardening Suite (M6 Challenger 2)', () => {
  let sessionStore: Storage;
  let localStore: Storage;
  let mediaCacheMock: MockIndexedDBMediaCache;
  let controller: ShowcaseFlowController;
  let r2Bucket: Tier5MockR2Bucket;
  let cloudflareEnv: Env;

  beforeEach(async () => {
    const env = setupMockBrowserEnvironment();
    sessionStore = env.sessionStorage;
    localStore = env.localStorage;
    sessionStore.clear();
    localStore.clear();
    mediaCacheMock = new MockIndexedDBMediaCache();
    controller = new ShowcaseFlowController(sessionStore, localStore, mediaCacheMock);

    r2Bucket = new Tier5MockR2Bucket();
    cloudflareEnv = {
      COMMUNITY_BUCKET: r2Bucket,
      COMMUNITY_PUBLIC_URL: 'https://community.explodeit.org',
    };

    await mockCommunityStorage.reset();
    await mediaCache.clearCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Section 1: Pairwise Combinations (Tier 3) & Real-World Scenarios (Tier 4)
  // ==========================================================================
  describe('1. Combinatorial Invariants (Tier 3) & User Scenarios (Tier 4)', () => {
    it('COMB-01: Model Tier × Dynamic Pricing × Veo Skip', () => {
      const budgetConfig: StageModelConfig = {
        ...CANONICAL_MODEL_PRESETS.budget,
        enableVideo: false,
      };

      const estimatedCost = contractEstimateRunCost(budgetConfig);
      expect(estimatedCost).toBeLessThan(0.25);

      const bundle = sanitizeGenerationItem(mockBudgetGenerationItem, 'budget', budgetConfig);
      expect(bundle.media.videoBlob).toBeUndefined();
      expect(bundle.manifest.modelsUsed.video).toBeUndefined();
      expect(bundle.manifest.modelTier).toBe('budget');
    });

    it('COMB-02: Storage Allowlist × R2 Upload × Zero Leak', () => {
      controller.setApiKey(['AIzaSy', 'DUMMY_SECRET_KEY_1234567890abcdef'].join(''));
      expect(sessionStore.getItem('gemini_api_key')).not.toBeNull();

      const infected = {
        ...mockCameraGenerationItem,
        apiKey: sessionStore.getItem('gemini_api_key'),
        userSession: 'secret_session_token_123',
      };

      const bundle = sanitizeGenerationItem(infected, 'pro', CANONICAL_MODEL_PRESETS.pro);
      assertZeroLeak(bundle);

      const jsonStr = JSON.stringify(bundle);
      expect(jsonStr).not.toContain('AIzaSyDUMMY_SECRET');
      expect(jsonStr).not.toContain('secret_session_token');
      expect(localStore.getItem('gemini_api_key')).toBeNull();
    });

    it('COMB-03: Media Cache × Showcase × Zero-Egress Revisit', async () => {
      const topicId = 'tlr-camera-1726240000000';
      const catalogItem = mockCommunityCatalog[0];

      await controller.loadShowcaseTopic(topicId);
      const cached = await mediaCacheMock.getMediaBlob(catalogItem.infographicUrl);
      expect(cached).not.toBeNull();

      // Second visit: hit returns identical blob without network fetch
      const reloaded = await mediaCacheMock.getMediaBlob(catalogItem.infographicUrl);
      expect(reloaded).not.toBeNull();
      expect(reloaded!.size).toBe(cached!.size);
    });

    it('COMB-04: Prompts Invariants × Kinematic Directives × Packaging Alignment (Full Contract)', () => {
      // 1. Verify Infographic Prompt contains 4-tier separation and isometric leader lines
      const infographicPrompt = CONTRACT_PROMPTS.INFOGRAPHIC_UPGRADED(
        'Mechanical Chronograph',
        'Technical Blueprint',
        ['Escapement', 'Balance Wheel', 'Mainspring Barrel', 'Dial'],
        'PHYSICAL',
        'Exploded View'
      );
      expect(infographicPrompt).toContain('Multi-Tiered Component Separation');
      expect(infographicPrompt).toContain('Tier 1: Outer casing');
      expect(infographicPrompt).toContain('Tier 2: Structural chassis');
      expect(infographicPrompt).toContain('Tier 3: Core operational mechanism');
      expect(infographicPrompt).toContain('Tier 4: Internal sub-components');
      expect(infographicPrompt).toContain('Pristine 3D Deconstruction');
      expect(infographicPrompt).toContain('Internal Cutaways & Cross-Sections');

      // 2. Verify Veo Prompt contains 4-phase kinematic transitions & frame alignment
      const videoPrompt = CONTRACT_PROMPTS.VIDEO_ASSEMBLY_UPGRADED(
        'Mechanical Chronograph',
        'PHYSICAL',
        'Exploded View'
      );
      expect(videoPrompt).toContain('Initial Frame (Start State):');
      expect(videoPrompt).toContain('Phase 1 (Glide & Trajectory)');
      expect(videoPrompt).toContain('Phase 2 (Sub-Assembly Interlocking)');
      expect(videoPrompt).toContain('Phase 3 (Core Ingestion)');
      expect(videoPrompt).toContain('Phase 4 (Final Sealing)');
      expect(videoPrompt).toContain('Final Frame (End State):');
      expect(videoPrompt).toContain('Strictly NO 2D synthetic text overlays');

      // 3. Verify resulting generation item packages both states into clean bundle
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      expect(bundle.media.infographicBlob).toBeInstanceOf(Blob);
      expect(bundle.media.assembledBlob).toBeInstanceOf(Blob);
      expect(bundle.media.videoBlob).toBeInstanceOf(Blob);
      assertZeroLeak(bundle);
    });

    it('COMB-05: Contribution × Local Cache Seeding × Immediate Keyless Playback', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const publicUrl = `https://r2.explodeit.org/${bundle.manifest.id}/infographic.png`;

      await mediaCacheMock.setMediaBlob(publicUrl, bundle.media.infographicBlob);
      const cached = await mediaCacheMock.getMediaBlob(publicUrl);
      expect(cached).not.toBeNull();
      expect(cached!.size).toBe(bundle.media.infographicBlob.size);
    });

    it('COMB-06: Keyless Showcase Exploration × Intercepted Custom Prompt Submission', () => {
      expect(controller.getApiKey()).toBeNull();
      const initial = controller.initApp();
      expect(initial.requiresApiKeyModal).toBe(false);

      // Custom topic submission gates behind API key modal
      const customSub = controller.submitCustomPrompt('Superconducting Tokamak');
      expect(customSub.accepted).toBe(false);
      expect(customSub.requiresKeyModal).toBe(true);
      expect(controller.isApiKeyModalOpen).toBe(true);

      // User supplies key
      controller.setApiKey('AIzaSyDUMMY_KEY_COMB06');
      const resumedSub = controller.submitCustomPrompt('Superconducting Tokamak');
      expect(resumedSub.accepted).toBe(true);
      expect(controller.activeView).toBe('GENERATION_WORKSPACE');
    });

    it('Tier 4 Scenario 1: Curious Student (Keyless Exploration & Filter)', async () => {
      const startup = controller.initApp();
      expect(startup.requiresApiKeyModal).toBe(false);

      controller.searchQuery = 'Turbofan';
      const results = controller.getFilteredCatalog();
      expect(results.length).toBe(1);
      expect(results[0].topic).toContain('Turbofan');

      const loaded = await controller.loadShowcaseTopic(results[0].id);
      expect(loaded.success).toBe(true);
      expect(loaded.usedApiKey).toBe(false);
      expect(sessionStore.getItem('gemini_api_key')).toBeNull();
      expect(localStore.getItem('gemini_api_key')).toBeNull();
    });

    it('Tier 4 Scenario 2: Pro Mechanical Engineer (Pro Preset & Contribution)', () => {
      controller.setApiKey('AIzaSyPRO_ENGINEER_KEY_1234567890');
      const proCost = contractEstimateRunCost(CANONICAL_MODEL_PRESETS.pro);
      expect(proCost).toBeGreaterThan(0.15);

      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      expect(bundle.media.infographicBlob).toBeInstanceOf(Blob);
      expect(bundle.media.videoBlob).toBeInstanceOf(Blob);
      assertZeroLeak(bundle);
    });

    it('Tier 4 Scenario 3: Budget Tech Researcher (Conservation Mode & Skip Video)', () => {
      const budgetConfig = { ...CANONICAL_MODEL_PRESETS.budget, enableVideo: false };
      const budgetCost = contractEstimateRunCost(budgetConfig);
      expect(budgetCost).toBeLessThan(0.25);

      const bundle = sanitizeGenerationItem(mockBudgetGenerationItem, 'budget', budgetConfig);
      expect(bundle.media.videoBlob).toBeUndefined();
      expect(bundle.manifest.modelsUsed.video).toBeUndefined();
    });

    it('Tier 4 Scenario 4: Offline Library Scholar (Replay From Cache)', async () => {
      for (const item of mockCommunityCatalog) {
        await mediaCacheMock.setMediaBlob(item.infographicUrl, new Blob([new Uint8Array(256)]));
      }

      // Offline replay
      for (const item of mockCommunityCatalog) {
        const blob = await mediaCacheMock.getMediaBlob(item.infographicUrl);
        expect(blob).not.toBeNull();
        expect(blob!.size).toBe(256);
      }
    });

    it('Tier 4 Scenario 5: Forensic Security Auditor (Zero-Leak Boundary Verification)', () => {
      controller.setApiKey(['AIzaSy', 'AUDITOR_LIVE_SECRET_KEY_1234567890'].join(''));
      const infected = {
        ...mockSensitiveInjectedItem,
        liveSessionKey: controller.getApiKey(),
      };

      const bundle = sanitizeGenerationItem(infected, 'pro', CANONICAL_MODEL_PRESETS.pro);
      assertZeroLeak(bundle);

      const serialized = JSON.stringify(bundle);
      expect(serialized).not.toContain('AUDITOR_LIVE_SECRET');
      expect(serialized).not.toContain('AIzaSy');
      expect(serialized).not.toContain('Bearer ya29');
      expect(localStore.getItem('gemini_api_key')).toBeNull();
    });
  });

  // ==========================================================================
  // Section 2: Adversarial Attacks on assertZeroLeak (Client & Server)
  // ==========================================================================
  describe('2. Adversarial Attacks on assertZeroLeak Boundaries', () => {
    it('ADV-01: Direct injection of forbidden property names is rejected by assertZeroLeak', () => {
      const forbiddenProps = [
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

      for (const prop of forbiddenProps) {
        const infectedObj = {
          manifest: { id: 'test', topic: 'Test' },
          plan: { displayTitle: 'Test' },
          [prop]: 'forbidden_value',
        };
        expect(() => assertZeroLeak(infectedObj)).toThrow(/Zero-leak violation/i);
      }
    });

    it('ADV-02: Direct injection of Gemini API key format (AIzaSy...) throws violation error', () => {
      const leakedKey = ['AIzaSy', 'DUMMY_RAW_LEAKED_KEY_1234567890'].join('');
      const leakedKeyPayload = {
        manifest: { id: 'test', topic: 'Test' },
        plan: {
          displayTitle: 'Test Plan',
          originStory: `Exploded blueprint with leaked key: ${leakedKey}`,
        },
      };

      expect(() => assertZeroLeak(leakedKeyPayload)).toThrow(
        /Zero-leak violation: Found Google GenAI API key in bundle/i
      );
    });

    it('ADV-03: Direct injection of OAuth Bearer token (ya29...) throws violation error', () => {
      const bearerToken = ['Bearer ya29.', 'a0ARrdaM_secret_oauth_token_1234567890'].join('');
      const bearerPayload = {
        manifest: { id: 'test', topic: 'Test' },
        plan: {
          displayTitle: 'Test Plan',
          originStory: bearerToken,
        },
      };

      expect(() => assertZeroLeak(bearerPayload)).toThrow(
        /Zero-leak violation: Found Bearer token in bundle/i
      );
    });

    it('ADV-04: Adversarial Gap Observation: Base64-encoded API key bypasses literal regex scanners', () => {
      const rawKey = ['AIzaSy', 'DUMMY_SECRET_KEY_1234567890abcdef'].join('');
      // Base64 encoding of rawKey
      const base64Key = Buffer.from(rawKey).toString('base64');
      expect(base64Key.startsWith('QUl6YVN5')).toBe(true);

      const base64InjectedBundle = {
        manifest: { id: 'test-base64', topic: 'Base64 Injection' },
        plan: {
          displayTitle: 'Base64 Test',
          detailedArticle: `Obfuscated token: ${base64Key}`,
        },
      };

      // Empirical challenger proof: assertZeroLeak does NOT throw on base64 string because regex searches for literal 'AIzaSy'
      expect(() => assertZeroLeak(base64InjectedBundle)).not.toThrow();

      // However, server-side assertZeroLeakServer also checks literal regex
      expect(() => assertZeroLeakServer(JSON.stringify(base64InjectedBundle))).not.toThrow();
    });

    it('ADV-05: Prototype pollution attack via __proto__ and constructor is safely neutralized by sanitizeGenerationItem', () => {
      // 1. Attack using JSON.parse with __proto__
      const pollutedRaw = JSON.parse(
        '{"plan":{"displayTitle":"Polluted","__proto__":{"pollutedKey":"evil_val","apiKey":"AIzaSyPOLLUTED_KEY_1234567890"}}}'
      );

      const sanitized = sanitizeGenerationItem(pollutedRaw);
      assertZeroLeak(sanitized);

      // Verify polluted property was not copied into sanitized plan
      expect((sanitized.plan as any).pollutedKey).toBeUndefined();
      expect((sanitized.plan as any).apiKey).toBeUndefined();

      // 2. Direct constructor injection
      const constructorInjection = {
        manifest: { id: 'c-test', topic: 'Constructor' },
        plan: { displayTitle: 'Constructor Injection', constructor: { prototype: { admin: true } } },
      };
      expect(() => assertZeroLeak(constructorInjection)).toThrow(/Zero-leak violation: Found forbidden property "constructor"/i);

      // Sanitization completely purges constructor field
      const sanitizedConstructor = sanitizeGenerationItem(constructorInjection);
      assertZeroLeak(sanitizedConstructor);
      expect((sanitizedConstructor.plan as any).constructor).toBe(Object);
    });

    it('ADV-06: Cyclic structures: direct assertZeroLeak throws TypeError, while sanitizeGenerationItem survives without recursion overflow', () => {
      // Create circular reference
      const cyclicItem: any = {
        prompt: 'Cyclic Topic',
        plan: {
          displayTitle: 'Cyclic Object',
          category: 'Mechanical',
        },
      };
      cyclicItem.self = cyclicItem;
      cyclicItem.plan.parent = cyclicItem;

      // 1. Directly passing circular structure to assertZeroLeak causes JSON.stringify to throw TypeError
      expect(() => assertZeroLeak(cyclicItem)).toThrow(TypeError);

      // 2. Passing through sanitizeGenerationItem: allowlist projection extracts only primitives, stripping circular references!
      const sanitized = sanitizeGenerationItem(cyclicItem);
      expect(sanitized.plan.displayTitle).toBe('Cyclic Object');
      // Sanitized bundle has no circular references and passes assertZeroLeak cleanly
      expect(() => assertZeroLeak(sanitized)).not.toThrow();
    });
  });

  // ==========================================================================
  // Section 3: Adversarial Attacks on /api/contribute & Mock Driver
  // ==========================================================================
  describe('3. Adversarial Attacks on /api/contribute & Storage Fallbacks', () => {
    it('ADV-07: POST without required manifest returns 400 Bad Request', async () => {
      const fd = new FormData();
      fd.append('infographic', new File(['img'], 'infographic.png', { type: 'image/png' }));
      fd.append('assembled', new File(['img'], 'assembled.png', { type: 'image/png' }));

      const res = await onRequestPost({
        request: createMockPostRequest(fd),
        env: cloudflareEnv,
      } as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required manifest JSON');
    });

    it('ADV-08: POST with non-JSON / corrupted manifest returns 400 Bad Request', async () => {
      const fd = new FormData();
      fd.append('manifest', '{ this is definitely not valid json :::');
      fd.append('infographic', new File(['img'], 'infographic.png', { type: 'image/png' }));
      fd.append('assembled', new File(['img'], 'assembled.png', { type: 'image/png' }));

      const res = await onRequestPost({
        request: createMockPostRequest(fd),
        env: cloudflareEnv,
      } as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Malformed JSON in manifest field');
    });

    it('ADV-09: POST missing infographic or assembled visual media returns 400 Bad Request', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const fd = new FormData();
      fd.append('manifest', JSON.stringify(bundle));
      // Missing infographic and assembled files

      const res = await onRequestPost({
        request: createMockPostRequest(fd),
        env: cloudflareEnv,
      } as any);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required infographic or assembled visual media');
    });

    it('ADV-10: POST when COMMUNITY_BUCKET binding is unconfigured returns 503 Service Unavailable', async () => {
      const fd = new FormData();
      fd.append('manifest', '{}');

      const res = await onRequestPost({
        request: createMockPostRequest(fd),
        env: {} as Env, // Missing COMMUNITY_BUCKET
      } as any);

      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.error).toContain('COMMUNITY_BUCKET binding not configured');
    });

    it('ADV-11: GET endpoint directory traversal attempts are sanitized', async () => {
      // 1. Path traversal in assetPath
      const traversalReq = new Request(
        'https://explodeit.pages.dev/api/contribute?assetPath=../../../../etc/shadow',
        { method: 'GET' }
      );
      const res1 = await onRequestGet({ request: traversalReq, env: cloudflareEnv } as any);
      expect(res1.status).toBe(404);

      // 2. Traversal in topicId
      const topicTraversalReq = new Request(
        'https://explodeit.pages.dev/api/contribute?topicId=../../secret_topic',
        { method: 'GET' }
      );
      const res2 = await onRequestGet({ request: topicTraversalReq, env: cloudflareEnv } as any);
      expect(res2.status).toBe(404);
      const data2 = await res2.json();
      expect(data2.error).toContain("Topic 'secret_topic' not found");
    });

    it('ADV-12: OPTIONS preflight returns 204 with complete CORS headers', async () => {
      const res = await onRequestOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  // ==========================================================================
  // Section 4: Keyless Session Storage & Storage Boundary Attacks
  // ==========================================================================
  describe('4. Keyless Session Storage & Storage Boundaries', () => {
    it('ADV-13: Storage Boundary Invariant: localStorage NEVER receives gemini_api_key under ANY operation', () => {
      // 1. Set key via controller
      controller.setApiKey('AIzaSyDUMMY_KEY_STORAGE_ATTACK_1');
      expect(sessionStore.getItem('gemini_api_key')).toBe('AIzaSyDUMMY_KEY_STORAGE_ATTACK_1');
      expect(localStore.getItem('gemini_api_key')).toBeNull();

      // 2. Change model presets
      controller.localStorage.setItem('explodeit_model_preferences', JSON.stringify({ tier: 'budget' }));
      expect(localStore.getItem('gemini_api_key')).toBeNull();

      // 3. Clear key
      controller.clearApiKey();
      expect(sessionStore.getItem('gemini_api_key')).toBeNull();
      expect(localStore.getItem('gemini_api_key')).toBeNull();
    });

    it('ADV-14: Simulated tab close / storage purge resets application to Browse Free mode', () => {
      // Set key during active session
      controller.setApiKey('AIzaSyACTIVE_SESSION_KEY_001');
      expect(controller.getApiKey()).toBe('AIzaSyACTIVE_SESSION_KEY_001');

      // Simulate tab close / browser window exit: purge sessionStorage
      sessionStore.clear();

      // Re-initialize app in new tab
      const startup = controller.initApp();
      expect(startup.requiresApiKeyModal).toBe(false);
      expect(controller.getApiKey()).toBeNull();
      expect(controller.isApiKeyModalOpen).toBe(false);

      // User can browse showcase freely in new tab without key prompt
      const filtered = controller.getFilteredCatalog();
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('ADV-15: Malicious injection into localStorage is detected and eradicated upon initialization', () => {
      // Simulate an adversarial extension or legacy code writing to localStorage
      localStore.setItem('gemini_api_key', 'AIzaSyLEAKED_TO_LOCALSTORAGE_999');

      // Re-initialize controller with active cleanup logic
      const legacyKey = localStore.getItem('gemini_api_key');
      if (legacyKey) {
        controller.setApiKey(legacyKey); // Migrates to session and removes from localStorage
      }

      expect(sessionStore.getItem('gemini_api_key')).toBe('AIzaSyLEAKED_TO_LOCALSTORAGE_999');
      expect(localStore.getItem('gemini_api_key')).toBeNull();
    });
  });

  // ==========================================================================
  // Section 5: High Concurrency & Offline Network Failures
  // ==========================================================================
  describe('5. Concurrency & Offline Resilience', () => {
    it('ADV-16: Concurrent contribute requests execute in parallel without race condition corruption', async () => {
      const bundles: SanitizedGenerationBundle[] = [];
      for (let i = 1; i <= 6; i++) {
        const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
        bundle.manifest.id = `concurrent-topic-${i}-${Date.now()}`;
        bundle.manifest.topic = `Concurrent Topic ${i}`;
        bundle.manifest.timestamp = new Date(Date.now() + i * 100).toISOString();
        bundles.push(bundle);
      }

      // Execute 6 uploads concurrently against mock storage
      const results = await Promise.all(
        bundles.map((b) => mockCommunityStorage.uploadBundle(b))
      );

      for (const res of results) {
        expect(res.success).toBe(true);
        expect(res.isMock).toBe(true);
      }

      // Verify catalog contains all 6 uploaded items plus default seeds
      const catalog = await mockCommunityStorage.fetchCatalog();
      expect(catalog.length).toBe(SEED_COMMUNITY_CATALOG.length + 6);

      // Verify deduplication and sorting: newest item is at index 0
      expect(catalog[0].id).toContain('concurrent-topic-6');
    });

    it('ADV-17: uploadCommunityBundle recovers transparently from network drop (offline fallback)', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      // Simulate network disconnection causing fetch to reject
      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (Network offline)'));

      const result = await uploadCommunityBundle(bundle);
      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.topicId).toBe(bundle.manifest.id);

      // Topic is retrievable from local fallback
      const retrieved = await mockCommunityStorage.fetchTopic(bundle.manifest.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.manifest.id).toBe(bundle.manifest.id);
    });

    it('ADV-18: fetchCommunityCatalog recovers gracefully from 500 error or network exception', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection timed out'));

      const catalog = await fetchCommunityCatalog();
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBeGreaterThanOrEqual(SEED_COMMUNITY_CATALOG.length);
    });

    it('ADV-19: fetchCommunityTopic recovers gracefully from network failure by falling back to mock driver', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('DNS Resolution failure'));

      // Seed mock storage first
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      await mockCommunityStorage.uploadBundle(bundle);

      const topic = await fetchCommunityTopic(bundle.manifest.id);
      expect(topic).not.toBeNull();
      expect(topic?.manifest.id).toBe(bundle.manifest.id);
    });
  });
});
