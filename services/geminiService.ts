import { GoogleGenAI, Modality } from "@google/genai";
import { ObjectPlan, ComponentPart, TokenUsage, GenerationItem, StageModelConfig } from "../types";
import { 
  MODEL_PLANNING, 
  MODEL_AUTHORING,
  MODEL_SCRIPT,
  MODEL_IMAGE, 
  MODEL_VIDEO, 
  MODEL_TTS, 
  MODEL_SURPRISE, 
  PROMPTS, 
  PRICING, 
  calculateModelCost,
  PlanSchema 
} from "../constants";
import { trackGeminiCall } from "./analytics";

// Global mutable key state (supports BYOK)
let globalApiKey = process.env.API_KEY || "";

export const setGlobalApiKey = (key: string) => {
  globalApiKey = key;
};

const getAI = () => {
  if (!globalApiKey) throw new Error("API Key not configured. Please set your API key.");
  return new GoogleGenAI({ apiKey: globalApiKey });
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
    return calculateModelCost(model, input, output, isMedia ? undefined : (model === MODEL_TTS ? input : undefined));
};

// 1. SURPRISE ME (Flash - Faster)
export const getRandomObject = async (): Promise<{ name: string; usage: TokenUsage }> => {
  const ai = getAI();
  const seed = Math.floor(Math.random() * 1000000);
  
  const prompt = `Suggest ONE interesting physical object for an educational "exploded view" app.
  It should be complex enough to have interesting internal parts.
  Examples: "Vintage SLR Camera", "Mechanical Wristwatch", "Human Heart", "Jet Engine Turbine", "Espresso Machine Grouphead".
  
  Return ONLY the name.
  Random Seed: ${seed}`;

  return callWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: MODEL_SURPRISE, 
        contents: prompt,
        config: { temperature: 1.3 }
      });

      const name = response.text?.trim() || "Vintage Typewriter";
      
      trackGeminiCall(MODEL_SURPRISE, "Surprise Me", "success");

      return {
        name,
        usage: {
          model: MODEL_SURPRISE,
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
          costEstimate: calculateCost(MODEL_SURPRISE, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0)
        }
      };
  }, 3, 1000, "Surprise Me (Flash)");
};

export interface GenerateVideoOptions {
    mode?: 'assembly' | 'disassembly';
    model?: string;
    stageConfig?: Partial<StageModelConfig>;
}

// 2. PLAN OBJECT (Gemini 3 Pro)
export const planObject = async (
    itemName: string,
    stageModelOverride?: string | Partial<StageModelConfig>
): Promise<{ data: ObjectPlan; usage: TokenUsage }> => {
    const ai = getAI();
    const model = (typeof stageModelOverride === 'string' 
        ? stageModelOverride 
        : stageModelOverride?.planning) || MODEL_PLANNING;
    
    return callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: model,
            contents: PROMPTS.PLAN_OBJECT(itemName),
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: PlanSchema
            }
        });

        if (!response.text) throw new Error("Failed to plan object");
        const data = JSON.parse(response.text) as ObjectPlan;

        trackGeminiCall(model, "Plan Object", "success", response.usageMetadata?.candidatesTokenCount || 0);

        return {
            data,
            usage: {
                model: model,
                inputTokens: response.usageMetadata?.promptTokenCount || 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
                costEstimate: calculateCost(model, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0)
            }
        };
    }, 3, 1000, "Plan Object");
};

// 3. GENERATE INFOGRAPHIC (Pro Image)
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

        if (model.startsWith('imagen-') && typeof (ai.models as any).generateImages === 'function') {
            try {
                const imgRes = await (ai.models as any).generateImages({
                    model,
                    prompt,
                    config: { numberOfImages: 1, aspectRatio: '16:9' }
                });
                base64Data = imgRes.generatedImages?.[0]?.image?.imageBytes || "";
            } catch (err) {
                console.warn("Imagen generation failed, attempting generateContent fallback:", err);
            }
        }

        if (!base64Data) {
            const response = await ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    imageConfig: {
                        aspectRatio: "16:9",
                        imageSize: "2K"
                    }
                }
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    base64Data = part.inlineData.data;
                    break;
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

// 4. GENERATE ASSEMBLED IMAGE (Pro Image - Image to Image)
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

        if (model.startsWith('imagen-') && typeof (ai.models as any).generateImages === 'function') {
            try {
                const imgRes = await (ai.models as any).generateImages({
                    model,
                    prompt,
                    config: { numberOfImages: 1, aspectRatio: '16:9' }
                });
                base64Data = imgRes.generatedImages?.[0]?.image?.imageBytes || "";
            } catch (err) {
                console.warn("Imagen generation failed, falling back to generateContent:", err);
            }
        }

        if (!base64Data) {
            const response = await ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { mimeType: 'image/png', data: cleanBase64 } }
                    ]
                },
                config: {
                    imageConfig: {
                        aspectRatio: "16:9",
                        imageSize: "2K"
                    }
                }
            });

            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    base64Data = part.inlineData.data;
                    break;
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

