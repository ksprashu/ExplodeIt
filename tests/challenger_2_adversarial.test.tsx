import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as Constants from '../constants';
import DisplayArea from '../components/DisplayArea';
import { GenerationItem, GenerationStatus, ComponentPart } from '../types';
import {
  mockCameraPlan,
  mockCameraComponents,
  mockCameraGenerationItem,
  DUMMY_PNG_DATA_URL
} from './mocks/mockGenerations';

describe('Challenger 2 Empirical Adversarial Suite (R2 & R3 Verification)', () => {
  const domains = ['PHYSICAL', 'BIOLOGICAL', 'CONCEPTUAL', 'SOFTWARE'] as const;

  describe('1. Negative Invariant Testing on PROMPTS.INFOGRAPHIC', () => {
    domains.forEach(domain => {
      it(`[${domain}] PROMPTS.INFOGRAPHIC strictly forbids 2D text, labels, leader lines, HUDs, and graphic callouts`, () => {
        const parts = ['Subsystem Alpha', 'Micro-Actuator', 'Optical Matrix', 'Chassis'];
        const prompt = Constants.PROMPTS.INFOGRAPHIC('Precision Device', 'Technical Studio', parts, domain, 'Exploded View');

        // Negative constraint assertions required by DISPATCH
        const promptLower = prompt.toLowerCase();
        
        // Assert that prompt explicitly forbids 2D text / labels / leader lines / HUDs
        const hasNegativeConstraint = 
          promptLower.includes('no 2d text') || 
          promptLower.includes('no labels') || 
          promptLower.includes('no leader lines') ||
          promptLower.includes('pristine 3d deconstruction') ||
          promptLower.includes('no 2d annotations');

        expect(hasNegativeConstraint, `Domain ${domain}: Prompt must strictly forbid 2D annotations/labels/leader lines`).toBe(true);
      });

      it(`[${domain}] PROMPTS.INFOGRAPHIC never contains obsolete "isometric leader callout lines" string`, () => {
        const parts = ['Component A', 'Component B'];
        const prompt = Constants.PROMPTS.INFOGRAPHIC('Test Object', 'Isometric 3D', parts, domain, 'Exploded View');

        expect(prompt.toLowerCase()).not.toContain('isometric leader callout lines');
      });
    });
  });

  describe('2. Negative Invariant Testing on PROMPTS.ASSEMBLED', () => {
    domains.forEach(domain => {
      it(`[${domain}] PROMPTS.ASSEMBLED strictly enforces 45° isometric perspective, 5600K lighting, and obsidian backdrop`, () => {
        const prompt = Constants.PROMPTS.ASSEMBLED('Object Item', 'Title Item', 'Context Description', domain);
        const promptLower = prompt.toLowerCase();

        expect(promptLower, `Domain ${domain}: Must enforce 45° isometric perspective`).toContain('45°');
        expect(promptLower, `Domain ${domain}: Must enforce 5600k lighting`).toContain('5600k');
        expect(promptLower, `Domain ${domain}: Must enforce obsidian backdrop`).toContain('obsidian');
      });

      it(`[${domain}] PROMPTS.ASSEMBLED never contains "holographic tablet" or "floating hologram" strings`, () => {
        const prompt = Constants.PROMPTS.ASSEMBLED('Object Item', 'Title Item', 'Context Description', domain);
        const promptLower = prompt.toLowerCase();

        expect(promptLower, `Domain ${domain}: Must never contain 'holographic tablet'`).not.toContain('holographic tablet');
        expect(promptLower, `Domain ${domain}: Must never contain 'floating hologram'`).not.toContain('floating hologram');
      });
    });
  });

  describe('3. DisplayArea.tsx UI Overlay Stress Testing', () => {
    const createTestItem = (componentsList: ComponentPart[]): GenerationItem => ({
      ...mockCameraGenerationItem,
      components: componentsList,
      plan: {
        ...mockCameraPlan,
        componentList: componentsList.map(c => c.name)
      },
      infographicUrl: DUMMY_PNG_DATA_URL,
      assembledUrl: DUMMY_PNG_DATA_URL,
      hasVideo: false,
      videoUrl: null
    });

    it('Edge Case: 0 components does not crash and renders clean infographic without overlay badges', () => {
      const itemWith0 = createTestItem([]);
      const { container } = render(<DisplayArea item={itemWith0} status={GenerationStatus.COMPLETED} />);

      // Infographic image must exist
      const img = screen.getByAltText('Infographic View');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', DUMMY_PNG_DATA_URL);

      // HUD Toggle button exists
      const hudBtn = screen.getByText(/HUD:\s*ON/i);
      expect(hudBtn).toBeInTheDocument();

      // No badges or lines should exist when activeParts.length === 0
      const badges = container.querySelectorAll('.group\\/badge');
      expect(badges.length).toBe(0);
      const lines = container.querySelectorAll('svg line');
      expect(lines.length).toBe(0);
    });

    it('Edge Case: 1 component calculates valid anchors without NaN and renders single badge', () => {
      const singleComp: ComponentPart = {
        name: 'Monolithic Core',
        composition: 'Pure Silicon',
        shortDescription: 'Single solid state core'
      };
      const itemWith1 = createTestItem([singleComp]);
      const { container } = render(<DisplayArea item={itemWith1} status={GenerationStatus.COMPLETED} />);

      const img = screen.getByAltText('Infographic View');
      expect(img).toBeInTheDocument();

      // Badge '01' must render
      expect(screen.getByText('01')).toBeInTheDocument();

      // SVG leader line must exist and have valid coordinates (no NaN)
      const line = container.querySelector('svg line');
      expect(line).toBeInTheDocument();
      const x1 = line?.getAttribute('x1');
      const y1 = line?.getAttribute('y1');
      const x2 = line?.getAttribute('x2');
      const y2 = line?.getAttribute('y2');

      expect(x1).not.toContain('NaN');
      expect(y1).not.toContain('NaN');
      expect(x2).not.toContain('NaN');
      expect(y2).not.toContain('NaN');
      expect(x1).toBe('15%');
      expect(y1).toBe('20%');
      expect(x2).toBe('35%');
      expect(y2).toBe('20%');
    });

    it('Edge Case: 20+ components (25 parts) renders all badges and lines without overflow or NaN', () => {
      const parts25: ComponentPart[] = Array.from({ length: 25 }, (_, i) => ({
        name: `Sub-Assembly Unit ${i + 1}`,
        composition: `Alloy ${i + 1}`,
        shortDescription: `Part number ${i + 1} functional specification`
      }));
      const itemWith25 = createTestItem(parts25);
      const { container } = render(<DisplayArea item={itemWith25} status={GenerationStatus.COMPLETED} />);

      // Check first, middle, and last badges
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('13')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();

      const lines = container.querySelectorAll('svg line');
      expect(lines.length).toBe(25);

      lines.forEach((line, idx) => {
        const x1 = line.getAttribute('x1');
        const y1 = line.getAttribute('y1');
        const x2 = line.getAttribute('x2');
        const y2 = line.getAttribute('y2');

        expect(x1).not.toContain('NaN');
        expect(y1).not.toContain('NaN');
        expect(x2).not.toContain('NaN');
        expect(y2).not.toContain('NaN');

        // Bounded within 0% to 100%
        const yVal = parseFloat(y1?.replace('%', '') || '0');
        expect(yVal).toBeGreaterThanOrEqual(20);
        expect(yVal).toBeLessThanOrEqual(80);
      });
    });

    it('HUD toggle functionality: toggles overlay visibility without altering underlying image element', () => {
      const item = createTestItem(mockCameraComponents);
      const { container } = render(<DisplayArea item={item} status={GenerationStatus.COMPLETED} />);

      // Initially HUD is ON
      const hudBtn = screen.getByText(/HUD:\s*ON/i);
      expect(hudBtn).toBeInTheDocument();

      const initialImg = screen.getByAltText('Infographic View');
      expect(initialImg).toBeInTheDocument();
      expect(initialImg).toHaveAttribute('src', DUMMY_PNG_DATA_URL);

      // Overlays should be present
      expect(container.querySelectorAll('.group\\/badge').length).toBe(mockCameraComponents.length);
      expect(container.querySelectorAll('svg line').length).toBe(mockCameraComponents.length);

      // Click HUD toggle
      fireEvent.click(hudBtn);

      // Button now says HUD: OFF
      expect(screen.getByText(/HUD:\s*OFF/i)).toBeInTheDocument();

      // Overlay badges and SVG lines must be removed
      expect(container.querySelectorAll('.group\\/badge').length).toBe(0);
      expect(container.querySelectorAll('svg line').length).toBe(0);

      // Underlying image must remain identical in DOM
      const imgAfter = screen.getByAltText('Infographic View');
      expect(imgAfter).toBe(initialImg);
      expect(imgAfter).toHaveAttribute('src', DUMMY_PNG_DATA_URL);

      // Toggle HUD back ON
      fireEvent.click(screen.getByText(/HUD:\s*OFF/i));
      expect(screen.getByText(/HUD:\s*ON/i)).toBeInTheDocument();
      expect(container.querySelectorAll('.group\\/badge').length).toBe(mockCameraComponents.length);
    });
  });
});
