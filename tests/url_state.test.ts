import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseExplorationQueryParam,
  getCanonicalExplorationUrl,
  findMatchingCatalogItem,
  syncUrlToExploration,
  copyToClipboard,
} from '../services/urlState';
import { CommunityCatalogItem } from '../types';

const testCatalog: CommunityCatalogItem[] = [
  {
    id: 'tlr-camera-1726240000000',
    topic: 'Twin-Lens Reflex (TLR) Camera',
    timestamp: '2026-09-13T16:00:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
    infographicUrl: 'https://community.explodeit.org/tlr-camera/info.png',
    assembledUrl: 'https://community.explodeit.org/tlr-camera/assem.png',
    videoUrl: 'https://community.explodeit.org/tlr-camera/video.mp4',
    audioUrl: 'https://community.explodeit.org/tlr-camera/audio.mp3',
    previewUrl: 'https://community.explodeit.org/tlr-camera/preview.jpg',
  },
  {
    id: 'turbofan-engine-1726240100000',
    topic: 'High-Bypass Turbofan Jet Engine',
    timestamp: '2026-09-13T16:05:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
    infographicUrl: 'https://community.explodeit.org/turbofan/info.png',
    assembledUrl: 'https://community.explodeit.org/turbofan/assem.png',
    audioUrl: 'https://community.explodeit.org/turbofan/audio.mp3',
    previewUrl: 'https://community.explodeit.org/turbofan/preview.jpg',
  },
  {
    id: 'neural-transformer-1726240200000',
    topic: 'Transformer Attention Architecture',
    timestamp: '2026-09-13T16:10:00.000Z',
    domain: 'SOFTWARE',
    metaphor: 'Data Flow Visualization',
    infographicUrl: 'https://community.explodeit.org/transformer/info.png',
    assembledUrl: 'https://community.explodeit.org/transformer/assem.png',
    audioUrl: 'https://community.explodeit.org/transformer/audio.mp3',
    previewUrl: 'https://community.explodeit.org/transformer/preview.jpg',
  },
];

describe('URL State Utilities: parseExplorationQueryParam', () => {
  it('returns null for empty, missing, or whitespace-only search queries', () => {
    expect(parseExplorationQueryParam('')).toBeNull();
    expect(parseExplorationQueryParam('?')).toBeNull();
    expect(parseExplorationQueryParam('?item=')).toBeNull();
    expect(parseExplorationQueryParam('?item=   ')).toBeNull();
    expect(parseExplorationQueryParam('?topic=   ')).toBeNull();
    expect(parseExplorationQueryParam('?other=123')).toBeNull();
  });

  it('correctly extracts ?item=<id> identifier', () => {
    expect(parseExplorationQueryParam('?item=tlr-camera-1726240000000')).toBe('tlr-camera-1726240000000');
    expect(parseExplorationQueryParam('item=turbofan-engine')).toBe('turbofan-engine');
  });

  it('correctly extracts ?topic=<slug> identifier', () => {
    expect(parseExplorationQueryParam('?topic=twin-lens-reflex')).toBe('twin-lens-reflex');
    expect(parseExplorationQueryParam('topic=turbofan-engine-jet')).toBe('turbofan-engine-jet');
  });

  it('prefers ?item over ?topic if both are present in query', () => {
    expect(parseExplorationQueryParam('?item=canonical-id&topic=alt-slug')).toBe('canonical-id');
  });

  it('falls back to ?topic if ?item is present but empty or whitespace', () => {
    expect(parseExplorationQueryParam('?item=&topic=turbofan-engine')).toBe('turbofan-engine');
    expect(parseExplorationQueryParam('?item=   &topic=turbofan-engine')).toBe('turbofan-engine');
  });

  it('correctly extracts identifier from hash without question mark (e.g. /#item=<id> or #item=<id>)', () => {
    expect(parseExplorationQueryParam('/#item=tlr-camera-1726240000000')).toBe('tlr-camera-1726240000000');
    expect(parseExplorationQueryParam('#item=tlr-camera-1726240000000')).toBe('tlr-camera-1726240000000');
    expect(parseExplorationQueryParam('#topic=turbofan-engine')).toBe('turbofan-engine');
  });

  it('handles URI encoded values and special characters', () => {
    expect(parseExplorationQueryParam('?item=vintage%20camera%201970')).toBe('vintage camera 1970');
    expect(parseExplorationQueryParam('?topic=jet%2Bengine')).toBe('jet+engine');
  });

  it('survives malformed URI parameters without throwing', () => {
    // Malformed percent encoding
    expect(() => parseExplorationQueryParam('?item=%E0%A4%A')).not.toThrow();
  });

  it('correctly extracts item from full URLs and handles hash fragments', () => {
    expect(
      parseExplorationQueryParam('https://explodeit.pages.dev/?item=tlr-camera-1726240000000')
    ).toBe('tlr-camera-1726240000000');
    expect(
      parseExplorationQueryParam('https://explodeit.pages.dev/?item=tlr-camera#anatomy')
    ).toBe('tlr-camera');
    expect(
      parseExplorationQueryParam('/ExplodeIt/?topic=turbofan-engine#hero')
    ).toBe('turbofan-engine');
    // Hash routing / hash query parsing
    expect(
      parseExplorationQueryParam('https://explodeit.pages.dev/#/view?item=tlr-camera-1726240000000')
    ).toBe('tlr-camera-1726240000000');
    expect(
      parseExplorationQueryParam('https://explodeit.pages.dev/#?topic=turbofan-engine')
    ).toBe('turbofan-engine');
    expect(
      parseExplorationQueryParam('#/explore?item=camera-999#sub')
    ).toBe('camera-999');
  });

  it('falls back to window.location.hash when window.location.search is empty', () => {
    window.history.pushState({}, '', '/#/view?item=hash-fallback-item');
    expect(parseExplorationQueryParam()).toBe('hash-fallback-item');
  });
});

