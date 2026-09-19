---
type: "Analyst / Economics & Configuration"
title: "Model Tiers, Presets & Dynamic Pricing Engine"
description: "Unified model registry, dual presets (Pro Studio vs Budget Saver), dynamic token pricing, and cost estimation."
resource: "file:///constants.ts"
tags: ["models", "pricing-engine", "cost-estimation", "presets", "gemini", "veo"]
---

# Model Tiers, Presets & Dynamic Pricing Engine

## Overview
ExplodeIt features a multi-tiered generative AI model architecture. Rather than locking the user into a single static model configuration, the system provides a unified **Model Registry**, dual one-click presets (**Pro Studio** vs **Budget Saver**), granular per-stage model overrides, and a real-time **Dynamic Pricing Engine** that computes precise run cost estimates and session spend.

## Model Presets & Registry

### 1. Dual Preset Configurations

| Stage | Pro Studio (`'pro'`) | Budget Saver (`'budget'`) | Custom (`'custom'`) |
|---|---|---|---|
| **Blueprint Planning** | `gemini-3-pro-preview` | `gemini-2.5-flash` | User Selected |
| **Infographic Synthesis** | `gemini-3-pro-image-preview` | `gemini-2.5-flash-image` | User Selected |
| **Studio Assembly Shot** | `gemini-3-pro-image-preview` | `gemini-2.5-flash-image` | User Selected |
| **Component Enrichment** | `gemini-2.5-flash` + Search | `gemini-2.5-flash-lite` + Search | User Selected |
| **Kinematic Video (Veo)** | `veo-3.1-generate-preview` (Enabled) | Disabled by default | User Toggled |
| **Narration Audio (TTS)** | `gemini-2.5-flash` (Puck/Charon voice) | `gemini-2.5-flash-lite` | User Selected |

### 2. Stage Model Configuration Interface (`StageModelConfig`)
```typescript
export type ModelTier = 'pro' | 'budget' | 'custom';

export interface StageModelConfig {
  planning: string;
  infographic: string;
  assembled: string;
  enriching: string;
  video: string;
  narration: string;
  enableVideo: boolean;
}
```

### 3. Model Registry Pricing Matrix
Each supported model is registered in `MODEL_REGISTRY` in `constants.ts` with transparent billing rates:

```typescript
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
```

- **Gemini 3 Pro**: \$0.00125 / 1k input tokens, \$0.005 / 1k output tokens
- **Gemini 2.5 Flash**: \$0.000075 / 1k input tokens, \$0.0003 / 1k output tokens
- **Gemini 2.5 Flash Lite**: \$0.000025 / 1k input tokens, \$0.0001 / 1k output tokens
- **Gemini 3 Pro Image**: \$0.040 per generated image
- **Veo 3.1**: \$0.300 per generated video clip
- **Flash Audio TTS**: \$0.0001 / 1k characters

## Algorithmic Cost Engine

### 1. Per-Operation Cost Calculation (`calculateModelCost`)
Calculates the exact billing cost based on actual consumed units:
$$\text{Cost} = (\text{InputTokens} \times \text{Rate}_{\text{in}}) + (\text{OutputTokens} \times \text{Rate}_{\text{out}}) + \text{MediaUnitCost}$$

### 2. Pre-Generation Run Cost Estimation (`estimateRunCost`)
Before launching a deconstruction run, ExplodeIt calculates an estimated cost based on historical token benchmarks for the selected tier:
- **Pro Studio**: Estimated ~\$0.38 – \$0.42 (including Veo 3.1 video generation).
- **Budget Saver**: Estimated ~\$0.01 – \$0.02 (text/image only, video disabled).
- Displayed prominently in `InputArea.tsx` and `ModelSettingsModal.tsx`, giving users complete cost transparency before spending tokens on their API key.

## Persistence & UI Controls
- Selected tier and custom overrides persist in `localStorage` under `explodeit_model_config`.
- Managed via `Header.tsx` (quick tier toggle) and `ModelSettingsModal.tsx` (fine-grained model selector for all 6 pipeline stages).
