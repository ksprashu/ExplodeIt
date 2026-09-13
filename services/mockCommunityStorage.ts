/**
 * Mock Community Storage Driver
 * Provides local in-memory, localStorage, and IndexedDB fallback for local development,
 * offline usage, and deterministic testing. Pre-seeded with sample topics.
 */

import { SanitizedGenerationBundle, CommunityCatalogItem, UploadResult } from '../types';
import { mediaCache } from './mediaCache';

export const LOCAL_STORAGE_CATALOG_KEY = 'explodeit_mock_community_catalog_v1';
const DB_NAME = 'explodeit_community_mock_v1';
const DB_VERSION = 1;
const CATALOG_STORE = 'catalog';
const BUNDLES_STORE = 'bundles';

export interface MockStorageOptions {
  simulatedLatencyMs?: number;
  simulateFailure?: boolean;
}

// ============================================================================
// Canonical Pre-Seeded Catalog Items (from tests/mocks/mockGenerations.ts)
// ============================================================================

export const SEED_COMMUNITY_CATALOG: CommunityCatalogItem[] = [
  {
    id: 'tlr-camera-1726240000000',
    topic: 'Twin-Lens Reflex (TLR) Camera',
    timestamp: '2026-09-13T16:00:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
    infographicUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/infographic.png',
    assembledUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/assembled.png',
    videoUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/narration.mp3',
    previewUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/preview.jpg',
  },
  {
    id: 'turbofan-engine-1726240100000',
    topic: 'High-Bypass Turbofan Jet Engine',
    timestamp: '2026-09-13T16:05:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
    infographicUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/infographic.png',
    assembledUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/assembled.png',
    videoUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/narration.mp3',
    previewUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/preview.jpg',
  },
  {
    id: 'neural-transformer-1726240200000',
    topic: 'Transformer Attention Architecture',
    timestamp: '2026-09-13T16:10:00.000Z',
    domain: 'SOFTWARE',
    metaphor: 'Data Flow Visualization',
    infographicUrl: 'https://community.explodeit.org/neural-transformer-1726240200000/infographic.png',
    assembledUrl: 'https://community.explodeit.org/neural-transformer-1726240200000/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/neural-transformer-1726240200000/narration.mp3',
    previewUrl: 'https://community.explodeit.org/neural-transformer-1726240200000/preview.jpg',
  },
];

// In-Memory state fallback (for Node, Vitest, or private browser mode)
const inMemoryCatalog: Map<string, CommunityCatalogItem> = new Map(
  SEED_COMMUNITY_CATALOG.map((item) => [item.id, item])
);
const inMemoryBundles: Map<string, SanitizedGenerationBundle> = new Map();

// Helper to determine test environment
const isTestEnvironment = (): boolean => {
  return (
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || !!(globalThis as any).__vitest_worker__)
  );
};

