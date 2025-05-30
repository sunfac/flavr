// Fast Refresh runtime suppression is handled by /refresh-suppress.js

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Override Vite error handling to prevent overlay blocking
if (typeof window !== 'undefined') {
  // Continuously hide error overlays
  const hideErrorOverlay = () => {
    const overlays = document.querySelectorAll('vite-error-overlay');
    overlays.forEach(overlay => {
      if (overlay instanceof HTMLElement) {
        overlay.style.display = 'none';
      }
    });
  };
  
  // Hide immediately and on interval
  hideErrorOverlay();
  setInterval(hideErrorOverlay, 100);
  
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('RefreshRuntime.register')) {
      e.preventDefault();
      e.stopPropagation();
      hideErrorOverlay();
      return false;
    }
  });
}



// Service worker registration with cache-busting
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Clear legacy service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Register new service worker
      const swVersion = Date.now();
      const registration = await navigator.serviceWorker.register(`/service-worker.js?v=${swVersion}`);
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        installingWorker?.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      };
      
    } catch (err) {
      console.warn('Service worker setup failed:', err);
    }
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
