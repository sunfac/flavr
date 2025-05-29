import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("main.tsx loaded");

// Temporarily disable service worker to debug white screen issues
// TODO: Re-enable once white screen is resolved
/*
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
*/

const rootElement = document.getElementById("root");
console.log("Root element found:", !!rootElement);

if (rootElement) {
  try {
    console.log("Creating React root...");
    const root = createRoot(rootElement);
    console.log("Rendering App component...");
    root.render(<App />);
    console.log("App component rendered successfully");
  } catch (error) {
    console.error("Error rendering app:", error);
  }
} else {
  console.error("Root element not found!");
}
