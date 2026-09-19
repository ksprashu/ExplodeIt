# ExplodeIt: The AI Encyclopedia

> **Disclaimer**: This is a personal project developed for educational and experimental purposes. It is not an official Google product and does not offer any official support or maintenance.

## Project Overview
**ExplodeIt** is an interactive educational web application that generates "exploded views" of physical objects. It leverages Google's latest generative AI models to create a rich, multimedia learning experience. Users can enter the name of any object (e.g., "Vintage Camera", "Human Heart") and the app orchestrates a multi-step generation pipeline to produce:

1.  **Blueprints**: A structured content plan and anatomy breakdown (Gemini 3.1 Pro).
2.  **Visuals**: High-fidelity "exploded" infographics and "assembled" studio shots (Gemini 3 Pro Image).
3.  **Deep Dives**: Detailed engineering/scientific analysis of each component, enriched with real-time Google Search data (Gemini 3.8 Flash).
4.  **Animation**: Cinematic "assembly/disassembly" videos (Veo 3.1).
5.  **Audio Guide**: A narrated tour guide script and TTS audio (Gemini 3.5 Flash-Lite + Gemini 3.1 Flash TTS).

## Tech Stack
*   **Framework**: React 19
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **AI SDK**: `@google/genai` (Google GenAI SDK for Node/Web)
*   **Edge Runtime**: Cloudflare Pages Functions (`nodejs_compat`)
*   **Object Storage**: Cloudflare R2 (`explodeit-community`)
*   **Edge Tooling**: Cloudflare Wrangler CLI (`wrangler`)
*   **Markdown Rendering**: `react-markdown`

## Architecture & patterns

### Authentication (BYOK)
The app follows a **"Bring Your Own Key" (BYOK)** architecture to be fully client-side and cost-effective for hosting.
*   **Storage**: API Keys are stored securely in browser `sessionStorage` (strictly session-only, erased upon tab/window closure, never written to persistent `localStorage`).
*   **Fallback**: The app can use a build-time `API_KEY` environment variable (injected via `vite.config.ts`) for hosted demos, but prefers the local session key.
*   **UI**: Users are prompted via a Splash Screen (`ApiKeyModal`) to enter their key on first load.

### Service Layer
All AI interactions are encapsulated in `services/geminiService.ts`. This service handles:
*   **Robustness**: Implements retry logic with exponential backoff for all API calls.
*   **Cost Tracking**: Calculates and returns token usage and estimated cost for every operation.
*   **Asset Management**: Manages `Blob` creation for generated video/audio and includes a `revokeGenerationAssets` utility to prevent memory leaks.

### Deployment
The primary production platform for ExplodeIt is **Cloudflare Pages** with serverless edge Functions and **Cloudflare R2** object storage.
*   **Pages Runtime**: Defined in `wrangler.jsonc` (`pages_build_output_dir = "dist"`, `compatibility_flags = ["nodejs_compat"]`, R2 binding `COMMUNITY_BUCKET` -> `explodeit-community`).
*   **CI/CD Pipeline**: Automated deployment via GitHub Actions (`.github/workflows/deploy-cloudflare.yml`) on push to `main` with strict 5-gate pipeline (typecheck, tests, build, wrangler deploy).
*   **Onboarding Runbook**: Comprehensive step-by-step setup in `DEPLOY_CLOUDFLARE.md`.
*   **Alternative (Docker)**: Multi-stage container build (`Dockerfile` + `nginx.conf`) for containerized hosting on Google Cloud Run.

## Development

### Setup & Run
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Building for Production
```bash
npm run build
# Output located in /dist
```

### Local Cloudflare Edge Emulation & Deployment
```bash
# Local Cloudflare Pages Functions & simulated R2 emulation
npm run build
npm run pages:dev

# Manual emergency deployment to Cloudflare Pages
npm run pages:deploy
```

### Docker Build & Run
```bash
docker build -t explodeit .
docker run -p 8080:8080 explodeit
```

## Key Files
*   `App.tsx`: Main application controller. Manages the generation state machine (`PLANNING` -> `INFOGRAPHIC` -> `ASSEMBLY` -> `ENRICHING` -> `ANIMATING`).
*   `services/geminiService.ts`: The "brain" of the application. Contains all prompt engineering and API orchestration.
*   `functions/api/contribute.ts`: Cloudflare Pages Function handling community uploads and R2 storage with zero-leak scanning.
*   `services/communityStorage.ts`: Client-side community store integration and catalog caching.
*   `wrangler.jsonc`: Cloudflare Pages runtime and R2 bucket binding configuration.
*   `.github/workflows/deploy-cloudflare.yml`: Production 5-gate GitHub Actions CI/CD deployment pipeline.
*   `DEPLOY_CLOUDFLARE.md`: Step-by-step Cloudflare deployment & secrets guide.
*   `constants.ts`: Stores all system prompts and model configuration (pricing, model names).
*   `components/DisplayArea.tsx`: The main view component. Handles complex layout for video/image switching and markdown rendering.
*   `components/Sidebar.tsx`: Displays history and session cost stats.
*   `components/ApiKeyModal.tsx`: Handles the API key input and validation flow.
