import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { CommunityCatalogItem, ModelTier } from '../types';
import { fetchCommunityCatalog } from '../services/communityStorage';
import { SEED_COMMUNITY_CATALOG } from '../services/mockCommunityStorage';

export interface CommunityShowcaseProps {
  /** Callback fired when user selects a showcase topic to inspect */
  onSelectTopic: (item: CommunityCatalogItem) => void;
  /** Pre-loaded or custom catalog items (optional, auto-fetches if omitted) */
  catalogItems?: CommunityCatalogItem[];
  /** Controlled loading state (optional, defaults to internal fetch state) */
  isLoading?: boolean;
  /** Whether a Gemini API key is currently active */
  hasKey?: boolean;
  /** Callback to open the API key configuration modal */
  onOpenApiKeyModal?: () => void;
}

export type ShowcaseCategory = 'All' | 'Mechanical' | 'Anatomy' | 'Electronics' | 'Science' | 'Everyday';

export const SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  'All',
  'Mechanical',
  'Anatomy',
  'Electronics',
  'Science',
  'Everyday',
];

// ============================================================================
// Domain & Tier Categorization Utilities
// ============================================================================

/**
 * Categorize catalog items into user-friendly showcase categories.
 */
export function resolveItemCategory(item: CommunityCatalogItem): ShowcaseCategory {
  const text = `${item.topic} ${item.domain} ${item.metaphor}`.toLowerCase();

  // 1. Anatomy / Biological
  if (
    item.domain === 'BIOLOGICAL' ||
    /heart|anatomy|brain|lung|skeleton|organ|cell|biological|muscle|bone|eye|tissue|cardiac/.test(text)
  ) {
    return 'Anatomy';
  }

  // 2. Electronics / Computing
  if (
    item.domain === 'SOFTWARE' ||
    /electronic|circuit|transformer|computer|chip|sensor|microcontroller|transistor|battery|diode|solenoid|neural|cpu|gpu|ram|logic/.test(text)
  ) {
    return 'Electronics';
  }

  // 3. Mechanical / Physical Assemblies
  if (
    /camera|engine|turbofan|watch|gear|motor|piston|pump|turbine|mechanical|transmission|valve|chassis|spool|lens|shutter|lever/.test(text)
  ) {
    return 'Mechanical';
  }

  // 4. Science / Experimental
  if (
    /quantum|laser|physics|chemistry|optics|atom|telescope|spectrometer|science|laboratory|reaction|magnetic/.test(text)
  ) {
    return 'Science';
  }

  // 5. Everyday / Consumer Artifacts
  if (
    /coffee|pen|clock|lock|toaster|blender|everyday|bicycle|zipper|padlock|umbrella|chair|thermos/.test(text)
  ) {
    return 'Everyday';
  }

  // Domain fallback mappings
  if (item.domain === 'PHYSICAL') return 'Mechanical';
  if (item.domain === 'CONCEPTUAL') return 'Science';

  return 'Everyday';
}

/**
 * Resolve whether an item was generated via Pro Studio or Budget Saver tier.
 */
export function resolveItemModelTier(item: CommunityCatalogItem): 'Pro Studio' | 'Budget Saver' {
  const metaTier = (item as any).modelTier || (item as any).manifest?.modelTier;
  if (metaTier === 'pro') return 'Pro Studio';
  if (metaTier === 'budget') return 'Budget Saver';

  // Pro Studio generates cinematic assembly video by default
  if (item.videoUrl && item.videoUrl.trim().length > 0) {
    return 'Pro Studio';
  }

  if (item.id.toLowerCase().includes('budget')) {
    return 'Budget Saver';
  }

  return 'Pro Studio';
}

/**
 * Resolve component count for an item (from metadata or deterministic fallback).
 */
export function resolveComponentCount(item: CommunityCatalogItem): number {
  if (typeof (item as any).componentCount === 'number' && (item as any).componentCount > 0) {
    return (item as any).componentCount;
  }
  if (Array.isArray((item as any).components) && (item as any).components.length > 0) {
    return (item as any).components.length;
  }
  if (Array.isArray((item as any).plan?.componentList) && (item as any).plan.componentList.length > 0) {
    return (item as any).plan.componentList.length;
  }
  // Deterministic count based on ID hash (between 6 and 14 parts)
  const charSum = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (charSum % 8) + 6;
}

