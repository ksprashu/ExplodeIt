import { GoogleGenAI } from "@google/genai";
import { ObjectPlan, ComponentPart, TokenUsage, GenerationItem, StageModelConfig } from "../types";
import { 
  MODEL_PLANNING, 
  MODEL_AUTHORING,
  MODEL_SCRIPT,
  MODEL_IMAGE, 
  MODEL_IMAGE_BUDGET,
  MODEL_VIDEO, 
  MODEL_TTS, 
  MODEL_SURPRISE, 
  MODEL_REGISTRY,
  PROMPTS, 
  PRICING, 
  calculateModelCost,
  PlanSchema 
} from "../constants";
import { trackGeminiCall } from "./analytics";

// Module augmentation for @google/genai Interactions API (v2.x)
declare module "@google/genai" {
  interface GoogleGenAI {
    interactions: {
      create(params: {
        model?: string;
        input: any;
        tools?: any[];
        response_format?: any;
        generation_config?: any;
        [key: string]: any;
      }): Promise<any>;
      get?(params: any): Promise<any>;
    };
  }
}

// Global mutable key state (supports BYOK)
let globalApiKey = process.env.API_KEY || "";

export const setGlobalApiKey = (key: string) => {
  globalApiKey = key;
};

const getAI = () => {
  if (!globalApiKey) throw new Error("API Key not configured. Please set your API key.");
  const ai = new GoogleGenAI({ apiKey: globalApiKey });
  if (!ai.interactions) {
    (ai as any).interactions = {
      create: async (params: any) => {
        if (typeof (ai.models as any)?.generateContent === 'function') {
          const contents = typeof params.input === 'string' ? params.input : JSON.stringify(params.input);
          const res = await (ai.models as any).generateContent({
            model: params.model,
            contents,
            config: {
              responseMimeType: params.response_format?.mime_type,
              responseSchema: params.response_format?.schema,
            }
          });
          return {
            output_text: res.text || res.candidates?.[0]?.content?.parts?.[0]?.text || '',
            usage: {
              prompt_tokens: res.usageMetadata?.promptTokenCount || 0,
              completion_tokens: res.usageMetadata?.candidatesTokenCount || 0,
            },
            candidates: res.candidates
          };
        }
        throw new Error("Neither interactions.create nor models.generateContent is available on GoogleGenAI client.");
      }
    };
  }
  return ai;
};

// Retry utility for robustness
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000, context = ""): Promise<T> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            console.warn(`Attempt ${i + 1} failed for ${context}:`, error);
            if (i === retries - 1) throw error;
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
    throw new Error(`Failed after ${retries} attempts`);
};

export const calculateCost = (model: string, input: number, output: number, isMedia: boolean = false): number => {
    const isTTS = model === MODEL_TTS || MODEL_REGISTRY[model]?.type === 'tts';
    return calculateModelCost(model, input, output, isMedia ? undefined : (isTTS ? input : undefined));
};

// Robust token usage parser supporting Interactions API (usage / steps) and legacy fallbacks
const parseTokenUsage = (
  interaction: any,
  defaultInput: number = 0,
  defaultOutput: number = 0
): { inputTokens: number; outputTokens: number } => {
  let inputTokens = 0;
  let outputTokens = 0;

  // 1. Top-level interaction.usage
  if (interaction?.usage) {
    const u = interaction.usage;
    inputTokens = u.total_input_tokens ?? u.prompt_tokens ?? u.input_tokens ?? u.promptTokenCount ?? 0;
    outputTokens = u.total_output_tokens ?? u.completion_tokens ?? u.output_tokens ?? u.candidatesTokenCount ?? 0;
  }

  // 2. Step-level usage or metadata
  if (Array.isArray(interaction?.steps)) {
    let stepInput = 0;
    let stepOutput = 0;
    for (const step of interaction.steps) {
      const u = step?.usage || step?.metadata?.usage;
      if (u) {
        stepInput += u.total_input_tokens ?? u.prompt_tokens ?? u.input_tokens ?? u.promptTokenCount ?? 0;
        stepOutput += u.total_output_tokens ?? u.completion_tokens ?? u.output_tokens ?? u.candidatesTokenCount ?? 0;
      }
    }
    if (inputTokens === 0 && stepInput > 0) inputTokens = stepInput;
    if (outputTokens === 0 && stepOutput > 0) outputTokens = stepOutput;
  }

  // 3. Fallback to usageMetadata (legacy SDK compatibility)
  if (inputTokens === 0 && interaction?.usageMetadata?.promptTokenCount) {
    inputTokens = interaction.usageMetadata.promptTokenCount;
  }
  if (outputTokens === 0 && interaction?.usageMetadata?.candidatesTokenCount) {
    outputTokens = interaction.usageMetadata.candidatesTokenCount;
  }

  return {
    inputTokens: inputTokens || defaultInput,
    outputTokens: outputTokens || defaultOutput
  };
};

