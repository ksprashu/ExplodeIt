import { describe, it, expect } from 'vitest';
import {
  mockCameraGenerationItem,
  mockBudgetGenerationItem,
  mockSensitiveInjectedItem,
  DUMMY_PNG_DATA_URL,
  DUMMY_AUDIO_DATA_URL,
  DUMMY_VIDEO_DATA_URL
} from '../mocks/mockGenerations';
import { GenerationItem, ObjectPlan, ComponentPart, SanitizedGenerationBundle, CommunityCatalogItem } from '../../types';
import { ModelTier, StageModelConfig, CANONICAL_MODEL_PRESETS } from './pricing_engine.contract.test';
import {
  sanitizeGenerationItem,
  dataUrlToBlob as prodDataUrlToBlob,
  assertZeroLeak as prodAssertZeroLeak
} from '../../services/communityStorage';

export type { SanitizedGenerationBundle, CommunityCatalogItem };

/**
 * Helper to convert Data URL to Blob (Delegates to production communityStorage)
 */
export const dataUrlToBlob = prodDataUrlToBlob;

/**
 * Contract Reference Implementation: Strict Allowlist Sanitizer & Bundle Packager
 * Authoritative specification for Milestone 3 implementation (Delegates to production communityStorage).
 */
export const contractSanitizeAndBundle = sanitizeGenerationItem;


/**
 * Zero-Leak Cryptographic & Regex Scanner
 */
export function assertZeroLeak(bundle: SanitizedGenerationBundle): void {
  // Check manifest, plan, components, and narrationScript
  const textPayload = JSON.stringify({
    manifest: bundle.manifest,
    plan: bundle.plan,
    components: bundle.components,
    narrationScript: bundle.narrationScript
  });

  // 1. Must not contain Google GenAI API key format: AIzaSy...
  const geminiKeyRegex = /AIzaSy[A-Za-z0-9_-]{33}/g;
  const keyMatches = textPayload.match(geminiKeyRegex);
  expect(keyMatches).toBeNull();

  // 2. Must not contain Bearer tokens: ya29...
  const bearerRegex = /ya29\.[A-Za-z0-9_-]+/g;
  const bearerMatches = textPayload.match(bearerRegex);
  expect(bearerMatches).toBeNull();

  // 3. Prohibited object property names
  const forbiddenPropertyNames = [
    'apiKey',
    'gemini_api_key',
    'api_key',
    'secret',
    'secretToken',
    'auth_token',
    'userSession',
    'credentials',
    '__proto__',
    'constructor'
  ];

  for (const prop of forbiddenPropertyNames) {
    expect(textPayload).not.toContain(`"${prop}":`);
  }
}

