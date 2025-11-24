import ReactGA from "react-ga4";

const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

export const initGA = () => {
  if (GA_ID) {
    ReactGA.initialize(GA_ID);
    // Send initial pageview
    ReactGA.send({ hitType: "pageview", page: window.location.pathname });
  } else {
    console.warn("Analytics: No Measurement ID found (VITE_GOOGLE_ANALYTICS_ID). Tracking disabled.");
  }
};

export const trackGeminiCall = (model: string, operation: string, status: 'success' | 'failure', tokens?: number) => {
  if (!GA_ID) return;

  ReactGA.event({
    category: "Gemini API",
    action: operation, // e.g., "Plan Object", "Generate Video"
    label: `${model} - ${status}`,
    value: tokens // Optional: track token usage as a metric if desired
  });
};

export const trackError = (description: string) => {
    if (!GA_ID) return;
    ReactGA.event({
        category: "Error",
        action: "App Error",
        label: description
    });
}