// Helper to extract text output from Interaction
const extractOutputText = (interaction: any): string => {
  if (typeof interaction?.output_text === 'string') {
    return interaction.output_text;
  }
  if (Array.isArray(interaction?.steps)) {
    const trailingParts: string[] = [];
    for (let i = interaction.steps.length - 1; i >= 0; i--) {
      const step = interaction.steps[i];
      if (step?.type === 'model_output' && Array.isArray(step.content)) {
        const stepTexts = step.content
          .filter((c: any) => typeof c?.text === 'string')
          .map((c: any) => c.text);
        if (stepTexts.length > 0) {
          trailingParts.unshift(...stepTexts);
        }
      } else if (trailingParts.length > 0) {
        break;
      }
    }
    if (trailingParts.length > 0) return trailingParts.join('');
  }
  if (typeof interaction?.text === 'string') return interaction.text;
  if (typeof interaction?.text === 'function') return interaction.text();
  return interaction?.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

// 1. SURPRISE ME (Gemini 3.8 Flash)
export const getRandomObject = async (): Promise<{ name: string; usage: TokenUsage }> => {
  const ai = getAI();
  const seed = Math.floor(Math.random() * 1000000);
  
  const prompt = `Suggest ONE interesting physical object for an educational "exploded view" app.
  It should be complex enough to have interesting internal parts.
  Examples: "Vintage SLR Camera", "Mechanical Wristwatch", "Human Heart", "Jet Engine Turbine", "Espresso Machine Grouphead".
  
  Return ONLY the name.
  Random Seed: ${seed}`;

  return callWithRetry(async () => {
      // Modern Interactions API without deprecated temperature/top_p/top_k
      const interaction = await ai.interactions.create({
        model: MODEL_SURPRISE, 
        input: prompt
      });

      const text = extractOutputText(interaction);
      const name = text.trim() || "Vintage Typewriter";
      const { inputTokens, outputTokens } = parseTokenUsage(interaction);
      
      trackGeminiCall(MODEL_SURPRISE, "Surprise Me", "success");

      return {
        name,
        usage: {
          model: MODEL_SURPRISE,
          inputTokens,
          outputTokens,
          costEstimate: calculateCost(MODEL_SURPRISE, inputTokens, outputTokens)
        }
      };
  }, 3, 1000, "Surprise Me (Flash)");
};

export interface GenerateVideoOptions {
    mode?: 'assembly' | 'disassembly';
    model?: string;
    stageConfig?: Partial<StageModelConfig>;
}

// 2. PLAN OBJECT (Gemini 3.1 Pro Preview)
export const planObject = async (
    itemName: string,
    stageModelOverride?: string | Partial<StageModelConfig>
): Promise<{ data: ObjectPlan; usage: TokenUsage }> => {
    const ai = getAI();
    const model = (typeof stageModelOverride === 'string' 
        ? stageModelOverride 
        : stageModelOverride?.planning) || MODEL_PLANNING;
    
    return callWithRetry(async () => {
        const interaction = await ai.interactions.create({
            model: model,
            input: PROMPTS.PLAN_OBJECT(itemName),
            tools: [{ type: "google_search" }],
            response_format: {
                type: "text",
                mime_type: "application/json",
                schema: PlanSchema
            }
        });

        const text = extractOutputText(interaction);
        if (!text) throw new Error("Failed to plan object");
        let cleanJson = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
        }
        const data = JSON.parse(cleanJson) as ObjectPlan;
        const { inputTokens, outputTokens } = parseTokenUsage(interaction);

        trackGeminiCall(model, "Plan Object", "success", outputTokens);

        return {
            data,
            usage: {
                model: model,
                inputTokens,
                outputTokens,
                costEstimate: calculateCost(model, inputTokens, outputTokens)
            }
        };
    }, 3, 1000, "Plan Object");
};

