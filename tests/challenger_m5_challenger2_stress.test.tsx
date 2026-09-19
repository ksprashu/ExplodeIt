import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App, {
  adaptCatalogItemToGenerationItem,
  loadModelPreferences,
  saveModelPreferences
} from '../App';
import * as geminiService from '../services/geminiService';
import * as communityStorage from '../services/communityStorage';
import { mediaCache } from '../services/mediaCache';
import {
  GenerationItem,
  GenerationStatus,
  CommunityCatalogItem,
  SanitizedGenerationBundle,
} from '../types';
import {
  mockCameraPlan,
  mockCameraComponents,
  mockCameraGenerationItem,
  DUMMY_PNG_DATA_URL,
  DUMMY_AUDIO_DATA_URL,
  DUMMY_VIDEO_DATA_URL,
} from './mocks/mockGenerations';
import DisplayArea from '../components/DisplayArea';
import ApiKeyModal from '../components/ApiKeyModal';
import Header from '../components/Header';
import { SEED_COMMUNITY_CATALOG } from '../services/mockCommunityStorage';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockCatalogTopic: CommunityCatalogItem = {
  id: 'challenger2-topic-001',
  topic: 'Turbofan Engine Bypass Core',
  timestamp: '2026-09-14T00:00:00.000Z',
  domain: 'PHYSICAL',
  metaphor: 'Concentric Fan Deconstruction',
  infographicUrl: 'https://community.explodeit.org/turbofan/infographic.png',
  assembledUrl: 'https://community.explodeit.org/turbofan/assembled.png',
  videoUrl: 'https://community.explodeit.org/turbofan/assembly.mp4',
  audioUrl: 'https://community.explodeit.org/turbofan/narration.mp3',
  previewUrl: 'https://community.explodeit.org/turbofan/preview.jpg',
};

const mockCompletedItemWithVideo: GenerationItem = {
  id: 'completed-item-video-001',
  prompt: 'Mechanical Watch Escapement',
  timestamp: Date.now(),
  plan: {
    ...mockCameraPlan,
    displayTitle: 'Mechanical Watch Escapement',
    category: 'Horological Engineering',
  },
  components: mockCameraComponents,
  narrationScript: 'The mechanical watch escapement meters energy from the mainspring.',
  infographicUrl: DUMMY_PNG_DATA_URL,
  assembledUrl: DUMMY_PNG_DATA_URL,
  videoUrl: DUMMY_VIDEO_DATA_URL,
  audioUrl: DUMMY_AUDIO_DATA_URL,
  hasVideo: true,
  usage: [],
  tier: 'pro',
  config: {
    planning: 'gemini-3.1-pro-preview',
    infographic: 'gemini-3-pro-image',
    assembled: 'gemini-3-pro-image',
    video: 'veo-3.1-generate-preview',
    narration: 'gemini-3.5-flash-lite',
    enableVideo: true,
  },
};

const mockCompletedItemWithoutVideo: GenerationItem = {
  ...mockCompletedItemWithVideo,
  id: 'completed-item-novideo-002',
  hasVideo: false,
  videoUrl: null,
};

