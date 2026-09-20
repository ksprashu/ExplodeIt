import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  bundleGenerationItem,
  assertZeroLeak,
  generateTopicSlug,
} from '../services/communityStorage';
import CommunityContributeModal from '../components/CommunityContributeModal';
import {
  mockCameraGenerationItem,
  mockBudgetGenerationItem,
  mockSensitiveInjectedItem,
} from './mocks/mockGenerations';
import { CANONICAL_MODEL_PRESETS } from '../constants';
import { SanitizedGenerationBundle } from '../types';

const OPT_OUT_STORAGE_KEY = 'explodeit_contribute_optout';

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
// High-Fidelity Mock Cloudflare R2 Bucket for Challenger 2
// ============================================================================

interface StoredItem {
  key: string;
  data: Uint8Array | string;
  options?: R2PutOptions;
  uploaded: Date;
}

class ChallengerR2Bucket implements R2Bucket {
  public store = new Map<string, StoredItem>();
  public putHistory: { key: string; options?: R2PutOptions; size: number }[] = [];

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
        const result = await reader.read();
        done = result.done;
        if (result.value) chunks.push(result.value);
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
    this.putHistory.push({ key, options, size });

    const uploaded = new Date();
    const stored: StoredItem = { key, data: rawData, options, uploaded };
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
        if (typeof data === 'string') return new TextEncoder().encode(data).buffer as ArrayBuffer;
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

function makeMockRequest(formData: FormData, url = 'https://explodeit.pages.dev/api/contribute') {
  return {
    url,
    method: 'POST',
    formData: async () => formData,
  } as unknown as Request;
}

describe('Challenger 2 - Empirical Adversarial Harness: Milestone 3', () => {
  let bucket: ChallengerR2Bucket;
  let env: Env;

  beforeEach(async () => {
    bucket = new ChallengerR2Bucket();
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
  // SCOPE 1: Cloudflare Pages Function Deep Verification
  // ==========================================================================
  describe('Scope 1: Cloudflare Pages Function Contract & Invariants', () => {
    it('CH2-1.1 - Valid POST multipart stores deterministic key hierarchy and Cache-Control headers', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const fd = new FormData();
      fd.append('manifest', JSON.stringify(bundle));
      fd.append('infographic', new File(['info-bytes'], 'infographic.png', { type: 'image/png' }));
      fd.append('assembled', new File(['assem-bytes'], 'assembled.png', { type: 'image/png' }));
      fd.append('video', new File(['video-bytes'], 'video.mp4', { type: 'video/mp4' }));
      fd.append('audio', new File(['audio-bytes'], 'audio.wav', { type: 'audio/wav' }));

      const context: any = { request: makeMockRequest(fd), env, params: {}, data: {}, waitUntil: () => {}, next: () => {} };
      const response = await onRequestPost(context);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);

      const topicId = bundle.manifest.id;
      const expectedKeys = [
        `topics/${topicId}/manifest.json`,
        `topics/${topicId}/infographic.png`,
        `topics/${topicId}/assembled.png`,
        `topics/${topicId}/video.mp4`,
        `topics/${topicId}/audio.wav`,
        'catalog.json',
      ];

      for (const expectedKey of expectedKeys) {
        expect(bucket.store.has(expectedKey)).toBe(true);
      }

      // Verify all media and manifest have immutable cache header
      const mediaKeys = expectedKeys.filter((k) => k !== 'catalog.json');
      for (const k of mediaKeys) {
        const item = bucket.store.get(k);
        expect(item?.options?.httpMetadata?.cacheControl).toBe('public, max-age=31536000, immutable');
      }

      // Verify catalog.json has edge cache header
      const catalogObj = bucket.store.get('catalog.json');
      expect(catalogObj?.options?.httpMetadata?.cacheControl).toBe(
        'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
      );
    });

    it('CH2-1.2 - Deduplication in catalog.json: Repeated upload of same topic updates existing entry without duplicates', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      const createFD = () => {
        const fd = new FormData();
        fd.append('manifest', JSON.stringify(bundle));
        fd.append('infographic', new File(['info-bytes'], 'infographic.png', { type: 'image/png' }));
        fd.append('assembled', new File(['assem-bytes'], 'assembled.png', { type: 'image/png' }));
        return fd;
      };

      const context1: any = { request: makeMockRequest(createFD()), env, params: {}, data: {}, waitUntil: () => {}, next: () => {} };
      await onRequestPost(context1);

      const context2: any = { request: makeMockRequest(createFD()), env, params: {}, data: {}, waitUntil: () => {}, next: () => {} };
      await onRequestPost(context2);

      const catalogObj = bucket.store.get('catalog.json');
      const catalog: CatalogManifest = JSON.parse(catalogObj?.data as string);

      // Verify exactly 1 entry exists for this topicId, not 2
      const matches = catalog.topics.filter((t) => t.id === bundle.manifest.id);
      expect(matches).toHaveLength(1);
    });

    it('CH2-1.3 - Server-side zero-leak: Rejection of obfuscated and nested API key patterns', async () => {
      // 1. Injected in deeply nested component detailedContent
      const nestedInjection = {
        manifest: { id: 'nested-key', topic: 'Nested' },
        plan: { displayTitle: 'Nested' },
        components: [
          {
            name: 'Gear',
            detailedContent: ['Debugging token: ', 'AIzaSy', 'DUMMY_SECRET_KEY_1234567890abcdef'].join(''),
          },
        ],
      };
      const fd1 = new FormData();
      fd1.append('manifest', JSON.stringify(nestedInjection));
      fd1.append('infographic', new File(['i'], 'i.png'));
      fd1.append('assembled', new File(['a'], 'a.png'));

      const res1 = await onRequestPost({ request: makeMockRequest(fd1), env } as any);
      expect(res1.status).toBe(400);
      expect((await res1.json()).error).toContain('Sanitization rejected: Payload contains disallowed Gemini API Key pattern');

      // 2. Injected Bearer token in trivia list
      const triviaInjection = {
        manifest: { id: 'trivia-key', topic: 'Trivia' },
        plan: {
          displayTitle: 'Trivia',
          trivia: ['Normal trivia', ['OAuth token: ', 'ya29.', 'a0ARrdaM_secret_session_token_12345'].join('')],
        },
      };
      const fd2 = new FormData();
      fd2.append('manifest', JSON.stringify(triviaInjection));
      fd2.append('infographic', new File(['i'], 'i.png'));
      fd2.append('assembled', new File(['a'], 'a.png'));

      const res2 = await onRequestPost({ request: makeMockRequest(fd2), env } as any);
      expect(res2.status).toBe(400);
      expect((await res2.json()).error).toContain('Payload contains disallowed Bearer token pattern');

      // 3. Injected forbidden property name "apiKey": in custom config
      const propInjection = '{"manifest":{"id":"prop-key","topic":"Prop"},"plan":{},"apiKey":"leaked_key"}';
      const fd3 = new FormData();
      fd3.append('manifest', propInjection);
      fd3.append('infographic', new File(['i'], 'i.png'));
      fd3.append('assembled', new File(['a'], 'a.png'));

      const res3 = await onRequestPost({ request: makeMockRequest(fd3), env } as any);
      expect(res3.status).toBe(400);
      expect((await res3.json()).error).toContain('Payload contains forbidden property: "apiKey":');
    });

    it('CH2-1.4 - GET /api/contribute?topicId query sanitizes path traversal attempts', async () => {
      const traversalReq = new Request('https://explodeit.pages.dev/api/contribute?topicId=../../etc/passwd', { method: 'GET' });
      const res = await onRequestGet({ request: traversalReq, env } as any);
      expect(res.status).toBe(404);
      // cleanId strips dots and slashes, keeping only etcpasswd
      expect((await res.json()).error).toContain("Topic 'etcpasswd' not found");
    });
  });

  // ==========================================================================
  // SCOPE 2: Mock Storage Driver Robustness & Boundary Stress
  // ==========================================================================
  describe('Scope 2: Mock Storage Driver (services/mockCommunityStorage.ts)', () => {
    it('CH2-2.1 - Topic slug generator handles edge cases: special chars, consecutive dashes, Unicode', () => {
      expect(generateTopicSlug('Twin-Lens Reflex (TLR) Camera')).toBe('twin-lens-reflex-tlr-camera');
      expect(generateTopicSlug('   Multi---Dash   Spaces  ')).toBe('multi-dash-spaces');
      expect(generateTopicSlug('Special!@#$%^&*()_+Characters')).toBe('special-characters');
      expect(generateTopicSlug('')).toBe('untitled-topic');
    });

    it('CH2-2.2 - Mock storage persists bundle and returns exact object via fetchTopic', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const res = await mockUploadCommunityBundle(bundle);

      expect(res.success).toBe(true);
      expect(res.isMock).toBe(true);
      expect(res.url).toContain('blob:');

      const retrieved = await mockFetchCommunityTopic(bundle.manifest.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.manifest.id).toBe(bundle.manifest.id);
      expect(retrieved?.plan.displayTitle).toBe(bundle.plan.displayTitle);
      expect(retrieved?.components).toHaveLength(bundle.components.length);
    });

    it('CH2-2.3 - High volume catalog insertion keeps newest items sorted at front', async () => {
      const baseTime = Date.now();
      for (let i = 1; i <= 5; i++) {
        const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
        bundle.manifest.id = `batch-topic-${i}`;
        bundle.manifest.topic = `Batch Topic ${i}`;
        bundle.manifest.timestamp = new Date(baseTime + i * 1000).toISOString();
        await mockUploadCommunityBundle(bundle);
      }

      const catalog = await mockFetchCommunityCatalog();
      expect(catalog.length).toBe(3 + 5); // 3 seeds + 5 newly uploaded
      expect(catalog[0].id).toBe('batch-topic-5');
      expect(catalog[1].id).toBe('batch-topic-4');
    });
  });

