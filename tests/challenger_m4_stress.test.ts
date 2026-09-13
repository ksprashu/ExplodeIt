import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMediaCache, IndexedDBMediaCache, DEFAULT_CACHE_QUOTA_BYTES } from '../services/mediaCache';
import { MockIndexedDBMediaCache } from './mocks/mockStorage';

/**
 * Challenger 1: Empirical Adversarial Stress Harness for Milestone 4 (FEAT-09)
 * 
 * Attacking:
 * 1. Monotonic sequence ordering & rapid sub-millisecond writes
 * 2. LRU eviction correctness & recency updates via getMediaBlob
 * 3. Oversized blob safety & quota boundaries
 * 4. Overwrite size delta accounting & double-decrement race conditions
 * 5. Edge cases: zero-byte blobs, empty keys, unicode, emoji, complex URIs
 */

const IMPLEMENTATIONS = [
  {
    name: 'Production IndexedDBMediaCache (createMediaCache)',
    factory: (quota?: number) => createMediaCache(quota),
  },
  {
    name: 'MockIndexedDBMediaCache',
    factory: (quota?: number) => new MockIndexedDBMediaCache(quota),
  },
];

describe.each(IMPLEMENTATIONS)('Challenger 1 Stress Harness: [$name]', ({ factory }) => {

  describe('1. Monotonic Sequence Ordering & Sub-Millisecond Rapid Writes', () => {
    it('CH1-1.1: 500 rapid writes in sub-millisecond tight loop maintain strictly increasing sequences without collision', async () => {
      const cache = factory(500 * 1024 * 1024); // 500MB
      const count = 500;

      for (let i = 0; i < count; i++) {
        const blob = new Blob([new Uint8Array(10)]);
        await cache.setMediaBlob(`rapid_${i}`, blob);
      }

      // Verify sequence monotonicity on internal entries
      const entries: { key: string; lastAccessed: number }[] = [];
      const storeMap = (cache as any).inMemoryStore || (cache as any).db;
      if (storeMap && storeMap instanceof Map) {
        for (const [key, entry] of storeMap.entries()) {
          entries.push({ key, lastAccessed: entry.lastAccessed });
        }
      }

      expect(entries.length).toBe(count);

      // Verify strictly monotonic ordering
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i].lastAccessed).toBeGreaterThan(entries[i - 1].lastAccessed);
      }
    });

    it('CH1-1.2: Frozen system clock produces strictly monotonic sequences across consecutive writes', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(1000000); // Fixed timestamp

      const cache = factory(10 * 1024 * 1024);
      const writeCount = 50;

      for (let i = 0; i < writeCount; i++) {
        await cache.setMediaBlob(`frozen_${i}`, new Blob([new Uint8Array(20)]));
      }

      const storeMap = (cache as any).inMemoryStore || (cache as any).db;
      const sequences: number[] = [];
      if (storeMap && storeMap instanceof Map) {
        for (let i = 0; i < writeCount; i++) {
          const entry = storeMap.get(`frozen_${i}`);
          expect(entry).toBeDefined();
          sequences.push(entry.lastAccessed);
        }
      }

      // Assert each sequence is strictly greater than the previous even though Date.now() never changed
      for (let i = 1; i < sequences.length; i++) {
        expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
      }

      vi.useRealTimers();
    });

    it('CH1-1.3: Clock backward jump (NTP sync/skew) maintains strictly increasing sequences', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(5000000);

      const cache = factory(10 * 1024 * 1024);
      await cache.setMediaBlob('skew_1', new Blob([new Uint8Array(10)]));

      // Clock jumps BACKWARD by 1000 seconds
      vi.setSystemTime(4000000);
      await cache.setMediaBlob('skew_2', new Blob([new Uint8Array(10)]));

      const storeMap = (cache as any).inMemoryStore || (cache as any).db;
      if (storeMap && storeMap instanceof Map) {
        const e1 = storeMap.get('skew_1');
        const e2 = storeMap.get('skew_2');
        expect(e2.lastAccessed).toBeGreaterThan(e1.lastAccessed);
      }

      vi.useRealTimers();
    });

    it('CH1-1.4: 50 concurrent writes via Promise.all are serialized without race corruption', async () => {
      const cache = factory(10 * 1024 * 1024);
      const tasks = Array.from({ length: 50 }, (_, i) =>
        cache.setMediaBlob(`parallel_${i}`, new Blob([new Uint8Array(100)]))
      );

      await Promise.all(tasks);

      const count = await cache.getEntryCount();
      expect(count).toBe(50);

      // Verify every parallel key is retrievable
      for (let i = 0; i < 50; i++) {
        const blob = await cache.getMediaBlob(`parallel_${i}`);
        expect(blob).not.toBeNull();
        expect(blob!.size).toBe(100);
      }
    });
  });

  describe('2. LRU Eviction & Recency Updating via getMediaBlob', () => {
    it('CH1-2.1: getMediaBlob updates recency and prevents accessed item from being evicted first', async () => {
      const quota = 5000;
      const cache = factory(quota);

      const b1 = new Blob([new Uint8Array(1800)]);
      const b2 = new Blob([new Uint8Array(1800)]);
      const b3 = new Blob([new Uint8Array(1800)]);

      // Add item 1 and item 2 (Total = 3600 <= 5000)
      await cache.setMediaBlob('item_1', b1);
      await cache.setMediaBlob('item_2', b2);

      // Read item 1 -> updates its recency so item 2 is now the LRU
      const read1 = await cache.getMediaBlob('item_1');
      expect(read1).not.toBeNull();

      // Add item 3 (Total = 3600 + 1800 = 5400 > 5000) -> must evict item 2 (NOT item 1)
      await cache.setMediaBlob('item_3', b3);

      expect(await cache.getMediaBlob('item_1')).not.toBeNull(); // Preserved
      expect(await cache.getMediaBlob('item_2')).toBeNull();     // Evicted!
      expect(await cache.getMediaBlob('item_3')).not.toBeNull(); // Newly added
    });

    it('CH1-2.2: Multi-item cascade eviction when incoming blob requires evicting multiple entries', async () => {
      const quota = 5000;
      const cache = factory(quota);

      // Insert 4 items of 1000 bytes each = 4000 bytes
      await cache.setMediaBlob('k1', new Blob([new Uint8Array(1000)]));
      await cache.setMediaBlob('k2', new Blob([new Uint8Array(1000)]));
      await cache.setMediaBlob('k3', new Blob([new Uint8Array(1000)]));
      await cache.setMediaBlob('k4', new Blob([new Uint8Array(1000)]));

      expect(await cache.getCurrentSize()).toBe(4000);
      expect(await cache.getEntryCount()).toBe(4);

      // Insert big item of 3500 bytes: 4000 + 3500 = 7500 > 5000
      // Needs to evict k1 (1000), k2 (1000), k3 (1000) -> remaining: k4 (1000) + big (3500) = 4500 <= 5000
      await cache.setMediaBlob('big_item', new Blob([new Uint8Array(3500)]));

      expect(await cache.getMediaBlob('k1')).toBeNull(); // Evicted
      expect(await cache.getMediaBlob('k2')).toBeNull(); // Evicted
      expect(await cache.getMediaBlob('k3')).toBeNull(); // Evicted
      expect(await cache.getMediaBlob('k4')).not.toBeNull(); // Preserved
      expect(await cache.getMediaBlob('big_item')).not.toBeNull(); // Added

      const currentSize = await cache.getCurrentSize();
      expect(currentSize).toBe(4500);
      expect(currentSize).toBeLessThanOrEqual(quota);
    });

    it('CH1-2.3: Cache total size never exceeds maxSizeBytes at any point', async () => {
      const quota = 4000;
      const cache = factory(quota);

      for (let i = 0; i < 30; i++) {
        const randomSize = Math.floor(Math.random() * 800) + 200; // 200 - 1000 bytes
        await cache.setMediaBlob(`rand_${i}`, new Blob([new Uint8Array(randomSize)]));
        const size = await cache.getCurrentSize();
        expect(size).toBeLessThanOrEqual(quota);
      }
    });
  });

  describe('3. Oversized Blobs & Boundary Conditions', () => {
    it('CH1-3.1: Single blob larger than quota is rejected without throwing and preserves existing entries', async () => {
      const quota = 3000;
      const cache = factory(quota);

      await cache.setMediaBlob('keeper', new Blob([new Uint8Array(1500)]));
      expect(await cache.getCurrentSize()).toBe(1500);

      // Oversized blob: 5000 > 3000
      await cache.setMediaBlob('huge_blob', new Blob([new Uint8Array(5000)]));

      expect(await cache.getMediaBlob('huge_blob')).toBeNull();
      expect(await cache.getMediaBlob('keeper')).not.toBeNull();
      expect(await cache.getCurrentSize()).toBe(1500);
      expect(await cache.getEntryCount()).toBe(1);
    });

    it('CH1-3.2: Blob exactly equal to maxSizeBytes is accepted and evicts all previous items', async () => {
      const quota = 3000;
      const cache = factory(quota);

      await cache.setMediaBlob('prev_1', new Blob([new Uint8Array(1000)]));
      await cache.setMediaBlob('prev_2', new Blob([new Uint8Array(1000)]));
      expect(await cache.getCurrentSize()).toBe(2000);

      // Exact fit: 3000 == 3000
      await cache.setMediaBlob('exact_fit', new Blob([new Uint8Array(3000)]));

      expect(await cache.getMediaBlob('prev_1')).toBeNull();
      expect(await cache.getMediaBlob('prev_2')).toBeNull();
      expect(await cache.getMediaBlob('exact_fit')).not.toBeNull();
      expect(await cache.getCurrentSize()).toBe(3000);
      expect(await cache.getEntryCount()).toBe(1);
    });

    it('CH1-3.3: Blob 1 byte larger than quota (maxSizeBytes + 1) is rejected', async () => {
      const quota = 3000;
      const cache = factory(quota);

      await cache.setMediaBlob('too_big_by_one', new Blob([new Uint8Array(3001)]));
      expect(await cache.getMediaBlob('too_big_by_one')).toBeNull();
      expect(await cache.getCurrentSize()).toBe(0);
      expect(await cache.getEntryCount()).toBe(0);
    });
  });

  describe('4. Overwrites & Delta Size Accounting', () => {
    it('CH1-4.1: Overwrite with smaller blob updates cache size by delta and keeps entry count 1', async () => {
      const cache = factory(10000);

      await cache.setMediaBlob('delta_key', new Blob([new Uint8Array(4000)]));
      expect(await cache.getCurrentSize()).toBe(4000);
      expect(await cache.getEntryCount()).toBe(1);

      // Overwrite with 1500 bytes (reduction of 2500)
      await cache.setMediaBlob('delta_key', new Blob([new Uint8Array(1500)]));
      expect(await cache.getCurrentSize()).toBe(1500);
      expect(await cache.getEntryCount()).toBe(1);

      const retrieved = await cache.getMediaBlob('delta_key');
      expect(retrieved!.size).toBe(1500);
    });

    it('CH1-4.2: Overwrite with larger blob within budget updates cache size correctly', async () => {
      const cache = factory(10000);

      await cache.setMediaBlob('grow_key', new Blob([new Uint8Array(2000)]));
      expect(await cache.getCurrentSize()).toBe(2000);

      // Overwrite with 6000 bytes (increase of 4000)
      await cache.setMediaBlob('grow_key', new Blob([new Uint8Array(6000)]));
      expect(await cache.getCurrentSize()).toBe(6000);
      expect(await cache.getEntryCount()).toBe(1);

      const retrieved = await cache.getMediaBlob('grow_key');
      expect(retrieved!.size).toBe(6000);
    });

    it('CH1-4.3: Overwrite of oldest item with larger blob that forces eviction does not double-decrement or exceed quota', async () => {
      const quota = 5000;
      const cache = factory(quota);

      // Item A: 2000 bytes (oldest)
      await cache.setMediaBlob('A', new Blob([new Uint8Array(2000)]));
      // Item B: 2000 bytes (newer)
      await cache.setMediaBlob('B', new Blob([new Uint8Array(2000)]));

      expect(await cache.getCurrentSize()).toBe(4000);
      expect(await cache.getEntryCount()).toBe(2);

      // Now overwrite Item A (which is currently the oldest item) with 3500 bytes.
      // Net additional: 3500 - 2000 = 1500. Total would be 4000 + 1500 = 5500 > 5000.
      // A is being updated and should NOT evict itself as oldest item!
      // B (2000 bytes) should be evicted to make room for A (3500 bytes).
      // Total size must be 3500 <= 5000, and actual entries must match getCurrentSize!
      await cache.setMediaBlob('A', new Blob([new Uint8Array(3500)]));

      const finalSize = await cache.getCurrentSize();
      const finalCount = await cache.getEntryCount();

      // Quota limit check
      expect(finalSize).toBeLessThanOrEqual(quota);

      // Verify that the actual sum of entries matches getCurrentSize()
      const storeMap = (cache as any).inMemoryStore || (cache as any).db;
      if (storeMap && storeMap instanceof Map) {
        let actualSum = 0;
        for (const entry of storeMap.values()) {
          actualSum += entry.size;
        }
        expect(actualSum).toBeLessThanOrEqual(quota);
        expect(finalSize).toBe(actualSum);
      }

      // Entry A must be preserved with 3500 bytes
      const blobA = await cache.getMediaBlob('A');
      expect(blobA).not.toBeNull();
      expect(blobA!.size).toBe(3500);
    });

    it('CH1-4.4: Compounding quota drift: overwrite of LRU item leads to negative size tracking and uncontrolled memory growth', async () => {
      const quota = 5000;
      const cache = factory(quota);

      // A = 3000 (oldest), B = 1500 (newer). Total = 4500 <= 5000
      await cache.setMediaBlob('A', new Blob([new Uint8Array(3000)]));
      await cache.setMediaBlob('B', new Blob([new Uint8Array(1500)]));

      // Overwrite A with 4000.
      // If double decrement occurs, internal size drops to: (4500 - 3000) - 3000 + 4000 = 2500
      // while actual memory is B(1500) + A(4000) = 5500 > 5000.
      await cache.setMediaBlob('A', new Blob([new Uint8Array(4000)]));

      // Now add C with 2000 bytes.
      // A correctly managed cache must evict B (or refuse C) to keep total <= 5000.
      // A corrupted cache thinks 2500 + 2000 = 4500 <= 5000, so it keeps B, A, AND C!
      await cache.setMediaBlob('C', new Blob([new Uint8Array(2000)]));

      const reportedSize = await cache.getCurrentSize();
      const storeMap = (cache as any).inMemoryStore || (cache as any).db;
      let actualTotal = 0;
      if (storeMap && storeMap instanceof Map) {
        for (const entry of storeMap.values()) {
          actualTotal += entry.size;
        }
      }

      expect(actualTotal).toBeLessThanOrEqual(quota);
      expect(reportedSize).toBe(actualTotal);
    });
  });

  describe('5. Zero-Byte Blobs & Exotic / Edge-Case Keys', () => {
    it('CH1-5.1: Zero-byte blob is stored and retrieved with size 0 without crashing', async () => {
      const cache = factory(5000);
      const zeroBlob = new Blob([], { type: 'application/octet-stream' });

      await cache.setMediaBlob('zero_item', zeroBlob);

      const retrieved = await cache.getMediaBlob('zero_item');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.size).toBe(0);
      expect(await cache.getCurrentSize()).toBe(0);
      expect(await cache.getEntryCount()).toBe(1);
    });

    it('CH1-5.2: Empty string key "" is stored, retrieved, and cleared safely', async () => {
      const cache = factory(5000);
      const testBlob = new Blob([new Uint8Array(123)]);

      await cache.setMediaBlob('', testBlob);
      const retrieved = await cache.getMediaBlob('');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.size).toBe(123);

      await cache.clearCache();
      expect(await cache.getMediaBlob('')).toBeNull();
      expect(await cache.getEntryCount()).toBe(0);
    });

    it('CH1-5.3: Exotic keys (Unicode, emojis, URL parameters, quotes, slashes, whitespace)', async () => {
      const cache = factory(50000);
      const exoticKeys = [
        'https://r2.explodeit.org/topics/Vintage%20Camera%20(1950)/assembly.mp4?v=2.1&token=xyz#segment-3',
        'topic/🚀_jet_engine_🔥_v2/preview.webp',
        'key with spaces and \t tabs and \n newlines',
        'quotes: "double" and \'single\' and `backtick` and \\backslash\\',
        'CJK_日本語_한국어_中文_العربية',
        'a'.repeat(4096), // 4KB long key
      ];

      for (let i = 0; i < exoticKeys.length; i++) {
        const key = exoticKeys[i];
        const blob = new Blob([new Uint8Array(50 + i)]);
        await cache.setMediaBlob(key, blob);

        const retrieved = await cache.getMediaBlob(key);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.size).toBe(50 + i);
      }

      expect(await cache.getEntryCount()).toBe(exoticKeys.length);
    });
  });
});
