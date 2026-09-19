---
type: "Sentry / Storage & Network Optimization"
title: "Multi-Tier Media Cache & Egress Elimination Architecture"
description: "IndexedDB binary Blob caching with LRU eviction, in-memory ObjectURL pooling, and Cloudflare edge caching."
resource: "file:///services/mediaCache.ts"
tags: ["caching", "indexeddb", "lru-eviction", "blob-urls", "egress-elimination", "performance"]
---

# Multi-Tier Media Cache & Egress Elimination Architecture

## Overview
High-definition exploded infographics, studio shots, Veo assembly animations, and synthesized WAV audio guides consume considerable network bandwidth (5–15 MB per deconstruction). To minimize egress fees, eliminate redundant downloads on repeat visits, and allow instant offline retrieval, ExplodeIt implements a **3-Tier Media Caching Architecture**.

## The 3-Tier Caching Topology

```text
┌─────────────────────────────────────────────────────────────┐
│ Tier 1: Cloudflare Edge & Browser HTTP Cache                │
│ • Cache-Control: public, max-age=31536000, immutable        │
│ • Eliminates origin network hits for static assets          │
└──────────────────────────────┬──────────────────────────────┘
                               │ Cache Miss
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 2: Client-Side IndexedDB Blob Cache                    │
│ • Database: explodeit_media_cache_v1                        │
│ • Object Store: media_blobs (key: media_url)                │
│ • LRU Eviction: Max 100 MB / 50 items                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Cache Hit
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Tier 3: In-Memory ObjectURL Pool                            │
│ • Map<string, string> (blob_key -> objectUrl)               │
│ • Prevents redundant URL.createObjectURL allocations        │
│ • Automatically revokes dangling URLs upon eviction/unmount │
└─────────────────────────────────────────────────────────────┘
```

## Core Components & Mechanics

### 1. IndexedDB Persistent Store (`services/mediaCache.ts`)
- **Database Name**: `explodeit_media_cache_v1`
- **Object Store**: `media_blobs`
- **Stored Schema**:
  ```typescript
  export interface MediaCacheEntry {
    url: string;
    blob: Blob;
    contentType: string;
    byteSize: number;
    lastAccessed: number;
    createdAt: number;
  }
  ```

### 2. Least-Recently-Used (LRU) Eviction Engine
When inserting new media items:
1. Calculates cumulative store size (`SUM(byteSize)`).
2. If total size exceeds quota (`MAX_CACHE_BYTES = 100 * 1024 * 1024` or 100 MB):
   - Sorts cache entries by `lastAccessed` ascending.
   - Deletes the oldest entries until storage falls safely below the high watermark (e.g. 80% quota).
3. If entry key already exists, updates in place while maintaining an accurate byte counter to prevent double-decrement drift.

### 3. In-Memory ObjectURL Pooling
- Browser native `URL.createObjectURL(blob)` allocates internal native memory references. If called repeatedly for the same cached blob, browser memory climbs rapidly.
- The `MediaCacheService` maintains a singleton `urlPool = new Map<string, string>()`:
  - On first access: Creates and stores the `blob:` URL.
  - On subsequent renders: Returns the existing active `blob:` URL.
  - On item eviction or explicit clear: Invokes `URL.revokeObjectURL(url)` and deletes the map entry.

### 4. Integration with Display Area
When `DisplayArea.tsx` renders a showcase deconstruction or a previous generation:
1. Media URLs are checked against `mediaCache.getMediaUrl(sourceUrl)`.
2. If present in IndexedDB or memory pool, media loads instantaneously with zero network latency.
3. On component unmount, active audio elements are paused and detached cleanly to prevent playback leaks.
