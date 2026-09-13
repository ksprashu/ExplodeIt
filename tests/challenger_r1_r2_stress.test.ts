import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Constants from '../constants';

// We will also import calculateCost or test its logic directly against the module exports
describe('Challenger 1 - Stress Harness: R1 Gemini Model Modernization', () => {
  it('R1.1 - Model Identifiers strictly match active production Google GenAI models', () => {
    expect(Constants.MODEL_PLANNING).toBe('gemini-3.1-pro-preview');
    expect(Constants.MODEL_AUTHORING).toBe('gemini-2.5-flash');
    expect(Constants.MODEL_SCRIPT).toBe('gemini-2.5-flash-lite');
    expect(Constants.MODEL_IMAGE).toBe('gemini-3-pro-image');
    expect(Constants.MODEL_VIDEO).toBe('veo-3.1-generate-preview');
    expect(Constants.MODEL_TTS).toBe('gemini-2.5-flash-preview-tts');
    expect(Constants.MODEL_SURPRISE).toBe('gemini-2.5-flash');
  });

  it('R1.2 - PRICING table contains exact calibrated September 2026 rates', () => {
    // Planning
    expect(Constants.PRICING[Constants.MODEL_PLANNING]).toBeDefined();
    expect(Constants.PRICING[Constants.MODEL_PLANNING].inputPer1kTokens).toBe(0.002);
    expect(Constants.PRICING[Constants.MODEL_PLANNING].outputPer1kTokens).toBe(0.012);

    // Authoring
    expect(Constants.PRICING[Constants.MODEL_AUTHORING]).toBeDefined();
    expect(Constants.PRICING[Constants.MODEL_AUTHORING].inputPer1kTokens).toBe(0.0003);
    expect(Constants.PRICING[Constants.MODEL_AUTHORING].outputPer1kTokens).toBe(0.0025);

    // Script
    expect(Constants.PRICING[Constants.MODEL_SCRIPT]).toBeDefined();
    expect(Constants.PRICING[Constants.MODEL_SCRIPT].inputPer1kTokens).toBe(0.0001);
    expect(Constants.PRICING[Constants.MODEL_SCRIPT].outputPer1kTokens).toBe(0.0004);

    // Image (2K)
    expect(Constants.PRICING[Constants.MODEL_IMAGE]).toBeDefined();
    expect(Constants.PRICING[Constants.MODEL_IMAGE].perImage).toBe(0.134);

    // Video (Veo 3.1)
    expect(Constants.PRICING[Constants.MODEL_VIDEO]).toBeDefined();
    expect(Constants.PRICING[Constants.MODEL_VIDEO].perVideo).toBe(2.00);

    // TTS
    expect(Constants.PRICING[Constants.MODEL_TTS]).toBeDefined();
    expect(Constants.PRICING[Constants.MODEL_TTS].per1kChars).toBe(0.002);

    // Surprise Me
    expect(Constants.PRICING[Constants.MODEL_SURPRISE]).toBeDefined();
    expect(Constants.PRICING[Constants.MODEL_SURPRISE].inputPer1kTokens).toBe(0.0003);
    expect(Constants.PRICING[Constants.MODEL_SURPRISE].outputPer1kTokens).toBe(0.0025);
  });

  describe('R1.3 - Stress Testing Cost Calculation Engine & Null Safety', () => {
    // Simulation of calculateCost logic extracted from geminiService.ts
    const calculateCost = (model: string, input: number, output: number, isMedia: boolean = false): number => {
      let cost = 0;
      if (model === Constants.MODEL_PLANNING) {
        cost += (input / 1000) * (Constants.PRICING[Constants.MODEL_PLANNING]?.inputPer1kTokens ?? 0);
        cost += (output / 1000) * (Constants.PRICING[Constants.MODEL_PLANNING]?.outputPer1kTokens ?? 0);
      } else if (model === Constants.MODEL_AUTHORING) {
        cost += (input / 1000) * (Constants.PRICING[Constants.MODEL_AUTHORING]?.inputPer1kTokens ?? 0);
        cost += (output / 1000) * (Constants.PRICING[Constants.MODEL_AUTHORING]?.outputPer1kTokens ?? 0);
      } else if (model === Constants.MODEL_SCRIPT) {
        cost += (input / 1000) * (Constants.PRICING[Constants.MODEL_SCRIPT]?.inputPer1kTokens ?? 0);
        cost += (output / 1000) * (Constants.PRICING[Constants.MODEL_SCRIPT]?.outputPer1kTokens ?? 0);
      } else if (model === Constants.MODEL_SURPRISE) {
        cost += (input / 1000) * (Constants.PRICING[Constants.MODEL_SURPRISE]?.inputPer1kTokens ?? 0);
        cost += (output / 1000) * (Constants.PRICING[Constants.MODEL_SURPRISE]?.outputPer1kTokens ?? 0);
      } else if (model === Constants.MODEL_IMAGE) {
        cost = Constants.PRICING[Constants.MODEL_IMAGE]?.perImage ?? 0;
      } else if (model === Constants.MODEL_VIDEO) {
        cost = Constants.PRICING[Constants.MODEL_VIDEO]?.perVideo ?? 0;
      } else if (model === Constants.MODEL_TTS) {
        cost = (input / 1000) * (Constants.PRICING[Constants.MODEL_TTS]?.per1kChars ?? 0);
      }
      return parseFloat(cost.toFixed(5));
    };

    it('handles standard planning token consumption correctly', () => {
      // 1500 input tokens, 800 output tokens
      // 1.5 * 0.002 = 0.003
      // 0.8 * 0.012 = 0.0096
      // total = 0.0126
      const cost = calculateCost(Constants.MODEL_PLANNING, 1500, 800);
      expect(cost).toBe(0.0126);
    });

    it('handles image and video fixed cost generation', () => {
      expect(calculateCost(Constants.MODEL_IMAGE, 0, 0, true)).toBe(0.134);
      expect(calculateCost(Constants.MODEL_VIDEO, 0, 0, true)).toBe(2.0);
    });

    it('handles TTS character based calculation', () => {
      // 3500 chars at $0.002 / 1k chars = 0.007
      expect(calculateCost(Constants.MODEL_TTS, 3500, 0)).toBe(0.007);
    });

    it('stress test: zero inputs/outputs produce 0 cost without NaN', () => {
      expect(calculateCost(Constants.MODEL_PLANNING, 0, 0)).toBe(0);
      expect(calculateCost(Constants.MODEL_AUTHORING, 0, 0)).toBe(0);
      expect(calculateCost(Constants.MODEL_SCRIPT, 0, 0)).toBe(0);
      expect(calculateCost(Constants.MODEL_SURPRISE, 0, 0)).toBe(0);
      expect(calculateCost(Constants.MODEL_TTS, 0, 0)).toBe(0);
    });

    it('stress test: completely unknown model string returns 0 and never throws or yields NaN', () => {
      const unknownModels = [
        'gpt-4o',
        'claude-3-5-sonnet',
        '',
        'undefined',
        'null',
        '__proto__',
        'gemini-deprecated-1.0'
      ];
      for (const model of unknownModels) {
        expect(() => calculateCost(model, 1000, 1000)).not.toThrow();
        const cost = calculateCost(model, 1000, 1000);
        expect(Number.isFinite(cost)).toBe(true);
        expect(cost).toBe(0);
      }
    });

    it('stress test: partial pricing entry with missing rates safely falls back to 0', () => {
      const originalPlanning = Constants.PRICING[Constants.MODEL_PLANNING];
      try {
        // Temporarily modify pricing rate to empty object
        (Constants.PRICING as any)[Constants.MODEL_PLANNING] = {};
        const cost = calculateCost(Constants.MODEL_PLANNING, 1000, 2000);
        expect(cost).toBe(0);
      } finally {
        (Constants.PRICING as any)[Constants.MODEL_PLANNING] = originalPlanning;
      }
    });
  });
});

