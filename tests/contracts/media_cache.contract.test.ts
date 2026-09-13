import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockIndexedDBMediaCache } from '../mocks/mockStorage';
import { createMediaCache, IndexedDBMediaCache } from '../../services/mediaCache';

/**
 * MediaCacheService Interface Contract (from PROJECT.md § Interface Contracts)
 */
export interface MediaCacheService {
  getMediaBlob(urlOrKey: string): Promise<Blob | null>;
  setMediaBlob(urlOrKey: string, blob: Blob): Promise<void>;
  getCachedObjectURL(urlOrKey: string, blob: Blob): string;
  clearCache(): Promise<void>;
}

export interface TestableMediaCache extends MediaCacheService {
  getEntryCount(): Promise<number> | number;
  getCurrentSize(): Promise<number> | number;
  revokeAllObjectURLs?(): void;
}

interface CacheImplementationProvider {
  name: string;
  factory: (maxSizeBytes?: number) => TestableMediaCache;
}

const IMPLEMENTATIONS: CacheImplementationProvider[] = [
  {
    name: 'Production: IndexedDBMediaCache (createMediaCache)',
    factory: (maxSizeBytes?: number) => createMediaCache(maxSizeBytes),
  },
  {
    name: 'Mock: MockIndexedDBMediaCache',
    factory: (maxSizeBytes?: number) => new MockIndexedDBMediaCache(maxSizeBytes),
  },
];

