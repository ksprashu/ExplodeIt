import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import {
  CommunityShowcase,
  resolveItemCategory,
  resolveItemModelTier,
  resolveComponentCount,
  getCategoryBadgeClasses,
  SHOWCASE_CATEGORIES,
} from '../components/CommunityShowcase';
import { CommunityCatalogItem } from '../types';
import * as communityStorage from '../services/communityStorage';
import { SEED_COMMUNITY_CATALOG } from '../services/mockCommunityStorage';

// ============================================================================
// Comprehensive Adversarial Fixture Dataset
// ============================================================================

const comprehensiveMockCatalog: CommunityCatalogItem[] = [
  {
    id: 'camera-001',
    topic: 'Twin-Lens Reflex Camera',
    timestamp: '2026-09-14T00:00:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Precision Glass & Gears',
    infographicUrl: 'https://community.explodeit.org/camera-001/infographic.png',
    assembledUrl: 'https://community.explodeit.org/camera-001/assembled.png',
    videoUrl: 'https://community.explodeit.org/camera-001/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/camera-001/narration.mp3',
    previewUrl: 'https://community.explodeit.org/camera-001/preview.jpg',
  },
  {
    id: 'engine-002',
    topic: 'High-Bypass Turbofan Jet Engine',
    timestamp: '2026-09-14T00:05:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Aero Compression Tunnel',
    infographicUrl: 'https://community.explodeit.org/engine-002/infographic.png',
    assembledUrl: 'https://community.explodeit.org/engine-002/assembled.png',
    videoUrl: 'https://community.explodeit.org/engine-002/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/engine-002/narration.mp3',
    previewUrl: 'https://community.explodeit.org/engine-002/preview.jpg',
  },
  {
    id: 'heart-003',
    topic: 'Human Heart Anatomy',
    timestamp: '2026-09-14T00:10:00.000Z',
    domain: 'BIOLOGICAL',
    metaphor: 'Quad-Chamber Hydraulic Pump',
    infographicUrl: 'https://community.explodeit.org/heart-003/infographic.png',
    assembledUrl: 'https://community.explodeit.org/heart-003/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/heart-003/narration.mp3',
    previewUrl: 'https://community.explodeit.org/heart-003/preview.jpg',
  },
  {
    id: 'transformer-004',
    topic: 'Transformer Attention Architecture',
    timestamp: '2026-09-14T00:15:00.000Z',
    domain: 'SOFTWARE',
    metaphor: 'Self-Attention Highway',
    infographicUrl: 'https://community.explodeit.org/transformer-004/infographic.png',
    assembledUrl: 'https://community.explodeit.org/transformer-004/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/transformer-004/narration.mp3',
    previewUrl: 'https://community.explodeit.org/transformer-004/preview.jpg',
  },
  {
    id: 'quantum-005',
    topic: 'Superconducting Quantum Qubit Cavity',
    timestamp: '2026-09-14T00:20:00.000Z',
    domain: 'CONCEPTUAL',
    metaphor: 'Cryogenic Coherence Chamber',
    infographicUrl: 'https://community.explodeit.org/quantum-005/infographic.png',
    assembledUrl: 'https://community.explodeit.org/quantum-005/assembled.png',
    videoUrl: 'https://community.explodeit.org/quantum-005/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/quantum-005/narration.mp3',
    previewUrl: 'https://community.explodeit.org/quantum-005/preview.jpg',
  },
  {
    id: 'thermos-budget-006',
    topic: 'Vacuum Insulated Thermos Bottle',
    timestamp: '2026-09-14T00:25:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Double-Wall Thermal Barrier',
    infographicUrl: 'https://community.explodeit.org/thermos-006/infographic.png',
    assembledUrl: 'https://community.explodeit.org/thermos-006/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/thermos-006/narration.mp3',
    previewUrl: 'https://community.explodeit.org/thermos-006/preview.jpg',
  },
  {
    id: 'unicode-007',
    topic: 'Café Prêt-à-Porter 🚀 & 100% Ultra-Zoom!',
    timestamp: '2026-09-14T00:30:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Accented Éclair & Rocket [Special:Chars]',
    infographicUrl: 'https://community.explodeit.org/unicode-007/infographic.png',
    assembledUrl: 'https://community.explodeit.org/unicode-007/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/unicode-007/narration.mp3',
    previewUrl: 'https://community.explodeit.org/unicode-007/preview.jpg',
  },
];

