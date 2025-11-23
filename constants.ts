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
  // Step 1: Plan (Gemini 3 Pro)
  PLAN_OBJECT: (item: string) => `You are the editor-in-chief of a modern interactive encyclopedia. Create a comprehensive content plan for: "${item}".
  
  1. **Dynamic Section Titles**: Generate creative, context-aware titles for the following sections:
     - Origin Section: A title for the history/discovery (e.g., "The Spark of Life", "Da Vinci's Dream").
     - Anatomy Section: A title for the structure (e.g., "Biological Structure", "Mechanical Assembly").
     - Deep Dive Article: A title for the main encyclopedia entry (e.g., "Cardiovascular Dynamics", "The Physics of Phase Change").
     - Trivia Section: A title for the facts (e.g., "Heartbeats & History", "Did You Know?").

  2. **Content**:
     - "Origin Story": A concise, engaging overview of ~100 words.
     - "Detailed Article": ~600-800 words. Use Markdown headers (##) to separate sections. Choose 3-4 subtitles that best fit the topic (e.g., for machines: "Mechanics", "Evolution"; for nature: "Function", "Symbolism", "Science"). Tone: Professional, Educational, Insightful.
     - "Trivia": 5 surprising facts.
     - "Components": Identify key visual components for an exploded view.

  3. **Style & Voice**:
     - Visual Style: Photorealistic, cinematic lighting.
     - Audio Vibe: Select the best voice persona.
  
  Do not explain. Return JSON.`,

  // Step 2: Pro Image (Infographic)
  INFOGRAPHIC: (item: string, style: string, parts: string[]) => 
    `Create a high-end educational infographic: An exploded view of a ${item}. 
    The object is separated into these specific parts: ${parts.join(', ')}.
    
    Visual Style: ${style}.
    
    Requirements:
    - Photorealistic 3D render.
    - Parts floating with clear separation.
    - Clean studio lighting.
    - Dark or neutral background for contrast.
    - Elegant leader lines and text labels identifying the parts.`,

  // Step 3: Pro Image (Assembled - Image to Image)
  ASSEMBLED: (item: string, title: string, description: string) => 
    `A photorealistic studio shot of a fully assembled, intact ${title} (${item}).
    
    Context Description: ${description}
    
    CRITICAL INSTRUCTIONS:
    - Use the provided exploded view as the BLUEPRINT.
    - The assembled object must match the materials, colors, and design aesthetic of the exploded parts EXACTLY.
    - The object must be CLOSED and WHOLE.
    - It is the finished product sitting on a surface.
    - High resolution, sharp focus, cinematic lighting.`,

  // Step 4: Authoring Deep Dive (Gemini 2.5 Flash + Search)
  DEEP_DIVE: (item: string, components: string[]) => 
    `Research and write a detailed educational "Bill of Materials" entry for a ${item}.
    
    For each component listed below, use Google Search to find accurate technical details.
    Components: ${components.join(', ')}
    
    Return a SINGLE JSON object with a "components" array. 
    Each item in the array must have:
    - "name": (string) The component name.
    - "composition": (string) Specific material (e.g., "Polycarbonate", "Titanium Alloy").
    - "shortDescription": (string) 1 sentence summary.
    - "detailedContent": (string) 3-4 paragraphs (~200 words) explaining the engineering, science, history, or biological function.
    
    Output JSON ONLY. No markdown formatting.
    Structure: { "components": [ ... ] }`,

  // Step 5: Veo Video
  VIDEO: (item: string) => 
    `Cinematic technical animation of a ${item} exploding into its constituent parts. 
    - Smooth slow-motion separation.
    - The object starts fully assembled (intact) and parts expand outwards.
    - Shows the internal mechanics revealed.
    - Do not include text overlays. Focus on the object anatomy.`,

  // Step 6: Audio Script (Gemini Flash Lite)
  NARRATION_SCRIPT: (item: string, origin: string, article: string, trivia: string[]) => 
    `You are a charismatic museum tour guide. Write a rich, engaging 45-60 second script about the ${item}.
    
    Source Material:
    - Origin Story: "${origin}"
    - Technical Mechanics (Summarize): "${article.substring(0, 1500)}..."
    - Fun Facts: ${trivia.join(', ')}

    The script should be spoken directly to the listener. 
    Synthesis the information into a cohesive narrative flow:
    1. Hook the listener with the origin or a fun fact.
    2. Briefly explain how it works (mechanics).
    3. End with a thought-provoking observation.
    
    Make it sound natural, slightly witty, and educational.
    Do NOT include stage directions like [Pause] or *Effect*. Just the raw spoken text.`
};

// SCHEMAS

export const PlanSchema = {
  type: Type.OBJECT,
  properties: {
    displayTitle: { type: Type.STRING },
    category: { type: Type.STRING },
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
  required: ["displayTitle", "category", "sectionTitles", "originStory", "detailedArticle", "trivia", "visualStylePrompt", "componentList", "audioVibe"]
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