import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// 1. Automatically clean up rendered React components after each test
afterEach(() => {
  cleanup();
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
  vi.clearAllMocks();
});

// 2. Mock window.matchMedia for responsive UI components
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // legacy
      removeListener: vi.fn(), // legacy
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // 3. Mock URL.createObjectURL and URL.revokeObjectURL for Blob handling
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(
      (blob: Blob) => `blob:http://localhost:3000/${Math.random().toString(36).substring(2, 9)}`
    );
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn();
  }

  // 4. Mock window.scrollTo
  if (!window.scrollTo) {
    window.scrollTo = vi.fn();
  }
}
