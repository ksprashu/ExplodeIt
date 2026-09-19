import { describe, it, expect } from 'vitest';
import { 
  MODEL_PLANNING, 
  MODEL_AUTHORING, 
  MODEL_SCRIPT, 
  MODEL_IMAGE, 
  MODEL_VIDEO, 
  MODEL_TTS, 
  MODEL_SURPRISE, 
  PRICING, 
  PROMPTS, 
  PlanSchema 
} from '../constants';
import { revokeGenerationAssets, setGlobalApiKey, calculateCost } from '../services/geminiService';
import { GenerationItem } from '../types';

describe('Constants & Model Configuration', () => {
  it('should define all production Google GenAI model identifiers', () => {
    expect(MODEL_PLANNING).toBe('gemini-3.8-flash');
    expect(MODEL_AUTHORING).toBe('gemini-3.8-flash');
    expect(MODEL_SCRIPT).toBe('gemini-3.5-flash-lite');
    expect(MODEL_IMAGE).toBe('gemini-3-pro-image');
    expect(MODEL_VIDEO).toBe('veo-3.1-generate-preview');
    expect(MODEL_TTS).toBe('gemini-3.1-flash-tts-preview');
    expect(MODEL_SURPRISE).toBe('gemini-3.8-flash');
  });

  it('should have pricing rates defined for all model stages', () => {
    expect(PRICING[MODEL_PLANNING].inputPer1kTokens).toBe(0.0003);
    expect(PRICING[MODEL_PLANNING].outputPer1kTokens).toBe(0.0025);
    expect(PRICING[MODEL_AUTHORING].inputPer1kTokens).toBe(0.0003);
    expect(PRICING[MODEL_AUTHORING].outputPer1kTokens).toBe(0.0025);
    expect(PRICING[MODEL_SCRIPT].inputPer1kTokens).toBe(0.0001);
    expect(PRICING[MODEL_SCRIPT].outputPer1kTokens).toBe(0.0004);
    expect(PRICING[MODEL_IMAGE].perImage).toBe(0.134);
    expect(PRICING[MODEL_VIDEO].perVideo).toBe(2.00);
    expect(PRICING[MODEL_TTS].per1kChars).toBe(0.002);
  });

  it('should generate properly parameterized prompts for all pipeline stages', () => {
    const plan = PROMPTS.PLAN_OBJECT('Vintage Camera');
    expect(plan).toContain('Vintage Camera');
    expect(plan).toContain('domainType');

    const info = PROMPTS.INFOGRAPHIC('Vintage Camera', 'Studio photorealistic', ['Lens', 'Shutter'], 'PHYSICAL', 'Exploded View');
    expect(info).toContain('Exploded View');
    expect(info).toContain('Lens, Shutter');

    const assembled = PROMPTS.ASSEMBLED('Vintage Camera', 'Vintage 35mm Camera', 'Rangefinder camera', 'PHYSICAL');
    expect(assembled).toContain('Finished Product');

    const deepDive = PROMPTS.DEEP_DIVE('Vintage Camera', ['Lens', 'Shutter']);
    expect(deepDive).toContain('Component Analysis');

    const video = PROMPTS.VIDEO('Vintage Camera', 'PHYSICAL', 'Exploded View');
    expect(video).toContain('Cinematic technical animation');

    const narration = PROMPTS.NARRATION_SCRIPT('Vintage Camera', 'Origin story', 'Detailed article', ['Fact 1']);
    expect(narration).toContain('Vintage Camera');
  });

  it('should have a compliant PlanSchema definition', () => {
    expect(PlanSchema.required).toContain('displayTitle');
    expect(PlanSchema.required).toContain('domainType');
    expect(PlanSchema.required).toContain('componentList');
    expect(PlanSchema.required).toContain('sectionTitles');
    expect(PlanSchema.required).toContain('audioVibe');
  });
});

describe('Asset Management & Revocation Logic', () => {
  it('should revoke blob URLs when present on generation items', () => {
    const revokedUrls: string[] = [];
    const originalRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (url: string) => {
      revokedUrls.push(url);
    };

    try {
      const mockItem: GenerationItem = {
        id: 'item-101',
        prompt: 'Mechanical Wristwatch',
        timestamp: Date.now(),
        plan: null,
        components: [],
        narrationScript: null,
        infographicUrl: 'data:image/png;base64,iVBORw0KGgo...',
        assembledUrl: 'data:image/png;base64,iVBORw0KGgo...',
        videoUrl: 'blob:http://localhost:3000/video-blob-123',
        audioUrl: 'blob:http://localhost:3000/audio-blob-456',
        hasVideo: true,
        usage: []
      };

      revokeGenerationAssets(mockItem);
      expect(revokedUrls).toEqual([
        'blob:http://localhost:3000/video-blob-123',
        'blob:http://localhost:3000/audio-blob-456'
      ]);
    } finally {
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it('should safely ignore non-blob or null asset URLs during cleanup', () => {
    const revokedUrls: string[] = [];
    const originalRevoke = URL.revokeObjectURL;
    URL.revokeObjectURL = (url: string) => {
      revokedUrls.push(url);
    };

    try {
      const mockItem: GenerationItem = {
        id: 'item-102',
        prompt: 'Cloud Architecture',
        timestamp: Date.now(),
        plan: null,
        components: [],
        narrationScript: null,
        infographicUrl: null,
        assembledUrl: null,
        videoUrl: null,
        audioUrl: 'https://cdn.example.com/audio.wav',
        hasVideo: false,
        usage: []
      };

      revokeGenerationAssets(mockItem);
      expect(revokedUrls.length).toBe(0);
    } finally {
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it('should support dynamic API key configuration', () => {
    expect(() => setGlobalApiKey('AIzaSyCustomKeyTest123')).not.toThrow();
  });
});

describe('Pricing & Cost Calculation via Services', () => {
  it('should calculate accurate costs for Gemini 3.x models', () => {
    // Planning (Gemini 3.8 Flash): 1,000 in ($0.0003), 2,000 out (2 * $0.0025 = $0.005) -> $0.0053
    const planCost = calculateCost(MODEL_PLANNING, 1000, 2000);
    expect(planCost).toBeCloseTo(0.0053, 5);

    // Deep Dive / Authoring (Gemini 3.8 Flash): 1,000 in ($0.0003), 2,000 out (2 * $0.0025 = $0.005) -> $0.0053
    const authorCost = calculateCost(MODEL_AUTHORING, 1000, 2000);
    expect(authorCost).toBeCloseTo(0.0053, 5);

    // Script (Gemini 3.5 Flash Lite): 1,000 in ($0.0001), 2,000 out (2 * $0.0004 = $0.0008) -> $0.0009
    const scriptCost = calculateCost(MODEL_SCRIPT, 1000, 2000);
    expect(scriptCost).toBeCloseTo(0.0009, 5);

    // Media (Image - Gemini 3 Pro Image)
    const imageCost = calculateCost(MODEL_IMAGE, 0, 0, true);
    expect(imageCost).toBe(0.134);

    // Media (Video - Veo 3.1)
    const videoCost = calculateCost(MODEL_VIDEO, 0, 0, true);
    expect(videoCost).toBe(2.00);

    // TTS: 1,500 chars (passed as input)
    const ttsCost = calculateCost(MODEL_TTS, 1500, 0);
    expect(ttsCost).toBeCloseTo(0.003, 5);
  });
});

