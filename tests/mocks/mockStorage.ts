/**
 * Mock Storage & In-Memory Media Cache for Deterministic E2E & Contract Testing
 */

export class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

export interface CacheEntry {
  key: string;
  blob: Blob;
  size: number;
  lastAccessed: number;
}

export class MockIndexedDBMediaCache {
  private db: Map<string, CacheEntry> = new Map();
  private objectUrls: Map<string, string> = new Map();
  private maxSizeBytes: number;
  private currentSizeBytes: number = 0;
  private urlCounter = 0;
  private accessSequence = 0;

  constructor(maxSizeBytes: number = 50 * 1024 * 1024) { // Default 50MB
    this.maxSizeBytes = maxSizeBytes;
  }

  async getMediaBlob(urlOrKey: string): Promise<Blob | null> {
    const entry = this.db.get(urlOrKey);
    if (!entry) return null;
    entry.lastAccessed = ++this.accessSequence;
    return entry.blob;
  }

  async setMediaBlob(urlOrKey: string, blob: Blob): Promise<void> {
    const size = typeof blob?.size === 'number' ? blob.size : 1024;
    // Edge case: single blob exceeds total cache quota
    if (size > this.maxSizeBytes) {
      return;
    }
    // If updating existing entry, adjust current size
    const existing = this.db.get(urlOrKey);
    if (existing) {
      this.currentSizeBytes -= existing.size;
    }
    // Evict if over quota
    while (this.currentSizeBytes + size > this.maxSizeBytes && this.db.size > 0) {
      this.evictLRU();
    }
    this.db.set(urlOrKey, {
      key: urlOrKey,
      blob,
      size,
      lastAccessed: ++this.accessSequence
    });
    this.currentSizeBytes += size;
  }

  getCachedObjectURL(urlOrKey: string, blob: Blob): string {
    if (this.objectUrls.has(urlOrKey)) {
      return this.objectUrls.get(urlOrKey)!;
    }
    const mockUrl = typeof URL !== 'undefined' && URL.createObjectURL
      ? URL.createObjectURL(blob)
      : 'blob:http://localhost:3000/' + (++this.urlCounter);
    this.objectUrls.set(urlOrKey, mockUrl);
    return mockUrl;
  }

  async clearCache(): Promise<void> {
    this.revokeAllObjectURLs();
    this.db.clear();
    this.currentSizeBytes = 0;
  }

  revokeAllObjectURLs(): void {
    for (const url of this.objectUrls.values()) {
      if (typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    }
    this.objectUrls.clear();
  }

  getEntryCount(): number {
    return this.db.size;
  }

  getCurrentSize(): number {
    return this.currentSizeBytes;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.db.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      const entry = this.db.get(oldestKey);
      if (entry) {
        this.currentSizeBytes -= entry.size;
      }
      const existingUrl = this.objectUrls.get(oldestKey);
      if (existingUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(existingUrl);
      }
      this.db.delete(oldestKey);
      this.objectUrls.delete(oldestKey);
    }
  }
}

export function setupMockBrowserEnvironment() {
  const localStorage = new MockStorage();
  const sessionStorage = new MockStorage();
  
  if (typeof globalThis.localStorage === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorage,
      writable: true,
      configurable: true
    });
  }
  if (typeof globalThis.sessionStorage === 'undefined') {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: sessionStorage,
      writable: true,
      configurable: true
    });
  }

  return { localStorage, sessionStorage };
}
