import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Sidebar from '../components/Sidebar';
import { CommunityShowcase } from '../components/CommunityShowcase';
import { CommunityCatalogItem, GenerationItem } from '../types';
import { CANONICAL_MODEL_PRESETS } from '../constants';

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
  },
  {
    id: 'human-heart-003',
    topic: 'Human Heart Anatomy',
    timestamp: '2026-09-13T16:08:00.000Z',
    domain: 'BIOLOGICAL',
    metaphor: 'Cross-Sectional Chambers',
    infographicUrl: 'https://community.explodeit.org/human-heart-003/infographic.png',
    assembledUrl: 'https://community.explodeit.org/human-heart-003/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/human-heart-003/narration.mp3',
    previewUrl: 'https://community.explodeit.org/human-heart-003/preview.jpg',
  },
  {
    id: 'cpu-architecture-004',
    topic: 'Modern CPU Microarchitecture',
    timestamp: '2026-09-13T16:10:00.000Z',
    domain: 'SOFTWARE',
    metaphor: 'Silicon Die & Cache Hierarchy',
    infographicUrl: 'https://community.explodeit.org/cpu-architecture-004/infographic.png',
    assembledUrl: 'https://community.explodeit.org/cpu-architecture-004/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/cpu-architecture-004/narration.mp3',
    previewUrl: 'https://community.explodeit.org/cpu-architecture-004/preview.jpg',
  },
];

const mockHistoryItem: GenerationItem = {
  id: 'custom-session-item-1',
  prompt: 'Mechanical Watch Movement',
  timestamp: Date.now() - 30000,
  plan: {
    displayTitle: 'Mechanical Watch Movement',
    category: 'Mechanical',
    domainType: 'PHYSICAL',
    visualMetaphor: 'Exploded View',
    sectionTitles: {
      origin: 'Origin',
      anatomy: 'Anatomy',
      article: 'Article',
      trivia: 'Trivia',
    },
    originStory: 'Watch origin',
    detailedArticle: 'Detailed watch content',
    trivia: ['Watch trivia 1'],
    visualStylePrompt: 'Watch prompt',
    componentList: ['Mainspring', 'Escapement', 'Balance Wheel'],
    audioVibe: { voiceName: 'Zephyr', toneDescription: 'Precise' },
  },
  components: [
    {
      name: 'Mainspring Barrel',
      shortDescription: 'Energy source',
      composition: 'Spring steel',
      detailedContent: 'Powers the gear train.',
      sources: [],
    },
  ],
  narrationScript: 'Audio script',
  infographicUrl: 'data:image/png;base64,mock',
  assembledUrl: 'data:image/png;base64,mock',
  videoUrl: null,
  audioUrl: null,
  hasVideo: false,
  usage: [{ model: 'gemini-3.1-pro-preview', inputTokens: 400, outputTokens: 150, costEstimate: 0.003 }],
  tier: 'pro',
  config: CANONICAL_MODEL_PRESETS.pro,
};

