---
type: "Builder / Local Dev"
title: "Local Developer Environment & Operational Runbook"
description: "Step-by-step developer setup, dependency management, dev server execution, and static typechecking."
resource: "file:///C:/Users/kspra/code/github/ExplodeIt/package.json"
tags: ["developer-guide", "local-dev", "npm-scripts", "runbook", "workflow"]
---

# Local Developer Environment & Operational Runbook

## Overview
This runbook provides complete operational guidance for setting up, running, building, testing, and debugging the ExplodeIt application in a local development environment.

## Prerequisites
- **Node.js**: Version 20.x LTS or higher (`node -v`).
- **NPM**: Version 10.x or higher (`npm -v`).
- **Browser**: Modern Chromium, Firefox, or Safari supporting ECMAScript modules and Web Audio API.
- **Docker** (Optional): For testing containerized production parity locally.

## Development Lifecycle & Script Reference

| NPM Script | Command | Purpose & Description |
|---|---|---|
| `dev` | `vite` | Starts the local ESM development server with HMR on port 3000. |
| `build` | `vite build` | Compiles TypeScript and packages production bundles into `dist/`. |
| `preview` | `vite preview` | Boots a local static HTTP server to preview the built `dist/` directory. |
| *(Typecheck)* | `npx tsc --noEmit` | Validates TypeScript types across the codebase without writing emit files. |

## Step-by-Step Developer Setup

### 1. Repository Installation
Clone the repository and install locked dependencies using `npm ci` (or `npm install` for development additions):
```bash
git clone https://github.com/ksprashu/ExplodeIt.git
cd ExplodeIt
npm ci
```

### 2. Configure Environment (Optional)
ExplodeIt defaults to prompting the user for an API key in the browser interface. However, for continuous local testing without re-entering keys across incognito windows:
1. Create a `.env.local` file in the project root:
   ```env
   GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
   ```
2. Vite's `define` configuration will map this to `process.env.API_KEY` during compilation.

### 3. Launch Development Server
```bash
npm run dev
```
- Open your browser to `http://localhost:3000`.
- Fast Refresh (HMR) is active; code changes in `components/` or `services/` will update instantaneously without full page reload.

### 4. Verification & Static Type Checking
Always run static type checking and production build verification prior to committing changes:
```bash
# 1. Type check
npx tsc --noEmit

# 2. Production build verification
npm run build

# 3. Preview production build locally
npm run preview
```

### 5. Local Docker Container Run
To replicate the Google Cloud Run production environment on a local workstation:
```bash
# Build the Alpine image
docker build -t explodeit .

# Run container on port 8080
docker run -p 8080:8080 explodeit
```
Navigate to `http://localhost:8080` to verify Nginx SPA routing and asset delivery.
