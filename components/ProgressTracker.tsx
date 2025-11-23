import React from 'react';
import { GenerationStatus } from '../types';

interface ProgressTrackerProps {
  status: GenerationStatus;
}

const STATUS_MAP = {
  [GenerationStatus.IDLE]: 0,
  [GenerationStatus.GENERATING_RANDOM]: 0,
  [GenerationStatus.PLANNING]: 1,
  [GenerationStatus.GENERATING_INFOGRAPHIC]: 2,
  [GenerationStatus.GENERATING_ASSEMBLY]: 3,
  [GenerationStatus.ENRICHING]: 4,
  [GenerationStatus.ANIMATING]: 5,
  [GenerationStatus.COMPLETED]: 6,
  [GenerationStatus.FAILED]: -1,
};

const steps = [
  { id: GenerationStatus.PLANNING, label: "Planning", sub: "Gemini 3 Pro" },
  { id: GenerationStatus.GENERATING_INFOGRAPHIC, label: "Blueprinting", sub: "Gemini 3 Pro Image" },
  { id: GenerationStatus.GENERATING_ASSEMBLY, label: "Manufacturing", sub: "Gemini 3 Pro Image" },
  { id: GenerationStatus.ENRICHING, label: "Authoring", sub: "Gemini 2.5 & Search" },
  { id: GenerationStatus.ANIMATING, label: "Animating & Narrating", sub: "Veo 3.1 & Gemini TTS" },
];

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ status }) => {
  if (status === GenerationStatus.IDLE) return null;

  const currentStepIndex = STATUS_MAP[status];
  const isFailed = status === GenerationStatus.FAILED;
  const isDreaming = status === GenerationStatus.GENERATING_RANDOM;
  const isComplete = status === GenerationStatus.COMPLETED;

  // Active step info
  const activeStep = steps[Math.max(0, currentStepIndex - 1)];

  return (
    <div className="w-full max-w-5xl mx-auto mb-10">
      
      {/* 1. Status Text Area (Overlap-Free) */}
      <div className="text-center mb-6 min-h-[50px] flex flex-col items-center justify-center animate-fade-in">
        {isDreaming ? (
             <div className="flex flex-col items-center">
                <span className="text-purple-400 font-bold text-xl tracking-tight mb-1 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    IDEATION
                </span>
                <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">GEMINI 2.5 FLASH</span>
             </div>
        ) : isFailed ? (
            <span className="text-red-400 font-bold text-xl">Generation Interrupted</span>
        ) : isComplete ? (
            <div className="flex flex-col items-center">
                <span className="text-emerald-400 font-bold text-xl tracking-tight mb-1">COMPLETE</span>
                <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">ENCYCLOPEDIA ENTRY GENERATED</span>
             </div>
        ) : (
             <div className="flex flex-col items-center">
                <span className="text-cyan-400 font-bold text-xl tracking-tight mb-1 animate-pulse">
                    {activeStep?.label || "Processing..."}
                </span>
                <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">
                    {activeStep?.sub || "Please wait"}
                </span>
             </div>
        )}
      </div>

      {/* 2. Sleek Segmented Bar */}
      <div className="flex gap-2 w-full h-1.5">
        {steps.map((step, index) => {
            const stepIndex = index + 1;
            
            // Determine segment state
            let bgClass = "bg-slate-800"; // Pending
            if (currentStepIndex > stepIndex || isComplete) {
                bgClass = "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"; // Completed
            } else if (currentStepIndex === stepIndex && !isFailed && !isDreaming) {
                bgClass = "bg-cyan-500/50 animate-pulse"; // Active
            } else if (isFailed && currentStepIndex === stepIndex) {
                bgClass = "bg-red-500"; // Failed
            }

            return (
                <div 
                    key={step.id} 
                    className={`flex-1 rounded-full transition-all duration-500 ${bgClass}`}
                />
            );
        })}
      </div>

      {/* 3. Steps Meta Info (Optional: "Step X of Y") */}
      {!isComplete && !isFailed && !isDreaming && (
           <div className="text-center mt-3 text-[10px] text-slate-600 font-mono tracking-widest uppercase">
               Step {currentStepIndex} of {steps.length}
           </div>
      )}
    </div>
  );
};

export default ProgressTracker;