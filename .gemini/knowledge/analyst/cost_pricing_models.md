---
type: "Analyst / Cost Model"
title: "Multi-Model Token Cost & Pricing Estimation Engine"
description: "Mathematical pricing formulas and per-token/per-media rates for Gemini 3 Pro, 2.5 Flash, Veo 3.1, and Flash TTS."
resource: "file:///C:/Users/kspra/code/github/ExplodeIt/constants.ts"
tags: ["pricing", "cost-model", "tokenomics", "gemini-models", "veo"]
---

# Multi-Model Token Cost & Pricing Estimation Engine

## Overview
Because ExplodeIt employs a Bring-Your-Own-Key (BYOK) architecture where users directly consume their personal Google AI Studio or Vertex AI quotas, transparent real-time cost observability is a primary UX capability. ExplodeIt embeds a deterministic pricing engine in `constants.ts` and `services/geminiService.ts` to calculate usage per pipeline operation and aggregate cumulative session expenditures in `Sidebar.tsx`.

## Model Pricing Matrix

| Model Identifier | Constant Alias | Task Phase | Unit Type | Input Rate (USD) | Output Rate (USD) |
|---|---|---|---|---|---|
| `gemini-3-pro-preview` | `MODEL_PLANNING` | Planning & Blueprinting | Per 1,000 Tokens | \$0.00125 | \$0.00500 |
| `gemini-2.5-flash` | `MODEL_AUTHORING` | Component Deep Dive (Search Grounded) | Per 1,000 Tokens | \$0.00010 | \$0.00040 |
| `gemini-flash-lite-latest` | `MODEL_SCRIPT` | Audio Script Generation | Per 1,000 Tokens | \$0.000075 | \$0.00030 |
| `gemini-2.5-flash` | `MODEL_SURPRISE` | Random Topic Ideation | Per 1,000 Tokens | \$0.00010 | \$0.00040 |
| `gemini-3-pro-image-preview` | `MODEL_IMAGE` | Infographic & Assembled Shots | Flat Per Media | — | \$0.04000 / image |
| `veo-3.1-generate-preview` | `MODEL_VIDEO` | Cinematic Assembly Video | Flat Per Media | — | \$0.10000 / video |
| `gemini-2.5-flash-preview-tts` | `MODEL_TTS` | Audio Guide Synthesis | Per 1,000 Chars | \$0.00200 | — |

## Cost Computation Algorithm

The calculation logic is implemented in `services/geminiService.ts`:

```typescript
const calculateCost = (model: string, input: number, output: number, isMedia: boolean = false): number => {
    let cost = 0;
    if (model === MODEL_PLANNING) {
        cost += (input / 1000) * PRICING[MODEL_PLANNING].inputPer1kTokens;
        cost += (output / 1000) * PRICING[MODEL_PLANNING].outputPer1kTokens;
    } else if (model === MODEL_AUTHORING) {
        cost += (input / 1000) * PRICING[MODEL_AUTHORING].inputPer1kTokens;
        cost += (output / 1000) * PRICING[MODEL_AUTHORING].outputPer1kTokens;
    } else if (model === MODEL_SCRIPT) {
        cost += (input / 1000) * PRICING[MODEL_SCRIPT].inputPer1kTokens;
        cost += (output / 1000) * PRICING[MODEL_SCRIPT].outputPer1kTokens;
    } else if (model === MODEL_SURPRISE) {
        cost += (input / 1000) * PRICING[MODEL_SURPRISE].inputPer1kTokens;
        cost += (output / 1000) * PRICING[MODEL_SURPRISE].outputPer1kTokens;
    } else if (model === MODEL_IMAGE) {
        cost = PRICING[MODEL_IMAGE].perImage;
    } else if (model === MODEL_VIDEO) {
        cost = PRICING[MODEL_VIDEO].perVideo;
    } else if (model === MODEL_TTS) {
        cost = (input / 1000) * PRICING[MODEL_TTS].per1kChars;
    }
    return parseFloat(cost.toFixed(5));
};
```

### Architectural Details:
1. **Token Metadata Extraction**: For LLM calls, `response.usageMetadata.promptTokenCount` and `candidatesTokenCount` are retrieved directly from the `@google/genai` response envelope.
2. **Fixed-Cost Flat Rates**: Media models (`MODEL_IMAGE` and `MODEL_VIDEO`) apply deterministic per-generation unit charges (\$0.04 and \$0.10 respectively).
3. **Character-Based Audio Accounting**: The TTS model cost is estimated based on prompt script character length (\$0.002 per 1,000 characters).
4. **Rounding Precision**: Calculations are standardized to 5 decimal places (`cost.toFixed(5)`) to maintain numerical accuracy without floating-point drift.

## Session Cost Aggregation (`Sidebar.tsx`)
In `Sidebar.tsx`, a React `useMemo` hook aggregates total session intelligence across all items in history:

```typescript
const totalStats = useMemo(() => {
  return history.reduce((acc, item) => {
    item.usage.forEach(u => {
      acc.totalCost += u.costEstimate;
      acc.totalInput += u.inputTokens;
      acc.totalOutput += u.outputTokens;
    });
    return acc;
  }, { totalCost: 0, totalInput: 0, totalOutput: 0 });
}, [history]);
```

This presents the user with cumulative expenditures formatted as `$0.0000`, along with total input/output token counters in the "Session Intelligence" drawer.
