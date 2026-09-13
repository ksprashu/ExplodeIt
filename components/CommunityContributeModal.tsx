import React, { useState, useEffect } from 'react';
import { GenerationItem } from '../types';

export interface CommunityContributeModalProps {
  isOpen: boolean;
  item: GenerationItem | null;
  onClose: () => void;
  onContribute?: (item: GenerationItem) => Promise<{ success: boolean; topicId?: string; error?: string }>;
}

export const CommunityContributeModal: React.FC<CommunityContributeModalProps> = ({
  isOpen,
  item,
  onClose,
  onContribute,
}) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState<boolean>(false);

  // Sync state when modal opens with a new item
  useEffect(() => {
    if (isOpen) {
      setUploadStatus('idle');
      setErrorMessage(null);
      setTopicId(null);
      try {
        if (typeof localStorage !== 'undefined') {
          setDontAskAgain(localStorage.getItem('explodeit_contribute_optout') === 'true');
        }
      } catch (e) {
        console.warn('Unable to access localStorage for opt-out:', e);
      }
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item || !item.plan) return null;

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setDontAskAgain(checked);
    try {
      if (typeof localStorage !== 'undefined') {
        if (checked) {
          localStorage.setItem('explodeit_contribute_optout', 'true');
        } else {
          localStorage.removeItem('explodeit_contribute_optout');
        }
      }
    } catch (err) {
      console.warn('Failed to update localStorage opt-out:', err);
    }
  };

  const handleDismiss = () => {
    if (uploadStatus === 'uploading') return;
    if (dontAskAgain) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('explodeit_contribute_optout', 'true');
        }
      } catch (err) {
        console.warn('Failed to persist opt-out on dismiss:', err);
      }
    }
    onClose();
  };

  const handleUpload = async () => {
    if (!onContribute || uploadStatus === 'uploading') return;

    setUploadStatus('uploading');
    setErrorMessage(null);

    if (dontAskAgain) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('explodeit_contribute_optout', 'true');
        }
      } catch (err) {
        console.warn('Failed to persist opt-out on upload:', err);
      }
    }

    try {
      const result = await onContribute(item);
      if (result.success) {
        setUploadStatus('success');
        setTopicId(result.topicId || null);
        // Auto-close after 3.5 seconds
        setTimeout(() => {
          onClose();
        }, 3500);
      } else {
        setUploadStatus('error');
        setErrorMessage(result.error || 'Failed to contribute. Please try again.');
      }
    } catch (err: any) {
      setUploadStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred during contribution.');
    }
  };

  const plan = item.plan;
  const componentCount = item.components?.length || plan.componentList?.length || 0;
  const hasVideo = item.hasVideo && !!item.videoUrl;
  const hasAudio = !!item.audioUrl;

  const tierLabel = item.tier === 'budget'
    ? 'Budget Saver'
    : item.tier === 'custom'
    ? 'Custom'
    : 'Pro Studio';

  const tierColor = item.tier === 'budget'
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : item.tier === 'custom'
    ? 'text-purple-400 bg-purple-500/10 border-purple-500/30'
    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

  return (
    <div
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 w-[calc(100%-2rem)] sm:w-[500px] max-w-lg shadow-2xl animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contribute-dialog-title"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 text-slate-200 overflow-hidden ring-1 ring-white/10">

        {/* Top Glowing Gradient Accent Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600" />

        <div className="p-5 space-y-4">

          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 id="contribute-dialog-title" className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Contribute to Public Encyclopedia
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Share this deconstruction with the global community
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              disabled={uploadStatus === 'uploading'}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Three Mandatory Reassurance Badges */}
          <div className="space-y-2">
            {/* Badge 1: 100% Free & Community Hosted */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-emerald-300 block">100% Free & Community Hosted</span>
                <span className="text-slate-400">Permanently hosted on Cloudflare Pages + R2 object storage with zero egress fees.</span>
              </div>
            </div>

            {/* Badge 2: Zero API Key Transmission */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-cyan-300 block">Zero API Key Transmission: Your personal Gemini key is NEVER uploaded or shared</span>
                <span className="text-slate-400">Strict allowlist serialization scrubs all credentials, session storage, and private tokens before transmission.</span>
              </div>
            </div>

            {/* Badge 3: Open Educational Knowledge */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-start gap-2.5">
              <div className="p-1 rounded-lg bg-purple-500/10 text-purple-400 mt-0.5 shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-purple-300 block">Open Educational Knowledge: Shared anonymously to the public showcase</span>
                <span className="text-slate-400">Shared anonymously to the public showcase so learners worldwide can explore without an API key.</span>
              </div>
            </div>
          </div>

          {/* Preview Summary Card */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-200 truncate">{plan.displayTitle}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${tierColor} shrink-0`}>
                {tierLabel}
              </span>
            </div>

            {/* Micro Thumbnail Strip */}
            <div className="flex items-center gap-3">
              {item.infographicUrl && (
                <div className="relative w-20 h-12 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
                  <img src={item.infographicUrl} alt="Blueprint thumbnail" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center text-cyan-300 font-mono">Blueprint</span>
                </div>
              )}
              {item.assembledUrl && (
                <div className="relative w-20 h-12 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 shrink-0">
                  <img src={item.assembledUrl} alt="Assembled thumbnail" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center text-purple-300 font-mono">Assembled</span>
                </div>
              )}

              {/* Metadata Indicators */}
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-400 flex-1">
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-medium">
                  🔬 {componentCount} Parts
                </span>
                {hasVideo && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-medium text-cyan-300">
                    🎥 Video
                  </span>
                )}
                {hasAudio && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-medium text-purple-300">
                    🎙️ Audio
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status Feedback Banners */}
          {uploadStatus === 'success' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-200 animate-fade-in">
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <span className="font-bold block">🎉 Contributed to Community Encyclopedia!</span>
                <span>Your creation is now live in the showcase for students worldwide.{topicId ? ` ID: ${topicId}` : ''}</span>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-200 animate-fade-in">
              <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="font-bold block">Contribution Failed</span>
                <span>{errorMessage || 'Unable to complete upload to Cloudflare R2.'}</span>
              </div>
            </div>
          )}

          {uploadStatus === 'uploading' && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-medium">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Packaging & Uploading to Cloudflare R2...
                </span>
                <span className="font-mono text-[10px] text-slate-400">R2 Bucket</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 animate-pulse w-3/4 rounded-full" />
              </div>
            </div>
          )}

          {/* Controls & Action Buttons */}
          <div className="space-y-3 pt-1">
            {/* Opt-Out Checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={dontAskAgain}
                onChange={handleCheckboxChange}
                disabled={uploadStatus === 'uploading'}
                className="accent-cyan-500 h-4 w-4 rounded bg-slate-950 border-slate-700 cursor-pointer disabled:opacity-40"
              />
              <span>Don't ask me again for future generations</span>
            </label>

            {/* Action Row */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleDismiss}
                disabled={uploadStatus === 'uploading'}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 transition-all duration-200 disabled:opacity-40"
              >
                {uploadStatus === 'success' ? 'Close' : 'Skip / Maybe Later'}
              </button>

              {uploadStatus !== 'success' && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploadStatus === 'uploading'}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400/50 flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {uploadStatus === 'uploading' ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Contributing...</span>
                    </>
                  ) : uploadStatus === 'error' ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Retry Contribution</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-cyan-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Contribute to Encyclopedia</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CommunityContributeModal;
