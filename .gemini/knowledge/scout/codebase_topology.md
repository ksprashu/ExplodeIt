---
type: "Scout / Topology"
title: "Codebase Topology & Directory Structure"
description: "Comprehensive structural map of ExplodeIt components, services, configuration, and build artifacts."
resource: "file:///C:/Users/kspra/code/github/ExplodeIt/README.md"
tags: ["topology", "file-tree", "structure", "directories"]
---

# Codebase Topology & Directory Structure

## Overview
ExplodeIt is engineered as a zero-backend, client-heavy single-page web application (SPA) built on React 19, TypeScript, Vite 6, and Tailwind CSS v4. The repository layout decouples UI presentation, orchestration state machines, generative AI service integrations, and container deployment assets.

## Directory Tree

```text
ExplodeIt/
├── .agents/                        # Autonomous multi-agent coordination, governance & audit artifacts
│   ├── DAG.md                      # Milestone dependency graph and verification contracts
│   ├── EVIDENCE.md                 # Immutable verification log and evidence ledger
│   ├── ORIGINAL_REQUEST.md         # Authoritative user requirements specification
│   ├── orchestrator/               # Orchestrator transcripts and session plans
│   ├── sentinel/                   # System invariants and safety audit monitors
│   └── survey/                     # Survey milestone handoff and architectural discovery
│       └── handoff.md              # Phase 0 discovery report
├── .gemini/                        # Local session persistence and OKF knowledge catalog
│   ├── CURRENT_SESSION.md          # Working memory and operational state
│   └── knowledge/                  # Open Knowledge Format (OKF) Progressive Disclosure Tree
│       ├── index.md                # Master knowledge catalog index
│       ├── log.md                  # Chronological catalog update ledger
│       ├── scout/                  # Topology, entry points, technology stack, environment bindings
│       ├── analyst/                # Domain types, cost models, state machines
│       ├── architecture/           # Generative AI pipeline, BYOK security, container architecture
│       ├── builder/                # Vite build, Tailwind v4, CI/CD, local dev runbooks
│       └── sentry/                 # Error recovery, exponential backoff, memory management
├── .github/                        # GitHub Actions automated workflows
│   └── workflows/
│       └── gh-pages.yml            # Static deployment pipeline to GitHub Pages
├── components/                     # Declarative React 19 presentation and interactive components
│   ├── ApiKeyModal.tsx             # BYOK credential modal & custom prompt interception dialog
│   ├── CommunityContributeModal.tsx # Post-generation opt-in community contribution dialog
│   ├── CommunityShowcase.tsx       # Keyless topic exploration, hero carousel, and search filter
│   ├── DisplayArea.tsx             # Multimedia rendering (image, video, audio) & markdown viewer
│   ├── Header.tsx                  # Top navigation bar with model tier switcher & settings
│   ├── InputArea.tsx               # Prompt bar, video animation toggle, Surprise Me action
│   ├── ModelSettingsModal.tsx      # Granular stage model overrides and pricing inspection modal
│   ├── ProgressTracker.tsx         # Multi-step generation pipeline visual progress indicator
│   └── Sidebar.tsx                 # Generation history drawer, token analytics & session cost tracking
├── functions/                      # Cloudflare Pages serverless functions
│   └── api/
│       └── contribute.ts           # R2 contribution upload endpoint with allowlist validation
├── public/                         # Public static assets served unbundled
│   └── favicon.svg                 # Vector brand favicon
├── services/                       # Business logic and third-party service abstractions
│   ├── analytics.ts                # Telemetry and Google Analytics 4 event tracking
│   ├── communityStorage.ts         # Remote Cloudflare R2 community bundle packaging and fetching
│   ├── geminiService.ts            # GenAI SDK orchestration, retry loops, asset management
│   ├── mediaCache.ts               # IndexedDB 3-tier media cache with LRU eviction and ObjectURL pool
│   └── mockCommunityStorage.ts     # Offline in-memory mock driver for community catalog
├── tests/                          # Automated Vitest contract, E2E, and adversarial test suites
│   ├── contracts/                  # Modular interface contract tests (pricing, sanitization, cache)
│   ├── e2e/                        # End-to-end user scenario tests (showcase, generation, contribution)
│   ├── mocks/                      # Deterministic mock fixtures for storage and generation items
│   └── setup.ts                    # Global polyfills (IndexedDB, URL, TextEncoder)
├── App.tsx                         # Root React application controller and generation state machine
├── CODE_OF_CONDUCT.md              # Community code of conduct guidelines
├── CONTRIBUTING.md                 # Open source contributor instructions and workflow rules
├── Dockerfile                      # Multi-stage production container build (Node 20 -> Nginx Alpine)
├── GEMINI.md                       # Project technical summary and operational commands
├── index.css                       # CSS stylesheet with Tailwind CSS v4 theme directives
├── index.html                      # HTML5 single-page application entry point template
├── index.tsx                       # React 19 DOM root mounting and application bootstrap
├── LICENSE                         # Project open-source license
├── metadata.json                   # Web application metadata and configuration
├── nginx.conf                      # High-performance SPA routing and asset cache configuration
├── package.json                    # NPM package dependencies, metadata, and scripts
├── package-lock.json               # Locked dependency version tree
├── PROJECT.md                      # Project architectural documentation and feature inventory
├── README.md                       # Primary repository documentation and user guide
├── tailwind.config.js              # Tailwind CSS configuration and theme extensions
├── TEST_INFRA.md                   # Systematic 4-tier testing specification and methodology
├── TEST_READY.md                   # Vitest readiness summary and test pass validation
├── tsconfig.json                   # TypeScript compiler configuration (ESNext, React JSX)
├── types.ts                        # Canonical TypeScript interface definitions and domain types
├── vite.config.ts                  # Vite build tooling configuration and environment variable bindings
└── vitest.config.ts                # Vitest test runner configuration and jsdom environment setup
```

