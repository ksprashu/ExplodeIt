import React from 'react';
import { ModelTier } from '../types';

export interface HeaderProps {
  apiKey: string | null;
  modelTier: ModelTier;
  onSelectTier: (tier: 'pro' | 'budget') => void;
  onOpenModelSettings: () => void;
  onOpenApiKeyModal: () => void;
  onNavigateHome?: () => void;
  isViewingTopic?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  apiKey,
  modelTier,
  onSelectTier,
  onOpenModelSettings,
  onOpenApiKeyModal,
  onNavigateHome,
  isViewingTopic = false,
}) => {
  const hasKey = Boolean(apiKey && apiKey.trim().length > 0);

  return (
    <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
      {/* Left: Branding, Navigation Breadcrumb & Hosted Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Home / Back to Showcase Action */}
        {isViewingTopic && onNavigateHome ? (
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-all shadow-sm group cursor-pointer"
            title="Return to Community Showcase carousel"
          >
            <svg className="w-3.5 h-3.5 text-cyan-400 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>← Back to Showcase</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
            <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-cyan-500/20">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent hidden sm:inline">
              ExplodeIt
            </span>
          </div>
        )}

        {/* GitHub Pages Badge */}
        <a
          href="https://ksprashu.github.io/ExplodeIt/"
          target="_blank"
          rel="noopener noreferrer"
          title="Static Single Page Application hosted on GitHub Pages"
          className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-all"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-400 text-[11px]">GitHub Pages</span>
        </a>

        {/* 100% Client-Side Security Badge */}
        <div
          title="Direct client-side execution. Zero server storage of user credentials."
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-medium"
        >
          <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="text-[11px]">100% Client-Side</span>
        </div>

        {/* Model Engine Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300">
          <span className={`w-2 h-2 rounded-full ${
            modelTier === 'budget' 
              ? 'bg-emerald-400' 
              : modelTier === 'custom' 
              ? 'bg-purple-400' 
              : 'bg-cyan-400'
          } animate-pulse`} />
          <span className="hidden xl:inline text-slate-400">Engine:</span>
          <span className="text-cyan-300 font-bold uppercase tracking-wider text-[11px]">
            {modelTier === 'custom' ? 'Custom' : modelTier === 'pro' ? 'Pro Studio' : 'Budget Saver'}
          </span>
        </div>
      </div>

      {/* Right: Key Status Indicator, Tier Switcher & Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* API Key Status Pill / Action Trigger */}
        <button
          type="button"
          onClick={onOpenApiKeyModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border shadow-sm group cursor-pointer ${
            hasKey
              ? 'bg-cyan-950/60 hover:bg-cyan-900/80 border-cyan-500/40 hover:border-cyan-500/70 text-cyan-200'
              : 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/40 hover:border-emerald-500/70 text-emerald-300'
          }`}
          title={
            hasKey
              ? 'API Key active in session memory (sessionStorage). Click to view or update.'
              : 'Browse Free Mode: Explore community encyclopedia without an API key. Click to configure API key for custom creations.'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              hasKey
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                : 'bg-emerald-400 animate-pulse group-hover:scale-125 transition-transform'
            }`}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider">
            {hasKey ? 'Key Configured' : 'Browse Free • Keyless Mode'}
          </span>
          <svg
            className={`w-3.5 h-3.5 ml-0.5 transition-colors ${
              hasKey ? 'text-cyan-400 group-hover:text-white' : 'text-emerald-400 group-hover:text-emerald-200'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {hasKey ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            )}
          </svg>
        </button>

        {/* Segmented Pill [ Pro Studio | Budget Saver ] */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-full shadow-inner">
          {/* Pro Studio Segment */}
          <button
            type="button"
            onClick={() => onSelectTier('pro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              modelTier === 'pro'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="Pro Studio: Premier quality models (Gemini 3 Pro, 2K Images, Veo 3.1)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span className="hidden sm:inline whitespace-nowrap">Pro Studio</span>
            <span className="sm:hidden whitespace-nowrap">Pro</span>
          </button>

          {/* Budget Saver Segment */}
          <button
            type="button"
            onClick={() => onSelectTier('budget')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              modelTier === 'budget'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
            title="Budget Saver: Fast, credit-conserving models (Gemini 2.5 Flash, Imagen 3 Fast, optional video)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline whitespace-nowrap">Budget Saver</span>
            <span className="sm:hidden whitespace-nowrap">Budget</span>
          </button>

          {/* Custom Overrides Pill */}
          {modelTier === 'custom' && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
              Custom
            </span>
          )}
        </div>

        {/* Settings Gear Button */}
        <button
          type="button"
          onClick={onOpenModelSettings}
          className="p-2 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-400 transition-all duration-200 hover:rotate-45 cursor-pointer"
          title="Configure Model Settings & Advanced Overrides"
          aria-label="Open Model Settings"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* GitHub Repository Link */}
        <a
          href="https://github.com/ksprashu/ExplodeIt"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          title="View source code on GitHub"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    </header>
  );
};

export default Header;
