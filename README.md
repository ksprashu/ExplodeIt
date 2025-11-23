<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 💥 ExplodeIt: The AI Encyclopedia
**Deconstruct Reality with Gemini 3 Pro & Veo**

[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%203%20Pro-8E75B2?logo=google)](https://deepmind.google/technologies/gemini/)
[![Veo](https://img.shields.io/badge/Video-Veo-00C853?logo=google)](https://deepmind.google/technologies/veo/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green)](LICENSE)

</div>

**ExplodeIt** is an interactive educational experience that lets you "explode" any physical object to understand how it works. By combining the reasoning of **Gemini 3 Pro**, the vision of **Gemini 3 Pro Image**, and the motion of **Veo**, it creates a comprehensive multimedia guide on the fly.

## ✨ Features

*   **🎨 Exploded Infographics**: Generates high-fidelity, photorealistic exploded views of any object (Gemini 3 Pro Image).
*   **🎥 Cinematic Assembly**: Creates smooth, slow-motion assembly/disassembly animations (Veo 3.1).
*   **🧠 Engineering Deep Dives**: Analyzes individual components with real-time data from Google Search (Gemini 2.5 Flash).
*   **🎙️ Audio Tours**: Narrates a custom script with an AI voice personality (Gemini Flash Lite + TTS).
*   **🔐 Bring Your Own Key**: Your API key is stored securely in your browser's local storage. No backend required.

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

### Docker & Deployment

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
The app uses a **Splash Screen** to ask for your API key on the first load. This key is saved to your browser's `localStorage`. You can clear or update it anytime via the Sidebar settings.

### Environment Variable (Optional)
For hosted demos where you want to provide a shared key (not recommended for public apps), you can set an environment variable at build time:

```bash
export GEMINI_API_KEY="your_api_key_here"
npm run build
```

## 🏗️ Architecture

*   **Frontend**: React 19 + Vite + Tailwind CSS
*   **AI Orchestration**: Custom `GeminiService` handling multi-step generation workflows.
*   **State Management**: React Hooks with persistent history.
*   **Markdown**: `react-markdown` for rich text rendering.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request