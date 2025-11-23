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

import React, { useState } from 'react';

interface InputAreaProps {
  onSubmit: (prompt: string, withVideo: boolean) => void;
  onSurprise: (withVideo: boolean) => void;
  disabled: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSubmit, onSurprise, disabled }) => {
  const [input, setInput] = useState('');
  const [withVideo, setWithVideo] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSubmit(input.trim(), withVideo);
      setInput('');
    }
  };

  const handleSurpriseClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!disabled) {
          setInput('');
          onSurprise(withVideo);
      }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl opacity-30 group-hover:opacity-75 transition duration-500 blur"></div>
        <div className="relative bg-slate-900 rounded-xl p-2 flex flex-col md:flex-row items-center gap-2 border border-slate-700">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Name an object (e.g., 'Vintage Camera', 'Human Heart')"
            className="flex-1 bg-transparent text-lg text-white placeholder-slate-500 px-4 py-3 focus:outline-none w-full"
            disabled={disabled}
          />
          
          <div className="flex items-center gap-3 px-2 w-full md:w-auto justify-end md:justify-start">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 select-none whitespace-nowrap">
              <input 
                type="checkbox" 
                checked={withVideo} 
                onChange={(e) => setWithVideo(e.target.checked)}
                className="accent-cyan-500 h-4 w-4"
                disabled={disabled}
              />
              Animate
            </label>
            
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleSurpriseClick}
                    disabled={disabled}
                    className={`px-4 py-3 rounded-lg font-bold text-white transition-all duration-200 flex items-center gap-2 ${
                        disabled
                        ? 'bg-slate-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 shadow-lg shadow-purple-500/20'
                    }`}
                    title="Generate a random educational object"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span className="hidden sm:inline">Surprise Me</span>
                </button>

                <button
                type="submit"
                disabled={disabled || !input.trim()}
                className={`px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 whitespace-nowrap ${
                    disabled || !input.trim()
                    ? 'bg-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20'
                }`}
                >
                Explode It
                </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputArea;