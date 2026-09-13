/**
 * Cloudflare Pages Function: Community Contribution & Catalog API
 * Endpoint: /api/contribute
 *
 * Handles POST (multipart/form-data bundle upload), GET (catalog list & assets),
 * and OPTIONS (CORS preflight) using Cloudflare R2 bucket binding.
 *
 * All Cloudflare and R2 typings are defined self-contained to ensure clean tsc compilation
 * without requiring external @cloudflare/workers-types.
 */

// ============================================================================
// Cloudflare & R2 Environment Typings (Self-Contained for TSC Compatibility)
// ============================================================================

export interface R2HttpMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2PutOptions {
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
  md5?: ArrayBuffer | string;
  sha1?: ArrayBuffer | string;
  sha256?: ArrayBuffer | string;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HttpMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: R2PutOptions
  ): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ objects: R2Object[] }>;
}

export interface Env {
  COMMUNITY_BUCKET: R2Bucket;
  COMMUNITY_PUBLIC_URL?: string;
  R2_PUBLIC_URL?: string;
}

export interface EventContext<Env, Params extends string = string, Data = Record<string, unknown>> {
  request: Request;
  env: Env;
  params: Record<Params, string | string[]>;
  data: Data;
  waitUntil: (promise: Promise<unknown>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
}

export interface CommunityCatalogItem {
  id: string;
  topic: string;
  timestamp: string;
  domain: string;
  metaphor: string;
  infographicUrl: string;
  assembledUrl: string;
  videoUrl?: string;
  audioUrl: string;
  previewUrl: string;
}

export interface CatalogManifest {
  version: string;
  lastUpdated: string;
  topics: CommunityCatalogItem[];
}

// ============================================================================
// CORS & Security Helpers
// ============================================================================

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
  'Access-Control-Max-Age': '86400',
};

const IMMUTABLE_MEDIA_CACHE = 'public, max-age=31536000, immutable';
const CATALOG_EDGE_CACHE = 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400';

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function assertZeroLeakServer(payloadText: string): void {
  // 1. Google GenAI API key format: AIzaSy...
  if (/AIzaSy[A-Za-z0-9_-]{33}/.test(payloadText)) {
    throw new Error('Payload contains disallowed Gemini API Key pattern');
  }
  // 2. Bearer tokens: ya29...
  if (/ya29\.[A-Za-z0-9_-]+/.test(payloadText)) {
    throw new Error('Payload contains disallowed Bearer token pattern');
  }
  // 3. Prohibited object property names
  const forbidden = ['"apiKey":', '"gemini_api_key":', '"api_key":', '"secretToken":', '"auth_token":', '"userSession":'];
  for (const prop of forbidden) {
    if (payloadText.includes(prop)) {
      throw new Error(`Payload contains forbidden property: ${prop}`);
    }
  }
}

function resolveAssetUrl(env: Env, requestUrl: URL, relativePath: string): string {
  const publicBase = env.COMMUNITY_PUBLIC_URL || env.R2_PUBLIC_URL;
  if (publicBase) {
    const cleanBase = publicBase.endsWith('/') ? publicBase.slice(0, -1) : publicBase;
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    return `${cleanBase}/${cleanPath}`;
  }
  // Direct Pages Function asset proxy fallback
  return `${requestUrl.origin}/api/contribute?assetPath=${encodeURIComponent(relativePath)}`;
}

// ============================================================================
// Request Handlers
// ============================================================================

/**
 * Handle CORS Preflight
 */
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Handle GET Requests:
 * - /api/contribute -> returns catalog JSON
 * - /api/contribute?topicId=... -> returns topic manifest JSON
 * - /api/contribute?assetPath=... -> streams binary media asset directly from R2
 */