// 3. GENERATE INFOGRAPHIC (Gemini 3 Pro Image)
export const generateInfographic = async (
    itemName: string, 
    plan: ObjectPlan,
    stageModelOverride?: string | Partial<StageModelConfig>
): Promise<{ url: string; usage: TokenUsage }> => {
    const ai = getAI();
    const model = (typeof stageModelOverride === 'string'
        ? stageModelOverride
        : stageModelOverride?.infographic) || MODEL_IMAGE;
    const prompt = PROMPTS.INFOGRAPHIC(itemName, plan.visualStylePrompt, plan.componentList, plan.domainType, plan.visualMetaphor);

    return callWithRetry(async () => {
        let base64Data = "";

        if (model.startsWith('imagen-') && typeof (ai.models as any)?.generateImages === 'function') {
            try {
                const imgRes = await (ai.models as any).generateImages({
                    model,
                    prompt,
                    config: { numberOfImages: 1, aspectRatio: '16:9' }
                });
                base64Data = imgRes.generatedImages?.[0]?.image?.imageBytes || "";
            } catch (err) {
                console.warn("Imagen generation failed, attempting interactions fallback:", err);
            }
        }

        if (!base64Data) {
            const isBudget = model === MODEL_IMAGE_BUDGET || model.includes('flash');
            const interaction = await ai.interactions.create({
                model: model,
                input: prompt,
                response_format: {
                    type: "image",
                    aspect_ratio: "16:9",
                    image_size: isBudget ? "1K" : "2K"
                }
            });

            if (interaction?.output_image?.data || interaction?.output_image?.image_bytes || interaction?.output_image?.imageBytes) {
                base64Data = interaction.output_image.data || interaction.output_image.image_bytes || interaction.output_image.imageBytes;
            } else if (Array.isArray(interaction?.steps)) {
                for (const step of interaction.steps) {
                    if (step?.type === 'model_output' && Array.isArray(step.content)) {
                        for (const part of step.content) {
                            if (part?.type === 'image' && (part.data || part.inlineData?.data || part.image_bytes || part.imageBytes)) {
                                base64Data = part.data || part.inlineData?.data || part.image_bytes || part.imageBytes;
                                break;
                            }
                        }
                    }
                    if (base64Data) break;
                }
            }
            if (!base64Data && interaction?.candidates?.[0]?.content?.parts) {
                for (const part of interaction.candidates[0].content.parts) {
                    if (part.inlineData) {
                        base64Data = part.inlineData.data;
                        break;
                    }
                }
            }
        }
        if (!base64Data) throw new Error("Failed to generate infographic");

        trackGeminiCall(model, "Generate Infographic", "success");

        return {
            url: `data:image/png;base64,${base64Data}`,
            usage: {
                model: model,
                inputTokens: Math.round(prompt.length / 4),
                outputTokens: 0,
                costEstimate: calculateCost(model, 0, 0, true)
            }
        };
    }, 3, 2000, "Infographic Generation");
};

