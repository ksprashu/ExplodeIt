# ExplodeIt: The AI Encyclopedia

## Project Overview
**ExplodeIt** is an interactive educational web application that generates "exploded views" of physical objects. It leverages Google's latest generative AI models to create a rich, multimedia learning experience. Users can enter the name of any object (e.g., "Vintage Camera", "Human Heart") and the app orchestrates a multi-step generation pipeline to produce:

1.  **Blueprints**: A structured content plan and anatomy breakdown (Gemini 3 Pro).
2.  **Visuals**: High-fidelity "exploded" infographics and "assembled" studio shots (Gemini 3 Pro Image).
3.  **Deep Dives**: Detailed engineering/scientific analysis of each component, enriched with real-time Google Search data (Gemini 2.5 Flash).
4.  **Animation**: Cinematic "assembly/disassembly" videos (Veo 3.1).
5.  **Audio Guide**: A narrated tour guide script and TTS audio (Gemini Flash Lite + TTS).

## Tech Stack
*   **Framework**: React 19
*   **Build Tool**: Vite
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **AI SDK**: `@google/genai` (Google GenAI SDK for Node/Web)
*   **Markdown Rendering**: `react-markdown`

## Architecture & patterns

### Authentication (BYOK)
The app follows a **"Bring Your Own Key" (BYOK)** architecture to be fully client-side and cost-effective for hosting.
*   **Storage**: API Keys are stored securely in the browser's `localStorage`.
*   **Fallback**: The app can use a build-time `API_KEY` environment variable (injected via `vite.config.ts`) for hosted demos, but prefers the local key.
*   **UI**: Users are prompted via a Splash Screen (`ApiKeyModal`) to enter their key on first load.

### Service Layer
All AI interactions are encapsulated in `services/geminiService.ts`. This service handles:
*   **Robustness**: Implements retry logic with exponential backoff for all API calls.
*   **Cost Tracking**: Calculates and returns token usage and estimated cost for every operation.
*   **Asset Management**: Manages `Blob` creation for generated video/audio and includes a `revokeGenerationAssets` utility to prevent memory leaks.

### Deployment
The application is containerized for production using **Docker** and **Nginx**.
*   **Dockerfile**: Multi-stage build (Node.js builder -> Nginx runner).
*   **Nginx**: Custom `nginx.conf` handles SPA routing (rewrites to `index.html`) and caching headers.
*   **Platform**: Optimized for Google Cloud Run.
*   **CI/CD**: Includes `cloudbuild.yaml` for Google Cloud Build pipelines.

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

### Docker Build & Run
```bash
docker build -t explodeit .
docker run -p 8080:8080 explodeit
```

## Key Files
*   `App.tsx`: Main application controller. Manages the generation state machine (`PLANNING` -> `INFOGRAPHIC` -> `ASSEMBLY` -> `ENRICHING` -> `ANIMATING`).
*   `services/geminiService.ts`: The "brain" of the application. Contains all prompt engineering and API orchestration.
*   `constants.ts`: Stores all system prompts and model configuration (pricing, model names).
*   `components/DisplayArea.tsx`: The main view component. Handles complex layout for video/image switching and markdown rendering.
*   `components/Sidebar.tsx`: Displays history and session cost stats.
*   `components/ApiKeyModal.tsx`: Handles the API key input and validation flow.
