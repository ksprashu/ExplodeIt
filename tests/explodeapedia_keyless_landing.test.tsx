import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as geminiService from '../services/geminiService';
import * as communityStorage from '../services/communityStorage';
import { mediaCache } from '../services/mediaCache';

describe('Explodeapedia Keyless Landing & High-Visibility API Key Entry Points (AC Verification)', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    delete (process.env as any).API_KEY;
    await mediaCache.clearCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Acceptance Criteria: First-Time Keyless Landing', () => {
    it('boots clean initial load into Explodeapedia showcase with ApiKeyModal remaining closed', () => {
      render(<App />);

      // 1. ApiKeyModal must not be open on startup
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage Session API Key')).not.toBeInTheDocument();

      // 2. Explodeapedia showcase elements rendered directly
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
      expect(screen.getByLabelText('Topic Card Gallery')).toBeInTheDocument();
      expect(screen.getByLabelText('Unlock Custom Deconstructions')).toBeInTheDocument();
    });

    it('allows opening, viewing, and inspecting preloaded showcase topics in keyless mode without API key prompt', async () => {
      vi.spyOn(communityStorage, 'preloadCommunityTopicMedia').mockResolvedValue({
        infographicUrl: 'blob:http://localhost:3000/info-blob',
        assembledUrl: 'blob:http://localhost:3000/assembled-blob',
        videoUrl: 'blob:http://localhost:3000/video-blob',
        audioUrl: 'blob:http://localhost:3000/audio-blob',
      });
      const planSpy = vi.spyOn(geminiService, 'planObject');

      render(<App />);

      // Wait for showcase topic cards to be ready
      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });

      // Click topic in showcase
      fireEvent.click(screen.getAllByText('Explore Deconstruction')[0]);

      // Verifications:
      // No Gemini API calls were made (keyless)
      expect(planSpy).not.toHaveBeenCalled();

      // Modal was not triggered
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();

      // Topic view mounts with breadcrumb navigation
      await waitFor(() => {
        expect(screen.getByText(/← Back to Community Showcase/i)).toBeInTheDocument();
      });
    });
  });

  describe('Acceptance Criteria: API Key Discovery & Entry Points', () => {
    it('renders a distinct, high-contrast "+ Enter Gemini Key" CTA button in Header when key is unconfigured', () => {
      render(<App />);

      // Header CTA renders distinct "+ Enter Gemini Key"
      const headerCta = screen.getByRole('button', { name: /\+ Enter Gemini Key/i });
      expect(headerCta).toBeInTheDocument();
      expect(screen.getByText('+ Enter Gemini Key')).toBeInTheDocument();
    });

    it('renders an obvious banner in Explodeapedia showcase prompting users to enter API key to craft custom exploded views', () => {
      render(<App />);

      // Showcase banner is present
      const showcaseBanner = screen.getByLabelText('Unlock Custom Deconstructions');
      expect(showcaseBanner).toBeInTheDocument();
      expect(
        screen.getByText(/Enter your Gemini API key to craft custom exploded views/i)
      ).toBeInTheDocument();

      // Dedicated CTA button in showcase exists
      expect(
        screen.getByRole('button', { name: /Enter Gemini API key to craft custom exploded views/i })
      ).toBeInTheDocument();
    });

    it('launches ApiKeyModal when Header CTA is clicked', () => {
      render(<App />);

      const headerCta = screen.getByRole('button', { name: /\+ Enter Gemini Key/i });
      fireEvent.click(headerCta);

      // ApiKeyModal is opened
      expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument();
    });

    it('launches ApiKeyModal when Showcase CTA is clicked', () => {
      render(<App />);

      const showcaseCta = screen.getByRole('button', {
        name: /Enter Gemini API key to craft custom exploded views/i,
      });
      fireEvent.click(showcaseCta);

      // ApiKeyModal is opened
      expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('AIza...')).toBeInTheDocument();
    });
  });

  describe('Acceptance Criteria: Configuration & State Transition', () => {
    it('submitting valid key saves to sessionStorage, closes modal, and transitions Header and Showcase to active key indicators', async () => {
      render(<App />);

      // Click Header CTA
      fireEvent.click(screen.getByRole('button', { name: /\+ Enter Gemini Key/i }));

      // Fill in valid key
      const keyInput = screen.getByPlaceholderText('AIza...');
      const TEST_KEY = 'AIzaSyValidDynamicSessionKey_12345';
      fireEvent.change(keyInput, { target: { value: TEST_KEY } });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Save for Session' }));

      // 1. Key is stored strictly in sessionStorage
      expect(sessionStorage.getItem('gemini_api_key')).toBe(TEST_KEY);
      expect(localStorage.getItem('gemini_api_key')).toBeNull();

      // 2. Modal is closed
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();

      // 3. Header transitions to active key indicator
      expect(screen.getByText(/Key Configured/i)).toBeInTheDocument();
      expect(screen.queryByText('+ Enter Gemini Key')).not.toBeInTheDocument();

      // 4. Showcase swaps CTA banner to active key status indicator
      expect(screen.queryByLabelText('Unlock Custom Deconstructions')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Active Gemini Key Status')).toBeInTheDocument();
      expect(screen.getByText('Gemini API Key Active')).toBeInTheDocument();
      expect(screen.getByText('Custom Generations Unlocked')).toBeInTheDocument();
    });

    it('clearing the key purges sessionStorage, closes modal, and reverts UI back to keyless state with both entry CTAs restored', () => {
      // Seed initial key
      sessionStorage.setItem('gemini_api_key', 'AIzaSyPreconfiguredKey_88888');

      render(<App />);

      // Initially active
      expect(screen.getByText(/Key Configured/i)).toBeInTheDocument();
      expect(screen.getByText('Gemini API Key Active')).toBeInTheDocument();

      // Open modal via header
      fireEvent.click(screen.getByText(/Key Configured/i));

      // Click Clear Key
      const clearBtn = screen.getByRole('button', { name: /Clear Key/i });
      fireEvent.click(clearBtn);

      // 1. Key purged from storage
      expect(sessionStorage.getItem('gemini_api_key')).toBeNull();
      expect(localStorage.getItem('gemini_api_key')).toBeNull();

      // 2. Modal closed
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage Session API Key')).not.toBeInTheDocument();

      // 3. Header CTA restored
      expect(screen.getByRole('button', { name: /\+ Enter Gemini Key/i })).toBeInTheDocument();
      expect(screen.getByText('+ Enter Gemini Key')).toBeInTheDocument();

      // 4. Showcase CTA banner restored
      expect(screen.getByLabelText('Unlock Custom Deconstructions')).toBeInTheDocument();
      expect(
        screen.getByText(/Enter your Gemini API key to craft custom exploded views/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Enter Gemini API key to craft custom exploded views/i })
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases & Defensive Hardening', () => {
    it('handles whitespace-only or empty string in sessionStorage by defaulting to keyless state', () => {
      sessionStorage.setItem('gemini_api_key', '    ');
      render(<App />);

      // Must NOT treat whitespace key as configured
      expect(screen.queryByText('Key Configured')).not.toBeInTheDocument();
      expect(screen.queryByText('Gemini API Key Active')).not.toBeInTheDocument();
      expect(screen.getByText('+ Enter Gemini Key')).toBeInTheDocument();
      expect(screen.getByLabelText('Unlock Custom Deconstructions')).toBeInTheDocument();
    });

    it('applies responsive layout classes to Header and Showcase CTAs to prevent mobile viewport overflow', () => {
      render(<App />);

      // Header CTA has responsive hidden class on the secondary badge
      const browseFreeBadge = screen.getByText(/Browse Free • Keyless Mode/i);
      expect(browseFreeBadge.className).toContain('hidden');
      expect(browseFreeBadge.className).toContain('sm:inline-block');

      // Showcase CTA button has responsive w-full sm:w-auto layout classes
      const showcaseCtaBtn = screen.getByRole('button', {
        name: /Enter Gemini API key to craft custom exploded views/i,
      });
      expect(showcaseCtaBtn.className).toContain('w-full');
      expect(showcaseCtaBtn.className).toContain('sm:w-auto');
    });

    it('keeps Sidebar, Header, and Showcase key state indicators fully synchronized', () => {
      sessionStorage.setItem('gemini_api_key', 'AIzaSySyncTestKey12345');
      render(<App />);

      // All 3 surfaces show active
      expect(screen.getByText(/Key Configured/i)).toBeInTheDocument();
      expect(screen.getByText('Gemini API Key Active')).toBeInTheDocument();
      expect(screen.getByText('Active (Tab Only)')).toBeInTheDocument();

      // Clear key via Header
      fireEvent.click(screen.getByText(/Key Configured/i));
      fireEvent.click(screen.getByRole('button', { name: /Clear Key/i }));

      // All 3 surfaces show unconfigured
      expect(screen.getByText('+ Enter Gemini Key')).toBeInTheDocument();
      expect(screen.getByLabelText('Unlock Custom Deconstructions')).toBeInTheDocument();
      expect(screen.getByText('Not Configured')).toBeInTheDocument();
    });

    it('gracefully handles sessionStorage SecurityError/exceptions (private mode / sandboxed iframes) without crashing and opens ApiKeyModal on custom generation', async () => {
      // Simulate environment where sessionStorage throws SecurityError on access
      const storageSpy = vi.spyOn(window.sessionStorage, 'getItem').mockImplementation((key: string) => {
        if (key === 'gemini_api_key') {
          throw new DOMException('Access to storage is denied in restricted sandboxes', 'SecurityError');
        }
        return null;
      });

      render(<App />);

      // App boots cleanly in keyless mode despite storage failure
      expect(screen.getByLabelText('Featured Community Deconstructions')).toBeInTheDocument();
      expect(screen.getByText('+ Enter Gemini Key')).toBeInTheDocument();

      // User types a prompt and clicks Explode It
      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Mechanical Watch' } });
      const submitBtn = screen.getByRole('button', { name: /Explode It/i });
      
      // Should NOT throw uncaught exception; should queue prompt and open modal
      expect(() => fireEvent.click(submitBtn)).not.toThrow();

      await waitFor(() => {
        expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();
      });
      expect(screen.getByText(/An API key is required to generate this custom exploded view/i)).toBeInTheDocument();

      storageSpy.mockRestore();
    });

    it('enforces accessible modal attributes and keyboard activation on showcase banner', async () => {
      render(<App />);

      const showcaseBanner = screen.getByLabelText('Unlock Custom Deconstructions');
      expect(showcaseBanner).toHaveAttribute('tabIndex', '0');

      // Pressing Enter on the banner opens the modal
      fireEvent.keyDown(showcaseBanner, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'api-key-modal-title');

      // Pressing Escape closes the modal
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});

