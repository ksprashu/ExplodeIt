/**
 * Multi-Tier Media Cache & In-Memory Fallback Service (FEAT-09)
 * 
 * Provides high-performance binary Blob caching using browser IndexedDB with
 * deterministic monotonic sequence LRU eviction under quota pressure,
 * in-memory ObjectURL pool reuse with automatic revocation, serialized write queue,
 * and seamless in-memory fallback for environments without IndexedDB (e.g. Node/JSDOM).
 */

export interface MediaCacheService {
  getMediaBlob(urlOrKey: string): Promise<Blob | null>;
  setMediaBlob(urlOrKey: string, blob: Blob): Promise<void>;
  getCachedObjectURL(urlOrKey: string, blob: Blob): string;
  revokeObjectURL?(urlOrKey: string): void;
  revokeAllObjectURLs?(): void;
  clearCache(): Promise<void>;
  getEntryCount?(): Promise<number> | number;
  getCurrentSize?(): Promise<number> | number;
}

export interface MediaCacheEntry {
  key: string;
  blob: Blob;
  size: number;
  lastAccessed: number;
}

export interface MediaCacheOptions {
  maxSizeBytes?: number;
  dbName?: string;
  storeName?: string;
}

export const DB_NAME = 'explodeit_media_cache_v1';
export const DB_VERSION = 1;
export const STORE_NAME = 'media_blobs';
export const INDEX_LAST_ACCESSED = 'lastAccessed';
export const DEFAULT_CACHE_QUOTA_BYTES = 50 * 1024 * 1024; // 50MB default

