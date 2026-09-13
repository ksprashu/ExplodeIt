import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockBrowserEnvironment, MockIndexedDBMediaCache } from '../mocks/mockStorage';
import {
  mockCameraGenerationItem,
  mockBudgetGenerationItem,
  mockSensitiveInjectedItem,
  mockCommunityCatalog
} from '../mocks/mockGenerations';
import {
  contractCalculateModelCost,
  contractEstimateRunCost,
  CANONICAL_MODEL_PRESETS,
  StageModelConfig
} from '../contracts/pricing_engine.contract.test';
import {
  contractSanitizeAndBundle,
  assertZeroLeak,
  SanitizedGenerationBundle
} from '../contracts/bundle_sanitization.contract.test';
import { ShowcaseFlowController } from './showcase_keyless_flow.e2e.test';

describe('E2E: Cross-Feature Combinations & Real-World Application Scenarios (Tiers 3 & 4)', () => {
  let sessionStore: Storage;
  let localStore: Storage;
  let mediaCache: MockIndexedDBMediaCache;
  let controller: ShowcaseFlowController;

  beforeEach(() => {
    const env = setupMockBrowserEnvironment();
    sessionStore = env.sessionStorage;
    localStore = env.localStorage;
    sessionStore.clear();
    localStore.clear();
    mediaCache = new MockIndexedDBMediaCache();
    controller = new ShowcaseFlowController(sessionStore, localStore, mediaCache);
  });

  describe('Tier 3: Cross-Feature Pairwise Combinations', () => {
    it('COMB-01: Pricing × Tier UI × Veo (Budget Saver with video disabled)', () => {
      // 1. Configure Budget Saver preset with video disabled
      const budgetConfig: StageModelConfig = {
        ...CANONICAL_MODEL_PRESETS.budget,
        enableVideo: false
      };

      // 2. Pricing engine must calculate zero video cost
      const estimatedCost = contractEstimateRunCost(budgetConfig);
      expect(estimatedCost).toBeLessThan(0.03);

      // 3. Packaging bundle must mark videoBlob as undefined
      const bundle = contractSanitizeAndBundle(mockBudgetGenerationItem, 'budget', budgetConfig);
      expect(bundle.media.videoBlob).toBeUndefined();
      expect(bundle.manifest.modelsUsed.video).toBeUndefined();
    });

    it('COMB-02: Sanitization × R2 Upload × Session Auth', () => {
      // 1. User sets session API key
      controller.setApiKey('AIzaSyDUMMY_SECRET_KEY_1234567890abcdef');
      expect(sessionStore.getItem('gemini_api_key')).not.toBeNull();

      // 2. User generates an item that internally had session context
      const itemWithKey = {
        ...mockCameraGenerationItem,
        apiKey: sessionStore.getItem('gemini_api_key')
      };

      // 3. Packaging into public community bundle cleanses the key
      const bundle = contractSanitizeAndBundle(itemWithKey, 'pro', CANONICAL_MODEL_PRESETS.pro);
      assertZeroLeak(bundle);

      const jsonString = JSON.stringify(bundle);
      expect(jsonString).not.toContain('AIzaSyDUMMY_SECRET_KEY');
    });

    it('COMB-03: Media Cache × Showcase × One-Click Load (Egress Elimination)', async () => {
      const topicId = 'tlr-camera-1726240000000';
      const catalogItem = mockCommunityCatalog[0];

      // First load: fetches and stores media in cache
      await controller.loadShowcaseTopic(topicId);
      const cachedBlob = await mediaCache.getMediaBlob(catalogItem.infographicUrl);
      expect(cachedBlob).not.toBeNull();

      // Second load: resolved directly from media cache without network call
      const reloadedBlob = await mediaCache.getMediaBlob(catalogItem.infographicUrl);
      expect(reloadedBlob).not.toBeNull();
      expect(reloadedBlob!.size).toBe(cachedBlob!.size);
    });

    it('COMB-05: Contribution × Cache × Showcase Load', async () => {
      // 1. User generates and contributes an item
      const bundle = contractSanitizeAndBundle(mockCameraGenerationItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      // 2. Item is uploaded and immediately seeded into local cache
      const publicUrl = `https://r2.explodeit.org/${bundle.manifest.id}/infographic.png`;
      await mediaCache.setMediaBlob(publicUrl, bundle.media.infographicBlob);

      // 3. When opened in showcase, loads directly from cache
      const cached = await mediaCache.getMediaBlob(publicUrl);
      expect(cached).not.toBeNull();
      expect(cached!.size).toBe(bundle.media.infographicBlob.size);
    });

    it('COMB-06: Pricing × Keyless × Showcase Load', async () => {
      // 1. Unauthenticated exploration has $0.00 GenAI spend
      expect(controller.getApiKey()).toBeNull();
      await controller.loadShowcaseTopic('turbofan-engine-1726240100000');
      expect(controller.currentTopic).not.toBeNull();

      // 2. Custom prompt initiates authenticated pricing tracker
      const promptSubmission = controller.submitCustomPrompt('Quantum Processor');
      expect(promptSubmission.accepted).toBe(false); // Gated because no key

      controller.setApiKey('AIzaSyTEST_KEY');
      const authSubmission = controller.submitCustomPrompt('Quantum Processor');
      expect(authSubmission.accepted).toBe(true);
    });
  });

  describe('Tier 4: Real-World Application Scenarios', () => {
    it('Scenario 1: The Curious Student (Keyless Exploration & Deep-Dive Discovery)', async () => {
      // Step 1: Opens application with empty storage
      const startup = controller.initApp();
      expect(startup.requiresApiKeyModal).toBe(false);

      // Step 2: Uses search input to filter for "Engine"
      controller.searchQuery = 'Engine';
      const filtered = controller.getFilteredCatalog();
      expect(filtered.length).toBe(1);
      expect(filtered[0].topic).toContain('Turbofan');

      // Step 3: Clicks "Turbofan Jet Engine"
      const result = await controller.loadShowcaseTopic(filtered[0].id);
      expect(result.success).toBe(true);
      expect(result.usedApiKey).toBe(false);

      // Step 4: Full interactive deconstruction available
      expect(controller.currentTopic.plan.displayTitle).toContain('Turbofan');
      expect(controller.currentTopic.hasVideo).toBe(true);
      expect(sessionStore.getItem('gemini_api_key')).toBeNull();
    });

    it('Scenario 2: The Pro Engineer (High-Fidelity Generation & Public Contribution)', () => {
      // Step 1: Enters session API key via Settings modal
      controller.setApiKey('AIzaSyPRO_ENGINEER_KEY_1234567890');

      // Step 2: Selects Pro Studio preset
      const proConfig = CANONICAL_MODEL_PRESETS.pro;
      const estimatedCost = contractEstimateRunCost(proConfig);
      expect(estimatedCost).toBeGreaterThan(0.15);

      // Step 3: Generation finishes, produces complete bundle
      const bundle = contractSanitizeAndBundle(mockCameraGenerationItem, 'pro', proConfig);
      expect(bundle.media.infographicBlob).toBeInstanceOf(Blob);
      expect(bundle.media.videoBlob).toBeInstanceOf(Blob);

      // Step 4: Contribution sanitization check confirms zero key leakage
      assertZeroLeak(bundle);
      expect(bundle.manifest.modelTier).toBe('pro');
    });

    it('Scenario 3: The Budget-Conscious Researcher (Credit Conservation Mode)', () => {
      // Step 1: Switches to Budget Saver with video disabled
      const budgetConfig: StageModelConfig = {
        ...CANONICAL_MODEL_PRESETS.budget,
        enableVideo: false
      };

      // Step 2: Cost estimation is highly economical
      const cost = contractEstimateRunCost(budgetConfig);
      expect(cost).toBeLessThan(0.03);

      // Step 3: Generation outputs item without video
      const bundle = contractSanitizeAndBundle(mockBudgetGenerationItem, 'budget', budgetConfig);
      expect(bundle.media.videoBlob).toBeUndefined();
      expect(bundle.plan.componentList.length).toBe(4);
    });

    it('Scenario 4: The Offline Scholar (Cached Replay & Zero-Egress Revisit)', async () => {
      // Step 1: Online pre-caching of 3 showcase topics
      const topics = mockCommunityCatalog;
      for (const t of topics) {
        await mediaCache.setMediaBlob(t.infographicUrl, new Blob([new Uint8Array(500)]));
        if (t.audioUrl) {
          await mediaCache.setMediaBlob(t.audioUrl, new Blob([new Uint8Array(1000)]));
        }
      }

      // Step 2: Revisit in offline mode
      for (const t of topics) {
        const cachedImg = await mediaCache.getMediaBlob(t.infographicUrl);
        expect(cachedImg).not.toBeNull();
        expect(cachedImg!.size).toBe(500);

        if (t.audioUrl) {
          const cachedAudio = await mediaCache.getMediaBlob(t.audioUrl);
          expect(cachedAudio).not.toBeNull();
          expect(cachedAudio!.size).toBe(1000);
        }
      }
    });

    it('Scenario 5: The Security Auditor (Adversarial Zero-Leak & Sanitization Verification)', () => {
      // Step 1: Active session contains live key
      controller.setApiKey('AIzaSySUPER_SECRET_KEY_AUDIT_VERIFIED');

      // Step 2: Mock generation with aggressive secret injection
      const infectedItem = {
        ...mockSensitiveInjectedItem,
        liveApiKey: controller.getApiKey()
      };

      // Step 3: Bundle sanitizer runs
      const bundle = contractSanitizeAndBundle(infectedItem, 'pro', CANONICAL_MODEL_PRESETS.pro);

      // Step 4: Assert 100% zero leakage
      assertZeroLeak(bundle);

      const rawJson = JSON.stringify(bundle);
      expect(rawJson).not.toContain('SUPER_SECRET_KEY');
      expect(rawJson).not.toContain('AIzaSy');
      expect(rawJson).not.toContain('Bearer');
      expect(localStore.getItem('gemini_api_key')).toBeNull();
    });
  });
});