/**
 * Return domain styling classes based on category.
 */
export function getCategoryBadgeClasses(category: ShowcaseCategory): {
  badge: string;
  indicator: string;
  glow: string;
} {
  switch (category) {
    case 'Mechanical':
      return {
        badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        indicator: 'bg-cyan-400',
        glow: 'group-hover:border-cyan-500/50 group-hover:shadow-cyan-500/10',
      };
    case 'Anatomy':
      return {
        badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        indicator: 'bg-rose-400',
        glow: 'group-hover:border-rose-500/50 group-hover:shadow-rose-500/10',
      };
    case 'Electronics':
      return {
        badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        indicator: 'bg-purple-400',
        glow: 'group-hover:border-purple-500/50 group-hover:shadow-purple-500/10',
      };
    case 'Science':
      return {
        badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        indicator: 'bg-amber-400',
        glow: 'group-hover:border-amber-500/50 group-hover:shadow-amber-500/10',
      };
    case 'Everyday':
      return {
        badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        indicator: 'bg-emerald-400',
        glow: 'group-hover:border-emerald-500/50 group-hover:shadow-emerald-500/10',
      };
    default:
      return {
        badge: 'bg-slate-800 text-slate-300 border-slate-700',
        indicator: 'bg-slate-400',
        glow: 'group-hover:border-slate-600',
      };
  }
}

// ============================================================================
// Main Component Implementation
// ============================================================================

