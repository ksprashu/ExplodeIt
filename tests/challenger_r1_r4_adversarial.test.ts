import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { 
  MODEL_PLANNING, 
  CANONICAL_MODEL_PRESETS,
  MODEL_PRESETS,
  PRICING, 
  PROMPTS, 
  PlanSchema,
  calculateModelCost
} from '../constants';
import { calculateCost, planObject, generateVideo, setGlobalApiKey } from '../services/geminiService';
import { ObjectPlan } from '../types';

const mockInteractionsCreate = vi.fn();
const mockGenerateVideos = vi.fn();
const mockGetVideosOperation = vi.fn();

vi.mock('@google/genai', () => {
  return {
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
    },
    GoogleGenAI: class MockGoogleGenAI {
      constructor(public options: { apiKey: string }) {}
      interactions = {
        create: mockInteractionsCreate
      };
      models = {
        generateVideos: mockGenerateVideos,
        generateImages: vi.fn()
      };
      operations = {
        getVideosOperation: mockGetVideosOperation,
        get: mockGetVideosOperation
      };
    }
  };
});

describe('Challenger 1: R1 & R4 Adversarial Verification Harness', () => {
  beforeEach(() => {
    setGlobalApiKey('AIzaSyTest_ChallengerKey_123');
    mockInteractionsCreate.mockReset();
    mockGenerateVideos.mockReset();
    mockGetVideosOperation.mockReset();
    vi.restoreAllMocks();
  });

  const createDummyPlan = (): ObjectPlan => ({
    displayTitle: 'Vintage SLR Camera',
    category: 'Photography',
    domainType: 'PHYSICAL',
    visualMetaphor: 'Exploded View',
    sectionTitles: {
      origin: 'Optical History',
      anatomy: 'Anatomical Structure',
      article: 'Mechanics of Photography',
      trivia: 'Camera Curiosities'
    },
    originStory: 'Invented in the early 20th century.',
    detailedArticle: 'Comprehensive breakdown of optics and precision focal plane shutter mechanics.',
    componentList: ['Lens Element', 'Focal Plane Shutter', 'Pentaprism'],
    trivia: ['Over 1,000 precision parts.', 'First SLR was invented in 1861.'],
    visualStylePrompt: 'Hyper-detailed technical render',
    audioVibe: {
      voiceName: 'Kore',
      toneDescription: 'Classic documentary tone'
    },
    cleanExplodedPrompt: 'Pristine 3D exploded view of Vintage SLR Camera with zero 2D text.',
    cleanAssembledPrompt: 'Finished assembled studio view of Vintage SLR Camera at 45 degree isometric perspective.',
    videoAssemblyPrompt: 'Kinematic assembly animation of Vintage SLR Camera with lens threading and chassis locking.',
    videoDisassemblyPrompt: 'Kinematic disassembly animation of Vintage SLR Camera with radial unseating.',
    kinematicDetails: 'Shutter actuation and mirror flip mechanics during 1/1000s exposure.'
  });

  // =========================================================================
  // Dimension 1: Parameter Propagation (planObject & thinkingConfig)
  // =========================================================================
  describe('Dimension 1: Parameter Propagation in planObject', () => {
    it('propagates thinkingConfig: { thinkingLevel: HIGH } by default', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: JSON.stringify(createDummyPlan()),
        usage: { total_input_tokens: 500, total_output_tokens: 1000 }
      });

      await planObject('Mechanical Watch');

      expect(mockInteractionsCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.thinkingConfig).toEqual({ thinkingLevel: 'HIGH' });
      expect(callArgs.generation_config).toEqual({ thinking_level: 'HIGH' });
    });

    it('maintains thinkingConfig when stageModelOverride is a string model ID', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: JSON.stringify(createDummyPlan()),
        usage: { total_input_tokens: 500, total_output_tokens: 1000 }
      });

      await planObject('Mechanical Watch', 'gemini-3.8-flash');

      expect(mockInteractionsCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('gemini-3.8-flash');
      expect(callArgs.thinkingConfig).toEqual({ thinkingLevel: 'HIGH' });
      expect(callArgs.generation_config).toEqual({ thinking_level: 'HIGH' });
    });

    it('maintains thinkingConfig when stageModelOverride is a StageModelConfig object', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: JSON.stringify(createDummyPlan()),
        usage: { total_input_tokens: 500, total_output_tokens: 1000 }
      });

      await planObject('Mechanical Watch', { planning: 'custom-model-id' });

      expect(mockInteractionsCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe('custom-model-id');
      expect(callArgs.thinkingConfig).toEqual({ thinkingLevel: 'HIGH' });
      expect(callArgs.generation_config).toEqual({ thinking_level: 'HIGH' });
    });
  });

  // =========================================================================
  // Dimension 2: Pricing Invariants & Edge Cases (gemini-3.8-flash)
  // =========================================================================
  describe('Dimension 2: Pricing Engine Invariants & Edge Cases', () => {
    it('calculates exact cost for gemini-3.8-flash at boundary and standard token counts', () => {
      // Rates: input = $0.0003 / 1k ($0.0000003 / token), output = $0.0025 / 1k ($0.0000025 / token)
      
      // 0 tokens
      expect(calculateModelCost('gemini-3.8-flash', 0, 0)).toBe(0);
      expect(calculateCost('gemini-3.8-flash', 0, 0)).toBe(0);

      // 100k tokens in and out: (100000 * 0.0003 / 1000) + (100000 * 0.0025 / 1000) = 0.03 + 0.25 = 0.28
      expect(calculateModelCost('gemini-3.8-flash', 100000, 100000)).toBeCloseTo(0.28, 5);
      expect(calculateCost('gemini-3.8-flash', 100000, 100000)).toBeCloseTo(0.28, 5);

      // Float boundary tokens
      const floatIn = 1234.56;
      const floatOut = 9876.54;
      const expectedCost = (floatIn * 0.0003 / 1000) + (floatOut * 0.0025 / 1000);
      expect(calculateModelCost('gemini-3.8-flash', floatIn, floatOut)).toBeCloseTo(expectedCost, 6);

      // Negative token counts safely clamp to 0 without returning negative cost
      expect(calculateModelCost('gemini-3.8-flash', -500, -1000)).toBe(0);

      // Undefined or null token counts default safely to 0
      expect(calculateModelCost('gemini-3.8-flash', undefined, undefined)).toBe(0);
    });

    it('asserts R1 model planning constants and preset configurations', () => {
      // DISPATCH R1 requirement: MODEL_PLANNING must be 'gemini-3.8-flash'
      expect(MODEL_PLANNING).toBe('gemini-3.8-flash');
      expect(CANONICAL_MODEL_PRESETS.pro.planning).toBe('gemini-3.8-flash');
      expect(CANONICAL_MODEL_PRESETS.budget.planning).toBe('gemini-3.8-flash');
      expect(CANONICAL_MODEL_PRESETS.custom.planning).toBe('gemini-3.8-flash');
      expect(PRICING[MODEL_PLANNING].inputPer1kTokens).toBe(0.0003);
      expect(PRICING[MODEL_PLANNING].outputPer1kTokens).toBe(0.0025);
    });
  });

  // =========================================================================
  // Dimension 3: PlanSchema Required Keys & Kinematic Extensions
  // =========================================================================
  describe('Dimension 3: PlanSchema Kinematic Keys Enforcement', () => {
    it('strictly enforces all 5 kinematic keys in PlanSchema.properties', () => {
      const props = (PlanSchema as any).properties;
      expect(props).toBeDefined();
      expect(props.cleanExplodedPrompt).toBeDefined();
      expect(props.cleanAssembledPrompt).toBeDefined();
      expect(props.videoAssemblyPrompt).toBeDefined();
      expect(props.videoDisassemblyPrompt).toBeDefined();
      expect(props.kinematicDetails).toBeDefined();
    });

    it('strictly enforces all 5 kinematic keys in PlanSchema.required', () => {
      const req = (PlanSchema as any).required;
      expect(req).toBeDefined();
      expect(req).toContain('cleanExplodedPrompt');
      expect(req).toContain('cleanAssembledPrompt');
      expect(req).toContain('videoAssemblyPrompt');
      expect(req).toContain('videoDisassemblyPrompt');
      expect(req).toContain('kinematicDetails');
    });

    it('PROMPTS.PLAN_OBJECT instructs the model to generate the 5 kinematic fields', () => {
      const prompt = PROMPTS.PLAN_OBJECT('Mechanical Switch');
      expect(prompt).toContain('cleanExplodedPrompt');
      expect(prompt).toContain('cleanAssembledPrompt');
      expect(prompt).toContain('videoAssemblyPrompt');
      expect(prompt).toContain('videoDisassemblyPrompt');
      expect(prompt).toContain('kinematicDetails');
    });
  });

  // =========================================================================
  // Dimension 4: generateVideo Prompt Resolution Precedence & App Wiring
  // =========================================================================
  describe('Dimension 4: generateVideo Prompt Resolution Precedence', () => {
    const dummyAssembled = 'data:image/png;base64,ASSEMBLED';
    const dummyInfographic = 'data:image/png;base64,INFOGRAPHIC';

    it('prioritizes plan.videoAssemblyPrompt when plan is passed as 7th parameter', async () => {
      mockGenerateVideos.mockResolvedValueOnce({
        done: true,
        response: { generatedVideos: [{ video: { uri: 'http://test/vid.mp4' } }] }
      });
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        blob: async () => new Blob(['vid'], { type: 'video/mp4' })
      } as any);

      const plan = createDummyPlan();
      plan.videoAssemblyPrompt = 'EXPLICIT_PLAN_ASSEMBLY_PROMPT_123';

      await generateVideo('Camera', 'PHYSICAL', 'Exploded View', dummyAssembled, dummyInfographic, undefined, plan);

      expect(mockGenerateVideos).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateVideos.mock.calls[0][0];
      expect(callArgs.prompt).toBe('EXPLICIT_PLAN_ASSEMBLY_PROMPT_123');
    });

    it('prioritizes plan.videoDisassemblyPrompt in disassembly mode when plan is passed in options', async () => {
      mockGenerateVideos.mockResolvedValueOnce({
        done: true,
        response: { generatedVideos: [{ video: { uri: 'http://test/vid.mp4' } }] }
      });
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        blob: async () => new Blob(['vid'], { type: 'video/mp4' })
      } as any);

      const plan = createDummyPlan();
      plan.videoDisassemblyPrompt = 'EXPLICIT_PLAN_DISASSEMBLY_PROMPT_456';

      await generateVideo('Camera', 'PHYSICAL', 'Exploded View', dummyAssembled, dummyInfographic, {
        mode: 'disassembly',
        plan
      });

      expect(mockGenerateVideos).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateVideos.mock.calls[0][0];
      expect(callArgs.prompt).toBe('EXPLICIT_PLAN_DISASSEMBLY_PROMPT_456');
    });

    it('falls back seamlessly to PROMPTS.VIDEO_ASSEMBLY when plan is undefined', async () => {
      mockGenerateVideos.mockResolvedValueOnce({
        done: true,
        response: { generatedVideos: [{ video: { uri: 'http://test/vid.mp4' } }] }
      });
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        blob: async () => new Blob(['vid'], { type: 'video/mp4' })
      } as any);

      await generateVideo('Camera', 'PHYSICAL', 'Exploded View', dummyAssembled, dummyInfographic);

      expect(mockGenerateVideos).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateVideos.mock.calls[0][0];
      const defaultAssemblyPrompt = PROMPTS.VIDEO_ASSEMBLY('Camera', 'PHYSICAL', 'Exploded View');
      expect(callArgs.prompt).toBe(defaultAssemblyPrompt);
    });

    it('falls back seamlessly to PROMPTS.VIDEO_DISASSEMBLY when plan lacks custom prompts', async () => {
      mockGenerateVideos.mockResolvedValueOnce({
        done: true,
        response: { generatedVideos: [{ video: { uri: 'http://test/vid.mp4' } }] }
      });
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        blob: async () => new Blob(['vid'], { type: 'video/mp4' })
      } as any);

      const plan = createDummyPlan();
      delete (plan as any).videoDisassemblyPrompt;

      await generateVideo('Camera', 'PHYSICAL', 'Exploded View', dummyAssembled, dummyInfographic, {
        mode: 'disassembly',
        plan
      });

      expect(mockGenerateVideos).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateVideos.mock.calls[0][0];
      const defaultDisassemblyPrompt = PROMPTS.VIDEO_DISASSEMBLY('Camera', 'PHYSICAL', 'Exploded View');
      expect(callArgs.prompt).toBe(defaultDisassemblyPrompt);
    });

    it('verifies App.tsx passes plan to generateVideo at invocation site', () => {
      const appPath = path.resolve(__dirname, '../App.tsx');
      const appContent = fs.readFileSync(appPath, 'utf-8');
      // Must pass plan as 7th parameter (e.g. generateVideo(cleanPrompt, ..., currentConfig, plan)) or within options object
      const generateVideoCallMatch = appContent.match(/generateVideo\s*\(([^)]+)\)/s);
      expect(generateVideoCallMatch).not.toBeNull();
      const callArgs = generateVideoCallMatch![1].split(',').map(s => s.trim());
      // Expect 7 arguments with the 7th being 'plan'
      expect(callArgs.length).toBeGreaterThanOrEqual(7);
      expect(callArgs[6]).toBe('plan');
    });
  });

  // =========================================================================
  // Dimension 5: Visual Invariants (PROMPTS.INFOGRAPHIC)
  // =========================================================================
  describe('Dimension 5: Visual Invariants in PROMPTS.INFOGRAPHIC', () => {
    it('PROMPTS.INFOGRAPHIC strictly prohibits 2D text, leader lines, and HUDs', () => {
      const prompt = PROMPTS.INFOGRAPHIC('Camera', 'Technical 3D', ['Lens', 'Shutter'], 'PHYSICAL', 'Exploded View');
      expect(prompt).toContain('Pristine 3D Deconstruction');
      expect(prompt).toContain('NO 2D text');
      expect(prompt).not.toContain('Isometric Leader Callout Lines');
    });
  });
});