export class IndexedDBMediaCache implements MediaCacheService {
  private maxSizeBytes: number;
  private currentSizeBytes: number = 0;
  private objectUrlPool: Map<string, string> = new Map();
  private inMemoryStore: Map<string, MediaCacheEntry> = new Map();
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private lastSequence: number = 0;
  private urlCounter: number = 0;
  private isIndexedDBAvailable: boolean;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: number | MediaCacheOptions = DEFAULT_CACHE_QUOTA_BYTES) {
    if (typeof options === 'number') {
      this.maxSizeBytes = options;
    } else {
      this.maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_CACHE_QUOTA_BYTES;
    }
    this.isIndexedDBAvailable = typeof indexedDB !== 'undefined' && indexedDB !== null;
    if (this.isIndexedDBAvailable) {
      this.dbPromise = this.initIndexedDB();
    }
  }

  private getNextSequence(): number {
    const now = Date.now();
    if (now > this.lastSequence) {
      this.lastSequence = now;
      return now;
    }
    return ++this.lastSequence;
  }

  private async initIndexedDB(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDBAvailable) return null;
    try {
      return await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            store.createIndex(INDEX_LAST_ACCESSED, 'lastAccessed', { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch {
      this.isIndexedDBAvailable = false;
      return null;
    }
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isIndexedDBAvailable) return null;
    if (!this.dbPromise) {
      this.dbPromise = this.initIndexedDB();
    }
    try {
      return await this.dbPromise;
    } catch {
      this.isIndexedDBAvailable = false;
      return null;
    }
  }

  async getMediaBlob(urlOrKey: string): Promise<Blob | null> {
    const db = await this.getDB();
    if (db) {
      try {
        return await new Promise<Blob | null>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(urlOrKey);
          req.onsuccess = () => {
            const entry = req.result as MediaCacheEntry | undefined;
            if (!entry) {
              resolve(null);
              return;
            }
            entry.lastAccessed = this.getNextSequence();
            store.put(entry);
            resolve(entry.blob);
          };
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to in-memory store on transaction failure
      }
    }

    const entry = this.inMemoryStore.get(urlOrKey);
    if (!entry) return null;
    entry.lastAccessed = this.getNextSequence();
    return entry.blob;
  }

  async setMediaBlob(urlOrKey: string, blob: Blob): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .then(() => this.performSetMediaBlob(urlOrKey, blob))
        .then(resolve, reject);
    });
  }

  private async performSetMediaBlob(urlOrKey: string, blob: Blob): Promise<void> {
    const size = typeof blob?.size === 'number' ? blob.size : 1024;
    // Edge case: single blob exceeds total cache quota
    if (size > this.maxSizeBytes) {
      return;
    }

    const db = await this.getDB();
    if (db) {
      try {
        await this.evictUntilFitsIDB(db, size, urlOrKey);
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const entry: MediaCacheEntry = {
            key: urlOrKey,
            blob,
            size,
            lastAccessed: this.getNextSequence(),
          };
          const putReq = store.put(entry);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        });
        return;
      } catch {
        // Fall back to in-memory store
      }
    }

    // In-memory fallback
    const existing = this.inMemoryStore.get(urlOrKey);
    if (existing) {
      this.currentSizeBytes -= existing.size;
      this.revokePooledUrl(urlOrKey);
      this.inMemoryStore.delete(urlOrKey); // Ensure entry cannot be evicted as LRU victim
    }

    while (this.currentSizeBytes + size > this.maxSizeBytes && this.inMemoryStore.size > 0) {
      this.evictOldestInMemory();
    }

    this.inMemoryStore.set(urlOrKey, {
      key: urlOrKey,
      blob,
      size,
      lastAccessed: this.getNextSequence(),
    });
    this.currentSizeBytes += size;
  }

  getCachedObjectURL(urlOrKey: string, blob: Blob): string {
    const pooledUrl = this.objectUrlPool.get(urlOrKey);
    if (pooledUrl) {
      return pooledUrl;
    }

    const createdUrl = typeof URL !== 'undefined' && URL.createObjectURL
      ? URL.createObjectURL(blob)
      : `blob:http://localhost:3000/${++this.urlCounter}`;

    this.objectUrlPool.set(urlOrKey, createdUrl);
    return createdUrl;
  }

  revokeObjectURL(urlOrKey: string): void {
    let targetKey: string | null = null;
    if (this.objectUrlPool.has(urlOrKey)) {
      targetKey = urlOrKey;
    } else {
      for (const [key, pooledUrl] of this.objectUrlPool.entries()) {
        if (pooledUrl === urlOrKey) {
          targetKey = key;
          break;
        }
      }
    }

    if (targetKey) {
      this.revokePooledUrl(targetKey);
    } else if (typeof urlOrKey === 'string' && urlOrKey.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(urlOrKey);
    }
  }

  revokeAllObjectURLs(): void {
    for (const url of this.objectUrlPool.values()) {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    }
    this.objectUrlPool.clear();
  }

  async clearCache(): Promise<void> {
    this.revokeAllObjectURLs();

    const db = await this.getDB();
    if (db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Ignore DB clear failure in fallback
      }
    }

    this.inMemoryStore.clear();
    this.currentSizeBytes = 0;
  }

  async getEntryCount(): Promise<number> {
    const db = await this.getDB();
    if (db) {
      try {
        return await new Promise<number>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.count();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back to memory store count
      }
    }
    return this.inMemoryStore.size;
  }

  async getCurrentSize(): Promise<number> {
    const db = await this.getDB();
    if (db) {
      try {
        return await new Promise<number>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.openCursor();
          let total = 0;
          req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
              const entry = cursor.value as MediaCacheEntry;
              total += entry.size || 0;
              cursor.continue();
            } else {
              resolve(total);
            }
          };
          req.onerror = () => reject(req.error);
        });
      } catch {
        // Fall back
      }
    }
    return this.currentSizeBytes;
  }

  private evictOldestInMemory(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.inMemoryStore.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.inMemoryStore.get(oldestKey);
      if (entry) {
        this.currentSizeBytes -= entry.size;
      }
      this.inMemoryStore.delete(oldestKey);
      this.revokePooledUrl(oldestKey);
    }
  }

  private async evictUntilFitsIDB(db: IDBDatabase, incomingSize: number, newKey: string): Promise<void> {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(newKey);
      req.onsuccess = () => {
        if (req.result) {
          this.revokePooledUrl(newKey);
          store.delete(newKey);
        }
        resolve();
      };
      req.onerror = () => resolve();
    });

    let currentTotal = await this.getCurrentSize();
    while (currentTotal + incomingSize > this.maxSizeBytes) {
      const evicted = await this.evictSingleOldestIDB(db);
      if (!evicted) break;
      currentTotal -= evicted.size;
    }
  }

  private async evictSingleOldestIDB(db: IDBDatabase): Promise<MediaCacheEntry | null> {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index(INDEX_LAST_ACCESSED);
      const req = index.openCursor(null, 'next'); // Ascending order (oldest first)

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const entry = cursor.value as MediaCacheEntry;
          store.delete(entry.key);
          this.revokePooledUrl(entry.key);
          resolve(entry);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  }

  private revokePooledUrl(key: string): void {
    const pooledUrl = this.objectUrlPool.get(key);
    if (pooledUrl) {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(pooledUrl);
      }
      this.objectUrlPool.delete(key);
    }
  }
}

export function createMediaCache(options?: number | MediaCacheOptions): IndexedDBMediaCache {
  return new IndexedDBMediaCache(options);
}

export const mediaCache = createMediaCache();

export function revokeAllObjectURLs(): void {
  mediaCache.revokeAllObjectURLs();
}

export function revokeObjectURL(urlOrKey: string): void {
  mediaCache.revokeObjectURL(urlOrKey);
}

export default mediaCache;