/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Type } from "@google/genai";

export const MODEL_PLANNING = 'gemini-3-pro-preview';
export const MODEL_AUTHORING = 'gemini-2.5-flash'; // Mapping "2.5 Pro" request to 2.5 Flash for speed/validity
export const MODEL_SCRIPT = 'gemini-flash-lite-latest';
export const MODEL_IMAGE = 'gemini-3-pro-image-preview';
export const MODEL_VIDEO = 'veo-3.1-generate-preview';
export const MODEL_TTS = 'gemini-2.5-flash-preview-tts';
export const MODEL_SURPRISE = 'gemini-2.5-flash';

// Estimated Pricing (USD)
export const PRICING = {
  [MODEL_PLANNING]: {
    inputPer1kTokens: 0.00125,
    outputPer1kTokens: 0.005,
  },
  [MODEL_AUTHORING]: {
    inputPer1kTokens: 0.0001,
    outputPer1kTokens: 0.0004,
  },
  [MODEL_SCRIPT]: {
    inputPer1kTokens: 0.000075,
    outputPer1kTokens: 0.0003,
  },
  [MODEL_IMAGE]: {
    perImage: 0.04,
  },
  [MODEL_VIDEO]: {
    perVideo: 0.10,
  },
  [MODEL_TTS]: {
    per1kChars: 0.002 // Approx estimate
  }
};

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

  // Step 2: Pro Image (Infographic)
  INFOGRAPHIC: (item: string, style: string, parts: string[], domain: string, metaphor: string) => 
    `Create a high-fidelity educational infographic: A "${metaphor}" of ${item}.
    
    **Context:** This is a ${domain} topic.
    **Key Components to visualize:** ${parts.join(', ')}.
    
    **Visual Style:** ${style}.
    
    **Requirements:**
    - **Physical/Biological:** Floating parts, exploded view, leader lines, studio lighting.
    - **Software/Tech:** 3D isometric architecture, glowing data streams, server blocks, code fragments, floating modules, connected by logical flows. Dark mode tech aesthetic.
    - **Conceptual:** Abstract 3D representation, floating spheres or planes representing concepts, ethereal lighting, interconnected nodes.
    
    Composition: Clean, centered, educational, high resolution.`,

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

  // Step 4: Authoring Deep Dive (Gemini 2.5 Flash + Search)
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

  // Step 5: Veo Video
  VIDEO: (item: string, domain: string, metaphor: string) => 
    `Cinematic technical animation of ${item}.
    
    **Type:** ${domain} (${metaphor}).
    
    **Action:**
    - **Physical:** Slow-motion exploded view assembly. Parts fly in and lock together.
    - **Software:** Data packets flowing through the architecture. Modules lighting up. Code compiling into a UI.
    - **Conceptual:** Abstract shapes morphing and harmonizing into a unified sphere/light.
    
    **Style:** High-end 8k render, smooth motion, educational focus. No text overlays.`,

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