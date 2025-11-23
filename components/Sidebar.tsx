import React, { useMemo } from 'react';
import { GenerationItem } from '../types';

interface SidebarProps {
  history: GenerationItem[];
  currentId: string | null;
  onSelect: (item: GenerationItem) => void;
  onChangeKey: () => void;
  hasKey: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ history, currentId, onSelect, onChangeKey, hasKey }) => {
  
  const totalStats = useMemo(() => {
    return history.reduce((acc, item) => {
      item.usage.forEach(u => {
        acc.totalCost += u.costEstimate;
        acc.totalInput += u.inputTokens;
        acc.totalOutput += u.outputTokens;
      });
      return acc;
    }, { totalCost: 0, totalInput: 0, totalOutput: 0 });
  }, [history]);

  return (
    <aside className="w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 overflow-hidden shrink-0 shadow-2xl z-20">
      <div className="p-8 border-b border-slate-800 flex flex-col items-start gap-4 bg-slate-950/50">
        <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
                <path d="M12 3v3" className="opacity-50" />
                <path d="M8 5l2 2" className="opacity-50" />
                <path d="M16 5l-2 2" className="opacity-50" />
            </svg>
        </div>
        <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight">
            ExplodeIt
            </h1>
            <p className="text-sm text-slate-400 font-medium mt-1">Learn anything, with Gemini 3</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Recent Explorations</h2>
          {history.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800 border-dashed text-center">
                <p className="text-slate-600 text-sm">No items yet.</p>
                <p className="text-slate-700 text-xs mt-1">Start by typing above!</p>
            </div>
          ) : (
            history.slice().reverse().map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 border group ${
                  currentId === item.id 
                  ? 'bg-slate-800 border-cyan-500/50 text-cyan-50 shadow-md' 
                  : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="font-bold truncate text-sm mb-1">{item.prompt}</div>
                <div className="text-[10px] uppercase tracking-wide opacity-60 flex justify-between items-center">
                  <span>{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  <span className={`px-1.5 py-0.5 rounded ${item.hasVideo ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {item.hasVideo ? 'Video' : 'Image'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="p-6 bg-slate-950 border-t border-slate-800 text-xs space-y-4">
        <h3 className="font-bold text-slate-300 uppercase tracking-widest">Session Intelligence</h3>
        <div className="space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-slate-400">
            <span>Est. Cost</span>
            <span className="text-emerald-400 font-mono font-bold">${totalStats.totalCost.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
            <span>Input Tokens</span>
            <span className="font-mono">{totalStats.totalInput.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-400">
            <span>Output Tokens</span>
            <span className="font-mono">{totalStats.totalOutput.toLocaleString()}</span>
            </div>
        </div>
        
        <button 
          onClick={onChangeKey}
          className={`w-full py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 font-medium border ${
            hasKey 
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white' 
              : 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
          }`}
        >
          {hasKey ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Update API Key
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Key Not Configured
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;