// 5. ENRICH COMPONENT DETAILS (Gemini 2.5 Flash + Search - BATCHED PARALLEL)
export const enrichComponentDetails = async (
    itemName: string, 
    components: string[],
    stageModelOverride?: string | Partial<StageModelConfig>
): Promise<{ data: ComponentPart[]; usage: TokenUsage[] }> => {
    const ai = getAI();
    const model = (typeof stageModelOverride === 'string'
        ? stageModelOverride
        : (stageModelOverride as any)?.authoring || stageModelOverride?.planning) || MODEL_AUTHORING;
    const BATCH_SIZE = 3;
    const usageLogs: TokenUsage[] = [];
    const allComponentDetails: ComponentPart[] = [];

    // Helper function for a single batch
    const processBatch = async (batch: string[]): Promise<ComponentPart[]> => {
        return callWithRetry(async () => {
            const response = await ai.models.generateContent({
                model: model,
                contents: PROMPTS.DEEP_DIVE(itemName, batch),
                config: {
                    tools: [{ googleSearch: {} }],
                    // responseSchema/MimeType not allowed with tools
                }
            });

            if (!response.text) throw new Error("Failed to enrich details");
            
            // Extract sources from Grounding Metadata, filtering out internal Google URLs
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            const sources = groundingChunks
                .map(c => c.web?.uri)
                .filter(uri => {
                    if (!uri) return false;
                    const ignored = ['google.com', 'vertexaisearch', 'googleusercontent'];
                    return !ignored.some(i => uri.includes(i));
                }) as string[];
            
            const uniqueSources = Array.from(new Set(sources));

            // Parse JSON manually from the text (Gemini usually wraps in ```json ... ```)
            const text = response.text;
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
            const jsonString = jsonMatch ? jsonMatch[1] : text;
            
            let result: { components: ComponentPart[] } = { components: [] };
            try {
                result = JSON.parse(jsonString);
            } catch (e) {
                console.error("Failed to parse JSON from search result", text);
                // Fallback or empty if parsing fails, but loop continues
            }
            
            usageLogs.push({
                model: model,
                inputTokens: response.usageMetadata?.promptTokenCount || 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
                costEstimate: calculateCost(model, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0)
            });

            trackGeminiCall(model, "Enrich Details Batch", "success", response.usageMetadata?.candidatesTokenCount || 0);

            // Attach sources to each component in this batch for attribution
            return result.components.map(c => ({
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

// 6. GENERATE VIDEO (Veo)
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

    const cleanAssembled = assembledUrl.replace(/^data:image\/\w+;base64,/, "");
    const cleanInfographic = infographicUrl.replace(/^data:image\/\w+;base64,/, "");

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
            operation = await ai.operations.getVideosOperation({ operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Video generation failed");

        const videoResponse = await fetch(`${downloadLink}&key=${globalApiKey}`);
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

// 7. GENERATE AUDIO NARRATION (Flash Lite Script -> TTS)
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

    // Step A: Generate Script (Gemini Flash Lite)
    const scriptRes = await callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: scriptModel,
            contents: PROMPTS.NARRATION_SCRIPT(itemName, originStory, detailedArticle, trivia)
        });
        
        const script = response.text || "";
        usageLogs.push({
            model: scriptModel,
            inputTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
            costEstimate: calculateCost(scriptModel, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0)
        });
        
        trackGeminiCall(scriptModel, "Generate Script", "success", response.usageMetadata?.candidatesTokenCount || 0);

        return script;
    }, 3, 1000, "Script Gen");

    if (!scriptRes) throw new Error("Failed to generate script");

    // Step B: Generate Audio (TTS)
    // Check if voice is valid, default to 'Kore' if not
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const audioRes = await callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: ttsModel,
            contents: { parts: [{ text: scriptRes }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: selectedVoice }
                    }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned");

        // Convert base64 to blob url
        const binaryString = atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
             bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Add WAV Header
        const wavHeader = getWavHeader(len, 24000, 1); // 24kHz mono is standard for Gemini TTS usually
        const wavBytes = new Uint8Array(wavHeader.length + len);
        wavBytes.set(wavHeader, 0);
        wavBytes.set(bytes, wavHeader.length);
        
        const wavBlob = new Blob([wavBytes], { type: 'audio/wav' });
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