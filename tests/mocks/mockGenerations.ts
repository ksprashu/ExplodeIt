import { GenerationItem, ObjectPlan, ComponentPart } from '../../types';

export const mockCameraPlan: ObjectPlan = {
  displayTitle: 'Twin-Lens Reflex (TLR) Camera',
  category: 'Mechanical Photography',
  domainType: 'PHYSICAL',
  visualMetaphor: 'Exploded View',
  sectionTitles: {
    origin: 'The Golden Age of Medium Format',
    anatomy: 'Dual Optical Paths & Leaf Shutter Mechanics',
    article: 'Precision Glass & Spring-Loaded Synchronicity',
    trivia: 'Curiosities of the Waist-Level Finder'
  },
  originStory: 'Pioneered in the late 1920s by Rolleiflex, the Twin-Lens Reflex camera separated viewing from capture.',
  detailedArticle: '## The Mechanics of the TLR\n\nThe twin-lens reflex camera employs two objective lenses of identical focal length...\n\n### Parallax Error & Waist-Level Viewing\nBecause the viewing lens sits directly above the taking lens...',
  trivia: [
    'War photographers favored TLRs because looking down into a waist-level finder made them appear less intrusive.',
    'Square 6x6cm negatives meant photographers never had to rotate the camera vertically.',
    'The leaf shutter can synchronize with electronic flash at all shutter speeds up to 1/500s.',
    'Robert Capa and Vivian Maier captured iconic 20th-century street photography with Rolleiflex TLRs.',
    'Viewing screens feature a 45-degree mirror projecting a reversed left-to-right ground glass image.'
  ],
  visualStylePrompt: 'Hyper-detailed technical explosion, anodized brass and chrome, 5600K balanced studio illumination, floating components on dark blueprint grid',
  componentList: [
    'Viewing Lens (Heidosmat 75mm f/2.8)',
    'Taking Lens (Tessar 75mm f/3.5)',
    'Synchro-Compur Leaf Shutter',
    'Waist-Level Hood & Ground Glass Screen',
    'Fixed 45-Degree Surface Mirror',
    'Film Transport Crank & Frame Counter',
    'Die-Cast Aluminum Body Chassis'
  ],
  audioVibe: {
    voiceName: 'Fenrir',
    toneDescription: 'Precise, authoritative, mechanical engineering focus'
  },
  cleanExplodedPrompt: 'Pristine 3D deconstruction of Twin-Lens Reflex (TLR) Camera with zero 2D text, floating suspended components on dark obsidian backdrop.',
  cleanAssembledPrompt: 'Finished assembled studio view of Twin-Lens Reflex (TLR) Camera at 45° isometric perspective, 5600K studio illumination on obsidian surface.',
  videoAssemblyPrompt: 'Cinematic 8K assembly animation of Twin-Lens Reflex Camera with lens threading, leaf shutter seating, and die-cast aluminum chassis interlocking.',
  videoDisassemblyPrompt: 'Cinematic 8K disassembly animation of Twin-Lens Reflex Camera with radial chassis decoupling and optical element unseating.',
  kinematicDetails: 'Dual-lens focusing rack actuation, viewing hood articulation, and 5-bladed synchro-compur leaf shutter tensioning and release.'
};

export const mockCameraComponents: ComponentPart[] = [
  {
    name: 'Viewing Lens (Heidosmat 75mm f/2.8)',
    composition: 'Crown glass elements in threaded brass barrel',
    shortDescription: 'Provides bright, full-aperture composition image to the top ground glass screen.',
    detailedContent: 'The viewing lens is optimized for maximum light transmission rather than edge sharpness, allowing critical focus confirmation.',
    sources: ['https://en.wikipedia.org/wiki/Twin-lens_reflex_camera']
  },
  {
    name: 'Taking Lens (Tessar 75mm f/3.5)',
    composition: 'Four-element triplet derivative with rare-earth coating',
    shortDescription: 'Captures the final high-resolution image onto 120 roll film.',
    detailedContent: 'Formulated with an air-spaced doublet in front and cemented doublet behind the diaphragm for aberration control.',
    sources: ['https://en.wikipedia.org/wiki/Tessar']
  },
  {
    name: 'Synchro-Compur Leaf Shutter',
    composition: 'Blued spring steel blades and escapement gearing',
    shortDescription: 'Concentric blades opening from center with flash sync up to 1/500 sec.',
    detailedContent: 'Unlike focal-plane curtains, leaf shutters open circularly, eliminating rolling shutter distortion.',
    sources: ['https://camera-wiki.org/wiki/Compur']
  },
  {
    name: 'Waist-Level Hood & Ground Glass Screen',
    composition: 'Folding sheet steel with etched Fresnel matte screen',
    shortDescription: 'Shields ambient light and projects horizontal framing preview.',
    detailedContent: 'Includes a flip-up 3x magnifying loupe for micro-contrast focusing on central details.'
  },
  {
    name: 'Fixed 45-Degree Surface Mirror',
    composition: 'Front-surface silvered optical float glass',
    shortDescription: 'Bounces the viewing optical path 90 degrees upward.',
    detailedContent: 'Front-surface silvering prevents ghost double reflections common in standard rear-silvered household mirrors.'
  },
  {
    name: 'Film Transport Crank & Frame Counter',
    composition: 'Hardened brass Geneva drive and pawl mechanism',
    shortDescription: 'Advances 120 medium format spool and tensions the shutter.',
    detailedContent: 'Features an automatic feeler roller that senses the thickness change when backing paper reaches film start.'
  },
  {
    name: 'Die-Cast Aluminum Body Chassis',
    composition: 'Magnesium-aluminum alloy with vulcanite leatherette wrap',
    shortDescription: 'Rigid skeletal housing maintaining optical parallelism.',
    detailedContent: 'Micrometer-machined tracks guide the entire front lens standard during rack-and-pinion focusing.'
  }
];