## Subsystem Functional Responsibilities

### 1. Presentation Layer (`components/`)
- **`ApiKeyModal.tsx`**: Manages credential acquisition. Intercepts custom prompt generation in keyless exploration mode and enables key rotation.
- **`CommunityContributeModal.tsx`**: Provides an opt-in contribution dialog after successful generation with zero-cost and privacy reassurance badges.
- **`CommunityShowcase.tsx`**: Powers keyless home exploration with a responsive hero carousel, search filtering, and one-click topic loading into `DisplayArea.tsx`.
- **`DisplayArea.tsx`**: Renders dynamic multimedia outputs including 16:9 exploded diagrams, assembled product renders, high-resolution modal zoom overlays, Veo animation video playback, synthesized speech audio playback with timeline controls, and rich markdown deconstruction articles.
- **`Header.tsx`**: Renders top brand logo, quick model tier switcher (`[Pro Studio | Budget Saver]`), settings modal trigger, and active BYOK key indicator.
- **`InputArea.tsx`**: Captures user queries, displays dynamic estimated run cost badges, and toggles video generation.
- **`ModelSettingsModal.tsx`**: Allows granular per-stage model selection across all 6 generation phases and displays real-time pricing matrix rates.
- **`ProgressTracker.tsx`**: Visual multi-phase progress indicator with model badge annotations for each stage.
- **`Sidebar.tsx`**: Houses historical generation sessions, persistent item selection, cumulative token usage counters, and cumulative USD cost projections.

### 2. Service Layer (`services/`)
- **`geminiService.ts`**: The core AI execution engine. Implements client-side SDK bindings (`@google/genai`), kinematic prompt interpolation, structured schema enforcement, parallel batch processing for component deep-dives, binary WAV audio reconstruction, and object URL revocation.
- **`communityStorage.ts`**: Handles client-side packaging of `GenerationItem` into `SanitizedGenerationBundle`, runs `assertZeroLeak` sanitization, and communicates with `/api/contribute`.
- **`mediaCache.ts`**: Implements the 3-tier media cache with IndexedDB persistence, in-memory `urlPool` management, and LRU eviction.
- **`mockCommunityStorage.ts`**: In-memory and local mock driver supplying seed showcase topics for offline and CI execution.
- **`analytics.ts`**: Encapsulates telemetry and Google Analytics 4 event tracking for model calls, latency, and pipeline errors.

### 3. Serverless API Layer (`functions/`)
- **`functions/api/contribute.ts`**: Cloudflare Pages Function binding directly to Cloudflare R2 (`EXPLODEIT_BUCKET`), validating incoming multipart form data, writing media assets, and updating `catalog.json`.

### 4. State Controller (`App.tsx`)
- Orchestrates asynchronous transitions between generation stages.
- Manages keyless showcase mode and seamless interception on custom prompt submission.
- Handles model tier state, community contribution prompts, and history retention.
- Coordinates key management and error boundary reporting.

### 4. Build & Deployment Infrastructure
- **`vite.config.ts`**: Handles fast ESM compilation, Tailwind CSS v4 integration, path aliases (`@/`), and compile-time environment variable substitution.
- **`Dockerfile` & `nginx.conf`**: Implements a two-stage build yielding a minimal alpine-based Nginx web server optimized for Google Cloud Run and Kubernetes.
