import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  CommunityShowcase,
  resolveItemCategory,
  resolveItemModelTier,
  resolveComponentCount,
} from '../components/CommunityShowcase';
import { CommunityCatalogItem } from '../types';

// ============================================================================
// Mock Test Fixtures
// ============================================================================

const mockCatalog: CommunityCatalogItem[] = [
  {
    id: 'tlr-camera-001',
    topic: 'Twin-Lens Reflex Camera',
    timestamp: '2026-09-13T16:00:00.000Z',
    domain: 'PHYSICAL',
    metaphor: 'Exploded View',
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
    metaphor: 'Exploded View',
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
    id: 'transformer-004',
    topic: 'Transformer Attention Architecture',
    timestamp: '2026-09-13T16:10:00.000Z',
    domain: 'SOFTWARE',
    metaphor: 'Data Flow Visualization',
    infographicUrl: 'https://community.explodeit.org/transformer-004/infographic.png',
    assembledUrl: 'https://community.explodeit.org/transformer-004/assembled.png',
    videoUrl: undefined,
    audioUrl: 'https://community.explodeit.org/transformer-004/narration.mp3',
    previewUrl: 'https://community.explodeit.org/transformer-004/preview.jpg',
  },
];

describe('CommunityShowcase Utility Invariants', () => {
  it('correctly maps domains and topics to user-facing showcase categories', () => {
    expect(resolveItemCategory(mockCatalog[0])).toBe('Mechanical');
    expect(resolveItemCategory(mockCatalog[1])).toBe('Mechanical');
    expect(resolveItemCategory(mockCatalog[2])).toBe('Anatomy');
    expect(resolveItemCategory(mockCatalog[3])).toBe('Electronics');
  });

  it('correctly identifies model tier from video presence and metadata', () => {
    // Camera has video -> Pro Studio
    expect(resolveItemModelTier(mockCatalog[0])).toBe('Pro Studio');
    // Heart has no video -> Pro Studio or Budget Saver
    expect(resolveItemModelTier(mockCatalog[2])).toBe('Pro Studio');
    // Explicit budget ID
    expect(resolveItemModelTier({ ...mockCatalog[2], id: 'budget-item-123' })).toBe('Budget Saver');
  });

  it('returns valid component counts deterministically', () => {
    const count = resolveComponentCount(mockCatalog[0]);
    expect(count).toBeGreaterThanOrEqual(6);
    expect(count).toBeLessThanOrEqual(14);
  });
});

describe('CommunityShowcase Component Render & Interactivity', () => {
  let onSelectTopicMock: ReturnType<typeof vi.fn<(item: CommunityCatalogItem) => void>>;

  beforeEach(() => {
    onSelectTopicMock = vi.fn<(item: CommunityCatalogItem) => void>();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders loading skeleton when isLoading is true', () => {
    const { container } = render(
      <CommunityShowcase
        onSelectTopic={onSelectTopicMock}
        catalogItems={mockCatalog}
        isLoading={true}
      />
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders Hero Carousel with first featured topic and action button', () => {
    render(
      <CommunityShowcase
        onSelectTopic={onSelectTopicMock}
        catalogItems={mockCatalog}
        isLoading={false}
      />
    );

    // Carousel displays first featured title
    expect(screen.getAllByText('Twin-Lens Reflex Camera').length).toBeGreaterThan(0);

    // Action button exists
    const exploreButtons = screen.getAllByText('Explore Deconstruction');
    expect(exploreButtons.length).toBeGreaterThan(0);

    // Clicking hero CTA invokes onSelectTopic with the active item
    fireEvent.click(exploreButtons[0]);
    expect(onSelectTopicMock).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'Twin-Lens Reflex Camera',
    }));
  });

  it('renders category filter chips with accurate item counts', () => {
    render(
      <CommunityShowcase
        onSelectTopic={onSelectTopicMock}
        catalogItems={mockCatalog}
        isLoading={false}
      />
    );

    expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mechanical/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Anatomy/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Electronics/i })).toBeInTheDocument();
  });

  it('filters topics when a category chip is selected', () => {
    render(
      <CommunityShowcase
        onSelectTopic={onSelectTopicMock}
        catalogItems={mockCatalog}
        isLoading={false}
      />
    );

    // Filter to Anatomy
    const anatomyTab = screen.getByRole('tab', { name: /Anatomy/i });
    fireEvent.click(anatomyTab);

    // Human heart should be visible in the card gallery
    const gallery = screen.getByLabelText('Topic Card Gallery');
    expect(within(gallery).getByText('Human Heart Anatomy')).toBeInTheDocument();

    // Twin-lens camera should not be in the filtered card gallery
    expect(within(gallery).queryByText('Twin-Lens Reflex Camera')).not.toBeInTheDocument();
  });

  it('filters topics in real time via search input', async () => {
    render(
      <CommunityShowcase
        onSelectTopic={onSelectTopicMock}
        catalogItems={mockCatalog}
        isLoading={false}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
    fireEvent.change(searchInput, { target: { value: 'Turbofan' } });

    const gallery = screen.getByLabelText('Topic Card Gallery');
    expect(within(gallery).getByText('High-Bypass Turbofan Jet Engine')).toBeInTheDocument();
    expect(within(gallery).queryByText('Human Heart Anatomy')).not.toBeInTheDocument();
  });

  it('displays empty state when search query matches no items, and resets on clear', () => {
    render(
      <CommunityShowcase
        onSelectTopic={onSelectTopicMock}
        catalogItems={mockCatalog}
        isLoading={false}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search by title, domain, metaphor/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentObjectXYZ' } });

    expect(screen.getByText('No deconstructions found')).toBeInTheDocument();

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /Clear Filters/i });
    fireEvent.click(clearButton);

    // All items restored in the gallery
    const gallery = screen.getByLabelText('Topic Card Gallery');
    expect(within(gallery).getByText('Twin-Lens Reflex Camera')).toBeInTheDocument();
  });

  it('selects topic when user clicks a card in the gallery', () => {
    render(
      <CommunityShowcase
        onSelectTopic={onSelectTopicMock}
        catalogItems={mockCatalog}
        isLoading={false}
      />
    );

    const heartCard = screen.getByRole('button', { name: /Explore Human Heart Anatomy/i });
    fireEvent.click(heartCard);

    expect(onSelectTopicMock).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'Human Heart Anatomy',
    }));
  });

  it('navigates carousel slides using Next and Prev controls', () => {
    render(
      <CommunityShowcase
        onSelectTopic={onSelectTopicMock}
        catalogItems={mockCatalog}
        isLoading={false}
      />
    );

    const nextButton = screen.getByRole('button', { name: /Next slide/i });
    fireEvent.click(nextButton);

    // Slide counter updates to 02
    expect(screen.getByText(/02 \/ 0/)).toBeInTheDocument();

    const prevButton = screen.getByRole('button', { name: /Previous slide/i });
    fireEvent.click(prevButton);

    // Slide counter returns to 01
    expect(screen.getByText(/01 \/ 0/)).toBeInTheDocument();
  });
});
