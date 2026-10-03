/**
 * Challenger Adversarial Unit Test Suite: Seed Assets, Corrupt Blob Elimination & UI Fallback Hardening
 *
 * Verifies:
 * 1. SEED_COMMUNITY_CATALOG data URI validity (RFC 2397), SVG markup, and undefined videoUrl.
 * 2. Complete isolation from community.explodeit.org and any external unresolvable host.
 * 3. dataUrlToBlob resilience across UTF-8 SVG, base64, and malformed inputs.
 * 4. urlToBlob failing URL handling: strict elimination of corrupt text Blobs in favor of genuine binary fallbacks.
 * 5. CommunityShowcase & DisplayArea error boundaries: image onError handling without throw or broken layout.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  SEED_COMMUNITY_CATALOG,
  LOCAL_STORAGE_CATALOG_KEY,
} from '../services/mockCommunityStorage';
import { mockCommunityCatalog, mockCameraPlan, mockCameraComponents } from './mocks/mockGenerations';
import {
  dataUrlToBlob,
  urlToBlob,
  createFallbackBlob,
} from '../services/communityStorage';
import {
  TLR_CAMERA_SVG_DATA_URL,
  TURBOFAN_ENGINE_SVG_DATA_URL,
  NEURAL_TRANSFORMER_SVG_DATA_URL,
  FALLBACK_BLUEPRINT_SVG_DATA_URL,
  FALLBACK_BLUEPRINT_SVG,
  DUMMY_AUDIO_DATA_URL,
} from '../services/communityBlueprints';
import { CommunityShowcase } from '../components/CommunityShowcase';
import DisplayArea from '../components/DisplayArea';
import { GenerationStatus, CommunityCatalogItem, GenerationItem } from '../types';

// ============================================================================
// Fixtures
// ============================================================================

const DUMMY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const DUMMY_VIDEO_DATA_URL =
  'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAA';

const mockCatalogWithBrokenImages: CommunityCatalogItem[] = [
  {
    id: 'broken-camera-001',
    topic: 'Twin-Lens Reflex Camera',
    timestamp: '2026-09-13T16:00:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
    infographicUrl: 'https://broken-cdn.internal/camera/infographic.png',
    assembledUrl: 'https://broken-cdn.internal/camera/assembled.png',
    videoUrl: undefined,
    audioUrl: DUMMY_AUDIO_DATA_URL,
    previewUrl: 'https://broken-cdn.internal/camera/preview.jpg',
  },
  {
    id: 'broken-turbofan-002',
    topic: 'High-Bypass Turbofan Jet Engine',
    timestamp: '2026-09-13T16:05:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
    infographicUrl: 'https://broken-cdn.internal/turbofan/infographic.png',
    assembledUrl: 'https://broken-cdn.internal/turbofan/assembled.png',
    videoUrl: undefined,
    audioUrl: DUMMY_AUDIO_DATA_URL,
    previewUrl: 'https://broken-cdn.internal/turbofan/preview.jpg',
  },
];

const mockBrokenItemNoVideo: GenerationItem = {
  id: 'broken-gen-item-001',
  prompt: 'Twin-Lens Reflex Camera',
  timestamp: Date.now(),
  plan: {
    ...mockCameraPlan,
    displayTitle: 'Twin-Lens Reflex Camera',
  },
  components: mockCameraComponents,
  narrationScript: 'Test narration script',
  infographicUrl: 'https://broken-cdn.internal/camera/infographic.png',
  assembledUrl: 'https://broken-cdn.internal/camera/assembled.png',
  videoUrl: undefined,
  audioUrl: DUMMY_AUDIO_DATA_URL,
  hasVideo: false,
  usage: [],
  tier: 'budget',
};

const mockBrokenItemWithVideo: GenerationItem = {
  id: 'broken-gen-item-002',
  prompt: 'High-Bypass Turbofan Jet Engine',
  timestamp: Date.now(),
  plan: {
    ...mockCameraPlan,
    displayTitle: 'High-Bypass Turbofan Jet Engine',
  },
  components: mockCameraComponents,
  narrationScript: 'Test turbofan narration script',
  infographicUrl: 'https://broken-cdn.internal/turbofan/infographic.png',
  assembledUrl: 'https://broken-cdn.internal/turbofan/assembled.png',
  videoUrl: DUMMY_VIDEO_DATA_URL,
  audioUrl: DUMMY_AUDIO_DATA_URL,
  hasVideo: true,
  usage: [],
  tier: 'pro',
};

describe('Adversarial Challenger Suite: Seed Assets, Corrupt Blob Elimination & UI Fallback Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Scope 1: SEED_COMMUNITY_CATALOG Data URI Integrity & RFC 2397 Compliance
  // ==========================================================================
  describe('Scope 1: SEED_COMMUNITY_CATALOG Data URI Integrity & RFC 2397 Compliance', () => {
    it('C1.1: SEED_COMMUNITY_CATALOG contains at least 3 canonical deconstructions with valid IDs and domains', () => {
      expect(SEED_COMMUNITY_CATALOG).toBeDefined();
      expect(Array.isArray(SEED_COMMUNITY_CATALOG)).toBe(true);
      expect(SEED_COMMUNITY_CATALOG.length).toBeGreaterThanOrEqual(3);

      const ids = SEED_COMMUNITY_CATALOG.map((item) => item.id);
      expect(ids).toContain('tlr-camera-1726240000000');
      expect(ids).toContain('turbofan-engine-1726240100000');
      expect(ids).toContain('neural-transformer-1726240200000');
    });

    it('C1.2: Every item in SEED_COMMUNITY_CATALOG has valid, well-formed SVG data URIs for infographicUrl, previewUrl, assembledUrl', () => {
      SEED_COMMUNITY_CATALOG.forEach((item) => {
        // infographicUrl
        expect(item.infographicUrl).toBeDefined();
        expect(typeof item.infographicUrl).toBe('string');
        expect(item.infographicUrl.startsWith('data:image/svg+xml')).toBe(true);

        // previewUrl
        expect(item.previewUrl).toBeDefined();
        expect(typeof item.previewUrl).toBe('string');
        expect(item.previewUrl.startsWith('data:image/svg+xml')).toBe(true);

        // assembledUrl
        expect(item.assembledUrl).toBeDefined();
        expect(typeof item.assembledUrl).toBe('string');
        expect(item.assembledUrl.startsWith('data:image/svg+xml')).toBe(true);

        // Verify decoded payloads contain valid SVG tags
        const decodedInfographic = decodeURIComponent(item.infographicUrl.split(',')[1]);
        expect(decodedInfographic).toContain('<svg');
        expect(decodedInfographic).toContain('</svg>');
        expect(decodedInfographic).toContain('xmlns="http://www.w3.org/2000/svg"');

        const decodedPreview = decodeURIComponent(item.previewUrl.split(',')[1]);
        expect(decodedPreview).toContain('<svg');
        expect(decodedPreview).toContain('</svg>');

        const decodedAssembled = decodeURIComponent(item.assembledUrl.split(',')[1]);
        expect(decodedAssembled).toContain('<svg');
        expect(decodedAssembled).toContain('</svg>');
      });
    });

    it('C1.3: Every item in SEED_COMMUNITY_CATALOG has videoUrl strictly undefined to eliminate dead network calls', () => {
      SEED_COMMUNITY_CATALOG.forEach((item) => {
        expect(item.videoUrl).toBeUndefined();
      });
    });

    it('C1.4: Every item in SEED_COMMUNITY_CATALOG has a valid silent PCM audio WAV data URI', () => {
      SEED_COMMUNITY_CATALOG.forEach((item) => {
        expect(item.audioUrl).toBeDefined();
        expect(typeof item.audioUrl).toBe('string');
        expect(item.audioUrl).toMatch(/^data:audio\/wav;base64,/);

        // Base64 decode audio payload and verify 44-byte standard RIFF header
        const base64Data = item.audioUrl!.replace(/^data:audio\/wav;base64,/, '');
        const binaryStr = atob(base64Data);
        expect(binaryStr.length).toBe(44);
        expect(binaryStr.slice(0, 4)).toBe('RIFF');
        expect(binaryStr.slice(8, 12)).toBe('WAVE');
        expect(binaryStr.slice(12, 16)).toBe('fmt ');
        expect(binaryStr.slice(36, 40)).toBe('data');
      });
    });

    it('C1.5: Pre-encoded vector blueprint constants export valid, parseable SVG data URIs', () => {
      const blueprintUrls = [
        TLR_CAMERA_SVG_DATA_URL,
        TURBOFAN_ENGINE_SVG_DATA_URL,
        NEURAL_TRANSFORMER_SVG_DATA_URL,
        FALLBACK_BLUEPRINT_SVG_DATA_URL,
      ];

      blueprintUrls.forEach((url) => {
        expect(url.startsWith('data:image/svg+xml;utf8,')).toBe(true);
        const svgContent = decodeURIComponent(url.replace('data:image/svg+xml;utf8,', ''));
        expect(svgContent.startsWith('<svg')).toBe(true);
        expect(svgContent.endsWith('</svg>')).toBe(true);
        expect(svgContent).toContain('viewBox="0 0 800 600"');
      });
    });
  });

  // ==========================================================================
  // Scope 2: Host Isolation & Zero External Network Dependency Invariant
  // ==========================================================================
  describe('Scope 2: Host Isolation & Zero External Network Dependency Invariant', () => {
    it('C2.1: SEED_COMMUNITY_CATALOG contains zero references to community.explodeit.org or external domains', () => {
      const serialized = JSON.stringify(SEED_COMMUNITY_CATALOG);

      expect(serialized).not.toContain('community.explodeit.org');
      expect(serialized).not.toContain('explodeit.org');

      // Assert media fields have no external unresolvable HTTP/HTTPS URLs
      SEED_COMMUNITY_CATALOG.forEach((item) => {
        expect(item.infographicUrl.startsWith('http')).toBe(false);
        expect(item.previewUrl.startsWith('http')).toBe(false);
        expect(item.assembledUrl.startsWith('http')).toBe(false);
        if (item.audioUrl) {
          expect(item.audioUrl.startsWith('http')).toBe(false);
        }
        if (item.videoUrl) {
          expect(item.videoUrl.startsWith('http')).toBe(false);
        }
      });
    });

    it('C2.2: mockCommunityCatalog in mockGenerations.ts contains zero references to community.explodeit.org', () => {
      const serialized = JSON.stringify(mockCommunityCatalog);
      expect(serialized).not.toContain('community.explodeit.org');
    });

    it('C2.3: Loading and converting all seed catalog assets triggers zero network fetch calls', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      for (const item of SEED_COMMUNITY_CATALOG) {
        const infoBlob = await urlToBlob(item.infographicUrl, 'image/svg+xml');
        const previewBlob = await urlToBlob(item.previewUrl, 'image/svg+xml');
        const assembledBlob = await urlToBlob(item.assembledUrl, 'image/svg+xml');
        const audioBlob = await urlToBlob(item.audioUrl, 'audio/wav');

        expect(infoBlob.type).toBe('image/svg+xml');
        expect(previewBlob.type).toBe('image/svg+xml');
        expect(assembledBlob.type).toBe('image/svg+xml');
        expect(audioBlob.type).toBe('audio/wav');
      }

      // Completely offline, zero network requests invoked
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Scope 3: dataUrlToBlob Adversarial Edge Cases
  // ==========================================================================
  describe('Scope 3: dataUrlToBlob Adversarial Edge Cases', () => {
    it('C3.1: Decodes UTF-8 URI-encoded SVG data URIs into valid SVG Blobs', async () => {
      const svgSource = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>';
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svgSource)}`;

      const blob = dataUrlToBlob(dataUri, 'image/svg+xml');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/svg+xml');

      const text = await blob.text();
      expect(text).toBe(svgSource);
    });

    it('C3.2: Decodes raw UTF-8 SVG data URIs without percent-encoding into valid SVG Blobs', async () => {
      const svgSource = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20"/></svg>';
      const dataUri = `data:image/svg+xml,${svgSource}`;

      const blob = dataUrlToBlob(dataUri, 'image/svg+xml');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/svg+xml');

      const text = await blob.text();
      expect(text).toBe(svgSource);
    });

    it('C3.3: Decodes Base64 data URIs into valid binary Blobs with expected byte contents', async () => {
      // 1x1 PNG data URI
      const pngBlob = dataUrlToBlob(DUMMY_PNG_DATA_URL, 'image/png');
      expect(pngBlob).toBeInstanceOf(Blob);
      expect(pngBlob.type).toBe('image/png');
      expect(pngBlob.size).toBeGreaterThan(0);

      const arrayBuf = await pngBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      // Verify PNG magic signature: 0x89 0x50 0x4E 0x47
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50);
      expect(bytes[2]).toBe(0x4E);
      expect(bytes[3]).toBe(0x47);

      // Silent WAV data URI
      const wavBlob = dataUrlToBlob(DUMMY_AUDIO_DATA_URL, 'audio/wav');
      expect(wavBlob.type).toBe('audio/wav');
      expect(wavBlob.size).toBe(44);
    });

    it('C3.4: Gracefully handles malformed data URIs by returning genuine fallback Blobs without throwing', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 1. Missing comma
      const missingComma = dataUrlToBlob('data:image/svg+xml', 'image/svg+xml');
      expect(missingComma).toBeInstanceOf(Blob);
      expect(missingComma.type).toBe('image/svg+xml');

      // 2. Corrupt base64 payload
      const corruptBase64 = dataUrlToBlob('data:image/png;base64,??InvalidBase64Chars??==', 'image/png');
      expect(corruptBase64).toBeInstanceOf(Blob);
      expect(corruptBase64.type).toBe('image/png');
      expect(corruptBase64.size).toBeGreaterThan(0); // genuine 1x1 PNG fallback

      // 3. Corrupt percent-encoding
      const corruptEncoding = dataUrlToBlob('data:image/svg+xml,%E0%A4%A', 'image/svg+xml');
      expect(corruptEncoding).toBeInstanceOf(Blob);
      expect(corruptEncoding.type).toBe('image/svg+xml');

      // 4. Non-data-uri strings and empty inputs
      expect(dataUrlToBlob('', 'image/png').type).toBe('image/png');
      expect(dataUrlToBlob('https://not-data-uri.com/asset.png', 'image/png').type).toBe('image/png');
      expect(dataUrlToBlob(null as any, 'audio/wav').type).toBe('audio/wav');
      expect(dataUrlToBlob(undefined as any, 'image/svg+xml').type).toBe('image/svg+xml');
      expect(dataUrlToBlob(12345 as any, 'image/png').type).toBe('image/png');

      consoleWarnSpy.mockRestore();
    });

    it('C3.5: Returns typed binary fallback blobs according to provided fallbackMime', async () => {
      // SVG fallback
      const svgFallback = dataUrlToBlob('corrupted', 'image/svg+xml');
      expect(svgFallback.type).toBe('image/svg+xml');
      const svgText = await svgFallback.text();
      expect(svgText).toContain('TECHNICAL BLUEPRINT SCHEMATIC');

      // PNG fallback
      const pngFallback = dataUrlToBlob('corrupted', 'image/png');
      expect(pngFallback.type).toBe('image/png');
      expect(pngFallback.size).toBe(67); // standard 1x1 PNG

      // WAV fallback
      const wavFallback = dataUrlToBlob('corrupted', 'audio/wav');
      expect(wavFallback.type).toBe('audio/wav');
      expect(wavFallback.size).toBe(44);
    });
  });

  // ==========================================================================
  // Scope 4: urlToBlob Resilient Fallback vs Corrupt Blob Elimination
  // ==========================================================================
  describe('Scope 4: urlToBlob Resilient Fallback vs Corrupt Blob Elimination', () => {
    it('C4.1: When remote fetch fails, urlToBlob returns a valid fallback binary Blob, NOT a corrupt Blob of URL text bytes', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const brokenUrl = 'https://community.explodeit.org/broken-asset-path/deconstruction.png';

      // Simulate network error (DNS failure / connection refused)
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error: ENOTFOUND community.explodeit.org'));

      const resultBlob = await urlToBlob(brokenUrl, 'image/png');

      // --- CRITICAL ADVERSARIAL INVARIANTS ---
      // 1. Result must be a genuine Blob
      expect(resultBlob).toBeInstanceOf(Blob);
      expect(resultBlob.type).toBe('image/png');

      // 2. Blob MUST NOT contain the raw URL text bytes
      const textContent = await resultBlob.text();
      expect(textContent).not.toBe(brokenUrl);
      expect(textContent).not.toContain('https://community.explodeit.org');

      // 3. Blob size must NOT equal the URL string length
      expect(resultBlob.size).not.toBe(brokenUrl.length);

      // 4. Blob must contain genuine 1x1 PNG magic header bytes
      const arrayBuf = await resultBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50); // 'P'
      expect(bytes[2]).toBe(0x4e); // 'N'
      expect(bytes[3]).toBe(0x47); // 'G'

      consoleWarnSpy.mockRestore();
    });

    it('C4.2: When remote SVG fetch fails, urlToBlob returns a valid vector blueprint SVG Blob', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const brokenSvgUrl = 'https://community.explodeit.org/broken-path/schematic.svg';

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('HTTP 404: Not Found'));

      const resultBlob = await urlToBlob(brokenSvgUrl, 'image/svg+xml');

      expect(resultBlob).toBeInstanceOf(Blob);
      expect(resultBlob.type).toBe('image/svg+xml');

      const svgText = await resultBlob.text();
      expect(svgText).not.toBe(brokenSvgUrl);
      expect(svgText).toContain('<svg');
      expect(svgText).toContain('</svg>');
      expect(svgText).toContain('TECHNICAL BLUEPRINT SCHEMATIC');

      consoleWarnSpy.mockRestore();
    });

    it('C4.3: When remote audio fetch fails, urlToBlob returns a 44-byte silent WAV audio Blob', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const brokenAudioUrl = 'https://community.explodeit.org/broken-path/narration.mp3';

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection timed out'));

      const resultBlob = await urlToBlob(brokenAudioUrl, 'audio/wav');

      expect(resultBlob).toBeInstanceOf(Blob);
      expect(resultBlob.type).toBe('audio/wav');
      expect(resultBlob.size).toBe(44);

      const arrayBuf = await resultBlob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      const textHeader = String.fromCharCode(...bytes.slice(0, 4));
      expect(textHeader).toBe('RIFF');

      consoleWarnSpy.mockRestore();
    });

    it('C4.4: Handles null, undefined, and non-string inputs safely without throwing', async () => {
      expect((await urlToBlob(null, 'image/png')).type).toBe('image/png');
      expect((await urlToBlob(undefined, 'image/svg+xml')).type).toBe('image/svg+xml');
      expect((await urlToBlob('', 'audio/wav')).type).toBe('audio/wav');
    });

    it('C4.5: Pass-through existing Blob instances directly without re-encoding', async () => {
      const sourceBlob = new Blob(['custom-binary-payload'], { type: 'application/octet-stream' });
      const result = await urlToBlob(sourceBlob);
      expect(result).toBe(sourceBlob);
    });

    it('C4.6: Directly converts data URIs without invoking network fetch', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await urlToBlob(TLR_CAMERA_SVG_DATA_URL, 'image/svg+xml');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.type).toBe('image/svg+xml');
      const text = await result.text();
      expect(text).toContain('TWIN-LENS REFLEX');
    });
  });

  // ==========================================================================
  // Scope 5: CommunityShowcase Failed Image Load Resilience & Layout Stability
  // ==========================================================================
  describe('Scope 5: CommunityShowcase Failed Image Load Resilience & Layout Stability', () => {
    it('C5.1: Card image onError gracefully hides broken image and reveals vector blueprint fallback', () => {
      const onSelectMock = vi.fn();

      render(
        React.createElement(CommunityShowcase, {
          onSelectTopic: onSelectMock,
          catalogItems: mockCatalogWithBrokenImages,
          isLoading: false,
        })
      );

      // Find all topic cards
      const gallery = screen.getByLabelText('Topic Card Gallery');
      expect(gallery).toBeInTheDocument();

      // Find the card images
      const cardImages = gallery.querySelectorAll('img');
      expect(cardImages.length).toBeGreaterThanOrEqual(2);

      const firstImg = cardImages[0];
      expect(firstImg.style.display).not.toBe('none');

      // Trigger image load failure
      fireEvent.error(firstImg);

      // Verify image is hidden to expose blueprint canvas behind it
      expect(firstImg.style.display).toBe('none');

      // Verify blueprint fallback element exists in card
      const fallbacks = gallery.querySelectorAll('[data-testid="blueprint-fallback"]');
      expect(fallbacks.length).toBeGreaterThanOrEqual(1);

      // Verify card layout remains intact and clickable
      const cameraCard = screen.getByRole('button', { name: /Explore Twin-Lens Reflex Camera/i });
      expect(cameraCard).toBeInTheDocument();
      fireEvent.click(cameraCard);
      expect(onSelectMock).toHaveBeenCalledWith(mockCatalogWithBrokenImages[0]);
    });

    it('C5.2: Hero carousel image onError hides preview image without breaking carousel navigation', () => {
      const onSelectMock = vi.fn();

      render(
        React.createElement(CommunityShowcase, {
          onSelectTopic: onSelectMock,
          catalogItems: mockCatalogWithBrokenImages,
          isLoading: false,
        })
      );

      const carouselSection = screen.getByLabelText('Featured Community Deconstructions');
      expect(carouselSection).toBeInTheDocument();

      // Find the preview image inside the carousel
      const carouselImg = carouselSection.querySelector('.group\\/preview img');
      expect(carouselImg).not.toBeNull();

      // Fire error on carousel image
      fireEvent.error(carouselImg!);

      // Assert error handler hides the image
      expect((carouselImg as HTMLElement).style.display).toBe('none');

      // Verify carousel controls still work smoothly
      const nextBtn = screen.getByRole('button', { name: /Next slide/i });
      expect(nextBtn).toBeInTheDocument();
      fireEvent.click(nextBtn);

      expect(screen.getByText(/02 \/ 02/)).toBeInTheDocument();
    });

    it('C5.3: Collapsible category view withstands image errors across all category sections', () => {
      render(
        React.createElement(CommunityShowcase, {
          onSelectTopic: vi.fn(),
          catalogItems: mockCatalogWithBrokenImages,
          isLoading: false,
        })
      );

      // Switch to Collapsible mode
      const collapsibleBtn = screen.getByRole('button', { name: /Collapsible category view/i });
      fireEvent.click(collapsibleBtn);

      // Trigger error on all images in collapsible view
      const allImages = document.querySelectorAll('img');
      allImages.forEach((img) => {
        fireEvent.error(img);
        expect(img.style.display).toBe('none');
      });

      // Categories and headers still present
      expect(screen.getAllByText('Mechanical').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Scope 6: DisplayArea Failed Image Load Resilience & Layout Stability
  // ==========================================================================
  describe('Scope 6: DisplayArea Failed Image Load Resilience & Layout Stability', () => {
    it('C6.1: Assembled image failure in left media slot cleanly transitions to Technical Blueprint Schematic view', () => {
      render(
        React.createElement(DisplayArea, {
          item: mockBrokenItemNoVideo,
          status: GenerationStatus.COMPLETED,
          onBackToShowcase: vi.fn(),
        })
      );

      // Find Assembled View image
      const assembledImg = screen.getByAltText('Assembled View');
      expect(assembledImg).toBeInTheDocument();

      // Fire image error
      fireEvent.error(assembledImg);

      // Image should be replaced by fallback schematic component
      expect(screen.queryByAltText('Assembled View')).not.toBeInTheDocument();
      expect(screen.getByText('TECHNICAL BLUEPRINT SCHEMATIC')).toBeInTheDocument();
      expect(screen.getByText('ASSEMBLED BLUEPRINT ACTIVE')).toBeInTheDocument();
      expect(screen.getAllByText('Twin-Lens Reflex Camera').length).toBeGreaterThanOrEqual(1);
    });

    it('C6.2: Infographic image failure in right media slot cleanly transitions to Exploded Blueprint Schematic view', () => {
      render(
        React.createElement(DisplayArea, {
          item: mockBrokenItemNoVideo,
          status: GenerationStatus.COMPLETED,
          onBackToShowcase: vi.fn(),
        })
      );

      // Find Infographic View image
      const infographicImg = screen.getByAltText('Infographic View');
      expect(infographicImg).toBeInTheDocument();

      // Fire image error
      fireEvent.error(infographicImg);

      // Image should be replaced by fallback schematic component
      expect(screen.queryByAltText('Infographic View')).not.toBeInTheDocument();
      expect(screen.getByText('EXPLODED BLUEPRINT SCHEMATIC')).toBeInTheDocument();
      expect(screen.getByText('EXPLODED BLUEPRINT ACTIVE')).toBeInTheDocument();
    });

    it('C6.3: Header assembled thumbnail failure (item with video) cleanly transitions to blueprint schematic thumbnail', () => {
      render(
        React.createElement(DisplayArea, {
          item: mockBrokenItemWithVideo,
          status: GenerationStatus.COMPLETED,
          onBackToShowcase: vi.fn(),
        })
      );

      // When item has video, assembled object is rendered in header slot
      const headerImg = screen.getByAltText('Assembled Object');
      expect(headerImg).toBeInTheDocument();

      // Fire image error
      fireEvent.error(headerImg);

      // Header thumbnail switches to fallback schematic view with ASSEMBLED badge
      expect(screen.queryByAltText('Assembled Object')).not.toBeInTheDocument();
      expect(screen.getByText('BLUEPRINT SCHEMATIC')).toBeInTheDocument();
      expect(screen.getByText('ASSEMBLED')).toBeInTheDocument();
    });

    it('C6.4: Switching items in DisplayArea automatically resets error states for fresh render attempts', () => {
      const { rerender } = render(
        React.createElement(DisplayArea, {
          item: mockBrokenItemNoVideo,
          status: GenerationStatus.COMPLETED,
          onBackToShowcase: vi.fn(),
        })
      );

      // Trigger error on Infographic View
      const infographicImg = screen.getByAltText('Infographic View');
      fireEvent.error(infographicImg);
      expect(screen.getByText('EXPLODED BLUEPRINT SCHEMATIC')).toBeInTheDocument();

      // Switch to a new item with valid SVG data URIs
      const validItem: GenerationItem = {
        ...mockBrokenItemNoVideo,
        id: 'valid-recovered-item-003',
        infographicUrl: TLR_CAMERA_SVG_DATA_URL,
        assembledUrl: TLR_CAMERA_SVG_DATA_URL,
      };

      rerender(
        React.createElement(DisplayArea, {
          item: validItem,
          status: GenerationStatus.COMPLETED,
          onBackToShowcase: vi.fn(),
        })
      );

      // Error state is reset; genuine Infographic View img is rendered again
      expect(screen.getByAltText('Infographic View')).toBeInTheDocument();
      expect(screen.queryByText('EXPLODED BLUEPRINT SCHEMATIC')).not.toBeInTheDocument();
    });
  });
});
