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

describe('Real-Time URL Synchronization & Navigation Safety (SPEC.md)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.clearAllMocks();

    sessionStorage.setItem('gemini_api_key', 'AIzaSyTestKey_1234567890');
    localStorage.setItem('explodeit_contribute_optout', 'true'); // Opt out to prevent modal timers

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

  it('AC-1 & R1: Submitting an object to explode immediately synchronizes URL to ?item=<topic-slug>-<timestamp> while generation is pending', async () => {
    let resolvePlan: any;
    const planPromise = new Promise((resolve) => {
      resolvePlan = resolve;
    });
    vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

    const pushSpy = vi.spyOn(window.history, 'pushState');

    render(<App />);

    const input = screen.getByPlaceholderText(/Name an object/i);
    fireEvent.change(input, { target: { value: 'Vintage Pocket Watch' } });

    const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
    fireEvent.click(explodeBtn);

    // AC-1 check: URL MUST immediately contain ?item=vintage-pocket-watch-<timestamp> BEFORE downstream API resolves
    expect(window.location.search).toMatch(/^\?item=vintage-pocket-watch-\d+$/);
    expect(pushSpy).toHaveBeenCalledTimes(1);

    // Resolve plan to let generation complete cleanly
    await act(async () => {
      resolvePlan({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      });
    });
  });

  it('AC-2 & R2: Avoids pushing duplicate history entries when generation completes', async () => {
    vi.spyOn(geminiService, 'planObject').mockResolvedValue({
      data: mockCameraPlan,
      usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
    } as any);

    const pushSpy = vi.spyOn(window.history, 'pushState');

    render(<App />);

    const input = screen.getByPlaceholderText(/Name an object/i);
    fireEvent.change(input, { target: { value: 'Turbofan Jet Engine' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    // Immediately pushed once on start
    expect(pushSpy).toHaveBeenCalledTimes(1);
    const generatedUrl = window.location.search;
    expect(generatedUrl).toMatch(/^\?item=turbofan-jet-engine-\d+$/);

    // Wait for entire multi-stage generation pipeline to finish
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })).toBeInTheDocument();
    });

    // AC-2 check: No redundant pushState was called upon completion
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe(generatedUrl);
  });

  it('AC-4 & R4: Preserves URL at ?item=<id> when generation encounters an API error during planning', async () => {
    vi.spyOn(geminiService, 'planObject').mockRejectedValue(
      new Error('500 Internal Server Error from upstream Gemini API')
    );

    render(<App />);

    const input = screen.getByPlaceholderText(/Name an object/i);
    fireEvent.change(input, { target: { value: 'Quantum Supercomputer' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    // URL is set immediately
    expect(window.location.search).toMatch(/^\?item=quantum-supercomputer-\d+$/);

    // Wait for error state to render
    await waitFor(() => {
      expect(screen.getByText(/500 Internal Server Error from upstream Gemini API/i)).toBeInTheDocument();
    });

    // R4 check: URL remains pointing to the attempted item
    expect(window.location.search).toMatch(/^\?item=quantum-supercomputer-\d+$/);
  });

  it('AC-4 & R4: Preserves URL at ?item=<id> when generation encounters an auth error', async () => {
    vi.spyOn(geminiService, 'planObject').mockRejectedValue(
      new Error('API key not valid (401). Please check credentials.')
    );

    render(<App />);

    const input = screen.getByPlaceholderText(/Name an object/i);
    fireEvent.change(input, { target: { value: 'Geiger Counter' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    // URL updated immediately
    expect(window.location.search).toMatch(/^\?item=geiger-counter-\d+$/);

    // Wait for auth modal to appear
    await waitFor(() => {
      expect(screen.getByText(/Invalid API Key. Please check your key and try again./i)).toBeInTheDocument();
    });

    // R4 check: URL remains intact
    expect(window.location.search).toMatch(/^\?item=geiger-counter-\d+$/);
  });

  it('R3: Navigating back to root (popstate) while explosion is in flight safely restores showcase without completion disruption', async () => {
    let resolvePlan: any;
    const planPromise = new Promise((resolve) => {
      resolvePlan = resolve;
    });
    vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

    render(<App />);

    const input = screen.getByPlaceholderText(/Name an object/i);
    fireEvent.change(input, { target: { value: 'Steam Locomotive' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    // URL is pushed
    expect(window.location.search).toMatch(/^\?item=steam-locomotive-\d+$/);

    // User navigates back in browser history to root showcase while planning is still in flight
    await act(async () => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      await new Promise((r) => setTimeout(r, 50));
    });

    // Root URL is active and showcase is displayed
    expect(window.location.search).toBe('');
    await waitFor(() => {
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
    });

    // Now complete the background generation
    await act(async () => {
      resolvePlan({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    // R3 check: Background completion must NOT overwrite current URL or force active display away from showcase
    expect(window.location.search).toBe('');
    await waitFor(() => {
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
    });
  });

  it('AC-3: Switching history items in Sidebar updates URL via pushState', async () => {
    vi.spyOn(geminiService, 'planObject').mockResolvedValue({
      data: mockCameraPlan,
      usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
    } as any);

    render(<App />);

    // 1. Generate First Item
    const input = screen.getByPlaceholderText(/Name an object/i);
    fireEvent.change(input, { target: { value: 'Item One' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })).toBeInTheDocument();
    });
    const item1Url = window.location.search;

    // 2. Return to showcase
    const backBtn = screen.getByRole('button', { name: /← Back to Showcase/i });
    fireEvent.click(backBtn);
    expect(window.location.search).toBe('');

    // 3. Generate Second Item
    fireEvent.change(input, { target: { value: 'Item Two' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })).toBeInTheDocument();
    });
    const item2Url = window.location.search;
    expect(item2Url).not.toBe(item1Url);

    // 4. Click First Item in Sidebar
    const historyButtons = screen.getAllByRole('button');
    const firstItemBtn = historyButtons.find((b) => b.textContent?.includes('Item One'));
    expect(firstItemBtn).toBeDefined();

    const pushSpy = vi.spyOn(window.history, 'pushState');
    fireEvent.click(firstItemBtn!);

    // AC-3 check: URL updated to item 1 with pushState
    expect(pushSpy).toHaveBeenCalled();
    expect(window.location.search).toBe(item1Url);
  });

  it('AC-4: Clearing history via handleClearHistory resets URL to root without query parameters', async () => {
    vi.spyOn(geminiService, 'planObject').mockResolvedValue({
      data: mockCameraPlan,
      usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
    } as any);

    render(<App />);

    const input = screen.getByPlaceholderText(/Name an object/i);
    fireEvent.change(input, { target: { value: 'Chronometer' } });
    fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

    expect(window.location.search).toMatch(/^\?item=chronometer-\d+$/);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })).toBeInTheDocument();
    });

    // Click "Clear History" button in Sidebar
    const clearBtn = screen.getByRole('button', { name: /Clear History/i });
    fireEvent.click(clearBtn);

    // AC-4 check: URL is reset to root ('/') without query params
    expect(window.location.search).toBe('');
    expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
  });

  it('R3 & Adversarial: Selecting a completed item from Sidebar while an explosion is in flight resets status to IDLE without deadlock', async () => {
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

    expect(window.location.search).toMatch(/^\?item=item-beta-in-flight-\d+$/);

    // 3. User clicks Item Alpha in Sidebar while Item Beta is in-flight
    const historyButtons = screen.getAllByRole('button');
    const alphaBtn = historyButtons.find((b) => b.textContent?.includes('Item Alpha'));
    expect(alphaBtn).toBeDefined();
    fireEvent.click(alphaBtn!);

    // URL is updated to Item Alpha
    expect(window.location.search).toMatch(/^\?item=item-alpha-\d+$/);

    // 4. Background generation for Item Beta completes
    await act(async () => {
      resolveSecondPlan({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      });
      await new Promise((r) => setTimeout(r, 50));
    });

    // 5. Input must not be permanently disabled and new prompts can be entered
    fireEvent.change(input, { target: { value: 'Item Gamma' } });
    const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
    expect((input as HTMLInputElement).disabled).toBe(false);
    expect((explodeBtn as HTMLButtonElement).disabled).toBe(false);
  });
});
