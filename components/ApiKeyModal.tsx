import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
  onCancel: () => void;
  onClear?: () => void;
  initialValue?: string;
  error?: string | null;
  isSplash?: boolean; // If true, it blocks the screen (initial setup)
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave, onCancel, onClear, initialValue = '', error, isSplash = false }) => {
  const [key, setKey] = useState(initialValue);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    setKey(initialValue);
  }, [initialValue, isOpen]);

  useEffect(() => {
      // Basic validation: Non-empty and likely starts with AIza (Gemini keys)
      // We won't enforce AIza strictly to allow for potential proxy URLs or future format changes, 
      // but we definitely need it to be non-empty.
      setIsValid(key.trim().length > 10);
  }, [key]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onSave(key.trim());
    }
  };

  // For splash screen mode, we cover everything. For modal mode, we just overlay.
  const containerClasses = isSplash 
    ? "fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
    : "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4";

  return (
    <div className={containerClasses}>
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🔑</span>
            {isSplash ? "Setup ExplodeIt" : "Configure API Key"}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {isSplash 
              ? "To start generating exploded views, you need a Google Gemini API Key." 
              : "Update your API key to continue generating content."}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-red-200">
                    <span className="font-bold block mb-1">Connection Failed</span>
                    {error}
                </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gemini API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
              autoFocus
            />
            <p className="text-xs text-slate-500 flex justify-between">
              <span>Your key is stored locally in your browser.</span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Get a key here &rarr;
              </a>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {!isSplash && (
              <>
                <button
                  type="button"
                  onClick={onClear}
                  className="px-4 py-3 rounded-lg font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/20"
                  title="Clear API Key"
                >
                  Clear Key
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-3 rounded-lg font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              type="submit"
              disabled={!isValid}
              className={`flex-1 px-4 py-3 rounded-lg font-bold text-white transition-all shadow-lg ${
                isValid 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSplash ? "Start Exploring" : "Save Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApiKeyModal;
