/**
 * ExplodeIt: The AI Encyclopedia
 *
 * Disclaimer: This is a personal project developed for educational and experimental purposes. It is not an official Google product and does not offer any official support or maintenance.
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import InputArea from './components/InputArea';
import ProgressTracker from './components/ProgressTracker';
import DisplayArea from './components/DisplayArea';
import Header from './components/Header';
import CommunityShowcase from './components/CommunityShowcase';
import ModelSettingsModal from './components/ModelSettingsModal';
import ApiKeyModal from './components/ApiKeyModal';
import CommunityContributeModal from './components/CommunityContributeModal';
import { 
  GenerationItem, 
  GenerationStatus, 
  TokenUsage, 
  ModelTier, 
  StageModelConfig,
  CommunityCatalogItem,
  ObjectPlan,
  ComponentPart,
  SanitizedGenerationBundle,
} from './types';
import { 
  planObject, 
  generateInfographic, 
  generateAssembledImage, 
  enrichComponentDetails, 
  generateVideo, 
  generateAudioNarration,
  getRandomObject,
  revokeGenerationAssets,
  setGlobalApiKey
} from './services/geminiService';
import { CANONICAL_MODEL_PRESETS } from './constants';
import { initGA } from './services/analytics';
import { 
  bundleGenerationItem, 
  uploadCommunityBundle,
  fetchCommunityCatalog,
  fetchCommunityTopic,
  preloadCommunityTopicMedia,
  generateTopicSlug,
} from './services/communityStorage';
import { SEED_COMMUNITY_CATALOG } from './services/mockCommunityStorage';
import { revokeAllObjectURLs } from './services/mediaCache';
import { 
  parseExplorationQueryParam, 
  findMatchingCatalogItem, 
  syncUrlToExploration, 
  getCanonicalExplorationUrl, 
  copyToClipboard 
} from './services/urlState';

const STORAGE_PREFS_KEY = 'explodeit_model_preferences';
const STORAGE_CONTRACT_KEY = 'explodeit_model_config_v1';

export function loadModelPreferences(): { tier: ModelTier; config: StageModelConfig } {
  try {
    if (typeof localStorage !== 'undefined') {
      // 1. Primary preferences object
      const stored = localStorage.getItem(STORAGE_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const resolvedTier: ModelTier = ['pro', 'budget', 'custom'].includes(parsed.tier) ? parsed.tier : 'pro';
        const fallbackConfig = CANONICAL_MODEL_PRESETS[resolvedTier];
        return {
          tier: resolvedTier,
          config: { ...fallbackConfig, ...parsed.config }
        };
      }

      // 2. Compatibility check for contract test key
      const legacyConfig = localStorage.getItem(STORAGE_CONTRACT_KEY);
      if (legacyConfig) {
        const parsedConfig = JSON.parse(legacyConfig);
        return {
          tier: parsedConfig.enableVideo === false ? 'budget' : 'pro',
          config: { ...CANONICAL_MODEL_PRESETS.pro, ...parsedConfig }
        };
      }
    }
  } catch (err) {
    console.warn("Corrupted model preferences in localStorage, restoring defaults:", err);
  }

  // Safe fallback default
  return {
    tier: 'pro',
    config: { ...CANONICAL_MODEL_PRESETS.pro }
  };
}

export function saveModelPreferences(tier: ModelTier, config: StageModelConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify({ tier, config }));
      localStorage.setItem(STORAGE_CONTRACT_KEY, JSON.stringify(config));
    }
  } catch (err) {
    console.warn("Unable to persist model preferences to localStorage:", err);
  }
}

/**
 * Safely retrieve session API key with graceful error suppression
 * if browser privacy extensions, sandbox permissions, or iframe restrictions block sessionStorage.
 */
export function getSessionApiKey(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem('gemini_api_key');
      return stored && stored.trim().length > 0 ? stored.trim() : null;
    }
  } catch (e) {
    console.warn("Storage access restricted, falling back to in-memory key:", e);
  }
  return null;
}

export function safeSetSessionApiKey(key: string): boolean {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('gemini_api_key', key);
      return true;
    }
  } catch (e) {
    console.warn("Failed to save key to sessionStorage (falling back to in-memory state):", e);
  }
  return false;
}

export function safeRemoveSessionApiKey(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('gemini_api_key');
    }
  } catch (e) {
    console.warn("Failed to remove key from sessionStorage:", e);
  }
}

export function safeRemoveLocalApiKey(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gemini_api_key');
    }
  } catch (e) {
    console.warn("Failed to clear localStorage:", e);
  }
}

/**
 * Adapt a CommunityCatalogItem and its preloaded media into a complete GenerationItem.
 * Uses bundle data when available; otherwise synthesizes rich blueprint & anatomy.
 */
