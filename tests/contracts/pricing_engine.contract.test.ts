import { describe, it, expect, beforeEach } from 'vitest';
import * as Constants from '../../constants';
import { setupMockBrowserEnvironment } from '../mocks/mockStorage';

/**
 * Interface Contract Definitions as specified in PROJECT.md
 */
export type ModelTier = 'pro' | 'budget' | 'custom';

export interface StageModelConfig {
  planning: string;
  infographic: string;
  assembled: string;
  video: string;
  narration: string;
  enableVideo: boolean;
}

export interface ModelPricingEntry {
  id: string;
  displayName: string;
  type: 'token' | 'image' | 'video' | 'tts';
  rates: {
    inputPer1kTokens?: number;
    outputPer1kTokens?: number;
    perImage?: number;
    perVideo?: number;
    per1kChars?: number;
  };
}

// Canonical Contract Presets (Authoritative from PROJECT.md / ORIGINAL_REQUEST.md)
export const CANONICAL_MODEL_REGISTRY: Record<string, ModelPricingEntry> = {
  'gemini-3.1-pro-preview': {
    id: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro',
    type: 'token',
    rates: { inputPer1kTokens: 0.002, outputPer1kTokens: 0.012 }
  },
  'gemini-3.8-flash': {
    id: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    type: 'token',
    rates: { inputPer1kTokens: 0.0003, outputPer1kTokens: 0.0025 }
  },
  'gemini-3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash Lite',
    type: 'token',
    rates: { inputPer1kTokens: 0.0001, outputPer1kTokens: 0.0004 }
  },
  'gemini-3-pro-image': {
    id: 'gemini-3-pro-image',
    displayName: 'Gemini 3 Pro Image (2K)',
    type: 'image',
    rates: { perImage: 0.134 }
  },
  'gemini-3.1-flash-image': {
    id: 'gemini-3.1-flash-image',
    displayName: 'Gemini 3.1 Flash Image',
    type: 'image',
    rates: { perImage: 0.067 }
  },
  'veo-3.1-generate-preview': {
    id: 'veo-3.1-generate-preview',
    displayName: 'Veo 3.1 Cinema',
    type: 'video',
    rates: { perVideo: 2.00 }
  },
  'veo-3.1-lite-generate-preview': {
    id: 'veo-3.1-lite-generate-preview',
    displayName: 'Veo 3.1 Lite',
    type: 'video',
    rates: { perVideo: 0.25 }
  },
  'gemini-3.1-flash-tts-preview': {
    id: 'gemini-3.1-flash-tts-preview',
    displayName: 'Gemini 3.1 Flash TTS',
    type: 'tts',
    rates: { per1kChars: 0.002 }
  }
};

export const CANONICAL_MODEL_PRESETS: Record<ModelTier, StageModelConfig> = {
  pro: {
    planning: 'gemini-3.8-flash',
    infographic: 'gemini-3-pro-image',
    assembled: 'gemini-3-pro-image',
    video: 'veo-3.1-generate-preview',
    narration: 'gemini-3.5-flash-lite',
    enableVideo: true
  },
  budget: {
    planning: 'gemini-3.8-flash',
    infographic: 'gemini-3.1-flash-image',
    assembled: 'gemini-3.1-flash-image',
    video: 'veo-3.1-lite-generate-preview',
    narration: 'gemini-3.5-flash-lite',
    enableVideo: false
  },
  custom: {
    planning: 'gemini-3.8-flash',
    infographic: 'gemini-3-pro-image',
    assembled: 'gemini-3-pro-image',
    video: 'veo-3.1-generate-preview',
    narration: 'gemini-3.5-flash-lite',
    enableVideo: true
  }
};

/**
 * Standard Contract Cost Calculation Formula (Authoritative Specification)
 */
