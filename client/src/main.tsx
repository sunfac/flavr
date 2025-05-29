import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Re-enable service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service worker registered:', registration);
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
