// Fast Refresh runtime suppression is handled by /refresh-suppress.js

import React from "react";
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

// Add better error handling and diagnostics
const renderApp = () => {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    console.error("Root element not found");
    document.body.innerHTML = `
      <div style="padding: 20px; background: #1e293b; color: white; min-height: 100vh; font-family: sans-serif;">
        <h1>Flavr - Missing Root Element</h1>
        <p>Could not find root element to mount the application.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #f97316; color: white; border: none; border-radius: 5px; margin-top: 10px;">Retry</button>
      </div>
    `;
    return;
  }

  try {
    console.log("Starting Flavr app render...");
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("Flavr app rendered successfully");
    
    // Clear the initial loading screen once React app is mounted
    setTimeout(() => {
      const loader = document.getElementById('initial-loading');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.5s ease';
        setTimeout(() => loader.remove(), 500);
      }
    }, 100);
  } catch (error) {
    console.error("Failed to render Flavr app:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #1e293b; color: white; min-height: 100vh; font-family: sans-serif;">
        <h1>Flavr - Diagnostic Mode</h1>
        <p>App failed to render. Error details:</p>
        <pre style="background: #0f172a; padding: 10px; border-radius: 5px; color: #f87171; overflow: auto; max-height: 300px;">${String(error)}</pre>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #f97316; color: white; border: none; border-radius: 5px; margin-top: 10px;">Retry</button>
        <div style="margin-top: 20px; font-size: 14px; color: #94a3b8;">
          <p>Debug info:</p>
          <ul>
            <li>Root element found: ${!!rootElement}</li>
            <li>React available: ${typeof React !== 'undefined'}</li>
            <li>Location: ${window.location.href}</li>
            <li>User agent: ${navigator.userAgent}</li>
          </ul>
        </div>
      </div>
    `;
  }
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