describe('URL State Utilities: getCanonicalExplorationUrl', () => {
  it('generates canonical URL containing origin, pathname, and item param', () => {
    const canonical = getCanonicalExplorationUrl('tlr-camera-1726240000000');
    expect(canonical).toContain('?item=tlr-camera-1726240000000');
    expect(canonical).toMatch(/^https?:\/\//);
  });

  it('properly URI encodes the itemId in canonical URL', () => {
    const canonical = getCanonicalExplorationUrl('custom item #1');
    expect(canonical).toContain('?item=custom%20item%20%231');
  });

  it('handles origin="null" gracefully without creating malformed "null/..." URLs', () => {
    const canonical = getCanonicalExplorationUrl('item-null-origin', { origin: 'null', pathname: '/' });
    expect(canonical).not.toContain('null/');
    expect(canonical).toBe('/?item=item-null-origin');
  });

  it('normalizes origin with trailing slash without creating double slashes in pathname', () => {
    const canonical = getCanonicalExplorationUrl('tlr-camera', { origin: 'https://explodeit.pages.dev/', pathname: '/app/' });
    expect(canonical).toBe('https://explodeit.pages.dev/app/?item=tlr-camera');
    expect(canonical).not.toContain('.dev//');
  });

  it('returns clean pathname when itemId is empty or whitespace', () => {
    expect(getCanonicalExplorationUrl('')).toBe('/');
    expect(getCanonicalExplorationUrl('   ')).toBe('/');
    expect(getCanonicalExplorationUrl('', { origin: 'http://localhost:3000', pathname: '/app/' })).toBe('/app/');
  });

  it('strips surrounding quotes and slashes from itemId when constructing canonical URL', () => {
    expect(getCanonicalExplorationUrl('"tlr-camera"', { origin: 'https://explodeit.pages.dev', pathname: '/' })).toBe('https://explodeit.pages.dev/?item=tlr-camera');
    expect(getCanonicalExplorationUrl('/turbofan-engine/', { origin: 'https://explodeit.pages.dev', pathname: '/' })).toBe('https://explodeit.pages.dev/?item=turbofan-engine');
  });
});

describe('URL State Utilities: findMatchingCatalogItem', () => {
  it('returns null for empty identifier or empty catalog', () => {
    expect(findMatchingCatalogItem('', testCatalog)).toBeNull();
    expect(findMatchingCatalogItem('tlr-camera', [])).toBeNull();
  });

  it('matches exactly by item id', () => {
    const match = findMatchingCatalogItem('tlr-camera-1726240000000', testCatalog);
    expect(match).not.toBeNull();
    expect(match?.id).toBe('tlr-camera-1726240000000');
  });

  it('matches case-insensitively by item id', () => {
    const match = findMatchingCatalogItem('TLR-CAMERA-1726240000000', testCatalog);
    expect(match).not.toBeNull();
    expect(match?.id).toBe('tlr-camera-1726240000000');
  });

  it('matches by topic slug', () => {
    const match = findMatchingCatalogItem('high-bypass-turbofan-jet-engine', testCatalog);
    expect(match).not.toBeNull();
    expect(match?.id).toBe('turbofan-engine-1726240100000');
  });

  it('matches by ID prefix (e.g. slug without timestamp)', () => {
    const match = findMatchingCatalogItem('turbofan-engine', testCatalog);
    expect(match).not.toBeNull();
    expect(match?.id).toBe('turbofan-engine-1726240100000');
  });

  it('matches by exact topic title', () => {
    const match = findMatchingCatalogItem('Transformer Attention Architecture', testCatalog);
    expect(match).not.toBeNull();
    expect(match?.id).toBe('neural-transformer-1726240200000');
  });

  it('matches by partial slug token or topic title keyword (fuzzy resiliency)', () => {
    expect(findMatchingCatalogItem('transformer', testCatalog)?.id).toBe('neural-transformer-1726240200000');
    expect(findMatchingCatalogItem('jet-engine', testCatalog)?.id).toBe('turbofan-engine-1726240100000');
    expect(findMatchingCatalogItem('twin-lens', testCatalog)?.id).toBe('tlr-camera-1726240000000');
  });

  it('matches identifiers with leading/trailing slashes or quotes', () => {
    expect(findMatchingCatalogItem('/turbofan-engine/', testCatalog)?.id).toBe(
      'turbofan-engine-1726240100000'
    );
    expect(findMatchingCatalogItem('"tlr-camera"', testCatalog)?.id).toBe(
      'tlr-camera-1726240000000'
    );
  });

  it('returns null for non-matching identifier', () => {
    const match = findMatchingCatalogItem('quantum-computer-superconductor-999', testCatalog);
    expect(match).toBeNull();
  });
});

describe('URL State Utilities: syncUrlToExploration', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('updates window.location.search to ?item=<id> on push mode', () => {
    syncUrlToExploration('camera-123', 'push');
    expect(window.location.search).toBe('?item=camera-123');
  });

  it('updates window.location.search to ?item=<id> on replace mode', () => {
    syncUrlToExploration('engine-456', 'replace');
    expect(window.location.search).toBe('?item=engine-456');
  });

  it('strips ?topic if it was previously in search string', () => {
    window.history.pushState({}, '', '/?topic=old-topic&other=true');
    syncUrlToExploration('new-item-789', 'push');
    expect(window.location.search).toContain('item=new-item-789');
    expect(window.location.search).not.toContain('topic=');
    expect(window.location.search).toContain('other=true');
  });

  it('clears exploration parameter when itemId is null or empty string', () => {
    syncUrlToExploration('camera-123', 'push');
    expect(window.location.search).toBe('?item=camera-123');

    syncUrlToExploration(null, 'push');
    expect(window.location.search).toBe('');
  });

  it('clears exploration parameter when itemId is whitespace string (prevents ?item=)', () => {
    syncUrlToExploration('camera-123', 'push');
    expect(window.location.search).toBe('?item=camera-123');

    syncUrlToExploration('   ', 'push');
    expect(window.location.search).toBe('');
  });

  it('does not push duplicate history states when itemId is already active', () => {
    const pushSpy = vi.spyOn(window.history, 'pushState');
    syncUrlToExploration('camera-123', 'push');
    expect(pushSpy).toHaveBeenCalledTimes(1);

    // Call again with same ID
    syncUrlToExploration('camera-123', 'push');
    expect(pushSpy).toHaveBeenCalledTimes(1); // Not called second time
  });

  it('cleans up ?item and ?topic from url.hash when synchronizing URL', () => {
    window.history.pushState({}, '', '/#/view?item=old-item');
    syncUrlToExploration('new-item', 'push');
    expect(window.location.search).toBe('?item=new-item');
    expect(window.location.hash).toBe('#/view');
  });
});

describe('URL State Utilities: copyToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses navigator.clipboard.writeText if available and functional', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const result = await copyToClipboard('https://explodeit.pages.dev/?item=sample-1');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('https://explodeit.pages.dev/?item=sample-1');
  });

  it('falls back to document.execCommand if navigator.clipboard.writeText rejects', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
    });

    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await copyToClipboard('https://explodeit.pages.dev/?item=fallback-1');
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('falls back to document.execCommand if navigator.clipboard is undefined', async () => {
    // @ts-ignore
    delete navigator.clipboard;

    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await copyToClipboard('https://explodeit.pages.dev/?item=fallback-2');
    expect(result).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('guarantees cleanup of temporary textarea from document even when execCommand throws', async () => {
    // @ts-ignore
    delete navigator.clipboard;

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand fatal security error');
    });

    const initialChildCount = document.body.children.length;
    const result = await copyToClipboard('https://explodeit.pages.dev/?item=cleanup-test');
    expect(result).toBe(false);
    // Ensure no orphaned textareas remain in DOM
    expect(document.body.children.length).toBe(initialChildCount);
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('returns false when text is empty', async () => {
    const result = await copyToClipboard('');
    expect(result).toBe(false);
  });
});
