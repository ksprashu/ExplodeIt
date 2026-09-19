---
type: "Scout / Tech Stack"
title: "Runtime & Build Technology Stack"
description: "Comprehensive specification of React 19, Vite 6, Tailwind CSS v4, @google/genai SDK, and supporting ecosystem libraries."
resource: "file:///C:/Users/kspra/code/github/ExplodeIt/package.json"
tags: ["tech-stack", "react", "vite", "tailwindcss", "genai-sdk"]
---

# Runtime & Build Technology Stack

## Overview
The ExplodeIt application leverages a bleeding-edge modern web frontend stack designed for zero-latency UI reactivity, strict static type safety, and direct client-side integration with Google's foundation AI models.

## Core Dependency Matrix

| Layer | Package / Technology | Version | Purpose & Architectural Role |
|---|---|---|---|
| **UI Framework** | `react` | `^19.2.0` | Next-generation declarative component architecture and concurrent DOM rendering. |
| **DOM Renderer** | `react-dom` | `^19.2.0` | Browser DOM reconciliation engine for React 19. |
| **Bundler & Dev Server** | `vite` | `^6.2.0` | Ultra-fast ESM development server and Rollup-based production bundler. |
| **Styling Engine** | `tailwindcss` | `^4.1.17` | Utility-first styling with the high-performance CSS-first v4 engine. |
| **Vite Style Plugin** | `@tailwindcss/vite` | `^4.1.17` | Native Vite integration plugin replacing legacy PostCSS build chains. |
| **Typography Styling** | `@tailwindcss/typography` | `^0.5.19` | Tailwind plugin providing rich typography styling for Markdown output. |
| **AI Foundation SDK** | `@google/genai` | `^1.30.0` | Official Google GenAI SDK for Gemini multimodal generation, structured output, and Veo. |
| **Markdown Parser** | `react-markdown` | `^10.1.0` | React component for parsing and rendering Markdown AST safely into JSX elements. |
| **Analytics Engine** | `react-ga4` | `^2.1.0` | Google Analytics 4 integration for usage metrics and event tracking. |
| **Test Runner** | `vitest` | `^5.0.0` | High-performance unit, contract, and adversarial test runner with native Vite alignment. |
| **DOM Testing** | `@testing-library/react` | `^16.3.3` | User-centric React 19 component interaction and DOM assertion framework. |
| **DOM Simulator** | `jsdom` | `^29.1.1` | Pure JavaScript browser environment simulation for node-based test runs. |
| **Browser Storage** | `IndexedDB API` | `Native` | Client-side persistent binary storage for 3-tier media caching (`services/mediaCache.ts`). |
| **Edge Storage** | `Cloudflare R2` | `Native API` | S3-compatible zero-egress cloud object store for public showcase contributions. |
| **Language** | `typescript` | `~5.8.2` | Static type checker enforcing compile-time correctness across models and services. |
| **Type Definitions** | `@types/node` | `^22.14.0` | Ambient Node.js type bindings for environment variables and build scripts. |

## Ecosystem Architecture Decisions

### 1. React 19 Adoption
ExplodeIt adopts React 19 (`^19.2.0`), unlocking:
- Streamlined ref handling without requiring `forwardRef` wrappers.
- Enhanced hydration performance and concurrent execution primitives.
- Native alignment with modern component lifecycle patterns.

### 2. Tailwind CSS v4 Architecture
Unlike Tailwind v3, which depended on heavy PostCSS configurations and JavaScript-based configuration files (`tailwind.config.js`), ExplodeIt utilizes Tailwind v4 via `@tailwindcss/vite`:
- **Direct CSS Configuration**: Themes, custom utilities, and directives are declared directly in CSS (`index.css`) via `@import "tailwindcss";`.
- **Lightning Compilation**: Leverages Rust-based Oxide engine under the hood for near-instantaneous style re-computation during hot module replacement (HMR).

### 3. Direct Google GenAI SDK (`@google/genai`)
The application bypasses intermediate proxy servers and backend gateways by directly integrating `@google/genai` in the browser client:
- **Client-Side Multimodal Generation**: Direct transmission of base64 image data and audio waveforms between browser and Google AI endpoints.
- **Dynamic Key Management**: Supports runtime key reconfiguration without application restart or server reload.
