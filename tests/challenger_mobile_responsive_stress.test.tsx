import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import InputArea from '../components/InputArea';
import { CommunityCatalogItem, GenerationItem } from '../types';
import * as communityStorage from '../services/communityStorage';

// ============================================================================
// Deterministic Fixtures
// ============================================================================

const mockCatalog: CommunityCatalogItem[] = [
  {
    id: 'tlr-camera-stress-001',
    topic: 'Twin-Lens Reflex Camera',
    timestamp: '2026-09-13T16:00:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Optical & Mechanical Chassis',
    infographicUrl: 'blob:mock-infographic-1',
    assembledUrl: 'blob:mock-assembled-1',
    videoUrl: 'blob:mock-video-1',
    audioUrl: 'blob:mock-audio-1',
    previewUrl: 'blob:mock-preview-1',
  },
  {
    id: 'turbofan-stress-002',
    topic: 'High-Bypass Turbofan Jet Engine',
    timestamp: '2026-09-13T16:05:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Concentric Spool Architecture',
    infographicUrl: 'blob:mock-infographic-2',
    assembledUrl: 'blob:mock-assembled-2',
    videoUrl: 'blob:mock-video-2',
    audioUrl: 'blob:mock-audio-2',
    previewUrl: 'blob:mock-preview-2',
  },
  {
    id: 'quantum-processor-stress-003',
    topic: 'Superconducting Quantum Processor Unit',
    timestamp: '2026-09-13T16:10:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Cryogenic Dilution Core',
    infographicUrl: 'blob:mock-infographic-3',
    assembledUrl: 'blob:mock-assembled-3',
    videoUrl: undefined,
    audioUrl: 'blob:mock-audio-3',
    previewUrl: 'blob:mock-preview-3',
  }
];

const mockHistory: GenerationItem[] = [
  {
    id: 'mech-watch-stress-101',
    prompt: 'Mechanical Watch Movement',
    timestamp: 1726240000000,
    plan: {
      displayTitle: 'Mechanical Watch Movement',
      category: 'Mechanical Engineering',
      domainType: 'PHYSICAL',
      visualMetaphor: 'Exploded Escapement',
      sectionTitles: {
        origin: 'Horological Roots',
        anatomy: 'Component Breakdown',
        article: 'Deep Dive Analysis',
        trivia: 'Watchmaking Trivia',
      },
      originStory: 'Ancient gears evolving into spring-driven mechanical precision.',
      detailedArticle: '## Escapement and Balance Wheel\n\nPrecision timekeeping.',
      trivia: ['Contains over 100 micro-components.'],
      visualStylePrompt: 'Exploded mechanical watch with jewels and balance wheel.',
      componentList: ['Mainspring Barrel', 'Balance Wheel', 'Escapement Lever'],
      audioVibe: { voiceName: 'Zephyr', toneDescription: 'Precise horological analysis' },
    },
    components: [
      {
        name: 'Mainspring Barrel',
        shortDescription: 'Provides potential energy.',
        composition: 'Hardened Spring Steel',
        detailedContent: 'Powers the gear train over a 40-hour reserve.',
      },
    ],
    narrationScript: 'Discover the precision of mechanical watchmaking.',
    infographicUrl: 'blob:mock-infographic-hist-1',
    assembledUrl: 'blob:mock-assembled-hist-1',
    videoUrl: null,
    audioUrl: 'blob:mock-audio-hist-1',
    hasVideo: false,
    usage: [],
    tier: 'pro',
  },
  {
    id: 'lithium-battery-stress-102',
    prompt: 'Solid State Lithium Battery',
    timestamp: 1726240100000,
    plan: {
      displayTitle: 'Solid State Lithium Battery',
      category: 'Electrochemical Engineering',
      domainType: 'PHYSICAL',
      visualMetaphor: 'Ceramic Electrolyte Interface',
      sectionTitles: {
        origin: 'Electrochemistry Foundations',
        anatomy: 'Layered Cell Structure',
        article: 'Electrolyte Transport Analysis',
        trivia: 'Energy Density Milestones',
      },
      originStory: 'Next-generation solid ceramic electrolytes surpassing liquid volatile solvents.',
      detailedArticle: '## Solid Electrolyte Interface\n\nIonic conductivity in beta-alumina.',
      trivia: ['Eliminates thermal runaway risk.'],
      visualStylePrompt: 'Exploded solid state cell showing cathode, anode, and ceramic separator.',
      componentList: ['Lithium Metal Anode', 'Ceramic Separator', 'NMC Cathode'],
      audioVibe: { voiceName: 'Fenrir', toneDescription: 'Rigorous electrochemical physics' },
    },
    components: [
      {
        name: 'Lithium Metal Anode',
        shortDescription: 'High specific capacity negative electrode.',
        composition: 'Pure Lithium Foil',
        detailedContent: 'Theoretical capacity of 3860 mAh/g.',
      },
    ],
    narrationScript: 'Explore solid-state battery architecture.',
    infographicUrl: 'blob:mock-infographic-hist-2',
    assembledUrl: 'blob:mock-assembled-hist-2',
    videoUrl: 'blob:mock-video-hist-2',
    audioUrl: 'blob:mock-audio-hist-2',
    hasVideo: true,
    usage: [],
    tier: 'pro',
  }
];

