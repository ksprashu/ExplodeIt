import { Type } from "@google/genai";
import { ModelTier, StageModelConfig, ModelPreset, ModelPricingEntry } from "./types";

// Active Production Google GenAI Models (Sept 2026)
export const MODEL_PLANNING = 'gemini-3.1-pro-preview';
export const MODEL_AUTHORING = 'gemini-3.8-flash';
export const MODEL_SCRIPT = 'gemini-3.5-flash-lite';
export const MODEL_IMAGE = 'gemini-3-pro-image';
export const MODEL_VIDEO = 'veo-3.1-generate-preview';
export const MODEL_TTS = 'gemini-3.1-flash-tts-preview';
export const MODEL_SURPRISE = 'gemini-3.8-flash';

// Budget Saver Alternates
export const MODEL_PLANNING_BUDGET = 'gemini-3.8-flash';
export const MODEL_IMAGE_BUDGET = 'gemini-3.1-flash-image';
export const MODEL_VIDEO_BUDGET = 'veo-3.1-lite-generate-preview';

export interface PricingRate {
  inputPer1kTokens?: number;
  outputPer1kTokens?: number;
  perImage?: number;
  perVideo?: number;
  per1kChars?: number;
}

// Calibrated Pricing Schedule (USD per 1k units / per item) - September 2026 official rates
export const PRICING: Record<string, PricingRate> = {
  [MODEL_PLANNING]: {
    inputPer1kTokens: 0.002,     // $2.00 / 1M
    outputPer1kTokens: 0.012,    // $12.00 / 1M
  },
  [MODEL_AUTHORING]: {
    inputPer1kTokens: 0.0003,    // $0.30 / 1M
    outputPer1kTokens: 0.0025,   // $2.50 / 1M
  },
  [MODEL_SCRIPT]: {
    inputPer1kTokens: 0.0001,    // $0.10 / 1M
    outputPer1kTokens: 0.0004,   // $0.40 / 1M
  },
  [MODEL_IMAGE]: {
    perImage: 0.134,             // $120 / 1M tokens (1120 tokens per 2K image)
  },
  [MODEL_VIDEO]: {
    perVideo: 2.00,              // Standard Veo 3.1 ($0.40/sec * 5 sec)
  },
  [MODEL_TTS]: {
    per1kChars: 0.002,           // Approx 25 audio tokens/sec
  },
  // Budget models
  [MODEL_IMAGE_BUDGET]: {
    perImage: 0.067,             // $60 / 1M tokens (1120 tokens per 1K image)
  },
  [MODEL_VIDEO_BUDGET]: {
    perVideo: 0.25,              // Lite Veo 3.1 ($0.05/sec * 5 sec)
  }
};

// Crucial: Ensure [MODEL_SURPRISE] is explicitly defined in PRICING to eliminate latent TypeError
PRICING[MODEL_SURPRISE] = {
  inputPer1kTokens: 0.0003,    // $0.30 / 1M
  outputPer1kTokens: 0.0025,   // $2.50 / 1M
};

export const MODEL_IDS = {
  // Planning & Text Models
  GEMINI_3_1_PRO: 'gemini-3.1-pro-preview',
  GEMINI_3_8_FLASH: 'gemini-3.8-flash',
  GEMINI_3_5_FLASH_LITE: 'gemini-3.5-flash-lite',

  // Image Generation Models
  GEMINI_3_PRO_IMAGE: 'gemini-3-pro-image',
  GEMINI_3_1_FLASH_IMAGE: 'gemini-3.1-flash-image',

  // Video Generation Models
  VEO_3_1: 'veo-3.1-generate-preview',
  VEO_3_1_LITE: 'veo-3.1-lite-generate-preview',

  // Audio & TTS Models
  GEMINI_TTS: 'gemini-3.1-flash-tts-preview',
} as const;

