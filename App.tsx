import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import InputArea from './components/InputArea';
import ProgressTracker from './components/ProgressTracker';
import DisplayArea from './components/DisplayArea';
import { GenerationItem, GenerationStatus, TokenUsage } from './types';
import { 
  planObject, 
  generateInfographic, 
  generateAssembledImage, 
  enrichComponentDetails, 
  generateVideo, 
  generateAudioNarration,
  getRandomObject 
} from './services/geminiService';

const App: React.FC = () => {
  const [history, setHistory] = useState<GenerationItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [apiKeySelected, setApiKeySelected] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // 1. Strict Environment Variable Check (Build/Run time)
    // We check length to ensure it's not an empty string placeholder
    if (process.env.API_KEY && process.env.API_KEY.length > 0) {
        setApiKeySelected(true);
        return;
    }

    // 2. AI Studio Bridge Check
    try {
      const win = window as any;
      if (win.aistudio && await win.aistudio.hasSelectedApiKey()) {
        setApiKeySelected(true);
        return;
      }
    } catch (e) {
      console.error("Error checking API key status", e);
    }
    
    // 3. Default: Remain Locked
    setApiKeySelected(false);
  };

  const handleSelectKey = async () => {
    const win = window as any;
    if (win.aistudio) {
      try {
        await win.aistudio.openSelectKey();
        // Per instructions: assume success and proceed immediately to avoid race conditions
        setApiKeySelected(true);
        setError(null);
      } catch (e) {
        console.error(e);
        setError("Failed to select API key via AI Studio.");
        // If the selection failed/was cancelled, ensure we stay locked
        setApiKeySelected(false);
      }
    } else {
        // Fallback for deployed environments (Cloud Run, Netlify, etc.)
        // We cannot generate a UI input for security reasons, so we direct the user to Env Var config.
        console.warn("AI Studio environment not detected.");
        setError("AI Studio bridge not found. Please set the API_KEY environment variable in your deployment configuration.");
        setApiKeySelected(false);
    }
  };

  const updateItem = (id: string, changes: Partial<GenerationItem>) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, ...changes } : item
    ));
  };

  const handleGenerate = async (prompt: string, withVideo: boolean, initialUsage: TokenUsage[] = []) => {
    if (!apiKeySelected) {
      await handleSelectKey();
      // If still not selected (e.g. user cancelled or error), abort
      if (!apiKeySelected) return;
    }

    const id = Date.now().toString();
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
      usage: [...initialUsage]
    };

    setHistory(prev => [...prev, newItem]);
    setCurrentId(id);
    setStatus(GenerationStatus.PLANNING);
    setError(null);

    const usageLog: TokenUsage[] = [...initialUsage];

    try {
      // 1. Plan Object (Gemini 3 Pro)
      const planRes = await planObject(prompt);
      usageLog.push(planRes.usage);
      const plan = planRes.data;
      
      const initialComponents = plan.componentList.map(name => ({
          name,
          shortDescription: "Pending analysis...",
          composition: "Analyzing...",
          detailedContent: ""
      }));

      updateItem(id, { plan, components: initialComponents, usage: usageLog });

      // 2. Generate Infographic (Pro Image)
      setStatus(GenerationStatus.GENERATING_INFOGRAPHIC);
      const infoImg = await generateInfographic(prompt, plan);
      usageLog.push(infoImg.usage);
      updateItem(id, { infographicUrl: infoImg.url, usage: usageLog });

      // 3. Generate Assembled Image (Pro Image)
      setStatus(GenerationStatus.GENERATING_ASSEMBLY);
      const assembledImg = await generateAssembledImage(prompt, infoImg.url);
      usageLog.push(assembledImg.usage);
      updateItem(id, { assembledUrl: assembledImg.url, usage: usageLog });

      // 4. Enrich Component Details (Pro Text - Batched Parallel)
      setStatus(GenerationStatus.ENRICHING);
      const enrichedDetails = await enrichComponentDetails(prompt, plan.componentList);
      usageLog.push(...enrichedDetails.usage);
      updateItem(id, { components: enrichedDetails.data, usage: usageLog });

      // 5. Generate Video & Audio (Parallel)
      setStatus(GenerationStatus.ANIMATING);
      
      const promises: Promise<any>[] = [];

      // Video Task
      if (withVideo && assembledImg.url && infoImg.url) {
          promises.push(
              generateVideo(prompt, assembledImg.url, infoImg.url)
              .then(videoRes => {
                  usageLog.push(videoRes.usage);
                  updateItem(id, { videoUrl: videoRes.url, usage: usageLog });
              })
          );
      }

      // Audio Task
      promises.push(
          generateAudioNarration(prompt, plan.originStory, plan.detailedArticle, plan.trivia, plan.audioVibe?.voiceName)
          .then(audioRes => {
              usageLog.push(...audioRes.usage);
              updateItem(id, { audioUrl: audioRes.url, narrationScript: audioRes.script, usage: usageLog });
          })
      );

      await Promise.all(promises);

      setStatus(GenerationStatus.COMPLETED);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unknown error occurred");
      setStatus(GenerationStatus.FAILED);
    }
  };

  const handleSurprise = async (withVideo: boolean) => {
      // Force check/select key before starting
      if (!apiKeySelected) {
        await handleSelectKey();
        if (!apiKeySelected) return;
      }

      setStatus(GenerationStatus.GENERATING_RANDOM);
      setError(null);
      setCurrentId(null); 

      try {
          const { name, usage } = await getRandomObject();
          await handleGenerate(name, withVideo, [usage]);
      } catch (err: any) {
          console.error(err);
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
      
      <Sidebar 
        history={history} 
        currentId={currentId} 
        onSelect={(item) => {
            setCurrentId(item.id);
            if (!isProcessing) {
              setStatus(GenerationStatus.IDLE); 
            }
        }}
        onChangeKey={handleSelectKey}
        hasKey={apiKeySelected}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10"></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-cyan-500/5 blur-[120px] rounded-full -z-10"></div>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 scroll-smooth">
          
          {!apiKeySelected && (
            <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Welcome to ExplodeIt</h2>
                <p className="text-slate-400 mb-6">To generate high-quality infographics and animations with Gemini 3 & Veo, please configure your API key.</p>
                
                {/* Error message specifically for key selection failure */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-200 text-sm text-left animate-fade-in">
                        <strong className="block mb-1 text-red-400 font-bold">Configuration Required</strong>
                        {error}
                    </div>
                )}

                <button 
                  onClick={handleSelectKey}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg font-bold shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Select API Key (AI Studio)
                </button>
                <p className="mt-4 text-xs text-slate-500 leading-relaxed">
                  Deployed? Set <code>API_KEY</code> in your environment variables.<br/>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-cyan-400">
                    Get a paid key here
                  </a>
                </p>
              </div>
            </div>
          )}

          <InputArea 
            onSubmit={(prompt, withVideo) => handleGenerate(prompt, withVideo)}
            onSurprise={handleSurprise}
            disabled={isProcessing || !apiKeySelected}
          />

          <ProgressTracker status={status} />

          {/* General App Error (only show if not blocked by splash screen to avoid duplicate/visual clutter) */}
          {error && apiKeySelected && (
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