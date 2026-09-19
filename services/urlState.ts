/**
 * URL State & Deep-Linking Service
 * Handles parsing, bidirectional synchronization, canonical share URL generation,
 * catalog matching, and resilient clipboard sharing for ExplodeIt explorations.
 */

import { CommunityCatalogItem } from '../types';
import { generateTopicSlug } from './communityStorage';

/**
 * Extract an exploration identifier ('item' or 'topic') from a URL query string,
 * full URL, or path. Resilient against hashes, malformed URI encodings, and empty inputs.
 */
export function parseExplorationQueryParam(search?: string): string | null {
  try {
    let searchStr = search;
    if (searchStr === undefined && typeof window !== 'undefined' && window.location) {
      searchStr = window.location.search || window.location.hash;
    }

    if (!searchStr || typeof searchStr !== 'string') {
      return null;
    }

    // Extract query string part if a full URL or path was passed
    let queryPart = searchStr.trim();
    const questionIndex = queryPart.indexOf('?');
    if (questionIndex !== -1) {
      queryPart = queryPart.slice(questionIndex);
      const hashIndex = queryPart.indexOf('#');
      if (hashIndex !== -1) {
        queryPart = queryPart.slice(0, hashIndex);
      }
    } else {
      // If there's no '?', check if the hash itself contains query-like params (e.g. #item=123 or #/view#item=123)
      const lastHashIndex = queryPart.lastIndexOf('#');
      if (lastHashIndex !== -1) {
        const afterHash = queryPart.slice(lastHashIndex + 1);
        if (afterHash.includes('item=') || afterHash.includes('topic=')) {
          queryPart = afterHash;
        } else {
          queryPart = queryPart.slice(0, lastHashIndex);
        }
      }
    }

    // Ensure leading '?' if query parameters exist
    const normalizedSearch = queryPart.startsWith('?') ? queryPart : `?${queryPart}`;
    const params = new URLSearchParams(normalizedSearch);

    // Support both 'item' (canonical ID) and 'topic' (slug / topic name)
    // Use logical OR rather than nullish coalescing to fall back on empty/whitespace item parameter
    const itemVal = params.get('item')?.trim();
    const topicVal = params.get('topic')?.trim();
    const rawValue = itemVal || topicVal;
    if (!rawValue) {
      return null;
    }

    return rawValue.length > 0 ? rawValue : null;
  } catch (err) {
    console.warn('[UrlState] Error parsing exploration query param:', err);
    return null;
  }
}

/**
 * Construct the canonical, shareable exploration URL for an item.
 */
export function getCanonicalExplorationUrl(
  itemId: string,
  locationRef?: { origin?: string; pathname?: string }
): string {
  const cleanId = (itemId || '').trim().replace(/^[/"]+|[/"]+$/g, '');
  const loc = locationRef || (typeof window !== 'undefined' ? window.location : undefined);
  if (!loc) {
    return cleanId ? `/?item=${encodeURIComponent(cleanId)}` : '/';
  }

  try {
    const rawPathname = loc.pathname || '/';
    const pathname = rawPathname.startsWith('/') ? rawPathname : `/${rawPathname}`;
    if (!cleanId) {
      return pathname;
    }

    const rawOrigin =
      loc.origin && loc.origin !== 'null'
        ? loc.origin
        : '';
    const origin = rawOrigin.replace(/\/+$/, '');
    const query = `?item=${encodeURIComponent(cleanId)}`;
    if (origin) {
      return `${origin}${pathname}${query}`;
    }
    return `${pathname}${query}`;
  } catch {
    return cleanId ? `/?item=${encodeURIComponent(cleanId)}` : '/';
  }
}

/**
 * Match an identifier (id, topic slug, or topic title) against a catalog of items.
 * Uses hierarchical multi-strategy matching to maximize hit rate.
 */
