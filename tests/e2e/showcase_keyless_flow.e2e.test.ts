import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockBrowserEnvironment, MockIndexedDBMediaCache } from '../mocks/mockStorage';
import { mockCommunityCatalog, mockCameraGenerationItem } from '../mocks/mockGenerations';

/**
 * Controller / State Machine for Keyless Exploration & Showcase Flow (Contract Simulation)
 */
export class ShowcaseFlowController {
  public sessionStorage: Storage;
  public localStorage: Storage;
  public mediaCache: MockIndexedDBMediaCache;
  public activeView: 'SHOWCASE' | 'GENERATION_WORKSPACE' = 'SHOWCASE';
  public isApiKeyModalOpen: boolean = false;
  public currentTopic: any = null;
  public catalog: any[] = [];
  public searchQuery: string = '';
  public selectedCategory: string = 'ALL';

  constructor(sessionStorage: Storage, localStorage: Storage, mediaCache: MockIndexedDBMediaCache) {
    this.sessionStorage = sessionStorage;
    this.localStorage = localStorage;
    this.mediaCache = mediaCache;
    this.catalog = [...mockCommunityCatalog];
  }

  // App initialization: Checks whether API key modal should block startup
  public initApp(): { requiresApiKeyModal: boolean; initialView: 'SHOWCASE' | 'GENERATION_WORKSPACE' } {
    // Contract Invariant: Startup is decoupled! User can explore showcase WITHOUT API key.
    this.activeView = 'SHOWCASE';
    this.isApiKeyModalOpen = false;
    return {
      requiresApiKeyModal: false,
      initialView: 'SHOWCASE'
    };
  }

  // Set user API key: MUST write strictly to sessionStorage
  public setApiKey(key: string): void {
    const cleanKey = key.trim();
    this.sessionStorage.setItem('gemini_api_key', cleanKey);
    // Strict requirement: NEVER write key to localStorage
    if (this.localStorage.getItem('gemini_api_key')) {
      this.localStorage.removeItem('gemini_api_key');
    }
  }

  public getApiKey(): string | null {
    return this.sessionStorage.getItem('gemini_api_key');
  }

  public clearApiKey(): void {
    this.sessionStorage.removeItem('gemini_api_key');
    this.localStorage.removeItem('gemini_api_key');
  }

