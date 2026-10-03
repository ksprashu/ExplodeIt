import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  urlToBlob,
  dataUrlToBlob,
  createFallbackBlob,
} from '../services/communityStorage';
import {
  TLR_CAMERA_BLUEPRINT_SVG,
  TURBOFAN_ENGINE_BLUEPRINT_SVG,
  NEURAL_TRANSFORMER_BLUEPRINT_SVG,
  FALLBACK_BLUEPRINT_SVG,
  TLR_CAMERA_SVG_DATA_URL,
  TURBOFAN_ENGINE_SVG_DATA_URL,
  NEURAL_TRANSFORMER_SVG_DATA_URL,
  FALLBACK_BLUEPRINT_SVG_DATA_URL,
  DUMMY_AUDIO_DATA_URL,
  svgToDataUri,
} from '../services/communityBlueprints';
import { SEED_COMMUNITY_CATALOG } from '../services/mockCommunityStorage';
import { mediaCache } from '../services/mediaCache';

describe('Reviewer 5-Axis Challenger Stress Harness', () => {
  beforeEach(async () => {
    await mediaCache.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // AXIS 1: CORRECTNESS & CORRUPT BLOB ELIMINATION
  // ==========================================================================
  describe('Axis 1: Correctness & Corrupt Blob Elimination', () => {
    it('C1.1: Pre-seeded catalog has NO external community.explodeit.org URLs', () => {
      for (const item of SEED_COMMUNITY_CATALOG) {
        expect(item.infographicUrl).not.toContain('community.explodeit.org');
        expect(item.assembledUrl).not.toContain('community.explodeit.org');
        expect(item.previewUrl).not.toContain('community.explodeit.org');
        expect(item.audioUrl).not.toContain('community.explodeit.org');
        expect(item.videoUrl).toBeUndefined();

        // Data URIs are self-contained
        expect(item.infographicUrl.startsWith('data:image/svg+xml')).toBe(true);
        expect(item.assembledUrl.startsWith('data:image/svg+xml')).toBe(true);
        expect(item.previewUrl.startsWith('data:image/svg+xml')).toBe(true);
        expect(item.audioUrl.startsWith('data:audio/wav')).toBe(true);
      }
    });

    it('C1.2: createFallbackBlob returns valid binary formats with correct magic headers', async () => {
      // 1. PNG fallback
      const pngBlob = createFallbackBlob('image/png');
      expect(pngBlob.type).toBe('image/png');
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      // PNG Magic: 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      expect(pngBytes[0]).toBe(0x89);
      expect(pngBytes[1]).toBe(0x50); // P
      expect(pngBytes[2]).toBe(0x4e); // N
      expect(pngBytes[3]).toBe(0x47); // G

      // 2. Audio WAV fallback
      const wavBlob = createFallbackBlob('audio/wav');
      expect(wavBlob.type).toBe('audio/wav');
      const wavBytes = new Uint8Array(await wavBlob.arrayBuffer());
      // WAV Magic: RIFF ... WAVE
      const riffHeader = String.fromCharCode(...wavBytes.slice(0, 4));
      const waveHeader = String.fromCharCode(...wavBytes.slice(8, 12));
      expect(riffHeader).toBe('RIFF');
      expect(waveHeader).toBe('WAVE');

      // 3. SVG fallback
      const svgBlob = createFallbackBlob('image/svg+xml');
      expect(svgBlob.type).toBe('image/svg+xml');
      const svgText = await svgBlob.text();
      expect(svgText).toContain('<svg');
      expect(svgText).toContain('</svg>');
    });

    it('C1.3: dataUrlToBlob decodes both base64 and UTF-8 encoded SVG data URIs', async () => {
      // UTF-8 encoded SVG
      const svgBlob = dataUrlToBlob(TLR_CAMERA_SVG_DATA_URL, 'image/svg+xml');
      expect(svgBlob.type).toBe('image/svg+xml');
      const text = await svgBlob.text();
      expect(text).toContain('TWIN-LENS REFLEX');

      // Base64 encoded audio
      const audioBlob = dataUrlToBlob(DUMMY_AUDIO_DATA_URL, 'audio/wav');
      expect(audioBlob.type).toBe('audio/wav');
      expect(audioBlob.size).toBe(44);
    });

    it('C1.4: dataUrlToBlob handles malformed data URIs gracefully with fallback', async () => {
      const malformed1 = 'data:image/png;base64,!!!NOT_BASE64@@@';
      const blob1 = dataUrlToBlob(malformed1, 'image/png');
      expect(blob1).toBeInstanceOf(Blob);
      expect(blob1.type).toBe('image/png');

      const malformed2 = 'data:image/svg+xml;utf8,%E0%A4%A'; // Malformed URI sequence
      const blob2 = dataUrlToBlob(malformed2, 'image/svg+xml');
      expect(blob2).toBeInstanceOf(Blob);
      expect(blob2.type).toBe('image/svg+xml');

      const empty = '';
      const blob3 = dataUrlToBlob(empty, 'image/png');
      expect(blob3).toBeInstanceOf(Blob);
      expect(blob3.type).toBe('image/png');
    });

    it('C1.5: urlToBlob handles network rejection gracefully with fallback blob', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ERR_NAME_NOT_RESOLVED'));

      const fallback = await urlToBlob('https://unresolvable-host.invalid/test.png', 'image/png');
      expect(fallback).toBeInstanceOf(Blob);
      expect(fallback.type).toBe('image/png');
      // Should have 1x1 PNG bytes, not unresolvable string
      const buf = new Uint8Array(await fallback.arrayBuffer());
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
    });

    it('C1.6: urlToBlob on HTTP 404 / 500 error response returns safe fallback blob without corrupting cache', async () => {
      // When a server returns HTTP 404 with an HTML body:
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('<!DOCTYPE html><html><body>404 Not Found</body></html>', {
          status: 404,
          statusText: 'Not Found',
          headers: { 'Content-Type': 'text/html' }
        })
      );

      const resultBlob = await urlToBlob('https://example.com/missing-asset.png', 'image/png');
      expect(resultBlob.type).toBe('image/png');
      
      // Binary header must be PNG magic bytes, NOT HTML characters!
      const bytes = new Uint8Array(await resultBlob.arrayBuffer());
      expect(bytes[0]).toBe(0x89);
      expect(bytes[1]).toBe(0x50); // P
      expect(bytes[2]).toBe(0x4e); // N
      expect(bytes[3]).toBe(0x47); // G

      // mediaCache must NOT contain the 404 error HTML body
      const cached = await mediaCache.getMediaBlob('https://example.com/missing-asset.png');
      expect(cached).toBeNull();
    });
  });

  // ==========================================================================
  // AXIS 2: SECURITY & XSS
  // ==========================================================================
  describe('Axis 2: Security & SVG XSS Hardening', () => {
    it('C2.1: All blueprint SVGs are strictly valid XML and free of script tags', () => {
      const parser = new DOMParser();
      const blueprints = [
        { name: 'TLR Camera', svg: TLR_CAMERA_BLUEPRINT_SVG },
        { name: 'Turbofan Engine', svg: TURBOFAN_ENGINE_BLUEPRINT_SVG },
        { name: 'Transformer', svg: NEURAL_TRANSFORMER_BLUEPRINT_SVG },
        { name: 'Fallback', svg: FALLBACK_BLUEPRINT_SVG },
      ];

      for (const bp of blueprints) {
        const doc = parser.parseFromString(bp.svg, 'image/svg+xml');
        const parserError = doc.querySelector('parsererror');
        expect(parserError).toBeNull();

        // No executable scripts
        const scripts = doc.querySelectorAll('script');
        expect(scripts.length).toBe(0);

        // No event handler attributes (onload, onerror, onclick)
        const allElements = doc.querySelectorAll('*');
        for (const el of Array.from(allElements)) {
          for (const attr of Array.from(el.attributes)) {
            expect(attr.name.toLowerCase().startsWith('on')).toBe(false);
            expect(attr.value.toLowerCase()).not.toContain('javascript:');
          }
        }
      }
    });

    it('C2.2: svgToDataUri safely encodes special characters without unescaped delimiters', () => {
      const maliciousSvg = '<svg xmlns="http://www.w3.org/2000/svg"><text>Hello &amp; <test></text></svg>';
      const dataUri = svgToDataUri(maliciousSvg);
      expect(dataUri.startsWith('data:image/svg+xml;utf8,')).toBe(true);
      expect(dataUri).not.toContain('<');
      expect(dataUri).not.toContain('>');
      expect(dataUri).toContain('%3C');
      expect(dataUri).toContain('%3E');
    });
  });

  // ==========================================================================
  // AXIS 3: PERFORMANCE & RE-RENDER INVARIANTS
  // ==========================================================================
  describe('Axis 3: Performance & Overhead', () => {
    it('C3.1: Pre-computed data URI constants are memory efficient (< 100KB total)', () => {
      const totalLen =
        TLR_CAMERA_SVG_DATA_URL.length +
        TURBOFAN_ENGINE_SVG_DATA_URL.length +
        NEURAL_TRANSFORMER_SVG_DATA_URL.length +
        FALLBACK_BLUEPRINT_SVG_DATA_URL.length +
        DUMMY_AUDIO_DATA_URL.length;

      // Total memory payload should be small (< 60 KB)
      expect(totalLen).toBeLessThan(60 * 1024);
      expect(totalLen).toBeGreaterThan(10 * 1024);
    });
  });
});
