import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createMediaCache,
  IndexedDBMediaCache,
  DEFAULT_CACHE_QUOTA_BYTES,
  STORE_NAME,
  INDEX_LAST_ACCESSED,
  MediaCacheEntry,
} from '../services/mediaCache';
import {
  urlToBlob,
  getCachedMediaObjectURL,
  preloadCommunityTopicMedia,
} from '../services/communityStorage';
import { CommunityCatalogItem } from '../types';

/**
 * Challenger 2 Empirical Adversarial Stress Suite for Milestone 4 (FEAT-09)
 * 
 * Target Commit: f3aa850
 * Focus Areas:
 * 1. Concurrency & Serialized Write Queue Stress under Promise.all
 * 2. ObjectURL Pool Idempotence & Lifecycle
 * 3. Revocation Spying (URL.revokeObjectURL on eviction, clear, overwrite, and manual purge)
 * 4. In-Memory Fallback vs Defined IndexedDB Parity & Error Recovery
 * 5. Network Egress Elimination in services/communityStorage.ts
 */

describe('Challenger 2 - Empirical Adversarial Stress Suite: Milestone 4 (FEAT-09)', () => {
  let originalIndexedDB: any;
  let originalFetch: any;

  beforeEach(() => {
    originalIndexedDB = (globalThis as any).indexedDB;
    originalFetch = globalThis.fetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).indexedDB = originalIndexedDB;
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SCOPE 1: Concurrency & Serialized Write Queue Stress
  // ==========================================================================
  describe('Scope 1: Concurrency & Serialized Write Queue Stress', () => {
    it('CH4-1.1: 50 concurrent parallel writes via Promise.all serialize cleanly without state corruption', async () => {
      const cache = createMediaCache(100 * 1024); // 100KB budget
      await cache.clearCache();

      const totalItems = 50;
      const itemSize = 256; // 50 * 256 = 12.8KB, fits comfortably

      const writePromises = Array.from({ length: totalItems }, (_, i) => {
        const bytes = new Uint8Array(itemSize);
        bytes.fill(i % 255);
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        return cache.setMediaBlob(`concurrent_item_${i}`, blob);
      });

      // Fire all 50 writes concurrently
      await Promise.all(writePromises);

      const entryCount = await cache.getEntryCount();
      const currentSize = await cache.getCurrentSize();

      expect(entryCount).toBe(totalItems);
      expect(currentSize).toBe(totalItems * itemSize);

      // Verify each individual item is intact
      for (let i = 0; i < totalItems; i++) {
        const retrieved = await cache.getMediaBlob(`concurrent_item_${i}`);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.size).toBe(itemSize);
      }
    });

    it('CH4-1.2: 30 concurrent writes targeting the SAME key resolve deterministically with zero ghost entries', async () => {
      const cache = createMediaCache(50 * 1024);
      await cache.clearCache();

      const sameKey = 'https://r2.explodeit.org/shared/hot_asset.png';
      const iterations = 30;

      // Launch 30 concurrent writes to the same key with varying sizes
      const writePromises = Array.from({ length: iterations }, (_, i) => {
        const size = 100 + i * 10;
        const blob = new Blob([new Uint8Array(size)], { type: 'image/png' });
        return cache.setMediaBlob(sameKey, blob);
      });

      await Promise.all(writePromises);

      // Invariant: Exactly 1 entry must exist for the key
      const entryCount = await cache.getEntryCount();
      expect(entryCount).toBe(1);

      const storedBlob = await cache.getMediaBlob(sameKey);
      expect(storedBlob).not.toBeNull();

      const currentSize = await cache.getCurrentSize();
      expect(currentSize).toBe(storedBlob!.size);
      expect(currentSize).toBeGreaterThanOrEqual(100);
      expect(currentSize).toBeLessThanOrEqual(100 + (iterations - 1) * 10);
    });

    it('CH4-1.3: High-concurrency thrashing under quota limit enforces LRU budget without negative size or orphans', async () => {
      const quotaBytes = 5000; // 5KB quota
      const cache = createMediaCache(quotaBytes);
      await cache.clearCache();

      // Launch 30 concurrent writes of 500 bytes each (15,000 bytes attempted > 5,000 budget)
      const totalWrites = 30;
      const itemSize = 500;

      const writePromises = Array.from({ length: totalWrites }, (_, i) => {
        const blob = new Blob([new Uint8Array(itemSize)], { type: 'application/octet-stream' });
        return cache.setMediaBlob(`thrash_item_${i}`, blob);
      });

      await Promise.all(writePromises);

      const finalSize = await cache.getCurrentSize();
      const finalCount = await cache.getEntryCount();

      // Invariant: Final size must NEVER exceed quotaBytes and must never be negative
      expect(finalSize).toBeGreaterThan(0);
      expect(finalSize).toBeLessThanOrEqual(quotaBytes);
      expect(finalCount).toBeLessThanOrEqual(10); // 5000 / 500 = max 10 items
      expect(finalCount).toBeGreaterThanOrEqual(8);

      // Verify that the final size matches finalCount * itemSize
      expect(finalSize).toBe(finalCount * itemSize);
    });

    it('CH4-1.4: Interleaved concurrent reads and writes guarantee transactional consistency', async () => {
      const cache = createMediaCache(50 * 1024);
      await cache.clearCache();

      // Pre-seed with base items
      await cache.setMediaBlob('item_seed', new Blob([new Uint8Array(1000)]));

      const readerResults: (Blob | null)[] = [];
      const tasks: Promise<void>[] = [];

      // Interleave 20 writes and 20 reads concurrently
      for (let i = 0; i < 20; i++) {
        tasks.push(
          cache.setMediaBlob(`interleaved_${i}`, new Blob([new Uint8Array(200)]))
        );
        tasks.push(
          cache.getMediaBlob('item_seed').then((blob) => {
            readerResults.push(blob);
          })
        );
      }

      await Promise.all(tasks);

      // All reads of 'item_seed' must return a valid 1000-byte Blob, never null or corrupted
      expect(readerResults).toHaveLength(20);
      for (const res of readerResults) {
        expect(res).not.toBeNull();
        expect(res!.size).toBe(1000);
      }

      expect(await cache.getEntryCount()).toBe(21); // 1 seed + 20 interleaved
    });

    it('CH4-1.5: Write queue recovers cleanly after an individual write failure without stalling subsequent writes', async () => {
      const cache = createMediaCache(10000);
      await cache.clearCache();

      // Normal write
      await cache.setMediaBlob('item_before', new Blob([new Uint8Array(500)]));

      // Attempt write with an oversized blob that triggers bypass (size > maxSizeBytes)
      const oversizedBlob = new Blob([new Uint8Array(20000)]);
      await cache.setMediaBlob('item_oversized', oversizedBlob);

      // Subsequent write in the queue must still execute cleanly
      await cache.setMediaBlob('item_after', new Blob([new Uint8Array(500)]));

      expect(await cache.getMediaBlob('item_before')).not.toBeNull();
      expect(await cache.getMediaBlob('item_oversized')).toBeNull(); // Safely bypassed
      expect(await cache.getMediaBlob('item_after')).not.toBeNull();
      expect(await cache.getEntryCount()).toBe(2);
    });

    it('CH4-1.6: Overwrite of oldest item with larger blob triggering eviction does not desync size or breach quota', async () => {
      const quota = 5000;
      const cache = createMediaCache(quota);
      await cache.clearCache();

      // Seed item A (2000) and item B (2000) -> total 4000 <= 5000
      // A was added first, so A is the oldest
      await cache.setMediaBlob('item_A', new Blob([new Uint8Array(2000)]));
      await cache.setMediaBlob('item_B', new Blob([new Uint8Array(2000)]));

      // Overwrite item A with 3500 bytes.
      // Net additional: 3500 - 2000 = 1500. Total would be 4000 + 1500 = 5500 > 5000.
      // To satisfy the 5000 quota, item B (2000 bytes) should be evicted.
      // Total size must be 3500 <= 5000.
      await cache.setMediaBlob('item_A', new Blob([new Uint8Array(3500)]));

      const reportedSize = await cache.getCurrentSize();
      const internalStore = (cache as any).inMemoryStore;
      let actualStoreSum = 0;
      if (internalStore && internalStore instanceof Map) {
        for (const entry of internalStore.values()) {
          actualStoreSum += entry.size;
        }
      }

      expect(actualStoreSum).toBeLessThanOrEqual(quota);
      expect(reportedSize).toBe(actualStoreSum);
      expect(await cache.getMediaBlob('item_A')).not.toBeNull();
    });
  });

  // ==========================================================================
  // SCOPE 2: ObjectURL Pool Idempotence & Lifecycle
  // ==========================================================================
  describe('Scope 2: ObjectURL Pool Idempotence & Lifecycle', () => {
    it('CH4-2.1: Repeated getCachedObjectURL calls return the exact same URL string', () => {
      const cache = createMediaCache();
      const testBlob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' });
      const key = 'https://r2.explodeit.org/pool/test_image.png';

      const initialUrl = cache.getCachedObjectURL(key, testBlob);
      expect(initialUrl).toBeDefined();
      expect(initialUrl).toContain('blob:');

      // Call 25 times consecutively
      for (let i = 0; i < 25; i++) {
        const subsequentUrl = cache.getCachedObjectURL(key, testBlob);
        expect(subsequentUrl).toBe(initialUrl);
      }
    });

    it('CH4-2.2: Different keys receive distinct, non-colliding ObjectURLs', () => {
      const cache = createMediaCache();
      const generatedUrls = new Set<string>();
      const keyCount = 20;

      for (let i = 0; i < keyCount; i++) {
        const blob = new Blob([new Uint8Array(50)], { type: 'image/png' });
        const url = cache.getCachedObjectURL(`unique_key_${i}`, blob);
        expect(generatedUrls.has(url)).toBe(false);
        generatedUrls.add(url);
      }

      expect(generatedUrls.size).toBe(keyCount);
    });

    it('CH4-2.3: Overwriting a key with a new blob causes getCachedObjectURL to return a new URL', async () => {
      const cache = createMediaCache(10000);
      const key = 'https://r2.explodeit.org/pool/dynamic_asset.png';

      const blobV1 = new Blob([new Uint8Array(200)], { type: 'image/png' });
      await cache.setMediaBlob(key, blobV1);
      const urlV1 = cache.getCachedObjectURL(key, blobV1);

      // Overwrite key with V2
      const blobV2 = new Blob([new Uint8Array(400)], { type: 'image/png' });
      await cache.setMediaBlob(key, blobV2);

      const urlV2 = cache.getCachedObjectURL(key, blobV2);

      // The new URL must be freshly generated because V1 was revoked upon overwrite
      expect(urlV2).not.toBe(urlV1);
      expect(urlV2).toContain('blob:');
    });

    it('CH4-2.4: getCachedObjectURL returns new URL after manual revokeObjectURL', () => {
      const cache = createMediaCache();
      const key = 'https://r2.explodeit.org/pool/revokable.png';
      const blob = new Blob([new Uint8Array(100)], { type: 'image/png' });

      const url1 = cache.getCachedObjectURL(key, blob);
      expect(url1).toBeDefined();

      // Revoke via key
      cache.revokeObjectURL(key);

      // Next call must generate a new URL
      const url2 = cache.getCachedObjectURL(key, blob);
      expect(url2).not.toBe(url1);
    });
  });

  // ==========================================================================
  // SCOPE 3: Revocation Spying (URL.revokeObjectURL)
  // ==========================================================================
  describe('Scope 3: Revocation Spying (URL.revokeObjectURL)', () => {
    it('CH4-3.1: Eviction under quota calls URL.revokeObjectURL with the exact evicted URL', async () => {
      // 3KB quota
      const cache = createMediaCache(3000);
      await cache.clearCache();

      const blobA = new Blob([new Uint8Array(1200)]);
      const blobB = new Blob([new Uint8Array(1200)]);
      const blobC = new Blob([new Uint8Array(1200)]);

      await cache.setMediaBlob('item_A', blobA);
      await cache.setMediaBlob('item_B', blobB);

      const urlA = cache.getCachedObjectURL('item_A', blobA);
      const urlB = cache.getCachedObjectURL('item_B', blobB);

      vi.clearAllMocks();

      // Adding item_C requires 1200 bytes. Current = 2400. 2400 + 1200 = 3600 > 3000.
      // item_A is the oldest, so it is evicted and urlA must be revoked.
      await cache.setMediaBlob('item_C', blobC);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(urlA);
      expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(urlB);
    });

    it('CH4-3.2: clearCache() calls URL.revokeObjectURL for all active pooled URLs and is idempotent', async () => {
      const cache = createMediaCache(50000);
      await cache.clearCache();

      const urls: string[] = [];
      for (let i = 0; i < 5; i++) {
        const blob = new Blob([new Uint8Array(100)]);
        await cache.setMediaBlob(`clear_item_${i}`, blob);
        urls.push(cache.getCachedObjectURL(`clear_item_${i}`, blob));
      }

      expect(urls).toHaveLength(5);
      vi.clearAllMocks();

      // Clear cache
      await cache.clearCache();

      // Every pooled URL must have been passed to URL.revokeObjectURL
      for (const url of urls) {
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
      }

      // Second clearCache should be a no-op with 0 additional revocations
      vi.clearAllMocks();
      await cache.clearCache();
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it('CH4-3.3: revokeAllObjectURLs() purges all pooled URLs but preserves binary Blobs in cache', async () => {
      const cache = createMediaCache(20000);
      await cache.clearCache();

      const blob1 = new Blob([new Uint8Array(500)]);
      const blob2 = new Blob([new Uint8Array(600)]);

      await cache.setMediaBlob('persist_1', blob1);
      await cache.setMediaBlob('persist_2', blob2);

      const url1 = cache.getCachedObjectURL('persist_1', blob1);
      const url2 = cache.getCachedObjectURL('persist_2', blob2);

      vi.clearAllMocks();

      cache.revokeAllObjectURLs();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url2);

      // Invariant: Blobs remain present and queryable in cache!
      const fetched1 = await cache.getMediaBlob('persist_1');
      const fetched2 = await cache.getMediaBlob('persist_2');
      expect(fetched1).not.toBeNull();
      expect(fetched2).not.toBeNull();
      expect(fetched1!.size).toBe(500);
      expect(fetched2!.size).toBe(600);
    });

    it('CH4-3.4: revokeObjectURL revokes by key, by blob URL, or by raw blob string', () => {
      const cache = createMediaCache();
      const blob = new Blob([new Uint8Array(50)]);

      const urlA = cache.getCachedObjectURL('target_key_a', blob);
      const urlB = cache.getCachedObjectURL('target_key_b', blob);

      vi.clearAllMocks();

      // 1. Revoke by key
      cache.revokeObjectURL('target_key_a');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(urlA);

      // 2. Revoke by blob URL string
      cache.revokeObjectURL(urlB);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(urlB);

      // 3. Revoke an external unpooled blob URL
      const externalBlobUrl = 'blob:http://localhost:3000/external-uuid-123';
      cache.revokeObjectURL(externalBlobUrl);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(externalBlobUrl);

      // 4. Revoke a non-existent non-blob string (must not throw or call revokeObjectURL)
      vi.clearAllMocks();
      cache.revokeObjectURL('non_existent_key_xyz');
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it('CH4-3.5: Overwrite of an existing key immediately revokes its old pooled ObjectURL', async () => {
      const cache = createMediaCache(10000);
      const key = 'https://r2.explodeit.org/overwrite_test.png';

      const blob1 = new Blob([new Uint8Array(100)]);
      await cache.setMediaBlob(key, blob1);
      const url1 = cache.getCachedObjectURL(key, blob1);

      vi.clearAllMocks();

      // Overwrite with blob2
      const blob2 = new Blob([new Uint8Array(200)]);
      await cache.setMediaBlob(key, blob2);

      // url1 must be revoked on overwrite!
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url1);
    });
  });

  // ==========================================================================
  // SCOPE 4: In-Memory Fallback vs Defined IndexedDB Parity
  // ==========================================================================
  describe('Scope 4: In-Memory Fallback vs Defined IndexedDB Parity & Error Recovery', () => {
    it('CH4-4.1: Seamless execution when globalThis.indexedDB is explicitly undefined', async () => {
      // Force environment to lack indexedDB
      const originalIDB = (globalThis as any).indexedDB;
      delete (globalThis as any).indexedDB;

      const cache = new IndexedDBMediaCache(5000);

      // 1. setMediaBlob & getMediaBlob
      const blob = new Blob([new Uint8Array(1500)], { type: 'image/jpeg' });
      await cache.setMediaBlob('fallback_item_1', blob);

      const retrieved = await cache.getMediaBlob('fallback_item_1');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.size).toBe(1500);

      // 2. Size and count
      expect(await cache.getCurrentSize()).toBe(1500);
      expect(await cache.getEntryCount()).toBe(1);

      // 3. LRU eviction in fallback mode
      await cache.setMediaBlob('fallback_item_2', new Blob([new Uint8Array(2000)]));
      await cache.setMediaBlob('fallback_item_3', new Blob([new Uint8Array(2500)]));
      // 1500 + 2000 + 2500 = 6000 > 5000 -> item 1 evicted!
      expect(await cache.getMediaBlob('fallback_item_1')).toBeNull();
      expect(await cache.getMediaBlob('fallback_item_2')).not.toBeNull();
      expect(await cache.getMediaBlob('fallback_item_3')).not.toBeNull();
      expect(await cache.getCurrentSize()).toBe(4500);

      // 4. clearCache in fallback mode
      await cache.clearCache();
      expect(await cache.getEntryCount()).toBe(0);
      expect(await cache.getCurrentSize()).toBe(0);

      (globalThis as any).indexedDB = originalIDB;
    });

    it('CH4-4.2: Graceful transition to in-memory fallback when indexedDB.open() rejects or errors', async () => {
      // Emulate a locked or corrupted browser IndexedDB that rejects open()
      (globalThis as any).indexedDB = {
        open: vi.fn(() => {
          const req: any = {};
          setTimeout(() => {
            req.error = new Error('Database locked by another process / QuotaExceededError');
            if (typeof req.onerror === 'function') {
              req.onerror();
            }
          }, 0);
          return req;
        }),
      };

      const cache = new IndexedDBMediaCache(10000);

      // Operations should NOT throw or reject; they must silently fall back to in-memory store
      const testBlob = new Blob([new Uint8Array(800)]);
      await expect(cache.setMediaBlob('recovered_item', testBlob)).resolves.not.toThrow();

      const retrieved = await cache.getMediaBlob('recovered_item');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.size).toBe(800);

      expect(await cache.getEntryCount()).toBe(1);
      expect(await cache.getCurrentSize()).toBe(800);
    });

    it('CH4-4.3: Full parity between High-Fidelity Mock IndexedDB and In-Memory fallback', async () => {
      // Construct a high-fidelity in-memory IndexedDB simulation
      const mockDBStorage = new Map<string, MediaCacheEntry>();

      const createMockIDBDatabase = () => ({
        objectStoreNames: { contains: () => true },
        transaction: vi.fn(() => {
          const store: any = {
            get: vi.fn((key: string) => {
              const req: any = {};
              setTimeout(() => {
                req.result = mockDBStorage.get(key);
                req.onsuccess?.();
              }, 0);
              return req;
            }),
            put: vi.fn((entry: MediaCacheEntry) => {
              const req: any = {};
              setTimeout(() => {
                mockDBStorage.set(entry.key, entry);
                req.onsuccess?.();
              }, 0);
              return req;
            }),
            delete: vi.fn((key: string) => {
              const req: any = {};
              setTimeout(() => {
                mockDBStorage.delete(key);
                req.onsuccess?.();
              }, 0);
              return req;
            }),
            clear: vi.fn(() => {
              const req: any = {};
              setTimeout(() => {
                mockDBStorage.clear();
                req.onsuccess?.();
              }, 0);
              return req;
            }),
            count: vi.fn(() => {
              const req: any = {};
              setTimeout(() => {
                req.result = mockDBStorage.size;
                req.onsuccess?.();
              }, 0);
              return req;
            }),
            openCursor: vi.fn(() => {
              const req: any = {};
              const entries = Array.from(mockDBStorage.values());
              let idx = 0;
              const iterate = () => {
                if (idx < entries.length) {
                  req.result = {
                    value: entries[idx++],
                    continue: () => setTimeout(iterate, 0),
                  };
                } else {
                  req.result = null;
                }
                req.onsuccess?.();
              };
              setTimeout(iterate, 0);
              return req;
            }),
            index: vi.fn(() => ({
              openCursor: vi.fn(() => {
                const req: any = {};
                const sorted = Array.from(mockDBStorage.values()).sort(
                  (a, b) => a.lastAccessed - b.lastAccessed
                );
                let idx = 0;
                const iterate = () => {
                  if (idx < sorted.length) {
                    req.result = {
                      value: sorted[idx++],
                      continue: () => setTimeout(iterate, 0),
                    };
                  } else {
                    req.result = null;
                  }
                  req.onsuccess?.();
                };
                setTimeout(iterate, 0);
                return req;
              }),
            })),
          };
          return { objectStore: () => store };
        }),
      });

      (globalThis as any).indexedDB = {
        open: vi.fn(() => {
          const req: any = {};
          setTimeout(() => {
            req.result = createMockIDBDatabase();
            req.onsuccess?.();
          }, 0);
          return req;
        }),
      };

      const idbCache = new IndexedDBMediaCache(8000);

      // Perform sets and gets against IndexedDB simulation
      const blob1 = new Blob([new Uint8Array(2000)]);
      const blob2 = new Blob([new Uint8Array(3000)]);

      await idbCache.setMediaBlob('db_item_1', blob1);
      await idbCache.setMediaBlob('db_item_2', blob2);

      const res1 = await idbCache.getMediaBlob('db_item_1');
      const res2 = await idbCache.getMediaBlob('db_item_2');

      expect(res1).not.toBeNull();
      expect(res2).not.toBeNull();
      expect(res1!.size).toBe(2000);
      expect(res2!.size).toBe(3000);

      expect(await idbCache.getEntryCount()).toBe(2);
      expect(await idbCache.getCurrentSize()).toBe(5000);

      // Clear cache
      await idbCache.clearCache();
      expect(await idbCache.getEntryCount()).toBe(0);
      expect(await idbCache.getCurrentSize()).toBe(0);
    });
  });

  // ==========================================================================
  // SCOPE 5: Network Egress Elimination in services/communityStorage.ts
  // ==========================================================================
  describe('Scope 5: Network Egress Elimination (services/communityStorage.ts)', () => {
    it('CH4-5.1: urlToBlob cache-first lookup guarantees fetch is called only once for repeated queries', async () => {
      const mediaUrl = 'https://r2.explodeit.org/topics/vintage-camera/infographic.png';
      const mockBlobBytes = new Uint8Array([137, 80, 78, 71, 10, 20, 30]);

      // Mock network fetch
      const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob([mockBlobBytes], { type: 'image/png' }),
        };
      });
      globalThis.fetch = fetchSpy;

      // 1. First call: triggers network fetch and populates cache
      const blob1 = await urlToBlob(mediaUrl, 'image/png');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(blob1).toBeInstanceOf(Blob);
      expect(blob1.size).toBe(mockBlobBytes.length);

      // Allow background writeQueue promise to flush
      await new Promise((r) => setTimeout(r, 50));

      // 2. Second call for identical URL: must return from cache without network fetch!
      const blob2 = await urlToBlob(mediaUrl, 'image/png');
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Still exactly 1!
      expect(blob2.size).toBe(blob1.size);

      // 3. Third call: zero additional egress
      const blob3 = await urlToBlob(mediaUrl, 'image/png');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(blob3.size).toBe(blob1.size);
    });

    it('CH4-5.2: Concurrent calls to urlToBlob after caching generate zero network requests', async () => {
      const mediaUrl = 'https://r2.explodeit.org/topics/steam-engine/assembled.png';
      const mockBlobBytes = new Uint8Array(2048);

      const fetchSpy = vi.fn().mockImplementation(async () => ({
        ok: true,
        status: 200,
        blob: async () => new Blob([mockBlobBytes], { type: 'image/png' }),
      }));
      globalThis.fetch = fetchSpy;

      // Prime the cache
      await urlToBlob(mediaUrl, 'image/png');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      await new Promise((r) => setTimeout(r, 50));

      // Launch 15 concurrent requests for the same URL
      const concurrentResults = await Promise.all(
        Array.from({ length: 15 }, () => urlToBlob(mediaUrl, 'image/png'))
      );

      // Zero additional network requests!
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(concurrentResults).toHaveLength(15);
      for (const res of concurrentResults) {
        expect(res.size).toBe(2048);
      }
    });

    it('CH4-5.3: Cached media remains accessible when browser is offline or fetch throws', async () => {
      const mediaUrl = 'https://r2.explodeit.org/topics/microscope/narration.mp3';

      // 1. Populate cache while online
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => new Blob([new Uint8Array(4096)], { type: 'audio/mpeg' }),
      } as any);

      const onlineBlob = await urlToBlob(mediaUrl, 'audio/mpeg');
      expect(onlineBlob.size).toBe(4096);
      await new Promise((r) => setTimeout(r, 50));

      // 2. Simulate complete network outage / offline mode
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch: Network is offline'));

      // 3. urlToBlob must still succeed and return cached Blob!
      const offlineBlob = await urlToBlob(mediaUrl, 'audio/mpeg');
      expect(offlineBlob).not.toBeNull();
      expect(offlineBlob.size).toBe(4096);
    });

    it('CH4-5.4: getCachedMediaObjectURL returns pooled ObjectURL on cache hit without network egress', async () => {
      const mediaUrl = 'https://r2.explodeit.org/topics/compass/infographic.png';
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: async () => new Blob([new Uint8Array(1024)], { type: 'image/png' }),
      } as any);
      globalThis.fetch = fetchSpy;

      // First call fetches and pools
      const url1 = await getCachedMediaObjectURL(mediaUrl, 'image/png');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(url1).toContain('blob:');

      await new Promise((r) => setTimeout(r, 50));

      // Second call returns cached pooled ObjectURL without network fetch
      const url2 = await getCachedMediaObjectURL(mediaUrl, 'image/png');
      expect(fetchSpy).toHaveBeenCalledTimes(1); // Egress eliminated!
      expect(url2).toBe(url1); // Same pooled URL!
    });

    it('CH4-5.5: preloadCommunityTopicMedia populates all 4 media assets preventing subsequent fetches', async () => {
      const topic: CommunityCatalogItem = {
        id: 'telescope-1980',
        topic: 'Refracting Telescope',
        timestamp: new Date().toISOString(),
        domain: 'PHYSICAL',
        metaphor: 'Exploded View',
        infographicUrl: 'https://r2.explodeit.org/topics/telescope-1980/infographic.png',
        assembledUrl: 'https://r2.explodeit.org/topics/telescope-1980/assembled.png',
        videoUrl: 'https://r2.explodeit.org/topics/telescope-1980/video.mp4',
        audioUrl: 'https://r2.explodeit.org/topics/telescope-1980/audio.wav',
        previewUrl: 'https://r2.explodeit.org/topics/telescope-1980/preview.png',
      };

      const fetchSpy = vi.fn().mockImplementation(async (url: string) => {
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob([new Uint8Array(1000)], { type: 'application/octet-stream' }),
        };
      });
      globalThis.fetch = fetchSpy;

      // Preload the entire community topic
      const preloaded = await preloadCommunityTopicMedia(topic);

      expect(fetchSpy).toHaveBeenCalledTimes(4); // 4 assets fetched once
      expect(preloaded.infographicUrl).toContain('blob:');
      expect(preloaded.assembledUrl).toContain('blob:');
      expect(preloaded.videoUrl).toContain('blob:');
      expect(preloaded.audioUrl).toContain('blob:');

      await new Promise((r) => setTimeout(r, 50));

      // Now query each asset via urlToBlob
      await urlToBlob(topic.infographicUrl);
      await urlToBlob(topic.assembledUrl);
      await urlToBlob(topic.videoUrl!);
      await urlToBlob(topic.audioUrl);

      // ZERO additional fetch calls!
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });
});