export const MODEL_REGISTRY: Record<string, ModelPricingEntry> = {
  // Active Gemini 3.x Models
  'gemini-3.1-pro-preview': {
    id: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro',
    type: 'token',
    rates: { inputPer1kTokens: 0.002, outputPer1kTokens: 0.012 },
    inputPer1kTokens: 0.002,
    outputPer1kTokens: 0.012
  },
  'gemini-3.8-flash': {
    id: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
    type: 'token',
    rates: { inputPer1kTokens: 0.0003, outputPer1kTokens: 0.0025 },
    inputPer1kTokens: 0.0003,
    outputPer1kTokens: 0.0025
  },
  'gemini-3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash Lite',
    type: 'token',
    rates: { inputPer1kTokens: 0.0001, outputPer1kTokens: 0.0004 },
    inputPer1kTokens: 0.0001,
    outputPer1kTokens: 0.0004
  },
  'gemini-3-pro-image': {
    id: 'gemini-3-pro-image',
    displayName: 'Gemini 3 Pro Image',
    type: 'image',
    rates: { perImage: 0.134 },
    perImage: 0.134
  },
  'gemini-3.1-flash-image': {
    id: 'gemini-3.1-flash-image',
    displayName: 'Gemini 3.1 Flash Image',
    type: 'image',
    rates: { perImage: 0.067 },
    perImage: 0.067
  },
  'veo-3.1-generate-preview': {
    id: 'veo-3.1-generate-preview',
    displayName: 'Veo 3.1 Cinema',
    type: 'video',
    rates: { perVideo: 2.00 },
    perVideo: 2.00
  },
  'veo-3.1-lite-generate-preview': {
    id: 'veo-3.1-lite-generate-preview',
    displayName: 'Veo 3.1 Lite',
    type: 'video',
    rates: { perVideo: 0.25 },
    perVideo: 0.25
  },
  'gemini-3.1-flash-tts-preview': {
    id: 'gemini-3.1-flash-tts-preview',
    displayName: 'Gemini 3.1 Flash TTS',
    type: 'tts',
    rates: { per1kChars: 0.002 },
    per1kChars: 0.002
  }
};

export const CANONICAL_MODEL_PRESETS: Record<ModelTier, StageModelConfig> = {
  pro: {
    planning: 'gemini-3.1-pro-preview',
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
    planning: 'gemini-3.1-pro-preview',
    infographic: 'gemini-3-pro-image',
    assembled: 'gemini-3-pro-image',
    video: 'veo-3.1-generate-preview',
    narration: 'gemini-3.5-flash-lite',
    enableVideo: true
  }
};

export const MODEL_PRESETS: Record<'pro' | 'budget', ModelPreset> = {
  pro: {
    id: 'pro',
    name: 'Pro Studio',
    tagline: 'Premier Quality',
    description: 'Gemini 3.1 Pro deconstruction, 2K HD visuals, and cinematic Veo 3.1 video animation.',
    badgeColor: 'from-amber-400 to-orange-500',
    config: CANONICAL_MODEL_PRESETS.pro,
    estimatedCost: 2.2842,
  },
  budget: {
    id: 'budget',
    name: 'Budget Saver',
    tagline: 'Credit Conserver',
    description: 'Fast Flash planning, cost-efficient Gemini 3.1 Flash visuals, and video disabled by default.',
    badgeColor: 'from-emerald-400 to-cyan-500',
    config: CANONICAL_MODEL_PRESETS.budget,
    estimatedCost: 0.13985,
  },
};

export function calculateModelCost(
  modelId: string,
  inputTokens: number = 0,
  outputTokens: number = 0,
  charCountOrOptions?: number | { charCount?: number; registry?: Record<string, ModelPricingEntry> },
  explicitRegistry?: Record<string, ModelPricingEntry>
): number {
  let charCount: number | undefined;
  let registry = explicitRegistry || MODEL_REGISTRY;

  if (typeof charCountOrOptions === 'number') {
    charCount = charCountOrOptions;
  } else if (typeof charCountOrOptions === 'object' && charCountOrOptions !== null) {
    charCount = charCountOrOptions.charCount;
    if (charCountOrOptions.registry) {
      registry = charCountOrOptions.registry;
    }
  }

  const model = registry[modelId];
  if (!model) {
    // Fallback rate for unknown models ($0.10 / 1M in, $0.40 / 1M out)
    return ((Math.max(0, inputTokens) * 0.0001) / 1000) + ((Math.max(0, outputTokens) * 0.0004) / 1000);
  }

  const inSafe = Math.max(0, inputTokens);
  const outSafe = Math.max(0, outputTokens);

  switch (model.type) {
    case 'token': {
      const inRate = model.rates?.inputPer1kTokens ?? model.inputPer1kTokens ?? 0;
      const outRate = model.rates?.outputPer1kTokens ?? model.outputPer1kTokens ?? 0;
      const raw = (inSafe * inRate / 1000) + (outSafe * outRate / 1000);
      return Math.round(raw * 1000000) / 1000000;
    }
    case 'image':
      return model.rates?.perImage ?? model.perImage ?? 0;
    case 'video':
      return model.rates?.perVideo ?? model.perVideo ?? 0;
    case 'tts': {
      const chars = Math.max(0, charCount ?? inputTokens ?? 0);
      const charRate = model.rates?.per1kChars ?? model.per1kChars ?? 0.002;
      return (chars * charRate / 1000);
    }
    default:
      return 0;
  }
}

