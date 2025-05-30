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



// Service worker disabled to prevent refresh loops

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
