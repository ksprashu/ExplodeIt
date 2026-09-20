import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  loadModelPreferences, 
  saveModelPreferences 
} from '../App';
import { 
  generateVideo, 
  setGlobalApiKey 
} from '../services/geminiService';
import { 
  CANONICAL_MODEL_PRESETS, 
  MODEL_VIDEO, 
  PROMPTS,
  MODEL_REGISTRY 
} from '../constants';
import { 
  GenerationItem, 
  GenerationStatus, 
  ModelTier, 
  StageModelConfig 
} from '../types';
import Sidebar from '../components/Sidebar';
import DisplayArea from '../components/DisplayArea';
import ProgressTracker from '../components/ProgressTracker';
import { mockCameraPlan, mockCameraComponents } from './mocks/mockGenerations';

// Spy holder for generateVideos interceptor
let lastGenerateVideosPayload: any = null;

// Mock @google/genai preserving Type and Modality
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: class MockGoogleGenAI {
      constructor(public options: { apiKey: string }) {}
      models = {
        generateVideos: vi.fn().mockImplementation((payload: any) => {
          lastGenerateVideosPayload = payload;
          return Promise.resolve({
            done: true,
            response: {
              generatedVideos: [
                {
                  video: {
                    uri: 'https://generativelanguage.googleapis.com/v1beta/test-video-uri?id=123'
                  }
                }
              ]
            }
          });
        })
      };
      operations = {
        getVideosOperation: vi.fn().mockResolvedValue({ done: true })
      };
    }
  };
});

// Mock global fetch for video blob downloading
global.fetch = vi.fn().mockImplementation((url: string) => {
  return Promise.resolve({
    blob: () => Promise.resolve(new Blob(['dummy-mp4-data'], { type: 'video/mp4' }))
  });
}) as any;