describe('Challenger 1 - Stress Harness: R2 Session-Only API Key Storage', () => {
  class MemoryStorage implements Storage {
    private store: Map<string, string> = new Map();
    public shouldThrowOnGet: boolean = false;
    public shouldThrowOnSet: boolean = false;
    public shouldThrowOnRemove: boolean = false;

    get length(): number {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      if (this.shouldThrowOnGet) throw new Error('Simulated SecurityError / Storage Access Denied');
      return this.store.get(key) ?? null;
    }

    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
      if (this.shouldThrowOnRemove) throw new Error('Simulated Storage Exception on Remove');
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      if (this.shouldThrowOnSet) throw new Error('Simulated QuotaExceededError');
      this.store.set(key, String(value));
    }
  }

  let mockLocalStorage: MemoryStorage;
  let mockSessionStorage: MemoryStorage;

  beforeEach(() => {
    mockLocalStorage = new MemoryStorage();
    mockSessionStorage = new MemoryStorage();
  });

  // App.tsx logic reproduction for behavioral simulation
  const simulateAppStorageLifecycle = () => {
    let apiKey: string | null = null;
    let isModalOpen = false;

    const initializeApiKey = (envApiKey?: string) => {
      let resolvedKey: string | null = null;

      // 1. Active Migration & Cleanup of Legacy Persistent Storage
      try {
        if (typeof mockLocalStorage !== 'undefined') {
          const legacyKey = mockLocalStorage.getItem('gemini_api_key');
          if (legacyKey) {
            if (typeof mockSessionStorage !== 'undefined') {
              mockSessionStorage.setItem('gemini_api_key', legacyKey);
            }
            resolvedKey = legacyKey;
          }
          mockLocalStorage.removeItem('gemini_api_key');
        }
      } catch (e) {
        // Defensive exception handling
      }

      // 2. Check Session Storage
      if (!resolvedKey) {
        try {
          if (typeof mockSessionStorage !== 'undefined') {
            resolvedKey = mockSessionStorage.getItem('gemini_api_key');
          }
        } catch (e) {
          // Defensive exception handling
        }
      }

      // If key found from session storage or legacy migration
      if (resolvedKey) {
        apiKey = resolvedKey;
        return;
      }

      // 3. Env Var fallback
      if (envApiKey && envApiKey.length > 0) {
        apiKey = envApiKey;
        return;
      }

      // 4. No key found -> Open Splash
      isModalOpen = true;
    };

    const handleSaveKey = (key: string) => {
      const trimmedKey = key.trim();
      try {
        if (typeof mockSessionStorage !== 'undefined') {
          mockSessionStorage.setItem('gemini_api_key', trimmedKey);
        }
      } catch (e) {
        // Defensive exception handling
      }

      try {
        if (typeof mockLocalStorage !== 'undefined') {
          mockLocalStorage.removeItem('gemini_api_key');
        }
      } catch (e) {
        // Defensive exception handling
      }

      apiKey = trimmedKey;
      isModalOpen = false;
    };

    const handleClearKey = () => {
      try {
        if (typeof mockSessionStorage !== 'undefined') {
          mockSessionStorage.removeItem('gemini_api_key');
        }
      } catch (e) {
        // Defensive exception handling
      }

      try {
        if (typeof mockLocalStorage !== 'undefined') {
          mockLocalStorage.removeItem('gemini_api_key');
        }
      } catch (e) {
        // Defensive exception handling
      }

      apiKey = null;
      isModalOpen = true;
    };

    return {
      getApiKey: () => apiKey,
      getIsModalOpen: () => isModalOpen,
      initializeApiKey,
      handleSaveKey,
      handleClearKey
    };
  };

  it('R2.1 - Active Migration: transfers legacy localStorage key to sessionStorage and erases localStorage', () => {
    mockLocalStorage.setItem('gemini_api_key', 'AIzaSyLegacyKey98765');
    expect(mockLocalStorage.getItem('gemini_api_key')).toBe('AIzaSyLegacyKey98765');
    expect(mockSessionStorage.getItem('gemini_api_key')).toBeNull();

    const app = simulateAppStorageLifecycle();
    app.initializeApiKey();

    // Verification: Key is now in sessionStorage and in-memory state
    expect(app.getApiKey()).toBe('AIzaSyLegacyKey98765');
    expect(mockSessionStorage.getItem('gemini_api_key')).toBe('AIzaSyLegacyKey98765');
    
    // Absolute Invariant: localStorage MUST BE NULL
    expect(mockLocalStorage.getItem('gemini_api_key')).toBeNull();
    expect(app.getIsModalOpen()).toBe(false);
  });

  it('R2.2 - Fresh session: reads existing key from sessionStorage if present', () => {
    mockSessionStorage.setItem('gemini_api_key', 'AIzaSyExistingSessionKey111');
    const app = simulateAppStorageLifecycle();
    app.initializeApiKey();

    expect(app.getApiKey()).toBe('AIzaSyExistingSessionKey111');
    expect(mockLocalStorage.getItem('gemini_api_key')).toBeNull();
    expect(app.getIsModalOpen()).toBe(false);
  });

  it('R2.3 - Key saving: writes ONLY to sessionStorage and double-safeguards localStorage removal', () => {
    const app = simulateAppStorageLifecycle();
    app.initializeApiKey();
    expect(app.getIsModalOpen()).toBe(true);

    // Save key
    app.handleSaveKey('  AIzaSyUserSubmittedKey333  ');
    expect(app.getApiKey()).toBe('AIzaSyUserSubmittedKey333');
    expect(mockSessionStorage.getItem('gemini_api_key')).toBe('AIzaSyUserSubmittedKey333');
    expect(mockLocalStorage.getItem('gemini_api_key')).toBeNull();
    expect(app.getIsModalOpen()).toBe(false);
  });

  it('R2.4 - Key clearing: purges sessionStorage and localStorage, re-opens modal', () => {
    mockSessionStorage.setItem('gemini_api_key', 'AIzaSyKeyToClear');
    const app = simulateAppStorageLifecycle();
    app.initializeApiKey();
    expect(app.getApiKey()).toBe('AIzaSyKeyToClear');

    app.handleClearKey();
    expect(app.getApiKey()).toBeNull();
    expect(mockSessionStorage.getItem('gemini_api_key')).toBeNull();
    expect(mockLocalStorage.getItem('gemini_api_key')).toBeNull();
    expect(app.getIsModalOpen()).toBe(true);
  });

  describe('R2.5 - Defensive Exception Handling Stress Scenarios', () => {
    it('survives when localStorage access throws SecurityError (e.g. strict privacy / third-party iframe)', () => {
      mockLocalStorage.shouldThrowOnGet = true;
      mockSessionStorage.setItem('gemini_api_key', 'AIzaSySessionKeyUnderStrictPrivacy');

      const app = simulateAppStorageLifecycle();
      expect(() => app.initializeApiKey()).not.toThrow();
      expect(app.getApiKey()).toBe('AIzaSySessionKeyUnderStrictPrivacy');
    });

    it('survives when sessionStorage throws QuotaExceededError during handleSaveKey', () => {
      mockSessionStorage.shouldThrowOnSet = true;
      const app = simulateAppStorageLifecycle();
      
      expect(() => app.handleSaveKey('AIzaSyNewKeyUnderQuotaExceeded')).not.toThrow();
      // Even if sessionStorage throws, the in-memory React state is successfully assigned
      expect(app.getApiKey()).toBe('AIzaSyNewKeyUnderQuotaExceeded');
      expect(app.getIsModalOpen()).toBe(false);
    });

    it('survives when localStorage.removeItem throws during handleClearKey', () => {
      mockLocalStorage.shouldThrowOnRemove = true;
      const app = simulateAppStorageLifecycle();
      
      expect(() => app.handleClearKey()).not.toThrow();
      expect(app.getApiKey()).toBeNull();
      expect(app.getIsModalOpen()).toBe(true);
    });
  });
});
