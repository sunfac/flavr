import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";



// Temporarily disable service worker to isolate React hook error
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', async () => {
//     try {
//       // Temporarily unregister all existing service workers to clear stale data
//       const registrations = await navigator.serviceWorker.getRegistrations();
//       console.log(`🧹 Clearing ${registrations.length} legacy service workers`);
      
//       await Promise.all(registrations.map(registration => {
//         console.log('Unregistering legacy SW:', registration.scope);
//         return registration.unregister();
//       }));

//       // Clear all caches to ensure fresh start
//       if ('caches' in window) {
//         const cacheNames = await caches.keys();
//         await Promise.all(cacheNames.map(name => {
//           console.log('Clearing cache:', name);
//           return caches.delete(name);
//         }));
//       }

//       // Register new service worker with timestamp for cache-busting
//       const swVersion = Date.now();
//       const swPath = `/service-worker.js?v=${swVersion}`;
      
//       const registration = await navigator.serviceWorker.register(swPath);
//       console.log('✅ Fresh service worker registered:', registration);
      
//       registration.onupdatefound = () => {
//         const installingWorker = registration.installing;
//         installingWorker?.addEventListener('statechange', () => {
//           if (
//             installingWorker.state === 'installed' &&
//             navigator.serviceWorker.controller
//           ) {
//             console.log('🔄 New version available, reloading...');
//             window.location.reload();
//           }
//         });
//       };
      
//     } catch (err) {
//       console.warn('Service worker setup failed:', err);
//     }
//   });
// }

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
