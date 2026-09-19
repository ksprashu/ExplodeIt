---
type: "Architecture / Cloud Storage & Security"
title: "Community Contribution Storage & R2 Sanitization Architecture"
description: "Client-side bundle packaging, strict allowlist sanitization, Cloudflare R2 binary storage, and Pages Functions API."
resource: "file:///services/communityStorage.ts"
tags: ["community", "cloudflare-r2", "sanitization", "pages-function", "allowlist", "byok-privacy"]
---

# Community Contribution Storage & R2 Sanitization Architecture

## Overview
ExplodeIt enables users to anonymously contribute successfully generated "exploded views" to a public showcase. Because ExplodeIt operates under a Bring-Your-Own-Key (BYOK) paradigm where client-side memory holds private API keys and sensitive session data, the contribution pipeline enforces a strict **Zero-Leak Allowlist Sanitization Protocol**.

## Architecture & Data Flow

```text
┌───────────────────────────┐
│     Generation State      │
│  (App.tsx / GenerationItem) │
└─────────────┬─────────────┘
              │ Opt-in trigger (CommunityContributeModal.tsx)
              ▼
┌───────────────────────────┐
│  Bundle Packaging Engine  │
│ (bundleGenerationItem())  │
│ • Converts base64 to Blob │
│ • Validates payload types │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│  Allowlist Sanitizer      │
│   (assertZeroLeak())      │
│ • Rejects any API keys    │
│ • Rejects auth tokens     │
│ • Strips machine paths    │
└─────────────┬─────────────┘
              │
              ▼ Multi-part FormData (JSON Manifest + Binary Media Blobs)
┌────────────────────────────────────────────────────────┐
│ Cloudflare Pages Function (/api/contribute.ts)          │
│ • Validates schema, rate limits & origin               │
│ • Writes binary assets to Cloudflare R2 bucket         │
│ • Updates atomic index in catalog.json                 │
└────────────────────────────────────────────────────────┘
```

## Core Contracts & Interfaces

### 1. Sanitized Generation Bundle (`SanitizedGenerationBundle`)
The data contract defined in `types.ts` separates metadata from binary media payloads:

```typescript
export interface SanitizedGenerationBundle {
  manifest: {
    id: string;
    topic: string;
    timestamp: string;
    domain: string;
    metaphor: string;
    modelTier: ModelTier;
    modelsUsed: Partial<StageModelConfig>;
  };
  plan: ObjectPlan;
  components: ComponentPart[];
  narrationScript: string;
  media: {
    infographicBlob: Blob;
    assembledBlob: Blob;
    videoBlob?: Blob;
    audioBlob: Blob;
  };
}
```

### 2. Zero-Leak Allowlist Sanitization
Before any network payload is constructed:
- `assertZeroLeak(bundle)` recursively serializes the candidate payload to string.
- Scans against known API key patterns (`AIza[0-9A-Za-z-_]{35}`), generic authorization tokens (`Bearer [A-Za-z0-9-_.]+`), and personal environment tokens.
- Ensures only explicitly enumerated schema fields (`topic`, `plan`, `components`, `narrationScript`) are transmitted.
- Media URLs are converted strictly to raw binary `Blob` instances with explicit MIME types (`image/png`, `video/mp4`, `audio/wav`).

### 3. Cloudflare Pages Function (`/api/contribute.ts`)
- **Runtime**: Cloudflare Pages / Workers runtime with direct R2 bucket binding (`env.EXPLODEIT_BUCKET`).
- **Endpoint**: `POST /api/contribute`
- **Validation**:
  - Request method and content-type enforcement (`multipart/form-data`).
  - Size constraints: Max 25 MB per total bundle payload.
  - Manifest structural validation (schema conforms to `SanitizedGenerationBundle.manifest`).
- **Storage Layout in Cloudflare R2**:
  - `showcase/{id}/manifest.json` (JSON plan and component metadata)
  - `showcase/{id}/infographic.png` (Static PNG)
  - `showcase/{id}/assembled.png` (Static PNG)
  - `showcase/{id}/video.mp4` (Optional MP4 video)
  - `showcase/{id}/audio.wav` (Audio tour guide WAV)
  - `catalog.json` (Atomic aggregate catalog index with cache revalidation)

### 4. Local Development & Offline Mock Driver (`mockCommunityStorage.ts`)
For offline execution, local development without Cloudflare credentials, and continuous integration:
- `mockCommunityStorage.ts` provides an in-memory/IndexedDB-backed mock implementation of the R2 service.
- Serves seeded default showcase topics ("Vintage Mechanical Watch", "V8 Combustion Engine", "James Webb Space Telescope") to enable full offline UI testing.
