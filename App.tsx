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
  getRandomObject,
  revokeGenerationAssets,
  setGlobalApiKey
} from './services/geminiService';
import { initGA } from './services/analytics';
import ApiKeyModal from './components/ApiKeyModal';

const App: React.FC = () => {
  const [history, setHistory] = useState<GenerationItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  
  // API Key Management
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    initializeApiKey();
    initGA();
  }, []);

  const initializeApiKey = () => {
    // 1. Check Local Storage
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
        setApiKey(storedKey);
        setGlobalApiKey(storedKey);
        return;
    }

    // 2. Check Env Var (Legacy/Deployment)
    if (process.env.API_KEY && process.env.API_KEY.length > 0) {
        setApiKey(process.env.API_KEY);
        setGlobalApiKey(process.env.API_KEY);
        return;
    }

    // 3. No key found -> Open Splash
    setIsModalOpen(true);
  };

  const handleSaveKey = (key: string) => {
      localStorage.setItem('gemini_api_key', key);
      setApiKey(key);
      setGlobalApiKey(key);
      setIsModalOpen(false);
      setError(null);
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey(null);
    setGlobalApiKey("");
    setIsModalOpen(true); // Re-open as splash since we need a key
    setError(null);
  };

  const handleOpenConfig = () => {
      setIsModalOpen(true);
      setError(null);
  };

  const handleClearHistory = () => {
      history.forEach(item => revokeGenerationAssets(item));
      setHistory([]);
      setCurrentId(null);
      setStatus(GenerationStatus.IDLE);
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
      const assembledImg = await generateAssembledImage(prompt, plan.displayTitle, plan.originStory, plan.domainType, infoImg.url);
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
              generateVideo(prompt, plan.domainType, plan.visualMetaphor, assembledImg.url, infoImg.url)
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
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10"></div>
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-cyan-500/5 blur-[120px] rounded-full -z-10"></div>

        <div className="flex-1 overflow-y-auto p-6 md:p-12 scroll-smooth">
          
          <InputArea 
            onSubmit={(prompt, withVideo) => handleGenerate(prompt, withVideo)}
            onSurprise={handleSurprise}
            disabled={isProcessing || !apiKey}
          />

          <ProgressTracker status={status} />

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