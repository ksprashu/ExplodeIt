---
type: "Scout / User Interface & Navigation"
title: "Public Showcase, Carousel & Keyless Exploration System"
description: "Decoupled startup authentication enabling keyless exploration of pre-generated topics, carousel, and one-click loading."
resource: "file:///components/CommunityShowcase.tsx"
tags: ["showcase", "keyless-exploration", "carousel", "community", "ux-navigation"]
---

# Public Showcase, Carousel & Keyless Exploration System

## Overview
Earlier architectures required users to provide an API key via a modal splash screen immediately upon loading the web application. ExplodeIt's **Public Showcase System** decouples authentication from initial page visit, providing an interactive, zero-barrier exploration experience where anyone can explore community and pre-generated deconstructions without possessing an API key.

## Key Subsystems & User Flows

```text
┌─────────────────────────────────────────────────────────────┐
│                      Initial Site Visit                     │
│               (No API Key configured in storage)            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Decoupled Home View (CommunityShowcase.tsx)        │
│ • Featured Hero Carousel of popular exploded views          │
│ • Filterable topic grid (Engineering, Anatomy, Astronomy...)│
│ • Live search by keyword, tag, or component name            │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               │ Click Topic Card             │ Enters custom prompt
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│ One-Click Interactive Load   │ │ BYOK Interception Modal    │
│ • Loads full deconstruction  │ │ • Prompts for API key      │
│   into DisplayArea.tsx       │ │ • Re-triggers custom run   │
│ • Instant media cache lookup │ │   seamlessly upon submit   │
│ • Zero API key required      │ └────────────────────────────┘
└──────────────────────────────┘
```

## Component Architecture

### 1. Hero Showcase Carousel
- Located at the top of `CommunityShowcase.tsx`.
- Rotates featured engineering marvels and biological structures with high-resolution visual previews, component counts, and topic descriptions.
- Smooth CSS transitions and pause-on-hover interaction.

### 2. Search & Tag Filtering Engine
- Real-time client-side filter querying topic title, domain categorization, structural components, and anatomical tags.
- Instant responsive card grid rendering with material badges and model badges.

### 3. One-Click Interactive Loading
- When a showcase topic is selected:
  - Dispatches `onSelectTopic(catalogItem)` to `App.tsx`.
  - Downloads manifest and Blobs from community storage (or IndexedDB cache).
  - Populates active `item: GenerationItem` state.
  - Mounts `DisplayArea.tsx` with full interactive component deep-dives, audio tour playback, and high-resolution video preview.
  - User can explore internal cutaways and scientific analysis with zero API credentials.

### 4. Seamless Key Interception on Custom Prompting
- If a user in keyless mode types their own prompt into `InputArea.tsx`:
  - `App.tsx` intercepts the submission.
  - Automatically saves the pending prompt and configuration.
  - Displays `ApiKeyModal.tsx` explaining that custom AI generation requires a personal key.
  - Upon valid key submission, immediately resumes the generation pipeline without requiring the user to re-enter their prompt.
