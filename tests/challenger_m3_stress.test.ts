import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  onRequestPost,
  onRequestGet,
  onRequestOptions,
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
  assertZeroLeak,
} from '../services/communityStorage';
import {
  mockCameraGenerationItem,
  mockBudgetGenerationItem,
  mockSensitiveInjectedItem,
} from './mocks/mockGenerations';
import { CANONICAL_MODEL_PRESETS } from '../constants';
import { SanitizedGenerationBundle } from '../types';

// ============================================================================
// WHATWG Stream Polyfill for jsdom Test Runner (Emulates Cloudflare workerd)
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
// Mock Cloudflare R2 Bucket Implementation for Empirical Testing
// ============================================================================

interface StoredR2Object {
  key: string;
  data: Uint8Array | string;
  options?: R2PutOptions;
  uploaded: Date;
}

class InMemoryR2Bucket implements R2Bucket {
  public store = new Map<string, StoredR2Object>();
  public putCalls: { key: string; options?: R2PutOptions }[] = [];

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: R2PutOptions
  ): Promise<R2Object> {
    this.putCalls.push({ key, options });

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
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          chunks.push(result.value);
        }
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
    const uploaded = new Date();
    const stored: StoredR2Object = {
      key,
      data: rawData,
      options,
      uploaded,
    };
    this.store.set(key, stored);

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
        if (typeof data === 'string') {
          return new TextEncoder().encode(data).buffer as ArrayBuffer;
        }
        return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      },
      async text(): Promise<string> {
        if (typeof data === 'string') return data;
        return new TextDecoder().decode(data);
      },
      async json<T = unknown>(): Promise<T> {
        const text = await this.text();
        return JSON.parse(text) as T;
      },
      async blob(): Promise<Blob> {
        const ab = await this.arrayBuffer();
        return new Blob([ab], { type: item.options?.httpMetadata?.contentType || 'application/octet-stream' });
      },
    };
  }

  async delete(keys: string | string[]): Promise<void> {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const k of keyArray) {
      this.store.delete(k);
    }
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

// ============================================================================
// Helper: Create Valid Multipart FormData Request for Cloudflare Functions
// ============================================================================

function createMultipartFormDataRequest(
  manifestPayload: any,
  options: {
    includeInfographic?: boolean;
    includeAssembled?: boolean;
    includeVideo?: boolean;
    includeAudio?: boolean;
    url?: string;
  } = {}
): { request: Request; formData: FormData } {
  const {
    includeInfographic = true,
    includeAssembled = true,
    includeVideo = true,
    includeAudio = true,
    url = 'https://explodeit.pages.dev/api/contribute',
  } = options;

  const fd = new FormData();
  if (manifestPayload !== undefined) {
    if (typeof manifestPayload === 'string') {
      fd.append('manifest', manifestPayload);
    } else {
      fd.append('manifest', JSON.stringify(manifestPayload));
    }
  }

  if (includeInfographic) {
    fd.append('infographic', new File(['dummy-infographic-bytes'], 'infographic.png', { type: 'image/png' }));
  }
  if (includeAssembled) {
    fd.append('assembled', new File(['dummy-assembled-bytes'], 'assembled.png', { type: 'image/png' }));
  }
  if (includeVideo) {
    fd.append('video', new File(['dummy-video-mp4-bytes'], 'video.mp4', { type: 'video/mp4' }));
  }
  if (includeAudio) {
    fd.append('audio', new File(['dummy-audio-wav-bytes'], 'audio.wav', { type: 'audio/wav' }));
  }

  const request: any = {
    url,
    method: 'POST',
    formData: async () => fd,
  };

  return { request, formData: fd };
}

// ============================================================================
// Challenger 2: Empirical Stress Test Suite
// ============================================================================