describe('Challenger 2 - Empirical Stress Harness: Milestone 2', () => {

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    lastGenerateVideosPayload = null;
    vi.clearAllMocks();
  });

  // =========================================================================
  // Scope 1: Storage Security Isolation: LocalStorage vs SessionStorage
  // =========================================================================
  describe('Scope 1: Storage Security Isolation', () => {
    const TEST_API_KEY = ['AIzaSy', 'ChallengerSecretSessionKey_777'].join('');

    it('S1.1 - saveModelPreferences persists ONLY model config and NEVER writes gemini_api_key to localStorage', () => {
      // Seed sessionStorage with active user key
      sessionStorage.setItem('gemini_api_key', TEST_API_KEY);

      // Save Pro preferences
      saveModelPreferences('pro', CANONICAL_MODEL_PRESETS.pro);

      // Assert localStorage keys
      expect(localStorage.getItem('gemini_api_key')).toBeNull();
      expect(localStorage.getItem('explodeit_model_preferences')).toBeTruthy();
      expect(localStorage.getItem('explodeit_model_config_v1')).toBeTruthy();

      // Save Budget preferences
      saveModelPreferences('budget', CANONICAL_MODEL_PRESETS.budget);
      expect(localStorage.getItem('gemini_api_key')).toBeNull();

      // Save Custom preferences
      const customConfig: StageModelConfig = {
        planning: 'gemini-3.8-flash',
        infographic: 'gemini-3.1-flash-image',
        assembled: 'gemini-3.1-flash-image',
        video: 'veo-3.1-generate-preview',
        narration: 'gemini-3.5-flash-lite',
        enableVideo: false
      };
      saveModelPreferences('custom', customConfig);
      expect(localStorage.getItem('gemini_api_key')).toBeNull();

      // Assert sessionStorage is strictly untouched
      expect(sessionStorage.getItem('gemini_api_key')).toBe(TEST_API_KEY);
    });

    it('S1.2 - Exhaustive scan of localStorage keys and values confirms zero credential tokens', () => {
      sessionStorage.setItem('gemini_api_key', TEST_API_KEY);

      saveModelPreferences('pro', CANONICAL_MODEL_PRESETS.pro);
      saveModelPreferences('budget', CANONICAL_MODEL_PRESETS.budget);

      const allKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) allKeys.push(key);
      }

      // Assert no key contains sensitive substrings
      for (const key of allKeys) {
        expect(key.toLowerCase()).not.toContain('api_key');
        expect(key.toLowerCase()).not.toContain('apikey');
        expect(key.toLowerCase()).not.toContain('secret');
        expect(key.toLowerCase()).not.toContain('token');

        const value = localStorage.getItem(key) || '';
        // Value must not contain the user's secret API key
        expect(value).not.toContain(TEST_API_KEY);
        expect(value).not.toContain('AIzaSy');
      }

      // Assert sessionStorage still retains the key strictly
      expect(sessionStorage.getItem('gemini_api_key')).toBe(TEST_API_KEY);
    });

    it('S1.3 - SessionStorage strictly retains API key across preference switches and reloads', () => {
      sessionStorage.setItem('gemini_api_key', TEST_API_KEY);

      // Simulate UI switching between Pro and Budget 50 times in rapid succession
      for (let i = 0; i < 50; i++) {
        const tier: ModelTier = i % 2 === 0 ? 'pro' : 'budget';
        saveModelPreferences(tier, CANONICAL_MODEL_PRESETS[tier]);
        const loaded = loadModelPreferences();
        expect(loaded.tier).toBe(tier);
      }

      // Verify sessionStorage key was never overwritten or deleted
      expect(sessionStorage.getItem('gemini_api_key')).toBe(TEST_API_KEY);
      expect(localStorage.getItem('gemini_api_key')).toBeNull();
    });

    it('S1.4 - Adversarial injection: malicious properties in custom config do not leak or compromise isolation', () => {
      sessionStorage.setItem('gemini_api_key', TEST_API_KEY);

      // Malicious attempt to pass apiKey inside config object
      const maliciousConfig: any = {
        ...CANONICAL_MODEL_PRESETS.pro,
        apiKey: TEST_API_KEY,
        gemini_api_key: TEST_API_KEY,
        secretToken: 'Bearer secret-token-injection'
      };

      saveModelPreferences('custom', maliciousConfig);

      // Verify localStorage explicitly does not contain gemini_api_key as a top-level key
      expect(localStorage.getItem('gemini_api_key')).toBeNull();
      // Verify sessionStorage remains unaffected
      expect(sessionStorage.getItem('gemini_api_key')).toBe(TEST_API_KEY);
    });
  });

  // =========================================================================
  // Scope 2: Veo Video Start/End Frame Alignment Logic in geminiService.ts
  // =========================================================================
  describe('Scope 2: Veo Video Start/End Frame Alignment Logic', () => {
    const ASSEMBLED_RAW = 'ASSEMBLED_HERO_IMAGE_BYTES_111222333';
    const INFOGRAPHIC_RAW = 'INFOGRAPHIC_EXPLODED_IMAGE_BYTES_444555666';

    const ASSEMBLED_URL_PNG = `data:image/png;base64,${ASSEMBLED_RAW}`;
    const INFOGRAPHIC_URL_PNG = `data:image/png;base64,${INFOGRAPHIC_RAW}`;
    const ASSEMBLED_URL_JPEG = `data:image/jpeg;base64,${ASSEMBLED_RAW}`;
    const INFOGRAPHIC_URL_WEBP = `data:image/webp;base64,${INFOGRAPHIC_RAW}`;

    beforeEach(() => {
      setGlobalApiKey('test-valid-api-key');
    });

    it('S2.1 - Assembly mode: start frame receives infographic (exploded) and end frame receives assembled (hero)', async () => {
      await generateVideo(
        'Vintage Camera',
        'PHYSICAL',
        'Exploded View',
        ASSEMBLED_URL_PNG,
        INFOGRAPHIC_URL_PNG,
        { mode: 'assembly' }
      );

      expect(lastGenerateVideosPayload).toBeDefined();
      
      // Start frame MUST be exploded infographic
      expect(lastGenerateVideosPayload.image.imageBytes).toBe(INFOGRAPHIC_RAW);
      expect(lastGenerateVideosPayload.image.mimeType).toBe('image/png');

      // End frame (lastFrame) MUST be assembled hero shot
      expect(lastGenerateVideosPayload.config.lastFrame.imageBytes).toBe(ASSEMBLED_RAW);
      expect(lastGenerateVideosPayload.config.lastFrame.mimeType).toBe('image/png');

      // Prompt text MUST match VIDEO_ASSEMBLY kinematic directives
      const expectedPrompt = PROMPTS.VIDEO_ASSEMBLY('Vintage Camera', 'PHYSICAL', 'Exploded View');
      expect(lastGenerateVideosPayload.prompt).toBe(expectedPrompt);
      expect(lastGenerateVideosPayload.prompt).toContain('8K assembly');
      expect(lastGenerateVideosPayload.prompt).toContain('Phase 1 (Glide & Trajectory - Axial Trajectory Convergence)');
      expect(lastGenerateVideosPayload.prompt).toContain('Phase 4 (Final Sealing & Complete State Shine)');
      expect(lastGenerateVideosPayload.prompt).toContain('**Initial Frame (Start State):** Perfectly matches the disassembled');
      expect(lastGenerateVideosPayload.prompt).toContain('**Final Frame (End State):** The object rests completely unified, intact, and assembled');
    });

    it('S2.2 - Disassembly mode: start frame receives assembled (hero) and end frame receives infographic (exploded)', async () => {
      await generateVideo(
        'Vintage Camera',
        'PHYSICAL',
        'Exploded View',
        ASSEMBLED_URL_PNG,
        INFOGRAPHIC_URL_PNG,
        { mode: 'disassembly' }
      );

      expect(lastGenerateVideosPayload).toBeDefined();

      // Start frame MUST be assembled hero shot
      expect(lastGenerateVideosPayload.image.imageBytes).toBe(ASSEMBLED_RAW);
      expect(lastGenerateVideosPayload.image.mimeType).toBe('image/png');

      // End frame (lastFrame) MUST be exploded infographic
      expect(lastGenerateVideosPayload.config.lastFrame.imageBytes).toBe(INFOGRAPHIC_RAW);
      expect(lastGenerateVideosPayload.config.lastFrame.mimeType).toBe('image/png');

      // Prompt text MUST match VIDEO_DISASSEMBLY kinematic directives
      const expectedPrompt = PROMPTS.VIDEO_DISASSEMBLY('Vintage Camera', 'PHYSICAL', 'Exploded View');
      expect(lastGenerateVideosPayload.prompt).toBe(expectedPrompt);
      expect(lastGenerateVideosPayload.prompt).toContain('8K disassembly');
      expect(lastGenerateVideosPayload.prompt).toContain('Phase 1 (Unsealing & Outer Enclosure)');
      expect(lastGenerateVideosPayload.prompt).toContain('Phase 4 (Axial Drift & Zero-Gravity Overview)');
      expect(lastGenerateVideosPayload.prompt).toContain('**Initial Frame (Start State):** The object rests completely unified, intact, and assembled');
      expect(lastGenerateVideosPayload.prompt).toContain('**Final Frame (End State):** Perfectly matches the disassembled');
    });

    it('S2.3 - App.tsx generation pipeline call pattern: verifies exact argument mapping and default assembly mode', async () => {
      // In App.tsx line 304:
      // generateVideo(prompt, plan.domainType, plan.visualMetaphor, assembledImg.url, infoImg.url, currentConfig)
      const currentConfig: StageModelConfig = { ...CANONICAL_MODEL_PRESETS.pro };

      await generateVideo(
        'Mechanical Watch',
        'PHYSICAL',
        'Modular Exploded',
        ASSEMBLED_URL_PNG, // 4th param: assembledUrl
        INFOGRAPHIC_URL_PNG, // 5th param: infographicUrl
        currentConfig // 6th param: stageModelOverride (StageModelConfig)
      );

      expect(lastGenerateVideosPayload).toBeDefined();

      // Default mode without explicit 'mode' field MUST be 'assembly'
      expect(lastGenerateVideosPayload.image.imageBytes).toBe(INFOGRAPHIC_RAW);
      expect(lastGenerateVideosPayload.config.lastFrame.imageBytes).toBe(ASSEMBLED_RAW);
      expect(lastGenerateVideosPayload.model).toBe(currentConfig.video);
      expect(lastGenerateVideosPayload.prompt).toContain('8K assembly');
      expect(lastGenerateVideosPayload.prompt).toContain('Phase 1 (Glide & Trajectory - Axial Trajectory Convergence)');
    });

    it('S2.4 - Default and string override: defaults to assembly mode and respects custom model identifier', async () => {
      // Undefined stageModelOverride
      await generateVideo(
        'Drone Motor',
        'PHYSICAL',
        'Exploded View',
        ASSEMBLED_URL_PNG,
        INFOGRAPHIC_URL_PNG,
        undefined
      );
      expect(lastGenerateVideosPayload.model).toBe(MODEL_VIDEO);
      expect(lastGenerateVideosPayload.image.imageBytes).toBe(INFOGRAPHIC_RAW);
      expect(lastGenerateVideosPayload.config.lastFrame.imageBytes).toBe(ASSEMBLED_RAW);

      // String stageModelOverride
      await generateVideo(
        'Drone Motor',
        'PHYSICAL',
        'Exploded View',
        ASSEMBLED_URL_PNG,
        INFOGRAPHIC_URL_PNG,
        'veo-custom-experimental'
      );
      expect(lastGenerateVideosPayload.model).toBe('veo-custom-experimental');
      expect(lastGenerateVideosPayload.image.imageBytes).toBe(INFOGRAPHIC_RAW);
      expect(lastGenerateVideosPayload.config.lastFrame.imageBytes).toBe(ASSEMBLED_RAW);
    });

    it('S2.5 - Data URI prefix stripping: handles png, jpeg, webp, and raw base64 without corruption', async () => {
      // JPEG assembled, WEBP infographic
      await generateVideo(
        'Turbine',
        'PHYSICAL',
        'Exploded View',
        ASSEMBLED_URL_JPEG,
        INFOGRAPHIC_URL_WEBP,
        { mode: 'assembly' }
      );
      expect(lastGenerateVideosPayload.image.imageBytes).toBe(INFOGRAPHIC_RAW);
      expect(lastGenerateVideosPayload.config.lastFrame.imageBytes).toBe(ASSEMBLED_RAW);

      // Raw base64 strings without data: URI prefix
      await generateVideo(
        'Turbine',
        'PHYSICAL',
        'Exploded View',
        ASSEMBLED_RAW,
        INFOGRAPHIC_RAW,
        { mode: 'assembly' }
      );
      expect(lastGenerateVideosPayload.image.imageBytes).toBe(INFOGRAPHIC_RAW);
      expect(lastGenerateVideosPayload.config.lastFrame.imageBytes).toBe(ASSEMBLED_RAW);
    });
  });

  // =========================================================================
  // Scope 3: UI State Fallback & Robustness
  // =========================================================================
  describe('Scope 3: UI State Fallback & Robustness', () => {

    it('S3.1 - loadModelPreferences: gracefully restores canonical Pro Studio defaults when localStorage is empty', () => {
      const result = loadModelPreferences();
      expect(result.tier).toBe('pro');
      expect(result.config).toEqual(CANONICAL_MODEL_PRESETS.pro);
      expect(result.config.planning).toBe(CANONICAL_MODEL_PRESETS.pro.planning);
      expect(result.config.infographic).toBe(CANONICAL_MODEL_PRESETS.pro.infographic);
      expect(result.config.assembled).toBe(CANONICAL_MODEL_PRESETS.pro.assembled);
      expect(result.config.video).toBe(CANONICAL_MODEL_PRESETS.pro.video);
      expect(result.config.narration).toBe(CANONICAL_MODEL_PRESETS.pro.narration);
      expect(result.config.enableVideo).toBe(true);
    });

    it('S3.2 - loadModelPreferences: survives corrupted/malformed JSON in localStorage and restores defaults', () => {
      // Malformed syntax
      localStorage.setItem('explodeit_model_preferences', '{invalid-json-content: true');
      const res1 = loadModelPreferences();
      expect(res1.tier).toBe('pro');
      expect(res1.config).toEqual(CANONICAL_MODEL_PRESETS.pro);

      // Non-object primitive JSON values
      localStorage.setItem('explodeit_model_preferences', 'null');
      expect(loadModelPreferences().tier).toBe('pro');

      localStorage.setItem('explodeit_model_preferences', '12345');
      expect(loadModelPreferences().tier).toBe('pro');

      localStorage.setItem('explodeit_model_preferences', '"random-string"');
      expect(loadModelPreferences().tier).toBe('pro');

      localStorage.setItem('explodeit_model_preferences', '[]');
      expect(loadModelPreferences().tier).toBe('pro');

      // Invalid tier name
      localStorage.setItem('explodeit_model_preferences', JSON.stringify({ tier: 'ultra-premium-unknown', config: {} }));
      const res2 = loadModelPreferences();
      expect(res2.tier).toBe('pro');
    });

    it('S3.3 - loadModelPreferences: backward-compatible recovery from legacy contract key (explodeit_model_config_v1)', () => {
      // When primary key is missing, but legacy key exists with enableVideo: false
      localStorage.setItem('explodeit_model_config_v1', JSON.stringify({
        planning: 'gemini-2.5-flash',
        enableVideo: false
      }));

      const resBudget = loadModelPreferences();
      expect(resBudget.tier).toBe('budget');
      expect(resBudget.config.planning).toBe('gemini-2.5-flash');
      expect(resBudget.config.enableVideo).toBe(false);
      // Fallback fields merged from pro preset
      expect(resBudget.config.infographic).toBe(CANONICAL_MODEL_PRESETS.pro.infographic);

      // When legacy key exists with enableVideo: true
      localStorage.setItem('explodeit_model_config_v1', JSON.stringify({
        enableVideo: true
      }));

      const resPro = loadModelPreferences();
      expect(resPro.tier).toBe('pro');
      expect(resPro.config.enableVideo).toBe(true);
    });

    it('S3.4 - loadModelPreferences: survives storage exceptions (e.g. SecurityError in private browsing)', () => {
      const originalGetItem = localStorage.getItem;
      try {
        localStorage.getItem = vi.fn().mockImplementation(() => {
          throw new Error('SecurityError: The operation is insecure / Storage access denied');
        });

        const res = loadModelPreferences();
        expect(res.tier).toBe('pro');
        expect(res.config).toEqual(CANONICAL_MODEL_PRESETS.pro);
      } finally {
        localStorage.getItem = originalGetItem;
      }
    });

    it('S3.5 - Sidebar rendering: renders history items with missing tier and config cleanly without exceptions', () => {
      const legacyItemWithVideo: GenerationItem = {
        id: 'legacy-item-1',
        prompt: 'Vintage Turntable',
        timestamp: Date.now() - 60000,
        plan: mockCameraPlan,
        components: mockCameraComponents,
        narrationScript: 'Audio narration script...',
        infographicUrl: 'data:image/png;base64,info...',
        assembledUrl: 'data:image/png;base64,assembled...',
        videoUrl: 'blob:http://localhost/video-1',
        audioUrl: 'blob:http://localhost/audio-1',
        hasVideo: true,
        usage: [{ model: 'gemini-3.1-pro-preview', inputTokens: 500, outputTokens: 200, costEstimate: 0.005 }],
        tier: undefined,
        config: undefined
      };

      const legacyItemImageOnly: GenerationItem = {
        id: 'legacy-item-2',
        prompt: 'Steam Engine',
        timestamp: Date.now() - 120000,
        plan: mockCameraPlan,
        components: mockCameraComponents,
        narrationScript: null,
        infographicUrl: 'data:image/png;base64,info...',
        assembledUrl: 'data:image/png;base64,assembled...',
        videoUrl: null,
        audioUrl: null,
        hasVideo: false,
        usage: [{ model: 'gemini-3.1-pro-preview', inputTokens: 300, outputTokens: 100, costEstimate: 0.002 }],
        tier: undefined,
        config: undefined
      };

      const onSelectMock = vi.fn();
      const onClearMock = vi.fn();
      const onChangeKeyMock = vi.fn();

      const { container } = render(
        <Sidebar
          history={[legacyItemWithVideo, legacyItemImageOnly]}
          currentId="legacy-item-1"
          onSelect={onSelectMock}
          onClear={onClearMock}
          onChangeKey={onChangeKeyMock}
          hasKey={true}
          currentTier="pro"
          currentConfig={CANONICAL_MODEL_PRESETS.pro}
        />
      );

      // Verify rendered text for both legacy items
      expect(screen.getByText('Vintage Turntable')).toBeInTheDocument();
      expect(screen.getByText('Steam Engine')).toBeInTheDocument();

      // Legacy fallback badge verification:
      // item.tier ? ... : (item.hasVideo ? 'Video' : 'Image')
      expect(screen.getByText('Video')).toBeInTheDocument();
      expect(screen.getByText('Image')).toBeInTheDocument();

      // Total session intelligence calculation operates without crashing
      expect(screen.getByText('Session Intelligence')).toBeInTheDocument();
      expect(container).toBeDefined();
    });

    it('S3.6 - DisplayArea rendering: renders legacy item with missing tier/config in COMPLETED state cleanly with canonical fallback badges', () => {
      const legacyCompletedItem: GenerationItem = {
        id: 'legacy-complete-1',
        prompt: 'Twin-Lens Reflex Camera',
        timestamp: Date.now(),
        plan: mockCameraPlan,
        components: mockCameraComponents,
        narrationScript: 'Vintage camera narration script...',
        infographicUrl: 'https://example.com/mock-infographic.png',
        assembledUrl: 'https://example.com/mock-assembled.png',
        videoUrl: 'https://example.com/mock-video.mp4',
        audioUrl: 'https://example.com/mock-audio.mp3',
        hasVideo: true,
        usage: [],
        tier: undefined,
        config: undefined
      };

      const { container } = render(
        <DisplayArea
          item={legacyCompletedItem}
          status={GenerationStatus.COMPLETED}
        />
      );

      // Verify display title and section titles render cleanly
      expect(screen.getByText('Twin-Lens Reflex (TLR) Camera')).toBeInTheDocument();
      expect(screen.getByText('Dual Optical Paths & Leaf Shutter Mechanics')).toBeInTheDocument();

      // Verify fallback model badges when item.config is undefined:
      // Video slot badge and tech specs both render 'VEO 3.1'
      const veoElements = screen.getAllByText('VEO 3.1');
      expect(veoElements.length).toBeGreaterThanOrEqual(1);

      // Infographic badge: getModelLabel(item?.config?.infographic, 'GEMINI 3 PRO IMAGE') -> 'GEMINI 3 PRO IMAGE'
      const infoElements = screen.getAllByText('GEMINI 3 PRO IMAGE');
      expect(infoElements.length).toBeGreaterThanOrEqual(1);

      // Tech specs panel: PLANNING -> GEMINI 3.1 PRO, TIER -> PRO STUDIO
      expect(screen.getByText('GEMINI 3.1 PRO')).toBeInTheDocument();
      expect(screen.getByText('PRO STUDIO')).toBeInTheDocument();

      // Ensure no exceptions occurred
      expect(container).toBeDefined();
    });

    it('S3.7 - DisplayArea rendering: renders image-only legacy item (hasVideo: false) cleanly', () => {
      const legacyImageOnlyItem: GenerationItem = {
        id: 'legacy-image-only-1',
        prompt: 'Twin-Lens Reflex Camera',
        timestamp: Date.now(),
        plan: mockCameraPlan,
        components: mockCameraComponents,
        narrationScript: null,
        infographicUrl: 'https://example.com/mock-infographic.png',
        assembledUrl: 'https://example.com/mock-assembled.png',
        videoUrl: null,
        audioUrl: null,
        hasVideo: false,
        usage: [],
        tier: undefined,
        config: undefined
      };

      render(
        <DisplayArea
          item={legacyImageOnlyItem}
          status={GenerationStatus.COMPLETED}
        />
      );

      // Render spec must display 'DISABLED (IMAGE ONLY)'
      expect(screen.getByText('DISABLED (IMAGE ONLY)')).toBeInTheDocument();
    });

    it('S3.8 - ProgressTracker rendering: operates cleanly when config is undefined', () => {
      const { container } = render(
        <ProgressTracker
          status={GenerationStatus.PLANNING}
          config={undefined}
        />
      );

      // Planning step title and default model subtitle
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Gemini 3.8 Flash')).toBeInTheDocument();
      expect(container).toBeDefined();

      // Also verify Blueprinting state
      const { container: containerInfo } = render(
        <ProgressTracker
          status={GenerationStatus.GENERATING_INFOGRAPHIC}
          config={undefined}
        />
      );
      expect(screen.getByText('Blueprinting')).toBeInTheDocument();
      expect(containerInfo).toBeDefined();
    });
  });
});
