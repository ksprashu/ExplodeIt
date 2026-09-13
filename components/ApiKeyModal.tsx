import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onCancel: () => void;
  onClear?: () => void;
  initialValue?: string;
  error?: string | null;
  isSplash?: boolean; // Kept for backward compatibility
  hasPendingPrompt?: boolean;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  isOpen, 
  onSave, 
  onCancel, 
  onClear, 
  initialValue = '', 
  error, 
  hasPendingPrompt = false 
}) => {
  const [key, setKey] = useState(initialValue);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setKey(initialValue);
  }, [initialValue, isOpen]);

  useEffect(() => {
    // Non-empty validation; Google Gemini keys are typically > 10 chars starting with AIza
    setIsValid(key.trim().length > 10);
  }, [key]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSave(key.trim());
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* Top-Right Dismiss Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close API Key modal"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-b border-slate-700 pr-12">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-xl">🔑</span>
            {initialValue ? "Manage Session API Key" : "Configure Gemini API Key"}
          </h2>
          <p className="text-slate-400 text-xs mt-2 leading-relaxed">
            {hasPendingPrompt
              ? "An API key is required to generate this custom exploded view. Enter your Google Gemini key below to begin."
              : "Required for custom generation runs. You can explore all existing community encyclopedia topics for free without an API key."}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-red-200">
                <span className="font-bold block mb-0.5">Authentication Failed</span>
                {error}
              </div>
            </div>
          )}

          {/* Session Privacy Assurance */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div className="text-xs text-slate-400 leading-relaxed space-y-1">
              <div className="font-semibold text-slate-200 flex items-center justify-between">
                <span>Session Storage Guarantee</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">100% Client-Side</span>
              </div>
              <p>
                Stored <span className="text-slate-200 font-medium">ONLY in temporary tab session memory (<code className="text-cyan-400 font-mono text-[11px]">sessionStorage</code>)</span>.
              </p>
              <p>
                Permanently erased when this browser tab or window closes. Never saved to persistent disk storage.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
              Gemini API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
              autoFocus
            />
            <div className="text-xs text-slate-500 flex flex-col sm:flex-row sm:justify-between gap-1 pt-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Active tab only &bull; Zero persistent storage
              </span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Get a Gemini key &rarr;
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-2">
            {initialValue && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="px-3.5 py-2.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/20 cursor-pointer"
                title="Clear API Key from session memory"
              >
                Clear Key
              </button>
            )}
            
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-slate-800 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isValid}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-lg cursor-pointer ${
                isValid 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20' 
                  : 'bg-slate-800 text-slate-500 !cursor-not-allowed'
              }`}
            >
              {hasPendingPrompt ? "Save & Start Exploding" : "Save for Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;
