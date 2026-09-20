import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import InputArea from '../components/InputArea';
import { CommunityCatalogItem, GenerationItem } from '../types';

const mockCatalog: CommunityCatalogItem[] = [
  {
    id: 'tlr-camera-001',
    topic: 'Twin-Lens Reflex Camera',
    timestamp: '2026-09-13T16:00:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Optical & Mechanical Chassis',
    infographicUrl: 'https://community.explodeit.org/tlr-camera-001/infographic.png',
    assembledUrl: 'https://community.explodeit.org/tlr-camera-001/assembled.png',
    videoUrl: 'https://community.explodeit.org/tlr-camera-001/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/tlr-camera-001/narration.mp3',
    previewUrl: 'https://community.explodeit.org/tlr-camera-001/preview.jpg',
  },
  {
    id: 'turbofan-engine-002',
    topic: 'High-Bypass Turbofan Jet Engine',
    timestamp: '2026-09-13T16:05:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Concentric Spool Architecture',
    infographicUrl: 'https://community.explodeit.org/turbofan-engine-002/infographic.png',
    assembledUrl: 'https://community.explodeit.org/turbofan-engine-002/assembled.png',
    videoUrl: 'https://community.explodeit.org/turbofan-engine-002/assembly.mp4',
    audioUrl: 'https://community.explodeit.org/turbofan-engine-002/narration.mp3',
    previewUrl: 'https://community.explodeit.org/turbofan-engine-002/preview.jpg',
  }
];

const mockHistoryItem: GenerationItem = {
  id: 'mechanical-watch-001',
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
  infographicUrl: 'https://community.explodeit.org/mechanical-watch-001/infographic.png',
  assembledUrl: 'https://community.explodeit.org/mechanical-watch-001/assembled.png',
  videoUrl: null,
  audioUrl: 'https://community.explodeit.org/mechanical-watch-001/narration.mp3',
  hasVideo: false,
  usage: [],
  tier: 'pro',
};

import * as communityStorage from '../services/communityStorage';