describe('Challenger 2 - Empirical Adversarial Stress Suite: Milestone 5', () => {
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

  // ==========================================================================
  // Scope 1: Initial Startup Without Key & Modal Decoupling (Browse Free Mode)
  // ==========================================================================
  describe('Scope 1: Initial Startup Without Key & Modal Decoupling (Browse Free Mode)', () => {
    it('C1.1: App boots with zero API key into Browse Free Mode without opening ApiKeyModal', async () => {
      render(<App />);

      // 1. Header reflects Browse Free mode
      expect(screen.getByText(/Browse Free • Keyless Mode/i)).toBeInTheDocument();

      // 2. ApiKeyModal must NOT be open on initial load
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage Session API Key')).not.toBeInTheDocument();

      // 3. CommunityShowcase is rendered in main content area
      expect(screen.getByLabelText('Topic Card Gallery')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Search by title, domain, metaphor/i)).toBeInTheDocument();
    });

    it('C1.2: InputArea is fully enabled in Browse Free Mode (not disabled by missing API key)', async () => {
      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.disabled).toBe(false);

      const explodeButton = screen.getByRole('button', { name: /Explode It/i }) as HTMLButtonElement;
      expect(explodeButton).toBeInTheDocument();
    });

    it('C1.3: Legacy key in localStorage is safely migrated to sessionStorage and purged from disk', async () => {
      const LEGACY_KEY = 'AIzaSyLegacyKeyFromDisk1234567890';
      localStorage.setItem('gemini_api_key', LEGACY_KEY);

      render(<App />);

      // Legacy key migrated to sessionStorage
      expect(sessionStorage.getItem('gemini_api_key')).toBe(LEGACY_KEY);
      // Legacy key permanently eradicated from persistent localStorage
      expect(localStorage.getItem('gemini_api_key')).toBeNull();
      // Header reflects configured key
      expect(screen.getByText(/Key Configured/i)).toBeInTheDocument();
    });

    it('C1.4: Startup with existing sessionStorage key renders Showcase in Key Configured state without modal', async () => {
      const VALID_KEY = 'AIzaSyExistingValidSessionKey12345';
      sessionStorage.setItem('gemini_api_key', VALID_KEY);

      render(<App />);

      expect(screen.getByText(/Key Configured/i)).toBeInTheDocument();
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Topic Card Gallery')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Scope 2: Prompt Interception, Stashing & Auto-Resumption Pipeline
  // ==========================================================================
  describe('Scope 2: Prompt Interception, Stashing & Auto-Resumption Pipeline', () => {
    it('C2.1: Submitting custom prompt without key intercepts execution, stashes prompt, and opens ApiKeyModal with tailored messaging', async () => {
      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Quantum Cryocooler' } });

      const explodeButton = screen.getByRole('button', { name: /Explode It/i });
      fireEvent.click(explodeButton);

      // ApiKeyModal is now opened
      expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();

      // Tailored pending prompt message is displayed
      expect(
        screen.getByText(/An API key is required to generate this custom exploded view/i)
      ).toBeInTheDocument();

      // Primary submit button shows resumption CTA
      expect(screen.getByText('Save & Start Exploding')).toBeInTheDocument();
    });

    it('C2.2: Cancelling modal clears pending prompt without triggering any generation call', async () => {
      const planSpy = vi.spyOn(geminiService, 'planObject').mockResolvedValue({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      } as any);

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Turbofan Engine' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // Modal is open
      expect(screen.getByText('Save & Start Exploding')).toBeInTheDocument();

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      // Modal closes
      expect(screen.queryByText('Save & Start Exploding')).not.toBeInTheDocument();
      // No generation was started
      expect(planSpy).not.toHaveBeenCalled();
    });

    it('C2.3: Intercepted prompt auto-resumes end-to-end upon saving valid API key', async () => {
      let resolvePlan: any;
      const planPromise = new Promise(resolve => {
        resolvePlan = resolve;
      });
      const planSpy = vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      render(<App />);

      const TEST_PROMPT = 'Particle Accelerator RF Cavity';
      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: TEST_PROMPT } });

      // Submit without key -> modal opens
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // Enter valid key in modal
      const keyInput = screen.getByPlaceholderText('AIza...');
      fireEvent.change(keyInput, { target: { value: 'AIzaSyChallengerValidKey_99999' } });

      const submitBtn = screen.getByRole('button', { name: 'Save & Start Exploding' });
      fireEvent.click(submitBtn);

      // Verification of Auto-Resumption:
      // 1. Key was saved to sessionStorage
      expect(sessionStorage.getItem('gemini_api_key')).toBe('AIzaSyChallengerValidKey_99999');

      // 2. planObject was called exactly once with the queued prompt and stage config
      await waitFor(() => {
        expect(planSpy).toHaveBeenCalledTimes(1);
      });
      expect(planSpy).toHaveBeenCalledWith(TEST_PROMPT, expect.objectContaining({ enableVideo: true }));

      // 3. Modal is closed (not re-trapping user)
      expect(screen.queryByText(/An API key is required to generate this custom exploded view/i)).not.toBeInTheDocument();
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();

      // 4. Generation item created and rendered in sidebar Recent Explorations
      expect(screen.getByText(TEST_PROMPT)).toBeInTheDocument();

      // 5. Active generation status rendered
      expect(screen.getByText(/Planning/i)).toBeInTheDocument();

      // Clean up hanging promise
      resolvePlan({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 100, outputTokens: 200, costEstimate: 0.005 },
      });
    });

    it('C2.4: Clicking Surprise Me without API key intercepts and triggers ApiKeyModal', async () => {
      render(<App />);

      const surpriseBtn = screen.getByTitle(/Generate a random educational object/i);
      fireEvent.click(surpriseBtn);

      // ApiKeyModal is shown
      expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Scope 3: Non-Blocking Key Clearance & Zero Modal Trapping
  // ==========================================================================
  describe('Scope 3: Non-Blocking Key Clearance & Zero Modal Trapping', () => {
    it('C3.1: Clearing key purges session storage and transitions cleanly to keyless browsing without modal trapping', async () => {
      sessionStorage.setItem('gemini_api_key', 'AIzaSyConfiguredKey12345');

      render(<App />);

      // Header indicates key configured
      expect(screen.getByText(/Key Configured/i)).toBeInTheDocument();

      // Open settings via header pill
      fireEvent.click(screen.getByText(/Key Configured/i));

      // In modal, click "Clear Key"
      const clearBtn = screen.getByRole('button', { name: /Clear Key/i });
      fireEvent.click(clearBtn);

      // Verification: Key is purged from sessionStorage and localStorage
      expect(sessionStorage.getItem('gemini_api_key')).toBeNull();
      expect(localStorage.getItem('gemini_api_key')).toBeNull();

      // Verification: Modal is closed (isModalOpen is false), NOT trapped!
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      expect(screen.queryByText('Manage Session API Key')).not.toBeInTheDocument();

      // Header immediately updates to keyless mode
      expect(screen.getByText(/Browse Free • Keyless Mode/i)).toBeInTheDocument();

      // User is free to interact with the showcase
      expect(screen.getByLabelText('Topic Card Gallery')).toBeInTheDocument();
    });

    it('C3.2: ApiKeyModal provides explicit Close "×" button and Cancel button in all states', () => {
      const onCancelMock = vi.fn();
      const onSaveMock = vi.fn();

      // Render modal in unauthenticated state
      const { rerender } = render(
        <ApiKeyModal
          isOpen={true}
          onSave={onSaveMock}
          onCancel={onCancelMock}
          initialValue=""
        />
      );

      // Top-right close button exists and is clickable
      const closeButton = screen.getByLabelText('Close API Key modal');
      expect(closeButton).toBeInTheDocument();
      fireEvent.click(closeButton);
      expect(onCancelMock).toHaveBeenCalledTimes(1);

      // Cancel button exists and is clickable
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeInTheDocument();
      fireEvent.click(cancelButton);
      expect(onCancelMock).toHaveBeenCalledTimes(2);

      // Even with isSplash={true} (legacy backward compatibility), dismiss buttons MUST exist
      rerender(
        <ApiKeyModal
          isOpen={true}
          onSave={onSaveMock}
          onCancel={onCancelMock}
          initialValue=""
          isSplash={true}
        />
      );

      expect(screen.getByLabelText('Close API Key modal')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('C3.3: Clicking backdrop or pressing Escape dismisses ApiKeyModal safely', () => {
      const onCancelMock = vi.fn();

      const { container } = render(
        <ApiKeyModal
          isOpen={true}
          onSave={vi.fn()}
          onCancel={onCancelMock}
          initialValue=""
        />
      );

      // Backdrop is the fixed inset outer div
      const backdrop = container.querySelector('.fixed.inset-0');
      expect(backdrop).toBeInTheDocument();

      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onCancelMock).toHaveBeenCalledTimes(1);
      }

      // Escape key dismisses modal
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onCancelMock).toHaveBeenCalledTimes(2);
    });

    it('C3.4: Short (< 10 chars) or invalid keys keep submit button disabled', () => {
      render(
        <ApiKeyModal
          isOpen={true}
          onSave={vi.fn()}
          onCancel={vi.fn()}
          initialValue=""
        />
      );

      const input = screen.getByPlaceholderText('AIza...');
      const submitBtn = screen.getByRole('button', { name: 'Save for Session' });

      // Empty input -> disabled
      expect(submitBtn).toBeDisabled();

      // Short input (< 10 chars) -> disabled
      fireEvent.change(input, { target: { value: 'short' } });
      expect(submitBtn).toBeDisabled();

      // Valid length (> 10 chars) -> enabled
      fireEvent.change(input, { target: { value: 'AIzaSyValidLengthKey123' } });
      expect(submitBtn).not.toBeDisabled();
    });
  });

  // ==========================================================================
  // Scope 4: One-Click Showcase Topic Preload & Keyless Loading
  // ==========================================================================
  describe('Scope 4: One-Click Showcase Topic Preload & Keyless Loading', () => {
    it('C4.1: Clicking topic card in showcase preloads media and loads full deconstruction with zero API key', async () => {
      const preloadSpy = vi.spyOn(communityStorage, 'preloadCommunityTopicMedia').mockResolvedValue({
        infographicUrl: 'blob:http://localhost:3000/info-blob',
        assembledUrl: 'blob:http://localhost:3000/assembled-blob',
        videoUrl: 'blob:http://localhost:3000/video-blob',
        audioUrl: 'blob:http://localhost:3000/audio-blob',
      });

      const planSpy = vi.spyOn(geminiService, 'planObject');

      render(<App />);

      // Wait for catalog items to finish loading into the carousel
      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });

      const exploreBtn = screen.getAllByText('Explore Deconstruction')[0];
      fireEvent.click(exploreBtn);

      // Preload was invoked
      await waitFor(() => {
        expect(preloadSpy).toHaveBeenCalled();
      });

      // No Gemini API calls were made
      expect(planSpy).not.toHaveBeenCalled();

      // DisplayArea is mounted with topic content (first item sorted by timestamp is Turbofan Engine)
      await waitFor(() => {
        expect(screen.getAllByText('High-Bypass Turbofan Jet Engine').length).toBeGreaterThan(0);
      });

      // Verification: Breadcrumb bar is present
      expect(screen.getByText(/← Back to Community Showcase/i)).toBeInTheDocument();
    });

    it('C4.2: adaptCatalogItemToGenerationItem synthesizes comprehensive blueprint when bundle is missing', () => {
      const adapted = adaptCatalogItemToGenerationItem(
        mockCatalogTopic,
        {
          infographicUrl: mockCatalogTopic.infographicUrl,
          assembledUrl: mockCatalogTopic.assembledUrl,
          videoUrl: mockCatalogTopic.videoUrl,
          audioUrl: mockCatalogTopic.audioUrl,
        },
        null // No remote bundle
      );

      expect(adapted.id).toBe(mockCatalogTopic.id);
      expect(adapted.prompt).toBe(mockCatalogTopic.topic);
      expect(adapted.plan).not.toBeNull();
      expect(adapted.plan?.displayTitle).toBe(mockCatalogTopic.topic);
      expect(adapted.plan?.category).toContain('Mechanical');
      expect(adapted.plan?.detailedArticle).toContain(mockCatalogTopic.topic);
      expect(adapted.components.length).toBe(4);
      expect(adapted.hasVideo).toBe(true);
      expect(adapted.tier).toBe('pro');
    });

    it('C4.3: adaptCatalogItemToGenerationItem adopts full manifest bundle when provided', () => {
      const mockBundle: SanitizedGenerationBundle = {
        manifest: {
          id: 'custom-bundle-001',
          topic: 'Laser Interferometer',
          timestamp: '2026-09-14T01:00:00.000Z',
          domain: 'PHYSICAL',
          metaphor: 'Optical Resonator Split',
          modelTier: 'pro',
          modelsUsed: { planning: 'gemini-3.1-pro-preview' },
        },
        plan: mockCameraPlan,
        components: mockCameraComponents,
        narrationScript: 'Custom voice narration script',
        media: {
          infographicBlob: new Blob(['info'], { type: 'image/png' }),
          assembledBlob: new Blob(['asm'], { type: 'image/png' }),
          audioBlob: new Blob(['aud'], { type: 'audio/mp3' }),
        },
      };

      const adapted = adaptCatalogItemToGenerationItem(
        mockCatalogTopic,
        {
          infographicUrl: 'blob:url1',
          assembledUrl: 'blob:url2',
          audioUrl: 'blob:url3',
        },
        mockBundle
      );

      expect(adapted.plan?.displayTitle).toBe(mockCameraPlan.displayTitle);
      expect(adapted.components).toEqual(mockCameraComponents);
      expect(adapted.narrationScript).toBe('Custom voice narration script');
      expect(adapted.tier).toBe('pro');
    });

    it('C4.4: Rapid multiple clicks on topic cards resolve idempotently without duplicating history', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });

      const exploreBtns = screen.getAllByText('Explore Deconstruction');
      // Rapid fire clicks
      fireEvent.click(exploreBtns[0]);
      fireEvent.click(exploreBtns[0]);
      fireEvent.click(exploreBtns[0]);

      await waitFor(() => {
        expect(screen.getAllByText('High-Bypass Turbofan Jet Engine').length).toBeGreaterThan(0);
      });

      // Sidebar should have the item in history without duplicate entries
      const sidebarItems = screen.getAllByText('High-Bypass Turbofan Jet Engine');
      expect(sidebarItems.length).toBeLessThanOrEqual(3);
    });
  });

  // ==========================================================================
  // Scope 5: Dual Navigation ("Back to Showcase") & History Retention
  // ==========================================================================
  describe('Scope 5: Dual Navigation ("Back to Showcase") & History Retention', () => {
    it('C5.1: Header "← Back to Showcase" returns view to CommunityShowcase and preserves history in Sidebar', async () => {
      render(<App />);

      // 1. Wait for carousel items
      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });

      // 2. Select a showcase item
      const exploreBtn = screen.getAllByText('Explore Deconstruction')[0];
      fireEvent.click(exploreBtn);

      await waitFor(() => {
        expect(screen.getAllByText('High-Bypass Turbofan Jet Engine').length).toBeGreaterThan(0);
      });

      // 3. Header now shows "← Back to Showcase" button
      let headerBackBtn: HTMLElement;
      await waitFor(() => {
        headerBackBtn = screen.getByRole('button', { name: /← Back to Showcase/i });
        expect(headerBackBtn).toBeInTheDocument();
      });

      // 4. Click "← Back to Showcase"
      fireEvent.click(headerBackBtn!);

      // 5. View returns to CommunityShowcase
      await waitFor(() => {
        expect(screen.getByLabelText('Topic Card Gallery')).toBeInTheDocument();
      });

      // 6. History in Sidebar retains the previously viewed topic
      const historyItems = screen.getAllByText('High-Bypass Turbofan Jet Engine');
      expect(historyItems.length).toBeGreaterThan(0);

      // 7. User can re-click history item to navigate back to DisplayArea
      fireEvent.click(historyItems[0]);
      await waitFor(() => {
        expect(screen.getByText(/← Back to Community Showcase/i)).toBeInTheDocument();
      });
    });

    it('C5.2: DisplayArea breadcrumb "← Back to Community Showcase" navigates home smoothly', async () => {
      render(<App />);

      // Wait for carousel items
      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });

      // Select item
      fireEvent.click(screen.getAllByText('Explore Deconstruction')[0]);

      // Wait for DisplayArea breadcrumb button to mount
      let breadcrumbBackBtn: HTMLElement;
      await waitFor(() => {
        breadcrumbBackBtn = screen.getByRole('button', { name: /← Back to Community Showcase/i });
        expect(breadcrumbBackBtn).toBeInTheDocument();
      });

      // Click breadcrumb back button
      fireEvent.click(breadcrumbBackBtn!);

      // View returns to CommunityShowcase
      await waitFor(() => {
        expect(screen.getByLabelText('Topic Card Gallery')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Scope 6: Effective Status Resolution & Assembled Image Thumbnail Visibility
  // ==========================================================================
  describe('Scope 6: Effective Status Resolution & Assembled Image Thumbnail Visibility', () => {
    it('C6.1: DisplayArea renders Assembled Object thumbnail in top header slot when viewing completed item with video', () => {
      render(
        <DisplayArea
          item={mockCompletedItemWithVideo}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      // Assembled image thumbnail is rendered in header slot
      const assembledImg = screen.getByAltText('Assembled Object');
      expect(assembledImg).toBeInTheDocument();
      expect(assembledImg.getAttribute('src')).toBe(DUMMY_PNG_DATA_URL);

      // ASSEMBLED badge is present
      expect(screen.getByText('ASSEMBLED')).toBeInTheDocument();
    });

    it('C6.2: When status is IDLE but item is complete, DisplayArea still renders assembled image thumbnail', () => {
      // Direct simulation of effectiveStatus logic:
      // In App.tsx: effectiveStatus = isItemComplete ? GenerationStatus.COMPLETED : status
      // Even if raw status is IDLE, renderHeaderImage checks (status === COMPLETED || status === IDLE)
      render(
        <DisplayArea
          item={mockCompletedItemWithVideo}
          status={GenerationStatus.IDLE}
          onBackToShowcase={vi.fn()}
        />
      );

      const assembledImg = screen.getByAltText('Assembled Object');
      expect(assembledImg).toBeInTheDocument();
      expect(screen.getByText('ASSEMBLED')).toBeInTheDocument();
    });

    it('C6.3: When item has NO video, assembled thumbnail in header is omitted (rendered in left slot instead)', () => {
      render(
        <DisplayArea
          item={mockCompletedItemWithoutVideo}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      // The header assembled thumbnail with "ASSEMBLED" badge is NOT rendered
      expect(screen.queryByText('ASSEMBLED')).not.toBeInTheDocument();

      // Instead, assembled image is rendered in the left media slot
      const assembledViewImg = screen.getByAltText('Assembled View');
      expect(assembledViewImg).toBeInTheDocument();
      expect(assembledViewImg.getAttribute('src')).toBe(DUMMY_PNG_DATA_URL);
    });

    it('C6.4: During active generation stages (e.g. PLANNING/Blueprinting), effectiveStatus is NOT prematurely marked COMPLETED', async () => {
      // Generate infographic hangs indefinitely to observe active generation status
      let resolvePlan: any;
      const planPromise = new Promise(resolve => {
        resolvePlan = resolve;
      });
      vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      // Seed valid key in session
      sessionStorage.setItem('gemini_api_key', 'AIzaSyChallengerActiveStatusKey123');

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Active System Test' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // Wait for active generation state (Planning)
      await waitFor(() => {
        expect(screen.getByText(/Planning/i)).toBeInTheDocument();
      });

      // Header assembled thumbnail should NOT be present
      expect(screen.queryByAltText('Assembled Object')).not.toBeInTheDocument();
      expect(screen.queryByText('ASSEMBLED')).not.toBeInTheDocument();

      // Resolve to clean up hanging promise
      resolvePlan({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 10, outputTokens: 10, costEstimate: 0.001 },
      });
    });
  });
});
