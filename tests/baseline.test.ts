import { describe, it, expect } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Contract import: Test that Vite path alias '@/*' resolves cleanly in test harness
import { MODEL_PLANNING, PRICING, DEFAULT_PLACEHOLDER } from '@/constants';
import { GenerationStatus } from '@/types';

// Simple interactive component using React.createElement to verify React 19 state & event dispatch in .ts file
const TestCounter: React.FC<{ initialCount?: number; label?: string }> = ({
  initialCount = 0,
  label = 'Counter',
}) => {
  const [count, setCount] = useState(initialCount);

  return React.createElement(
    'div',
    { 'data-testid': 'test-counter', className: 'p-4 border rounded-lg' },
    React.createElement('h2', { 'data-testid': 'counter-label' }, label),
    React.createElement('p', { 'data-testid': 'counter-value' }, `Current count: ${count}`),
    React.createElement(
      'button',
      {
        'data-testid': 'increment-btn',
        onClick: () => setCount((prev) => prev + 1),
        className: 'px-3 py-1 bg-blue-500 text-white rounded',
      },
      'Increment'
    )
  );
};

describe('Baseline Test Harness Verification', () => {
  it('Tier 1: JavaScript/TypeScript & Async Runtime executes correctly', async () => {
    const sum = 1 + 2;
    expect(sum).toBe(3);
    expect([1, 2, 3]).toHaveLength(3);
    expect({ name: 'ExplodeIt' }).toEqual({ name: 'ExplodeIt' });

    const resolveValue = await Promise.resolve('operational');
    expect(resolveValue).toBe('operational');
  });

  it('Tier 2: JSDOM Environment & Browser Primitives operate inside Node', () => {
    expect(window).toBeDefined();
    expect(document).toBeDefined();
    expect(document.body).toBeDefined();

    const el = document.createElement('div');
    el.textContent = 'DOM Working';
    document.body.appendChild(el);
    expect(document.body.textContent).toContain('DOM Working');
    document.body.removeChild(el);

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    expect(mql).toBeDefined();
    expect(mql.matches).toBe(false);
    expect(typeof mql.addEventListener).toBe('function');
  });

  it('Tier 3: React 19 Component Rendering mounts cleanly into DOM', () => {
    const { container } = render(
      React.createElement(TestCounter, { label: 'ExplodeIt Harness', initialCount: 10 })
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('Tier 4: Testing Library Queries & Jest-DOM Matchers assert elements', () => {
    render(React.createElement(TestCounter, { label: 'ExplodeIt Matchers', initialCount: 5 }));

    const banner = screen.getByTestId('test-counter');
    expect(banner).toBeInTheDocument();

    const label = screen.getByTestId('counter-label');
    expect(label).toHaveTextContent('ExplodeIt Matchers');

    const value = screen.getByTestId('counter-value');
    expect(value).toHaveTextContent('Current count: 5');
  });

  it('Tier 5: Event Simulation & React 19 State Mutations update correctly', () => {
    render(React.createElement(TestCounter, { label: 'Click Test', initialCount: 0 }));

    const value = screen.getByTestId('counter-value');
    const button = screen.getByTestId('increment-btn');

    expect(value).toHaveTextContent('Current count: 0');
    fireEvent.click(button);
    expect(value).toHaveTextContent('Current count: 1');
    fireEvent.click(button);
    expect(value).toHaveTextContent('Current count: 2');
  });

  it('Tier 6: Web Storage & ObjectURL Polyfills function properly', () => {
    const blob = new Blob(['sample data'], { type: 'text/plain' });
    const objectUrl = URL.createObjectURL(blob);

    expect(objectUrl).toBeDefined();
    expect(typeof objectUrl).toBe('string');
    expect(objectUrl).toMatch(/^blob:/);
    expect(() => URL.revokeObjectURL(objectUrl)).not.toThrow();

    sessionStorage.setItem('test_key', 'session_value');
    expect(sessionStorage.getItem('test_key')).toBe('session_value');

    localStorage.setItem('test_local', 'local_value');
    expect(localStorage.getItem('test_local')).toBe('local_value');
  });

  it('Tier 7: Project Path Alias & Contract Imports resolve without error', () => {
    expect(MODEL_PLANNING).toBeDefined();
    expect(typeof MODEL_PLANNING).toBe('string');
    expect(PRICING[MODEL_PLANNING]).toBeDefined();
    expect(PRICING[MODEL_PLANNING].inputPer1kTokens).toBeGreaterThan(0);
    expect(DEFAULT_PLACEHOLDER).toContain('picsum.photos');

    expect(GenerationStatus.IDLE).toBe('IDLE');
    expect(GenerationStatus.COMPLETED).toBe('COMPLETED');
    expect(GenerationStatus.FAILED).toBe('FAILED');
  });
});
