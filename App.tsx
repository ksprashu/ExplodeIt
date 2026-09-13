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
import ModelSettingsModal from './components/ModelSettingsModal';
import { GenerationItem, GenerationStatus, TokenUsage, ModelTier, StageModelConfig } from './types';
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
import ApiKeyModal from './components/ApiKeyModal';
import CommunityContributeModal from './components/CommunityContributeModal';
import { bundleGenerationItem, uploadCommunityBundle } from './services/communityStorage';
import { revokeAllObjectURLs } from './services/mediaCache';

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

const App: React.FC = () => {
  const [history, setHistory] = useState<GenerationItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  
  // Model Tier & Configuration State
  const [modelPreferences, setModelPreferences] = useState<{ tier: ModelTier; config: StageModelConfig }>(() => loadModelPreferences());
  const [isModelSettingsOpen, setIsModelSettingsOpen] = useState(false);

  // API Key Management (Strict Session Isolation: SessionStorage ONLY)
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Community Contribution Modal & Toast Feedback State
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [contributeItem, setContributeItem] = useState<GenerationItem | null>(null);
  const [contributionToast, setContributionToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    initializeApiKey();
    initGA();

    const handleBeforeUnload = () => {
      revokeAllObjectURLs();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      revokeAllObjectURLs();
    };
  }, []);

  const initializeApiKey = () => {
    let resolvedKey: string | null = null;

    // 1. Active Migration & Cleanup of Legacy Persistent Storage
    try {
      if (typeof localStorage !== 'undefined') {
        const legacyKey = localStorage.getItem('gemini_api_key');
        if (legacyKey) {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('gemini_api_key', legacyKey);
          }
          resolvedKey = legacyKey;
        }
        // Guarantee legacy key is purged from disk in all execution paths
        localStorage.removeItem('gemini_api_key');
      }
    } catch (e) {
      console.warn("Unable to access or clean legacy localStorage:", e);
    }

    // 2. Check Session Storage (for active tab session across refreshes)
    if (!resolvedKey) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          resolvedKey = sessionStorage.getItem('gemini_api_key');
        }
      } catch (e) {
        console.warn("Unable to access sessionStorage:", e);
      }
    }

    // If key found from session storage or legacy migration
    if (resolvedKey) {
      setApiKey(resolvedKey);
      setGlobalApiKey(resolvedKey);
      return;
    }

    // 3. Check Env Var (Fallback/Hosted Deployment)
    if (process.env.API_KEY && process.env.API_KEY.length > 0) {
      setApiKey(process.env.API_KEY);
      setGlobalApiKey(process.env.API_KEY);
      return;
    }

    // 4. No key found -> Open Splash
    setIsModalOpen(true);
  };

  const handleSaveKey = (key: string) => {
    const trimmedKey = key.trim();
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('gemini_api_key', trimmedKey);
      }
    } catch (e) {
      console.warn("Failed to save key to sessionStorage:", e);
    }

    try {
      // Double safeguard: ensure localStorage never holds the key
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('gemini_api_key');
      }
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
    }

    setApiKey(trimmedKey);
    setGlobalApiKey(trimmedKey);
    setIsModalOpen(false);
    setError(null);
  };

  const handleClearKey = () => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('gemini_api_key');
      }
    } catch (e) {
      console.warn("Failed to remove key from sessionStorage:", e);
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('gemini_api_key');
      }
    } catch (e) {
      console.warn("Failed to remove key from localStorage:", e);
    }

    setApiKey(null);
    setGlobalApiKey("");
    setIsModalOpen(true); // Re-open as splash since we need a key
    setError(null);
  };

  const handleOpenConfig = () => {
      setIsModalOpen(true);
      setError(null);
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
      history.forEach(item => revokeGenerationAssets(item));
      revokeAllObjectURLs();
      setHistory([]);
      setCurrentId(null);
      setStatus(GenerationStatus.IDLE);
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

  const handleGenerate = async (prompt: string, withVideo: boolean, initialUsage: TokenUsage[] = []) => {
    if (!apiKey) {
      setIsModalOpen(true);
      return;
    }

    const id = Date.now().toString();
    const currentTier = modelPreferences.tier;
    const currentConfig: StageModelConfig = { 
      ...modelPreferences.config,
      enableVideo: withVideo,
    };

    const newItem: GenerationItem = {
      id,
      prompt,
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

    const usageLog: TokenUsage[] = [...initialUsage];

    try {
      // 1. Plan Object
      const planRes = await planObject(prompt, currentConfig);
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
      const infoImg = await generateInfographic(prompt, plan, currentConfig);
      usageLog.push(infoImg.usage);
      updateItem(id, { infographicUrl: infoImg.url, usage: usageLog });

      // 3. Generate Assembled Image
      setStatus(GenerationStatus.GENERATING_ASSEMBLY);
      const assembledImg = await generateAssembledImage(prompt, plan.displayTitle, plan.originStory, plan.domainType, infoImg.url, currentConfig);
      usageLog.push(assembledImg.usage);
      updateItem(id, { assembledUrl: assembledImg.url, usage: usageLog });

      // 4. Enrich Component Details
      setStatus(GenerationStatus.ENRICHING);
      const enrichedDetails = await enrichComponentDetails(prompt, plan.componentList, currentConfig);
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
              generateVideo(prompt, plan.domainType, plan.visualMetaphor, assembledImg.url, infoImg.url, currentConfig)
              .then(videoRes => {
                  finalVideoUrl = videoRes.url;
                  usageLog.push(videoRes.usage);
                  updateItem(id, { videoUrl: videoRes.url, usage: usageLog });
              })
          );
      }

      // Audio Task
      promises.push(
          generateAudioNarration(prompt, plan.originStory, plan.detailedArticle, plan.trivia, plan.audioVibe?.voiceName, currentConfig)
          .then(audioRes => {
              finalAudioUrl = audioRes.url;
              finalScript = audioRes.script;
              usageLog.push(...audioRes.usage);
              updateItem(id, { audioUrl: audioRes.url, narrationScript: audioRes.script, usage: usageLog });
          })
      );

      await Promise.all(promises);

      setStatus(GenerationStatus.COMPLETED);

      // Snapshot completed generation item for contribution modal
      const completedItem: GenerationItem = {
        id,
        prompt,
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

      // Check opt-out preference
      const isOptedOut = typeof localStorage !== 'undefined' &&
        localStorage.getItem('explodeit_contribute_optout') === 'true';

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
           setIsModalOpen(true); // Re-open modal on auth failure
           setStatus(GenerationStatus.FAILED);
           return;
      }

      setError(msg);
      setStatus(GenerationStatus.FAILED);
    }
  };

  const handleSurprise = async (withVideo: boolean) => {
      if (!apiKey) {
        setIsModalOpen(true);
        return;
      }

      setStatus(GenerationStatus.GENERATING_RANDOM);
      setError(null);
      setCurrentId(null); 

      try {
          const { name, usage } = await getRandomObject();
          await handleGenerate(name, withVideo, [usage]);
      } catch (err: any) {
          console.error(err);
           // Auth Error Handling for Surprise Mode too
           const msg = err.message || "";
           if (msg.includes("401") || msg.includes("API key") || msg.includes("403")) {
                setError("Invalid API Key. Please check your key and try again.");
                setIsModalOpen(true); 
                setStatus(GenerationStatus.IDLE);
                return;
           }

          setError("Failed to dream up an object. Please try again.");
          setStatus(GenerationStatus.IDLE);
      }
  };

  const currentItem = history.find(h => h.id === currentId) || null;
  const isProcessing = status !== GenerationStatus.IDLE && status !== GenerationStatus.COMPLETED && status !== GenerationStatus.FAILED;
  // If we are viewing an old item, status should effectively be COMPLETED for display purposes
  const effectiveStatus = currentId === currentItem?.id ? status : GenerationStatus.COMPLETED;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-cyan-500/30">
      
      <ApiKeyModal 
        isOpen={isModalOpen} 
        onSave={handleSaveKey} 
        onCancel={() => setIsModalOpen(false)}
        onClear={handleClearKey}
        initialValue={apiKey || ''}
        error={error}
        isSplash={!apiKey} // Block if no key exists
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

      <Sidebar 
        history={history} 
        currentId={currentId} 
        onSelect={(item) => {
            setCurrentId(item.id);
            if (!isProcessing) {
              setStatus(GenerationStatus.IDLE); 
            }
        }}
        onClear={handleClearHistory}
        onChangeKey={handleOpenConfig}
        hasKey={!!apiKey}
        currentTier={modelPreferences.tier}
        currentConfig={modelPreferences.config}
        onOpenModelSettings={() => setIsModelSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10"></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-cyan-500/5 blur-[120px] rounded-full -z-10"></div>

        {/* Top Navigation Header Bar */}
        <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3 flex items-center justify-between gap-4 shrink-0 z-10">
          {/* Left: Engine Status Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300">
              <span className={`w-2 h-2 rounded-full ${
                modelPreferences.tier === 'budget' 
                  ? 'bg-emerald-400' 
                  : modelPreferences.tier === 'custom' 
                  ? 'bg-purple-400' 
                  : 'bg-cyan-400'
              } animate-pulse`} />
              <span className="hidden sm:inline text-slate-400">Model Engine:</span>
              <span className="text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
                {modelPreferences.tier === 'custom' 
                  ? 'Custom' 
                  : modelPreferences.tier === 'pro' 
                  ? 'Pro Studio' 
                  : 'Budget Saver'}
              </span>
            </div>
          </div>

          {/* Right: Tier Switcher Pill & Settings Gear */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Segmented Pill [ Pro Studio | Budget Saver ] */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-full shadow-inner">
              {/* Pro Studio Segment */}
              <button
                type="button"
                onClick={() => handleSelectTier('pro')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  modelPreferences.tier === 'pro'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                title="Pro Studio: Premier quality models (Gemini 3 Pro, 2K Images, Veo 3.1)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <span className="whitespace-nowrap">Pro Studio</span>
              </button>

              {/* Budget Saver Segment */}
              <button
                type="button"
                onClick={() => handleSelectTier('budget')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  modelPreferences.tier === 'budget'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                title="Budget Saver: Fast, credit-conserving models (Gemini 2.5 Flash, Imagen 3 Fast, optional video)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="whitespace-nowrap">Budget Saver</span>
              </button>

              {/* Custom Overrides Pill */}
              {modelPreferences.tier === 'custom' && (
                <span className="ml-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                  Custom
                </span>
              )}
            </div>

            {/* Settings Gear Button */}
            <button
              type="button"
              onClick={() => setIsModelSettingsOpen(true)}
              className="p-2 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 transition-all duration-200 hover:rotate-45"
              title="Configure Model Settings & Advanced Overrides"
              aria-label="Open Model Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 scroll-smooth">
          
          <InputArea 
            onSubmit={(prompt, withVideo) => handleGenerate(prompt, withVideo)}
            onSurprise={handleSurprise}
            disabled={isProcessing || !apiKey}
          />

          <ProgressTracker status={status} config={modelPreferences.config} />

          {/* General App Error (non-auth errors) */}
          {error && !isModalOpen && (
            <div className="w-full max-w-4xl mx-auto mb-8 p-4 bg-red-500/10 border border-red-500/50 text-red-200 rounded-lg text-center">
              Error: {error}
            </div>
          )}

          <DisplayArea item={currentItem} status={effectiveStatus} />

        </div>
      </main>
    </div>
  );
};

export default App;
