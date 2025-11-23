import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ObjectPlan, ComponentPart, TokenUsage } from "../types";
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
  PlanSchema 
} from "../constants";

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

// 2. PLAN OBJECT (Gemini 3 Pro)
export const planObject = async (itemName: string): Promise<{ data: ObjectPlan; usage: TokenUsage }> => {
    const ai = getAI();
    
    return callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_PLANNING,
            contents: PROMPTS.PLAN_OBJECT(itemName),
            config: {
                responseMimeType: "application/json",
                responseSchema: PlanSchema
            }
        });

        if (!response.text) throw new Error("Failed to plan object");
        const data = JSON.parse(response.text) as ObjectPlan;

        return {
            data,
            usage: {
                model: MODEL_PLANNING,
                inputTokens: response.usageMetadata?.promptTokenCount || 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
                costEstimate: calculateCost(MODEL_PLANNING, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0)
            }
        };
    }, 3, 1000, "Plan Object");
};

// 3. GENERATE INFOGRAPHIC (Pro Image)
export const generateInfographic = async (itemName: string, plan: ObjectPlan): Promise<{ url: string; usage: TokenUsage }> => {
    const ai = getAI();
    const prompt = PROMPTS.INFOGRAPHIC(itemName, plan.visualStylePrompt, plan.componentList);

    return callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE,
            contents: prompt,
            config: {
                imageConfig: {
                    aspectRatio: "16:9",
                    imageSize: "2K"
                }
            }
        });

        let base64Data = "";
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                base64Data = part.inlineData.data;
                break;
            }
        }
        if (!base64Data) throw new Error("Failed to generate infographic");

        return {
            url: `data:image/png;base64,${base64Data}`,
            usage: {
                model: MODEL_IMAGE,
                inputTokens: prompt.length / 4,
                outputTokens: 0,
                costEstimate: calculateCost(MODEL_IMAGE, 0, 0, true)
            }
        };
    }, 3, 2000, "Infographic Generation");
};

// 4. GENERATE ASSEMBLED IMAGE (Pro Image - Image to Image)
export const generateAssembledImage = async (itemName: string, infographicBase64: string): Promise<{ url: string; usage: TokenUsage }> => {
    const ai = getAI();
    const cleanBase64 = infographicBase64.replace(/^data:image\/\w+;base64,/, "");
    const prompt = PROMPTS.ASSEMBLED(itemName);

    return callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE,
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

        let base64Data = "";
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                base64Data = part.inlineData.data;
                break;
            }
        }
        if (!base64Data) throw new Error("Failed to generate assembled image");

        return {
            url: `data:image/png;base64,${base64Data}`,
            usage: {
                model: MODEL_IMAGE,
                inputTokens: prompt.length / 4,
                outputTokens: 0,
                costEstimate: calculateCost(MODEL_IMAGE, 0, 0, true)
            }
        };
    }, 3, 2000, "Assembled Image Generation");
};

// 5. ENRICH COMPONENT DETAILS (Gemini 2.5 Flash + Search - BATCHED PARALLEL)
export const enrichComponentDetails = async (itemName: string, components: string[]): Promise<{ data: ComponentPart[]; usage: TokenUsage[] }> => {
    const ai = getAI();
    const BATCH_SIZE = 3;
    const usageLogs: TokenUsage[] = [];
    const allComponentDetails: ComponentPart[] = [];

    // Helper function for a single batch
    const processBatch = async (batch: string[]): Promise<ComponentPart[]> => {
        return callWithRetry(async () => {
            const response = await ai.models.generateContent({
                model: MODEL_AUTHORING,
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
                model: MODEL_AUTHORING,
                inputTokens: response.usageMetadata?.promptTokenCount || 0,
                outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
                costEstimate: calculateCost(MODEL_AUTHORING, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0)
            });

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
export const generateVideo = async (itemName: string, assembledUrl: string, infographicUrl: string): Promise<{ url: string; usage: TokenUsage }> => {
    const ai = getAI();
    const cleanStart = assembledUrl.replace(/^data:image\/\w+;base64,/, "");
    const cleanEnd = infographicUrl.replace(/^data:image\/\w+;base64,/, "");

    return callWithRetry(async () => {
        let operation = await ai.models.generateVideos({
            model: MODEL_VIDEO,
            prompt: PROMPTS.VIDEO(itemName),
            image: {
                imageBytes: cleanStart,
                mimeType: 'image/png',
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9',
                lastFrame: {
                    imageBytes: cleanEnd,
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

        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const videoBlob = await videoResponse.blob();
        const url = URL.createObjectURL(videoBlob);

        return {
            url,
            usage: {
                model: MODEL_VIDEO,
                inputTokens: 100,
                outputTokens: 0,
                costEstimate: calculateCost(MODEL_VIDEO, 0, 0, true)
            }
        };
    }, 2, 5000, "Video Generation");
};

// 7. GENERATE AUDIO NARRATION (Flash Lite Script -> TTS)
export const generateAudioNarration = async (itemName: string, originStory: string, detailedArticle: string, trivia: string[], voiceName: string): Promise<{ url: string; script: string; usage: TokenUsage[] }> => {
    const ai = getAI();
    const usageLogs: TokenUsage[] = [];

    // Step A: Generate Script (Gemini Flash Lite)
    const scriptRes = await callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_SCRIPT,
            contents: PROMPTS.NARRATION_SCRIPT(itemName, originStory, detailedArticle, trivia)
        });
        
        const script = response.text || "";
        usageLogs.push({
            model: MODEL_SCRIPT,
            inputTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
            costEstimate: calculateCost(MODEL_SCRIPT, response.usageMetadata?.promptTokenCount || 0, response.usageMetadata?.candidatesTokenCount || 0)
        });
        return script;
    }, 3, 1000, "Script Gen");

    if (!scriptRes) throw new Error("Failed to generate script");

    // Step B: Generate Audio (TTS)
    // Check if voice is valid, default to 'Kore' if not
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const selectedVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const audioRes = await callWithRetry(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_TTS,
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
            model: MODEL_TTS,
            inputTokens: scriptRes.length, // Char count approx
            outputTokens: 0,
            costEstimate: calculateCost(MODEL_TTS, scriptRes.length, 0)
        });

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