export const CommunityShowcase: React.FC<CommunityShowcaseProps> = ({
  onSelectTopic,
  catalogItems: propItems,
  isLoading: propLoading,
  hasKey = false,
  onOpenApiKeyModal,
}) => {
  // 1. Data Fetching State
  const [internalItems, setInternalItems] = useState<CommunityCatalogItem[]>(() => SEED_COMMUNITY_CATALOG);
  const [internalLoading, setInternalLoading] = useState<boolean>(propItems === undefined);

  // 2. Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<ShowcaseCategory>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'collapsible'>('grid');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // 3. Hero Carousel State
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState<boolean>(false);
  const carouselTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-fetch if catalogItems prop is not passed
  useEffect(() => {
    if (propItems !== undefined) {
      setInternalItems(propItems);
      setInternalLoading(false);
      return;
    }

    let isMounted = true;
    setInternalLoading(true);

    fetchCommunityCatalog()
      .then((items) => {
        if (isMounted) {
          if (Array.isArray(items) && items.length > 0) {
            setInternalItems(items);
          } else {
            setInternalItems(SEED_COMMUNITY_CATALOG);
          }
        }
      })
      .catch((err) => {
        console.warn('[CommunityShowcase] Failed to fetch catalog, using seed fallback:', err);
        if (isMounted) {
          setInternalItems(SEED_COMMUNITY_CATALOG);
        }
      })
      .finally(() => {
        if (isMounted) {
          setInternalLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [propItems]);

  const items = propItems !== undefined ? propItems : internalItems;
  const isLoading = propLoading !== undefined ? propLoading : internalLoading;

  // Curate Featured Items for Hero Carousel (top items with rich visuals/videos)
  const featuredItems = useMemo(() => {
    if (!items || items.length === 0) return SEED_COMMUNITY_CATALOG;
    // Prefer items that have video or are seed items first
    const sorted = [...items].sort((a, b) => {
      const aScore = (a.videoUrl ? 2 : 0) + (a.previewUrl ? 1 : 0);
      const bScore = (b.videoUrl ? 2 : 0) + (b.previewUrl ? 1 : 0);
      return bScore - aScore;
    });
    return sorted.slice(0, 5);
  }, [items]);

  // Carousel Autoplay Timer
  const advanceSlide = useCallback(() => {
    setActiveSlide((prev) => (featuredItems.length > 0 ? (prev + 1) % featuredItems.length : 0));
  }, [featuredItems.length]);

  const prevSlide = useCallback(() => {
    setActiveSlide((prev) =>
      featuredItems.length > 0 ? (prev - 1 + featuredItems.length) % featuredItems.length : 0
    );
  }, [featuredItems.length]);

  useEffect(() => {
    if (isCarouselPaused || featuredItems.length <= 1 || isLoading) {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
        carouselTimerRef.current = null;
      }
      return;
    }

    carouselTimerRef.current = setInterval(advanceSlide, 6000);
    return () => {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
        carouselTimerRef.current = null;
      }
    };
  }, [isCarouselPaused, featuredItems.length, advanceSlide, isLoading]);

  // Filter & Search Logic
  const filteredItems = useMemo(() => {
    if (!items) return [];

    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const category = resolveItemCategory(item);

      // Category filter check
      if (selectedCategory !== 'All' && category !== selectedCategory) {
        return false;
      }

      // Keyword query check
      if (query.length > 0) {
        const titleMatch = item.topic.toLowerCase().includes(query);
        const domainMatch = item.domain.toLowerCase().includes(query);
        const metaphorMatch = item.metaphor.toLowerCase().includes(query);
        const categoryMatch = category.toLowerCase().includes(query);
        if (!titleMatch && !domainMatch && !metaphorMatch && !categoryMatch) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedCategory, searchQuery]);

  // Category counts for chip badges
  const categoryCounts = useMemo(() => {
    const counts: Record<ShowcaseCategory, number> = {
      All: items.length,
      Mechanical: 0,
      Anatomy: 0,
      Electronics: 0,
      Science: 0,
      Everyday: 0,
    };

    items.forEach((item) => {
      const cat = resolveItemCategory(item);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return counts;
  }, [items]);

  // Keyboard navigation for Carousel
  const handleCarouselKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      advanceSlide();
    }
  };

  const toggleAllCollapsible = () => {
    const domainCats = SHOWCASE_CATEGORIES.filter(c => c !== 'All');
    const allAreCollapsed = domainCats.every(c => Boolean(collapsedCategories[c]));
    if (allAreCollapsed) {
      setCollapsedCategories({});
    } else {
      const next: Record<string, boolean> = {};
      domainCats.forEach(c => {
        next[c] = true;
      });
      setCollapsedCategories(next);
    }
  };

  const renderTopicCard = (item: CommunityCatalogItem) => {
    const category = resolveItemCategory(item);
    const tier = resolveItemModelTier(item);
    const categoryClasses = getCategoryBadgeClasses(category);
    const componentCount = resolveComponentCount(item);

    return (
      <article
        key={item.id}
        onClick={() => onSelectTopic(item)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTopic(item);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`Explore ${item.topic}, ${category}, ${componentCount} components`}
        className={`group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800/90 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 flex flex-col ${categoryClasses.glow}`}
      >
        {/* Card Thumbnail Area */}
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
          <img
            src={item.previewUrl || item.infographicUrl}
            alt={item.topic}
            loading="lazy"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Graceful fallback to styled blueprint canvas
              e.currentTarget.style.display = 'none';
            }}
          />

          {/* Gradient Overlay for Readable Badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />

          {/* Top Badges: Domain & Tier */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border backdrop-blur-md ${categoryClasses.badge}`}
            >
              {category}
            </span>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md ${
                tier === 'Pro Studio'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {tier}
            </span>
          </div>

          {/* Hover Explore Quick Prompt Overlay */}
          <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
              <span>Explore Deconstruction</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
        </div>

        {/* Card Content Area */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
              {item.topic}
            </h4>
            <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1.5 font-light">
              <span className="text-cyan-400">✦</span>
              <span>{item.metaphor}</span>
            </p>
          </div>

          {/* Metadata & Media Feature Indicators */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            {/* Component Count Indicator */}
            <span className="flex items-center gap-1.5 text-slate-300">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>{componentCount} parts</span>
            </span>

            {/* Media Capabilities Badges */}
            <div className="flex items-center gap-2">
              {item.videoUrl && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
                  title="Includes cinematic Veo assembly video"
                >
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Video
                </span>
              )}

              {item.audioUrl && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 flex items-center gap-1"
                  title="Includes narrated audio tour"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                  Audio
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* ================================================================== */}
      {/* SECTION 1: HERO FEATURED CAROUSEL */}
      {/* ================================================================== */}
      <section aria-label="Featured Community Deconstructions" className="relative">
        {isLoading ? (
          <CarouselSkeleton />
        ) : featuredItems.length > 0 ? (
          <div
            className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/90 shadow-2xl shadow-cyan-950/20 group focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
            onFocus={() => setIsCarouselPaused(true)}
            onBlur={() => setIsCarouselPaused(false)}
            onKeyDown={handleCarouselKeyDown}
            tabIndex={0}
            role="region"
            aria-roledescription="carousel"
            aria-label="Featured Exploded Views"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Slides Container */}
            <div className="relative min-h-[420px] md:min-h-[480px] lg:min-h-[520px] flex items-center">
              {featuredItems.map((item, idx) => {
                const isActive = idx === activeSlide;
                const category = resolveItemCategory(item);
                const tier = resolveItemModelTier(item);
                const categoryClasses = getCategoryBadgeClasses(category);
                const componentCount = resolveComponentCount(item);

                return (
                  <div
                    key={item.id}
                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex flex-col md:flex-row items-center justify-between p-6 sm:p-10 lg:p-14 ${
                      isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${idx + 1} of ${featuredItems.length}: ${item.topic}`}
                    aria-hidden={!isActive}
                  >
                    {/* Background Backdrop Image with Gradient Vignette */}
                    <div className="absolute inset-0 -z-10 overflow-hidden">
                      <img
                        src={item.previewUrl || item.infographicUrl}
                        alt=""
                        className="w-full h-full object-cover object-center filter blur-sm scale-105 opacity-25 transition-transform duration-1000 group-hover:scale-110"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/60" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    </div>

                    {/* Left Column: Hero Copy & Actions */}
                    <div className="w-full md:w-3/5 space-y-5 z-10">
                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Domain Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${categoryClasses.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${categoryClasses.indicator} animate-pulse`} />
                          {category}
                        </span>

                        {/* Model Tier Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            tier === 'Pro Studio'
                              ? 'bg-gradient-to-r from-amber-400/20 to-orange-500/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-500/20'
                              : 'bg-gradient-to-r from-emerald-400/20 to-teal-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm shadow-emerald-500/20'
                          }`}
                        >
                          {tier === 'Pro Studio' ? (
                            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          {tier}
                        </span>

                        {/* Video Feature Badge */}
                        {item.videoUrl && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            Veo 3.1 Kinematics
                          </span>
                        )}
                      </div>

                      {/* Title & Metaphor */}
                      <div className="space-y-2">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                          {item.topic}
                        </h2>
                        <p className="text-sm sm:text-base text-slate-300 font-light flex items-center gap-2">
                          <span className="text-cyan-400 font-mono">▸</span>
                          <span className="italic">{item.metaphor}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400">{componentCount} deconstructed sub-assemblies</span>
                        </p>
                      </div>

                      {/* Action CTA Button */}
                      <div className="pt-2 flex flex-wrap items-center gap-4">
                        <button
                          type="button"
                          onClick={() => onSelectTopic(item)}
                          className="px-6 py-3.5 rounded-xl font-bold text-white text-sm sm:text-base flex items-center gap-3 transition-all duration-300 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                        >
                          <span>Explore Deconstruction</span>
                          <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>

                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          100% Free • Keyless Inspection
                        </span>
                      </div>
                    </div>

                    {/* Right Column: High-Res Visual Preview Card */}
                    <div className="w-full md:w-2/5 mt-6 md:mt-0 flex justify-center z-10">
                      <div
                        onClick={() => onSelectTopic(item)}
                        className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/80 shadow-2xl p-2 cursor-pointer hover:border-cyan-400/80 hover:shadow-cyan-500/20 transition-all duration-300 group/preview"
                      >
                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                          <img
                            src={item.infographicUrl || item.previewUrl}
                            alt={item.topic}
                            className="w-full h-full object-cover object-center group-hover/preview:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              // Safe visual placeholder fallback
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80" />
                          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-300 font-mono">
                            <span className="bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
                              HD Exploded View
                            </span>
                            <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded border border-cyan-500/40 flex items-center gap-1">
                              View Blueprint ↗
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carousel Navigation Footer Controls */}
            <div className="absolute bottom-4 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
              {/* Pagination Indicators */}
              <div className="flex items-center gap-2 pointer-events-auto" role="tablist" aria-label="Carousel pagination">
                {featuredItems.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    type="button"
                    role="tab"
                    aria-selected={dotIdx === activeSlide}
                    aria-label={`Go to slide ${dotIdx + 1}`}
                    onClick={() => setActiveSlide(dotIdx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      dotIdx === activeSlide
                        ? 'w-8 bg-cyan-400 shadow-md shadow-cyan-400/50'
                        : 'w-2 bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>

              {/* Prev / Next Buttons & Counter */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <span className="text-xs font-mono text-slate-400 mr-2">
                  0{activeSlide + 1} / 0{featuredItems.length}
                </span>

                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous slide"
                  className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={advanceSlide}
                  aria-label="Next slide"
                  className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ================================================================== */}
      {/* SECTION 1.5: API KEY CALL-TO-ACTION BANNER / CARD */}
      {/* ================================================================== */}
      {!hasKey ? (
        <section
          aria-label="Unlock Custom Deconstructions"
          tabIndex={0}
          onClick={onOpenApiKeyModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenApiKeyModal?.();
            }
          }}
          className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-r from-slate-900/95 via-cyan-950/40 to-slate-900/95 p-5 sm:p-8 shadow-xl shadow-cyan-950/20 cursor-pointer group/banner transition-all duration-300 hover:border-cyan-400/50 hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          {/* Ambient Glows */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left: Copy and benefits */}
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Custom Generations
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  • BYOK Session Storage
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Craft Your Own Exploded Views
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Enter your Gemini API key to craft custom exploded views of any physical object, machine, or biological system. Generate blueprints, deep dive component analyses, and assembly videos.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Session-only storage (tab memory)
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Zero server credentials
                </span>
              </div>
            </div>

            {/* Right: Action Button */}
            <div className="w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenApiKeyModal?.();
                }}
                className="w-full sm:w-auto px-5 sm:px-6 py-3.5 rounded-xl font-bold text-white text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all duration-300 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                aria-label="Enter Gemini API key to craft custom exploded views"
              >
                <svg className="w-4 h-4 text-cyan-200 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span className="text-center">Enter Gemini Key to Craft Custom Views</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section
          aria-label="Active Gemini Key Status"
          className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-slate-900/95 via-emerald-950/30 to-slate-900/95 p-4 sm:p-6 shadow-xl shadow-emerald-950/20"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h4 className="text-sm font-bold text-white">Gemini API Key Active</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                    Custom Generations Unlocked
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Session key active (tab memory only). Enter any object in the prompt bar above to create custom deconstructions.
                </p>
              </div>
            </div>
            {onOpenApiKeyModal && (
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer shrink-0 text-center"
              >
                Manage Key
              </button>
            )}
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* SECTION 2: SEARCH & CATEGORY FILTER CONTROLS */}
      {/* ================================================================== */}
      <section aria-label="Search and Filter Controls" className="space-y-6">
        {/* Header & Subtitle */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>EXPLORATION CATALOG</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">COMMUNITY CONTRIBUTIONS</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Community Deconstructions
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Explore exploded physical objects, engineering assemblies, and biological structures shared by the community.
            </p>
          </div>

          {/* Results Count Indicator */}
          <div className="text-xs font-mono text-slate-400 self-start md:self-end">
            Showing <span className="text-cyan-400 font-bold">{filteredItems.length}</span> of{' '}
            <span className="text-slate-300 font-bold">{items.length}</span> topics
          </div>
        </div>

        {/* Controls Bar: Search Input + Category Chips */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Category Filter Chips */}
          <div
            className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none"
            role="tablist"
            aria-label="Filter by Domain"
          >
            {SHOWCASE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = categoryCounts[cat] || 0;

              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-1 ring-cyan-400'
                      : 'bg-slate-900/80 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input + View Mode Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Live Search Input */}
            <div className="relative flex-1 sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, domain, metaphor..."
                aria-label="Search community topics"
                className="w-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View Mode Toggle Switcher */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shrink-0 self-end sm:self-auto" role="group" aria-label="Catalog view mode">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
                title="Card Grid View"
                className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm ring-1 ring-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h7v7H4V4zm0 9h7v7H4v-7zm9-9h7v7h-7V4zm0 9h7v7h-7v-7z" />
                </svg>
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('collapsible')}
                aria-label="Collapsible category view"
                aria-pressed={viewMode === 'collapsible'}
                title="Collapsible Category Viewer"
                className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'collapsible'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm ring-1 ring-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">By Category</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3: TOPIC CARD GRID / COLLAPSIBLE CATEGORY VIEWER           */}
      {/* ================================================================== */}
      <section aria-label="Topic Card Gallery">
        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : filteredItems.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map((item) => renderTopicCard(item))}
            </div>
          ) : (
            /* Collapsible Category Mode */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono text-slate-400">
                  Categorized Deconstructions ({filteredItems.length} topics)
                </span>
                <button
                  type="button"
                  onClick={toggleAllCollapsible}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  Toggle All Categories
                </button>
              </div>

              {SHOWCASE_CATEGORIES.filter((c) => c !== 'All').map((cat) => {
                const catItems = filteredItems.filter((item) => resolveItemCategory(item) === cat);
                if (catItems.length === 0) return null;
                const isCollapsed = Boolean(collapsedCategories[cat]);
                const catClasses = getCategoryBadgeClasses(cat);

                return (
                  <div key={cat} className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-lg">
                    {/* Category Accordion Header */}
                    <button
                      type="button"
                      onClick={() => setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                      aria-expanded={!isCollapsed}
                      aria-label={`${cat} category, ${catItems.length} topics`}
                      className="w-full flex items-center justify-between p-4 sm:p-5 bg-slate-900/90 hover:bg-slate-850 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${catClasses.indicator}`} />
                        <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                          {cat}
                        </h4>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {catItems.length} {catItems.length === 1 ? 'topic' : 'topics'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-xs font-mono hidden sm:inline">
                          {isCollapsed ? 'Expand' : 'Collapse'}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-slate-950/40">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {catItems.map((item) => renderTopicCard(item))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-slate-200">No deconstructions found</h4>
              <p className="text-xs sm:text-sm text-slate-400">
                No community models matched &ldquo;{searchQuery}&rdquo; in the {selectedCategory} category.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Clear Filters &amp; Search
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

// ============================================================================
// Skeleton Loading Components
// ============================================================================

export const CarouselSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[440px] rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-12 animate-pulse flex flex-col justify-between">
      <div className="space-y-4 max-w-lg">
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-slate-800 rounded-full" />
          <div className="h-6 w-28 bg-slate-800 rounded-full" />
        </div>
        <div className="h-10 w-3/4 bg-slate-800 rounded-xl" />
        <div className="h-4 w-1/2 bg-slate-800/80 rounded" />
        <div className="h-12 w-48 bg-slate-800 rounded-xl pt-2" />
      </div>
      <div className="flex justify-between items-center pt-8">
        <div className="flex gap-2">
          <div className="h-2 w-8 bg-slate-800 rounded-full" />
          <div className="h-2 w-2 bg-slate-800 rounded-full" />
          <div className="h-2 w-2 bg-slate-800 rounded-full" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-slate-800 rounded-lg" />
          <div className="h-8 w-8 bg-slate-800 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden animate-pulse flex flex-col"
        >
          <div className="aspect-[16/10] bg-slate-800" />
          <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-5 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800/60 rounded w-1/2" />
            </div>
            <div className="pt-3 border-t border-slate-800/60 flex justify-between">
              <div className="h-3 bg-slate-800 rounded w-1/3" />
              <div className="h-3 bg-slate-800 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CommunityShowcase;