export function findMatchingCatalogItem(
  identifier: string,
  catalog: CommunityCatalogItem[]
): CommunityCatalogItem | null {
  if (!identifier || !Array.isArray(catalog) || catalog.length === 0) {
    return null;
  }

  const rawClean = identifier.trim().replace(/^[/"]+|[/"]+$/g, '');
  if (!rawClean) return null;

  const cleanQuery = (() => {
    try {
      return decodeURIComponent(rawClean);
    } catch {
      return rawClean;
    }
  })();

  const queryLower = cleanQuery.toLowerCase();
  const querySlug = generateTopicSlug(cleanQuery);

  // Strategy 1: Exact ID match
  const exactId = catalog.find((c) => c.id === cleanQuery);
  if (exactId) return exactId;

  // Strategy 2: Case-insensitive ID match
  const caseId = catalog.find((c) => c.id.toLowerCase() === queryLower);
  if (caseId) return caseId;

  // Strategy 3: Topic slug matches query directly or query slug
  const slugMatch = catalog.find((c) => {
    const itemSlug = generateTopicSlug(c.topic);
    return itemSlug === queryLower || itemSlug === querySlug;
  });
  if (slugMatch) return slugMatch;

  // Strategy 4: ID prefix match (e.g. 'tlr-camera' matching 'tlr-camera-1726240000000')
  const prefixMatch = catalog.find((c) => {
    const cIdLower = c.id.toLowerCase();
    return cIdLower.startsWith(queryLower + '-') || cIdLower === queryLower;
  });
  if (prefixMatch) return prefixMatch;

  // Strategy 5: Query starts with ID (e.g. query contains trailing timestamp)
  const reversePrefixMatch = catalog.find((c) => {
    const cIdLower = c.id.toLowerCase();
    return queryLower.startsWith(cIdLower);
  });
  if (reversePrefixMatch) return reversePrefixMatch;

  // Strategy 6: Topic exact name match (case-insensitive)
  const topicNameMatch = catalog.find(
    (c) => c.topic.toLowerCase() === queryLower
  );
  if (topicNameMatch) return topicNameMatch;

  // Strategy 7: Item slug contains query slug, or query slug contains item slug (partial/token match)
  if (querySlug && querySlug.length >= 3) {
    const partialSlugMatch = catalog.find((c) => {
      const itemSlug = generateTopicSlug(c.topic);
      return itemSlug.includes(querySlug) || querySlug.includes(itemSlug);
    });
    if (partialSlugMatch) return partialSlugMatch;
  }

  // Strategy 8: Topic title contains query string or words (case-insensitive)
  if (queryLower && queryLower.length >= 3) {
    const partialTitleMatch = catalog.find((c) => {
      const topicLower = c.topic.toLowerCase();
      return topicLower.includes(queryLower) || queryLower.includes(topicLower);
    });
    if (partialTitleMatch) return partialTitleMatch;
  }

  return null;
}

/**
 * Synchronize the browser URL search query with the current exploration state
 * using pushState or replaceState without triggering a page reload.
 */
export function syncUrlToExploration(
  itemId: string | null,
  mode: 'push' | 'replace' = 'push'
): void {
  if (typeof window === 'undefined' || !window.history) {
    return;
  }

  try {
    const url = new URL(window.location.href);
    const currentItem = url.searchParams.get('item');
    const currentTopic = url.searchParams.get('topic');
    const cleanId = (itemId || '').trim().replace(/^[/"]+|[/"]+$/g, '');

    // Clean up query parameters inside hash fragment if present (e.g. #/view?item=old)
    if (url.hash && url.hash.includes('?')) {
      const [hashPath, hashQuery] = url.hash.split('?');
      const hashParams = new URLSearchParams(hashQuery);
      if (hashParams.has('item') || hashParams.has('topic')) {
        hashParams.delete('item');
        hashParams.delete('topic');
        const remainingHashQuery = hashParams.toString();
        url.hash = remainingHashQuery ? `${hashPath}?${remainingHashQuery}` : hashPath;
      }
    }

    if (cleanId) {
      // If already pointing to this item and topic is clean, avoid pushing duplicate history entry
      if (currentItem === cleanId && !currentTopic) {
        return;
      }
      url.searchParams.set('item', cleanId);
      url.searchParams.delete('topic');
    } else {
      // If already clean, no-op
      if (!currentItem && !currentTopic) {
        return;
      }
      url.searchParams.delete('item');
      url.searchParams.delete('topic');
    }

    const searchStr = url.searchParams.toString();
    const newRelativeUrl =
      url.pathname + (searchStr ? `?${searchStr}` : '') + url.hash;

    const statePayload = { itemId: cleanId || null };
    if (mode === 'push') {
      window.history.pushState(statePayload, '', newRelativeUrl);
    } else {
      window.history.replaceState(statePayload, '', newRelativeUrl);
    }
  } catch (err) {
    console.warn('[UrlState] Could not update window history state:', err);
  }
}

/**
 * Resilient copy to clipboard with fallback to textarea execCommand.
 * Returns true if copy succeeded, false otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // 1. Try modern navigator.clipboard API
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[UrlState] navigator.clipboard.writeText failed, attempting fallback:', err);
    }
  }

  // 2. Fallback to textarea + document.execCommand('copy')
  if (typeof document !== 'undefined' && document.body) {
    let textarea: HTMLTextAreaElement | null = null;
    try {
      textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      let successful = false;
      if (typeof document.execCommand === 'function') {
        successful = document.execCommand('copy');
      }
      return successful;
    } catch (fallbackErr) {
      console.warn('[UrlState] Fallback document.execCommand copy failed:', fallbackErr);
      return false;
    } finally {
      if (textarea && textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
    }
  }

  return false;
}