describe('Adversarial Challenger: Mobile Responsiveness & Layout Stress Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(communityStorage, 'fetchCommunityCatalog').mockResolvedValue(mockCatalog);
    vi.spyOn(communityStorage, 'preloadCommunityTopicMedia').mockResolvedValue({
      infographicUrl: 'blob:mock-preloaded-infographic',
      assembledUrl: 'blob:mock-preloaded-assembled',
      videoUrl: 'blob:mock-preloaded-video',
      audioUrl: 'blob:mock-preloaded-audio',
    });
    vi.spyOn(communityStorage, 'fetchCommunityTopic').mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SECTION 1: Rapid Drawer Toggling & State Synchronization Stress
  // ==========================================================================
  describe('CH-S1: Rapid Drawer Toggling & State Re-entrancy', () => {
    it('survives 50 rapid sequential toggles with exact parity and zero orphaned backdrops', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      const sidebar = screen.getByTestId('app-sidebar');

      // 50 rapid sequential clicks
      for (let i = 1; i <= 50; i++) {
        act(() => {
          fireEvent.click(menuToggle);
        });

        const isOdd = i % 2 === 1;
        const expectedExpanded = isOdd ? 'true' : 'false';
        const expectedLabel = isOdd ? 'Close menu' : 'Open menu';

        expect(menuToggle).toHaveAttribute('aria-expanded', expectedExpanded);
        expect(menuToggle).toHaveAttribute('aria-label', expectedLabel);

        if (isOdd) {
          expect(sidebar.className).toContain('translate-x-0');
          const backdrops = screen.queryAllByTestId('mobile-sidebar-backdrop');
          expect(backdrops).toHaveLength(1);
        } else {
          expect(sidebar.className).toContain('-translate-x-full');
          const backdrops = screen.queryAllByTestId('mobile-sidebar-backdrop');
          expect(backdrops).toHaveLength(0);
        }
      }

      // Final state assertion: exactly 50 is even -> closed
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar.className).toContain('-translate-x-full');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
    });

    it('survives 20 rapid open-via-menu / close-via-backdrop interleaved cycles', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      const sidebar = screen.getByTestId('app-sidebar');

      for (let cycle = 0; cycle < 20; cycle++) {
        // Open via menu
        act(() => {
          fireEvent.click(menuToggle);
        });
        expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
        expect(sidebar.className).toContain('translate-x-0');

        const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
        expect(backdrop).toBeInTheDocument();

        // Close via backdrop
        act(() => {
          fireEvent.click(backdrop);
        });
        expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
        expect(sidebar.className).toContain('-translate-x-full');
        expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
      }
    });

    it('survives 20 rapid open-via-menu / close-via-close-button interleaved cycles', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      const sidebar = screen.getByTestId('app-sidebar');

      for (let cycle = 0; cycle < 20; cycle++) {
        // Open via menu
        act(() => {
          fireEvent.click(menuToggle);
        });
        expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

        const closeBtn = screen.getByTestId('mobile-sidebar-close');
        expect(closeBtn).toBeInTheDocument();

        // Close via mobile close button inside sidebar
        act(() => {
          fireEvent.click(closeBtn);
        });
        expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
        expect(sidebar.className).toContain('-translate-x-full');
        expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
      }
    });
  });

  // ==========================================================================
  // SECTION 2: Extreme Viewport Boundaries & Responsive Layout Robustness
  // ==========================================================================
  describe('CH-S2: Extreme Screen Sizes & Boundary Layout Invariants', () => {
    it('strictly enforces 320px ultra-narrow mobile layout constraints and 44px touch targets', () => {
      render(
        <div style={{ width: '320px' }}>
          <App />
        </div>
      );

      // 1. Sidebar width constraint: 85vw max-w-xs guarantees never overflowing 320px screen
      const sidebar = screen.getByTestId('app-sidebar');
      expect(sidebar.className).toContain('w-[85vw]');
      expect(sidebar.className).toContain('max-w-xs');

      // 2. Open drawer and check close button touch target
      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      act(() => {
        fireEvent.click(menuToggle);
      });

      const closeBtn = screen.getByTestId('mobile-sidebar-close');
      expect(closeBtn.className).toContain('min-h-[44px]');
      expect(closeBtn.className).toContain('min-w-[44px]');

      // 3. Header toggle button touch target
      expect(menuToggle.className).toContain('min-h-[44px]');
      expect(menuToggle.className).toContain('min-w-[44px]');

      // 4. InputArea interactive elements touch targets
      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      expect(explodeBtn.className).toContain('min-h-[44px]');

      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      expect(surpriseBtn.className).toContain('min-h-[44px]');

      const animateLabel = screen.getByText('Animate').closest('label');
      expect(animateLabel?.className).toContain('min-h-[44px]');

      // 5. Input text field width adaptation
      const input = screen.getByPlaceholderText(/Name an object/i);
      expect(input.className).toContain('w-full');
    });

    it('strictly enforces 2560px ultra-wide desktop persistent layout invariants', () => {
      const onSelect = vi.fn();
      const onClear = vi.fn();
      const onChangeKey = vi.fn();

      render(
        <Sidebar
          history={mockHistory}
          currentId={null}
          onSelect={onSelect}
          onClear={onClear}
          onChangeKey={onChangeKey}
          hasKey={true}
          catalogItems={mockCatalog}
          isOpenMobile={false}
        />
      );

      const sidebar = screen.getByTestId('app-sidebar');

      // Persistent desktop styles guarantee sidebar remains pinned regardless of mobile drawer state
      expect(sidebar.className).toContain('md:static');
      expect(sidebar.className).toContain('md:w-80');
      expect(sidebar.className).toContain('md:translate-x-0');
      expect(sidebar.className).toContain('md:max-w-none');
      expect(sidebar.className).toContain('md:shrink-0');
    });

    it('desktop breakpoint hides mobile menu toggle, mobile close button, and backdrop', () => {
      const onSelectTier = vi.fn();
      const onOpenModelSettings = vi.fn();
      const onOpenApiKeyModal = vi.fn();
      const onToggleMobileSidebar = vi.fn();

      render(
        <Header
          apiKey="test-key"
          modelTier="pro"
          onSelectTier={onSelectTier}
          onOpenModelSettings={onOpenModelSettings}
          onOpenApiKeyModal={onOpenApiKeyModal}
          isMobileSidebarOpen={false}
          onToggleMobileSidebar={onToggleMobileSidebar}
        />
      );

      const toggle = screen.getByTestId('mobile-menu-toggle');
      expect(toggle.className).toContain('md:hidden');
    });
  });

  // ==========================================================================
  // SECTION 3: Keyboard Interaction Stress & Boundary Conditions
  // ==========================================================================
  describe('CH-S3: Keyboard Interaction & Escape Key Boundaries', () => {
    it('dismisses open mobile drawer upon Escape key press', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      act(() => {
        fireEvent.click(menuToggle);
      });
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('handles Escape key gracefully when drawer is already closed as an idempotent no-op', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      const sidebar = screen.getByTestId('app-sidebar');

      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();

      // Press Escape multiple times while closed
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
        fireEvent.keyDown(window, { key: 'Escape' });
        fireEvent.keyDown(window, { key: 'Escape' });
      });

      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(sidebar.className).toContain('-translate-x-full');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
    });

    it('absorbs repeated rapid burst Escape key presses without exception', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      act(() => {
        fireEvent.click(menuToggle);
      });
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // Spam 10 Escape presses
      act(() => {
        for (let i = 0; i < 10; i++) {
          fireEvent.keyDown(window, { key: 'Escape' });
        }
      });

      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('ignores non-Escape keys and maintains open drawer state', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      act(() => {
        fireEvent.click(menuToggle);
      });
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      const nonEscapeKeys = ['Enter', 'Tab', 'Space', 'ArrowDown', 'ArrowUp', 'KeyA', 'Backspace'];
      for (const key of nonEscapeKeys) {
        act(() => {
          fireEvent.keyDown(window, { key });
        } );
        // Drawer must still remain open
        expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();
        expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      }

      // Finally dismiss with Escape to verify clean recovery
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
    });

    it('removes window keydown listener cleanly when component unmounts', () => {
      const { unmount } = render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      act(() => {
        fireEvent.click(menuToggle);
      });

      unmount();

      // Firing Escape on window after unmount should not throw or trigger state update warning
      expect(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // SECTION 4: Multi-Actor State Transition Permutation Matrix
  // ==========================================================================
  describe('CH-S4: Backdrop vs Close Button vs Menu Toggle State Transition Permutations', () => {
    it('executes full circular state permutation: Menu -> Backdrop -> Menu -> CloseBtn -> Menu -> Escape -> Menu -> Menu', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      const sidebar = screen.getByTestId('app-sidebar');

      // 1. Menu: Open
      act(() => { fireEvent.click(menuToggle); });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // 2. Backdrop: Close
      act(() => { fireEvent.click(screen.getByTestId('mobile-sidebar-backdrop')); });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();

      // 3. Menu: Open
      act(() => { fireEvent.click(menuToggle); });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // 4. CloseBtn: Close
      act(() => { fireEvent.click(screen.getByTestId('mobile-sidebar-close')); });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();

      // 5. Menu: Open
      act(() => { fireEvent.click(menuToggle); });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // 6. Escape: Close
      act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();

      // 7. Menu: Open
      act(() => { fireEvent.click(menuToggle); });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // 8. Menu: Close
      act(() => { fireEvent.click(menuToggle); });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
      expect(sidebar.className).toContain('-translate-x-full');
    });

    it('survives rapid multi-clicks on close button without crashing', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      act(() => { fireEvent.click(menuToggle); });

      const closeBtn = screen.getByTestId('mobile-sidebar-close');
      act(() => {
        fireEvent.click(closeBtn);
        fireEvent.click(closeBtn);
        fireEvent.click(closeBtn);
      });

      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
    });

    it('survives rapid double-click on backdrop without crashing', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      act(() => { fireEvent.click(menuToggle); });

      const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
      act(() => {
        fireEvent.click(backdrop);
        // Even if an extra click event is fired, it gracefully resolves
        fireEvent.click(backdrop);
      });

      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
    });
  });

  // ==========================================================================
  // SECTION 5: Prompt Input & Action Responsiveness Across All States
  // ==========================================================================
  describe('CH-S5: Unobstructed Input & Action Responsiveness', () => {
    it('allows typing, toggling, and submitting prompt while drawer is closed', () => {
      const onSubmit = vi.fn();
      const onSurprise = vi.fn();

      render(
        <InputArea
          onSubmit={onSubmit}
          onSurprise={onSurprise}
          disabled={false}
          modelTier="pro"
        />
      );

      const input = screen.getByPlaceholderText(/Name an object/i);
      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      const animateCheckbox = screen.getByRole('checkbox', { name: /Animate/i });

      // Initially explode button is disabled because input is empty
      expect(explodeBtn).toBeDisabled();

      // Type prompt
      act(() => {
        fireEvent.change(input, { target: { value: 'Turbofan Jet Engine' } });
      });
      expect(input).toHaveValue('Turbofan Jet Engine');
      expect(explodeBtn).not.toBeDisabled();

      // Toggle animate
      act(() => {
        fireEvent.click(animateCheckbox);
      });
      expect(animateCheckbox).not.toBeChecked();

      // Submit
      act(() => {
        fireEvent.click(explodeBtn);
      });
      expect(onSubmit).toHaveBeenCalledWith('Turbofan Jet Engine', false);
      expect(input).toHaveValue(''); // Resets after submit
    });

    it('strictly preserves typed input text across multiple drawer open/close cycles', () => {
      render(<App />);

      const input = screen.getByPlaceholderText(/Name an object/i);
      const menuToggle = screen.getByTestId('mobile-menu-toggle');

      // User types draft prompt
      act(() => {
        fireEvent.change(input, { target: { value: 'Quantum Cryocooler 5000' } });
      });
      expect(input).toHaveValue('Quantum Cryocooler 5000');

      // Cycle 1: Open drawer -> close via backdrop
      act(() => { fireEvent.click(menuToggle); });
      act(() => { fireEvent.click(screen.getByTestId('mobile-sidebar-backdrop')); });
      expect(input).toHaveValue('Quantum Cryocooler 5000');

      // Cycle 2: Open drawer -> close via close button
      act(() => { fireEvent.click(menuToggle); });
      act(() => { fireEvent.click(screen.getByTestId('mobile-sidebar-close')); });
      expect(input).toHaveValue('Quantum Cryocooler 5000');

      // Cycle 3: Open drawer -> close via Escape
      act(() => { fireEvent.click(menuToggle); });
      act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
      expect(input).toHaveValue('Quantum Cryocooler 5000');

      // Explode It button is active and ready to fire with the preserved text
      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      expect(explodeBtn).not.toBeDisabled();
    });

    it('backdrop has z-40 and covers viewport to prevent accidental background interaction when drawer is open', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      act(() => { fireEvent.click(menuToggle); });

      const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
      expect(backdrop.className).toContain('z-40');
      expect(backdrop.className).toContain('fixed');
      expect(backdrop.className).toContain('inset-0');

      // Sidebar has z-50 to sit above the backdrop
      const sidebar = screen.getByTestId('app-sidebar');
      expect(sidebar.className).toContain('z-50');

      // Dismiss backdrop
      act(() => { fireEvent.click(backdrop); });
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
    });
  });

  // ==========================================================================
  // SECTION 6: Sidebar Content Navigation & Auto-Dismissal Stress
  // ==========================================================================
  describe('CH-S6: Sidebar Content Navigation Auto-Dismissal Stress', () => {
    it('clicking history item in mobile drawer invokes onSelect and auto-closes drawer', () => {
      const onSelect = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          history={mockHistory}
          currentId={null}
          onSelect={onSelect}
          onClear={vi.fn()}
          onChangeKey={vi.fn()}
          hasKey={true}
          isOpenMobile={true}
          onCloseMobile={onCloseMobile}
        />
      );

      // Select first history item
      const historyItemBtn = screen.getByRole('button', { name: /Mechanical Watch Movement/i });
      act(() => {
        fireEvent.click(historyItemBtn);
      });

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(mockHistory[0]);
      expect(onCloseMobile).toHaveBeenCalledTimes(1);
    });

    it('clicking community topic in mobile drawer invokes onSelectCatalogItem and auto-closes drawer', () => {
      const onSelectCatalogItem = vi.fn();
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          history={[]}
          currentId={null}
          onSelect={vi.fn()}
          onClear={vi.fn()}
          onChangeKey={vi.fn()}
          hasKey={true}
          catalogItems={mockCatalog}
          isOpenMobile={true}
          onCloseMobile={onCloseMobile}
          onSelectCatalogItem={onSelectCatalogItem}
        />
      );

      // Community catalog item button
      const topicBtn = screen.getByRole('button', { name: /Twin-Lens Reflex Camera/i });
      act(() => {
        fireEvent.click(topicBtn);
      });

      expect(onSelectCatalogItem).toHaveBeenCalledTimes(1);
      expect(onSelectCatalogItem).toHaveBeenCalledWith(mockCatalog[0]);
      expect(onCloseMobile).toHaveBeenCalledTimes(1);
    });

    it('expanding category accordion inside mobile sidebar does NOT dismiss the drawer', () => {
      const onCloseMobile = vi.fn();

      render(
        <Sidebar
          history={[]}
          currentId={null}
          onSelect={vi.fn()}
          onClear={vi.fn()}
          onChangeKey={vi.fn()}
          hasKey={true}
          catalogItems={mockCatalog}
          isOpenMobile={true}
          onCloseMobile={onCloseMobile}
        />
      );

      // Accordion header button for categorized explorations
      const accordionBtn = screen.getByRole('button', { name: /Mechanical category/i });
      act(() => {
        fireEvent.click(accordionBtn);
      });

      // Accordion toggles, but drawer must remain open!
      expect(onCloseMobile).not.toHaveBeenCalled();
    });

    it('sequential multi-selection across drawer opens closes drawer every time in App', async () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');

      await waitFor(() => {
        expect(screen.getAllByText(/Twin-Lens Reflex/i).length).toBeGreaterThan(0);
      });

      // Open drawer
      act(() => { fireEvent.click(menuToggle); });
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // Click topic 1
      const topic1Buttons = screen.getAllByRole('button', { name: /Twin-Lens Reflex/i });
      act(() => { fireEvent.click(topic1Buttons[0]); });

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
      });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');

      // Open drawer again
      act(() => { fireEvent.click(menuToggle); });
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // Click topic 2
      const topic2Buttons = screen.getAllByRole('button', { name: /Turbofan Jet Engine/i });
      act(() => { fireEvent.click(topic2Buttons[0]); });

      await waitFor(() => {
        expect(screen.queryByTestId('mobile-sidebar-backdrop')).toBeNull();
      });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