describe('Mobile Responsiveness & Layout Overhaul', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(communityStorage, 'fetchCommunityCatalog').mockResolvedValue(mockCatalog);
  });

  // ========================================================================
  // R1: Prompt Input & Primary Content Visible Above the Fold on Mobile
  // ========================================================================
  describe('R1: Mobile-First Layout & Above-the-Fold Visibility', () => {
    it('renders the prompt input box and action buttons prominently without obstruction', () => {
      render(<App />);

      // The prompt input field must be in the document and accessible
      const input = screen.getByPlaceholderText(/Name an object/i);
      expect(input).toBeInTheDocument();

      // Action buttons must be rendered
      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      expect(explodeBtn).toBeInTheDocument();

      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      expect(surpriseBtn).toBeInTheDocument();

      // Animate checkbox toggle must be present
      const animateCheckbox = screen.getByRole('checkbox', { name: /Animate/i });
      expect(animateCheckbox).toBeInTheDocument();
    });

    it('renders the mobile menu toggle button in the Header', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      expect(menuToggle).toBeInTheDocument();
      expect(menuToggle).toHaveAttribute('aria-label', 'Open menu');
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('sidebar is off-screen on mobile by default and does not render backdrop initially', () => {
      render(<App />);

      const sidebar = screen.getByTestId('app-sidebar');
      expect(sidebar).toBeInTheDocument();
      // On mobile closed state, has -translate-x-full
      expect(sidebar.className).toContain('-translate-x-full');
      expect(sidebar.className).toContain('md:translate-x-0');

      // Backdrop must not exist when closed
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
    });
  });

  // ========================================================================
  // R2: Mobile Drawer Slide-Over & Toggle Interactions
  // ========================================================================
  describe('R2: Mobile Sidebar Drawer Open/Close Transitions', () => {
    it('opens mobile sidebar drawer when clicking mobile menu toggle', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(menuToggle);

      // Now menu toggle should have aria-expanded true
      expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
      expect(menuToggle).toHaveAttribute('aria-label', 'Close menu');

      // Sidebar has translate-x-0
      const sidebar = screen.getByTestId('app-sidebar');
      expect(sidebar.className).toContain('translate-x-0');

      // Backdrop should appear
      const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
      expect(backdrop).toBeInTheDocument();
    });

    it('closes mobile sidebar drawer when clicking the backdrop', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(menuToggle);

      // Drawer is open
      const backdrop = screen.getByTestId('mobile-sidebar-backdrop');
      expect(backdrop).toBeInTheDocument();

      // Click backdrop to dismiss
      fireEvent.click(backdrop);

      // Backdrop should be removed
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes mobile sidebar drawer when clicking the close button inside the sidebar', () => {
      render(<App />);

      // Open drawer
      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(menuToggle);

      // Click close button inside sidebar
      const closeBtn = screen.getByTestId('mobile-sidebar-close');
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);

      // Backdrop removed and drawer closed
      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes mobile sidebar drawer when pressing Escape key', () => {
      render(<App />);

      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(menuToggle);

      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // ========================================================================
  // R3: Mobile Navigation Item Click Auto-Closes Drawer
  // ========================================================================
  describe('R3: Mobile Sidebar Item Selection Behavior', () => {
    it('automatically closes mobile drawer when selecting a topic from the sidebar', async () => {
      render(<App />);

      // Open mobile drawer
      const menuToggle = screen.getByTestId('mobile-menu-toggle');
      fireEvent.click(menuToggle);
      expect(screen.getByTestId('mobile-sidebar-backdrop')).toBeInTheDocument();

      // Wait for community items to be present
      await waitFor(() => {
        expect(screen.getAllByText(/Twin-Lens Reflex/i).length).toBeGreaterThan(0);
      });

      // Find the topic button in the sidebar and click it
      const topicButtons = screen.getAllByRole('button', { name: /Twin-Lens Reflex/i });
      fireEvent.click(topicButtons[0]);

      // Mobile drawer should close (backdrop dismissed)
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-sidebar-backdrop')).not.toBeInTheDocument();
      });
      expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  // ========================================================================
  // R4: Desktop Breakpoint Preservation
  // ========================================================================
  describe('R4: Desktop Breakpoint Layout Invariants', () => {
    it('Sidebar component retains desktop docked layout classes', () => {
      const onSelect = vi.fn();
      const onClear = vi.fn();
      const onChangeKey = vi.fn();

      render(
        <Sidebar
          history={[mockHistoryItem]}
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
      // Desktop persistent layout classes
      expect(sidebar.className).toContain('md:static');
      expect(sidebar.className).toContain('md:w-80');
      expect(sidebar.className).toContain('md:translate-x-0');
    });

    it('Header component renders mobile menu toggle with md:hidden', () => {
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

      const toggleBtn = screen.getByTestId('mobile-menu-toggle');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn.className).toContain('md:hidden');

      fireEvent.click(toggleBtn);
      expect(onToggleMobileSidebar).toHaveBeenCalledTimes(1);
    });
  });

  // ========================================================================
  // R5: InputArea Touch Target & Mobile Controls Compliance
  // ========================================================================
  describe('R5: InputArea Mobile Touch Targets & Interaction', () => {
    it('ensures buttons meet minimum touch target standards (min-h-[44px])', () => {
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

      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      expect(explodeBtn.className).toContain('min-h-[44px]');

      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      expect(surpriseBtn.className).toContain('min-h-[44px]');

      const label = screen.getByText('Animate').closest('label');
      expect(label?.className).toContain('min-h-[44px]');
    });

    it('submitting prompt triggers onSubmit with correct parameters', () => {
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
      fireEvent.change(input, { target: { value: 'Mechanical Watch' } });

      const explodeBtn = screen.getByRole('button', { name: /Explode It/i });
      fireEvent.click(explodeBtn);

      expect(onSubmit).toHaveBeenCalledWith('Mechanical Watch', true);
    });

    it('clicking Surprise Me triggers onSurprise', () => {
      const onSubmit = vi.fn();
      const onSurprise = vi.fn();

      render(
        <InputArea
          onSubmit={onSubmit}
          onSurprise={onSurprise}
          disabled={false}
          modelTier="budget"
        />
      );

      const surpriseBtn = screen.getByRole('button', { name: /Surprise Me/i });
      fireEvent.click(surpriseBtn);

      expect(onSurprise).toHaveBeenCalledWith(false);
    });
  });
});
