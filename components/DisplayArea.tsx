import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { GenerationItem, ComponentPart, GenerationStatus } from '../types';
import { MODEL_REGISTRY } from '../constants';
import { getCanonicalExplorationUrl, copyToClipboard } from '../services/urlState';

export interface DisplayAreaProps {
  item: GenerationItem | null;
  status: GenerationStatus;
  onBackToShowcase?: () => void;
  onShare?: (url: string) => void;
}

const getModelLabel = (modelId: string | undefined, defaultLabel: string): string => {
  if (!modelId) return defaultLabel;
  return MODEL_REGISTRY[modelId]?.displayName || modelId.toUpperCase();
};

const formatAudioTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const DisplayArea: React.FC<DisplayAreaProps> = ({ item, status, onBackToShowcase, onShare }) => {
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalVideo, setModalVideo] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentPart | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [hoveredPartIndex, setHoveredPartIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const prevItemIdRef = useRef<string | null>(null);
  const isSeekingRef = useRef(false);

  const getPartAnchor = (index: number, total: number) => {
    const isLeft = index < Math.ceil(total / 2);
    const sideIndex = isLeft ? index : index - Math.ceil(total / 2);
    const sideCount = isLeft ? Math.ceil(total / 2) : total - Math.ceil(total / 2);
    const yPercent = 20 + (sideIndex / Math.max(1, sideCount - 1)) * 60;
    const xPercent = isLeft ? 15 : 85;
    const targetX = isLeft ? 35 : 65;
    const targetY = yPercent;
    return { x: xPercent, y: yPercent, targetX, targetY, isLeft };
  };

  useEffect(() => {
    // Reset audio state when item changes
    if (prevItemIdRef.current !== null && prevItemIdRef.current !== item?.id) {
      const audio = audioInstanceRef.current || audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        if (item?.audioUrl) {
          audio.src = item.audioUrl;
          audio.load();
        }
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      isSeekingRef.current = false;
      setSelectedComponent(null);
      setModalImage(null);
      setModalVideo(null);
    }
    prevItemIdRef.current = item?.id ?? null;
  }, [item?.id, item?.audioUrl]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
      const el = audioInstanceRef.current;
      if (el) {
        el.pause();
        el.removeAttribute('src');
        el.load();
        audioInstanceRef.current = null;
      }
    };
  }, []);

  const toggleAudio = () => {
      const audio = audioInstanceRef.current || audioRef.current;
      if (!audio) return;
      if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
      } else {
          if (!audio.getAttribute('src') && item?.audioUrl) {
              audio.src = item.audioUrl;
              audio.load();
          }
          if (audio.currentTime >= audio.duration && isFinite(audio.duration) && audio.duration > 0) {
              audio.currentTime = 0;
              setCurrentTime(0);
          }
          setIsPlaying(true);
          audio.play().catch(() => {
              setIsPlaying(false);
          });
      }
  };

  const resetAudio = () => {
      const audio = audioInstanceRef.current || audioRef.current;
      if (!audio) return;
      if (!audio.getAttribute('src') && item?.audioUrl) {
          audio.src = item.audioUrl;
          audio.load();
      }
      audio.currentTime = 0;
      setCurrentTime(0);
      isSeekingRef.current = false;
      setIsPlaying(true);
      audio.play().catch(() => {
          setIsPlaying(false);
      });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>) => {
      if (duration <= 0) return;
      const target = e.target as HTMLInputElement;
      const parsedTime = parseFloat(target.value);
      const newTime = isNaN(parsedTime) ? 0 : Math.max(0, duration > 0 ? Math.min(parsedTime, duration) : Math.max(0, parsedTime));
      setCurrentTime(newTime);
      const audio = audioInstanceRef.current || audioRef.current;
      if (audio) {
          if (!audio.getAttribute('src') && item?.audioUrl) {
              audio.src = item.audioUrl;
              audio.load();
          }
          try {
              audio.currentTime = newTime;
          } catch {
              // Ignore if audio readyState is HAVE_NOTHING or decode pending
          }
      }
  };

  if (!item || !item.plan) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4 min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        </div>
        <p className="font-light tracking-wide">Ready to deconstruct reality.</p>
      </div>
    );
  }

  const { plan, infographicUrl, assembledUrl, videoUrl, hasVideo, components, audioUrl } = item;

  const downloadAsset = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // LAYOUT LOGIC
  
  // Left Slot: Video (if ready) OR Assembled Image (if ready) OR Loading Assembly OR Waiting
  const renderLeftMedia = () => {
      // 1. Show Video if completed
      if (hasVideo && videoUrl) {
           return (
             <div className="relative group w-full h-full">
                 <video 
                    key={videoUrl || item?.id}
                    src={videoUrl} 
                    controls 
                    autoPlay={false}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-cyan-400 border border-cyan-500/30 z-10 pointer-events-none">
                    {getModelLabel(item?.config?.video, 'VEO 3.1').toUpperCase()}
                </div>
                 <button 
                    onClick={() => setModalVideo(videoUrl)}
                    className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Expand Video"
                >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5-5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                </button>
             </div>
          );
      }

      // 2. Show Assembled Image if ready (and Video not yet taking this slot)
      // Note: If video IS requested, the Assembled Image stays here UNTIL video is done.
      if (assembledUrl) {
          return (
             <div className="relative group w-full h-full">
                <img 
                    src={assembledUrl} 
                    alt="Assembled View" 
                    className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-700"
                    onClick={() => setModalImage(assembledUrl)}
                />
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-cyan-400 border border-cyan-500/30 z-10 pointer-events-none">
                    {getModelLabel(item?.config?.assembled, 'GEMINI 3 PRO IMAGE').toUpperCase()}
                </div>
             </div>
          );
      }
      
      // 3. Loading State for Assembly
      if (status === GenerationStatus.GENERATING_ASSEMBLY) {
           return (
              <div className="flex flex-col items-center gap-3 text-slate-600">
                 <div className="w-12 h-12 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin"></div>
                 <span className="font-mono text-xs text-cyan-500 uppercase tracking-widest">Manufacturing Object...</span>
              </div>
           );
      }
      
      // 4. Waiting / Empty State (while Infographic is generating on the right)
      return (
         <div className="flex flex-col items-center gap-3 text-slate-700 opacity-50">
             <div className="w-10 h-10 border-4 border-slate-800 border-dashed rounded-full"></div>
             <span className="font-mono text-xs">Waiting for Assembly...</span>
         </div>
      );
  };

  // Right Slot: ALWAYS Infographic (or loading it)
  const renderRightMedia = () => {
      // 1. Show Infographic
      if (infographicUrl) {
           const activeParts = (components && components.length > 0)
             ? components
             : (plan.componentList || []).map(name => ({
                 name,
                 shortDescription: 'Inspecting component details...',
                 composition: 'Physical Component',
                 detailedContent: ''
               }));

           return (
             <div className="relative group w-full h-full overflow-hidden">
                <img 
                    src={infographicUrl} 
                    alt="Infographic View" 
                    className="w-full h-full object-contain bg-slate-950 cursor-zoom-in hover:scale-105 transition-transform duration-700"
                    onClick={() => setModalImage(infographicUrl)}
                />
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-purple-400 border border-purple-500/30 z-10 pointer-events-none">
                     {getModelLabel(item?.config?.infographic, 'GEMINI 3 PRO IMAGE').toUpperCase()}
                </div>

                {/* HUD Toggle Control */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOverlays(prev => !prev);
                  }}
                  className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 backdrop-blur px-2.5 py-1 rounded-full text-[10px] font-mono border border-slate-700 text-slate-300 hover:text-cyan-300 transition-colors z-20 cursor-pointer"
                >
                  {showOverlays ? 'HUD: ON' : 'HUD: OFF'}
                </button>

                {/* Interactive SVG & HTML Layer */}
                {showOverlays && activeParts.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {/* SVG Leader Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      {activeParts.map((_, idx) => {
                        const anchor = getPartAnchor(idx, activeParts.length);
                        const isHovered = hoveredPartIndex === idx;
                        return (
                          <line
                            key={`line-${idx}`}
                            x1={`${anchor.x}%`}
                            y1={`${anchor.y}%`}
                            x2={`${anchor.targetX}%`}
                            y2={`${anchor.targetY}%`}
                            stroke={isHovered ? '#22d3ee' : 'rgba(148, 163, 184, 0.35)'}
                            strokeWidth={isHovered ? 2 : 1}
                            strokeDasharray={isHovered ? 'none' : '4 4'}
                            className="transition-all duration-200"
                          />
                        );
                      })}
                    </svg>

                    {/* HTML Hotspot Badges */}
                    {activeParts.map((part, idx) => {
                      const anchor = getPartAnchor(idx, activeParts.length);
                      const isHovered = hoveredPartIndex === idx;
                      return (
                        <div
                          key={`badge-${idx}`}
                          style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group/badge"
                          onMouseEnter={() => setHoveredPartIndex(idx)}
                          onMouseLeave={() => setHoveredPartIndex(null)}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComponent(part);
                            }}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-md ${
                              isHovered
                                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 scale-110 shadow-cyan-500/30 ring-2 ring-cyan-400/50'
                                : 'bg-black/75 border-slate-700 text-slate-300 hover:border-cyan-500/60'
                            }`}
                            title={`Click to inspect ${part.name}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                            <span>{String(idx + 1).padStart(2, '0')}</span>
                          </button>

                          {/* Hover Tooltip Card */}
                          {isHovered && (
                            <div className={`absolute z-30 w-52 p-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md text-left text-xs top-full mt-2 pointer-events-none ${
                              anchor.isLeft ? 'left-0' : 'right-0'
                            }`}>
                              <div className="font-bold text-white truncate">{part.name}</div>
                              {part.composition && (
                                <div className="text-[10px] text-cyan-300 font-mono mt-0.5">{part.composition}</div>
                              )}
                              {part.shortDescription && (
                                <div className="text-[11px] text-slate-300 mt-1 line-clamp-2">{part.shortDescription}</div>
                              )}
                              <div className="text-[9px] text-cyan-400 mt-2 font-semibold">Click for Deep Dive →</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
             </div>
           );
      }
      
      // 2. Loading Infographic
      if (status === GenerationStatus.GENERATING_INFOGRAPHIC || status === GenerationStatus.PLANNING || status === GenerationStatus.GENERATING_RANDOM) {
          return (
            <div className="flex flex-col items-center gap-4 text-slate-600 animate-pulse">
                 <div className="w-16 h-16 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin"></div>
                 <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-sm text-purple-400 font-bold">DRAFTING BLUEPRINT...</span>
                    <span className="text-xs text-slate-500">{getModelLabel(item?.config?.infographic, 'Gemini 3 Pro Image')}</span>
                 </div>
            </div>
          );
      }

      return null;
  };

  // Header Image Slot Logic
  const renderHeaderImage = () => {
      // 1. If Video is completed, we move the Assembled Image here.
      if (hasVideo && (status === GenerationStatus.COMPLETED || status === GenerationStatus.IDLE) && assembledUrl) {
          return (
            <div className="w-full lg:w-80 shrink-0 h-48 lg:h-auto rounded-2xl overflow-hidden border border-slate-700 relative group animate-fade-in">
                <img 
                    src={assembledUrl} 
                    alt="Assembled Object" 
                    className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-500"
                    onClick={() => setModalImage(assembledUrl)}
                />
                 <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                    ASSEMBLED
                </div>
            </div>
          );
      }

      // 2. If Video is currently generating, show the placeholder in this slot.
      if (hasVideo && status === GenerationStatus.ANIMATING && assembledUrl) {
           return (
             <div className="w-full lg:w-80 shrink-0 h-48 lg:h-auto rounded-2xl bg-slate-900/50 border border-slate-700 border-dashed flex flex-col items-center justify-center gap-3 relative overflow-hidden">
                  <div className="w-full h-full absolute top-0 left-0 bg-gradient-to-r from-transparent via-slate-800/20 to-transparent animate-pulse"></div>
                  <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin z-10"></div>
                  <span className="font-mono text-[10px] font-bold tracking-widest text-cyan-400 z-10 animate-pulse">RENDERING ANIMATION...</span>
             </div>
           );
      }

      // 3. Otherwise (No video requested, or earlier stages), this slot is empty.
      return null;
  };

  const handleShareClick = async () => {
    if (!item?.id) return;
    const url = getCanonicalExplorationUrl(item.id);
    const copied = await copyToClipboard(url);
    if (copied) {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      setCopyFeedback(true);
      copyTimeoutRef.current = setTimeout(() => {
        setCopyFeedback(false);
        copyTimeoutRef.current = null;
      }, 2500);
      if (onShare) {
        onShare(url);
      }
    } else {
      if (onShare) {
        onShare('Could not copy link to clipboard. Please copy from address bar.');
      }
    }
  };

  return (
    <div className="space-y-12 animate-fade-in pb-10">
      {/* Breadcrumb Navigation (rendered when onBackToShowcase is provided) */}
      {onBackToShowcase && (
        <nav aria-label="Breadcrumb" className="flex items-center justify-between gap-4 pb-2 border-b border-slate-800/50 text-xs font-mono">
          <button
            type="button"
            onClick={onBackToShowcase}
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-300 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 group cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-cyan-500 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>← Back to Community Showcase</span>
          </button>
          
          <div className="flex items-center gap-2 text-slate-500 truncate">
            <span className="hidden sm:inline">Encyclopedia</span>
            <span className="hidden sm:inline">/</span>
            <span className="text-slate-400 uppercase tracking-wider">{plan.category}</span>
            <span>/</span>
            <span className="text-cyan-400 font-bold truncate max-w-[180px] sm:max-w-[300px]">{plan.displayTitle}</span>
          </div>
        </nav>
      )}
      
      {/* 1. Header Area */}
      <div className="space-y-6 border-b border-slate-800 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <div className="text-cyan-500 font-mono text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="bg-cyan-500/10 px-2 py-1 rounded">{plan.category}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-white tracking-tight break-words">{plan.displayTitle}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {audioUrl ? (
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-full p-2 sm:p-1.5 sm:pr-4 flex items-center gap-2.5 sm:gap-3 shadow-lg shadow-purple-900/20 max-w-full w-full sm:w-auto">
                        <button 
                            onClick={toggleAudio}
                            className="w-10 h-10 shrink-0 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                            title={isPlaying ? "Pause" : "Play"}
                            aria-label={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                            ) : (
                                <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                        </button>
                        
                        <button 
                            onClick={resetAudio}
                            className="w-8 h-8 shrink-0 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                            title="Restart Audio"
                            aria-label="Restart Audio"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>

                        <div className="flex flex-col justify-center flex-1 min-w-[120px] sm:min-w-[170px] md:min-w-[200px]">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Audio Guide</span>
                                    <span className="text-[10px] text-purple-300 font-medium hidden md:inline truncate">• {plan.audioVibe?.voiceName || 'Gemini'}</span>
                                </div>
                                <span className="text-[10px] font-mono text-purple-300 whitespace-nowrap tabular-nums">
                                    {formatAudioTime(duration > 0 ? Math.min(currentTime, duration) : currentTime)} / {formatAudioTime(duration)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <input 
                                    type="range"
                                    min={0}
                                    max={duration > 0 ? duration : 100}
                                    step={0.1}
                                    disabled={duration <= 0}
                                    value={Math.min(currentTime, duration > 0 ? duration : 100)}
                                    onChange={handleSeek}
                                    onInput={handleSeek}
                                    onPointerDown={() => { isSeekingRef.current = true; }}
                                    onPointerUp={() => { isSeekingRef.current = false; }}
                                    onPointerCancel={() => { isSeekingRef.current = false; }}
                                    onTouchStart={() => { isSeekingRef.current = true; }}
                                    onTouchEnd={() => { isSeekingRef.current = false; }}
                                    onTouchCancel={() => { isSeekingRef.current = false; }}
                                    onMouseDown={() => { isSeekingRef.current = true; }}
                                    onMouseUp={() => { isSeekingRef.current = false; }}
                                    onKeyDown={() => { isSeekingRef.current = true; }}
                                    onKeyUp={() => { isSeekingRef.current = false; }}
                                    onBlur={() => { isSeekingRef.current = false; }}
                                    aria-label="Audio scrubber"
                                    aria-valuemin={0}
                                    aria-valuemax={duration > 0 ? duration : 100}
                                    aria-valuenow={Math.round((duration > 0 ? Math.min(currentTime, duration) : currentTime) * 10) / 10}
                                    aria-valuetext={`${formatAudioTime(duration > 0 ? Math.min(currentTime, duration) : currentTime)} of ${formatAudioTime(duration)}`}
                                    className={`w-full h-1.5 bg-slate-700 rounded-lg appearance-none accent-purple-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 ${
                                        duration <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                    }`}
                                />
                            </div>
                        </div>

                        <audio 
                            ref={(el) => {
                                audioRef.current = el;
                                if (el) {
                                    audioInstanceRef.current = el;
                                    if (isFinite(el.duration) && el.duration > 0) {
                                        setDuration(el.duration);
                                    }
                                }
                            }} 
                            src={audioUrl} 
                            preload="metadata"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onTimeUpdate={() => {
                                const audio = audioInstanceRef.current || audioRef.current;
                                if (audio) {
                                    if (!isSeekingRef.current) {
                                        setCurrentTime(audio.currentTime);
                                    }
                                    if (isFinite(audio.duration) && audio.duration > 0 && duration !== audio.duration) {
                                        setDuration(audio.duration);
                                    }
                                }
                            }}
                            onLoadedMetadata={() => {
                                const audio = audioInstanceRef.current || audioRef.current;
                                if (audio && isFinite(audio.duration) && audio.duration > 0) {
                                    setDuration(audio.duration);
                                }
                            }}
                            onDurationChange={() => {
                                const audio = audioInstanceRef.current || audioRef.current;
                                if (audio && isFinite(audio.duration) && audio.duration > 0) {
                                    setDuration(audio.duration);
                                }
                            }}
                            onEnded={() => {
                                setIsPlaying(false);
                                setCurrentTime(0);
                                const audio = audioInstanceRef.current || audioRef.current;
                                if (audio) {
                                    audio.currentTime = 0;
                                }
                            }} 
                            className="hidden"
                        />
                    </div>
                ) : (
                    /* Audio Loading State */
                     status !== GenerationStatus.COMPLETED && status !== GenerationStatus.FAILED && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-full p-2 pr-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-purple-500 animate-spin"></div>
                            <span className="text-xs text-purple-400 font-mono animate-pulse uppercase tracking-wider">Synthesizing Voice...</span>
                        </div>
                    )
                )}
                
                <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-sm">Curated by </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 font-bold">
                        {getModelLabel(item?.config?.planning, 'Gemini 3.8 Flash')}
                    </span>
                </div>

                <button
                  type="button"
                  onClick={handleShareClick}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
                    copyFeedback
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-emerald-500/20 ring-1 ring-emerald-400/30'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300'
                  }`}
                  title="Copy shareable link to clipboard"
                  aria-label={copyFeedback ? "Link Copied to clipboard" : "Share or Copy Link"}
                >
                  {copyFeedback ? (
                    <>
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-mono">Copied to clipboard!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
            <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm flex-1">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    <span className="text-2xl">📜</span> 
                    {plan.sectionTitles?.origin || "Origin Story"}
                </h3>
                <p className="text-slate-300 leading-relaxed text-lg font-light tracking-wide">
                    {plan.originStory}
                </p>
            </div>
            
            {/* Header Image Slot (Assembled Image OR Video Placeholder) */}
            {renderHeaderImage()}
        </div>
      </div>

      {/* 2. Visuals Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 h-auto xl:h-[500px]">
        
        {/* Left Slot: Video OR Assembled OR Loading Assembly */}
        <div className="bg-black rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative flex items-center justify-center aspect-video xl:aspect-auto">
             {renderLeftMedia()}
        </div>

        {/* Right Slot: Infographic ALWAYS */}
        <div className="bg-black rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative flex items-center justify-center aspect-video xl:aspect-auto">
             {renderRightMedia()}
        </div>
      </div>

      {/* 3. Components Grid (Anatomy) */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
             <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full block"></span>
                {plan.sectionTitles?.anatomy || "Object Anatomy"}
            </h3>
            <span className="text-xs font-mono text-purple-400 border border-purple-500/30 px-2 py-1 rounded bg-purple-500/10">POWERED BY GEMINI 3.8 FLASH + SEARCH</span>
        </div>
       
        <p className="text-slate-400 text-sm">Click on any component to read the engineering deep dive.</p>
        
        {components.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
                {[1,2,3,4].map(i => (
                    <div key={i} className="h-32 bg-slate-900/30 rounded-xl border border-slate-800/50 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin"></div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {components.map((part, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setSelectedComponent(part)}
                        onMouseEnter={() => setHoveredPartIndex(idx)}
                        onMouseLeave={() => setHoveredPartIndex(null)}
                        className={`group flex flex-col items-start text-left p-5 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full ${
                          hoveredPartIndex === idx
                            ? 'bg-slate-800 border-cyan-400 shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                            : 'bg-slate-900/40 hover:bg-slate-800 border-slate-800 hover:border-cyan-500/50 hover:shadow-cyan-500/10'
                        }`}
                    >
                        <div className="flex items-center justify-between w-full mb-3">
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded-full border border-slate-800 group-hover:border-cyan-500/30 transition-colors">
                                PART {String(idx + 1).padStart(2, '0')}
                            </span>
                            <svg className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        
                        <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors mb-2 line-clamp-2">
                            {part.name}
                        </h4>
                        
                        <div className="mt-auto pt-3 border-t border-slate-800/50 w-full">
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono truncate">
                                {part.composition}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* 4. Detailed Content & Trivia Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 pt-8 border-t border-slate-800">
         {/* Main Article */}
         <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                <span className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full block"></span>
                {plan.sectionTitles?.article || "Encyclopedia Entry"}
            </h3>
            <div className="bg-slate-900/40 p-4 sm:p-8 rounded-2xl border border-slate-800/50">
                {plan.detailedArticle ? (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown 
                      components={{
                        h2: ({node, ...props}) => <h3 className="text-xl md:text-2xl font-bold text-cyan-400 mt-8 mb-4 border-b border-cyan-500/20 pb-2" {...props} />,
                        h3: ({node, ...props}) => <h4 className="text-lg font-bold text-white mt-6 mb-3" {...props} />,
                        li: ({node, ...props}) => <li className="text-slate-300 leading-7 ml-4 mb-2 list-disc" {...props} />,
                        p: ({node, ...props}) => <p className="text-slate-300 leading-7 mb-4 font-light text-lg" {...props} />,
                      }}
                    >
                      {plan.detailedArticle}
                    </ReactMarkdown>
                  </div>
                ) : (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                    </div>
                )}
            </div>
         </div>

         {/* Sidebar / Trivia */}
         <div className="space-y-6">
             <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-colors">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                    <span className="text-2xl">💡</span> 
                    {plan.sectionTitles?.trivia || "Did You Know?"}
                </h3>
                <ul className="space-y-6">
                    {plan.trivia && plan.trivia.length > 0 ? plan.trivia.map((fact, i) => (
                        <li key={i} className="text-slate-300 text-xl leading-8 flex gap-4 font-light">
                            <span className="text-cyan-500 font-bold text-2xl mt-0.5">•</span>
                            {fact}
                        </li>
                    )) : (
                        <p className="text-slate-600 text-sm">Gathering facts...</p>
                    )}
                </ul>
             </div>
             
             {/* Tech Specs Decoration */}
             <div className="bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-900 opacity-60">
                 <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-4">System Analysis</div>
                 <div className="space-y-2 font-mono text-xs text-slate-600">
                     <div className="flex justify-between"><span>PLANNING</span> <span className="text-slate-400">{getModelLabel(item?.config?.planning, 'GEMINI 3.1 PRO').toUpperCase()}</span></div>
                     <div className="flex justify-between"><span>INFOGRAPHIC</span> <span className="text-slate-400">{getModelLabel(item?.config?.infographic, 'GEMINI 3 PRO IMAGE').toUpperCase()}</span></div>
                     <div className="flex justify-between"><span>RENDER</span> <span className="text-slate-400">{item?.hasVideo ? getModelLabel(item?.config?.video, 'VEO 3.1').toUpperCase() : 'DISABLED (IMAGE ONLY)'}</span></div>
                     <div className="flex justify-between"><span>TIER</span> <span className="text-cyan-400 font-bold uppercase">{item?.tier ? (item.tier === 'budget' ? 'BUDGET SAVER' : item.tier === 'custom' ? 'CUSTOM' : 'PRO STUDIO') : 'PRO STUDIO'}</span></div>
                 </div>
             </div>
         </div>
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setModalImage(null)}>
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img 
                    src={modalImage} 
                    alt="Full screen" 
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                />
                <div className="mt-6 flex gap-4" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => downloadAsset(modalImage, `${plan.displayTitle.replace(/\s+/g, '_')}_explodeit.png`)}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download HD
                    </button>
                    <button 
                        onClick={() => setModalImage(null)}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all border border-slate-700"
                    >
                        Close Preview
                    </button>
                </div>
            </div>
        </div>
      )}
      
       {/* Video Modal */}
      {modalVideo && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setModalVideo(null)}>
            <div className="relative w-full max-w-5xl flex flex-col items-center justify-center">
                <video 
                    key={modalVideo}
                    src={modalVideo} 
                    controls
                    autoPlay
                    className="w-full rounded-lg shadow-2xl border border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                />
                <div className="mt-6 flex gap-4" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={() => downloadAsset(modalVideo, `${plan.displayTitle.replace(/\s+/g, '_')}_explodeit.mp4`)}
                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Video
                    </button>
                    <button 
                        onClick={() => setModalVideo(null)}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all border border-slate-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Rich Content Modal */}
      {selectedComponent && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedComponent(null)}>
              <div 
                className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-950/50 flex justify-between items-start">
                      <div>
                        <div className="text-cyan-500 font-mono text-xs uppercase tracking-widest mb-2">Component Deep Dive</div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white">{selectedComponent.name}</h2>
                      </div>
                      <button 
                        onClick={() => setSelectedComponent(null)}
                        className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"
                      >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                      </button>
                  </div>
                  
                  <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                      <div className="mb-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <h4 className="text-slate-500 uppercase text-[10px] font-bold tracking-wider mb-1">Material</h4>
                                <span className="text-cyan-300 font-medium">
                                    {selectedComponent.composition}
                                </span>
                             </div>
                             <div>
                                <h4 className="text-slate-500 uppercase text-[10px] font-bold tracking-wider mb-1">Summary</h4>
                                <p className="text-slate-300 text-sm">
                                    {selectedComponent.shortDescription}
                                </p>
                             </div>
                          </div>
                      </div>
                      
                      <div className="prose prose-invert prose-lg max-w-none">
                          <h4 className="text-white text-lg font-bold mb-4">In-Depth Analysis</h4>
                          {selectedComponent.detailedContent ? (
                            <div className="text-slate-300 leading-8 font-light space-y-4 whitespace-pre-wrap">
                                {selectedComponent.detailedContent}
                            </div>
                          ) : (
                             <div className="flex items-center gap-3 text-slate-500 italic">
                                 <div className="w-4 h-4 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin"></div>
                                 Fetching detailed analysis from Gemini 3.8 Flash...
                             </div>
                          )}
                      </div>

                      {/* Sources Section */}
                      {selectedComponent.sources && selectedComponent.sources.length > 0 && (
                          <div className="mt-8 pt-6 border-t border-slate-800">
                               <h4 className="text-slate-500 uppercase text-[10px] font-bold tracking-wider mb-3">Verified Sources (Google Search)</h4>
                               <div className="flex flex-wrap gap-2">
                                   {selectedComponent.sources.slice(0, 3).map((url, i) => (
                                       <a 
                                            key={i} 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-3 py-1 bg-slate-800 rounded text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-700 transition-colors truncate max-w-full"
                                       >
                                           {new URL(url).hostname}
                                       </a>
                                   ))}
                               </div>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-end">
                      <button 
                          onClick={() => setSelectedComponent(null)}
                          className="px-5 py-2 bg-white text-slate-900 font-bold rounded hover:bg-slate-200 transition-colors"
                      >
                          Done Reading
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DisplayArea;