describe('Challenger M5 Adversarial Stress Suite: CommunityShowcase', () => {
  let onSelectTopicMock: ReturnType<typeof vi.fn<(item: CommunityCatalogItem) => void>>;

  beforeEach(() => {
    onSelectTopicMock = vi.fn<(item: CommunityCatalogItem) => void>();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: SEARCH FILTERING ADVERSARIAL STRESS-TESTS
  // ==========================================================================
  describe('Scope 1: Search Filtering Adversarial Stress-Tests', () => {
    it('S1.1 - Case Insensitivity: matches identical items across all lowercase, all uppercase, and mixed/alternating case', () => {
      const { unmount } = render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
      const gallery = screen.getByLabelText('Topic Card Gallery');

      // 1. Lowercase search
      fireEvent.change(searchInput, { target: { value: 'turbofan' } });
      expect(within(gallery).getByText('High-Bypass Turbofan Jet Engine')).toBeInTheDocument();
      expect(within(gallery).queryByText('Human Heart Anatomy')).not.toBeInTheDocument();

      // 2. Uppercase search
      fireEvent.change(searchInput, { target: { value: 'TURBOFAN' } });
      expect(within(gallery).getByText('High-Bypass Turbofan Jet Engine')).toBeInTheDocument();

      // 3. Alternating case search
      fireEvent.change(searchInput, { target: { value: 'tUrBoFaN' } });
      expect(within(gallery).getByText('High-Bypass Turbofan Jet Engine')).toBeInTheDocument();

      unmount();
    });

    it('S1.2 - Whitespace and Empty Queries: trims leading/trailing spaces and preserves full catalog on empty/whitespace input', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
      const gallery = screen.getByLabelText('Topic Card Gallery');

      // Padded spaces around query
      fireEvent.change(searchInput, { target: { value: '   Twin-Lens   ' } });
      expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
      expect(within(gallery).queryByText('Human Heart Anatomy')).not.toBeInTheDocument();

      // Whitespace only: should match everything (query.length === 0 after trim)
      fireEvent.change(searchInput, { target: { value: '     \t\n   ' } });
      expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
      expect(within(gallery).getByText('Human Heart Anatomy')).toBeInTheDocument();
      expect(within(gallery).getByText('Transformer Attention Architecture')).toBeInTheDocument();
    });

    it('S1.3 - Regex Metacharacters and Punctuation: safely processes regex special chars without throwing SyntaxError', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
      const gallery = screen.getByLabelText('Topic Card Gallery');

      // Test bracket expressions and regex operators
      const regexChars = ['.*', '(', '[', '\\', '+', '?', '^', '$', '{', '}', '.*+?^${}()|[]\\'];
      for (const charStr of regexChars) {
        expect(() => {
          fireEvent.change(searchInput, { target: { value: charStr } });
        }).not.toThrow();
      }

      // Exact special characters match in unicode item: "[Special:Chars]"
      fireEvent.change(searchInput, { target: { value: '[Special:Chars]' } });
      expect(within(gallery).getByText(/Café Prêt-à-Porter/i)).toBeInTheDocument();
      expect(within(gallery).queryByText('Twin-Lens Reflex Camera')).not.toBeInTheDocument();
    });

    it('S1.4 - Unicode, Non-ASCII, and Emoji Queries: accurately filters accented characters, emojis, and symbols', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
      const gallery = screen.getByLabelText('Topic Card Gallery');

      // Emoji search: 🚀
      fireEvent.change(searchInput, { target: { value: '🚀' } });
      expect(within(gallery).getByText(/Café Prêt-à-Porter/i)).toBeInTheDocument();
      expect(within(gallery).queryByText('Human Heart Anatomy')).not.toBeInTheDocument();

      // Accented characters: "Prêt"
      fireEvent.change(searchInput, { target: { value: 'prêt' } });
      expect(within(gallery).getByText(/Café Prêt-à-Porter/i)).toBeInTheDocument();

      // Percentage and punctuation: "100%"
      fireEvent.change(searchInput, { target: { value: '100%' } });
      expect(within(gallery).getByText(/Café Prêt-à-Porter/i)).toBeInTheDocument();
    });

    it('S1.5 - Rapid Keypress Sequences: handles rapid successive query mutations without state tearing', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
      const gallery = screen.getByLabelText('Topic Card Gallery');

      // Simulate typing "quantum" keystroke by keystroke
      const keystrokes = ['q', 'qu', 'qua', 'quan', 'quant', 'quantu', 'quantum'];
      keystrokes.forEach((stroke) => {
        fireEvent.change(searchInput, { target: { value: stroke } });
      });

      expect(within(gallery).getByText('Superconducting Quantum Qubit Cavity')).toBeInTheDocument();
      expect(within(gallery).queryByText('Twin-Lens Reflex Camera')).not.toBeInTheDocument();

      // Clear button '✕' appears and functions
      const clearInputBtn = screen.getByRole('button', { name: /Clear search query/i });
      fireEvent.click(clearInputBtn);

      expect(searchInput).toHaveValue('');
      expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
      expect(within(gallery).getByText('Superconducting Quantum Qubit Cavity')).toBeInTheDocument();
    });

    it('S1.6 - Substring Multi-Field Matches: matches on domain, metaphor, or category keywords', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
      const gallery = screen.getByLabelText('Topic Card Gallery');

      // Metaphor match: "Hydraulic Pump" in Human Heart
      fireEvent.change(searchInput, { target: { value: 'Hydraulic Pump' } });
      expect(within(gallery).getByText('Human Heart Anatomy')).toBeInTheDocument();
      expect(within(gallery).queryByText('Twin-Lens Reflex Camera')).not.toBeInTheDocument();

      // Category match: "Anatomy" matches heart because category name matches
      fireEvent.change(searchInput, { target: { value: 'Anatomy' } });
      expect(within(gallery).getByText('Human Heart Anatomy')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SECTION 2: CATEGORY FILTERING STRESS-TESTS
  // ==========================================================================
  describe('Scope 2: Category Filtering Stress-Tests', () => {
    it('S2.1 - Category Count Invariant: verifies each category tab badge count strictly matches classified catalog items', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      // Compute expected counts directly from resolveItemCategory
      const expectedCounts: Record<string, number> = {
        All: comprehensiveMockCatalog.length,
        Mechanical: 0,
        Anatomy: 0,
        Electronics: 0,
        Science: 0,
        Everyday: 0,
      };

      comprehensiveMockCatalog.forEach((item) => {
        const cat = resolveItemCategory(item);
        expectedCounts[cat] = (expectedCounts[cat] || 0) + 1;
      });

      // Verify each tab contains the exact count badge
      SHOWCASE_CATEGORIES.forEach((cat) => {
        const tab = screen.getByRole('tab', { name: new RegExp(cat, 'i') });
        expect(tab).toBeInTheDocument();
        const countText = expectedCounts[cat].toString();
        expect(within(tab).getByText(countText)).toBeInTheDocument();
      });

      // Total count across all specific categories equals All count
      const sumCategories =
        expectedCounts.Mechanical +
        expectedCounts.Anatomy +
        expectedCounts.Electronics +
        expectedCounts.Science +
        expectedCounts.Everyday;
      expect(sumCategories).toBe(expectedCounts.All);
    });

    it('S2.2 - Category Switching Isolation: switching categories strictly renders items of that category and hides others', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const gallery = screen.getByLabelText('Topic Card Gallery');

      // 1. Click Mechanical
      fireEvent.click(screen.getByRole('tab', { name: /Mechanical/i }));
      expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
      expect(within(gallery).getByText('High-Bypass Turbofan Jet Engine')).toBeInTheDocument();
      expect(within(gallery).queryByText('Human Heart Anatomy')).not.toBeInTheDocument();
      expect(within(gallery).queryByText('Transformer Attention Architecture')).not.toBeInTheDocument();

      // 2. Click Anatomy
      fireEvent.click(screen.getByRole('tab', { name: /Anatomy/i }));
      expect(within(gallery).getByText('Human Heart Anatomy')).toBeInTheDocument();
      expect(within(gallery).queryByText('Twin-Lens Reflex Camera')).not.toBeInTheDocument();

      // 3. Click Electronics
      fireEvent.click(screen.getByRole('tab', { name: /Electronics/i }));
      expect(within(gallery).getByText('Transformer Attention Architecture')).toBeInTheDocument();
      expect(within(gallery).queryByText('Human Heart Anatomy')).not.toBeInTheDocument();

      // 4. Click Science
      fireEvent.click(screen.getByRole('tab', { name: /Science/i }));
      expect(within(gallery).getByText('Superconducting Quantum Qubit Cavity')).toBeInTheDocument();
      expect(within(gallery).queryByText('Twin-Lens Reflex Camera')).not.toBeInTheDocument();

      // 5. Click Everyday
      fireEvent.click(screen.getByRole('tab', { name: /Everyday/i }));
      expect(within(gallery).getByText('Vacuum Insulated Thermos Bottle')).toBeInTheDocument();
      expect(within(gallery).queryByText('High-Bypass Turbofan Jet Engine')).not.toBeInTheDocument();

      // 6. Return to All
      fireEvent.click(screen.getByRole('tab', { name: /All/i }));
      expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
      expect(within(gallery).getByText('Human Heart Anatomy')).toBeInTheDocument();
      expect(within(gallery).getByText('Transformer Attention Architecture')).toBeInTheDocument();
      expect(within(gallery).getByText('Superconducting Quantum Qubit Cavity')).toBeInTheDocument();
    });

    it('S2.3 - Intersecting Search and Category Filtering: correctly computes intersection and preserves query across tabs', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
      const gallery = screen.getByLabelText('Topic Card Gallery');

      // Filter by Mechanical, then search for "camera"
      fireEvent.click(screen.getByRole('tab', { name: /Mechanical/i }));
      fireEvent.change(searchInput, { target: { value: 'camera' } });

      expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();

      // Switch tab to Anatomy while search "camera" is active -> should yield 0 matches
      fireEvent.click(screen.getByRole('tab', { name: /Anatomy/i }));
      expect(screen.getByText('No deconstructions found')).toBeInTheDocument();
      expect(searchInput).toHaveValue('camera');

      // Switch back to Mechanical -> camera reappears
      fireEvent.click(screen.getByRole('tab', { name: /Mechanical/i }));
      expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SECTION 3: CAROUSEL MECHANICS STRESS-TESTS
  // ==========================================================================
  describe('Scope 3: Carousel Mechanics Stress-Tests', () => {
    it('S3.1 - Autoplay Progression: advances slides every 6000ms and wraps around to beginning', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      // Initially on slide 1
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();

      // Advance by 6000ms -> slide 2
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(screen.getByText(/02 \/ 05/)).toBeInTheDocument();

      // Advance by 6000ms -> slide 3
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(screen.getByText(/03 \/ 05/)).toBeInTheDocument();

      // Advance through remaining slides: slide 4, slide 5, then wrap to slide 1
      act(() => {
        vi.advanceTimersByTime(6000); // -> slide 4
      });
      expect(screen.getByText(/04 \/ 05/)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(6000); // -> slide 5
      });
      expect(screen.getByText(/05 \/ 05/)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(6000); // -> wraps to slide 1
      });
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();
    });

    it('S3.2 - Hover Pause & Resume: freezes autoplay on mouseEnter and resumes on mouseLeave', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const carousel = screen.getByRole('region', { name: /Featured Exploded Views/i });
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();

      // Hover over carousel
      fireEvent.mouseEnter(carousel);

      // Advance time by 18,000ms (3 intervals) -> should NOT advance while hovered
      act(() => {
        vi.advanceTimersByTime(18000);
      });
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();

      // Mouse leave -> should resume
      fireEvent.mouseLeave(carousel);

      // Advance by 6000ms -> should now advance to slide 2
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(screen.getByText(/02 \/ 05/)).toBeInTheDocument();
    });

    it('S3.3 - Keyboard Focus Pause & Blur Resume: freezes autoplay on focus and resumes on blur', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const carousel = screen.getByRole('region', { name: /Featured Exploded Views/i });
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();

      // Focus carousel
      fireEvent.focus(carousel);

      // Advance time by 12,000ms -> should NOT advance while focused
      act(() => {
        vi.advanceTimersByTime(12000);
      });
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();

      // Blur carousel
      fireEvent.blur(carousel);

      // Advance by 6000ms -> advances to slide 2
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(screen.getByText(/02 \/ 05/)).toBeInTheDocument();
    });

    it('S3.4 - Arrow Key Navigation & Wrap-Around: navigates with ArrowLeft/ArrowRight and wraps bounds', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const carousel = screen.getByRole('region', { name: /Featured Exploded Views/i });
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();

      // From slide 1 (idx 0), press ArrowLeft -> wraps to slide 5 (idx 4)
      fireEvent.keyDown(carousel, { key: 'ArrowLeft' });
      expect(screen.getByText(/05 \/ 05/)).toBeInTheDocument();

      // From slide 5, press ArrowRight -> wraps back to slide 1
      fireEvent.keyDown(carousel, { key: 'ArrowRight' });
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();

      // Advance to slide 2 with ArrowRight
      fireEvent.keyDown(carousel, { key: 'ArrowRight' });
      expect(screen.getByText(/02 \/ 05/)).toBeInTheDocument();

      // Non-arrow keys (e.g. Tab, Escape, ArrowDown) do not change slide
      fireEvent.keyDown(carousel, { key: 'Escape' });
      expect(screen.getByText(/02 \/ 05/)).toBeInTheDocument();
      fireEvent.keyDown(carousel, { key: 'ArrowDown' });
      expect(screen.getByText(/02 \/ 05/)).toBeInTheDocument();
    });

    it('S3.5 - Indicator Pill Clicks: jumps directly to selected slide', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      // Click pill for slide 4
      const slide4Pill = screen.getByRole('tab', { name: /Go to slide 4/i });
      fireEvent.click(slide4Pill);
      expect(screen.getByText(/04 \/ 05/)).toBeInTheDocument();

      // Click pill for slide 1
      const slide1Pill = screen.getByRole('tab', { name: /Go to slide 1/i });
      fireEvent.click(slide1Pill);
      expect(screen.getByText(/01 \/ 05/)).toBeInTheDocument();
    });

    it('S3.6 - Single Item Invariant: does not start interval timer if only 1 featured item exists', () => {
      const singleItemCatalog = [comprehensiveMockCatalog[0]];
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={singleItemCatalog}
          isLoading={false}
        />
      );

      // Counter indicates 1 of 1
      expect(screen.getByText(/01 \/ 01/)).toBeInTheDocument();

      // Advance timers by 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Still on slide 1 with 0 errors
      expect(screen.getByText(/01 \/ 01/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SECTION 4: EMPTY STATE & RESET STRESS-TESTS
  // ==========================================================================
  describe('Scope 4: Empty State & Reset Stress-Tests', () => {
    it('S4.1 - Empty State Trigger and Full Reset: displays friendly empty state and restores all items via button', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);

      // Select category and input impossible search
      fireEvent.click(screen.getByRole('tab', { name: /Anatomy/i }));
      fireEvent.change(searchInput, { target: { value: 'XylophoneNonexistent' } });

      // Empty state card appears
      expect(screen.getByText('No deconstructions found')).toBeInTheDocument();
      expect(screen.getByText(/No community models matched “XylophoneNonexistent” in the Anatomy category/i)).toBeInTheDocument();
      expect(screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 0 of 7 topics')).toBeInTheDocument();

      // Click "Clear Filters & Search"
      const clearBtn = screen.getByRole('button', { name: /Clear Filters & Search/i });
      fireEvent.click(clearBtn);

      // Input value is cleared
      expect(searchInput).toHaveValue('');

      // Selected category is restored to 'All'
      const allTab = screen.getByRole('tab', { name: /All/i });
      expect(allTab).toHaveAttribute('aria-selected', 'true');

      // Gallery is populated with all items
      const gallery = screen.getByLabelText('Topic Card Gallery');
      expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
      expect(within(gallery).getByText('Human Heart Anatomy')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SECTION 5: RESPONSIVE & BROKEN IMAGES STRESS-TESTS
  // ==========================================================================
  describe('Scope 5: Responsive and Broken Images Stress-Tests', () => {
    it('S5.1 - Image onError Graceful Fallback: hides failed images via style.display = "none" without throwing', () => {
      const { container } = render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const allImages = container.querySelectorAll('img');
      expect(allImages.length).toBeGreaterThan(0);

      // Fire error event on every rendered image in carousel and gallery cards
      allImages.forEach((img) => {
        expect(() => {
          fireEvent.error(img);
        }).not.toThrow();
        expect(img.style.display).toBe('none');
      });
    });
  });

  // ==========================================================================
  // SECTION 6: TOPIC SELECTION STRESS-TESTS
  // ==========================================================================
  describe('Scope 6: Topic Selection Stress-Tests', () => {
    it('S6.1 - Card Click Selection: passes exact catalog item reference to onSelectTopic', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const turbofanCard = screen.getByRole('button', {
        name: /Explore High-Bypass Turbofan Jet Engine/i,
      });
      fireEvent.click(turbofanCard);

      expect(onSelectTopicMock).toHaveBeenCalledTimes(1);
      expect(onSelectTopicMock).toHaveBeenCalledWith(comprehensiveMockCatalog[1]);
    });

    it('S6.2 - Keyboard Accessibility (Enter & Space): triggers selection on Enter and Space, ignores other keys', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const quantumCard = screen.getByRole('button', {
        name: /Explore Superconducting Quantum Qubit Cavity/i,
      });

      // Pressing Space key triggers selection
      fireEvent.keyDown(quantumCard, { key: ' ' });
      expect(onSelectTopicMock).toHaveBeenCalledTimes(1);
      expect(onSelectTopicMock).toHaveBeenCalledWith(comprehensiveMockCatalog[4]);

      // Pressing Enter key triggers selection
      fireEvent.keyDown(quantumCard, { key: 'Enter' });
      expect(onSelectTopicMock).toHaveBeenCalledTimes(2);

      // Pressing irrelevant key (e.g. Escape, Tab, 'a') does NOT trigger
      fireEvent.keyDown(quantumCard, { key: 'Escape' });
      fireEvent.keyDown(quantumCard, { key: 'Tab' });
      fireEvent.keyDown(quantumCard, { key: 'a' });
      expect(onSelectTopicMock).toHaveBeenCalledTimes(2);
    });

    it('S6.3 - Carousel Selection Actions: triggers selection via Explore CTA and right preview card for the active slide', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      // Slide 1 is active (Twin-Lens Reflex Camera)
      const exploreButtons = screen.getAllByRole('button', { name: /Explore Deconstruction/i });
      // The hero CTA is the button inside the active slide
      fireEvent.click(exploreButtons[0]);

      expect(onSelectTopicMock).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'Twin-Lens Reflex Camera',
        })
      );
    });
  });

  // ==========================================================================
  // SECTION 7: RESILIENCE & CORNER-CASE DATA INGESTION
  // ==========================================================================
  describe('Scope 7: Resilience & Corner-Case Data Ingestion', () => {
    it('S7.1 - Missing Optional Fields: gracefully renders items with undefined videoUrl, audioUrl, or previewUrl', () => {
      const sparseCatalog: CommunityCatalogItem[] = [
        {
          id: 'sparse-001',
          topic: 'Minimal Physical Item',
          timestamp: '2026-09-14T00:00:00.000Z',
          domain: 'PHYSICAL',
          metaphor: 'Simplicity',
          infographicUrl: 'https://community.explodeit.org/sparse/info.png',
          assembledUrl: 'https://community.explodeit.org/sparse/assem.png',
          audioUrl: '',
          previewUrl: '',
        },
      ];

      expect(() => {
        render(
          <CommunityShowcase
            onSelectTopic={onSelectTopicMock}
            catalogItems={sparseCatalog}
            isLoading={false}
          />
        );
      }).not.toThrow();

      expect(screen.getAllByText('Minimal Physical Item').length).toBeGreaterThan(0);
    });

    it('S7.2 - Component Count Determination: respects explicit componentCount, components array, and plan.componentList', () => {
      const countExplicit = resolveComponentCount({
        id: 'test-1',
        componentCount: 24,
      } as any);
      expect(countExplicit).toBe(24);

      const countFromComponents = resolveComponentCount({
        id: 'test-2',
        components: [{}, {}, {}, {}],
      } as any);
      expect(countFromComponents).toBe(4);

      const countFromPlan = resolveComponentCount({
        id: 'test-3',
        plan: { componentList: ['p1', 'p2', 'p3', 'p4', 'p5'] },
      } as any);
      expect(countFromPlan).toBe(5);

      const countFallback = resolveComponentCount({
        id: 'test-4',
      } as any);
      expect(countFallback).toBeGreaterThanOrEqual(6);
      expect(countFallback).toBeLessThanOrEqual(14);
    });

    it('S7.3 - Category Badge Classes & Model Tier: resolves classes and tiers for custom metadata', () => {
      SHOWCASE_CATEGORIES.forEach((cat) => {
        const classes = getCategoryBadgeClasses(cat);
        expect(classes.badge).toBeDefined();
        expect(classes.indicator).toBeDefined();
        expect(classes.glow).toBeDefined();
      });

      // Explicit modelTier 'budget'
      const budgetTier = resolveItemModelTier({
        id: 'item-b',
        modelTier: 'budget',
      } as any);
      expect(budgetTier).toBe('Budget Saver');

      // Explicit manifest.modelTier 'pro'
      const proTier = resolveItemModelTier({
        id: 'item-p',
        manifest: { modelTier: 'pro' },
      } as any);
      expect(proTier).toBe('Pro Studio');
    });

    it('S7.4 - Empty Catalog Prop: safely displays empty state without unhandled exception', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={[]}
          isLoading={false}
        />
      );

      expect(screen.getByText('No deconstructions found')).toBeInTheDocument();
      expect(screen.getByText((_, el) => el?.textContent?.replace(/\s+/g, ' ').trim() === 'Showing 0 of 0 topics')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SECTION 8: EXTENDED ADVERSARIAL STRESS-TESTS
  // ==========================================================================
  describe('Scope 8: Extended Adversarial Stress-Tests', () => {
    it('S8.1 - Carousel Right Preview Card Selection: clicking right visual preview card triggers onSelectTopic', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      // The right column visual preview card has "HD Exploded View" and "View Blueprint ↗"
      const previewCardBadge = screen.getAllByText(/View Blueprint/i)[0];
      const previewCardContainer = previewCardBadge.closest('.cursor-pointer');
      expect(previewCardContainer).not.toBeNull();

      fireEvent.click(previewCardContainer!);
      expect(onSelectTopicMock).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'Twin-Lens Reflex Camera',
        })
      );
    });

    it('S8.2 - Injection and Long Query Resilience: survives XSS strings, SQL queries, and 500-char input without unhandled errors', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);

      // HTML / XSS injection attempt
      fireEvent.change(searchInput, { target: { value: '<script>alert("xss")</script>' } });
      expect(screen.getByText('No deconstructions found')).toBeInTheDocument();
      expect(screen.getByText(/<script>alert\("xss"\)<\/script>/)).toBeInTheDocument();

      // SQL injection attempt
      fireEvent.change(searchInput, { target: { value: "'; DROP TABLE topics; --" } });
      expect(screen.getByText('No deconstructions found')).toBeInTheDocument();

      // 500-character long random query
      const longQuery = 'A'.repeat(500);
      fireEvent.change(searchInput, { target: { value: longQuery } });
      expect(screen.getByText('No deconstructions found')).toBeInTheDocument();
    });

    it('S8.3 - Featured Items Prioritization: prioritizes items with videoUrl at the top of the carousel', () => {
      const mixedCatalog: CommunityCatalogItem[] = [
        {
          id: 'no-video-1',
          topic: 'Simple Stool',
          timestamp: '2026-09-14T00:00:00.000Z',
          domain: 'PHYSICAL',
          metaphor: 'Three Legs',
          infographicUrl: 'https://example.com/1.png',
          assembledUrl: 'https://example.com/1.png',
          videoUrl: undefined,
          audioUrl: 'https://example.com/1.mp3',
          previewUrl: '',
        },
        {
          id: 'has-video-1',
          topic: 'High-Tech Drone',
          timestamp: '2026-09-14T00:00:00.000Z',
          domain: 'PHYSICAL',
          metaphor: 'Quadcopter',
          infographicUrl: 'https://example.com/2.png',
          assembledUrl: 'https://example.com/2.png',
          videoUrl: 'https://example.com/drone.mp4',
          audioUrl: 'https://example.com/2.mp3',
          previewUrl: 'https://example.com/drone.jpg',
        },
      ];

      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={mixedCatalog}
          isLoading={false}
        />
      );

      // The top featured slide (slide 1) must be the drone because it has video + preview (score 3 vs 0)
      const carouselRegion = screen.getByRole('region', { name: /Featured Exploded Views/i });
      expect(within(carouselRegion).getByText('High-Tech Drone')).toBeInTheDocument();
    });

    it('S8.4 - Component Unmount Lifecycle Safety: unmounting during active autoplay cleanly disposes timer without memory leaks', () => {
      const { unmount } = render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={comprehensiveMockCatalog}
          isLoading={false}
        />
      );

      // Advance by 3000ms (mid-interval)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Unmount component
      expect(() => {
        unmount();
      }).not.toThrow();

      // Advancing timer after unmount should not trigger any errors or state updates
      expect(() => {
        act(() => {
          vi.advanceTimersByTime(12000);
        });
      }).not.toThrow();
    });

    it('S8.5 - Fallback to Seed on Remote Fetch Failure: recovers gracefully when fetchCommunityCatalog rejects', async () => {
      vi.useRealTimers(); // Use real microtasks for promise resolution
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(communityStorage, 'fetchCommunityCatalog').mockRejectedValue(new Error('500 Internal Server Error'));

      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          // catalogItems omitted to trigger internal fetch
        />
      );

      // Wait for catch block to resolve and fallback to seed catalog
      const items = await screen.findAllByText(/Twin-Lens Reflex/i);
      expect(items.length).toBeGreaterThan(0);

      consoleWarnSpy.mockRestore();
    });
  });
});