export function adaptCatalogItemToGenerationItem(
  topic: CommunityCatalogItem,
  preloadedMedia: {
    infographicUrl: string;
    assembledUrl: string;
    videoUrl?: string;
    audioUrl: string;
  },
  bundle?: SanitizedGenerationBundle | null
): GenerationItem {
  const domain = topic.domain || 'PHYSICAL';
  const categoryMap: Record<string, string> = {
    PHYSICAL: 'Mechanical & Physical Systems',
    SOFTWARE: 'Computer Science & Algorithms',
    BIOLOGICAL: 'Biological & Anatomical Systems',
    CONCEPTUAL: 'Theoretical Physics & Mathematics',
    OTHER: 'General Science & Technology',
  };

  const plan: ObjectPlan = bundle?.plan || {
    displayTitle: topic.topic,
    category: categoryMap[domain] || 'General Science',
    domainType: (['PHYSICAL', 'SOFTWARE', 'CONCEPTUAL', 'BIOLOGICAL', 'OTHER'].includes(domain)
      ? domain
      : 'PHYSICAL') as ObjectPlan['domainType'],
    visualMetaphor: topic.metaphor || 'Exploded View',
    sectionTitles: {
      origin: 'Origin & Historical Context',
      anatomy: 'Anatomical Architecture & Deconstruction',
      article: 'Technical Principles & Engineering Analysis',
      trivia: 'Engineering Trivia & Curiosities',
    },
    originStory: `The deconstruction of ${topic.topic} illustrates the mechanical, architectural, and systemic principles underlying its real-world function.`,
    detailedArticle: `## Architecture of ${topic.topic}\n\n${topic.metaphor || 'Exploded View'}: A comprehensive technical deconstruction examining each modular component, mechanical tolerance, and operational interface.\n\n### Systematic Overview\nThis interactive model presents internal and external assemblies in precise spatial isolation, capturing kinematic alignment between disassembled modular elements and the integrated operational state.\n\n### Kinematics and Modularity\nEach subassembly is engineered to decouple physical forces, distribute thermal or electrical loads, and maintain structural integrity under dynamic stresses.`,
    trivia: [
      `${topic.topic} employs modular subassemblies engineered for strict dimensional tolerance and field serviceability.`,
      `The exploded technical infographic displays internal cross-sections, leader callout lines, and 5600K balanced studio illumination.`,
      `Cinematic assembly sequences illustrate disassembled floating parts gliding into alignment and interlocking into a rigid structure.`
    ],
    visualStylePrompt: `Hyper-detailed technical explosion of ${topic.topic} with leader callout lines on dark blueprint background.`,
    componentList: [
      'Structural Housing & Chassis',
      'Primary Operational Core Assembly',
      'Synchronization & Coupling Interface',
      'Modulation & Actuation Mechanism'
    ],
    audioVibe: {
      voiceName: 'Zephyr',
      toneDescription: 'Authoritative, educational, precise engineering focus'
    }
  };

  const components: ComponentPart[] = bundle?.components && bundle.components.length > 0
    ? bundle.components
    : [
        {
          name: `${topic.topic} Structural Housing & Chassis`,
          shortDescription: 'Primary rigid framework maintaining optical, mechanical, or thermal parallelism.',
          composition: 'Aerospace-grade structural alloy and composite reinforcement',
          detailedContent: `The structural chassis of ${topic.topic} provides the foundational datum against which all moving and stationary components are aligned. Precision-machined datum faces minimize thermal drift and vibrational resonance.\n\nEngineering tolerances are maintained to sub-millimeter specifications, ensuring smooth kinematic motion across wide operating temperatures.`,
          sources: ['https://en.wikipedia.org/wiki/Systems_engineering']
        },
        {
          name: `${topic.topic} Primary Operational Core`,
          shortDescription: 'Central functional engine responsible for primary energy, signal, or optical processing.',
          composition: 'High-purity functional substrate and hardened dynamic elements',
          detailedContent: `At the heart of ${topic.topic} lies the primary core assembly. It converts raw inputs into calibrated work through a series of interlocking stages.\n\nCritical wear surfaces feature surface-hardened coatings and friction-reducing geometries to maximize service lifespan under continuous operation.`,
          sources: ['https://en.wikipedia.org/wiki/Mechanical_engineering']
        },
        {
          name: 'Synchronization & Coupling Interface',
          shortDescription: 'Dynamic linkages that transfer momentum and maintain temporal coordination across stages.',
          composition: 'Precision gear train and elastomeric vibration dampeners',
          detailedContent: `This subassembly coordinates motion between independent operational tiers. Anti-backlash gearing and balanced couplings eliminate lost motion and phase error during high-speed transitions.`,
          sources: ['https://en.wikipedia.org/wiki/Coupling']
        },
        {
          name: 'Control, Actuation & Feedback Unit',
          shortDescription: 'Regulating subassembly providing user input translation and real-time operational feedback.',
          composition: 'Micro-calibrated adjusters and tactile indexing detents',
          detailedContent: `Allows operators to fine-tune system parameters with micrometer precision. Tactile indexing detents and visual indicator scales ensure repeatable settings and intuitive system control.`,
          sources: ['https://en.wikipedia.org/wiki/Control_system']
        }
      ];

  const hasVideo = Boolean(preloadedMedia.videoUrl || topic.videoUrl);
  const resolvedTier: ModelTier = bundle?.manifest?.modelTier || 'pro';

  return {
    id: topic.id,
    prompt: topic.topic,
    timestamp: new Date(topic.timestamp).getTime() || Date.now(),
    plan,
    components,
    narrationScript: bundle?.narrationScript || `Discover the inner workings and architectural deconstruction of ${topic.topic}.`,
    infographicUrl: preloadedMedia.infographicUrl || topic.infographicUrl,
    assembledUrl: preloadedMedia.assembledUrl || topic.assembledUrl,
    videoUrl: preloadedMedia.videoUrl ?? topic.videoUrl ?? null,
    audioUrl: preloadedMedia.audioUrl || topic.audioUrl,
    hasVideo,
    usage: [],
    tier: resolvedTier,
    config: {
      ...CANONICAL_MODEL_PRESETS[resolvedTier],
      ...bundle?.manifest?.modelsUsed,
      enableVideo: hasVideo,
    },
  };
}

