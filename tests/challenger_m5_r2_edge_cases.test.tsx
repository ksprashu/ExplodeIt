import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import * as geminiService from '../services/geminiService';
import * as communityStorage from '../services/communityStorage';
import ApiKeyModal from '../components/ApiKeyModal';
import InputArea from '../components/InputArea';
import { mockCameraPlan, DUMMY_PNG_DATA_URL, DUMMY_AUDIO_DATA_URL, DUMMY_VIDEO_DATA_URL } from './mocks/mockGenerations';

describe('M5 R2 Challenger 2 - Stale Closure & Edge Case Empirical Verification', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();

    vi.spyOn(communityStorage, 'fetchCommunityCatalog').mockResolvedValue([]);
    vi.spyOn(geminiService, 'setGlobalApiKey').mockImplementation(() => {});
    vi.spyOn(geminiService, 'generateInfographic').mockResolvedValue({
      url: DUMMY_PNG_DATA_URL,
      usage: { model: 'gemini-3-pro-image', inputTokens: 0, outputTokens: 0, costEstimate: 0.134 },
    } as any);
    vi.spyOn(geminiService, 'generateAssembledImage').mockResolvedValue({
      url: DUMMY_PNG_DATA_URL,
      usage: { model: 'gemini-3-pro-image', inputTokens: 0, outputTokens: 0, costEstimate: 0.134 },
    } as any);
    vi.spyOn(geminiService, 'enrichComponentDetails').mockResolvedValue({
      data: [],
      usage: [],
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
  // Edge Case 1: Empty / Whitespace Prompt Submissions
  // ==========================================================================
  describe('Edge Case 1: Empty / Whitespace Prompt Submissions', () => {
    it('E1.1: Submitting whitespace-only prompt in InputArea does not trigger onSubmit', () => {
      const onSubmitMock = vi.fn();
      const onSurpriseMock = vi.fn();

      render(<InputArea onSubmit={onSubmitMock} onSurprise={onSurpriseMock} disabled={false} />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: '    \t  \n  ' } });

      const form = input.closest('form');
      if (form) fireEvent.submit(form);

      expect(onSubmitMock).not.toHaveBeenCalled();
      expect(onSurpriseMock).not.toHaveBeenCalled();
    });

    it('E1.2: App ignores empty or whitespace-only prompt without setting pendingPrompt or opening modal', async () => {
      const planSpy = vi.spyOn(geminiService, 'planObject').mockResolvedValue({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      } as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: '   ' } });

      const form = input.closest('form');
      if (form) fireEvent.submit(form);

      // Modal should NOT open
      expect(screen.queryByText(/An API key is required to generate this custom exploded view/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      expect(planSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Case 2: Escape Key Dismissals
  // ==========================================================================
  describe('Edge Case 2: Escape Key Dismissals', () => {
    it('E2.1: Pressing Escape while ApiKeyModal is open from prompt interception cleanly dismisses modal without starting generation', async () => {
      const planSpy = vi.spyOn(geminiService, 'planObject').mockResolvedValue({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      } as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Quantum Gravimeter' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // Modal should be open
      expect(screen.getByText('Save & Start Exploding')).toBeInTheDocument();

      // Press Escape key
      fireEvent.keyDown(window, { key: 'Escape' });

      // Modal is dismissed
      expect(screen.queryByText('Save & Start Exploding')).not.toBeInTheDocument();
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();

      // No generation was started
      expect(planSpy).not.toHaveBeenCalled();
    });

    it('E2.2: Modal Escape listener unbinds cleanly when modal closes to prevent memory leaks', () => {
      const onCancelMock = vi.fn();
      const { rerender } = render(
        <ApiKeyModal isOpen={true} onSave={vi.fn()} onCancel={onCancelMock} initialValue="" />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCancelMock).toHaveBeenCalledTimes(1);

      // Close modal
      rerender(<ApiKeyModal isOpen={false} onSave={vi.fn()} onCancel={onCancelMock} initialValue="" />);

      // Pressing Escape now should NOT fire onCancel
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCancelMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Edge Case 3: Re-entrancy Protection While Processing
  // ==========================================================================
  describe('Edge Case 3: Re-entrancy Protection While Processing', () => {
    it('E3.1: While generation is actively processing, InputArea controls are disabled and duplicate calls are rejected', async () => {
      let resolvePlan: any;
      const planPromise = new Promise(resolve => {
        resolvePlan = resolve;
      });
      const planSpy = vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      sessionStorage.setItem('gemini_api_key', 'AIzaSyChallengerValidKey_99999');

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Hydroelectric Dam' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // Now status is PLANNING (isProcessing is true)
      expect(screen.getByText(/Planning/i)).toBeInTheDocument();

      // InputArea input and buttons should be disabled
      const currentInput = screen.getByPlaceholderText(/Name an object/i);
      expect(currentInput).toBeDisabled();

      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      expect(explodeBtn).toBeDisabled();

      // Ensure plan was called exactly once so far
      expect(planSpy).toHaveBeenCalledTimes(1);

      // Resolve plan
      await act(async () => {
        resolvePlan({
          data: mockCameraPlan,
          usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
        });
      });
    });
  });

  // ==========================================================================
  // Edge Case 4: Rapid Key Saves & Prompt Interception State Safety
  // ==========================================================================
  describe('Edge Case 4: Rapid Key Saves & Prompt Interception State Safety', () => {
    it('E4.1: Submitting key in prompt interception immediately calls planObject once without lag or re-opening', async () => {
      let resolvePlan: any;
      const planPromise = new Promise(resolve => {
        resolvePlan = resolve;
      });
      const planSpy = vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      render(<App />);

      // Keyless prompt submission
      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Superconducting Magnet' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      expect(screen.getByText('Save & Start Exploding')).toBeInTheDocument();

      // Enter key
      const keyInput = screen.getByPlaceholderText('AIza...');
      fireEvent.change(keyInput, { target: { value: 'AIzaSyTestKeyValid_12345678' } });

      const submitBtn = screen.getByRole('button', { name: 'Save & Start Exploding' });
      fireEvent.click(submitBtn);

      // Verify immediate call without lag
      await waitFor(() => {
        expect(planSpy).toHaveBeenCalledTimes(1);
      });
      expect(planSpy).toHaveBeenCalledWith('Superconducting Magnet', expect.objectContaining({ enableVideo: true }));

      // Modal is closed and not re-opened
      expect(screen.queryByText('Save & Start Exploding')).not.toBeInTheDocument();
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();

      // Clean up promise
      await act(async () => {
        resolvePlan({
          data: mockCameraPlan,
          usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
        });
      });
    });

    it('E4.2: Auth error (401/403) restores pendingPrompt and re-opens ApiKeyModal with error', async () => {
      const planSpy = vi.spyOn(geminiService, 'planObject').mockRejectedValue(
        new Error('API key not valid (401). Please check credentials.')
      );

      sessionStorage.setItem('gemini_api_key', 'AIzaSyInvalidKey_000000000');

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Radio Telescope' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // Wait for auth error handling
      await waitFor(() => {
        expect(screen.getByText(/Invalid API Key. Please check your key and try again./i)).toBeInTheDocument();
      });

      // Modal should be open with the error message and "Save & Start Exploding" (since pendingPrompt was restored)
      expect(screen.getByText('Save & Start Exploding')).toBeInTheDocument();
    });

    it('E4.3: Rapid double-click on Save in ApiKeyModal invokes handleSaveKey cleanly without double-planning', async () => {
      let resolvePlan: any;
      const planPromise = new Promise(resolve => {
        resolvePlan = resolve;
      });
      const planSpy = vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Tokamak Fusion Reactor' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      const keyInput = screen.getByPlaceholderText('AIza...');
      fireEvent.change(keyInput, { target: { value: 'AIzaSyRapidKeyTest_12345678' } });

      const submitBtn = screen.getByRole('button', { name: 'Save & Start Exploding' });
      
      // Simulate rapid double submit click
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(planSpy).toHaveBeenCalledTimes(1);
      });

      // Confirm modal closed
      expect(screen.queryByText('Save & Start Exploding')).not.toBeInTheDocument();

      // Clean up promise
      await act(async () => {
        resolvePlan({
          data: mockCameraPlan,
          usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
        });
      });
    });
  });
});
