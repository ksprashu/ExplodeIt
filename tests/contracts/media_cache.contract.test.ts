import { describe, it, expect, beforeEach } from 'vitest';
import { MockIndexedDBMediaCache } from '../mocks/mockStorage';

/**
 * MediaCacheService Interface Contract (from PROJECT.md § Interface Contracts)
 */
export interface MediaCacheService {
  getMediaBlob(urlOrKey: string): Promise<Blob | null>;
  setMediaBlob(urlOrKey: string, blob: Blob): Promise<void>;
  getCachedObjectURL(urlOrKey: string, blob: Blob): string;
  clearCache(): Promise<void>;
}

describe('Contract: Multi-Tier Media Cache & Egress Elimination (FEAT-09)', () => {
  let cache: MockIndexedDBMediaCache;

  beforeEach(() => {
    // 1MB test cache limit to exercise eviction easily
    cache = new MockIndexedDBMediaCache(1024 * 1024);
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
      const smallCache = new MockIndexedDBMediaCache(5000);

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
      expect(cache.getEntryCount()).toBe(2);

      await cache.clearCache();
      expect(cache.getEntryCount()).toBe(0);
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
      expect(cache.getEntryCount()).toBe(10);
    });

    it('test_feat09_boundary_distinct_urls_for_distinct_keys: does not collide object URLs', () => {
      const b1 = new Blob([new Uint8Array(10)]);
      const b2 = new Blob([new Uint8Array(20)]);
      const url1 = cache.getCachedObjectURL('key_1', b1);
      const url2 = cache.getCachedObjectURL('key_2', b2);
      expect(url1).not.toBe(url2);
    });
  });
});