const App: React.FC = () => {
  const [history, setHistory] = useState<GenerationItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const isProcessing = status !== GenerationStatus.IDLE && status !== GenerationStatus.COMPLETED && status !== GenerationStatus.FAILED;
  
  // Navigation sequence token ref to prevent out-of-order race conditions on rapid navigations
  const activeNavigationRef = React.useRef<number>(0);

  // Synchronized state refs to prevent listener teardown/re-attachment churn on popstate
  const isProcessingRef = React.useRef(isProcessing);
  isProcessingRef.current = isProcessing;

  const historyRef = React.useRef(history);
  historyRef.current = history;

  // Model Tier & Configuration State
  const [modelPreferences, setModelPreferences] = useState<{ tier: ModelTier; config: StageModelConfig }>(() => loadModelPreferences());
  const [isModelSettingsOpen, setIsModelSettingsOpen] = useState(false);

  // API Key Management (Strict Session Isolation: SessionStorage ONLY)
  const [apiKey, setApiKey] = useState<string | null>(() => getSessionApiKey());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<{ prompt: string; withVideo: boolean; isSurprise?: boolean } | null>(null);

  // Community Showcase Catalog State
  const [catalog, setCatalog] = useState<CommunityCatalogItem[]>(() => SEED_COMMUNITY_CATALOG);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const catalogRef = React.useRef(catalog);
  catalogRef.current = catalog;

  // Community Contribution Modal & Toast Feedback State
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [contributeItem, setContributeItem] = useState<GenerationItem | null>(null);
  const [contributionToast, setContributionToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Share Toast Feedback State
  const [shareToast, setShareToast] = useState<{
    visible: boolean;
    message: string;
  } | null>(null);
  const shareTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL Deep Link Fallback Notice State
  const [urlNotification, setUrlNotification] = useState<{
    visible: boolean;
    message: string;
    type: 'info' | 'warning' | 'error';
  } | null>(null);

  // Mobile Drawer State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const hydrateCatalogItem = async (
    topic: CommunityCatalogItem,
    options?: { isPopState?: boolean; navId?: number }
  ): Promise<GenerationItem | null> => {
    const navId = options?.navId ?? ++activeNavigationRef.current;
    const existing = historyRef.current.find(h => h.id === topic.id);
    if (existing) {
      if (navId === activeNavigationRef.current) {
        setCurrentId(topic.id);
        setStatus(GenerationStatus.IDLE);
        if (!options?.isPopState) {
          syncUrlToExploration(topic.id, 'push');
        } else {
          syncUrlToExploration(topic.id, 'replace');
        }
      }
      return existing;
    }

    // 1. Preload media assets into cache in parallel (zero API key required)
    const preloadedMedia = await preloadCommunityTopicMedia(topic);
    if (navId !== activeNavigationRef.current) {
      return null;
    }

    // 2. Fetch full bundle if available on edge or mock driver
    let bundle: SanitizedGenerationBundle | null = null;
    try {
      bundle = await fetchCommunityTopic(topic.id);
    } catch (e) {
      console.warn("[App] Could not fetch community topic bundle, using synthesized adaptation:", e);
    }
    if (navId !== activeNavigationRef.current) {
      return null;
    }

    // 3. Adapt catalog item to full GenerationItem
    const generationItem = adaptCatalogItemToGenerationItem(topic, preloadedMedia, bundle);

    // 4. Update state: check cancellation BEFORE mutating history state
    if (navId !== activeNavigationRef.current) {
      return null;
    }

    setHistory(prev => [generationItem, ...prev.filter(h => h.id !== topic.id)]);
    if (navId === activeNavigationRef.current) {
      setCurrentId(generationItem.id);
      setStatus(GenerationStatus.IDLE);
      setError(null);
      setUrlNotification(null);
      if (!options?.isPopState) {
        syncUrlToExploration(generationItem.id, 'push');
      } else {
        syncUrlToExploration(generationItem.id, 'replace');
      }
    }
    return generationItem;
  };

  const hydrateFromIdentifier = async (
    identifier: string,
    options?: { isPopState?: boolean; navId?: number }
  ): Promise<boolean> => {
    const cleanId = (identifier || '').trim().replace(/^[/"]+|[/"]+$/g, '');
    if (!cleanId) return false;
    const navId = options?.navId ?? ++activeNavigationRef.current;

    // 1. Check existing history (exact ID, lower ID, prefix slug, prompt slug, or display title slug)
    const cleanLower = cleanId.toLowerCase();
    const inHistory = historyRef.current.find(
      h => h.id === cleanId ||
           h.id.toLowerCase() === cleanLower ||
           h.id.toLowerCase().startsWith(cleanLower + '-') ||
           (h.prompt && generateTopicSlug(h.prompt) === cleanLower) ||
           (h.plan && generateTopicSlug(h.plan.displayTitle) === cleanLower)
    );
    if (inHistory) {
      if (navId === activeNavigationRef.current) {
        setCurrentId(inHistory.id);
        setStatus(GenerationStatus.IDLE);
        setError(null);
        setUrlNotification(null);
        if (!options?.isPopState) {
          syncUrlToExploration(inHistory.id, 'push');
        } else {
          syncUrlToExploration(inHistory.id, 'replace');
        }
      }
      return true;
    }

    // 2. Search catalog in current state
    let matchedCatalogItem = findMatchingCatalogItem(cleanId, catalogRef.current);

    // 3. If not found in memory, try refreshing catalog from server / mock storage
    if (!matchedCatalogItem) {
      try {
        const freshCatalog = await fetchCommunityCatalog();
        if (navId !== activeNavigationRef.current) return false;
        if (Array.isArray(freshCatalog) && freshCatalog.length > 0) {
          setCatalog(freshCatalog);
          matchedCatalogItem = findMatchingCatalogItem(cleanId, freshCatalog);
        }
      } catch (err) {
        console.warn("[App] Could not fetch catalog during deep-link hydration:", err);
      }
    }

    if (navId !== activeNavigationRef.current) return false;

    // 4. If matched in catalog, hydrate it
    if (matchedCatalogItem) {
      try {
        const res = await hydrateCatalogItem(matchedCatalogItem, { ...options, navId });
        return res !== null;
      } catch (err: any) {
        console.warn(`[App] Error hydrating matched catalog item '${cleanId}':`, err);
      }
    }

    if (navId !== activeNavigationRef.current) return false;

    // 5. Try fetching direct topic bundle
    try {
      const bundle = await fetchCommunityTopic(cleanId);
      if (navId !== activeNavigationRef.current) return false;
      if (bundle && bundle.manifest) {
        const syntheticCatalogItem: CommunityCatalogItem = {
          id: bundle.manifest.id,
          topic: bundle.manifest.topic,
          timestamp: bundle.manifest.timestamp,
          domain: bundle.manifest.domain,
          metaphor: bundle.manifest.metaphor,
          infographicUrl: '',
          assembledUrl: '',
          audioUrl: '',
          videoUrl: undefined,
          previewUrl: '',
        };
        const preloadedMedia = {
          infographicUrl: '',
          assembledUrl: '',
          audioUrl: '',
        };
        const generationItem = adaptCatalogItemToGenerationItem(
          syntheticCatalogItem,
          preloadedMedia,
          bundle
        );
        if (navId !== activeNavigationRef.current) return false;
        setHistory(prev => [generationItem, ...prev.filter(h => h.id !== generationItem.id)]);
        if (navId === activeNavigationRef.current) {
          setCurrentId(generationItem.id);
          setStatus(GenerationStatus.IDLE);
          setError(null);
          setUrlNotification(null);
          if (!options?.isPopState) {
            syncUrlToExploration(generationItem.id, 'push');
          } else {
            syncUrlToExploration(generationItem.id, 'replace');
          }
        }
        return true;
      }
    } catch {
      // Ignore direct fetch fallback error
    }

    if (navId !== activeNavigationRef.current) return false;

    // 6. Identifier not found -> Graceful fallback to default landing/showcase view
    setUrlNotification({
      visible: true,
      message: `Exploration "${cleanId}" not found. Showing community showcase.`,
      type: 'info'
    });
    setCurrentId(null);
    setStatus(GenerationStatus.IDLE);
    syncUrlToExploration(null, 'replace');
    return false;
  };

  useEffect(() => {
    initializeApiKey();
    initGA();

    // 1. Initial deep-link hydration if item/topic param exists in URL (query string or hash fallback)
    const initialQuery = parseExplorationQueryParam();
    if (initialQuery) {
      const navId = ++activeNavigationRef.current;
      hydrateFromIdentifier(initialQuery, { isPopState: true, navId });
    }

    let isMounted = true;
    fetchCommunityCatalog()
      .then(items => {
        if (isMounted && Array.isArray(items) && items.length > 0) {
          setCatalog(items);
        }
      })
      .catch(err => {
        console.warn("[App] Could not fetch catalog:", err);
      })
      .finally(() => {
        if (isMounted) {
          setCatalogLoading(false);
        }
      });

    const handleBeforeUnload = () => {
      revokeAllObjectURLs();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
        shareTimeoutRef.current = null;
      }
      revokeAllObjectURLs();
    };
  }, []);

  const hydrateFromIdentifierRef = React.useRef(hydrateFromIdentifier);
  hydrateFromIdentifierRef.current = hydrateFromIdentifier;

  // 2. Bidirectional URL Synchronization for Browser Back/Forward (popstate)
  // Register once on mount to prevent teardown/re-subscription gaps during state transitions
  useEffect(() => {
    const handlePopState = () => {
      const navId = ++activeNavigationRef.current;
      const queryId = parseExplorationQueryParam();
      if (!queryId) {
        setCurrentId(null);
        setUrlNotification(null);
        setError(null);
        if (!isProcessingRef.current) {
          setStatus(GenerationStatus.IDLE);
        }
        return;
      }

      hydrateFromIdentifierRef.current(queryId, { isPopState: true, navId });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  const initializeApiKey = () => {
    let resolvedKey: string | null = null;

    // 1. Active Migration & Cleanup of Legacy Persistent Storage
    try {
      if (typeof localStorage !== 'undefined') {
        const legacyKey = localStorage.getItem('gemini_api_key');
        if (legacyKey && legacyKey.trim().length > 0) {
          const cleanLegacyKey = legacyKey.trim();
          safeSetSessionApiKey(cleanLegacyKey);
          resolvedKey = cleanLegacyKey;
        }
        // Guarantee legacy key is purged from disk in all execution paths
        safeRemoveLocalApiKey();
      }
    } catch (e) {
      console.warn("Unable to access or clean legacy localStorage:", e);
    }

    // 2. Check Session Storage (for active tab session across refreshes)
    if (!resolvedKey) {
      resolvedKey = getSessionApiKey();
    }

    // If key found from session storage or legacy migration
    if (resolvedKey) {
      setApiKey(resolvedKey);
      setGlobalApiKey(resolvedKey);
      return;
    }

    // 3. Check Env Var (Fallback/Hosted Deployment)
    if (process.env.API_KEY && process.env.API_KEY.trim().length > 0) {
      const cleanEnvKey = process.env.API_KEY.trim();
      setApiKey(cleanEnvKey);
      setGlobalApiKey(cleanEnvKey);
      return;
    }

    // 4. No key found -> Default to keyless browsing, modal remains closed
    setIsModalOpen(false);
  };

  const handleSaveKey = (key: string) => {
    const trimmedKey = key.trim();
    safeSetSessionApiKey(trimmedKey);
    // Double safeguard: ensure localStorage never holds the key
    safeRemoveLocalApiKey();

    setApiKey(trimmedKey);
    setGlobalApiKey(trimmedKey);
    setIsModalOpen(false);
    setError(null);

    // Auto-resume generation if user queued a custom prompt in keyless mode
    if (pendingPrompt) {
      const nextPrompt = pendingPrompt;
      setPendingPrompt(null);
      if (nextPrompt.isSurprise) {
        handleSurprise(nextPrompt.withVideo, trimmedKey);
      } else {
        handleGenerate(nextPrompt.prompt, nextPrompt.withVideo, [], trimmedKey);
      }
    }
  };

  const handleClearKey = () => {
    safeRemoveSessionApiKey();
    safeRemoveLocalApiKey();

    setApiKey(null);
    setGlobalApiKey("");
    setPendingPrompt(null);
    setIsModalOpen(false); // Clean transition to keyless browsing without modal trapping
    setError(null);
  };

  const handleOpenConfig = () => {
      setIsModalOpen(true);
      setError(null);
  };

  const handleBackToShowcase = () => {
    activeNavigationRef.current++;
    setCurrentId(null);
    setStatus(GenerationStatus.IDLE);
    setUrlNotification(null);
    setError(null);
    syncUrlToExploration(null, 'push');
  };

  const handleSelectShowcaseTopic = async (topic: CommunityCatalogItem) => {
    try {
      setUrlNotification(null);
      setError(null);
      const navId = ++activeNavigationRef.current;
      await hydrateCatalogItem(topic, { isPopState: false, navId });
    } catch (err: any) {
      console.error("[App] Failed to select showcase topic:", err);
      setError(`Failed to load showcase topic: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleSelectTier = (tier: 'pro' | 'budget') => {
    const targetConfig: StageModelConfig = { ...CANONICAL_MODEL_PRESETS[tier] };
    const updated = { tier, config: targetConfig };
    setModelPreferences(updated);
    saveModelPreferences(tier, targetConfig);
  };

  const handleSaveModelPreferences = (tier: ModelTier, config: StageModelConfig) => {
    const updated = { tier, config };
    setModelPreferences(updated);
    saveModelPreferences(tier, config);
  };

  const handleClearHistory = () => {
      activeNavigationRef.current++;
      history.forEach(item => revokeGenerationAssets(item));
      revokeAllObjectURLs();
      setHistory([]);
      setCurrentId(null);
      setStatus(GenerationStatus.IDLE);
      setUrlNotification(null);
      setError(null);
      syncUrlToExploration(null, 'push');
  };

  const handleContribute = async (item: GenerationItem): Promise<{ success: boolean; topicId?: string; error?: string }> => {
    try {
      const bundle = await bundleGenerationItem(
        item,
        item.tier || modelPreferences.tier,
        item.config || modelPreferences.config
      );
      const result = await uploadCommunityBundle(bundle);

      if (result.success) {
        setContributionToast({
          visible: true,
          message: `🎉 "${item.plan?.displayTitle || item.prompt}" contributed to the Community Encyclopedia!`,
          type: 'success'
        });
        setTimeout(() => setContributionToast(null), 5000);
        return { success: true, topicId: result.topicId };
      } else {
        setContributionToast({
          visible: true,
          message: `Contribution failed: ${result.error || 'Upload error'}`,
          type: 'error'
        });
        setTimeout(() => setContributionToast(null), 5000);
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      const errMsg = err.message || 'Upload error';
      setContributionToast({
        visible: true,
        message: `Contribution failed: ${errMsg}`,
        type: 'error'
      });
      setTimeout(() => setContributionToast(null), 5000);
      return { success: false, error: errMsg };
    }
  };

  const updateItem = (id: string, changes: Partial<GenerationItem>) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, ...changes } : item
    ));
  };

  const handleGenerate = async (
    prompt: string, 
    withVideo: boolean, 
    initialUsage: TokenUsage[] = [],
    overrideKey?: string
  ) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;
    if (isProcessing) return;

    const effectiveKey = overrideKey || apiKey || getSessionApiKey();
    if (!effectiveKey) {
      setPendingPrompt({ prompt: cleanPrompt, withVideo });
      setIsModalOpen(true);
      return;
    }

    setGlobalApiKey(effectiveKey);
    if (!apiKey) {
      setApiKey(effectiveKey);
    }

    const topicSlug = generateTopicSlug(cleanPrompt) || 'exploration';
    const id = `${topicSlug}-${Date.now()}`;
    const currentTier = modelPreferences.tier;
    const currentConfig: StageModelConfig = { 
      ...modelPreferences.config,
      enableVideo: withVideo,
    };

    const newItem: GenerationItem = {
      id,
      prompt: cleanPrompt,
      timestamp: Date.now(),
      plan: null,
      components: [],
      narrationScript: null,
      infographicUrl: null,
      assembledUrl: null,
      videoUrl: null,
      audioUrl: null,
      hasVideo: withVideo,
      usage: [...initialUsage],
      tier: currentTier,
      config: currentConfig,
    };

    setHistory(prev => [...prev, newItem]);
    setCurrentId(id);
    setStatus(GenerationStatus.PLANNING);
    setError(null);
    setUrlNotification(null);

    const usageLog: TokenUsage[] = [...initialUsage];

    try {
      // 1. Plan Object
      const planRes = await planObject(cleanPrompt, currentConfig);
      usageLog.push(planRes.usage);
      const plan = planRes.data;
      
      const initialComponents = plan.componentList.map(name => ({
          name,
          shortDescription: "Pending analysis...",
          composition: "Analyzing...",
          detailedContent: ""
      }));

      updateItem(id, { plan, components: initialComponents, usage: usageLog });

      // 2. Generate Infographic
      setStatus(GenerationStatus.GENERATING_INFOGRAPHIC);
      const infoImg = await generateInfographic(cleanPrompt, plan, currentConfig);
      usageLog.push(infoImg.usage);
      updateItem(id, { infographicUrl: infoImg.url, usage: usageLog });

      // 3. Generate Assembled Image
      setStatus(GenerationStatus.GENERATING_ASSEMBLY);
      const assembledImg = await generateAssembledImage(cleanPrompt, plan.displayTitle, plan.originStory, plan.domainType, infoImg.url, currentConfig);
      usageLog.push(assembledImg.usage);
      updateItem(id, { assembledUrl: assembledImg.url, usage: usageLog });

      // 4. Enrich Component Details
      setStatus(GenerationStatus.ENRICHING);
      const enrichedDetails = await enrichComponentDetails(cleanPrompt, plan.componentList, currentConfig);
      usageLog.push(...enrichedDetails.usage);
      updateItem(id, { components: enrichedDetails.data, usage: usageLog });

      // 5. Generate Video & Audio (Parallel)
      setStatus(GenerationStatus.ANIMATING);
      
      const promises: Promise<any>[] = [];

      let finalVideoUrl: string | null = null;
      let finalAudioUrl: string | null = null;
      let finalScript: string | null = null;

      // Video Task
      if (withVideo && assembledImg.url && infoImg.url) {
          promises.push(
              generateVideo(cleanPrompt, plan.domainType, plan.visualMetaphor, assembledImg.url, infoImg.url, currentConfig, plan)
              .then(videoRes => {
                  finalVideoUrl = videoRes.url;
                  usageLog.push(videoRes.usage);
                  updateItem(id, { videoUrl: videoRes.url, usage: usageLog });
              })
          );
      }

      // Audio Task
      promises.push(
          generateAudioNarration(cleanPrompt, plan.originStory, plan.detailedArticle, plan.trivia, plan.audioVibe?.voiceName, currentConfig)
          .then(audioRes => {
              finalAudioUrl = audioRes.url;
              finalScript = audioRes.script;
              usageLog.push(...audioRes.usage);
              updateItem(id, { audioUrl: audioRes.url, narrationScript: audioRes.script, usage: usageLog });
          })
      );

      await Promise.all(promises);

      setStatus(GenerationStatus.COMPLETED);
      syncUrlToExploration(id, 'push');

      // Snapshot completed generation item for contribution modal
      const completedItem: GenerationItem = {
        id,
        prompt: cleanPrompt,
        timestamp: Date.now(),
        plan,
        components: enrichedDetails.data,
        narrationScript: finalScript,
        infographicUrl: infoImg.url,
        assembledUrl: assembledImg.url,
        videoUrl: finalVideoUrl,
        audioUrl: finalAudioUrl,
        hasVideo: withVideo,
        usage: [...usageLog],
        tier: currentTier,
        config: currentConfig,
      };

      // Check opt-out preference safely
      const isOptedOut = (() => {
        try {
          return typeof localStorage !== 'undefined' &&
            localStorage.getItem('explodeit_contribute_optout') === 'true';
        } catch {
          return false;
        }
      })();

      if (!isOptedOut) {
        setTimeout(() => {
          setContributeItem(completedItem);
          setIsContributeModalOpen(true);
        }, 800);
      }

    } catch (err: any) {
      console.error(err);
      
      const msg = err.message || "An unknown error occurred";
      
      // Auth Error Handling
      if (msg.includes("401") || msg.includes("API key") || msg.includes("403")) {
           setError("Invalid API Key. Please check your key and try again.");
           setPendingPrompt({ prompt: cleanPrompt, withVideo });
           setIsModalOpen(true); // Re-open modal on auth failure
           setStatus(GenerationStatus.FAILED);
           return;
      }

      setError(msg);
      setStatus(GenerationStatus.FAILED);
    }
  };

  const handleSurprise = async (withVideo: boolean, overrideKey?: string) => {
      const effectiveKey = overrideKey || apiKey || getSessionApiKey();
      if (!effectiveKey) {
        setPendingPrompt({ prompt: '', withVideo, isSurprise: true });
        setIsModalOpen(true);
        return;
      }
      setGlobalApiKey(effectiveKey);
      if (!apiKey) {
        setApiKey(effectiveKey);
      }

      setStatus(GenerationStatus.GENERATING_RANDOM);
      setError(null);
      setUrlNotification(null);
      setCurrentId(null); 

      try {
          const { name, usage } = await getRandomObject();
          await handleGenerate(name, withVideo, [usage], effectiveKey);
      } catch (err: any) {
          console.error(err);
           // Auth Error Handling for Surprise Mode too
           const msg = err.message || "";
           if (msg.includes("401") || msg.includes("API key") || msg.includes("403")) {
                setError("Invalid API Key. Please check your key and try again.");
                setPendingPrompt({ prompt: '', withVideo, isSurprise: true });
                setIsModalOpen(true); 
                setStatus(GenerationStatus.IDLE);
                return;
           }

          setError("Failed to dream up an object. Please try again.");
          setStatus(GenerationStatus.IDLE);
      }
  };

  const currentItem = history.find(h => h.id === currentId) || null;
  // If we are viewing a completed item, status should effectively be COMPLETED for display purposes
  const isItemComplete = Boolean(currentItem?.plan && currentItem?.infographicUrl);
  const effectiveStatus = isProcessing
    ? status
    : (isItemComplete ? GenerationStatus.COMPLETED : status);

  const hasActiveKey = Boolean(apiKey && apiKey.trim().length > 0);

  const showShareFeedback = (msg = 'Link copied to clipboard!') => {
    const text =
      !msg || msg.startsWith('http://') || msg.startsWith('https://') || msg.startsWith('/')
        ? 'Link copied to clipboard!'
        : msg;
    if (shareTimeoutRef.current) {
      clearTimeout(shareTimeoutRef.current);
    }
    setShareToast({
      visible: true,
      message: text,
    });
    shareTimeoutRef.current = setTimeout(() => {
      setShareToast(null);
      shareTimeoutRef.current = null;
    }, 3000);
  };

  const handleShareCurrentItem = async () => {
    if (!currentItem?.id) return;
    const url = getCanonicalExplorationUrl(currentItem.id);
    const copied = await copyToClipboard(url);
    if (copied) {
      showShareFeedback();
    } else {
      showShareFeedback('Could not copy link to clipboard. Please copy from address bar.');
    }
  };

  return (
    <div className="flex h-screen h-[100dvh] bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-cyan-500/30">
      
      <ApiKeyModal 
        isOpen={isModalOpen} 
        onSave={handleSaveKey} 
        onCancel={() => {
          setIsModalOpen(false);
          setPendingPrompt(null);
        }}
        onClear={handleClearKey}
        initialValue={apiKey || ''}
        error={error}
        hasPendingPrompt={Boolean(pendingPrompt)}
      />

      <ModelSettingsModal 
        isOpen={isModelSettingsOpen}
        onClose={() => setIsModelSettingsOpen(false)}
        currentTier={modelPreferences.tier}
        currentConfig={modelPreferences.config}
        onSavePreferences={handleSaveModelPreferences}
      />

      <CommunityContributeModal
        isOpen={isContributeModalOpen}
        item={contributeItem}
        onClose={() => setIsContributeModalOpen(false)}
        onContribute={handleContribute}
      />

      {/* Community Contribution Toast */}
      {contributionToast && contributionToast.visible && (
        <div 
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 animate-fade-in ${
            contributionToast.type === 'success'
              ? 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-200'
              : contributionToast.type === 'error'
              ? 'bg-red-950/90 border border-red-500/50 text-red-200'
              : 'bg-cyan-950/90 border border-cyan-500/50 text-cyan-200'
          }`}
        >
          {contributionToast.type === 'success' && (
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span>{contributionToast.message}</span>
          <button 
            type="button" 
            onClick={() => setContributionToast(null)} 
            className="ml-2 text-slate-400 hover:text-white"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Share Link Toast Notification */}
      {shareToast && shareToast.visible && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 animate-fade-in bg-cyan-950/90 border border-cyan-500/50 text-cyan-200"
        >
          <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{shareToast.message}</span>
          <button 
            type="button" 
            onClick={() => setShareToast(null)} 
            className="ml-2 text-slate-400 hover:text-white cursor-pointer font-bold"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Mobile Sidebar Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          role="presentation"
          aria-hidden="true"
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in cursor-pointer"
          data-testid="mobile-sidebar-backdrop"
        />
      )}

      <Sidebar 
        history={history} 
        currentId={currentId} 
        onSelect={(item) => {
            activeNavigationRef.current++;
            setCurrentId(item.id);
            setError(null);
            setUrlNotification(null);
            if (!isProcessing) {
              setStatus(GenerationStatus.IDLE); 
            }
            setIsMobileSidebarOpen(false);
            syncUrlToExploration(item.id, 'push');
        }}
        onClear={handleClearHistory}
        onChangeKey={handleOpenConfig}
        hasKey={hasActiveKey}
        currentTier={modelPreferences.tier}
        currentConfig={modelPreferences.config}
        onOpenModelSettings={() => setIsModelSettingsOpen(true)}
        catalogItems={catalog}
        onSelectCatalogItem={(topic) => {
            setIsMobileSidebarOpen(false);
            handleSelectShowcaseTopic(topic);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-screen h-[100dvh] overflow-hidden relative w-full min-w-0">
        
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10"></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-cyan-500/5 blur-[120px] rounded-full -z-10"></div>

        {/* Top Navigation Header Bar */}
        <Header
          apiKey={apiKey}
          modelTier={modelPreferences.tier}
          onSelectTier={handleSelectTier}
          onOpenModelSettings={() => setIsModelSettingsOpen(true)}
          onOpenApiKeyModal={handleOpenConfig}
          onNavigateHome={handleBackToShowcase}
          onShare={handleShareCurrentItem}
          isViewingTopic={currentItem !== null}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-12 scroll-smooth">
          
          <InputArea 
            onSubmit={(prompt, withVideo) => handleGenerate(prompt, withVideo)}
            onSurprise={handleSurprise}
            disabled={isProcessing}
            modelTier={modelPreferences.tier}
          />

          <ProgressTracker status={status} config={modelPreferences.config} />

          {/* URL Deep-Link Fallback Notice */}
          {urlNotification && urlNotification.visible && (
            <div 
              role="status"
              aria-live="polite"
              className="w-full max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center justify-between gap-3 backdrop-blur-md animate-fade-in"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{urlNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setUrlNotification(null)}
                className="text-amber-300/70 hover:text-amber-100 p-1 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer text-base leading-none font-bold"
                aria-label="Dismiss notice"
              >
                ×
              </button>
            </div>
          )}

          {/* General App Error (non-auth errors) */}
          {error && !isModalOpen && (
            <div className="w-full max-w-4xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/50 text-red-200 rounded-lg text-center">
              Error: {error}
            </div>
          )}

          {/* In idle state with no current item selected: render CommunityShowcase */}
          {!currentItem && status === GenerationStatus.IDLE ? (
            <CommunityShowcase 
              onSelectTopic={handleSelectShowcaseTopic}
              catalogItems={catalog}
              isLoading={catalogLoading}
              hasKey={hasActiveKey}
              onOpenApiKeyModal={handleOpenConfig}
            />
          ) : (
            <DisplayArea 
              item={currentItem} 
              status={effectiveStatus} 
              onBackToShowcase={handleBackToShowcase}
              onShare={showShareFeedback}
            />
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