describe('Challenger 2 - Empirical Stress Harness: Milestone 3 (FEAT-06, FEAT-07, FEAT-08)', () => {
  let bucket: InMemoryR2Bucket;
  let env: Env;

  beforeEach(async () => {
    bucket = new InMemoryR2Bucket();
    env = {
      COMMUNITY_BUCKET: bucket,
      COMMUNITY_PUBLIC_URL: 'https://community.explodeit.org',
    };
    await mockCommunityStorage.reset();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SCOPE 1: Cloudflare Pages Function (functions/api/contribute.ts)
  // ==========================================================================
  describe('Scope 1: Cloudflare Pages Function (/api/contribute)', () => {

    it('C1.1 - Valid POST multipart stores all 5 assets under topics/${topicId}/ and updates catalog.json', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const { request } = createMultipartFormDataRequest(bundle);

      const context: any = { request, env, params: {}, data: {}, waitUntil: () => {}, next: () => {} };
      const response = await onRequestPost(context);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.topicId).toBe(bundle.manifest.id);

      const topicId = bundle.manifest.id;

      // 1. Verify manifest.json stored
      expect(bucket.store.has(`topics/${topicId}/manifest.json`)).toBe(true);
      const manifestObj = bucket.store.get(`topics/${topicId}/manifest.json`);
      expect(manifestObj?.options?.httpMetadata?.cacheControl).toBe('public, max-age=31536000, immutable');
      expect(manifestObj?.options?.httpMetadata?.contentType).toBe('application/json; charset=utf-8');

      // 2. Verify infographic.png stored
      expect(bucket.store.has(`topics/${topicId}/infographic.png`)).toBe(true);
      const infoObj = bucket.store.get(`topics/${topicId}/infographic.png`);
      expect(infoObj?.options?.httpMetadata?.cacheControl).toBe('public, max-age=31536000, immutable');
      expect(infoObj?.options?.httpMetadata?.contentType).toBe('image/png');

      // 3. Verify assembled.png stored
      expect(bucket.store.has(`topics/${topicId}/assembled.png`)).toBe(true);
      const assemObj = bucket.store.get(`topics/${topicId}/assembled.png`);
      expect(assemObj?.options?.httpMetadata?.cacheControl).toBe('public, max-age=31536000, immutable');
      expect(assemObj?.options?.httpMetadata?.contentType).toBe('image/png');

      // 4. Verify video.mp4 stored
      expect(bucket.store.has(`topics/${topicId}/video.mp4`)).toBe(true);
      const videoObj = bucket.store.get(`topics/${topicId}/video.mp4`);
      expect(videoObj?.options?.httpMetadata?.cacheControl).toBe('public, max-age=31536000, immutable');
      expect(videoObj?.options?.httpMetadata?.contentType).toBe('video/mp4');

      // 5. Verify audio.wav stored
      expect(bucket.store.has(`topics/${topicId}/audio.wav`)).toBe(true);
      const audioObj = bucket.store.get(`topics/${topicId}/audio.wav`);
      expect(audioObj?.options?.httpMetadata?.cacheControl).toBe('public, max-age=31536000, immutable');
      expect(audioObj?.options?.httpMetadata?.contentType).toBe('audio/wav');

      // 6. Verify catalog.json updated
      expect(bucket.store.has('catalog.json')).toBe(true);
      const catalogObj = bucket.store.get('catalog.json');
      expect(catalogObj?.options?.httpMetadata?.cacheControl).toBe('public, max-age=300, s-maxage=300, stale-while-revalidate=86400');
      const catalogContent = JSON.parse(catalogObj?.data as string);
      expect(catalogContent.topics).toHaveLength(1);
      expect(catalogContent.topics[0].id).toBe(topicId);
    });

    it('C1.2 - Valid POST without optional video (Budget tier) succeeds without creating video.mp4', async () => {
      const budgetBundle = sanitizeGenerationItem(mockBudgetGenerationItem, 'budget', CANONICAL_MODEL_PRESETS.budget);
      const { request } = createMultipartFormDataRequest(budgetBundle, { includeVideo: false });

      const context: any = { request, env, params: {}, data: {}, waitUntil: () => {}, next: () => {} };
      const response = await onRequestPost(context);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);

      const topicId = budgetBundle.manifest.id;
      expect(bucket.store.has(`topics/${topicId}/manifest.json`)).toBe(true);
      expect(bucket.store.has(`topics/${topicId}/infographic.png`)).toBe(true);
      expect(bucket.store.has(`topics/${topicId}/assembled.png`)).toBe(true);
      expect(bucket.store.has(`topics/${topicId}/audio.wav`)).toBe(true);
      expect(bucket.store.has(`topics/${topicId}/video.mp4`)).toBe(false);
      expect(body.catalogItem.videoUrl).toBeUndefined();
    });

    it('C1.3 - Server-side zero-leak scanner rejects payloads with Google GenAI API key (AIzaSy...) with HTTP 400', async () => {
      const leakingPayload = {
        manifest: { id: 'leaky-topic-1', topic: 'Leaky Topic' },
        plan: {
          displayTitle: 'Leaky Topic',
          detailedArticle: 'Here is my secret key: AIzaSyDUMMY_SECRET_KEY_1234567890abcdef',
        },
      };

      const { request } = createMultipartFormDataRequest(leakingPayload);
      const context: any = { request, env, params: {}, data: {}, waitUntil: () => {}, next: () => {} };
      const response = await onRequestPost(context);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Sanitization rejected: Payload contains disallowed Gemini API Key pattern');
      // Verify nothing was stored in bucket
      expect(bucket.putCalls).toHaveLength(0);
    });

    it('C1.4 - Server-side zero-leak scanner rejects payloads with OAuth Bearer tokens (ya29...) with HTTP 400', async () => {
      const bearerPayload = {
        manifest: { id: 'bearer-topic', topic: 'Bearer Topic' },
        plan: {
          displayTitle: 'Bearer Topic',
          originStory: 'Auth token: ya29.a0ARrdaM1234567890abcdefghijklmnopqr',
        },
      };

      const { request } = createMultipartFormDataRequest(bearerPayload);
      const context: any = { request, env, params: {}, data: {}, waitUntil: () => {}, next: () => {} };
      const response = await onRequestPost(context);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain('Sanitization rejected: Payload contains disallowed Bearer token pattern');
      expect(bucket.putCalls).toHaveLength(0);
    });

    it('C1.5 - Server-side zero-leak scanner rejects payloads with forbidden property names ("apiKey":, "gemini_api_key":, etc.) with HTTP 400', async () => {
      const forbiddenProps = [
        '"apiKey":',
        '"gemini_api_key":',
        '"api_key":',
        '"secretToken":',
        '"auth_token":',
        '"userSession":',
      ];

      for (const prop of forbiddenProps) {
        const payloadString = `{"manifest":{"id":"topic-1","topic":"Test"},${prop}"injected_value"}`;
        const { request } = createMultipartFormDataRequest(payloadString);
        const context: any = { request, env, params: {}, data: {}, waitUntil: () => {}, next: () => {} };
        const response = await onRequestPost(context);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error).toContain(`Payload contains forbidden property: ${prop}`);
      }
    });

    it('C1.6 - POST validation rejects invalid form-data stream, missing manifest, malformed JSON, and missing media files with HTTP 400', async () => {
      // 1. Invalid multipart stream (formData throws)
      const brokenStreamReq: any = {
        url: 'https://explodeit.pages.dev/api/contribute',
        formData: async () => { throw new Error('Unparseable multipart stream'); },
      };
      const res0 = await onRequestPost({ request: brokenStreamReq, env } as any);
      expect(res0.status).toBe(400);
      expect((await res0.json()).error).toContain('Invalid multipart/form-data payload');

      // 2. Missing manifest
      const fdNoManifest = new FormData();
      fdNoManifest.append('infographic', new File(['img'], 'infographic.png'));
      fdNoManifest.append('assembled', new File(['img'], 'assembled.png'));
      const req1: any = {
        url: 'https://explodeit.pages.dev/api/contribute',
        formData: async () => fdNoManifest,
      };
      const res1 = await onRequestPost({ request: req1, env } as any);
      expect(res1.status).toBe(400);
      expect((await res1.json()).error).toContain('Missing required manifest JSON in form data');

      // 3. Malformed JSON manifest
      const { request: req2 } = createMultipartFormDataRequest('{ corrupted json manifest : invalid');
      const res2 = await onRequestPost({ request: req2, env } as any);
      expect(res2.status).toBe(400);
      expect((await res2.json()).error).toContain('Malformed JSON in manifest field');

      // 4. Missing infographic
      const { request: req3 } = createMultipartFormDataRequest({ topic: 'Test' }, { includeInfographic: false });
      const res3 = await onRequestPost({ request: req3, env } as any);
      expect(res3.status).toBe(400);
      expect((await res3.json()).error).toContain('Missing required infographic or assembled visual media');

      // 5. Missing assembled
      const { request: req4 } = createMultipartFormDataRequest({ topic: 'Test' }, { includeAssembled: false });
      const res4 = await onRequestPost({ request: req4, env } as any);
      expect(res4.status).toBe(400);
      expect((await res4.json()).error).toContain('Missing required infographic or assembled visual media');
    });

    it('C1.7 - POST returns HTTP 503 if COMMUNITY_BUCKET binding is missing', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const { request } = createMultipartFormDataRequest(bundle);
      const brokenEnv: Env = { COMMUNITY_BUCKET: null as any };

      const response = await onRequestPost({ request, env: brokenEnv } as any);
      expect(response.status).toBe(503);
      expect((await response.json()).error).toContain('COMMUNITY_BUCKET binding not configured');
    });

    it('C1.8 - GET /api/contribute returns indexed catalog array with Cache-Control headers', async () => {
      // 1. Initial empty catalog
      const reqEmpty = new Request('https://explodeit.pages.dev/api/contribute', { method: 'GET' });
      const resEmpty = await onRequestGet({ request: reqEmpty, env } as any);
      expect(resEmpty.status).toBe(200);
      expect(resEmpty.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300, stale-while-revalidate=86400');
      const emptyCatalog = await resEmpty.json();
      expect(emptyCatalog.topics).toEqual([]);

      // 2. Pre-seed catalog into R2
      const testCatalog: CatalogManifest = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        topics: SEED_COMMUNITY_CATALOG,
      };
      await bucket.put('catalog.json', JSON.stringify(testCatalog));

      const reqFilled = new Request('https://explodeit.pages.dev/api/contribute', { method: 'GET' });
      const resFilled = await onRequestGet({ request: reqFilled, env } as any);
      expect(resFilled.status).toBe(200);
      expect(resFilled.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300, stale-while-revalidate=86400');
      const catalogData = await resFilled.json();
      expect(catalogData.topics).toHaveLength(3);
      expect(catalogData.topics[0].topic).toBe('Twin-Lens Reflex (TLR) Camera');
    });

    it('C1.9 - GET /api/contribute?topicId=... returns manifest with Cache-Control: public, max-age=31536000, immutable', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      await bucket.put(`topics/tlr-camera/manifest.json`, JSON.stringify(bundle), {
        httpMetadata: { cacheControl: 'public, max-age=31536000, immutable' },
      });

      const req = new Request('https://explodeit.pages.dev/api/contribute?topicId=tlr-camera', { method: 'GET' });
      const res = await onRequestGet({ request: req, env } as any);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
      expect(res.headers.get('Content-Type')).toContain('application/json');
      const manifest = await res.json();
      expect(manifest.manifest.id).toBe(bundle.manifest.id);

      // Not found case
      const reqNotFound = new Request('https://explodeit.pages.dev/api/contribute?topicId=unknown-id', { method: 'GET' });
      const resNotFound = await onRequestGet({ request: reqNotFound, env } as any);
      expect(resNotFound.status).toBe(404);
    });

    it('C1.10 - GET /api/contribute?assetPath=... streams media with immutable Cache-Control and traversal protection', async () => {
      const dummyImageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes
      await bucket.put('topics/tlr-camera/infographic.png', dummyImageData, {
        httpMetadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });

      // Valid asset streaming
      const req = new Request('https://explodeit.pages.dev/api/contribute?assetPath=topics/tlr-camera/infographic.png', { method: 'GET' });
      const res = await onRequestGet({ request: req, env } as any);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
      expect(res.headers.get('Content-Type')).toBe('image/png');

      // Traversal sanitization test: ../../topics/tlr-camera/infographic.png -> sanitized to topics/tlr-camera/infographic.png
      const reqTraversal = new Request('https://explodeit.pages.dev/api/contribute?assetPath=../../topics/tlr-camera/infographic.png', { method: 'GET' });
      const resTraversal = await onRequestGet({ request: reqTraversal, env } as any);
      expect(resTraversal.status).toBe(200); // sanitized and resolves cleanly

      // Missing asset returns 404
      const reqMissing = new Request('https://explodeit.pages.dev/api/contribute?assetPath=topics/tlr-camera/missing.png', { method: 'GET' });
      const resMissing = await onRequestGet({ request: reqMissing, env } as any);
      expect(resMissing.status).toBe(404);
    });

    it('C1.11 - OPTIONS returns 204 with full CORS allow headers', async () => {
      const res = await onRequestOptions();
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });

  // ==========================================================================
  // SCOPE 2: Mock Storage Driver (services/mockCommunityStorage.ts)
  // ==========================================================================
  describe('Scope 2: Mock Storage Driver (mockCommunityStorage)', () => {

    it('C2.1 - Pre-seeded catalog contains 3 canonical educational topics with complete metadata', () => {
      expect(SEED_COMMUNITY_CATALOG).toHaveLength(3);

      const [tlr, turbofan, transformer] = SEED_COMMUNITY_CATALOG;
      expect(tlr.topic).toBe('Twin-Lens Reflex (TLR) Camera');
      expect(tlr.domain).toBe('PHYSICAL');
      expect(tlr.videoUrl).toBeDefined();

      expect(turbofan.topic).toBe('High-Bypass Turbofan Jet Engine');
      expect(turbofan.domain).toBe('PHYSICAL');
      expect(turbofan.videoUrl).toBeDefined();

      expect(transformer.topic).toBe('Transformer Attention Architecture');
      expect(transformer.domain).toBe('SOFTWARE');
      expect(transformer.videoUrl).toBeUndefined(); // Software topic has no video

      for (const item of SEED_COMMUNITY_CATALOG) {
        expect(item.id).toBeTruthy();
        expect(item.infographicUrl).toContain('https://');
        expect(item.assembledUrl).toContain('https://');
        expect(item.audioUrl).toContain('https://');
        expect(item.previewUrl).toContain('https://');
      }
    });

    it('C2.2 - Simulated latency: respects simulatedLatencyMs option', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      const start = Date.now();
      const result = await mockUploadCommunityBundle(bundle, { simulatedLatencyMs: 120 });
      const elapsed = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(110); // Allow slight timer variance
    });

    it('C2.3 - Successful persistence: updates catalog with newest-first ordering and supports fetchTopic retrieval', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      bundle.manifest.id = 'custom-persisted-item-123';
      bundle.manifest.topic = 'Custom Persisted Item';
      // Future timestamp to guarantee newest position when sorted descending
      bundle.manifest.timestamp = new Date(Date.now() + 1000000).toISOString();

      const uploadResult = await mockUploadCommunityBundle(bundle);
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.topicId).toBe('custom-persisted-item-123');

      // Fetch catalog: must contain 4 items, with newest first
      const catalog = await mockFetchCommunityCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(4);
      expect(catalog[0].id).toBe('custom-persisted-item-123');

      // Fetch specific topic bundle
      const fetchedBundle = await mockFetchCommunityTopic('custom-persisted-item-123');
      expect(fetchedBundle).not.toBeNull();
      expect(fetchedBundle?.manifest.id).toBe('custom-persisted-item-123');
      expect(fetchedBundle?.plan.displayTitle).toBe(bundle.plan.displayTitle);
    });

    it('C2.4 - Failure simulation: returns failure result when simulateFailure is set', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const result = await mockUploadCommunityBundle(bundle, { simulateFailure: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Simulated local storage upload failure');
      expect(result.isMock).toBe(true);
    });

    it('C2.5 - Reset restores catalog strictly to SEED_COMMUNITY_CATALOG', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      bundle.manifest.id = 'temporary-topic-to-delete';
      await mockUploadCommunityBundle(bundle);

      let catalog = await mockFetchCommunityCatalog();
      expect(catalog.some((i) => i.id === 'temporary-topic-to-delete')).toBe(true);

      // Reset
      await mockCommunityStorage.reset();
      catalog = await mockFetchCommunityCatalog();
      expect(catalog).toHaveLength(3);
      expect(catalog.some((i) => i.id === 'temporary-topic-to-delete')).toBe(false);
      expect(await mockFetchCommunityTopic('temporary-topic-to-delete')).toBeNull();
    });
  });

  // ==========================================================================
  // SCOPE 3: Automatic Fallback Flow in communityStorage.ts
  // ==========================================================================
  describe('Scope 3: Automatic Fallback Flow (communityStorage.ts)', () => {

    it('C3.1 - uploadCommunityBundle falls back to mock driver on HTTP 404 endpoint not deployed', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      // Mock fetch returning 404 (simulating static GitHub Pages or dev server without Cloudflare Pages)
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      const result = await uploadCommunityBundle(bundle);
      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.topicId).toBe(bundle.manifest.id);

      // Verify mock storage now contains the item
      const catalog = await mockCommunityStorage.fetchCatalog();
      expect(catalog.some((i) => i.id === bundle.manifest.id)).toBe(true);
    });

    it('C3.2 - uploadCommunityBundle falls back to mock driver on network error (fetch throws)', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await uploadCommunityBundle(bundle);
      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.topicId).toBe(bundle.manifest.id);
    });

    it('C3.3 - uploadCommunityBundle routes to mock driver immediately when navigator.onLine is false without fetch', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      // Mock navigator.onLine = false
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      const result = await uploadCommunityBundle(bundle);
      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(fetchSpy).not.toHaveBeenCalled();

      // Restore onLine
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    });

    it('C3.4 - fetchCommunityCatalog falls back to mock catalog sorted descending by timestamp when /api/contribute is unavailable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const catalog = await fetchCommunityCatalog();
      expect(catalog).toHaveLength(3);
      // Catalog is sorted descending by timestamp (Transformer Attention Architecture is 16:10, TLR is 16:00)
      expect(catalog[0].topic).toBe('Transformer Attention Architecture');
      expect(catalog[2].topic).toBe('Twin-Lens Reflex (TLR) Camera');
    });

    it('C3.5 - fetchCommunityTopic falls back to mock driver when /api/contribute is unavailable', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      await mockCommunityStorage.uploadBundle(bundle);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      } as any);

      const topic = await fetchCommunityTopic(bundle.manifest.id);
      expect(topic).not.toBeNull();
      expect(topic?.manifest.id).toBe(bundle.manifest.id);
    });

    it('C3.6 - uploadCommunityBundle executes client-side zero-leak pre-flight and throws before any network transfer', async () => {
      const bundleWithSecret: SanitizedGenerationBundle = {
        ...sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro),
        narrationScript: 'Secret key leaked: AIzaSyDUMMY_SECRET_KEY_1234567890abcdef',
      };

      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      await expect(uploadCommunityBundle(bundleWithSecret)).rejects.toThrow('Zero-leak violation');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