describe('Contract: Bundle Packaging & Zero-Leak Sanitization (FEAT-06, FEAT-07)', () => {
  describe('Tier 1: Feature Coverage', () => {
    it('test_feat06_package_bundle_creates_valid_blobs: creates valid media Blobs from generation item', () => {
      const bundle = contractSanitizeAndBundle(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      expect(bundle.media.infographicBlob).toBeInstanceOf(Blob);
      expect(bundle.media.assembledBlob).toBeInstanceOf(Blob);
      expect(bundle.media.audioBlob).toBeInstanceOf(Blob);
      expect(bundle.media.videoBlob).toBeInstanceOf(Blob);
      expect(bundle.media.infographicBlob.size).toBeGreaterThan(0);
    });

    it('test_feat06_manifest_metadata_structure: constructs complete manifest metadata', () => {
      const bundle = contractSanitizeAndBundle(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      expect(bundle.manifest.id).toContain('twin-lens-reflex');
      expect(bundle.manifest.topic).toBe('Twin-Lens Reflex (TLR) Camera');
      expect(bundle.manifest.domain).toBe('PHYSICAL');
      expect(bundle.manifest.metaphor).toBe('Exploded View');
      expect(bundle.manifest.modelTier).toBe('pro');
      expect(bundle.manifest.modelsUsed.planning).toBe('gemini-3.8-flash');
    });

    it('test_feat06_zero_api_key_leakage_assertion: asserts 0 API keys escape to bundle', () => {
      const bundle = contractSanitizeAndBundle(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      assertZeroLeak(bundle);
    });

    it('test_feat06_strip_session_state: strips extraneous runtime and user session properties', () => {
      const itemWithSession = {
        ...mockCameraGenerationItem,
        currentTab: 'INFOGRAPHIC',
        retryCount: 3,
        userSessionId: 'sess_999'
      };
      const bundle = contractSanitizeAndBundle(itemWithSession, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const json = JSON.stringify(bundle);
      expect(json).not.toContain('userSessionId');
      expect(json).not.toContain('currentTab');
      expect(json).not.toContain('retryCount');
    });

    it('test_feat06_budget_bundle_handles_omitted_video: budget item has undefined videoBlob', () => {
      const bundle = contractSanitizeAndBundle(mockBudgetGenerationItem, 'budget', CANONICAL_MODEL_PRESETS.budget);
      expect(bundle.media.videoBlob).toBeUndefined();
      expect(bundle.manifest.modelsUsed.video).toBeUndefined();
      expect(bundle.manifest.modelTier).toBe('budget');
    });

    it('test_feat07_catalog_manifest_format: catalog item matches schema', () => {
      const bundle = contractSanitizeAndBundle(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);
      const catalogItem: CommunityCatalogItem = {
        id: bundle.manifest.id,
        topic: bundle.manifest.topic,
        timestamp: bundle.manifest.timestamp,
        domain: bundle.manifest.domain,
        metaphor: bundle.manifest.metaphor,
        infographicUrl: `https://r2.explodeit.org/${bundle.manifest.id}/infographic.png`,
        assembledUrl: `https://r2.explodeit.org/${bundle.manifest.id}/assembled.png`,
        videoUrl: bundle.media.videoBlob ? `https://r2.explodeit.org/${bundle.manifest.id}/video.mp4` : undefined,
        audioUrl: `https://r2.explodeit.org/${bundle.manifest.id}/audio.wav`,
        previewUrl: `https://r2.explodeit.org/${bundle.manifest.id}/preview.jpg`
      };

      expect(catalogItem.id).toBe(bundle.manifest.id);
      expect(catalogItem.topic).toBe(bundle.manifest.topic);
      expect(catalogItem.infographicUrl).toContain('.png');
    });
  });

  describe('Tier 2: Boundary, Adversarial & Corner Cases', () => {
    it('test_feat06_boundary_payload_with_dummy_api_key: cleanses aggressively injected secrets', () => {
      // mockSensitiveInjectedItem contains apiKey, gemini_api_key, auth_token, userSession
      const sanitized = contractSanitizeAndBundle(mockSensitiveInjectedItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      // Verify zero leak on the sanitized bundle
      assertZeroLeak(sanitized);

      const serialized = JSON.stringify(sanitized);
      expect(serialized).not.toContain('AIzaSyDUMMY_SECRET_KEY_1234567890abcdef');
      expect(serialized).not.toContain('Bearer ya29');
      expect(serialized).not.toContain('secret_abc_123');
    });

    it('test_feat06_boundary_prototype_pollution_protection: discards __proto__ and constructor', () => {
      const maliciousPayload = JSON.parse(
        '{"plan":{"displayTitle":"Malicious","__proto__":{"polluted":true}},"timestamp":12345}'
      );
      const bundle = contractSanitizeAndBundle(maliciousPayload);
      assertZeroLeak(bundle);
      expect((bundle.plan as any).polluted).toBeUndefined();
    });

    it('test_feat06_boundary_missing_plan_throws_actionable_error: rejects item without plan', () => {
      expect(() => {
        contractSanitizeAndBundle({ prompt: 'Broken' });
      }).toThrow('missing plan');
    });

    it('test_feat06_boundary_corrupted_data_url_graceful_fallback: handles non-base64 data URL', () => {
      const corruptedItem = {
        ...mockCameraGenerationItem,
        infographicUrl: 'data:image/png;notbase64!!',
        videoUrl: null
      };
      const bundle = contractSanitizeAndBundle(corruptedItem);
      expect(bundle.media.infographicBlob).toBeInstanceOf(Blob);
    });

    it('test_feat07_boundary_duplicate_slug_timestamp_collision_resistance: ensures unique IDs', () => {
      const item1 = { ...mockCameraGenerationItem, timestamp: 1000 };
      const item2 = { ...mockCameraGenerationItem, timestamp: 2000 };
      const b1 = contractSanitizeAndBundle(item1);
      const b2 = contractSanitizeAndBundle(item2);
      expect(b1.manifest.id).not.toBe(b2.manifest.id);
    });
  });
});
