import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import * as communityStorage from '../services/communityStorage';
import { mediaCache } from '../services/mediaCache';

describe('Deep Linking, URL Synchronization & Share UI Action (Requirements R1-R4)', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    delete (process.env as any).API_KEY;
    window.history.pushState({}, '', '/');
    await mediaCache.clearCache();
    vi.clearAllMocks();

    // Mock media preloading to return synthetic blob URLs quickly
    vi.spyOn(communityStorage, 'preloadCommunityTopicMedia').mockResolvedValue({
      infographicUrl: 'blob:http://localhost:3000/info-mock',
      assembledUrl: 'blob:http://localhost:3000/assem-mock',
      videoUrl: 'blob:http://localhost:3000/video-mock',
      audioUrl: 'blob:http://localhost:3000/audio-mock',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  describe('R1: Deep-Linkable Exploration Query URLs', () => {
    it('hydrates and displays requested exploration directly when ?item=<valid_id> is present on initial load', async () => {
      // Set query parameter before mounting
      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      // Exploration should mount directly into DisplayArea
      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      // Community Showcase should NOT be rendered when viewing topic
      expect(screen.queryByLabelText('Featured Community Deconstructions')).not.toBeInTheDocument();

      // ApiKeyModal must not open (Browse Free Mode keyless hydration)
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();

      // Breadcrumb back navigation is present
      expect(screen.getByText(/← Back to Community Showcase/i)).toBeInTheDocument();
    });

    it('hydrates and displays exploration when ?topic=<slug> is present on initial load', async () => {
      window.history.pushState({}, '', '/?topic=turbofan-engine');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /High-Bypass Turbofan/i })
        ).toBeInTheDocument();
      });

      // No API key prompt
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
    });

    it('hydrates and displays exploration when ?item=&topic=<slug> (fallback from empty item to topic) is present', async () => {
      window.history.pushState({}, '', '/?item=&topic=turbofan-engine');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /High-Bypass Turbofan/i })
        ).toBeInTheDocument();
      });
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
    });

    it('hydrates exploration from hash format without question mark (e.g. /#item=<id>)', async () => {
      window.history.pushState({}, '', '/#item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });
      expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
    });
  });

  describe('R4: Resilient Fallback & Error Handling for Invalid Identifiers', () => {
    it('handles invalid or non-existent ?item gracefully without runtime errors and falls back to showcase', async () => {
      window.history.pushState({}, '', '/?item=nonexistent-invalid-item-9999');

      render(<App />);

      // Should render the fallback Community Showcase
      await waitFor(() => {
        expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
      });

      // Displays gentle dismissible notice
      expect(
        screen.getByText(/Exploration "nonexistent-invalid-item-9999" not found/i)
      ).toBeInTheDocument();

      // ApiKeyModal should NOT be open
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();

      // Cleaned URL to remove invalid query param
      await waitFor(() => {
        expect(window.location.search).toBe('');
      });

      // Dismiss button removes the notice
      const dismissBtn = screen.getByLabelText('Dismiss notice');
      fireEvent.click(dismissBtn);
      expect(
        screen.queryByText(/Exploration "nonexistent-invalid-item-9999" not found/i)
      ).not.toBeInTheDocument();
    });

    it('automatically clears "not found" fallback notice when user subsequently selects an item from Showcase', async () => {
      window.history.pushState({}, '', '/?item=nonexistent-item-123');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText(/Exploration "nonexistent-item-123" not found/i)
        ).toBeInTheDocument();
      });

      // User clicks any showcase item without manually clicking dismiss
      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });
      fireEvent.click(screen.getAllByText('Explore Deconstruction')[0]);

      // Notice should be automatically cleared upon navigating to a valid item
      await waitFor(() => {
        expect(
          screen.queryByText(/Exploration "nonexistent-item-123" not found/i)
        ).not.toBeInTheDocument();
      });
    });

    it('hydrates exploration from hash-formatted URL (e.g. /#/view?item=<id>)', async () => {
      window.history.pushState({}, '', '/#/view?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });
      expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
    });
  });

  describe('R2: Bidirectional URL Synchronization', () => {
    it('updates URL to ?item=<id> when topic is selected from Community Showcase', async () => {
      window.history.pushState({}, '', '/');

      render(<App />);

      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });

      // Select first card
      fireEvent.click(screen.getAllByText('Explore Deconstruction')[0]);

      // URL must be updated with ?item=
      await waitFor(() => {
        expect(window.location.search).toContain('item=');
      });
      expect(screen.getByText(/← Back to Community Showcase/i)).toBeInTheDocument();
    });

    it('removes query parameter from URL when clicking "← Back to Showcase" in Header', async () => {
      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      const backBtn = screen.getByRole('button', { name: /← Back to Showcase/i });
      fireEvent.click(backBtn);

      // URL search should now be empty
      await waitFor(() => {
        expect(window.location.search).toBe('');
      });

      // Community showcase restored
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
    });

    it('removes query parameter from URL when clicking "← Back to Community Showcase" breadcrumb', async () => {
      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      const breadcrumbBack = screen.getByText(/← Back to Community Showcase/i);
      fireEvent.click(breadcrumbBack);

      await waitFor(() => {
        expect(window.location.search).toBe('');
      });
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
    });

    it('restores showcase view on browser back navigation (popstate)', async () => {
      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      // Simulate Browser Back button: URL returns to '/' and popstate fires
      await act(async () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await new Promise((r) => setTimeout(r, 50));
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
      });
    });

    it('restores exploration view on browser forward navigation (popstate)', async () => {
      window.history.pushState({}, '', '/');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
      });

      // Simulate Browser Forward button to an exploration
      await act(async () => {
        window.history.pushState({}, '', '/?item=turbofan-engine-1726240100000');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await new Promise((r) => setTimeout(r, 50));
      });

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /High-Bypass Turbofan/i })
        ).toBeInTheDocument();
      });
    });

    it('updates URL when selecting item from Sidebar history', async () => {
      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      // Return to showcase
      fireEvent.click(screen.getByRole('button', { name: /← Back to Showcase/i }));

      // Now click item in Sidebar history
      const historyButtons = screen.getAllByRole('button');
      const historyItem = historyButtons.find((b) => b.textContent?.includes('Twin-Lens Reflex'));
      expect(historyItem).toBeDefined();

      if (historyItem) {
        fireEvent.click(historyItem);
        await waitFor(() => {
          expect(window.location.search).toContain('item=tlr-camera-1726240000000');
        });
      }
    });
  });

  describe('R3: Share & Copy Link UI Action', () => {
    it('renders "Copy Link" button in DisplayArea and copies canonical URL to clipboard with feedback', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      const copyBtn = screen.getByRole('button', { name: /copy link/i });
      expect(copyBtn).toBeInTheDocument();

      fireEvent.click(copyBtn);

      // Clipboard API called with canonical URL
      expect(writeTextMock).toHaveBeenCalledTimes(1);
      const copiedUrl = writeTextMock.mock.calls[0][0];
      expect(copiedUrl).toContain('?item=tlr-camera-1726240000000');

      // Visual feedback: button indicator and toast notification both confirm success
      await waitFor(() => {
        expect(screen.getByText(/^copied to clipboard!$/i)).toBeInTheDocument();
        expect(screen.getByText(/link copied to clipboard!/i)).toBeInTheDocument();
      });
    });

    it('renders "Share" button in Header when viewing topic and copies link on click', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      window.history.pushState({}, '', '/?item=turbofan-engine-1726240100000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /High-Bypass Turbofan/i })
        ).toBeInTheDocument();
      });

      const headerShareBtn = screen.getByRole('button', { name: /share exploration/i });
      expect(headerShareBtn).toBeInTheDocument();

      fireEvent.click(headerShareBtn);

      expect(writeTextMock).toHaveBeenCalledTimes(1);
      const copiedUrl = writeTextMock.mock.calls[0][0];
      expect(copiedUrl).toContain('?item=turbofan-engine-1726240100000');

      await waitFor(() => {
        expect(screen.getByText(/Link copied to clipboard!/i)).toBeInTheDocument();
      });
    });

    it('asserts strictly single clipboard write when clicking Copy Link in DisplayArea without duplicate invocations', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      const copyBtn = screen.getByRole('button', { name: /copy link/i });
      fireEvent.click(copyBtn);

      // Verify strict single write
      expect(writeTextMock).toHaveBeenCalledTimes(1);
    });

    it('displays graceful fallback notification when clipboard copy fails completely', async () => {
      // Mock navigator.clipboard to reject and document.execCommand to return false
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Clipboard blocked by security policy')),
        },
      });
      document.execCommand = vi.fn().mockReturnValue(false);

      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      const copyBtn = screen.getByRole('button', { name: /copy link/i });
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Could not copy link to clipboard. Please copy from address bar./i)
        ).toBeInTheDocument();
      });
    });

    it('resets share toast timeout on rapid consecutive clicks without premature dismissal', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      window.history.pushState({}, '', '/?item=tlr-camera-1726240000000');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /Twin-Lens Reflex/i })
        ).toBeInTheDocument();
      });

      const headerShareBtn = screen.getByRole('button', { name: /share exploration/i });
      fireEvent.click(headerShareBtn);

      await waitFor(() => {
        expect(screen.getByText(/Link copied to clipboard!/i)).toBeInTheDocument();
      });

      // Click again after 1.5 seconds (before 3s timeout)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 1500));
      });
      fireEvent.click(headerShareBtn);

      await waitFor(() => {
        expect(screen.getByText(/Link copied to clipboard!/i)).toBeInTheDocument();
      });

      // Advance 1.8 seconds (total 3.3s from first click) — toast should still be visible because timer reset!
      await act(async () => {
        await new Promise((r) => setTimeout(r, 1800));
      });
      expect(screen.getByText(/Link copied to clipboard!/i)).toBeInTheDocument();
    });
  });

  describe('Adversarial & Edge Cases: Navigation Cancellation & Slug Normalization', () => {
    it('normalizes ?topic=<slug> to canonical ?item=<id> in browser URL via replaceState', async () => {
      window.history.pushState({}, '', '/?topic=turbofan-engine');

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { level: 2, name: /High-Bypass Turbofan/i })
        ).toBeInTheDocument();
      });

      // Browser URL search query should now be normalized to canonical item ID
      expect(window.location.search).toContain('item=turbofan-engine-1726240100000');
      expect(window.location.search).not.toContain('topic=');
    });

    it('cancels superseded async topic hydration when user navigates away before preload resolves', async () => {
      let resolveSlowMedia: ((val: any) => void) | null = null;
      const slowPromise = new Promise((resolve) => {
        resolveSlowMedia = resolve;
      });

      // Spy on preloadCommunityTopicMedia to simulate a slow network preload
      vi.spyOn(communityStorage, 'preloadCommunityTopicMedia').mockImplementation(async () => {
        await slowPromise;
        return {
          infographicUrl: 'blob:http://localhost:3000/info-mock',
          assembledUrl: 'blob:http://localhost:3000/assem-mock',
          videoUrl: 'blob:http://localhost:3000/video-mock',
          audioUrl: 'blob:http://localhost:3000/audio-mock',
        };
      });

      window.history.pushState({}, '', '/');
      render(<App />);

      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });

      // Click on first topic card (initiates slow async load)
      const buttons = screen.getAllByText('Explore Deconstruction');
      fireEvent.click(buttons[0]);

      // Immediately navigate back to showcase via popstate before slowPromise resolves
      await act(async () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Showcase should now be active
      await waitFor(() => {
        expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
      });

      // Now allow the slow preload promise to finally resolve
      await act(async () => {
        resolveSlowMedia?.(null);
      });

      // The stale topic must NOT have mounted and must NOT have overwritten the showcase!
      await waitFor(() => {
        expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
        expect(screen.queryByText(/← Back to Community Showcase/i)).not.toBeInTheDocument();
      });
    });
  });
});
