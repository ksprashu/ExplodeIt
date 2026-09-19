import React, { useState, useEffect, useMemo } from 'react';
import { ModelTier, StageModelConfig } from '../types';
import { 
  MODEL_REGISTRY, 
  CANONICAL_MODEL_PRESETS, 
  estimateRunCost,
} from '../constants';

export interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: ModelTier;
  currentConfig: StageModelConfig;
  onSavePreferences: (tier: ModelTier, config: StageModelConfig) => void;
}

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  currentConfig,
  onSavePreferences,
}) => {
  const [selectedTier, setSelectedTier] = useState<ModelTier>(currentTier);
  const [stageConfig, setStageConfig] = useState<StageModelConfig>(currentConfig);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedTier(currentTier);
      setStageConfig(currentConfig);
    }
  }, [isOpen, currentTier, currentConfig]);

  const proEstimatedCost = useMemo(() => estimateRunCost(CANONICAL_MODEL_PRESETS.pro), []);
  const budgetEstimatedCost = useMemo(() => estimateRunCost(CANONICAL_MODEL_PRESETS.budget), []);
  const liveCostEstimate = useMemo(() => estimateRunCost(stageConfig), [stageConfig]);

  if (!isOpen) return null;

  const handleSelectPreset = (tier: 'pro' | 'budget') => {
    setSelectedTier(tier);
    setStageConfig({ ...CANONICAL_MODEL_PRESETS[tier] });
  };

  const handleToggleVideo = () => {
    const updated: StageModelConfig = {
      ...stageConfig,
      enableVideo: !stageConfig.enableVideo,
    };
    setStageConfig(updated);
    checkTierMatch(updated);
  };

  const handleStageModelChange = (stage: keyof Omit<StageModelConfig, 'enableVideo'>, modelId: string) => {
    const updated: StageModelConfig = {
      ...stageConfig,
      [stage]: modelId,
    };
    setStageConfig(updated);
    checkTierMatch(updated);
  };

  const checkTierMatch = (cfg: StageModelConfig) => {
    const isPro = 
      cfg.planning === CANONICAL_MODEL_PRESETS.pro.planning &&
      cfg.infographic === CANONICAL_MODEL_PRESETS.pro.infographic &&
      cfg.assembled === CANONICAL_MODEL_PRESETS.pro.assembled &&
      cfg.video === CANONICAL_MODEL_PRESETS.pro.video &&
      cfg.narration === CANONICAL_MODEL_PRESETS.pro.narration &&
      cfg.enableVideo === CANONICAL_MODEL_PRESETS.pro.enableVideo;

    const isBudget = 
      cfg.planning === CANONICAL_MODEL_PRESETS.budget.planning &&
      cfg.infographic === CANONICAL_MODEL_PRESETS.budget.infographic &&
      cfg.assembled === CANONICAL_MODEL_PRESETS.budget.assembled &&
      cfg.video === CANONICAL_MODEL_PRESETS.budget.video &&
      cfg.narration === CANONICAL_MODEL_PRESETS.budget.narration &&
      cfg.enableVideo === CANONICAL_MODEL_PRESETS.budget.enableVideo;

    if (isPro) {
      setSelectedTier('pro');
    } else if (isBudget) {
      setSelectedTier('budget');
    } else {
      setSelectedTier('custom');
    }
  };

  const handleResetToPresetDefaults = () => {
    const target = selectedTier === 'budget' ? 'budget' : 'pro';
    setSelectedTier(target);
    setStageConfig({ ...CANONICAL_MODEL_PRESETS[target] });
  };

  const handleSave = () => {
    onSavePreferences(selectedTier, stageConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/60">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">⚡</span> Model Tier & Pipeline Settings
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Select an optimized model tier or customize per-stage AI generation parameters.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Preset Cards: Side-by-Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pro Studio Card */}
            <div 
              onClick={() => handleSelectPreset('pro')}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 relative ${
                selectedTier === 'pro'
                  ? 'bg-cyan-950/20 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-950/50'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950">
                  Pro Studio
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  ~${proEstimatedCost.toFixed(3)}/run
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">Premier Quality</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Gemini 3.8 Flash High-Thinking deconstruction, 2K HD exploded infographics, and Veo 3.1 cinematic assembly animation.
              </p>
              <div className="text-[11px] font-mono text-slate-500 space-y-1">
                <div>• Planning: Gemini 3.8 Flash</div>
                <div>• Images: Gemini 3 Pro Image (2K)</div>
                <div>• Video: Veo 3.1 Cinema (Enabled)</div>
              </div>
            </div>

            {/* Budget Saver Card */}
            <div 
              onClick={() => handleSelectPreset('budget')}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 relative ${
                selectedTier === 'budget'
                  ? 'bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950">
                  Budget Saver
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  ~${budgetEstimatedCost.toFixed(3)}/run
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-200 mb-1">Credit Conserver</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Fast Flash planning, cost-efficient Gemini 3.1 Flash visuals, and video disabled by default to save credits.
              </p>
              <div className="text-[11px] font-mono text-slate-500 space-y-1">
                <div>• Planning: Gemini 3.8 Flash</div>
                <div>• Images: Gemini 3.1 Flash Image</div>
                <div>• Video: Disabled (Veo 3.1 Lite Standby)</div>
              </div>
            </div>
          </div>

          {/* Video Toggle Switch */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-200">
                  Generate Kinematic Assembly Video
                </span>
                {stageConfig.enableVideo ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-bold">
                    DISABLED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Video diffusion renders realistic mechanical lock-in motion but consumes the majority of run credits (~$0.25 - $2.00/video).
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleVideo}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                stageConfig.enableVideo ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={stageConfig.enableVideo}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  stageConfig.enableVideo ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Expandable Advanced Stage Overrides Accordion */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:bg-slate-800/40 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>⚙️</span>
                <span>Advanced Stage Overrides</span>
                {selectedTier === 'custom' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Custom Active
                  </span>
                )}
              </span>
              <span className="text-slate-500 font-mono text-sm">
                {isAdvancedOpen ? '▲' : '▼'}
              </span>
            </button>

            {isAdvancedOpen && (
              <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-950/60">
                {/* Planning Model */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Stage 1: Planning & Blueprint Architecture
                  </label>
                  <select
                    value={stageConfig.planning}
                    onChange={(e) => handleStageModelChange('planning', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (gemini-3.1-pro-preview)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (gemini-3.8-flash)</option>
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (gemini-3.5-flash-lite)</option>
                  </select>
                </div>

                {/* Infographic Model */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Stage 2: Exploded Infographic Image
                  </label>
                  <select
                    value={stageConfig.infographic}
                    onChange={(e) => handleStageModelChange('infographic', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="gemini-3-pro-image">Gemini 3 Pro Image (gemini-3-pro-image)</option>
                    <option value="gemini-3.1-flash-image">Gemini 3.1 Flash Image (gemini-3.1-flash-image)</option>
                  </select>
                </div>

                {/* Assembled Product Model */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Stage 3: Assembled Product Shot (Image-to-Image)
                  </label>
                  <select
                    value={stageConfig.assembled}
                    onChange={(e) => handleStageModelChange('assembled', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="gemini-3-pro-image">Gemini 3 Pro Image (gemini-3-pro-image)</option>
                    <option value="gemini-3.1-flash-image">Gemini 3.1 Flash Image (gemini-3.1-flash-image)</option>
                  </select>
                </div>

                {/* Video Model */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Stage 4: Kinematic Assembly Video
                  </label>
                  <select
                    value={stageConfig.video}
                    disabled={!stageConfig.enableVideo}
                    onChange={(e) => handleStageModelChange('video', e.target.value)}
                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono ${
                      !stageConfig.enableVideo ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="veo-3.1-generate-preview">Veo 3.1 Cinema (veo-3.1-generate-preview)</option>
                    <option value="veo-3.1-lite-generate-preview">Veo 3.1 Lite (veo-3.1-lite-generate-preview)</option>
                  </select>
                  {!stageConfig.enableVideo && (
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Video generation is currently toggled off above.
                    </span>
                  )}
                </div>

                {/* Narration Script Model */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Stage 5: Audio Guide Narration Script
                  </label>
                  <select
                    value={stageConfig.narration}
                    onChange={(e) => handleStageModelChange('narration', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (gemini-3.5-flash-lite)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (gemini-3.8-flash)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleResetToPresetDefaults}
                    className="text-xs text-slate-400 hover:text-cyan-400 underline transition-colors font-mono"
                  >
                    Reset to {selectedTier === 'budget' ? 'Budget' : 'Pro'} Preset Defaults
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Estimated Cost Calculation Badge */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                Estimated Cost Per Run
              </span>
              <span className="text-xl font-mono font-black text-emerald-400">
                ${liveCostEstimate.toFixed(4)} USD
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 font-mono block">
                Calculated dynamically across 5 stages
              </span>
              {stageConfig.enableVideo ? (
                <span className="text-[11px] text-cyan-400 font-medium">
                  Video Included
                </span>
              ) : (
                <span className="text-[11px] text-emerald-400 font-medium">
                  Video Disabled (Saves &gt;90%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all"
            >
              Apply & Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ModelSettingsModal;