// Minimal 1x1 PNG data URL for test fixtures
export const DUMMY_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
export const DUMMY_AUDIO_DATA_URL = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
export const DUMMY_VIDEO_DATA_URL = 'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAA==';

export const mockCameraGenerationItem: GenerationItem = {
  id: 'gen-cam-001',
  prompt: 'Twin-Lens Reflex Camera',
  timestamp: 1726240000000,
  plan: mockCameraPlan,
  components: mockCameraComponents,
  narrationScript: 'Step into the golden age of medium-format photography with the twin-lens reflex camera. Two lenses, one vision.',
  infographicUrl: DUMMY_PNG_DATA_URL,
  assembledUrl: DUMMY_PNG_DATA_URL,
  videoUrl: DUMMY_VIDEO_DATA_URL,
  audioUrl: DUMMY_AUDIO_DATA_URL,
  hasVideo: true,
  usage: [
    { model: 'gemini-3.1-pro-preview', inputTokens: 450, outputTokens: 820, costEstimate: 0.01074 },
    { model: 'gemini-3-pro-image', inputTokens: 0, outputTokens: 0, costEstimate: 0.134 },
    { model: 'gemini-3-pro-image', inputTokens: 0, outputTokens: 0, costEstimate: 0.134 },
    { model: 'gemini-3.8-flash', inputTokens: 320, outputTokens: 650, costEstimate: 0.00172 },
    { model: 'veo-3.1-generate-preview', inputTokens: 0, outputTokens: 0, costEstimate: 2.00 },
    { model: 'gemini-3.5-flash-lite', inputTokens: 180, outputTokens: 120, costEstimate: 0.00007 }
  ]
};

export const mockBudgetGenerationItem: GenerationItem = {
  id: 'gen-budget-002',
  prompt: 'Simple Electric Bell',
  timestamp: 1726241000000,
  plan: {
    ...mockCameraPlan,
    displayTitle: 'Electric Solenoid Bell',
    category: 'Electromagnetism',
    domainType: 'PHYSICAL',
    componentList: ['Electromagnet Coil', 'Spring Armature', 'Contact Screw', 'Gong Hammer']
  },
  components: mockCameraComponents.slice(0, 4),
  narrationScript: 'A basic solenoid bell turns electromagnetic pulses into rhythmic strikes.',
  infographicUrl: DUMMY_PNG_DATA_URL,
  assembledUrl: DUMMY_PNG_DATA_URL,
  videoUrl: null,
  audioUrl: DUMMY_AUDIO_DATA_URL,
  hasVideo: false,
  usage: [
    { model: 'gemini-3.8-flash', inputTokens: 250, outputTokens: 400, costEstimate: 0.00108 },
    { model: 'gemini-3.1-flash-image', inputTokens: 0, outputTokens: 0, costEstimate: 0.067 },
    { model: 'gemini-3.1-flash-image', inputTokens: 0, outputTokens: 0, costEstimate: 0.067 },
    { model: 'gemini-3.5-flash-lite', inputTokens: 120, outputTokens: 90, costEstimate: 0.00005 }
  ]
};

export const mockSensitiveInjectedItem = {
  ...mockCameraGenerationItem,
  apiKey: 'AIzaSyDUMMY_SECRET_KEY_1234567890abcdef',
  gemini_api_key: 'AIzaSyDUMMY_SECRET_KEY_1234567890abcdef',
  auth_token: 'Bearer ya29.a0ARrda8-DUMMY_PRIVATE_TOKEN',
  userSession: {
    id: 'user_123',
    secretToken: 'secret_abc_123'
  }
};

export const mockCommunityCatalog = [
  {
    id: 'tlr-camera-1726240000000',
    topic: 'Twin-Lens Reflex Camera',
    timestamp: '2026-09-13T16:00:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
    infographicUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/infographic.png',
    assembledUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/assembled.png',
    videoUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/narration.mp3',
    previewUrl: 'https://community.explodeit.org/tlr-camera-1726240000000/preview.jpg'
  },
  {
    id: 'turbofan-engine-1726240100000',
    topic: 'High-Bypass Turbofan Jet Engine',
    timestamp: '2026-09-13T16:05:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
    infographicUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/infographic.png',
    assembledUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/assembled.png',
    videoUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/narration.mp3',
    previewUrl: 'https://community.explodeit.org/turbofan-engine-1726240100000/preview.jpg'
  },
  {
    id: 'neural-transformer-1726240200000',
    topic: 'Transformer Attention Architecture',
    timestamp: '2026-09-13T16:10:00.000Z',
    domain: 'SOFTWARE',
    metaphor: 'Data Flow Visualization',
    infographicUrl: 'https://community.explodeit.org/neural-transformer-1726240200000/infographic.png',
    assembledUrl: 'https://community.explodeit.org/neural-transformer-1726240200000/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/neural-transformer-1726240200000/narration.mp3',
    previewUrl: 'https://community.explodeit.org/neural-transformer-1726240200000/preview.jpg'
  }
];