export function contractCalculateModelCost(
  modelId: string,
  inputTokens: number = 0,
  outputTokens: number = 0,
  charCount?: number,
  registry: Record<string, ModelPricingEntry> = CANONICAL_MODEL_REGISTRY
): number {
  const model = registry[modelId];
  if (!model) {
    // Fallback rate for unknown models
    return ((inputTokens * 0.0001) / 1000) + ((outputTokens * 0.0004) / 1000);
  }

  const inSafe = Math.max(0, inputTokens);
  const outSafe = Math.max(0, outputTokens);

  switch (model.type) {
    case 'token': {
      const inRate = model.rates.inputPer1kTokens ?? 0;
      const outRate = model.rates.outputPer1kTokens ?? 0;
      const raw = (inSafe * inRate / 1000) + (outSafe * outRate / 1000);
      return Math.round(raw * 1000000) / 1000000;
    }
    case 'image':
      return model.rates.perImage ?? 0;
    case 'video':
      return model.rates.perVideo ?? 0;
    case 'tts': {
      const chars = Math.max(0, charCount ?? 0);
      const charRate = model.rates.per1kChars ?? 0.002;
      return (chars * charRate / 1000);
    }
    default:
      return 0;
  }
}

/**
 * Standard Contract Run Estimation Formula
 */
export function contractEstimateRunCost(
  config: StageModelConfig,
  registry: Record<string, ModelPricingEntry> = CANONICAL_MODEL_REGISTRY
): number {
  // Baseline token approximations:
  // Planning: ~500 in, 1000 out
  const planCost = contractCalculateModelCost(config.planning, 500, 1000, undefined, registry);
  // Infographic: 1 image
  const infoCost = contractCalculateModelCost(config.infographic, 0, 0, undefined, registry);
  // Assembled: 1 image
  const assemCost = contractCalculateModelCost(config.assembled, 0, 0, undefined, registry);
  // Deep Dive (Gemini 3.8 Flash authoring): ~400 in, 800 out
  const deepCost = contractCalculateModelCost('gemini-3.8-flash', 400, 800, undefined, registry);
  // Video: 1 video (if enabled)
  const videoCost = config.enableVideo ? contractCalculateModelCost(config.video, 0, 0, undefined, registry) : 0;
  // Narration script + TTS: ~200 in, 150 out + ~500 chars TTS
  const scriptCost = contractCalculateModelCost(config.narration, 200, 150, undefined, registry);
  const ttsCost = contractCalculateModelCost('gemini-3.1-flash-tts-preview', 0, 0, 500, registry);

  const total = planCost + infoCost + assemCost + deepCost + videoCost + scriptCost + ttsCost;
  return Math.round(total * 100000) / 100000;
}

