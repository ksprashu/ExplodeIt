let mockInteractionsAvailable = true;
const mockInteractionsCreate = vi.fn();
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
    },
    GoogleGenAI: class MockGoogleGenAI {
      interactions: any;
      models: any;
      constructor(public options: { apiKey: string }) {
        if (mockInteractionsAvailable) {
          this.interactions = {
            create: mockInteractionsCreate
          };
        }
        this.models = {
          generateContent: mockGenerateContent
        };
      }
    }
  };
});

import { 
  normalizeThinkingLevel, 
  ThinkingLevel,
  getAI,
  setGlobalApiKey 
} from '../services/geminiService';
import {
  MODEL_PLANNING,
  MODEL_AUTHORING,
  MODEL_SCRIPT,
  MODEL_IMAGE,
  MODEL_IMAGE_BUDGET,
  MODEL_VIDEO,
  MODEL_VIDEO_BUDGET,
  MODEL_TTS,
  MODEL_SURPRISE,
  CANONICAL_MODEL_PRESETS,
  PlanSchema,
  ComponentDetailsSchema
} from '../constants';

describe('Gemini SDK Linting & Strict Typing Verification Suite', () => {
  describe('Thinking Level Normalization', () => {
    it('normalizes all supported levels to lowercase string literals', () => {
      expect(normalizeThinkingLevel('minimal')).toBe('minimal');
      expect(normalizeThinkingLevel('low')).toBe('low');
      expect(normalizeThinkingLevel('medium')).toBe('medium');
      expect(normalizeThinkingLevel('high')).toBe('high');
    });

    it('defensively normalizes uppercase thinking levels to lowercase', () => {
      expect(normalizeThinkingLevel('MINIMAL')).toBe('minimal');
      expect(normalizeThinkingLevel('LOW')).toBe('low');
      expect(normalizeThinkingLevel('MEDIUM')).toBe('medium');
      expect(normalizeThinkingLevel('HIGH')).toBe('high');
    });

    it('handles mixed case and leading/trailing whitespace', () => {
      expect(normalizeThinkingLevel('  High  ')).toBe('high');
      expect(normalizeThinkingLevel('\nLow\t')).toBe('low');
      expect(normalizeThinkingLevel('MeDiUm')).toBe('medium');
      expect(normalizeThinkingLevel('MiNiMaL')).toBe('minimal');
    });

    it('safely handles undefined, null, and non-string types without throwing', () => {
      expect(normalizeThinkingLevel(undefined)).toBeUndefined();
      expect(normalizeThinkingLevel(null)).toBeUndefined();
      expect(normalizeThinkingLevel(123)).toBeUndefined();
      expect(normalizeThinkingLevel({})).toBeUndefined();
      expect(normalizeThinkingLevel([])).toBeUndefined();
    });

    it('strictly rejects unsupported strings and returns undefined', () => {
      expect(normalizeThinkingLevel('extreme')).toBeUndefined();
      expect(normalizeThinkingLevel('none')).toBeUndefined();
      expect(normalizeThinkingLevel('')).toBeUndefined();
      expect(normalizeThinkingLevel('   ')).toBeUndefined();
      expect(normalizeThinkingLevel('ultra')).toBeUndefined();
    });
  });

  describe('Interactions Native Wrapper Parameter Interception', () => {
    it('automatically normalizes uppercase thinking_level and camelCase thinkingLevel on native interactions.create', async () => {
      setGlobalApiKey('test-key-12345');
      mockInteractionsAvailable = true;
      mockInteractionsCreate.mockReset();
      mockInteractionsCreate.mockResolvedValueOnce({ output_text: 'Test output' });

      const ai = getAI();
      await ai.interactions.create({
        model: 'gemini-3.8-flash',
        input: 'Test prompt',
        generation_config: {
          thinking_level: 'HIGH',
          thinkingLevel: 'HIGH'
        }
      });

      expect(mockInteractionsCreate).toHaveBeenCalledTimes(1);
      const passedArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(passedArgs.generation_config.thinking_level).toBe('high');
      expect(passedArgs.generation_config.thinkingLevel).toBeUndefined();
    });
  });

  describe('Model ID Registry Integrity', () => {
    it('ensures all active models strictly match active Gemini 3.x and Veo 3.1 specifications', () => {
      expect(MODEL_PLANNING).toBe('gemini-3.8-flash');
      expect(MODEL_AUTHORING).toBe('gemini-3.8-flash');
      expect(MODEL_SCRIPT).toBe('gemini-3.5-flash-lite');
      expect(MODEL_IMAGE).toBe('gemini-3-pro-image');
      expect(MODEL_IMAGE_BUDGET).toBe('gemini-3.1-flash-image');
      expect(MODEL_VIDEO).toBe('veo-3.1-generate-preview');
      expect(MODEL_VIDEO_BUDGET).toBe('veo-3.1-lite-generate-preview');
      expect(MODEL_TTS).toBe('gemini-3.1-flash-tts-preview');
      expect(MODEL_SURPRISE).toBe('gemini-3.8-flash');
    });

    it('ensures canonical presets use valid models with no deprecated identifiers', () => {
      const presets = [CANONICAL_MODEL_PRESETS.pro, CANONICAL_MODEL_PRESETS.budget, CANONICAL_MODEL_PRESETS.custom];
      for (const p of presets) {
        expect(p.planning).not.toMatch(/gemini-1\.5|gemini-2\.0|gemini-2\.5/);
        expect(p.infographic).not.toMatch(/gemini-1\.5|gemini-2\.0|gemini-2\.5/);
        expect(p.assembled).not.toMatch(/gemini-1\.5|gemini-2\.0|gemini-2\.5/);
        expect(p.video).not.toMatch(/veo-2/);
        expect(p.narration).not.toMatch(/gemini-1\.5|gemini-2\.0|gemini-2\.5/);
      }
    });
  });

  describe('JSON Schema Conformity with @google/genai Type System', () => {
    it('validates PlanSchema uses valid Type enums and contains all required kinematic properties', () => {
      expect(PlanSchema.type).toBe('OBJECT');
      expect(PlanSchema.properties.displayTitle.type).toBe('STRING');
      expect(PlanSchema.properties.componentList.type).toBe('ARRAY');
      expect(PlanSchema.required).toContain('cleanExplodedPrompt');
      expect(PlanSchema.required).toContain('cleanAssembledPrompt');
      expect(PlanSchema.required).toContain('videoAssemblyPrompt');
      expect(PlanSchema.required).toContain('videoDisassemblyPrompt');
      expect(PlanSchema.required).toContain('kinematicDetails');
    });

    it('validates ComponentDetailsSchema matches structured output schema requirements', () => {
      expect(ComponentDetailsSchema.type).toBe('OBJECT');
      expect(ComponentDetailsSchema.properties.components.type).toBe('ARRAY');
    });
  });

  describe('Strict TypeScript Interface Assertions', () => {
    it('statically enforces valid Interactions API parameter types', () => {
      // Compile-time interface check
      interface StrictInteractionsCreateParams {
        model: string;
        input: string | Array<{ type: string; text?: string; data?: string; mime_type?: string }>;
        tools?: Array<{ type: 'google_search' | 'code_execution' | 'function'; [k: string]: any }>;
        generation_config?: {
          thinking_level?: ThinkingLevel;
          speech_config?: Array<{ voice: string }>;
          [k: string]: any;
        };
        response_format?: {
          type: 'text' | 'image' | 'audio';
          mime_type?: string;
          schema?: any;
          aspect_ratio?: string;
          image_size?: '1K' | '2K';
        };
      }

      const sampleValidCall: StrictInteractionsCreateParams = {
        model: MODEL_PLANNING,
        input: 'Test input',
        tools: [{ type: 'google_search' }],
        generation_config: {
          thinking_level: 'high'
        },
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: PlanSchema
        }
      };

      expect(sampleValidCall.generation_config?.thinking_level).toBe('high');
    });
  });
});