// 4. GENERATE ASSEMBLED IMAGE (Gemini 3 Pro Image - Image to Image)
export const generateAssembledImage = async (
    itemName: string, 
    title: string, 
    description: string, 
    domain: string, 
    infographicBase64: string,
    stageModelOverride?: string | Partial<StageModelConfig>
): Promise<{ url: string; usage: TokenUsage }> => {
    const ai = getAI();
    const model = (typeof stageModelOverride === 'string'
        ? stageModelOverride
        : stageModelOverride?.assembled) || MODEL_IMAGE;
    const cleanBase64 = infographicBase64.replace(/^data:image\/\w+;base64,/, "");
    const prompt = PROMPTS.ASSEMBLED(itemName, title, description, domain);

    return callWithRetry(async () => {
        let base64Data = "";

        if (model.startsWith('imagen-') && typeof (ai.models as any)?.generateImages === 'function') {
            try {
                const imgRes = await (ai.models as any).generateImages({
                    model,
                    prompt,
                    config: { numberOfImages: 1, aspectRatio: '16:9' }
                });
                base64Data = imgRes.generatedImages?.[0]?.image?.imageBytes || "";
            } catch (err) {
                console.warn("Imagen generation failed, falling back to interactions:", err);
            }
        }

        if (!base64Data) {
            const isBudget = model === MODEL_IMAGE_BUDGET || model.includes('flash');
            const interaction = await ai.interactions.create({
                model: model,
                input: [
                    { type: 'text', text: prompt },
                    { type: 'image', data: cleanBase64, mime_type: 'image/png' }
                ],
                response_format: {
                    type: "image",
                    aspect_ratio: "16:9",
                    image_size: isBudget ? "1K" : "2K"
                }
            });

            if (interaction?.output_image?.data || interaction?.output_image?.image_bytes || interaction?.output_image?.imageBytes) {
                base64Data = interaction.output_image.data || interaction.output_image.image_bytes || interaction.output_image.imageBytes;
            } else if (Array.isArray(interaction?.steps)) {
                for (const step of interaction.steps) {
                    if (step?.type === 'model_output' && Array.isArray(step.content)) {
                        for (const part of step.content) {
                            if (part?.type === 'image' && (part.data || part.inlineData?.data || part.image_bytes || part.imageBytes)) {
                                base64Data = part.data || part.inlineData?.data || part.image_bytes || part.imageBytes;
                                break;
                            }
                        }
                    }
                    if (base64Data) break;
                }
            }
            if (!base64Data && interaction?.candidates?.[0]?.content?.parts) {
                for (const part of interaction.candidates[0].content.parts) {
                    if (part.inlineData) {
                        base64Data = part.inlineData.data;
                        break;
                    }
                }
            }
        }
        if (!base64Data) throw new Error("Failed to generate assembled image");

        trackGeminiCall(model, "Generate Assembled Image", "success");

        return {
            url: `data:image/png;base64,${base64Data}`,
            usage: {
                model: model,
                inputTokens: Math.round(prompt.length / 4),
                outputTokens: 0,
                costEstimate: calculateCost(model, 0, 0, true)
            }
        };
    }, 3, 2000, "Assembled Image Generation");
};