  // ==========================================================================
  // SCOPE 3: Automatic Fallback Flow
  // ==========================================================================
  describe('Scope 3: Automatic Fallback Flow (services/communityStorage.ts)', () => {
    it('CH2-3.1 - uploadCommunityBundle recovers transparently from 500 server error by routing to mock driver', async () => {
      const bundle = sanitizeGenerationItem(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      const result = await uploadCommunityBundle(bundle);
      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
    });

    it('CH2-3.2 - fetchCommunityCatalog parses both array format and { topics: [] } object format', async () => {
      // 1. Array format
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'array-1', topic: 'Array Topic' }],
      } as any);
      let catalog = await fetchCommunityCatalog();
      expect(catalog).toHaveLength(1);
      expect(catalog[0].id).toBe('array-1');

      // 2. { topics: [] } format
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ topics: [{ id: 'obj-1', topic: 'Object Topic' }] }),
      } as any);
      catalog = await fetchCommunityCatalog();
      expect(catalog).toHaveLength(1);
      expect(catalog[0].id).toBe('obj-1');
    });
  });

  // ==========================================================================
  // SCOPE 4: Contribution UI & Modal Component Verification
  // ==========================================================================
  describe('Scope 4: Contribution UI Modal (components/CommunityContributeModal.tsx)', () => {
    it('CH2-4.1 - Renders all 3 transparency badges with exact verbatim copy', () => {
      const onContribute = vi.fn();
      const onClose = vi.fn();

      render(
        <CommunityContributeModal
          isOpen={true}
          item={mockCameraGenerationItem}
          onClose={onClose}
          onContribute={onContribute}
        />
      );

      // Verify title
      expect(screen.getByText('Contribute to Public Encyclopedia')).toBeInTheDocument();

      // Verify the three mandatory reassurance badges
      expect(screen.getByText('100% Free & Community Hosted')).toBeInTheDocument();
      expect(
        screen.getByText('Zero API Key Transmission: Your personal Gemini key is NEVER uploaded or shared')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Open Educational Knowledge: Shared anonymously to the public showcase')
      ).toBeInTheDocument();
    });

    it('CH2-4.2 - Opt-out checkbox sets localStorage and toggles correctly', () => {
      const onContribute = vi.fn();
      const onClose = vi.fn();

      render(
        <CommunityContributeModal
          isOpen={true}
          item={mockCameraGenerationItem}
          onClose={onClose}
          onContribute={onContribute}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(localStorage.getItem(OPT_OUT_STORAGE_KEY)).toBe('true');

      // Uncheck restores
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(localStorage.getItem(OPT_OUT_STORAGE_KEY)).toBeNull();
    });

    it('CH2-4.3 - Modal exhibits correct state machine transitions (idle -> uploading -> success)', async () => {
      const onContribute = vi.fn().mockImplementation(async () => {
        return { success: true, topicId: 'uploaded-123' };
      });
      const onClose = vi.fn();

      render(
        <CommunityContributeModal
          isOpen={true}
          item={mockCameraGenerationItem}
          onClose={onClose}
          onContribute={onContribute}
        />
      );

      const contributeBtn = screen.getByRole('button', { name: /Contribute to Encyclopedia/i });
      expect(contributeBtn).toBeInTheDocument();

      // Click to contribute
      fireEvent.click(contributeBtn);

      // Verify success banner appears
      await waitFor(() => {
        expect(screen.getByText(/Contributed to Community Encyclopedia/i)).toBeInTheDocument();
      });

      expect(onContribute).toHaveBeenCalledWith(mockCameraGenerationItem);
    });
  });
});