export function estimateRunCost(
  config: StageModelConfig,
  registry: Record<string, ModelPricingEntry> = MODEL_REGISTRY
): number {
  // Baseline token approximations:
  // Planning: ~500 in, 1000 out
  const planCost = calculateModelCost(config.planning, 500, 1000, undefined, registry);
  // Infographic: 1 image
  const infoCost = calculateModelCost(config.infographic, 0, 0, undefined, registry);
  // Assembled: 1 image
  const assemCost = calculateModelCost(config.assembled, 0, 0, undefined, registry);
  // Deep Dive (Gemini 3.8 Flash authoring): ~400 in, 800 out
  const deepCost = calculateModelCost('gemini-3.8-flash', 400, 800, undefined, registry);
  // Video: 1 video (if enabled)
  const videoCost = config.enableVideo ? calculateModelCost(config.video, 0, 0, undefined, registry) : 0;
  // Narration script + TTS: ~200 in, 150 out + ~500 chars TTS
  const scriptCost = calculateModelCost(config.narration, 200, 150, undefined, registry);
  const ttsCost = calculateModelCost('gemini-3.1-flash-tts-preview', 0, 0, 500, registry);

  const total = planCost + infoCost + assemCost + deepCost + videoCost + scriptCost + ttsCost;
  return Math.round(total * 100000) / 100000;
}

export const DEFAULT_PLACEHOLDER = "https://picsum.photos/800/600";

