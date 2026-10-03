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

describe('Adversarial Boundary Challenger Suite (Hostile Stress & Edge Cases)', () => {
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

  // ==========================================================================
  // 1. STRESS TESTING RAPID MULTIPLE EXPLOSIONS IN SUCCESSION
  // ==========================================================================
  describe('Group 1: Rapid Multiple Explosions in Succession', () => {
    it('handles concurrent background explosions without state tearing, URL collision, or view hijacking', async () => {
      let resolvePlan1: any;
      const plan1Promise = new Promise((resolve) => { resolvePlan1 = resolve; });

      let resolvePlan2: any;
      const plan2Promise = new Promise((resolve) => { resolvePlan2 = resolve; });

      const planMock = vi.spyOn(geminiService, 'planObject')
        .mockReturnValueOnce(plan1Promise as any)
        .mockReturnValueOnce(plan2Promise as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });

      // 1. Launch Explosion 1
      fireEvent.change(input, { target: { value: 'Quantum Supercomputer' } });
      fireEvent.click(explodeBtn);

      const url1 = window.location.search;
      expect(url1).toMatch(/^\?item=quantum-supercomputer-\d+$/);

      // 2. User immediately clicks Back to Showcase while Explosion 1 is in-flight
      const backBtn = screen.getByRole('button', { name: /← Back to Showcase/i });
      fireEvent.click(backBtn);
      expect(window.location.search).toBe('');

      // 3. User immediately launches Explosion 2 from Showcase
      fireEvent.change(input, { target: { value: 'Graviton Propulsion Drive' } });
      fireEvent.click(explodeBtn);

      const url2 = window.location.search;
      expect(url2).toMatch(/^\?item=graviton-propulsion-drive-\d+$/);
      expect(url2).not.toBe(url1);

      // 4. Explosion 1 completes in the background while user is viewing Explosion 2
      await act(async () => {
        resolvePlan1({
          data: { ...mockCameraPlan, displayTitle: 'Quantum Supercomputer' },
          usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
        });
        await new Promise((r) => setTimeout(r, 60));
      });

      // Assert Explosion 1 finishing did NOT hijack active URL or overwrite active item
      expect(window.location.search).toBe(url2);

      // 5. Explosion 2 completes
      await act(async () => {
        resolvePlan2({
          data: { ...mockCameraPlan, displayTitle: 'Graviton Propulsion Drive' },
          usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
        });
        await new Promise((r) => setTimeout(r, 60));
      });

      // Assert Explosion 2 displays and URL matches url2
      expect(window.location.search).toBe(url2);
      expect(screen.getByRole('heading', { level: 2, name: /Graviton Propulsion Drive/i })).toBeInTheDocument();

      // Assert BOTH items are preserved in history
      const historyButtons = screen.getAllByRole('button');
      const item1Button = historyButtons.find((b) => b.textContent?.includes('Quantum Supercomputer'));
      const item2Button = historyButtons.find((b) => b.textContent?.includes('Graviton Propulsion Drive'));
      expect(item1Button).toBeDefined();
      expect(item2Button).toBeDefined();
    });
  });

  // ==========================================================================
  // 2. MALFORMED PROMPTS & SPECIAL CHARACTERS
  // ==========================================================================
  describe('Group 2: Malformed Prompts & Special Characters', () => {
    it('handles purely special character prompt by falling back to safe slug "exploration" without URI malformation', async () => {
      vi.spyOn(geminiService, 'planObject').mockResolvedValue({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      } as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: '!@#$%^&*()_+=-~`{}[]|:;"<>,.?/' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // URL should fall back to exploration-<timestamp> without unencoded illegal URI characters
      expect(window.location.search).toMatch(/^\?item=exploration-\d+$/);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })).toBeInTheDocument();
      });
    });

    it('handles pure Unicode emoji prompts with graceful fallback slug', async () => {
      vi.spyOn(geminiService, 'planObject').mockResolvedValue({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      } as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: '🚀 🛸 🛰️ 👾' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      expect(window.location.search).toMatch(/^\?item=exploration-\d+$/);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })).toBeInTheDocument();
      });
    });

    it('safely sanitizes SQL injection and XSS prompt strings in URL slugs and DOM', async () => {
      vi.spyOn(geminiService, 'planObject').mockResolvedValue({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      } as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      // Hostile payload attempting SQL injection and script injection
      fireEvent.change(input, { target: { value: "'; DROP TABLE users; <script>alert(1)</script>" } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // URL must be sanitized into kebab-case alphanumeric characters
      expect(window.location.search).toMatch(/^\?item=drop-table-users-script-alert-1-script-\d+$/);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })).toBeInTheDocument();
      });
    });

    it('ignores whitespace-only inputs without state changes or URL mutations', async () => {
      const planSpy = vi.spyOn(geminiService, 'planObject');

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: '   \n\t   \r\n   ' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      expect(planSpy).not.toHaveBeenCalled();
      expect(window.location.search).toBe('');
    });
  });

  // ==========================================================================
  // 3. FAST POPSTATE HISTORY REWINDS & BURST TRAVERSAL
  // ==========================================================================
  describe('Group 3: Fast PopState History Rewinds & Burst Traversal', () => {
    it('survives rapid oscillating popstate events during in-flight planning and preserves active view', async () => {
      let resolvePlan: any;
      const planPromise = new Promise((resolve) => { resolvePlan = resolve; });
      vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Large Hadron Collider' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      const generatedQuery = window.location.search;
      expect(generatedQuery).toMatch(/^\?item=large-hadron-collider-\d+$/);

      // Rapid popstate oscillation: 6 rapid back-and-forth events
      await act(async () => {
        for (let i = 0; i < 3; i++) {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));

          window.history.pushState({}, '', `/${generatedQuery}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }

        // Final popstate stops at root Showcase
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await new Promise((r) => setTimeout(r, 40));
      });

      expect(window.location.search).toBe('');
      await waitFor(() => {
        expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
      });

      // Background generation resolves while user is on Showcase
      await act(async () => {
        resolvePlan({
          data: mockCameraPlan,
          usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
        });
        await new Promise((r) => setTimeout(r, 50));
      });

      // Root showcase is still cleanly preserved
      expect(window.location.search).toBe('');
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 4. RAPID CLEAR HISTORY WHILE PLANNING
  // ==========================================================================
  describe('Group 4: Rapid Clear History While Planning', () => {
    it('clearing history during in-flight planning resets URL to root and prevents background completion from resurrecting item', async () => {
      let resolvePlan: any;
      const planPromise = new Promise((resolve) => { resolvePlan = resolve; });
      vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Fusion Reactor' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      expect(window.location.search).toMatch(/^\?item=fusion-reactor-\d+$/);

      // User immediately clicks "Clear History" button in Sidebar while planning is still in flight
      const clearBtn = screen.getByRole('button', { name: /Clear History/i });
      fireEvent.click(clearBtn);

      // Verify immediate reset to root Showcase
      expect(window.location.search).toBe('');
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();

      // Now background generation resolves
      await act(async () => {
        resolvePlan({
          data: mockCameraPlan,
          usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
        });
        await new Promise((r) => setTimeout(r, 50));
      });

      // Invariant checks:
      // 1. URL stays root
      expect(window.location.search).toBe('');
      // 2. View stays Showcase
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
      // 3. No contribution modal is opened
      expect(screen.queryByText(/Contribute to Community Encyclopedia/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 5. CONCURRENT NAVIGATION & SIDEBAR SELECTION DEADLOCK IMMUNITY
  // ==========================================================================
  describe('Group 5: Concurrent Navigation & History Switching Deadlock Immunity', () => {
    it('switching to a completed item from Sidebar while another explosion is in-flight does NOT deadlock UI in PLANNING state', async () => {
      // 1. Generate First Item completely
      vi.spyOn(geminiService, 'planObject').mockResolvedValueOnce({
        data: { ...mockCameraPlan, displayTitle: 'First Completed Item' },
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      } as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'First Completed Item' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: /First Completed Item/i })).toBeInTheDocument();
      });
      const firstUrl = window.location.search;

      // 2. Start a Second Item that hangs in planning
      let resolveSecondPlan: any;
      const secondPlanPromise = new Promise((resolve) => { resolveSecondPlan = resolve; });
      vi.spyOn(geminiService, 'planObject').mockReturnValueOnce(secondPlanPromise as any);

      fireEvent.change(input, { target: { value: 'Second In Flight Item' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      expect(window.location.search).toMatch(/^\?item=second-in-flight-item-\d+$/);

      // 3. User clicks First Completed Item in Sidebar while Second Item is actively planning
      const historyButtons = screen.getAllByRole('button');
      const firstItemBtn = historyButtons.find((b) => b.textContent?.includes('First Completed Item'));
      expect(firstItemBtn).toBeDefined();
      fireEvent.click(firstItemBtn!);

      // URL updates immediately to first item
      expect(window.location.search).toBe(firstUrl);
      expect(screen.getByRole('heading', { level: 2, name: /First Completed Item/i })).toBeInTheDocument();

      // Deadlock check: input and button must NOT be disabled
      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      expect((input as HTMLInputElement).disabled).toBe(false);
      // Explode button is enabled as soon as non-empty text is entered
      fireEvent.change(input, { target: { value: 'Third Item' } });
      expect((explodeBtn as HTMLButtonElement).disabled).toBe(false);
      fireEvent.change(input, { target: { value: '' } });

      // 4. Complete second item in background
      await act(async () => {
        resolveSecondPlan({
          data: { ...mockCameraPlan, displayTitle: 'Second In Flight Item' },
          usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
        });
        await new Promise((r) => setTimeout(r, 50));
      });

      // URL and view remain on First Item
      expect(window.location.search).toBe(firstUrl);
      expect(screen.getByRole('heading', { level: 2, name: /First Completed Item/i })).toBeInTheDocument();
      fireEvent.change(input, { target: { value: 'Fourth Item' } });
      expect((explodeBtn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  // ==========================================================================
  // 6. MID-PIPELINE API FAILURE URL PRESERVATION & RECOVERY
  // ==========================================================================
  describe('Group 6: Mid-Pipeline Failure URL Preservation & Recovery', () => {
    it('preserves URL at attempted item when downstream media generation fails and recovers cleanly on popstate to root', async () => {
      // Planning succeeds, but infographic throws 500 error
      vi.spyOn(geminiService, 'planObject').mockResolvedValue({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      } as any);
      vi.spyOn(geminiService, 'generateInfographic').mockRejectedValue(
        new Error('500 Model Inference Overload')
      );

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Particle Accelerator' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      const attemptedUrl = window.location.search;
      expect(attemptedUrl).toMatch(/^\?item=particle-accelerator-\d+$/);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/500 Model Inference Overload/i)).toBeInTheDocument();
      });

      // URL remains pinned to the attempted item
      expect(window.location.search).toBe(attemptedUrl);

      // User hits back button to root Showcase
      await act(async () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await new Promise((r) => setTimeout(r, 40));
      });

      // Error is cleared and Showcase is visible
      expect(window.location.search).toBe('');
      expect(screen.queryByText(/500 Model Inference Overload/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
    });
  });
});
