<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 💥 ExplodeIt: The AI Encyclopedia
**Deconstruct Reality with Gemini 3 Pro & Veo**

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%203%20Pro-8E75B2?logo=google)](https://deepmind.google/technologies/gemini/)
[![Veo](https://img.shields.io/badge/Video-Veo-00C853?logo=google)](https://deepmind.google/technologies/veo/)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Cloudflare R2](https://img.shields.io/badge/Storage-Cloudflare%20R2-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/r2/)
[![CI/CD](https://github.com/ksprashu/ExplodeIt/actions/workflows/deploy-cloudflare.yml/badge.svg)](https://github.com/ksprashu/ExplodeIt/actions/workflows/deploy-cloudflare.yml)
[![License](https://img.shields.io/badge/License-Apache%202.0-green)](LICENSE)

</div>

> **Disclaimer**: This is a personal project developed for educational and experimental purposes. It is not an official Google product and does not offer any official support or maintenance.

**ExplodeIt** is an interactive educational experience that lets you "explode" any physical object to understand how it works. By combining the reasoning of **Gemini 3 Pro**, the vision of **Gemini 3 Pro Image**, and the motion of **Veo**, it creates a comprehensive multimedia guide on the fly.

## ✨ Features

*   **🎨 Exploded Infographics**: Generates high-fidelity, photorealistic exploded views of any object (Gemini 3 Pro Image).
*   **🎥 Cinematic Assembly**: Creates smooth, slow-motion assembly/disassembly animations (Veo 3.1).
*   **🧠 Engineering Deep Dives**: Analyzes individual components with real-time data from Google Search (Gemini 3.8 Flash).
*   **🎙️ Audio Tours**: Narrates a custom script with an AI voice personality (Gemini 3.5 Flash-Lite + Gemini 3.1 Flash TTS).
*   **🌐 Community Showcase & R2 Storage**: Browse, search, and view community-contributed exploded topics without an API key, backed by zero-egress Cloudflare R2 object storage.
*   **⚡ Edge Functions**: Powered by Cloudflare Pages Functions (`/api/contribute`) for zero-leak community uploads and asset streaming.
*   **🔐 Bring Your Own Key**: Your API key is stored securely in your browser's session storage (`sessionStorage`). It is never saved to persistent local storage and is automatically erased when you close your browser tab or window.

## 🚀 Getting Started

### Prerequisites
*   **Node.js 20+**
*   A **Google Gemini API Key** (Get one [here](https://aistudio.google.com/app/apikey))

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/ksprashu/ExplodeIt.git
    cd ExplodeIt
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open your browser:**
    Navigate to `http://localhost:3000`. You will be prompted to enter your Gemini API Key.

5.  **Local Edge & Pages Functions Emulation:**
    To test Cloudflare Pages Functions (`functions/api/contribute.ts`) and simulated R2 storage locally using Wrangler:
    ```bash
    npm run build
    npm run pages:dev
    ```

### ☁️ Cloudflare Pages & R2 Deployment (Recommended)

ExplodeIt is engineered to run natively on **Cloudflare Pages** with serverless edge Functions and **Cloudflare R2** object storage.

- **Automated CI/CD**: Pushing to `main` automatically triggers `.github/workflows/deploy-cloudflare.yml`, running typecheck, unit tests, production build, and deploying via `cloudflare/wrangler-action@v3`.
- **Step-by-Step Setup**: Detailed instructions for provisioning the R2 bucket (`explodeit-community`), configuring CORS, generating a scoped Cloudflare API token, and setting up GitHub Repository Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are documented in:  
  📖 **[DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md)**.
- **Manual Deploy**:
  ```bash
  npm run pages:deploy
  ```

### Docker & Container Deployment

ExplodeIt is containerized and ready for deployment on platforms like Google Cloud Run.

**Build locally:**
```bash
docker build -t explodeit .
```

**Run container:**
```bash
docker run -p 8080:8080 explodeit
```

## 🛠️ Configuration

### Client-Side (Recommended)
The app uses a **Splash Screen** to ask for your API key on the first load. This key is saved strictly to your browser's `sessionStorage` and React state. It is never saved to persistent local storage and is automatically erased when you close your browser tab or window. You can clear or update it anytime via the Sidebar settings.

### Environment Variable (Optional)
For hosted demos where you want to provide a shared key (not recommended for public apps), you can set an environment variable at build time:

```bash
export GEMINI_API_KEY="your_api_key_here"
npm run build
```

## 🏗️ Architecture

*   **Frontend Client**: React 19 + Vite + Tailwind CSS + Lucide Icons + `react-markdown`.
*   **AI Orchestration**: Custom `geminiService` utilizing modern `@google/genai` Interactions API with Gemini 3.x and Veo 3.1.
*   **Edge Functions**: Cloudflare Pages Functions (`functions/api/contribute.ts`) with `nodejs_compat`.
*   **Object Storage**: Cloudflare R2 (`explodeit-community` bucket) for public community generation bundles.
*   **CI/CD Pipeline**: GitHub Actions (`deploy-cloudflare.yml`) with automated 5-gate deployment pipeline.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## Disclaimer

> **Disclaimer**: This is a personal project developed for educational and experimental purposes. It is not an official Google product and does not offer any official support or maintenance.

## License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