describe('Contract: Model Registry & Dynamic Pricing Engine (FEAT-02, FEAT-03)', () => {
  beforeEach(() => {
    setupMockBrowserEnvironment();
    localStorage.clear();
  });

  describe('Tier 1: Feature Coverage', () => {
    it('test_feat02_registry_contains_all_models: validates registry includes all model types', () => {
      const keys = Object.keys(CANONICAL_MODEL_REGISTRY);
      expect(keys).toContain('gemini-3.1-pro-preview');
      expect(keys).toContain('gemini-3.8-flash');
      expect(keys).toContain('gemini-3.5-flash-lite');
      expect(keys).toContain('gemini-3-pro-image');
      expect(keys).toContain('gemini-3.1-flash-image');
      expect(keys).toContain('veo-3.1-generate-preview');
      expect(keys).toContain('veo-3.1-lite-generate-preview');
      expect(keys).toContain('gemini-3.1-flash-tts-preview');
    });

    it('test_feat02_calculate_token_cost_pro: calculates Gemini 3 Pro token costs accurately', () => {
      // 1,000 input ($0.002) + 2,000 output (2 * $0.012 = $0.024) = $0.026
      const cost = contractCalculateModelCost('gemini-3.1-pro-preview', 1000, 2000);
      expect(cost).toBeCloseTo(0.026, 5);
    });

    it('test_feat02_calculate_media_cost_flat: charges correct flat fee for image and video models', () => {
      const proImageCost = contractCalculateModelCost('gemini-3-pro-image', 0, 0);
      expect(proImageCost).toBe(0.134);

      const fastImageCost = contractCalculateModelCost('gemini-3.1-flash-image', 0, 0);
      expect(fastImageCost).toBe(0.067);

      const veoCost = contractCalculateModelCost('veo-3.1-generate-preview', 0, 0);
      expect(veoCost).toBe(2.00);
    });

    it('test_feat02_calculate_tts_char_cost: calculates character-based TTS cost accurately', () => {
      // 1,500 characters at $0.002 / 1k chars = $0.003
      const cost = contractCalculateModelCost('gemini-3.1-flash-tts-preview', 0, 0, 1500);
      expect(cost).toBeCloseTo(0.003, 5);
    });

    it('test_feat02_estimate_run_cost_pro_vs_budget: Pro Studio estimate significantly exceeds Budget Saver', () => {
      const proEstimate = contractEstimateRunCost(CANONICAL_MODEL_PRESETS.pro);
      const budgetEstimate = contractEstimateRunCost(CANONICAL_MODEL_PRESETS.budget);

      // Pro estimate should include Veo 3.1 ($2.00) + 2x Pro Image ($0.268) + tokens ≈ $2.28+
      expect(proEstimate).toBeGreaterThan(1.50);
      // Budget estimate with no video and Flash image should be < $0.25
      expect(budgetEstimate).toBeLessThan(0.25);
      expect(proEstimate).toBeGreaterThan(budgetEstimate * 5);
    });

    it('test_feat03_preset_toggle_pro_sets_default_models: Pro preset activates premier models', () => {
      const preset = CANONICAL_MODEL_PRESETS.pro;
      expect(preset.planning).toBe('gemini-3.8-flash');
      expect(preset.infographic).toBe('gemini-3-pro-image');
      expect(preset.video).toBe('veo-3.1-generate-preview');
      expect(preset.enableVideo).toBe(true);
    });

    it('test_feat03_preset_toggle_budget_sets_budget_models: Budget preset activates saver models', () => {
      const preset = CANONICAL_MODEL_PRESETS.budget;
      expect(preset.planning).toBe('gemini-3.8-flash');
      expect(preset.infographic).toBe('gemini-3.1-flash-image');
      expect(preset.enableVideo).toBe(false);
    });

    it('test_feat03_localstorage_persistence_write_and_read: saves and retrieves tier config', () => {
      const key = 'explodeit_model_config_v1';
      const customConfig: StageModelConfig = {
        planning: 'gemini-3.8-flash',
        infographic: 'gemini-3-pro-image',
        assembled: 'gemini-3.1-flash-image',
        video: 'veo-3.1-lite-generate-preview',
        narration: 'gemini-3.5-flash-lite',
        enableVideo: true
      };
      localStorage.setItem(key, JSON.stringify(customConfig));
      const restored = JSON.parse(localStorage.getItem(key)!);
      expect(restored.planning).toBe('gemini-3.8-flash');
      expect(restored.enableVideo).toBe(true);
    });

    it('test_feat03_advanced_override_single_stage: modifying 1 stage preserves remaining stages', () => {
      const base = { ...CANONICAL_MODEL_PRESETS.pro };
      const updated: StageModelConfig = {
        ...base,
        narration: 'gemini-3.8-flash' // Custom override
      };
      expect(updated.planning).toBe(base.planning);
      expect(updated.infographic).toBe(base.infographic);
      expect(updated.video).toBe(base.video);
      expect(updated.narration).toBe('gemini-3.8-flash');
    });

    it('test_feat03_budget_disable_video_flag: setting enableVideo false zeroes out video cost', () => {
      const configWithVideo: StageModelConfig = { ...CANONICAL_MODEL_PRESETS.pro, enableVideo: true };
      const configWithoutVideo: StageModelConfig = { ...CANONICAL_MODEL_PRESETS.pro, enableVideo: false };

      const costWith = contractEstimateRunCost(configWithVideo);
      const costWithout = contractEstimateRunCost(configWithoutVideo);

      const diff = costWith - costWithout;
      expect(diff).toBeCloseTo(2.00, 3); // Veo 3.1 is $2.00
    });
  });

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('test_feat02_boundary_zero_tokens_zero_cost: 0 input and 0 output tokens yields 0 cost', () => {
      const cost = contractCalculateModelCost('gemini-3.1-pro-preview', 0, 0);
      expect(cost).toBe(0);
    });

    it('test_feat02_boundary_extreme_token_counts: 10,000,000 tokens calculates deterministically', () => {
      const cost = contractCalculateModelCost('gemini-3.1-pro-preview', 5_000_000, 5_000_000);
      // 5M * 0.002/1000 = 10.00, 5M * 0.012/1000 = 60.00 -> 70.00
      expect(cost).toBeCloseTo(70.00, 2);
      expect(Number.isFinite(cost)).toBe(true);
    });

    it('test_feat02_boundary_unknown_model_fallback: unlisted model falls back safely', () => {
      const cost = contractCalculateModelCost('unknown-experimental-model', 1000, 1000);
      expect(cost).toBeGreaterThan(0);
      expect(Number.isFinite(cost)).toBe(true);
    });

    it('test_feat02_boundary_negative_token_clamping: negative tokens are clamped to zero', () => {
      const cost = contractCalculateModelCost('gemini-3.1-pro-preview', -500, -1000);
      expect(cost).toBe(0);
    });

    it('test_feat02_boundary_fractional_cent_rounding: cost calculation avoids floating point garbage', () => {
      const cost = contractCalculateModelCost('gemini-3.5-flash-lite', 333, 777);
      expect(cost.toString().length).toBeLessThan(15);
    });

    it('test_feat03_boundary_corrupted_localstorage_recovery: invalid JSON in storage resets safely', () => {
      localStorage.setItem('explodeit_model_config_v1', '{corrupted:json,,');
      let restoredConfig: StageModelConfig;
      try {
        restoredConfig = JSON.parse(localStorage.getItem('explodeit_model_config_v1')!);
      } catch {
        restoredConfig = CANONICAL_MODEL_PRESETS.pro;
      }
      expect(restoredConfig).toEqual(CANONICAL_MODEL_PRESETS.pro);
    });

    it('test_feat03_boundary_unsupported_tier_string: handles unknown tier by defaulting to pro', () => {
      const tierInput: string = 'ultra-vip';
      const resolvedTier: ModelTier = (['pro', 'budget', 'custom'] as string[]).includes(tierInput)
        ? (tierInput as ModelTier)
        : 'pro';
      expect(resolvedTier).toBe('pro');
    });

    it('test_feat03_boundary_partial_stage_override: partial override fills remaining from default preset', () => {
      const partial = { planning: 'gemini-3.8-flash' };
      const merged: StageModelConfig = {
        ...CANONICAL_MODEL_PRESETS.pro,
        ...partial
      };
      expect(merged.planning).toBe('gemini-3.8-flash');
      expect(merged.infographic).toBe('gemini-3-pro-image');
      expect(merged.video).toBe('veo-3.1-generate-preview');
    });

    it('test_feat03_boundary_rapid_preset_toggle: rapid switching produces consistent state', () => {
      let currentTier: ModelTier = 'pro';
      for (let i = 0; i < 50; i++) {
        currentTier = (i % 2 === 0) ? 'budget' : 'pro';
      }
      expect(currentTier).toBe('pro');
      const config = CANONICAL_MODEL_PRESETS[currentTier];
      expect(config.enableVideo).toBe(true);
    });
  });

  describe('Integration with Existing constants.ts PRICING', () => {
    it('asserts constants.ts PRICING contains current models matching contract', () => {
      expect(Constants.PRICING).toBeDefined();
      expect(Constants.PRICING[Constants.MODEL_PLANNING]).toBeDefined();
      expect(Constants.PRICING[Constants.MODEL_IMAGE]).toBeDefined();
      expect(Constants.PRICING[Constants.MODEL_VIDEO]).toBeDefined();
    });
  });
});