describe('Collapsible Category Viewer & Past Explorations Suite', () => {
  const onSelectMock = vi.fn();
  const onClearMock = vi.fn();
  const onChangeKeyMock = vi.fn();
  const onSelectCatalogItemMock = vi.fn();
  const onSelectTopicMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. Sidebar: Dual Section Rendering (Recent & Community Explorations)
  // ==========================================================================
  describe('Sidebar: Dual Section Rendering', () => {
    it('renders both Recent Explorations and Community Explorations sections', () => {
      render(
        <Sidebar
          history={[mockHistoryItem]}
          currentId={null}
          onSelect={onSelectMock}
          onClear={onClearMock}
          onChangeKey={onChangeKeyMock}
          hasKey={true}
          catalogItems={mockCatalog}
          onSelectCatalogItem={onSelectCatalogItemMock}
        />
      );

      // Section 1: Recent Explorations header and item
      expect(screen.getByText('Recent Explorations')).toBeInTheDocument();
      expect(screen.getByText('Mechanical Watch Movement')).toBeInTheDocument();

      // Section 2: Community Explorations header
      expect(screen.getByText('Community Explorations')).toBeInTheDocument();
      expect(screen.getByText('Explore by category')).toBeInTheDocument();
    });

    it('renders empty placeholder for Recent Explorations when history is empty, while still rendering Community Explorations', () => {
      render(
        <Sidebar
          history={[]}
          currentId={null}
          onSelect={onSelectMock}
          onClear={onClearMock}
          onChangeKey={onChangeKeyMock}
          hasKey={true}
          catalogItems={mockCatalog}
          onSelectCatalogItem={onSelectCatalogItemMock}
        />
      );

      expect(screen.getByText('No items yet.')).toBeInTheDocument();
      expect(screen.getByText('Start by typing above!')).toBeInTheDocument();
      expect(screen.getByText('Community Explorations')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 2. Sidebar: Collapsible Categories and Item Navigation
  // ==========================================================================
  describe('Sidebar: Collapsible Category Interactions', () => {
    it('groups community catalog items into categories with count badges', () => {
      render(
        <Sidebar
          history={[]}
          currentId={null}
          onSelect={onSelectMock}
          onClear={onClearMock}
          onChangeKey={onChangeKeyMock}
          hasKey={true}
          catalogItems={mockCatalog}
          onSelectCatalogItem={onSelectCatalogItemMock}
        />
      );

      // Category headers should exist
      expect(screen.getByText('Mechanical')).toBeInTheDocument();
      expect(screen.getByText('Anatomy')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();

      // Topics should be visible initially (expanded by default)
      expect(screen.getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
      expect(screen.getByText('High-Bypass Turbofan Jet Engine')).toBeInTheDocument();
      expect(screen.getByText('Human Heart Anatomy')).toBeInTheDocument();
      expect(screen.getByText('Modern CPU Microarchitecture')).toBeInTheDocument();
    });

    it('collapses and expands individual categories when clicked', () => {
      render(
        <Sidebar
          history={[]}
          currentId={null}
          onSelect={onSelectMock}
          onClear={onClearMock}
          onChangeKey={onChangeKeyMock}
          hasKey={true}
          catalogItems={mockCatalog}
          onSelectCatalogItem={onSelectCatalogItemMock}
        />
      );

      // Find the button for Mechanical category
      const mechanicalButton = screen.getByRole('button', { name: /Mechanical category/i });
      expect(mechanicalButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();

      // Click to collapse Mechanical
      fireEvent.click(mechanicalButton);
      expect(mechanicalButton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Twin-Lens Reflex Camera')).not.toBeInTheDocument();

      // Anatomy items should remain unaffected
      expect(screen.getByText('Human Heart Anatomy')).toBeInTheDocument();

      // Click again to re-expand Mechanical
      fireEvent.click(mechanicalButton);
      expect(mechanicalButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
    });

    it('toggles all categories with Collapse All / Expand All button', () => {
      render(
        <Sidebar
          history={[]}
          currentId={null}
          onSelect={onSelectMock}
          onClear={onClearMock}
          onChangeKey={onChangeKeyMock}
          hasKey={true}
          catalogItems={mockCatalog}
          onSelectCatalogItem={onSelectCatalogItemMock}
        />
      );

      // Click Collapse All
      const toggleAllBtn = screen.getByRole('button', { name: /Collapse All/i });
      fireEvent.click(toggleAllBtn);

      // All exploration topics should be hidden
      expect(screen.queryByText('Twin-Lens Reflex Camera')).not.toBeInTheDocument();
      expect(screen.queryByText('Human Heart Anatomy')).not.toBeInTheDocument();
      expect(screen.queryByText('Modern CPU Microarchitecture')).not.toBeInTheDocument();

      // Button text changes to Expand All
      expect(screen.getByRole('button', { name: /Expand All/i })).toBeInTheDocument();

      // Click Expand All
      fireEvent.click(screen.getByRole('button', { name: /Expand All/i }));
      expect(screen.getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
      expect(screen.getByText('Human Heart Anatomy')).toBeInTheDocument();
    });

    it('calls onSelectCatalogItem when user clicks a community exploration item', () => {
      render(
        <Sidebar
          history={[]}
          currentId={null}
          onSelect={onSelectMock}
          onClear={onClearMock}
          onChangeKey={onChangeKeyMock}
          hasKey={true}
          catalogItems={mockCatalog}
          onSelectCatalogItem={onSelectCatalogItemMock}
        />
      );

      const tlrButton = screen.getByText('Twin-Lens Reflex Camera').closest('button')!;
      fireEvent.click(tlrButton);

      expect(onSelectCatalogItemMock).toHaveBeenCalledTimes(1);
      expect(onSelectCatalogItemMock).toHaveBeenCalledWith(mockCatalog[0]);
    });

    it('applies active selection highlight when currentId matches a community item', () => {
      render(
        <Sidebar
          history={[]}
          currentId="tlr-camera-001"
          onSelect={onSelectMock}
          onClear={onClearMock}
          onChangeKey={onChangeKeyMock}
          hasKey={true}
          catalogItems={mockCatalog}
          onSelectCatalogItem={onSelectCatalogItemMock}
        />
      );

      const tlrButton = screen.getByText('Twin-Lens Reflex Camera').closest('button')!;
      expect(tlrButton.className).toContain('border-cyan-500/50');
      expect(tlrButton.className).toContain('text-cyan-50');
    });
  });

  // ==========================================================================
  // 3. CommunityShowcase: View Mode Switcher & Collapsible Category View
  // ==========================================================================
  describe('CommunityShowcase: View Mode Switcher', () => {
    it('renders in Grid view by default and allows switching to Collapsible Category view', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={mockCatalog}
          isLoading={false}
          hasKey={true}
        />
      );

      // Verify View Mode Toggle exists
      const gridBtn = screen.getByRole('button', { name: /Grid view/i });
      const collapsibleBtn = screen.getByRole('button', { name: /Collapsible category view/i });

      expect(gridBtn).toHaveAttribute('aria-pressed', 'true');
      expect(collapsibleBtn).toHaveAttribute('aria-pressed', 'false');

      // Click Collapsible Category View
      fireEvent.click(collapsibleBtn);
      expect(collapsibleBtn).toHaveAttribute('aria-pressed', 'true');
      expect(gridBtn).toHaveAttribute('aria-pressed', 'false');

      // In Collapsible Category View, category headers should be rendered
      expect(screen.getByText('Categorized Deconstructions (4 topics)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mechanical category, 2 topics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Anatomy category, 1 topic/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Electronics category, 1 topic/i })).toBeInTheDocument();
    });

    it('collapses and expands category shelves in Collapsible Category view', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={mockCatalog}
          isLoading={false}
          hasKey={true}
        />
      );

      // Switch to Collapsible Category View
      fireEvent.click(screen.getByRole('button', { name: /Collapsible category view/i }));

      // Find Mechanical category button
      const mechanicalHeader = screen.getByRole('button', { name: /Mechanical category, 2 topics/i });
      expect(mechanicalHeader).toHaveAttribute('aria-expanded', 'true');

      // Collapse Mechanical
      fireEvent.click(mechanicalHeader);
      expect(mechanicalHeader).toHaveAttribute('aria-expanded', 'false');

      // Re-expand Mechanical
      fireEvent.click(mechanicalHeader);
      expect(mechanicalHeader).toHaveAttribute('aria-expanded', 'true');
    });

    it('allows topic selection by clicking card within collapsible category shelf', () => {
      render(
        <CommunityShowcase
          onSelectTopic={onSelectTopicMock}
          catalogItems={mockCatalog}
          isLoading={false}
          hasKey={true}
        />
      );

      // Switch to Collapsible Category View
      fireEvent.click(screen.getByRole('button', { name: /Collapsible category view/i }));

      // Click card within the shelf
      const heartCard = screen.getByRole('button', { name: /Explore Human Heart Anatomy/i });
      fireEvent.click(heartCard);

      expect(onSelectTopicMock).toHaveBeenCalledTimes(1);
      expect(onSelectTopicMock).toHaveBeenCalledWith(mockCatalog[2]);
    });
  });
});