export async function onRequestGet(context: EventContext<Env>): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.COMMUNITY_BUCKET) {
    return jsonResponse({ error: 'COMMUNITY_BUCKET binding not configured' }, 503);
  }

  // 1. Asset Streaming by Path
  const assetPath = url.searchParams.get('assetPath');
  if (assetPath) {
    // Sanitize path against directory traversal
    const cleanKey = assetPath.replace(/\.\./g, '').replace(/^\/+/, '');
    const obj = await env.COMMUNITY_BUCKET.get(cleanKey);
    if (!obj) {
      return jsonResponse({ error: 'Asset not found' }, 404);
    }

    const headers = new Headers(CORS_HEADERS);
    headers.set('Cache-Control', obj.httpMetadata?.cacheControl || IMMUTABLE_MEDIA_CACHE);
    if (obj.httpMetadata?.contentType) {
      headers.set('Content-Type', obj.httpMetadata.contentType);
    }
    headers.set('ETag', obj.httpEtag);

    return new Response(obj.body, { status: 200, headers });
  }

  // 2. Specific Topic Manifest Query
  const topicId = url.searchParams.get('topicId');
  if (topicId) {
    const cleanId = topicId.replace(/[^a-zA-Z0-9_-]/g, '');
    const manifestObj = await env.COMMUNITY_BUCKET.get(`topics/${cleanId}/manifest.json`);
    if (!manifestObj) {
      return jsonResponse({ error: `Topic '${cleanId}' not found` }, 404);
    }

    const manifestJson = await manifestObj.text();
    return new Response(manifestJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': IMMUTABLE_MEDIA_CACHE,
        ...CORS_HEADERS,
      },
    });
  }

  // 3. Catalog Manifest Query (Default)
  try {
    const catalogObj = await env.COMMUNITY_BUCKET.get('catalog.json');
    if (!catalogObj) {
      const emptyCatalog: CatalogManifest = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        topics: [],
      };
      return jsonResponse(emptyCatalog, 200, { 'Cache-Control': CATALOG_EDGE_CACHE });
    }

    const catalogText = await catalogObj.text();
    return new Response(catalogText, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': CATALOG_EDGE_CACHE,
        ...CORS_HEADERS,
      },
    });
  } catch (error: any) {
    return jsonResponse({ error: `Failed to load catalog: ${error?.message}` }, 500);
  }
}

/**
 * Handle POST Requests:
 * Receives multipart/form-data with bundle metadata and binary Blobs.
 * Stores objects deterministically in R2 and updates catalog.json.
 */
