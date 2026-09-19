---
type: "Builder / Build System"
title: "Vite 6 & Tailwind CSS v4 Build System"
description: "Configuration of @tailwindcss/vite plugin, asset bundler, post-processing, and relative path resolutions."
resource: "file:///C:/Users/kspra/code/github/ExplodeIt/vite.config.ts"
tags: ["build-system", "vite", "tailwind-v4", "bundler", "postcss"]
---

# Vite 6 & Tailwind CSS v4 Build System

## Overview
ExplodeIt uses Vite 6 paired with Tailwind CSS v4 to deliver instantaneous development rebuilds and optimized production distribution bundles. By adopting the native `@tailwindcss/vite` plugin, the build pipeline eliminates legacy PostCSS overhead and transitions to a modern CSS-first architecture.

## Build Tooling Architecture

```mermaid
graph LR
    subgraph Development Server
        DevCode[Source TypeScript / TSX] -->|Vite HMR Engine| BrowserClient[Browser Client :3000]
        CSSDirectives[index.css @import 'tailwindcss'] -->|@tailwindcss/vite Oxide Compiler| BrowserClient
    end

    subgraph Production Compilation
        TSFiles[TypeScript Source] -->|esbuild Transform| Rollup[Rollup Bundler]
        CSSFiles[Tailwind CSS v4 Directives] -->|Tailwind CSS Bundler| Rollup
        Rollup --> DistHTML[dist/index.html]
        Rollup --> DistCSS[dist/assets/index-*.css]
        Rollup --> DistJS[dist/assets/index-*.js]
    end
```

## Configuration Breakdown (`vite.config.ts`)

```typescript
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

### Key Build Features:
1. **`@tailwindcss/vite` Plugin**:
   - Replaces traditional `postcss.config.js` setups.
   - Integrates directly into Vite's compilation lifecycle, parsing utility classes on demand via native scanning.
2. **CSS-First Theme Configuration (`index.css`)**:
   - Styles are initiated via `@import "tailwindcss";`.
   - Custom utility styles (e.g. scrollbars, radial backgrounds) and typography extensions are authored directly in CSS.
3. **Typography Extension**:
   - Leverages `@tailwindcss/typography` to inject the `prose prose-invert` styling system, formatting Gemini's markdown articles with dark-mode syntax styling.
4. **Relative Base Path (`base: './'`)**:
   - Guarantees portable asset URLs (`./assets/index-*.js`) that work across varying root path structures, reverse proxies, and subpath deployments.
5. **Path Aliasing**:
   - Maps `@/*` directly to the project root, simplifying deep directory imports.
