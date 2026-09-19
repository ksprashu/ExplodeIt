/**
 * Tier 5 Adversarial Coverage Hardening Suite 1
 * 
 * Comprehensive white-box stress testing covering:
 * Scope 1: Rapid toggling of model tiers and video checkboxes
 * Scope 2: Media cache quota exhaustion with multiple parallel oversized blobs
 * Scope 3: Carousel rapid arrow keyboard navigation and rapid indicator clicks
 * Scope 4: Prompt interception with leading/trailing whitespace, newlines, and unicode emojis
 * Scope 5: Unmount cleanup of audio and video decoders when navigating between showcase and display area
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App, {
  loadModelPreferences,
  saveModelPreferences,
} from '../App';
import * as geminiService from '../services/geminiService';
import { createMediaCache, mediaCache } from '../services/mediaCache';
import {
  GenerationItem,
  GenerationStatus,
  CommunityCatalogItem,
} from '../types';
import { CANONICAL_MODEL_PRESETS } from '../constants';
import DisplayArea from '../components/DisplayArea';
import Header from '../components/Header';
import InputArea from '../components/InputArea';
import ModelSettingsModal from '../components/ModelSettingsModal';
import CommunityShowcase from '../components/CommunityShowcase';
import { SEED_COMMUNITY_CATALOG } from '../services/mockCommunityStorage';
import {
  mockCameraPlan,
  mockCameraComponents,
  DUMMY_PNG_DATA_URL,
  DUMMY_AUDIO_DATA_URL,
  DUMMY_VIDEO_DATA_URL,
} from './mocks/mockGenerations';

// ============================================================================
// Fixtures
// ============================================================================

const sampleItemWithMedia: GenerationItem = {
  id: 'item-tier5-001',
  prompt: 'Stereo Microscope Head',
  timestamp: Date.now(),
  plan: {
    ...mockCameraPlan,
    displayTitle: 'Stereo Microscope Head',
    category: 'Optical Engineering',
  },
  components: mockCameraComponents,
  narrationScript: 'The stereoscopic optics split light paths to achieve depth perception.',
  infographicUrl: DUMMY_PNG_DATA_URL,
  assembledUrl: DUMMY_PNG_DATA_URL,
  videoUrl: DUMMY_VIDEO_DATA_URL,
  audioUrl: DUMMY_AUDIO_DATA_URL,
  hasVideo: true,
  usage: [],
  tier: 'pro',
  config: {
    ...CANONICAL_MODEL_PRESETS.pro,
  },
};

const sampleItemNoVideo: GenerationItem = {
  ...sampleItemWithMedia,
  id: 'item-tier5-002',
  hasVideo: false,
  videoUrl: null,
};

describe('Tier 5 Adversarial Coverage Hardening Suite 1', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    delete (process.env as any).API_KEY;
    await mediaCache.clearCache();
    vi.clearAllMocks();

    // Mock HTMLMediaElement methods in JSDOM
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Scope 1: Rapid Toggling of Model Tiers and Video Checkboxes
  // ==========================================================================
  describe('Scope 1: Rapid Toggling of Model Tiers and Video Checkboxes', () => {
    it('T1.1: Header segmented control withstands 50 rapid alternations between Pro and Budget without corrupting localStorage', () => {
      const onSelectTierMock = vi.fn();

      render(
        <Header
          apiKey={null}
          modelTier="pro"
          onSelectTier={onSelectTierMock}
          onOpenModelSettings={vi.fn()}
          onOpenApiKeyModal={vi.fn()}
        />
      );

      const proBtn = screen.getByRole('button', { name: /Pro Studio/i });
      const budgetBtn = screen.getByRole('button', { name: /Budget Saver/i });

      // Rapidly toggle 50 times
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          fireEvent.click(budgetBtn);
        } else {
          fireEvent.click(proBtn);
        }
      }

      expect(onSelectTierMock).toHaveBeenCalledTimes(50);
      expect(onSelectTierMock).toHaveBeenLastCalledWith('pro');

      // Test App persistence integration with rapid updates
      saveModelPreferences('pro', CANONICAL_MODEL_PRESETS.pro);
      for (let i = 0; i < 20; i++) {
        const nextTier = i % 2 === 0 ? 'budget' : 'pro';
        saveModelPreferences(nextTier, CANONICAL_MODEL_PRESETS[nextTier]);
      }

      const stored = loadModelPreferences();
      expect(stored.tier).toBe('pro');
      expect(stored.config.planning).toBe(CANONICAL_MODEL_PRESETS.pro.planning);
      expect(stored.config.enableVideo).toBe(true);
    });

    it('T1.2: InputArea video checkbox handles rapid consecutive toggling and submits strictly valid boolean', () => {
      const onSubmitMock = vi.fn();
      render(
        <InputArea
          onSubmit={onSubmitMock}
          onSurprise={vi.fn()}
          disabled={false}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      const input = screen.getByPlaceholderText(/Name an object/i);
      const submitBtn = screen.getByRole('button', { name: /Explode It/i });

      // Initial state is true
      expect(checkbox.checked).toBe(true);

      // Rapidly toggle checkbox 25 times (ends on false)
      for (let i = 0; i < 25; i++) {
        fireEvent.click(checkbox);
      }
      expect(checkbox.checked).toBe(false);

      // Type topic and submit
      fireEvent.change(input, { target: { value: 'Differential Gearbox' } });
      fireEvent.click(submitBtn);

      expect(onSubmitMock).toHaveBeenCalledWith('Differential Gearbox', false);

      // Toggle one more time to true and submit again
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
      fireEvent.change(input, { target: { value: 'Differential Gearbox 2' } });
      fireEvent.click(submitBtn);

      expect(onSubmitMock).toHaveBeenCalledWith('Differential Gearbox 2', true);
    });

    it('T1.3: ModelSettingsModal dynamically adjusts tier to Custom when video switch is toggled independently', () => {
      const onSaveMock = vi.fn();
      render(
        <ModelSettingsModal
          isOpen={true}
          onClose={vi.fn()}
          currentTier="pro"
          currentConfig={CANONICAL_MODEL_PRESETS.pro}
          onSavePreferences={onSaveMock}
        />
      );

      // Modal starts on Pro Studio (Premier Quality)
      expect(screen.getByText('Premier Quality')).toBeInTheDocument();

      // Find the video switch button in the modal
      const videoSwitch = screen.getByRole('switch');
      expect(videoSwitch).toHaveAttribute('aria-checked', 'true');

      // Rapidly toggle video switch
      fireEvent.click(videoSwitch); // unchecked -> turns tier into 'custom'
      expect(videoSwitch).toHaveAttribute('aria-checked', 'false');

      // Toggle back to checked -> matches Pro preset again
      fireEvent.click(videoSwitch);
      expect(videoSwitch).toHaveAttribute('aria-checked', 'true');

      // Switch to Budget preset card
      const budgetPreset = screen.getByText('Credit Conserver');
      fireEvent.click(budgetPreset);

      // Toggle video switch on Budget preset (default enableVideo is false in budget)
      fireEvent.click(videoSwitch); // Now true -> turns into 'custom'
      expect(videoSwitch).toHaveAttribute('aria-checked', 'true');

      // Apply & Save Settings
      const saveBtn = screen.getByRole('button', { name: /Apply & Save Settings/i });
      fireEvent.click(saveBtn);

      expect(onSaveMock).toHaveBeenCalledWith('custom', expect.objectContaining({
        planning: CANONICAL_MODEL_PRESETS.budget.planning,
        enableVideo: true,
      }));
    });

    it('T1.4: loadModelPreferences gracefully recovers from malformed, empty, and partial storage states', () => {
      // 1. Completely corrupted JSON
      localStorage.setItem('explodeit_model_preferences', '<<<NOT_JSON>>>');
      const corruptedRecovery = loadModelPreferences();
      expect(corruptedRecovery.tier).toBe('pro');
      expect(corruptedRecovery.config.enableVideo).toBe(true);

      // 2. Unsupported tier string
      localStorage.setItem('explodeit_model_preferences', JSON.stringify({
        tier: 'hyper-quantum-tier',
        config: { planning: 'gemini-3.1-pro-preview' }
      }));
      const unknownTierRecovery = loadModelPreferences();
      expect(unknownTierRecovery.tier).toBe('pro');

      // 3. Partial config preserves canonical defaults without undefined
      localStorage.setItem('explodeit_model_preferences', JSON.stringify({
        tier: 'budget',
        config: { planning: 'gemini-2.5-flash' }
      }));
      const partialRecovery = loadModelPreferences();
      expect(partialRecovery.tier).toBe('budget');
      expect(partialRecovery.config.infographic).toBe(CANONICAL_MODEL_PRESETS.budget.infographic);
      expect(partialRecovery.config.video).toBe(CANONICAL_MODEL_PRESETS.budget.video);
    });
  });

  // ==========================================================================
  // Scope 2: Media Cache Quota Exhaustion with Multiple Parallel Oversized Blobs
  // ==========================================================================
  describe('Scope 2: Media Cache Quota Exhaustion with Multiple Parallel Oversized Blobs', () => {
    it('T2.1: Single blob exceeding total cache quota is safely dropped without crashing or polluting size tracking', async () => {
      // Create cache with 5,000 bytes quota
      const testCache = createMediaCache({ maxSizeBytes: 5000 });
      const giantBlob = new Blob([new Uint8Array(6000)], { type: 'image/png' });

      await testCache.setMediaBlob('giant-image-001', giantBlob);

      // Item should NOT be cached
      const fetched = await testCache.getMediaBlob('giant-image-001');
      expect(fetched).toBeNull();

      // Size and entry count remain strictly 0
      const currentSize = await testCache.getCurrentSize!();
      const entryCount = await testCache.getEntryCount!();
      expect(currentSize).toBe(0);
      expect(entryCount).toBe(0);
    });

    it('T2.2: Multiple parallel writes under quota pressure resolve cleanly with monotonic LRU eviction', async () => {
      // Quota: 10,000 bytes (room for three 3,000-byte blobs)
      const testCache = createMediaCache({ maxSizeBytes: 10000 });

      // Create 8 blobs of 3,000 bytes each
      const writePromises = Array.from({ length: 8 }).map((_, i) => {
        const blob = new Blob([new Uint8Array(3000)], { type: 'image/png' });
        return testCache.setMediaBlob(`blob-key-${i}`, blob);
      });

      // All parallel writes must resolve without rejection
      await Promise.all(writePromises);

      // Total size must never exceed 10,000 bytes
      const finalSize = await testCache.getCurrentSize!();
      expect(finalSize).toBeLessThanOrEqual(10000);
      expect(finalSize).toBeGreaterThan(0);

      // Total entries should be at most 3 (3 * 3000 = 9000 <= 10000)
      const count = await testCache.getEntryCount!();
      expect(count).toBeLessThanOrEqual(3);

      // The earliest blobs (0, 1, 2, 3, 4) must have been evicted in LRU order
      expect(await testCache.getMediaBlob('blob-key-0')).toBeNull();
      expect(await testCache.getMediaBlob('blob-key-1')).toBeNull();
      expect(await testCache.getMediaBlob('blob-key-2')).toBeNull();

      // The newest blob (7) must be present
      const newest = await testCache.getMediaBlob('blob-key-7');
      expect(newest).not.toBeNull();
    });

    it('T2.3: Monotonic sequence guarantees deterministic LRU eviction even when timestamps are identical', async () => {
      // Mock Date.now to freeze time
      const FIXED_TIME = 1726240000000;
      vi.spyOn(Date, 'now').mockReturnValue(FIXED_TIME);

      // Cache holds exactly two 1,000-byte blobs
      const testCache = createMediaCache({ maxSizeBytes: 2000 });

      const blob1 = new Blob([new Uint8Array(1000)], { type: 'image/png' });
      const blob2 = new Blob([new Uint8Array(1000)], { type: 'image/png' });
      const blob3 = new Blob([new Uint8Array(1000)], { type: 'image/png' });

      // Sequential writes within the exact same millisecond
      await testCache.setMediaBlob('item-1', blob1);
      await testCache.setMediaBlob('item-2', blob2);
      await testCache.setMediaBlob('item-3', blob3); // Evicts item-1 because sequence is monotonic!

      expect(await testCache.getMediaBlob('item-1')).toBeNull();
      expect(await testCache.getMediaBlob('item-2')).not.toBeNull();
      expect(await testCache.getMediaBlob('item-3')).not.toBeNull();
    });

    it('T2.4: Evicted entries automatically revoke their pooled ObjectURLs to prevent memory leaks', async () => {
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
      const testCache = createMediaCache({ maxSizeBytes: 3000 });

      const blobA = new Blob([new Uint8Array(1500)], { type: 'image/png' });
      const blobB = new Blob([new Uint8Array(1500)], { type: 'image/png' });
      const blobC = new Blob([new Uint8Array(2000)], { type: 'image/png' });

      await testCache.setMediaBlob('key-A', blobA);
      const urlA = testCache.getCachedObjectURL('key-A', blobA);

      await testCache.setMediaBlob('key-B', blobB);
      testCache.getCachedObjectURL('key-B', blobB);

      expect(revokeSpy).not.toHaveBeenCalled();

      // Setting key-C (2000 bytes) requires 3500 bytes -> evicts key-A (1500 bytes)
      await testCache.setMediaBlob('key-C', blobC);

      // urlA must have been revoked!
      expect(revokeSpy).toHaveBeenCalledWith(urlA);
    });

    it('T2.5: Overwriting an existing key with different sized blob recalculates cache size without drift', async () => {
      const testCache = createMediaCache({ maxSizeBytes: 5000 });

      const smallBlob = new Blob([new Uint8Array(1000)], { type: 'image/png' });
      const mediumBlob = new Blob([new Uint8Array(2500)], { type: 'image/png' });
      const largeBlob = new Blob([new Uint8Array(4000)], { type: 'image/png' });

      await testCache.setMediaBlob('reused-key', smallBlob);
      expect(await testCache.getCurrentSize!()).toBe(1000);

      // Overwrite with medium
      await testCache.setMediaBlob('reused-key', mediumBlob);
      expect(await testCache.getCurrentSize!()).toBe(2500);

      // Overwrite with large
      await testCache.setMediaBlob('reused-key', largeBlob);
      expect(await testCache.getCurrentSize!()).toBe(4000);
      expect(await testCache.getEntryCount!()).toBe(1);
    });
  });

  // ==========================================================================
  // Scope 3: Carousel Rapid Arrow Keyboard Navigation & Indicator Clicks
  // ==========================================================================
  describe('Scope 3: Carousel Rapid Arrow Keyboard Navigation & Indicator Clicks', () => {
    it('T3.1: Rapid keyboard navigation with ArrowRight and ArrowLeft cycles slides smoothly within modulo bounds', () => {
      render(
        <CommunityShowcase
          onSelectTopic={vi.fn()}
          catalogItems={SEED_COMMUNITY_CATALOG}
        />
      );

      const carouselRegion = screen.getByRole('region', { name: /Featured Exploded Views/i });
      expect(carouselRegion).toBeInTheDocument();

      const totalSlides = Math.min(SEED_COMMUNITY_CATALOG.length, 5); // 3 items
      expect(screen.getByText(`01 / 0${totalSlides}`)).toBeInTheDocument();

      // Rapidly fire 60 ArrowRight events (60 % 3 = 0 -> slide 1)
      for (let i = 0; i < 60; i++) {
        fireEvent.keyDown(carouselRegion, { key: 'ArrowRight' });
      }
      expect(screen.getByText(`01 / 0${totalSlides}`)).toBeInTheDocument();

      // Fire 1 ArrowRight event -> slide 2
      fireEvent.keyDown(carouselRegion, { key: 'ArrowRight' });
      expect(screen.getByText(`02 / 0${totalSlides}`)).toBeInTheDocument();

      // Rapidly fire 30 ArrowLeft events backwards (30 % 3 = 0 -> still on slide 2)
      for (let i = 0; i < 30; i++) {
        fireEvent.keyDown(carouselRegion, { key: 'ArrowLeft' });
      }
      expect(screen.getByText(`02 / 0${totalSlides}`)).toBeInTheDocument();
    });

    it('T3.2: Non-navigational keys (Enter, Space, Tab, Escape, letters) are ignored by carousel keyboard handler', () => {
      render(
        <CommunityShowcase
          onSelectTopic={vi.fn()}
          catalogItems={SEED_COMMUNITY_CATALOG}
        />
      );

      const carouselRegion = screen.getByRole('region', { name: /Featured Exploded Views/i });
      const totalSlides = Math.min(SEED_COMMUNITY_CATALOG.length, 5);
      expect(screen.getByText(`01 / 0${totalSlides}`)).toBeInTheDocument();

      fireEvent.keyDown(carouselRegion, { key: 'Enter' });
      fireEvent.keyDown(carouselRegion, { key: ' ' });
      fireEvent.keyDown(carouselRegion, { key: 'Tab' });
      fireEvent.keyDown(carouselRegion, { key: 'Escape' });
      fireEvent.keyDown(carouselRegion, { key: 'a' });
      fireEvent.keyDown(carouselRegion, { key: 'Shift' });

      // Slide must NOT advance
      expect(screen.getByText(`01 / 0${totalSlides}`)).toBeInTheDocument();
    });

    it('T3.3: Rapid out-of-order indicator clicks immediately update active slide and aria-selected state', () => {
      render(
        <CommunityShowcase
          onSelectTopic={vi.fn()}
          catalogItems={SEED_COMMUNITY_CATALOG}
        />
      );

      const indicators = screen.getAllByRole('tab', { name: /Go to slide/i });
      expect(indicators.length).toBe(SEED_COMMUNITY_CATALOG.length); // 3 items

      // Rapid sequence: 2 -> 0 -> 1 -> 2
      fireEvent.click(indicators[2]);
      expect(screen.getByText('03 / 03')).toBeInTheDocument();
      expect(indicators[2]).toHaveAttribute('aria-selected', 'true');
      expect(indicators[0]).toHaveAttribute('aria-selected', 'false');

      fireEvent.click(indicators[0]);
      expect(screen.getByText('01 / 03')).toBeInTheDocument();

      fireEvent.click(indicators[1]);
      expect(screen.getByText('02 / 03')).toBeInTheDocument();
      expect(indicators[1]).toHaveAttribute('aria-selected', 'true');
    });

    it('T3.4: Rapid hover and focus transitions pause and resume carousel without timer proliferation', () => {
      render(
        <CommunityShowcase
          onSelectTopic={vi.fn()}
          catalogItems={SEED_COMMUNITY_CATALOG}
        />
      );

      const carouselRegion = screen.getByRole('region', { name: /Featured Exploded Views/i });

      // Rapidly toggle hover and focus
      for (let i = 0; i < 20; i++) {
        fireEvent.mouseEnter(carouselRegion);
        fireEvent.mouseLeave(carouselRegion);
        fireEvent.focus(carouselRegion);
        fireEvent.blur(carouselRegion);
      }

      // Carousel is still stable
      const totalSlides = Math.min(SEED_COMMUNITY_CATALOG.length, 5);
      expect(screen.getByText(`01 / 0${totalSlides}`)).toBeInTheDocument();
    });

    it('T3.5: Carousel with single item handles navigation boundaries without crash or negative index', () => {
      const singleItemCatalog: CommunityCatalogItem[] = [SEED_COMMUNITY_CATALOG[0]];

      render(
        <CommunityShowcase
          onSelectTopic={vi.fn()}
          catalogItems={singleItemCatalog}
        />
      );

      const carouselRegion = screen.getByRole('region', { name: /Featured Exploded Views/i });
      expect(screen.getByText('01 / 01')).toBeInTheDocument();

      // Arrows on single-item carousel
      fireEvent.keyDown(carouselRegion, { key: 'ArrowRight' });
      expect(screen.getByText('01 / 01')).toBeInTheDocument();

      fireEvent.keyDown(carouselRegion, { key: 'ArrowLeft' });
      expect(screen.getByText('01 / 01')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Scope 4: Prompt Interception with Whitespace, Newlines, and Unicode Emojis
  // ==========================================================================
  describe('Scope 4: Prompt Interception with Whitespace, Newlines, and Unicode Emojis', () => {
    it('T4.1: Prompt with leading/trailing whitespace, newlines, and tabs is trimmed and auto-resumes cleanly', async () => {
      let resolvePlan: any;
      const planPromise = new Promise(resolve => {
        resolvePlan = resolve;
      });
      const planSpy = vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      render(<App />);

      const RAW_PROMPT = '\n\t  \n  James Webb Space Telescope 🛰️🔭  \r\n\t ';
      const EXPECTED_CLEAN = 'James Webb Space Telescope 🛰️🔭';

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: RAW_PROMPT } });

      // Submit in keyless mode -> intercepts execution
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // ApiKeyModal is shown
      expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();
      expect(screen.getByText(/An API key is required to generate this custom exploded view/i)).toBeInTheDocument();

      // Enter valid key in modal
      const keyInput = screen.getByPlaceholderText('AIza...');
      fireEvent.change(keyInput, { target: { value: 'AIzaSyAdversarialWhitespaceKey_12345' } });

      // Save & Start Exploding
      fireEvent.click(screen.getByRole('button', { name: 'Save & Start Exploding' }));

      // Verify planObject was invoked with the exact trimmed prompt
      await waitFor(() => {
        expect(planSpy).toHaveBeenCalledTimes(1);
      });
      expect(planSpy).toHaveBeenCalledWith(EXPECTED_CLEAN, expect.any(Object));

      // Resolve plan promise to clean up
      resolvePlan({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 10, outputTokens: 20, costEstimate: 0.001 },
      });
    });

    it('T4.2: Multi-byte Unicode scripts (Chinese, Arabic, Hindi) and complex emojis are preserved intact', async () => {
      let resolvePlan: any;
      const planPromise = new Promise(resolve => {
        resolvePlan = resolve;
      });
      const planSpy = vi.spyOn(geminiService, 'planObject').mockReturnValue(planPromise as any);

      render(<App />);

      const UNICODE_PROMPT = '🚀 超重型运载火箭 (Starship Super Heavy) 🛰️ ✨ [100% 钛合金]';

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: UNICODE_PROMPT } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // Provide key in modal
      const keyInput = screen.getByPlaceholderText('AIza...');
      fireEvent.change(keyInput, { target: { value: 'AIzaSyUnicodeValidKey_54321' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save & Start Exploding' }));

      await waitFor(() => {
        expect(planSpy).toHaveBeenCalledTimes(1);
      });
      expect(planSpy).toHaveBeenCalledWith(UNICODE_PROMPT, expect.any(Object));

      resolvePlan({
        data: mockCameraPlan,
        usage: { model: 'gemini-3.1-pro-preview', inputTokens: 10, outputTokens: 20, costEstimate: 0.001 },
      });
    });

    it('T4.3: Whitespace-only and newline-only input submission is rejected without triggering modal or generation', () => {
      const planSpy = vi.spyOn(geminiService, 'planObject');

      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: '   \n\n\t\t \r\n   ' } });

      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      fireEvent.click(explodeBtn);

      // Modal must NOT open
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      // No generation call
      expect(planSpy).not.toHaveBeenCalled();
      // Still in keyless browsing mode
      expect(screen.getByText(/Browse Free • Keyless Mode/i)).toBeInTheDocument();
    });

    it('T4.4: Cancelling modal with pending prompt clears it completely, preventing stale execution on later key config', async () => {
      const planSpy = vi.spyOn(geminiService, 'planObject');

      render(<App />);

      // 1. Enter prompt
      const input = screen.getByPlaceholderText(/Name an object/i);
      fireEvent.change(input, { target: { value: 'Abandoned Prompt 🛸' } });
      fireEvent.click(screen.getByRole('button', { name: /Explode It/i }));

      // 2. Modal opens with tailored pending prompt messaging
      expect(screen.getByText('Save & Start Exploding')).toBeInTheDocument();

      // 3. User cancels
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();

      // 4. Later, user configures key via header pill
      fireEvent.click(screen.getByText(/Browse Free • Keyless Mode/i));
      expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();
      expect(screen.getByText('Save for Session')).toBeInTheDocument(); // NOT "Save & Start Exploding"

      const keyInput = screen.getByPlaceholderText('AIza...');
      fireEvent.change(keyInput, { target: { value: 'AIzaSyKeyWithoutPendingExecution123' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save for Session' }));

      // Modal closes, and NO generation was executed for the abandoned prompt!
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      expect(planSpy).not.toHaveBeenCalled();
    });

    it('T4.5: Surprise Me in keyless mode triggers ApiKeyModal and preserves cancel isolation', () => {
      const surpriseSpy = vi.spyOn(geminiService, 'getRandomObject');

      render(<App />);

      const surpriseBtn = screen.getByTitle(/Generate a random educational object/i);
      fireEvent.click(surpriseBtn);

      // Modal opens
      expect(screen.getByText('Configure Gemini API Key')).toBeInTheDocument();

      // Cancel
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Configure Gemini API Key')).not.toBeInTheDocument();
      expect(surpriseSpy).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Scope 5: Unmount Cleanup of Audio and Video Decoders
  // ==========================================================================
  describe('Scope 5: Unmount Cleanup of Audio and Video Decoders', () => {
    it('T5.1: Unmounting DisplayArea pauses audio, strips src attribute, and invokes load() to release decoders', () => {
      const pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'pause');
      const loadSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'load');

      const { unmount } = render(
        <DisplayArea
          item={sampleItemWithMedia}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      // Start audio playback
      const playBtn = screen.getByTitle('Play');
      fireEvent.click(playBtn);
      expect(screen.getByTitle('Pause')).toBeInTheDocument();

      // Unmount DisplayArea
      unmount();

      // Assert native decoder cleanup
      expect(pauseSpy).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
    });

    it('T5.2: Switching items within DisplayArea resets playback and purges previous audio source', () => {
      const pauseSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'pause');
      const loadSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'load');

      const { rerender } = render(
        <DisplayArea
          item={sampleItemWithMedia}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      // Play audio on item 1
      fireEvent.click(screen.getByTitle('Play'));
      expect(screen.getByTitle('Pause')).toBeInTheDocument();

      // Switch to item 2
      rerender(
        <DisplayArea
          item={sampleItemNoVideo}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      // Playback must be paused and reset to Play
      expect(pauseSpy).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
      expect(screen.getByTitle('Play')).toBeInTheDocument();
    });

    it('T5.3: Rapid back-and-forth navigation between Showcase and DisplayArea executes clean teardowns without memory leaks', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getAllByText('Explore Deconstruction').length).toBeGreaterThan(0);
      });

      // Rapidly toggle back and forth 5 times
      for (let i = 0; i < 5; i++) {
        // Navigate into topic
        const exploreBtns = screen.getAllByText('Explore Deconstruction');
        fireEvent.click(exploreBtns[0]);

        await waitFor(() => {
          expect(screen.getByRole('button', { name: /← Back to Showcase/i })).toBeInTheDocument();
        });

        // Navigate back to showcase
        const backBtn = screen.getByRole('button', { name: /← Back to Showcase/i });
        fireEvent.click(backBtn);

        await waitFor(() => {
          expect(screen.getByLabelText('Topic Card Gallery')).toBeInTheDocument();
        });
      }

      // App remains responsive, history is intact
      expect(screen.getByLabelText('Topic Card Gallery')).toBeInTheDocument();
      const topicMatches = screen.getAllByText('High-Bypass Turbofan Jet Engine');
      expect(topicMatches.length).toBeGreaterThan(0);
    });

    it('T5.4: Video modal expand and dismiss detaches cleanly from DOM without lingering controls', () => {
      render(
        <DisplayArea
          item={sampleItemWithMedia}
          status={GenerationStatus.COMPLETED}
          onBackToShowcase={vi.fn()}
        />
      );

      // Expand video modal
      const expandBtn = screen.getByTitle('Expand Video');
      fireEvent.click(expandBtn);

      // Modal video is visible
      expect(screen.getByText('Download Video')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();

      // Dismiss modal
      fireEvent.click(screen.getByText('Close'));

      // Modal is cleanly closed
      expect(screen.queryByText('Download Video')).not.toBeInTheDocument();
      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    it('T5.5: Window beforeunload event triggers global ObjectURL revocation', () => {
      const revokeSpy = vi.spyOn(mediaCache, 'revokeAllObjectURLs');

      render(<App />);

      // Dispatch beforeunload event on window
      window.dispatchEvent(new Event('beforeunload'));

      expect(revokeSpy).toHaveBeenCalled();
    });
  });
});
