import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  PlanSchema 
} from '../constants';
import { ObjectPlan } from '../types';

let mockInteractionsAvailable = true;
const mockInteractionsCreate = vi.fn();
const mockGenerateContent = vi.fn();
const mockGenerateVideos = vi.fn();
const mockGetVideosOperation = vi.fn();
const mockGetOperation = vi.fn();

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
      operations: any;
      constructor(public options: { apiKey: string }) {
        if (mockInteractionsAvailable) {
          this.interactions = {
            create: mockInteractionsCreate
          };
        }
        this.models = {
          generateVideos: mockGenerateVideos,
          generateImages: vi.fn(),
          generateContent: mockGenerateContent
        };
        this.operations = {
          getVideosOperation: mockGetVideosOperation,
          get: mockGetOperation
        };
      }
    }
  };
});

import { 
  setGlobalApiKey, 
  getAI,
  getRandomObject, 
  planObject, 
  enrichComponentDetails, 
  generateInfographic, 
  generateAssembledImage,
  generateVideo,
  generateAudioNarration
} from '../services/geminiService';

describe('Gemini Interactions API v2.3+ Integration Suite', () => {
  beforeEach(() => {
    mockInteractionsAvailable = true;
    setGlobalApiKey('AIzaSyTestInteractionsKey_123');
    mockInteractionsCreate.mockReset();
    mockGenerateContent.mockReset();
    mockGenerateVideos.mockReset();
    mockGetVideosOperation.mockReset();
    mockGetOperation.mockReset();
    vi.restoreAllMocks();
  });

  const createDummyPlan = (): ObjectPlan => ({
    displayTitle: 'Vintage SLR Camera',
    category: 'Photography',
    domainType: 'PHYSICAL',
    visualMetaphor: 'Exploded View',
    sectionTitles: {
      origin: 'Optical History',
      anatomy: 'Anatomical Structure',
      article: 'Mechanics of Photography',
      trivia: 'Camera Curiosities'
    },
    originStory: 'Invented in the early 20th century.',
    detailedArticle: 'Comprehensive breakdown of optics and precision focal plane shutter mechanics.',
    componentList: ['Lens Element', 'Focal Plane Shutter', 'Pentaprism'],
    trivia: ['Over 1,000 precision parts.', 'First SLR was invented in 1861.'],
    visualStylePrompt: 'Hyper-detailed technical render',
    audioVibe: {
      voiceName: 'Kore',
      toneDescription: 'Classic documentary tone'
    },
    cleanExplodedPrompt: 'Pristine 3D exploded view of Vintage SLR Camera with zero 2D text.',
    cleanAssembledPrompt: 'Finished assembled studio view of Vintage SLR Camera at 45 degree isometric perspective.',
    videoAssemblyPrompt: 'Kinematic assembly animation of Vintage SLR Camera with lens threading and chassis locking.',
    videoDisassemblyPrompt: 'Kinematic disassembly animation of Vintage SLR Camera with radial unseating.',
    kinematicDetails: 'Shutter actuation and mirror flip mechanics during 1/1000s exposure.'
  });

  describe('Core Pipeline Interactions API Signatures', () => {
    it('getRandomObject: calls interactions.create with MODEL_SURPRISE without deprecated temperature', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: 'Mechanical Wristwatch',
        usage: {
          total_input_tokens: 45,
          total_output_tokens: 10
        }
      });

      const res = await getRandomObject();
      expect(res.name).toBe('Mechanical Wristwatch');
      expect(res.usage.model).toBe(MODEL_SURPRISE);
      expect(res.usage.inputTokens).toBe(45);
      expect(res.usage.outputTokens).toBe(10);
      expect(res.usage.costEstimate).toBeGreaterThan(0);

      expect(mockInteractionsCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_SURPRISE);
      expect(callArgs.input).toContain('physical object');
      // Deprecated parameters MUST be absent
      expect(callArgs.temperature).toBeUndefined();
      expect(callArgs.top_p).toBeUndefined();
      expect(callArgs.top_k).toBeUndefined();
      expect(callArgs.config?.temperature).toBeUndefined();
    });

    it('getRandomObject: fallback polyfill routes to models.generateContent without thinking parameters', async () => {
      mockInteractionsAvailable = false;
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Vintage Microscope',
        usageMetadata: {
          promptTokenCount: 50,
          candidatesTokenCount: 15
        }
      });

      const res = await getRandomObject();
      expect(res.name).toBe('Vintage Microscope');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const genArgs = mockGenerateContent.mock.calls[0][0];
      expect(genArgs.model).toBe(MODEL_SURPRISE);
      expect(genArgs.config.thinkingConfig).toBeUndefined();
      expect(genArgs.config.thinking_level).toBeUndefined();
    });

    it('planObject: invokes interactions.create with search tools and structured response_format', async () => {
      const mockPlan = createDummyPlan();

      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: JSON.stringify(mockPlan),
        usage: {
          total_input_tokens: 520,
          total_output_tokens: 980
        }
      });

      const res = await planObject('Vintage SLR Camera');
      expect(res.data.displayTitle).toBe('Vintage SLR Camera');
      expect(res.data.componentList).toHaveLength(3);
      expect(res.usage.model).toBe(MODEL_PLANNING);
      expect(res.usage.inputTokens).toBe(520);
      expect(res.usage.outputTokens).toBe(980);

      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_PLANNING);
      expect(callArgs.tools).toEqual([{ type: 'google_search' }]);
      expect(callArgs.thinkingConfig).toBeUndefined();
      expect(callArgs.generation_config).toEqual({ thinking_level: 'high' });
      expect(callArgs.response_format).toEqual({
        type: 'text',
        mime_type: 'application/json',
        schema: PlanSchema
      });
    });

    it('planObject: supports all valid thinking levels (minimal, low, medium, high) and defensively normalizes uppercase', async () => {
      const mockPlan = createDummyPlan();
      const levels: Array<'minimal' | 'low' | 'medium' | 'high'> = ['minimal', 'low', 'medium', 'high'];

      for (const level of levels) {
        mockInteractionsCreate.mockResolvedValueOnce({
          output_text: JSON.stringify(mockPlan),
          usage: { total_input_tokens: 100, total_output_tokens: 200 }
        });

        // Test lowercase
        await planObject('Vintage SLR Camera', { thinking_level: level });
        const callArgs = mockInteractionsCreate.mock.calls[mockInteractionsCreate.mock.calls.length - 1][0];
        expect(callArgs.generation_config.thinking_level).toBe(level);

        // Test uppercase defensive normalization
        mockInteractionsCreate.mockResolvedValueOnce({
          output_text: JSON.stringify(mockPlan),
          usage: { total_input_tokens: 100, total_output_tokens: 200 }
        });
        await planObject('Vintage SLR Camera', { thinking_level: level.toUpperCase() });
        const callArgsUpper = mockInteractionsCreate.mock.calls[mockInteractionsCreate.mock.calls.length - 1][0];
        expect(callArgsUpper.generation_config.thinking_level).toBe(level);
      }
    });

    it('planObject: fallback polyfill routes to models.generateContent preserving thinking level configuration when interactions is unavailable', async () => {
      mockInteractionsAvailable = false;
      const mockPlan = createDummyPlan();

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockPlan),
        usageMetadata: {
          promptTokenCount: 520,
          candidatesTokenCount: 980
        }
      });

      const res = await planObject('Vintage SLR Camera');
      expect(res.data.displayTitle).toBe('Vintage SLR Camera');
      expect(res.data.componentList).toHaveLength(3);
      expect(res.usage.model).toBe(MODEL_PLANNING);
      expect(res.usage.inputTokens).toBe(520);
      expect(res.usage.outputTokens).toBe(980);

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const genArgs = mockGenerateContent.mock.calls[0][0];
      expect(genArgs.model).toBe(MODEL_PLANNING);
      expect(genArgs.config.responseMimeType).toBe('application/json');
      expect(genArgs.config.responseSchema).toEqual(PlanSchema);
      expect(genArgs.config.thinking_level).toBe('high');
      expect(genArgs.config.thinkingConfig).toEqual({ thinkingLevel: 'high' });
    });

    it('fallback polyfill gracefully maps legacy top-level thinkingConfig to config.thinkingConfig with lowercase normalization', async () => {
      mockInteractionsAvailable = false;
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Legacy test response',
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 40 }
      });

      const ai = getAI();
      const res = await ai.interactions.create({
        model: 'gemini-3.1-pro-preview',
        input: 'Test legacy thinkingConfig',
        thinkingConfig: { thinkingLevel: 'HIGH' }
      });

      expect(res.output_text).toBe('Legacy test response');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const genArgs = mockGenerateContent.mock.calls[0][0];
      expect(genArgs.config.thinkingConfig).toEqual({ thinkingLevel: 'high' });
      expect(genArgs.config.thinking_level).toBe('high');
    });

    it('enrichComponentDetails: queries interactions.create and parses url_citation annotations', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: JSON.stringify({
          components: [
            {
              name: 'Pentaprism',
              composition: 'Optical Glass & Silver Coating',
              shortDescription: 'Reflects light through 90 degrees.',
              detailedContent: 'A five-sided prism used in SLR cameras to provide an erect, laterally correct image.'
            }
          ]
        }),
        steps: [
          {
            type: 'model_output',
            content: [
              {
                type: 'text',
                text: 'Pentaprism details and optics analysis',
                annotations: [
                  {
                    type: 'url_citation',
                    url: 'https://en.wikipedia.org/wiki/Pentaprism',
                    title: 'Wikipedia - Pentaprism'
                  },
                  {
                    type: 'url_citation',
                    url: 'https://internal.google.com/search-result', // should be filtered out
                    title: 'Google Internal'
                  }
                ]
              }
            ]
          }
        ],
        usage: {
          total_input_tokens: 350,
          total_output_tokens: 420
        }
      });

      const res = await enrichComponentDetails('Vintage Camera', ['Pentaprism']);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].name).toBe('Pentaprism');
      expect(res.data[0].sources).toContain('https://en.wikipedia.org/wiki/Pentaprism');
      // Prohibited search domain should be filtered
      expect(res.data[0].sources).not.toContain('https://internal.google.com/search-result');
      expect(res.usage[0].model).toBe(MODEL_AUTHORING);
      expect(res.usage[0].inputTokens).toBe(350);
      expect(res.usage[0].outputTokens).toBe(420);

      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_AUTHORING);
      expect(callArgs.tools).toEqual([{ type: 'google_search' }]);
    });

    it('generateInfographic: requests 2K image response_format for Pro model', async () => {
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      mockInteractionsCreate.mockResolvedValueOnce({
        output_image: {
          data: dummyBase64,
          mime_type: 'image/png'
        },
        usage: {
          total_input_tokens: 1120,
          total_output_tokens: 0
        }
      });

      const dummyPlan = createDummyPlan();
      const res = await generateInfographic('Vintage Camera', dummyPlan);

      expect(res.url).toBe(`data:image/png;base64,${dummyBase64}`);
      expect(res.usage.model).toBe(MODEL_IMAGE);

      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_IMAGE);
      expect(callArgs.response_format).toEqual({
        type: 'image',
        aspect_ratio: '16:9',
        image_size: '2K'
      });
    });

    it('generateInfographic: requests 1K image response_format for Budget model', async () => {
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      mockInteractionsCreate.mockResolvedValueOnce({
        output_image: {
          data: dummyBase64,
          mime_type: 'image/png'
        }
      });

      const dummyPlan = createDummyPlan();
      const res = await generateInfographic('Vintage Camera', dummyPlan, MODEL_IMAGE_BUDGET);

      expect(res.url).toBe(`data:image/png;base64,${dummyBase64}`);
      expect(res.usage.model).toBe(MODEL_IMAGE_BUDGET);

      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_IMAGE_BUDGET);
      expect(callArgs.response_format).toEqual({
        type: 'image',
        aspect_ratio: '16:9',
        image_size: '1K'
      });
    });

    it('generateAssembledImage: passes multimodal text + image input to MODEL_IMAGE', async () => {
      const dummyInputBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const dummyInputUrl = `data:image/png;base64,${dummyInputBase64}`;
      const dummyOutputBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mN88eLFfwYgYGRgYAAAAWEC4QOa5vQAAAAASUVORK5CYII=';

      mockInteractionsCreate.mockResolvedValueOnce({
        output_image: {
          data: dummyOutputBase64
        },
        usage: {
          total_input_tokens: 1120,
          total_output_tokens: 0
        }
      });

      const res = await generateAssembledImage(
        'Vintage Camera',
        'Vintage Camera Hero',
        'Finished product shot',
        'PHYSICAL',
        dummyInputUrl
      );

      expect(res.url).toBe(`data:image/png;base64,${dummyOutputBase64}`);
      expect(res.usage.model).toBe(MODEL_IMAGE);

      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_IMAGE);
      expect(Array.isArray(callArgs.input)).toBe(true);
      expect(callArgs.input[0].type).toBe('text');
      expect(callArgs.input[1].type).toBe('image');
      expect(callArgs.input[1].data).toBe(dummyInputBase64);
      expect(callArgs.input[1].mime_type).toBe('image/png');
    });

    it('generateAudioNarration: sequences script generation and audio TTS generation with audio response_format', async () => {
      // 1st call: script generation (MODEL_SCRIPT)
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: 'Welcome to the exploded view of the Vintage Camera.',
        usage: {
          total_input_tokens: 180,
          total_output_tokens: 120
        }
      });

      // Dummy raw PCM audio bytes (base64)
      const dummyAudioBase64 = btoa('RIFF....WAVEfmt ');

      // 2nd call: audio TTS generation (MODEL_TTS)
      mockInteractionsCreate.mockResolvedValueOnce({
        output_audio: {
          data: dummyAudioBase64,
          mime_type: 'audio/pcm'
        },
        usage: {
          total_input_tokens: 0,
          total_output_tokens: 0
        }
      });

      const res = await generateAudioNarration(
        'Vintage Camera',
        'Early origin',
        'Detailed mechanical overview',
        ['Fun fact 1'],
        'Kore'
      );

      expect(res.script).toBe('Welcome to the exploded view of the Vintage Camera.');
      expect(res.url).toMatch(/^blob:/);
      expect(res.usage).toHaveLength(2);
      expect(res.usage[0].model).toBe(MODEL_SCRIPT);
      expect(res.usage[1].model).toBe(MODEL_TTS);

      expect(mockInteractionsCreate).toHaveBeenCalledTimes(2);

      // Assert script call
      const scriptCall = mockInteractionsCreate.mock.calls[0][0];
      expect(scriptCall.model).toBe(MODEL_SCRIPT);

      // Assert TTS call
      const ttsCall = mockInteractionsCreate.mock.calls[1][0];
      expect(ttsCall.model).toBe(MODEL_TTS);
      expect(ttsCall.response_format).toEqual({ type: 'audio' });
      expect(ttsCall.generation_config?.speech_config?.[0]?.voice).toBe('Kore');
    });
  });

  describe('Defensive Robustness & Multi-Part Step Fallbacks', () => {
    it('falls back to concatenating trailing step content text when output_text is absent', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        steps: [
          {
            type: 'model_output',
            content: [
              { type: 'text', text: 'Vintage ' },
              { type: 'text', text: 'Typewriter' }
            ]
          }
        ],
        usage: { total_input_tokens: 20, total_output_tokens: 5 }
      });

      const res = await getRandomObject();
      expect(res.name).toBe('Vintage Typewriter');
    });

    it('falls back to extracting image from step.content when output_image is absent', async () => {
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      mockInteractionsCreate.mockResolvedValueOnce({
        steps: [
          {
            type: 'model_output',
            content: [
              { type: 'image', data: dummyBase64, mime_type: 'image/png' }
            ]
          }
        ]
      });

      const dummyPlan = createDummyPlan();
      const res = await generateInfographic('Vintage Camera', dummyPlan);
      expect(res.url).toBe(`data:image/png;base64,${dummyBase64}`);
    });

    it('falls back to extracting audio from step.content when output_audio is absent', async () => {
      // Step 1: Script
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: 'Script narration'
      });

      // Step 2: TTS via step.content
      const dummyAudioBase64 = btoa('RAW_AUDIO_STREAM_BYTES');
      mockInteractionsCreate.mockResolvedValueOnce({
        steps: [
          {
            type: 'model_output',
            content: [
              { type: 'audio', data: dummyAudioBase64, mime_type: 'audio/pcm' }
            ]
          }
        ]
      });

      const res = await generateAudioNarration(
        'Vintage Camera',
        'Origin',
        'Article',
        ['Trivia'],
        'Puck'
      );

      expect(res.url).toMatch(/^blob:/);
      expect(res.script).toBe('Script narration');
    });

    it('parses step-level token usage when top-level usage is omitted', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: 'Antique Pocket Watch',
        steps: [
          {
            type: 'thought',
            metadata: { usage: { prompt_tokens: 30, completion_tokens: 0 } }
          },
          {
            type: 'model_output',
            metadata: { usage: { prompt_tokens: 0, completion_tokens: 15 } },
            content: [{ type: 'text', text: 'Antique Pocket Watch' }]
          }
        ]
      });

      const res = await getRandomObject();
      expect(res.name).toBe('Antique Pocket Watch');
      expect(res.usage.inputTokens).toBe(30);
      expect(res.usage.outputTokens).toBe(15);
    });

    it('handles empty search results gracefully without crashing', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: JSON.stringify({
          components: [
            {
              name: 'Aperture Blade',
              composition: 'Steel',
              shortDescription: 'Regulates light intake.',
              detailedContent: 'Overlapping steel blades controlling exposure.'
            }
          ]
        }),
        steps: [
          {
            type: 'google_search_result',
            result: []
          },
          {
            type: 'model_output',
            content: [
              {
                type: 'text',
                text: 'Aperture Blade info'
              }
            ]
          }
        ]
      });

      const res = await enrichComponentDetails('Vintage Camera', ['Aperture Blade']);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].sources).toEqual([]);
    });

    it('planObject: parses JSON output safely when enclosed in markdown code fences', async () => {
      const mockPlan = createDummyPlan();
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: "```json\n" + JSON.stringify(mockPlan) + "\n```",
        usage: { total_input_tokens: 500, total_output_tokens: 900 }
      });

      const res = await planObject('Vintage SLR Camera');
      expect(res.data.displayTitle).toBe('Vintage SLR Camera');
      expect(res.data.componentList).toHaveLength(3);
    });

    it('generateInfographic: supports output_image with image_bytes property', async () => {
      const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      mockInteractionsCreate.mockResolvedValueOnce({
        output_image: {
          image_bytes: dummyBase64,
          mime_type: 'image/png'
        }
      });

      const dummyPlan = createDummyPlan();
      const res = await generateInfographic('Vintage Camera', dummyPlan);
      expect(res.url).toBe(`data:image/png;base64,${dummyBase64}`);
    });

    it('generateAudioNarration: handles pre-containerized WAV audio without double-headering', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: 'Narration script for testing'
      });

      // Valid RIFF/WAVE header simulation
      const riffAudioBase64 = btoa('RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x40\x1f\x00\x00\x80\x3e\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00');
      mockInteractionsCreate.mockResolvedValueOnce({
        output_audio: {
          audio_bytes: riffAudioBase64,
          mime_type: 'audio/wav'
        }
      });

      const res = await generateAudioNarration('Camera', 'Origin', 'Article', ['Fact'], 'Kore');
      expect(res.url).toMatch(/^blob:/);
      expect(res.script).toBe('Narration script for testing');
    });

    it('generateVideo: requests Veo 3.1 video assembly with proper start/last frame configuration', async () => {
      const dummyAssembledUrl = 'data:image/png;base64,ASSEMBLED_BASE64_DATA';
      const dummyInfographicUrl = 'data:image/png;base64,INFOGRAPHIC_BASE64_DATA';
      const mockOp = {
        done: true,
        response: {
          generatedVideos: [
            { video: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/video-123' } }
          ]
        }
      };

      mockGenerateVideos.mockResolvedValueOnce(mockOp);
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        blob: async () => new Blob(['dummy-mp4-data'], { type: 'video/mp4' })
      } as any);

      const res = await generateVideo('Vintage Camera', 'PHYSICAL', 'Exploded View', dummyAssembledUrl, dummyInfographicUrl);
      expect(res.url).toMatch(/^blob:/);
      expect(res.usage.model).toBe(MODEL_VIDEO);
      expect(res.usage.costEstimate).toBe(2.00);

      expect(mockGenerateVideos).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerateVideos.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_VIDEO);
      // In assembly mode: start frame is infographic, last frame is assembled
      expect(callArgs.image.imageBytes).toBe('INFOGRAPHIC_BASE64_DATA');
      expect(callArgs.config.lastFrame.imageBytes).toBe('ASSEMBLED_BASE64_DATA');
      expect(callArgs.config.resolution).toBe('720p');
      expect(callArgs.config.aspectRatio).toBe('16:9');
    });

    it('generateVideo: supports disassembly mode with inverted kinematic start/last frames', async () => {
      const dummyAssembledUrl = 'data:image/png;base64,ASSEMBLED_BASE64_DATA';
      const dummyInfographicUrl = 'data:image/png;base64,INFOGRAPHIC_BASE64_DATA';
      const mockOp = {
        done: true,
        response: {
          generatedVideos: [
            { video: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/video-456' } }
          ]
        }
      };

      mockGenerateVideos.mockResolvedValueOnce(mockOp);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        blob: async () => new Blob(['dummy-mp4-data'], { type: 'video/mp4' })
      } as any);

      const res = await generateVideo(
        'Vintage Camera',
        'PHYSICAL',
        'Exploded View',
        dummyAssembledUrl,
        dummyInfographicUrl,
        { mode: 'disassembly', model: MODEL_VIDEO_BUDGET }
      );

      expect(res.url).toMatch(/^blob:/);
      expect(res.usage.model).toBe(MODEL_VIDEO_BUDGET);

      const callArgs = mockGenerateVideos.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_VIDEO_BUDGET);
      // In disassembly mode: start frame is assembled, last frame is infographic
      expect(callArgs.image.imageBytes).toBe('ASSEMBLED_BASE64_DATA');
      expect(callArgs.config.lastFrame.imageBytes).toBe('INFOGRAPHIC_BASE64_DATA');
    });

    it('generateVideo: uses plan.videoAssemblyPrompt when plan is provided in assembly mode', async () => {
      const dummyAssembledUrl = 'data:image/png;base64,ASSEMBLED_BASE64_DATA';
      const dummyInfographicUrl = 'data:image/png;base64,INFOGRAPHIC_BASE64_DATA';
      const mockOp = {
        done: true,
        response: {
          generatedVideos: [
            { video: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/video-kinematic-1' } }
          ]
        }
      };

      mockGenerateVideos.mockResolvedValueOnce(mockOp);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        blob: async () => new Blob(['dummy-mp4-data'], { type: 'video/mp4' })
      } as any);

      const customPlan: ObjectPlan = {
        ...createDummyPlan(),
        videoAssemblyPrompt: 'Custom Kinematic Assembly: Gears slide into brass mesh.'
      };

      const res = await generateVideo(
        'Vintage Camera',
        'PHYSICAL',
        'Exploded View',
        dummyAssembledUrl,
        dummyInfographicUrl,
        undefined,
        customPlan
      );

      expect(res.url).toMatch(/^blob:/);
      const callArgs = mockGenerateVideos.mock.calls[0][0];
      expect(callArgs.prompt).toBe('Custom Kinematic Assembly: Gears slide into brass mesh.');
    });

    it('generateVideo: uses plan.videoDisassemblyPrompt when plan is provided in disassembly mode', async () => {
      const dummyAssembledUrl = 'data:image/png;base64,ASSEMBLED_BASE64_DATA';
      const dummyInfographicUrl = 'data:image/png;base64,INFOGRAPHIC_BASE64_DATA';
      const mockOp = {
        done: true,
        response: {
          generatedVideos: [
            { video: { uri: 'https://generativelanguage.googleapis.com/v1beta/files/video-kinematic-2' } }
          ]
        }
      };

      mockGenerateVideos.mockResolvedValueOnce(mockOp);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        blob: async () => new Blob(['dummy-mp4-data'], { type: 'video/mp4' })
      } as any);

      const customPlan: ObjectPlan = {
        ...createDummyPlan(),
        videoDisassemblyPrompt: 'Custom Kinematic Disassembly: Shutter leaves unseat radially.'
      };

      const res = await generateVideo(
        'Vintage Camera',
        'PHYSICAL',
        'Exploded View',
        dummyAssembledUrl,
        dummyInfographicUrl,
        { mode: 'disassembly', plan: customPlan }
      );

      expect(res.url).toMatch(/^blob:/);
      const callArgs = mockGenerateVideos.mock.calls[0][0];
      expect(callArgs.prompt).toBe('Custom Kinematic Disassembly: Shutter leaves unseat radially.');
    });

    it('planObject: handles CRLF line endings and surrounding conversational prose', async () => {
      const mockPlan = createDummyPlan();
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: "Here is your blueprint plan:\r\n```json\r\n" + JSON.stringify(mockPlan) + "\r\n```\r\nHope this helps with your deconstruction!",
        usage: { total_input_tokens: 500, total_output_tokens: 900 }
      });

      const res = await planObject('Vintage SLR Camera');
      expect(res.data.displayTitle).toBe('Vintage SLR Camera');
      expect(res.data.componentList).toHaveLength(3);
    });

    it('enrichComponentDetails: handles CRLF line endings and conversational wrapper in component analysis', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: "Component breakdown analysis:\r\n```json\r\n" + JSON.stringify({
          components: [
            {
              name: 'Helicoid Mechanism',
              composition: 'Brass & Aluminum',
              shortDescription: 'Precision focusing helix.',
              detailedContent: 'Rotational motion converted into smooth linear translation.'
            }
          ]
        }) + "\r\n```\r\nEnd of analysis.",
        steps: [
          {
            type: 'google_search_result',
            result: [{ url: 'https://camera-wiki.org/wiki/Helicoid' }]
          }
        ]
      });

      const res = await enrichComponentDetails('Vintage Camera', ['Helicoid Mechanism']);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].name).toBe('Helicoid Mechanism');
      expect(res.data[0].composition).toBe('Brass & Aluminum');
      expect(res.data[0].sources).toContain('https://camera-wiki.org/wiki/Helicoid');
    });

    it('generateAudioNarration: handles whitespace-padded base64 audio gracefully', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: 'Script with whitespace audio test'
      });

      // Valid RIFF/WAVE header base64 padded with \n and spaces
      const rawRiff = btoa('RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x40\x1f\x00\x00\x80\x3e\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00');
      const paddedBase64 = `\n  ${rawRiff.slice(0, 20)}\n  ${rawRiff.slice(20)}\n  `;

      mockInteractionsCreate.mockResolvedValueOnce({
        output_audio: {
          data: paddedBase64,
          mime_type: 'audio/wav'
        }
      });

      const res = await generateAudioNarration('Camera', 'Origin', 'Article', ['Fact'], 'Zephyr');
      expect(res.url).toMatch(/^blob:/);
      expect(res.script).toBe('Script with whitespace audio test');
    });

    it('enrichComponentDetails: preserves MODEL_AUTHORING (gemini-3.8-flash) when StageModelConfig is passed', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: JSON.stringify({
          components: [
            {
              name: 'Shutter Mechanism',
              composition: 'Titanium Curtain',
              shortDescription: 'Focal plane shutter.',
              detailedContent: 'Controls sensor exposure duration with precision timing.'
            }
          ]
        })
      });

      // Pass config with distinct planning model to verify authoring is not overridden by config.planning
      const testConfig = { ...CANONICAL_MODEL_PRESETS.pro, planning: 'gemini-3.1-pro-preview' };
      const res = await enrichComponentDetails('Vintage Camera', ['Shutter Mechanism'], testConfig);
      expect(res.data).toHaveLength(1);
      expect(res.usage[0].model).toBe(MODEL_AUTHORING);
      expect(res.usage[0].model).not.toBe(testConfig.planning);

      const callArgs = mockInteractionsCreate.mock.calls[0][0];
      expect(callArgs.model).toBe(MODEL_AUTHORING);
    });

    it('enrichComponentDetails: parses JSON response when model outputs raw array directly', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: "```json\n" + JSON.stringify([
          {
            name: 'Optical Prism',
            composition: 'Crown Glass',
            shortDescription: 'Refracts light.',
            detailedContent: 'Corrects viewing orientation.'
          }
        ]) + "\n```"
      });

      const res = await enrichComponentDetails('Vintage Camera', ['Optical Prism']);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].name).toBe('Optical Prism');
      expect(res.data[0].composition).toBe('Crown Glass');
    });

    it('generateAudioNarration: handles ID3 containerized MP3 audio without prepending WAV header', async () => {
      mockInteractionsCreate.mockResolvedValueOnce({
        output_text: 'Narration script for MP3 stream'
      });

      // Valid ID3v2 container header base64 (ID3\x04\x00\x00\x00\x00\x00\x00)
      const mp3Base64 = btoa('ID3\x04\x00\x00\x00\x00\x00\x00\xff\xfb\x90\x44');
      mockInteractionsCreate.mockResolvedValueOnce({
        output_audio: {
          data: mp3Base64,
          mime_type: 'audio/mp3'
        }
      });

      const res = await generateAudioNarration('Camera', 'Origin', 'Article', ['Fact'], 'Zephyr');
      expect(res.url).toMatch(/^blob:/);
      expect(res.script).toBe('Narration script for MP3 stream');
    });
  });
});

