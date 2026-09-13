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
  vi.restoreAllMocks();
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
  const mockCreateObjectURL = vi.fn(
    (blob?: Blob) => `blob:http://localhost:3000/${Math.random().toString(36).substring(2, 9)}`
  );
  const mockRevokeObjectURL = vi.fn();

  window.URL.createObjectURL = mockCreateObjectURL;
  window.URL.revokeObjectURL = mockRevokeObjectURL;

  if (typeof URL !== 'undefined') {
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;
  }

  // 4. Mock window.scrollTo
  window.scrollTo = vi.fn();
}