// IndexedDB Helper
function openMockDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CATALOG_STORE)) {
          db.createObjectStore(CATALOG_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(BUNDLES_STORE)) {
          db.createObjectStore(BUNDLES_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Mock Community Storage Driver Class
 */
export class MockCommunityStorageDriver {
  private defaultLatencyMs = isTestEnvironment() ? 0 : 400;

  /**
   * Upload and persist a sanitized bundle into mock storage (In-memory + localStorage + IndexedDB)
   */
  async uploadBundle(
    bundle: SanitizedGenerationBundle,
    options?: MockStorageOptions
  ): Promise<UploadResult> {
    const latency = options?.simulatedLatencyMs ?? this.defaultLatencyMs;
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    if (options?.simulateFailure) {
      return {
        success: false,
        topicId: bundle.manifest.id,
        error: 'Simulated local storage upload failure',
        isMock: true,
      };
    }

    const topicId = bundle.manifest.id;

    const infoKey = `mock:${topicId}:infographic`;
    const assemKey = `mock:${topicId}:assembled`;
    const audioKey = `mock:${topicId}:audio`;
    const videoKey = `mock:${topicId}:video`;

    const infographicUrl = mediaCache.getCachedObjectURL(infoKey, bundle.media.infographicBlob);
    const assembledUrl = mediaCache.getCachedObjectURL(assemKey, bundle.media.assembledBlob);
    const audioUrl = mediaCache.getCachedObjectURL(audioKey, bundle.media.audioBlob);
    const videoUrl = bundle.media.videoBlob
      ? mediaCache.getCachedObjectURL(videoKey, bundle.media.videoBlob)
      : undefined;

    mediaCache.setMediaBlob(infoKey, bundle.media.infographicBlob).catch(() => {});
    mediaCache.setMediaBlob(assemKey, bundle.media.assembledBlob).catch(() => {});
    mediaCache.setMediaBlob(audioKey, bundle.media.audioBlob).catch(() => {});
    if (bundle.media.videoBlob) {
      mediaCache.setMediaBlob(videoKey, bundle.media.videoBlob).catch(() => {});
    }

    const catalogItem: CommunityCatalogItem = {
      id: topicId,
      topic: bundle.manifest.topic || bundle.plan.displayTitle,
      timestamp: bundle.manifest.timestamp,
      domain: bundle.manifest.domain,
      metaphor: bundle.manifest.metaphor,
      infographicUrl,
      assembledUrl,
      videoUrl,
      audioUrl,
      previewUrl: infographicUrl,
    };

    // 1. Update in-memory collections
    inMemoryCatalog.set(topicId, catalogItem);
    inMemoryBundles.set(topicId, bundle);

    // 2. Persist into localStorage if available
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
        const list: CommunityCatalogItem[] = stored ? JSON.parse(stored) : [...SEED_COMMUNITY_CATALOG];
        const updated = [catalogItem, ...list.filter((i) => i.id !== topicId)];
        localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('[MockCommunityStorage] Failed to save to localStorage:', e);
    }

    // 3. Persist into IndexedDB if available
    const db = await openMockDB();
    if (db) {
      try {
        const tx = db.transaction([CATALOG_STORE, BUNDLES_STORE], 'readwrite');
        tx.objectStore(CATALOG_STORE).put(catalogItem);
        tx.objectStore(BUNDLES_STORE).put({
          id: topicId,
          manifest: bundle.manifest,
          plan: bundle.plan,
          components: bundle.components,
          narrationScript: bundle.narrationScript,
        });
      } catch (err) {
        console.warn('[MockCommunityStorage] IndexedDB persist failed:', err);
      }
    }

    return {
      success: true,
      topicId,
      catalogItem,
      url: infographicUrl,
      isMock: true,
    };
  }

  /**
   * Fetch all catalog items, pre-seeded plus locally contributed
   */
  async fetchCatalog(): Promise<CommunityCatalogItem[]> {
    // 1. Check localStorage first
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((item: CommunityCatalogItem) => inMemoryCatalog.set(item.id, item));
          }
        }
      }
    } catch (e) {
      console.warn('[MockCommunityStorage] Failed to read localStorage:', e);
    }

    // 2. Check IndexedDB
    const db = await openMockDB();
    if (db) {
      try {
        const items = await new Promise<CommunityCatalogItem[]>((resolve) => {
          const tx = db.transaction(CATALOG_STORE, 'readonly');
          const request = tx.objectStore(CATALOG_STORE).getAll();
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => resolve([]);
        });

        if (items.length > 0) {
          items.forEach((item) => inMemoryCatalog.set(item.id, item));
        }
      } catch {
        // Fall through to in-memory
      }
    }

    // Convert map to sorted array (newest first)
    const catalogList = Array.from(inMemoryCatalog.values());
    catalogList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return catalogList;
  }

  /**
   * Fetch full topic bundle by ID
   */
  async fetchTopic(topicId: string): Promise<SanitizedGenerationBundle | null> {
    if (inMemoryBundles.has(topicId)) {
      return inMemoryBundles.get(topicId)!;
    }

    const db = await openMockDB();
    if (db) {
      try {
        const bundleData = await new Promise<any>((resolve) => {
          const tx = db.transaction(BUNDLES_STORE, 'readonly');
          const request = tx.objectStore(BUNDLES_STORE).get(topicId);
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => resolve(null);
        });

        if (bundleData) {
          return bundleData as SanitizedGenerationBundle;
        }
      } catch {
        // Ignore
      }
    }

    return null;
  }

  /**
   * Reset mock catalog to default seeds
   */
  async reset(): Promise<void> {
    inMemoryCatalog.clear();
    SEED_COMMUNITY_CATALOG.forEach((item) => inMemoryCatalog.set(item.id, item));
    inMemoryBundles.clear();

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_CATALOG_KEY);
      }
    } catch {
      // Ignore
    }

    const db = await openMockDB();
    if (db) {
      try {
        const tx = db.transaction([CATALOG_STORE, BUNDLES_STORE], 'readwrite');
        tx.objectStore(CATALOG_STORE).clear();
        tx.objectStore(BUNDLES_STORE).clear();
        SEED_COMMUNITY_CATALOG.forEach((item) => tx.objectStore(CATALOG_STORE).put(item));
      } catch {
        // Ignore
      }
    }
  }
}

export const mockCommunityStorage = new MockCommunityStorageDriver();

export async function mockUploadCommunityBundle(
  bundle: SanitizedGenerationBundle,
  options?: MockStorageOptions
): Promise<UploadResult> {
  return mockCommunityStorage.uploadBundle(bundle, options);
}

export async function mockFetchCommunityCatalog(): Promise<CommunityCatalogItem[]> {
  return mockCommunityStorage.fetchCatalog();
}

export async function mockFetchCommunityTopic(topicId: string): Promise<SanitizedGenerationBundle | null> {
  return mockCommunityStorage.fetchTopic(topicId);
}