export async function onRequestPost(context: EventContext<Env>): Promise<Response> {
  const { request, env } = context;
  const requestUrl = new URL(request.url);

  if (!env.COMMUNITY_BUCKET) {
    return jsonResponse({ success: false, error: 'COMMUNITY_BUCKET binding not configured' }, 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error: any) {
    return jsonResponse({ success: false, error: 'Invalid multipart/form-data payload' }, 400);
  }

  // 1. Extract and Parse Manifest JSON
  const manifestRaw = (formData.get('manifest') || formData.get('bundle')) as string | null;
  if (!manifestRaw || typeof manifestRaw !== 'string') {
    return jsonResponse({ success: false, error: 'Missing required manifest JSON in form data' }, 400);
  }

  // 2. Server-side Zero-Leak Sanitization Gate
  try {
    assertZeroLeakServer(manifestRaw);
  } catch (leakError: any) {
    return jsonResponse({ success: false, error: `Sanitization rejected: ${leakError?.message}` }, 400);
  }

  let parsedBundle: any;
  try {
    parsedBundle = JSON.parse(manifestRaw);
  } catch {
    return jsonResponse({ success: false, error: 'Malformed JSON in manifest field' }, 400);
  }

  // Support both full bundle structure and raw manifest structure
  const manifestMeta = parsedBundle.manifest || parsedBundle;
  const plan = parsedBundle.plan || {};

  const topicTitle = manifestMeta.topic || plan.displayTitle || 'Untitled Topic';
  const rawId = manifestMeta.id || `${topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  const topicId = rawId.replace(/[^a-zA-Z0-9_-]/g, '-');

  // 3. Extract Media Files from FormData
  const infographicFile = formData.get('infographic') as File | null;
  const assembledFile = formData.get('assembled') as File | null;
  const videoFile = formData.get('video') as File | null;
  const audioFile = formData.get('audio') as File | null;

  if (!infographicFile || !assembledFile) {
    return jsonResponse({ success: false, error: 'Missing required infographic or assembled visual media' }, 400);
  }

  const basePath = `topics/${topicId}`;

  try {
    // 4. Store Bundle Metadata Manifest in R2
    await env.COMMUNITY_BUCKET.put(
      `${basePath}/manifest.json`,
      JSON.stringify(parsedBundle, null, 2),
      {
        httpMetadata: {
          contentType: 'application/json; charset=utf-8',
          cacheControl: IMMUTABLE_MEDIA_CACHE,
        },
      }
    );

    // 5. Store Media Files in R2
    const uploadTasks: Promise<any>[] = [
      env.COMMUNITY_BUCKET.put(`${basePath}/infographic.png`, infographicFile.stream(), {
        httpMetadata: { contentType: 'image/png', cacheControl: IMMUTABLE_MEDIA_CACHE },
      }),
      env.COMMUNITY_BUCKET.put(`${basePath}/assembled.png`, assembledFile.stream(), {
        httpMetadata: { contentType: 'image/png', cacheControl: IMMUTABLE_MEDIA_CACHE },
      }),
    ];

    if (videoFile) {
      uploadTasks.push(
        env.COMMUNITY_BUCKET.put(`${basePath}/video.mp4`, videoFile.stream(), {
          httpMetadata: { contentType: 'video/mp4', cacheControl: IMMUTABLE_MEDIA_CACHE },
        })
      );
    }

    if (audioFile) {
      uploadTasks.push(
        env.COMMUNITY_BUCKET.put(`${basePath}/audio.wav`, audioFile.stream(), {
          httpMetadata: { contentType: 'audio/wav', cacheControl: IMMUTABLE_MEDIA_CACHE },
        })
      );
    }

    await Promise.all(uploadTasks);

    // 6. Build CommunityCatalogItem
    const infographicUrl = resolveAssetUrl(env, requestUrl, `${basePath}/infographic.png`);
    const assembledUrl = resolveAssetUrl(env, requestUrl, `${basePath}/assembled.png`);
    const videoUrl = videoFile ? resolveAssetUrl(env, requestUrl, `${basePath}/video.mp4`) : undefined;
    const audioUrl = audioFile ? resolveAssetUrl(env, requestUrl, `${basePath}/audio.wav`) : resolveAssetUrl(env, requestUrl, `${basePath}/infographic.png`);

    const newCatalogItem: CommunityCatalogItem = {
      id: topicId,
      topic: topicTitle,
      timestamp: manifestMeta.timestamp || new Date().toISOString(),
      domain: manifestMeta.domain || plan.domainType || 'PHYSICAL',
      metaphor: manifestMeta.metaphor || plan.visualMetaphor || 'Exploded View',
      infographicUrl,
      assembledUrl,
      videoUrl,
      audioUrl,
      previewUrl: infographicUrl,
    };

    // 7. Atomic Catalog Update in R2
    let catalog: CatalogManifest = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      topics: [],
    };

    const existingCatalogObj = await env.COMMUNITY_BUCKET.get('catalog.json');
    if (existingCatalogObj) {
      try {
        const parsed = await existingCatalogObj.json<any>();
        if (Array.isArray(parsed)) {
          catalog.topics = parsed;
        } else if (parsed && Array.isArray(parsed.topics)) {
          catalog = parsed;
        }
      } catch {
        // Fallback to fresh catalog if parsing corrupt file
      }
    }

    // Deduplicate by ID and prepend newest contribution to the front
    catalog.topics = [newCatalogItem, ...catalog.topics.filter((t) => t.id !== topicId)];
    catalog.lastUpdated = new Date().toISOString();

    await env.COMMUNITY_BUCKET.put('catalog.json', JSON.stringify(catalog, null, 2), {
      httpMetadata: {
        contentType: 'application/json; charset=utf-8',
        cacheControl: CATALOG_EDGE_CACHE,
      },
    });

    return jsonResponse(
      {
        success: true,
        topicId,
        catalogItem: newCatalogItem,
        url: infographicUrl,
      },
      201
    );
  } catch (storageError: any) {
    return jsonResponse({ success: false, error: `R2 write failed: ${storageError?.message}` }, 500);
  }
}
