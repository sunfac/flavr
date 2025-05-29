import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for PWA functionality with proper update handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('✅ Service Worker registered:', reg);
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker?.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('🔄 New version available, reloading...');
              window.location.reload();
            }
          });
        };
      })
      .catch(err => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