export const PROMPTS = {
  // Step 1: Plan (Gemini 3 Pro + Search)
  PLAN_OBJECT: (item: string) => `You are the chief architect of a universal knowledge engine. Create a comprehensive content plan for: "${item}".
  
  **Goal:** Deconstruct this topic into its constituent parts to help a user learn how it works.
  
  **Capabilities:**
  - Use Google Search to find the latest information, especially if the topic is specific software, a new technology, or a niche concept.
  - If the user provides a URL, use it as context.
  
  **1. Domain Analysis:**
  - Determine the 'domainType' (PHYSICAL, SOFTWARE, CONCEPTUAL, BIOLOGICAL, OTHER).
  - Define a 'visualMetaphor' for the infographic:
    - PHYSICAL -> "Exploded View"
    - SOFTWARE -> "System Architecture Diagram" or "Data Flow Visualization"
    - CONCEPTUAL -> "Mind Map" or "Abstract Concept Visualization"
    - BIOLOGICAL -> "Anatomical Dissection"

  **2. Dynamic Section Titles:**
  - Origin: History, Inception, or Root Cause.
  - Anatomy: Structure, Components, Modules, or Stages.
  - Article: How it works, The Mechanics, The Code, or The Philosophy.
  - Trivia: "Did You Know?", "Edge Cases", or "Fun Facts".

  **3. Content Generation:**
  - **Components**: Identify the 6-8 key parts.
    - Physical: Gears, lenses, pistons.
    - Software: API, Database, Frontend, LLM, Vector Store.
    - Conceptual: Focus, Breath, Mantra (for Meditation).
  - **Origin Story**: Concise overview (~100 words).
  - **Detailed Article**: ~800 words. Deep technical/philosophical dive. Use Markdown headers.
  - **Trivia**: 5 surprising facts.

  **4. Visual & Audio Style:**
  - **Visual Style**: Photorealistic (for physical/bio) or High-End Tech Vector/3D (for software) or Ethereal/Surreal (for conceptual).
  - **Audio Vibe**: Choose a voice persona that fits the topic (e.g., Fenrir for intense tech, Zephyr for meditation).
  
  Do not explain. Return JSON complying with the schema.`,

  // Step 2: Pro Image (Infographic) - Upgraded with 5 structural directives
  INFOGRAPHIC: (item: string, style: string, parts: string[], domain: string, metaphor: string) => 
    `Create a high-fidelity educational infographic: A "${metaphor}" of ${item}.

**Context:** This is a ${domain} topic.
**Key Components:** ${parts.join(', ')}.
**Visual Style:** ${style}.

**Anatomical Deconstruction Invariants:**
1. **Multi-Tiered Component Separation (4-Tier Spatial Separation):** Organize parts across 4 explicit depth tiers with zero-gravity modular negative space:
   - Tier 1: Outer casing, protective shell, enclosure, or facade.
   - Tier 2: Structural chassis, mounting brackets, skeleton, or sub-assemblies.
   - Tier 3: Core operational mechanism, power train, circuitry, core heart, or data pipeline.
   - Tier 4: Internal sub-components, micro-mechanics, micro-fasteners, chips, or cellular organelles.
2. **Internal Cutaways & Cross-Sections:** Provide 45-degree technical cross-section cutaways and revealing section views exposing interior cavities and internal working surfaces.
3. **Isometric Leader Callout Lines:** Clean, fine isometric hairline leader callouts projecting outward isometrically with technical callout anchors.
4. **Studio Illumination & Floating Modularity:** High-contrast 5600K daylight-balanced key illumination with electric cyan rim illumination over dark obsidian backdrop, floating suspended parts with distinct drop shadows.

Composition: Centered, clean, museum-grade technical illustration, high resolution.`,

  // Step 3: Pro Image (Assembled - Image to Image)
  ASSEMBLED: (item: string, title: string, description: string, domain: string) => 
    `A photorealistic studio shot (or high-end 3D render) of the "Finished Product" or "Complete State" of ${title} (${item}).
    
    **Context:** ${description}
    **Domain:** ${domain}
    
    **CRITICAL INSTRUCTIONS:**
    - **Physical:** The object is CLOSED, INTACT, and WHOLE. Sitting on a surface.
    - **Software:** A futuristic "dashboard" or "interface" visualization on a glass tablet or floating hologram, representing the *running* application.
    - **Conceptual:** A harmonious, unified symbol or scene representing the *mastery* or *completion* of the concept (e.g., a person levitating for meditation).
    - Use the previous exploded view/diagram as the *source of truth* for materials and aesthetics, but show the **assembled/complete** state.`,

  // Step 4: Authoring Deep Dive (Gemini 3.8 Flash + Search)
  DEEP_DIVE: (item: string, components: string[]) => 
    `Research and write a detailed educational "Component Analysis" for: ${item}.
    
    **Tools:** Use Google Search to find accurate, up-to-date technical, scientific, or historical details for each component.
    **Components:** ${components.join(', ')}
    
    **Output:** A SINGLE JSON object with a "components" array. 
    
    For each component:
    - "name": (string) The component name.
    - "composition": (string) 
       - For Physical: Material (e.g., "Titanium").
       - For Software: Language/Framework (e.g., "Python/React", "REST API").
       - For Conceptual: Core Principle (e.g., "Mental State").
    - "shortDescription": (string) 1 sentence summary.
    - "detailedContent": (string) 3-4 paragraphs (~200 words) explaining the function, implementation, or significance.
    
    Output JSON ONLY. No markdown formatting.
    Structure: { "components": [ ... ] }`,

  // Step 5: Veo Video Assembly (4-Phase Kinematic Sequence)
  VIDEO_ASSEMBLY: (item: string, domain: string, metaphor: string) => 
    `Cinematic technical animation of ${item} (8K assembly).

**Type:** ${domain} (${metaphor}).

**Kinematic Motion Directives & Frame Alignment:**
- **Initial Frame (Start State):** Perfectly matches the disassembled, floating exploded-view state with all components hovering in suspended modular alignment in zero-gravity overview.
- **Phase 1 (Glide & Trajectory - Axial Trajectory Convergence):** Sub-components glide smoothly along designated isometric trajectory paths with axial trajectory convergence and realistic inertia.
- **Phase 2 (Sub-Assembly Interlocking - Mechanical Docking):** Adjacent micro-components engage through interlocking mechanical docking into cohesive sub-assemblies with lock-in transitions.
- **Phase 3 (Core Ingestion & Structural Chassis Convergence):** Sub-assemblies converge inward along axial trajectories into the structural chassis with mechanical precision.
- **Phase 4 (Final Sealing & Complete State Shine):** Outer shells and protective casings swing into place, snapping shut with tactile lock-in transitions, culminating in a complete state shine with specular highlight sweep across pristine surfaces.
- **Final Frame (End State):** The object rests completely unified, intact, and assembled, matching the finished studio hero shot.

**Visual Fidelity Invariants:**
- Studio 5600K lighting consistent across all frames.
- Smooth camera orbit (45-degree tracking arc).
- Strictly NO 2D synthetic text overlays, HUD graphics, or watermarks.`,

  // Step 5b: Veo Video Disassembly (Inverse Kinematic Sequence)
  VIDEO_DISASSEMBLY: (item: string, domain: string, metaphor: string) => 
    `Cinematic technical animation of ${item} (8K disassembly).

**Type:** ${domain} (${metaphor}).

**Kinematic Motion Directives & Frame Alignment:**
- **Initial Frame (Start State):** The object rests completely unified, intact, and assembled, matching the finished studio hero shot.
- **Phase 1 (Unsealing & Outer Enclosure):** Outer shells, fasteners, and protective casings unlock with tactile transitions and swing open/detach outward.
- **Phase 2 (Core Ejection & Sub-Assembly Decoupling):** Structural chassis releases sub-assemblies, gliding outward along designated axial trajectory paths.
- **Phase 3 (Modular Disengagement & Interlocking Separation):** Adjacent micro-components decouple from sub-assemblies through inverse mechanical un-docking.
- **Phase 4 (Axial Drift & Zero-Gravity Overview):** Sub-components glide outward into zero-gravity modular negative space, settling into suspended alignment with specular highlight reflections.
- **Final Frame (End State):** Perfectly matches the disassembled, floating exploded-view state with all components hovering in suspended modular alignment.

**Visual Fidelity Invariants:**
- Studio 5600K lighting consistent across all frames.
- Smooth camera orbit (45-degree tracking arc).
- Strictly NO 2D synthetic text overlays, HUD graphics, or watermarks.`,

  // Step 5c: Backward-compatible Video Delegation
  VIDEO: (item: string, domain: string, metaphor: string) => 
    PROMPTS.VIDEO_ASSEMBLY(item, domain, metaphor),

  // Step 6: Audio Script (Gemini Flash Lite)
  NARRATION_SCRIPT: (item: string, origin: string, article: string, trivia: string[]) => 
    `You are an expert narrator (Tech Evangelist, Historian, or Guru depending on the topic). Write a rich, engaging 45-60 second script about: ${item}.
    
    Source Material:
    - Context: "${origin}"
    - Deep Dive: "${article.substring(0, 1500)}..."
    - Trivia: ${trivia.join(', ')}

    **Structure:**
    1. The Hook: Grab attention with the significance of the topic.
    2. The Mechanics: Briefly explain how the components (parts/modules/concepts) interact.
    3. The Impact: Conclude with why this matters.
    
    **Tone:** Tailor to the subject (e.g., Excited for Tech, Calm for Meditation, Precise for Engineering).
    Do NOT include stage directions. Just the raw spoken text.`
};