// 5. ENRICH COMPONENT DETAILS (Gemini 3.8 Flash + Search - BATCHED PARALLEL)
export const enrichComponentDetails = async (
    itemName: string, 
    components: string[],
    stageModelOverride?: string | Partial<StageModelConfig>
): Promise<{ data: ComponentPart[]; usage: TokenUsage[] }> => {
    const ai = getAI();
    const model = (typeof stageModelOverride === 'string'
        ? stageModelOverride
        : (stageModelOverride as any)?.authoring) || MODEL_AUTHORING;
    const BATCH_SIZE = 3;
    const usageLogs: TokenUsage[] = [];
    const allComponentDetails: ComponentPart[] = [];

    // Helper function for a single batch
    const processBatch = async (batch: string[]): Promise<ComponentPart[]> => {
        return callWithRetry(async () => {
            const interaction = await ai.interactions.create({
                model: model,
                input: PROMPTS.DEEP_DIVE(itemName, batch),
                tools: [{ type: "google_search" }]
            });

            const text = extractOutputText(interaction);
            if (!text) throw new Error("Failed to enrich details");
            
            // Extract sources from Interactions API steps and annotations
            const sources: string[] = [];
            if (Array.isArray(interaction?.steps)) {
                for (const step of interaction.steps) {
                    if (step?.type === 'model_output' && Array.isArray(step.content)) {
                        for (const contentBlock of step.content) {
                            if (contentBlock?.annotations && Array.isArray(contentBlock.annotations)) {
                                for (const annotation of contentBlock.annotations) {
                                    if (annotation?.url) sources.push(annotation.url);
                                    else if (annotation?.uri) sources.push(annotation.uri);
                                }
                            }
                        }
                    }
                    if (step?.type === 'google_search_result' && Array.isArray(step.result)) {
                        for (const res of step.result) {
                            if (res?.url) sources.push(res.url);
                            else if (res?.uri) sources.push(res.uri);
                        }
                    }
                }
            }
            // Fallback to candidates groundingMetadata if present (legacy or mock response)
            const groundingChunks = interaction?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            for (const c of groundingChunks) {
                if (c?.web?.uri) sources.push(c.web.uri);
            }

            const filteredSources = sources.filter(uri => {
                if (!uri) return false;
                const ignored = ['google.com', 'vertexaisearch', 'googleusercontent'];
                return !ignored.some(i => uri.includes(i));
            });
            
            const uniqueSources = Array.from(new Set(filteredSources));

            // Parse JSON from the text, handling markdown code fences, CRLF line endings, arrays, and surrounding prose
            let jsonString = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            const firstBrace = jsonString.indexOf('{');
            const lastBrace = jsonString.lastIndexOf('}');
            const firstBracket = jsonString.indexOf('[');
            const lastBracket = jsonString.lastIndexOf(']');

            if (firstBracket !== -1 && lastBracket > firstBracket && (firstBrace === -1 || firstBracket < firstBrace)) {
                jsonString = jsonString.slice(firstBracket, lastBracket + 1);
            } else if (firstBrace !== -1 && lastBrace > firstBrace) {
                jsonString = jsonString.slice(firstBrace, lastBrace + 1);
            }
            
            let result: { components: ComponentPart[] } = { components: [] };
            try {
                const parsed = JSON.parse(jsonString);
                if (Array.isArray(parsed)) {
                    result = { components: parsed };
                } else if (parsed && typeof parsed === 'object') {
                    result = {
                        components: Array.isArray(parsed.components)
                            ? parsed.components
                            : Array.isArray(parsed.parts)
                            ? parsed.parts
                            : []
                    };
                }
            } catch (e) {
                console.error("Failed to parse JSON from search result", text);
            }
            
            const { inputTokens, outputTokens } = parseTokenUsage(interaction);

            usageLogs.push({
                model: model,
                inputTokens,
                outputTokens,
                costEstimate: calculateCost(model, inputTokens, outputTokens)
            });

            trackGeminiCall(model, "Enrich Details Batch", "success", outputTokens);

            // Attach sources to each component in this batch for attribution
            return (result.components || []).map(c => ({
                ...c,
                sources: uniqueSources
            }));

        }, 3, 2000, "Enrich Batch with Search");
    };

    // Create batches
    const batches = [];
    for (let i = 0; i < components.length; i += BATCH_SIZE) {
        batches.push(components.slice(i, i + BATCH_SIZE));
    }

    // Run parallel
    const results = await Promise.all(batches.map(batch => processBatch(batch)));
    results.forEach(res => allComponentDetails.push(...res));

    return {
        data: allComponentDetails,
        usage: usageLogs
    };
};

