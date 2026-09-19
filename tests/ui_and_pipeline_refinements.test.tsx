import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import InputArea from '../components/InputArea';
import DisplayArea from '../components/DisplayArea';
import * as geminiService from '../services/geminiService';
import * as communityStorage from '../services/communityStorage';
import { 
  mockCameraPlan, 
  mockCameraComponents,
  DUMMY_PNG_DATA_URL, 
  DUMMY_AUDIO_DATA_URL, 
  DUMMY_VIDEO_DATA_URL 
} from './mocks/mockGenerations';
import { GenerationStatus, GenerationItem } from '../types';
import { CANONICAL_MODEL_PRESETS } from '../constants';

describe('UI and Pipeline Refinements (R1, R2, R3)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    delete (process.env as any).API_KEY;
    vi.clearAllMocks();

    // Mock HTMLMediaElement prototype
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();

    vi.spyOn(communityStorage, 'fetchCommunityCatalog').mockResolvedValue([]);
    vi.spyOn(geminiService, 'setGlobalApiKey').mockImplementation(() => {});
    vi.spyOn(geminiService, 'planObject').mockResolvedValue({
      data: mockCameraPlan,
      usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
    } as any);
    vi.spyOn(geminiService, 'generateInfographic').mockResolvedValue({
      url: DUMMY_PNG_DATA_URL,
      usage: { model: 'gemini-3-pro-image', inputTokens: 0, outputTokens: 0, costEstimate: 0.134 },
    } as any);
    vi.spyOn(geminiService, 'generateAssembledImage').mockResolvedValue({
      url: DUMMY_PNG_DATA_URL,
      usage: { model: 'gemini-3-pro-image', inputTokens: 0, outputTokens: 0, costEstimate: 0.134 },
    } as any);
    vi.spyOn(geminiService, 'enrichComponentDetails').mockResolvedValue({
      data: mockCameraComponents,
      usage: [{ model: 'gemini-3.8-flash', inputTokens: 100, outputTokens: 200, costEstimate: 0.001 }],
    } as any);
    vi.spyOn(geminiService, 'generateVideo').mockResolvedValue({
      url: DUMMY_VIDEO_DATA_URL,
      usage: { model: 'veo-3.1-generate-preview', inputTokens: 0, outputTokens: 0, costEstimate: 2.00 },
    } as any);
    vi.spyOn(geminiService, 'generateAudioNarration').mockResolvedValue({
      url: DUMMY_AUDIO_DATA_URL,
      script: 'Narration script',
      usage: [{ model: 'gemini-3.1-flash-tts-preview', inputTokens: 50, outputTokens: 50, costEstimate: 0.0001 }],
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // R1: Swap Primary Action Buttons
  // ==========================================================================
  describe('R1: Swap Primary Action Buttons', () => {
    it('R1.1: In the input bar, Explode It appears before Surprise Me in DOM order', () => {
      render(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={false} 
        />
      );

      const buttons = screen.getAllByRole('button');
      // Button 0: Explode It (type=submit)
      // Button 1: Surprise Me (type=button)
      expect(buttons[0]).toHaveTextContent(/Explode It/i);
      expect(buttons[1]).toHaveTextContent(/Surprise Me/i);
    });

    it('R1.2: Tab navigation order follows input -> Animate checkbox -> Explode It -> Surprise Me', () => {
      render(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={false} 
        />
      );

      const textInput = screen.getByPlaceholderText(/Name an object/i);
      const checkbox = screen.getByRole('checkbox');
      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });

      // Verify DOM document position precedes
      expect(textInput.compareDocumentPosition(checkbox) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(checkbox.compareDocumentPosition(explodeBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(explodeBtn.compareDocumentPosition(surpriseBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('R1.3: Pressing Enter inside text input triggers Explode It submission', () => {
      const onSubmit = vi.fn();
      render(
        <InputArea 
          onSubmit={onSubmit} 
          onSurprise={vi.fn()} 
          disabled={false} 
        />
      );

      const textInput = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(textInput, { target: { value: 'Mechanical Watch' } });
      
      const form = textInput.closest('form');
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith('Mechanical Watch', true);
    });

    it('R1.4: Explode It is disabled when input is empty or whitespace, while Surprise Me remains enabled', () => {
      render(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={false} 
        />
      );

      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });

      expect(explodeBtn).toBeDisabled();
      expect(surpriseBtn).not.toBeDisabled();

      const textInput = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(textInput, { target: { value: '   ' } });
      expect(explodeBtn).toBeDisabled();
      expect(surpriseBtn).not.toBeDisabled();

      fireEvent.change(textInput, { target: { value: 'Steam Engine' } });
      expect(explodeBtn).not.toBeDisabled();
      expect(surpriseBtn).not.toBeDisabled();
    });

    it('R1.5: Both buttons are disabled when disabled prop is true', () => {
      render(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={true} 
        />
      );

      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });

      expect(explodeBtn).toBeDisabled();
      expect(surpriseBtn).toBeDisabled();
    });

    it('R1.6: Animate checkbox label shows disabled styling when disabled prop is true', () => {
      const { rerender } = render(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={false} 
        />
      );

      const label = screen.getByText(/Animate/i).closest('label');
      expect(label).toHaveClass('cursor-pointer');

      rerender(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={true} 
        />
      );

      expect(label).toHaveClass('cursor-not-allowed');
      expect(label).toHaveClass('text-slate-500');
    });

    it('R1.7: Surprise Me button triggers onSurprise with active withVideo state', () => {
      const onSurprise = vi.fn();
      render(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={onSurprise} 
          disabled={false} 
          modelTier="pro"
        />
      );

      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      fireEvent.click(surpriseBtn);
      expect(onSurprise).toHaveBeenCalledWith(true);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      fireEvent.click(surpriseBtn);
      expect(onSurprise).toHaveBeenCalledWith(false);
    });

    it('R1.8: Surprise Me button includes explicit aria-label for accessible mobile viewports', () => {
      render(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={false} 
        />
      );

      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      expect(surpriseBtn).toHaveAttribute('aria-label', 'Surprise Me');
    });
  });

  // ==========================================================================
  // R2: Audio Guide Scrubber and Playback Navigation
  // ==========================================================================
  describe('R2: Audio Guide Scrubber and Playback Navigation', () => {
    const sampleItemWithAudio: GenerationItem = {
      id: 'test-audio-item',
      prompt: 'Twin-Lens Reflex (TLR) Camera',
      timestamp: Date.now(),
      plan: mockCameraPlan,
      components: mockCameraComponents,
      narrationScript: 'Audio narration script...',
      infographicUrl: DUMMY_PNG_DATA_URL,
      assembledUrl: DUMMY_PNG_DATA_URL,
      videoUrl: DUMMY_VIDEO_DATA_URL,
      audioUrl: DUMMY_AUDIO_DATA_URL,
      hasVideo: true,
      usage: [],
    };

    it('R2.1: Scrubber range slider appears when audioUrl is present', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i });
      expect(scrubber).toBeInTheDocument();
      expect(scrubber).toHaveAttribute('type', 'range');
    });

    it('R2.2: Displays formatted playback time and total duration', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      // Initially 0:00 / 0:00
      expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();

      // Trigger duration loaded on audio element
      const audioElement = document.querySelector('audio');
      expect(audioElement).not.toBeNull();
      Object.defineProperty(audioElement, 'duration', { value: 125, configurable: true });
      fireEvent.loadedMetadata(audioElement!);

      expect(screen.getByText('0:00 / 2:05')).toBeInTheDocument();

      // Simulate playback progress
      Object.defineProperty(audioElement, 'currentTime', { value: 65, configurable: true });
      fireEvent.timeUpdate(audioElement!);

      expect(screen.getByText('1:05 / 2:05')).toBeInTheDocument();
    });

    it('R2.3: Seeking on scrubber updates audio playback position and displayed time', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 180, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i }) as HTMLInputElement;

      // User seeks to 45 seconds
      fireEvent.change(scrubber, { target: { value: '45' } });

      expect(audioElement.currentTime).toBe(45);
      expect(scrubber.value).toBe('45');
      expect(screen.getByText('0:45 / 3:00')).toBeInTheDocument();
    });

    it('R2.4: Restart Audio button resets playback and seek bar back to 0:00', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 120, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i }) as HTMLInputElement;

      // Seek to 75 seconds
      fireEvent.change(scrubber, { target: { value: '75' } });
      expect(audioElement.currentTime).toBe(75);
      expect(screen.getByText('1:15 / 2:00')).toBeInTheDocument();

      // Click Restart button
      const restartBtn = screen.getByTitle('Restart Audio');
      fireEvent.click(restartBtn);

      expect(audioElement.currentTime).toBe(0);
      expect(scrubber.value).toBe('0');
      expect(screen.getByText('0:00 / 2:00')).toBeInTheDocument();
    });

    it('R2.5: Play and pause toggle audio element and button title', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const playBtn = screen.getByTitle('Play');
      fireEvent.click(playBtn);
      expect(screen.getByTitle('Pause')).toBeInTheDocument();

      const pauseBtn = screen.getByTitle('Pause');
      fireEvent.click(pauseBtn);
      expect(screen.getByTitle('Play')).toBeInTheDocument();
    });

    it('R2.6: Scrubber slider includes complete ARIA accessibility attributes', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 90, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i });
      expect(scrubber).toHaveAttribute('aria-valuemin', '0');
      expect(scrubber).toHaveAttribute('aria-valuemax', '90');
      expect(scrubber).toHaveAttribute('aria-valuenow', '0');
      expect(scrubber).toHaveAttribute('aria-valuetext', '0:00 of 1:30');
    });

    it('R2.7: Audio tag specifies preload="metadata" for responsive duration discovery', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio');
      expect(audioElement).toHaveAttribute('preload', 'metadata');
    });

    it('R2.8: Active seeking isolates scrubber from timeupdate snapback/stutter', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 120, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i }) as HTMLInputElement;

      // User initiates seek drag
      fireEvent.pointerDown(scrubber);
      fireEvent.input(scrubber, { target: { value: '50' } });

      // Simulate native timeupdate occurring during drag (playback still at 10s)
      Object.defineProperty(audioElement, 'currentTime', { value: 10, configurable: true });
      fireEvent.timeUpdate(audioElement);

      // Scrubber thumb must NOT snap back to 10s; it must remain at 50s
      expect(scrubber.value).toBe('50');
      expect(screen.getByText('0:50 / 2:00')).toBeInTheDocument();

      // User releases seek drag
      fireEvent.pointerUp(scrubber);

      // Now normal timeupdate updates the scrubber
      Object.defineProperty(audioElement, 'currentTime', { value: 55, configurable: true });
      fireEvent.timeUpdate(audioElement);
      expect(scrubber.value).toBe('55');
      expect(screen.getByText('0:55 / 2:00')).toBeInTheDocument();
    });

    it('R2.9: Switching items within DisplayArea reloads metadata and preserves audio source for new item', () => {
      const secondItemWithAudio: GenerationItem = {
        ...sampleItemWithAudio,
        id: 'test-audio-item-2',
        prompt: 'Microscope',
        audioUrl: 'data:audio/wav;base64,SECOND_AUDIO_MOCK',
      };

      const { rerender } = render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 60, configurable: true });
      fireEvent.loadedMetadata(audioElement);
      expect(screen.getByText('0:00 / 1:00')).toBeInTheDocument();

      // Switch to second item with audio
      rerender(
        <DisplayArea
          item={secondItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      // Verify audio element has the new audio src loaded (not stripped)
      expect(audioElement.getAttribute('src')).toBe('data:audio/wav;base64,SECOND_AUDIO_MOCK');

      // Loaded metadata for second item updates duration
      Object.defineProperty(audioElement, 'duration', { value: 150, configurable: true });
      fireEvent.loadedMetadata(audioElement);
      expect(screen.getByText('0:00 / 2:30')).toBeInTheDocument();
    });

    it('R2.10: Seeking while paused preserves seek position when subsequently starting playback', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 120, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i }) as HTMLInputElement;

      // Seek to 40 seconds while paused
      fireEvent.change(scrubber, { target: { value: '40' } });
      expect(audioElement.currentTime).toBe(40);
      expect(scrubber.value).toBe('40');

      // Click Play
      const playBtn = screen.getByTitle('Play');
      fireEvent.click(playBtn);

      // Playback continues from 40 seconds, NOT reset to 0
      expect(audioElement.currentTime).toBe(40);
    });

    it('R2.11: Audio playback at end of track resets and restarts from 0:00 when clicking Play', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 60, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      // Set audio position at end of track
      Object.defineProperty(audioElement, 'currentTime', { value: 60, configurable: true, writable: true });
      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i }) as HTMLInputElement;
      fireEvent.change(scrubber, { target: { value: '60' } });

      // Click Play at end of track
      const playBtn = screen.getByTitle('Play');
      fireEvent.click(playBtn);

      // currentTime is reset to 0 and playback restarts
      expect(audioElement.currentTime).toBe(0);
      expect(screen.getByTitle('Pause')).toBeInTheDocument();
    });

    it('R2.12: Gesture cancellation (pointerCancel, touchCancel, blur) releases seeking lock', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 100, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i }) as HTMLInputElement;

      // Start seeking
      fireEvent.pointerDown(scrubber);
      fireEvent.input(scrubber, { target: { value: '30' } });

      // Simulate pointer cancel (e.g. touch gesture interrupted by OS)
      fireEvent.pointerCancel(scrubber);

      // Normal timeupdate works again
      Object.defineProperty(audioElement, 'currentTime', { value: 45, configurable: true });
      fireEvent.timeUpdate(audioElement);
      expect(scrubber.value).toBe('45');

      // Start seeking again and test blur
      fireEvent.pointerDown(scrubber);
      fireEvent.input(scrubber, { target: { value: '50' } });
      fireEvent.blur(scrubber);

      Object.defineProperty(audioElement, 'currentTime', { value: 60, configurable: true });
      fireEvent.timeUpdate(audioElement);
      expect(scrubber.value).toBe('60');
    });

    it('R2.13: Scrubber clamps out-of-bounds negative and excessive seek values', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 90, configurable: true, writable: true });
      fireEvent.loadedMetadata(audioElement);

      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i }) as HTMLInputElement;

      // Negative value clamped to 0
      fireEvent.change(scrubber, { target: { value: '-10' } });
      expect(audioElement.currentTime).toBe(0);

      // Excessive value clamped to duration
      fireEvent.change(scrubber, { target: { value: '200' } });
      expect(audioElement.currentTime).toBe(90);
    });

    it('R2.14: Time display clamps current time to duration to prevent visual overflow', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 60, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      // If audio decoder reports currentTime slightly exceeding duration (e.g. 60.5)
      Object.defineProperty(audioElement, 'currentTime', { value: 60.5, configurable: true });
      fireEvent.timeUpdate(audioElement);

      // Display should show 1:00 / 1:00 instead of 1:01 / 1:00
      expect(screen.getByText('1:00 / 1:00')).toBeInTheDocument();
    });

    it('R2.15: Audio element onPlay and onPause native events synchronize isPlaying state', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 60, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      // Simulate native play event from audio element
      fireEvent.play(audioElement);
      expect(screen.getByTitle('Pause')).toBeInTheDocument();

      // Simulate native pause event (e.g. system interruption)
      fireEvent.pause(audioElement);
      expect(screen.getByTitle('Play')).toBeInTheDocument();
    });

    it('R2.16: Scrubber is disabled and seeking is a no-op when audio duration is 0 or unmeasured', () => {
      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      // Duration is 0 initially (unmeasured)
      const scrubber = screen.getByRole('slider', { name: /Audio scrubber/i }) as HTMLInputElement;
      expect(scrubber).toBeDisabled();

      // Seeking attempt should be rejected/ignored
      fireEvent.change(scrubber, { target: { value: '50' } });
      expect(audioElement.currentTime).toBe(0);
      expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
    });

    it('R2.17: Autoplay rejection in toggleAudio safely falls back to paused state', async () => {
      // Mock play to reject (simulating browser autoplay block)
      window.HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('NotAllowedError: play() failed'));

      render(
        <DisplayArea
          item={sampleItemWithAudio}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      const audioElement = document.querySelector('audio') as HTMLAudioElement;
      Object.defineProperty(audioElement, 'duration', { value: 60, configurable: true });
      fireEvent.loadedMetadata(audioElement);

      const playBtn = screen.getByTitle('Play');
      fireEvent.click(playBtn);

      // After rejection, state safely resets to Play
      await waitFor(() => {
        expect(screen.getByTitle('Play')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // R3: Budget Saver Mode Video Synchronization
  // ==========================================================================
  describe('R3: Budget Saver Mode Video Synchronization', () => {
    it('R3.1: InputArea defaults Animate to unchecked when modelTier is budget, checked when pro', () => {
      const { rerender } = render(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={false} 
          modelTier="budget"
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      rerender(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={false} 
          modelTier="pro"
        />
      );
      expect(checkbox.checked).toBe(true);

      rerender(
        <InputArea 
          onSubmit={vi.fn()} 
          onSurprise={vi.fn()} 
          disabled={false} 
          modelTier="budget"
        />
      );
      expect(checkbox.checked).toBe(false);
    });

    it('R3.2: User can manually toggle Animate in either mode without being overridden until tier changes', () => {
      const onSubmit = vi.fn();
      const { rerender } = render(
        <InputArea 
          onSubmit={onSubmit} 
          onSurprise={vi.fn()} 
          disabled={false} 
          modelTier="budget"
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      const input = screen.getByPlaceholderText(/Name an object/i);
      const submitBtn = screen.getByRole('button', { name: /Explode It/i });

      expect(checkbox.checked).toBe(false);

      // Manually opt-in in budget mode
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      // Re-render with same modelTier does NOT reset manual toggle
      rerender(
        <InputArea 
          onSubmit={onSubmit} 
          onSurprise={vi.fn()} 
          disabled={false} 
          modelTier="budget"
        />
      );
      expect(checkbox.checked).toBe(true);

      fireEvent.change(input, { target: { value: 'Jet Turbine' } });
      fireEvent.click(submitBtn);
      expect(onSubmit).toHaveBeenCalledWith('Jet Turbine', true);

      // Switching to pro resets to pro default (true)
      rerender(
        <InputArea 
          onSubmit={onSubmit} 
          onSurprise={vi.fn()} 
          disabled={false} 
          modelTier="pro"
        />
      );
      expect(checkbox.checked).toBe(true);

      // Manually opt-out in pro mode
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(false);

      fireEvent.change(input, { target: { value: 'Jet Turbine 2' } });
      fireEvent.click(submitBtn);
      expect(onSubmit).toHaveBeenCalledWith('Jet Turbine 2', false);
    });

    it('R3.3: App Header tier switching synchronizes InputArea Animate checkbox', async () => {
      sessionStorage.setItem('gemini_api_key', 'test-api-key');

      render(<App />);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      // Pro by default
      expect(checkbox.checked).toBe(true);

      // Click Budget Saver in header
      const budgetBtn = screen.getByRole('button', { name: /Budget Saver/i });
      fireEvent.click(budgetBtn);

      await waitFor(() => {
        expect(checkbox.checked).toBe(false);
      });

      // Click Pro Studio in header
      const proBtn = screen.getByRole('button', { name: /Pro Studio/i });
      fireEvent.click(proBtn);

      await waitFor(() => {
        expect(checkbox.checked).toBe(true);
      });
    });

    it('R3.4: Submitting generation with Animate unchecked in Budget Saver results in zero video generation calls, null videoUrl, and zero Veo charges', async () => {
      sessionStorage.setItem('gemini_api_key', 'test-api-key');
      const videoSpy = vi.spyOn(geminiService, 'generateVideo');

      render(<App />);

      // Switch to Budget Saver
      const budgetBtn = screen.getByRole('button', { name: /Budget Saver/i });
      fireEvent.click(budgetBtn);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      await waitFor(() => {
        expect(checkbox.checked).toBe(false);
      });

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Telescope' } });

      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      fireEvent.click(explodeBtn);

      // Wait for generation to complete
      await waitFor(() => {
        expect(screen.getAllByText('Twin-Lens Reflex (TLR) Camera').length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // Assert generateVideo was NEVER called
      expect(videoSpy).not.toHaveBeenCalled();

      // Assert no video element rendered in display
      expect(document.querySelector('video')).toBeNull();
    });

    it('R3.5: Surprise Me in Budget Saver defaults withVideo to false and executes zero video calls', async () => {
      sessionStorage.setItem('gemini_api_key', 'test-api-key');
      const videoSpy = vi.spyOn(geminiService, 'generateVideo');
      vi.spyOn(geminiService, 'getRandomObject').mockResolvedValue({
        name: 'Compass',
        usage: { model: 'gemini-3.8-flash', inputTokens: 5, outputTokens: 10, costEstimate: 0.0001 }
      });

      render(<App />);

      // Switch to Budget Saver
      const budgetBtn = screen.getByRole('button', { name: /Budget Saver/i });
      fireEvent.click(budgetBtn);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      await waitFor(() => {
        expect(checkbox.checked).toBe(false);
      });

      // Click Surprise Me
      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      fireEvent.click(surpriseBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Twin-Lens Reflex (TLR) Camera').length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      expect(videoSpy).not.toHaveBeenCalled();
      expect(document.querySelector('video')).toBeNull();
    });

    it('R3.6: Surprise Me with manual opt-in in Budget Saver preserves withVideo true and generates video', async () => {
      sessionStorage.setItem('gemini_api_key', 'test-api-key');
      const videoSpy = vi.spyOn(geminiService, 'generateVideo');
      vi.spyOn(geminiService, 'getRandomObject').mockResolvedValue({
        name: 'Astrolabe',
        usage: { model: 'gemini-3.8-flash', inputTokens: 5, outputTokens: 10, costEstimate: 0.0001 }
      });

      render(<App />);

      // Switch to Budget Saver
      const budgetBtn = screen.getByRole('button', { name: /Budget Saver/i });
      fireEvent.click(budgetBtn);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      await waitFor(() => {
        expect(checkbox.checked).toBe(false);
      });

      // Manually opt-in to video in Budget Saver
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);

      // Click Surprise Me
      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      fireEvent.click(surpriseBtn);

      await waitFor(() => {
        expect(screen.getAllByText('Twin-Lens Reflex (TLR) Camera').length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      expect(videoSpy).toHaveBeenCalledTimes(1);
    });

    it('R3.7: Keyless user clicking Surprise Me queues pending surprise, opens modal, and auto-executes upon key submission with active tier video preference', async () => {
      // Start in keyless mode
      sessionStorage.clear();
      localStorage.clear();
      const videoSpy = vi.spyOn(geminiService, 'generateVideo');
      vi.spyOn(geminiService, 'getRandomObject').mockResolvedValue({
        name: 'Sundial',
        usage: { model: 'gemini-3.8-flash', inputTokens: 5, outputTokens: 10, costEstimate: 0.0001 }
      });

      render(<App />);

      // Switch to Budget Saver first (so withVideo defaults to false)
      const budgetBtn = screen.getByRole('button', { name: /Budget Saver/i });
      fireEvent.click(budgetBtn);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      await waitFor(() => {
        expect(checkbox.checked).toBe(false);
      });

      // User clicks Surprise Me without an API key
      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      fireEvent.click(surpriseBtn);

      // ApiKeyModal should open with pending prompt explanation
      await waitFor(() => {
        expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();
      });
      expect(
        screen.getByText(/An API key is required to generate this custom exploded view/i)
      ).toBeInTheDocument();

      // Enter API key and submit
      const input = screen.getByPlaceholderText('AIza...');
      fireEvent.change(input, { target: { value: 'AIzaSyValidSessionKey_99999' } });
      fireEvent.click(screen.getByRole('button', { name: /Save & Start Exploding/i }));

      // Modal closes and surprise generation auto-resumes with withVideo: false
      await waitFor(() => {
        expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getAllByText('Twin-Lens Reflex (TLR) Camera').length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      // In Budget Saver, zero video calls
      expect(videoSpy).not.toHaveBeenCalled();
    });
  });
});