// SCHEMAS

export const PlanSchema = {
  type: Type.OBJECT,
  properties: {
    displayTitle: { type: Type.STRING },
    category: { type: Type.STRING },
    domainType: { 
        type: Type.STRING, 
        enum: ['PHYSICAL', 'SOFTWARE', 'CONCEPTUAL', 'BIOLOGICAL', 'OTHER'],
        description: "Classify the subject." 
    },
    visualMetaphor: { type: Type.STRING, description: "The style of diagram (e.g., 'Exploded View', 'System Architecture', 'Flowchart', 'Mind Map')." },
    sectionTitles: {
        type: Type.OBJECT,
        properties: {
            origin: { type: Type.STRING },
            anatomy: { type: Type.STRING },
            article: { type: Type.STRING },
            trivia: { type: Type.STRING }
        },
        required: ["origin", "anatomy", "article", "trivia"]
    },
    originStory: { type: Type.STRING, description: "Short overview text only." },
    detailedArticle: { type: Type.STRING, description: "Long form markdown text." },
    trivia: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING } 
    },
    visualStylePrompt: { type: Type.STRING },
    componentList: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }
    },
    audioVibe: {
        type: Type.OBJECT,
        properties: {
            voiceName: { type: Type.STRING, description: "One of: Puck, Charon, Kore, Fenrir, Zephyr" },
            toneDescription: { type: Type.STRING }
        }
    }
  },
  required: ["displayTitle", "category", "domainType", "visualMetaphor", "sectionTitles", "originStory", "detailedArticle", "trivia", "visualStylePrompt", "componentList", "audioVibe"]
};

export const ComponentDetailsSchema = {
  type: Type.OBJECT,
  properties: {
    components: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          composition: { type: Type.STRING },
          shortDescription: { type: Type.STRING },
          detailedContent: { type: Type.STRING }
        }
      }
    }
  }
};