// 6. GENERATE VIDEO (Veo 3.1)
export const generateVideo = async (
    itemName: string, 
    domain: string, 
    metaphor: string, 
    assembledUrl: string, 
    infographicUrl: string,
    stageModelOverride?: string | Partial<StageModelConfig> | GenerateVideoOptions
): Promise<{ url: string; usage: TokenUsage }> => {
    const ai = getAI();
    let model = MODEL_VIDEO;
    let mode: 'assembly' | 'disassembly' = 'assembly';

    if (typeof stageModelOverride === 'string') {
        model = stageModelOverride;
    } else if (stageModelOverride && typeof stageModelOverride === 'object') {
        if ('mode' in stageModelOverride && stageModelOverride.mode) {
            mode = stageModelOverride.mode;
        }
        if ('model' in stageModelOverride && stageModelOverride.model) {
            model = stageModelOverride.model;
        } else if ('video' in stageModelOverride && (stageModelOverride as StageModelConfig).video) {
            model = (stageModelOverride as StageModelConfig).video;
        }
    }

    const cleanAssembled = typeof assembledUrl === 'string' ? assembledUrl.replace(/^data:image\/\w+;base64,/, "") : "";
    const cleanInfographic = typeof infographicUrl === 'string' ? infographicUrl.replace(/^data:image\/\w+;base64,/, "") : "";

    const isDisassembly = mode === 'disassembly';
    // For assembly: start frame is exploded infographic, end frame is assembled product
    // For disassembly: start frame is assembled product, end frame is exploded infographic
    const startFrameBytes = isDisassembly ? cleanAssembled : cleanInfographic;
    const endFrameBytes = isDisassembly ? cleanInfographic : cleanAssembled;
    const promptText = isDisassembly 
        ? PROMPTS.VIDEO_DISASSEMBLY(itemName, domain, metaphor)
        : PROMPTS.VIDEO_ASSEMBLY(itemName, domain, metaphor);

    return callWithRetry(async () => {
        let operation = await ai.models.generateVideos({
            model: model,
            prompt: promptText,
            image: {
                imageBytes: startFrameBytes,
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9',
                lastFrame: {
                    imageBytes: endFrameBytes,
                    mimeType: 'image/png'
                }
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = typeof (ai.operations as any).getVideosOperation === 'function'
                ? await (ai.operations as any).getVideosOperation({ operation })
                : await (ai.operations as any).get({ operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Video generation failed");

        const separator = downloadLink.includes('?') ? '&' : '?';
        const videoResponse = await fetch(globalApiKey ? `${downloadLink}${separator}key=${globalApiKey}` : downloadLink);
        const videoBlob = await videoResponse.blob();
        const url = URL.createObjectURL(videoBlob);

        trackGeminiCall(model, "Generate Video", "success");

        return {
            url,
            usage: {
                model: model,
                inputTokens: 100,
                outputTokens: 0,
                costEstimate: calculateCost(model, 0, 0, true)
            }
        };
    }, 2, 5000, "Video Generation");
};

// 7. GENERATE AUDIO NARRATION (Gemini 3.5 Flash-Lite Script -> Gemini 3.1 Flash TTS Preview)
export const generateAudioNarration = async (
    itemName: string, 
    originStory: string, 
    detailedArticle: string, 
    trivia: string[], 
    voiceName: string,
    stageModelOverride?: string | Partial<StageModelConfig>
): Promise<{ url: string; script: string; usage: TokenUsage[] }> => {
    const ai = getAI();
    const usageLogs: TokenUsage[] = [];

    const scriptModel = (typeof stageModelOverride === 'string'
        ? (stageModelOverride.includes('tts') ? MODEL_SCRIPT : stageModelOverride)
        : stageModelOverride?.narration) || MODEL_SCRIPT;
    const ttsModel = (typeof stageModelOverride === 'string' && stageModelOverride.includes('tts')
        ? stageModelOverride
        : (stageModelOverride as any)?.tts) || MODEL_TTS;

    // Step A: Generate Script (Gemini 3.5 Flash Lite) via Interactions API
    const scriptRes = await callWithRetry(async () => {
        const interaction = await ai.interactions.create({
            model: scriptModel,
            input: PROMPTS.NARRATION_SCRIPT(itemName, originStory, detailedArticle, trivia)
        });
        
        const script = extractOutputText(interaction) || "";
        const { inputTokens, outputTokens } = parseTokenUsage(interaction);
        usageLogs.push({
            model: scriptModel,
            inputTokens,
            outputTokens,
            costEstimate: calculateCost(scriptModel, inputTokens, outputTokens)
        });
        
        trackGeminiCall(scriptModel, "Generate Script", "success", outputTokens);

        return script;
    }, 3, 1000, "Script Gen");

    if (!scriptRes) throw new Error("Failed to generate script");

    // Step B: Generate Audio (Gemini 3.1 Flash TTS Preview) via Interactions API
    // Check if voice is valid, default to 'Kore' if not
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const audioRes = await callWithRetry(async () => {
        const interaction = await ai.interactions.create({
            model: ttsModel,
            input: scriptRes,
            response_format: {
                type: 'audio'
            },
            generation_config: {
                speech_config: [
                    { voice: selectedVoice }
                ]
            }
        });

        let base64Audio = interaction?.output_audio?.data || interaction?.output_audio?.audio_bytes || interaction?.output_audio?.audioBytes;
        if (!base64Audio && Array.isArray(interaction?.steps)) {
            for (const step of interaction.steps) {
                if (step?.type === 'model_output' && Array.isArray(step.content)) {
                    for (const c of step.content) {
                        if (c?.type === 'audio' && (c.data || c.inlineData?.data || c.audio_bytes || c.audioBytes)) {
                            base64Audio = c.data || c.inlineData?.data || c.audio_bytes || c.audioBytes;
                            break;
                        }
                    }
                }
                if (base64Audio) break;
            }
        }
        if (!base64Audio) {
            base64Audio = interaction?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        }
        if (!base64Audio) throw new Error("No audio data returned");

        // Convert base64 to blob url (strip potential whitespace/newlines)
        const cleanBase64Audio = base64Audio.replace(/\s+/g, '');
        const binaryString = atob(cleanBase64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
             bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Add WAV Header if not already containerized (WAV, MP3, OGG)
        const audioMime = interaction?.output_audio?.mime_type || 'audio/wav';
        let wavBlob: Blob;
        if (binaryString.startsWith('RIFF')) {
            wavBlob = new Blob([bytes], { type: 'audio/wav' });
        } else if (binaryString.startsWith('ID3') || audioMime.includes('mp3') || audioMime.includes('mpeg')) {
            wavBlob = new Blob([bytes], { type: 'audio/mpeg' });
        } else if (binaryString.startsWith('OggS') || audioMime.includes('ogg')) {
            wavBlob = new Blob([bytes], { type: 'audio/ogg' });
        } else {
            const wavHeader = getWavHeader(len, 24000, 1); // 24kHz mono is standard for Gemini TTS usually
            const wavBytes = new Uint8Array(wavHeader.length + len);
            wavBytes.set(wavHeader, 0);
            wavBytes.set(bytes, wavHeader.length);
            wavBlob = new Blob([wavBytes], { type: 'audio/wav' });
        }
        const url = URL.createObjectURL(wavBlob);

        usageLogs.push({
            model: ttsModel,
            inputTokens: scriptRes.length, // Char count approx
            outputTokens: 0,
            costEstimate: calculateCost(ttsModel, scriptRes.length, 0)
        });

        trackGeminiCall(ttsModel, "Generate Audio", "success", scriptRes.length);

        return url;
    }, 3, 2000, "TTS Gen");

    return {
        url: audioRes,
        script: scriptRes,
        usage: usageLogs
    };
};

function getWavHeader(dataLength: number, sampleRate: number, numChannels: number) {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
  
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
  
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
    view.setUint16(32, numChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
  
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
  
    return new Uint8Array(buffer);
  }
  
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

// CLEANUP UTILITY
export const revokeGenerationAssets = (item: GenerationItem) => {
    if (item.videoUrl && item.videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.videoUrl);
    }
    if (item.audioUrl && item.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.audioUrl);
    }
};