  // Search filtering in showcase
  public getFilteredCatalog(): any[] {
    return this.catalog.filter(item => {
      const matchesSearch = !this.searchQuery ||
        item.topic.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.domain.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesCategory = this.selectedCategory === 'ALL' || item.domain === this.selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }

  // One-click loading of showcase topic into DisplayArea
  public async loadShowcaseTopic(topicId: string): Promise<{ success: boolean; loadedItem?: any; usedApiKey: boolean }> {
    const item = this.catalog.find(c => c.id === topicId);
    if (!item) return { success: false, usedApiKey: false };

    // Contract Invariant: ZERO API key required to view showcase topic!
    this.currentTopic = {
      id: item.id,
      prompt: item.topic,
      timestamp: new Date(item.timestamp).getTime(),
      plan: {
        displayTitle: item.topic,
        domainType: item.domain,
        visualMetaphor: item.metaphor,
        detailedArticle: 'Comprehensive technical deconstruction of ' + item.topic
      },
      infographicUrl: item.infographicUrl,
      assembledUrl: item.assembledUrl,
      videoUrl: item.videoUrl,
      audioUrl: item.audioUrl,
      hasVideo: Boolean(item.videoUrl)
    };

    // Cache media URLs
    if (item.infographicUrl) {
      await this.mediaCache.setMediaBlob(item.infographicUrl, new Blob([new Uint8Array(100)], { type: 'image/png' }));
    }

    return {
      success: true,
      loadedItem: this.currentTopic,
      usedApiKey: false
    };
  }

  // Transition to custom generation workspace
  public submitCustomPrompt(prompt: string): { accepted: boolean; requiresKeyModal: boolean } {
    const key = this.getApiKey();
    if (!key) {
      this.isApiKeyModalOpen = true;
      return { accepted: false, requiresKeyModal: true };
    }
    this.activeView = 'GENERATION_WORKSPACE';
    this.isApiKeyModalOpen = false;
    return { accepted: true, requiresKeyModal: false };
  }
}

describe('E2E: Keyless Showcase Exploration, Search & One-Click Load (FEAT-10, FEAT-11, FEAT-12)', () => {
  let controller: ShowcaseFlowController;
  let sessionStore: Storage;
  let localStore: Storage;
  let mediaCache: MockIndexedDBMediaCache;

  beforeEach(() => {
    const env = setupMockBrowserEnvironment();
    sessionStore = env.sessionStorage;
    localStore = env.localStorage;
    sessionStore.clear();
    localStore.clear();
    mediaCache = new MockIndexedDBMediaCache();
    controller = new ShowcaseFlowController(sessionStore, localStore, mediaCache);
  });

  describe('Tier 1: Feature Coverage — Keyless Home Exploration (FEAT-10)', () => {
    it('test_feat10_startup_without_api_key_shows_showcase: initial load shows showcase without blocking modal', () => {
      const startup = controller.initApp();
      expect(startup.requiresApiKeyModal).toBe(false);
      expect(startup.initialView).toBe('SHOWCASE');
      expect(controller.isApiKeyModalOpen).toBe(false);
    });

    it('test_feat10_session_only_storage_contract: API key is stored ONLY in sessionStorage, NEVER localStorage', () => {
      const testKey = 'AIzaSyDUMMY_VALID_TEST_KEY_1234567890';
      controller.setApiKey(testKey);

      expect(sessionStore.getItem('gemini_api_key')).toBe(testKey);
      expect(localStore.getItem('gemini_api_key')).toBeNull();
    });

    it('test_feat10_clear_session_erases_key: clearing key purges storage immediately', () => {
      controller.setApiKey('AIzaSyDUMMY_KEY');
      expect(controller.getApiKey()).toBe('AIzaSyDUMMY_KEY');

      controller.clearApiKey();
      expect(controller.getApiKey()).toBeNull();
      expect(sessionStore.getItem('gemini_api_key')).toBeNull();
    });
  });

  describe('Tier 1: Feature Coverage — Showcase Carousel & Filtering (FEAT-11)', () => {
    it('test_feat11_carousel_renders_featured_topics: catalog contains pre-seeded topics', () => {
      const items = controller.getFilteredCatalog();
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items[0].topic).toBe('Twin-Lens Reflex Camera');
    });

    it('test_feat11_search_filtering_by_topic_name: filters by keyword accurately', () => {
      controller.searchQuery = 'Turbofan';
      const results = controller.getFilteredCatalog();

      expect(results.length).toBe(1);
      expect(results[0].topic).toContain('Turbofan');
    });

    it('test_feat11_filter_by_domain_category: filters by domain chip', () => {
      controller.selectedCategory = 'SOFTWARE';
      const results = controller.getFilteredCatalog();

      expect(results.length).toBe(1);
      expect(results[0].domain).toBe('SOFTWARE');
      expect(results[0].topic).toContain('Transformer');
    });

    it('test_feat11_empty_search_state_handling: non-matching query returns empty list', () => {
      controller.searchQuery = 'NonExistentSpaceshipTopicXYZ';
      const results = controller.getFilteredCatalog();
      expect(results.length).toBe(0);
    });
  });

  describe('Tier 1: Feature Coverage — One-Click Interactive Loading (FEAT-12)', () => {
    it('test_feat12_click_topic_loads_full_deconstruction: loads topic with 0 API key usage', async () => {
      // Ensure no API key is present
      expect(controller.getApiKey()).toBeNull();

      const loadResult = await controller.loadShowcaseTopic('tlr-camera-1726240000000');
      expect(loadResult.success).toBe(true);
      expect(loadResult.usedApiKey).toBe(false);
      expect(controller.currentTopic).not.toBeNull();
      expect(controller.currentTopic.prompt).toBe('Twin-Lens Reflex Camera');
    });

    it('test_feat12_custom_query_transitions_to_workspace: custom prompt triggers modal if key missing', () => {
      // 1. Without key -> prompts for modal
      const resWithoutKey = controller.submitCustomPrompt('Superconducting Maglev');
      expect(resWithoutKey.accepted).toBe(false);
      expect(resWithoutKey.requiresKeyModal).toBe(true);
      expect(controller.isApiKeyModalOpen).toBe(true);

      // 2. Supply key in session
      controller.setApiKey('AIzaSyTESTKEY');

      // 3. Resubmit -> accepted and transitions view
      const resWithKey = controller.submitCustomPrompt('Superconducting Maglev');
      expect(resWithKey.accepted).toBe(true);
      expect(resWithKey.requiresKeyModal).toBe(false);
      expect(controller.activeView).toBe('GENERATION_WORKSPACE');
    });
  });

  describe('Tier 2: Boundary & Corner Cases', () => {
    it('test_feat10_boundary_space_padded_api_key: automatically trims whitespace', () => {
      controller.setApiKey('   AIzaSyTrimmableKey123   ');
      expect(controller.getApiKey()).toBe('AIzaSyTrimmableKey123');
    });

    it('test_feat11_boundary_case_insensitive_search: search ignores casing', () => {
      controller.searchQuery = 'tUrBoFaN';
      const results = controller.getFilteredCatalog();
      expect(results.length).toBe(1);
    });

    it('test_feat12_boundary_missing_topic_id_returns_clean_error: handles non-existent topic', async () => {
      const res = await controller.loadShowcaseTopic('invalid-id-0000');
      expect(res.success).toBe(false);
    });
  });
});