describe.each(IMPLEMENTATIONS)('Contract: Multi-Tier Media Cache & Egress Elimination (FEAT-09) [$name]', ({ factory }) => {
  let cache: TestableMediaCache;

  beforeEach(async () => {
    // 1MB test cache limit to exercise eviction easily
    cache = factory(1024 * 1024);
    await cache.clearCache();
    vi.clearAllMocks();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('test_feat09_cache_blob_storage_indexeddb: stores and retrieves binary Blob', async () => {
      const key = 'https://r2.explodeit.org/cam-1/infographic.png';
      const testData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes
      const originalBlob = new Blob([testData], { type: 'image/png' });

      await cache.setMediaBlob(key, originalBlob);
      const retrieved = await cache.getMediaBlob(key);

      expect(retrieved).not.toBeNull();
      expect(retrieved).toBeInstanceOf(Blob);
      expect(retrieved!.size).toBe(originalBlob.size);
      expect(retrieved!.type).toBe('image/png');
    });

    it('test_feat09_cache_hit_returns_matching_blob: cache hit prevents redundant network re-fetch', async () => {
      const key = 'https://r2.explodeit.org/cam-1/narration.mp3';
      const audioBlob = new Blob([new Uint8Array(5000)], { type: 'audio/mpeg' });

      await cache.setMediaBlob(key, audioBlob);

      // Multiple subsequent queries return same cached instance
      const hit1 = await cache.getMediaBlob(key);
      const hit2 = await cache.getMediaBlob(key);

      expect(hit1).not.toBeNull();
      expect(hit2).not.toBeNull();
      expect(hit1!.size).toBe(5000);
    });

    it('test_feat09_object_url_pool_reuse: reuses cached ObjectURL for same key', async () => {
      const key = 'https://r2.explodeit.org/cam-1/assembled.png';
      const blob = new Blob([new Uint8Array(100)], { type: 'image/png' });

      const url1 = cache.getCachedObjectURL(key, blob);
      const url2 = cache.getCachedObjectURL(key, blob);

      expect(url1).toBe(url2);
      expect(url1).toContain('blob:');
    });

    it('test_feat09_lru_eviction_under_storage_pressure: evicts oldest accessed media when quota exceeded', async () => {
      // Small 5KB cache
      const smallCache = factory(5000);

      const blobA = new Blob([new Uint8Array(2000)]);
      const blobB = new Blob([new Uint8Array(2000)]);
      const blobC = new Blob([new Uint8Array(2000)]);

      await smallCache.setMediaBlob('item_A', blobA);
      await smallCache.setMediaBlob('item_B', blobB);

      // Access A so B becomes the oldest
      await smallCache.getMediaBlob('item_A');

      // Adding C exceeds 5KB limit (2000 + 2000 + 2000 = 6000 > 5000) -> B should be evicted!
      await smallCache.setMediaBlob('item_C', blobC);

      const itemA = await smallCache.getMediaBlob('item_A');
      const itemB = await smallCache.getMediaBlob('item_B');
      const itemC = await smallCache.getMediaBlob('item_C');

      expect(itemA).not.toBeNull();
      expect(itemB).toBeNull(); // Evicted!
      expect(itemC).not.toBeNull();
    });

    it('test_feat09_clear_cache_purges_all_media_and_urls: reset empties storage', async () => {
      await cache.setMediaBlob('item_1', new Blob([new Uint8Array(500)]));
      await cache.setMediaBlob('item_2', new Blob([new Uint8Array(500)]));
      expect(await cache.getEntryCount()).toBe(2);

      await cache.clearCache();
      expect(await cache.getEntryCount()).toBe(0);
      expect(await cache.getMediaBlob('item_1')).toBeNull();
    });
  });

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('test_feat09_boundary_cache_miss_returns_null: non-existent key yields null cleanly', async () => {
      const result = await cache.getMediaBlob('non_existent_key_999');
      expect(result).toBeNull();
    });

    it('test_feat09_boundary_zero_byte_blob: supports 0-byte blobs without crashing', async () => {
      const emptyBlob = new Blob([], { type: 'text/plain' });
      await cache.setMediaBlob('empty_key', emptyBlob);
      const retrieved = await cache.getMediaBlob('empty_key');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.size).toBe(0);
    });

    it('test_feat09_boundary_special_character_keys: supports complex URI keys', async () => {
      const key = 'https://r2.explodeit.org/topic/Vintage%20Camera%20(1950)/infographic.png?v=1&sig=xyz#sec';
      const blob = new Blob([new Uint8Array(50)], { type: 'image/png' });
      await cache.setMediaBlob(key, blob);
      const retrieved = await cache.getMediaBlob(key);
      expect(retrieved).not.toBeNull();
    });

    it('test_feat09_boundary_concurrent_access_simulation: handles parallel sets without race', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        cache.setMediaBlob(`concurrent_${i}`, new Blob([new Uint8Array(100)]))
      );
      await Promise.all(promises);
      expect(await cache.getEntryCount()).toBe(10);
    });

    it('test_feat09_boundary_distinct_urls_for_distinct_keys: does not collide object URLs', () => {
      const b1 = new Blob([new Uint8Array(10)]);
      const b2 = new Blob([new Uint8Array(20)]);
      const url1 = cache.getCachedObjectURL('key_1', b1);
      const url2 = cache.getCachedObjectURL('key_2', b2);
      expect(url1).not.toBe(url2);
    });
  });

  describe('Tier 3: Stress & High-Load Hardening', () => {
    it('test_feat09_stress_rapid_sequential_sets: handles 50 rapid sequential writes maintaining LRU budget', async () => {
      const quotaBytes = 10 * 1024; // 10KB total budget
      const stressCache = factory(quotaBytes);
      const totalItems = 50;
      const itemSize = 512; // 512 bytes each -> 50 * 512 = 25KB attempted > 10KB budget

      for (let i = 0; i < totalItems; i++) {
        const blob = new Blob([new Uint8Array(itemSize)], { type: 'application/octet-stream' });
        await stressCache.setMediaBlob(`seq_item_${i}`, blob);
      }

      const finalCount = await stressCache.getEntryCount();
      const finalSize = await stressCache.getCurrentSize();

      // Must not exceed 10KB budget
      expect(finalSize).toBeLessThanOrEqual(quotaBytes);
      // Max possible 512B items in 10240 bytes is 20
      expect(finalCount).toBeLessThanOrEqual(20);
      expect(finalCount).toBeGreaterThan(10);

      // Most recently written item must be present
      const latestItem = await stressCache.getMediaBlob(`seq_item_${totalItems - 1}`);
      expect(latestItem).not.toBeNull();

      // Oldest item must have been evicted
      const earliestItem = await stressCache.getMediaBlob('seq_item_0');
      expect(earliestItem).toBeNull();
    });

    it('test_feat09_stress_quota_blob_larger_than_quota: gracefully bypasses caching for oversized blobs without cache corruption', async () => {
      const quotaLimit = 2000;
      const edgeCache = factory(quotaLimit);

      // Pre-seed with a small valid item
      const validSmallBlob = new Blob([new Uint8Array(500)]);
      await edgeCache.setMediaBlob('valid_small_1', validSmallBlob);
      expect(await edgeCache.getMediaBlob('valid_small_1')).not.toBeNull();
      expect(await edgeCache.getCurrentSize()).toBe(500);

      // Attempt to store a single blob larger than total quota (3000 > 2000)
      const oversizedBlob = new Blob([new Uint8Array(3000)]);
      await edgeCache.setMediaBlob('oversized_media', oversizedBlob);

      // Oversized blob should not be cached
      expect(await edgeCache.getMediaBlob('oversized_media')).toBeNull();

      // Cache size should remain valid and small blob must be preserved
      expect(await edgeCache.getCurrentSize()).toBeLessThanOrEqual(quotaLimit);
      expect(await edgeCache.getMediaBlob('valid_small_1')).not.toBeNull();
    });

    it('test_feat09_stress_quota_overwrite_delta: correctly updates size delta when overwriting existing key', async () => {
      const edgeCache = factory(5000);

      // Store initial item of 1000 bytes
      const initialBlob = new Blob([new Uint8Array(1000)]);
      await edgeCache.setMediaBlob('item_delta', initialBlob);
      expect(await edgeCache.getCurrentSize()).toBe(1000);
      expect(await edgeCache.getEntryCount()).toBe(1);

      // Overwrite with larger blob (2500 bytes) -> size becomes 2500, count remains 1
      const largerBlob = new Blob([new Uint8Array(2500)]);
      await edgeCache.setMediaBlob('item_delta', largerBlob);
      expect(await edgeCache.getCurrentSize()).toBe(2500);
      expect(await edgeCache.getEntryCount()).toBe(1);

      // Overwrite with smaller blob (400 bytes) -> size becomes 400
      const smallerBlob = new Blob([new Uint8Array(400)]);
      await edgeCache.setMediaBlob('item_delta', smallerBlob);
      expect(await edgeCache.getCurrentSize()).toBe(400);
      expect(await edgeCache.getEntryCount()).toBe(1);
    });

    it('test_feat09_stress_object_url_revocation_on_eviction_and_clear: triggers URL.revokeObjectURL on eviction and clearCache', async () => {
      const revokeCache = factory(3000);
      const blob1 = new Blob([new Uint8Array(1200)]);
      const blob2 = new Blob([new Uint8Array(1200)]);
      const blob3 = new Blob([new Uint8Array(1200)]);

      await revokeCache.setMediaBlob('rev_1', blob1);
      await revokeCache.setMediaBlob('rev_2', blob2);

      const url1 = revokeCache.getCachedObjectURL('rev_1', blob1);
      const url2 = revokeCache.getCachedObjectURL('rev_2', blob2);

      expect(url1).toBeDefined();
      expect(url2).toBeDefined();

      // Clear spy call history from creation
      vi.clearAllMocks();

      // Setting rev_3 exceeds 3000 quota (1200 + 1200 + 1200 = 3600 > 3000)
      // rev_1 is the oldest and will be evicted -> url1 must be revoked!
      await revokeCache.setMediaBlob('rev_3', blob3);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url1);
      expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(url2);

      // Now clearCache() should revoke url2
      vi.clearAllMocks();
      await revokeCache.clearCache();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url2);
    });

    it('test_feat09_stress_revoke_all_object_urls_helper: revokes pooled URLs while retaining binary Blobs', async () => {
      const poolCache = factory(10000);
      const blob = new Blob([new Uint8Array(800)]);
      await poolCache.setMediaBlob('persistent_item', blob);

      const pooledUrl = poolCache.getCachedObjectURL('persistent_item', blob);
      expect(pooledUrl).toBeDefined();

      vi.clearAllMocks();
      if (typeof poolCache.revokeAllObjectURLs === 'function') {
        poolCache.revokeAllObjectURLs();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(pooledUrl);

        // Binary blob remains intact in cache
        const retrieved = await poolCache.getMediaBlob('persistent_item');
        expect(retrieved).not.toBeNull();
      }
    });
  });
});
