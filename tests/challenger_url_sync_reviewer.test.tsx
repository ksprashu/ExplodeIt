import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import * as geminiService from '../services/geminiService';
import * as communityStorage from '../services/communityStorage';
import { 
  mockCameraPlan, 
  mockCameraComponents, 
  DUMMY_PNG_DATA_URL, 
  DUMMY_AUDIO_DATA_URL, 
  DUMMY_VIDEO_DATA_URL 
} from './mocks/mockGenerations';

describe('Reviewer Challenger: In-Flight Navigation & Sidebar Selection Deadlock', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.clearAllMocks();

    sessionStorage.setItem('gemini_api_key', 'AIzaSyTestKey_1234567890');
    localStorage.setItem('explodeit_contribute_optout', 'true');

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
      data: mockCameraComponents,
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
    window.history.pushState({}, '', '/');
  });

  it('CRITICAL ADVERSARIAL REPRO: Selecting a completed item from Sidebar while an explosion is in-flight deadlocks UI if status is not reset to IDLE', async () => {
    // 1. Generate first item to completion so it exists in Sidebar history
    vi.spyOn(geminiService, 'planObject').mockResolvedValueOnce({
      data: mockCameraPlan,
      usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
    } as any);

    render(<App />);

    const input = screen.getByPlaceholderText(/Name an object/i);
    fireEvent.change(input, { target: { value: 'Item Alpha' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })).toBeInTheDocument();
    });

    // 2. Start a second generation that hangs in planning
    let resolveSecondPlan: any;
    const secondPlanPromise = new Promise((resolve) => {
      resolveSecondPlan = resolve;
    });
    vi.spyOn(geminiService, 'planObject').mockReturnValueOnce(secondPlanPromise as any);

    fireEvent.change(input, { target: { value: 'Item Beta In Flight' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    // Verify Item Beta is in PLANNING and URL is updated
    expect(window.location.search).toMatch(/^\?item=item-beta-in-flight-\d+$/);

    // 3. User clicks Item Alpha in Sidebar while Item Beta is in-flight
    const historyButtons = screen.getAllByRole('button');
    const alphaBtn = historyButtons.find((b) => b.textContent?.includes('Item Alpha'));
    expect(alphaBtn).toBeDefined();
    fireEvent.click(alphaBtn!);

    // URL should now be Item Alpha
    expect(window.location.search).toMatch(/^\?item=item-alpha-\d+$/);

    // 4. Now background generation for Item Beta completes
    await act(async () => {
      resolveSecondPlan({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    // 5. Test whether the UI is stuck:
    // If line 1139 of App.tsx has `if (!isProcessing) { setStatus(GenerationStatus.IDLE); }`,
    // status was NEVER set to IDLE, and because Item Beta finished while currentId was Alpha,
    // status is permanently stuck in PLANNING!
    // Therefore, the input field would remain disabled!
    const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
    
    // In a deadlock, explodeBtn would be disabled because isProcessing is permanently true!
    // Let's assert what currently happens:
    fireEvent.change(input, { target: { value: 'Item Gamma' } });
    const isInputDisabled = (input as HTMLInputElement).disabled;
    const isBtnDisabled = (explodeBtn as HTMLButtonElement).disabled;

    console.log('[Challenger Diagnostic]', { isInputDisabled, isBtnDisabled });

    // In a correct implementation, the completed item should allow new explosions
    // Status must NOT remain stuck in PLANNING
    expect(isInputDisabled).toBe(false);
    expect(isBtnDisabled).toBe(false);
  });
});
