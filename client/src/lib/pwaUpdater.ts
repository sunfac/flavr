// PWA Update Handler - Fixes deployment crashes by managing cache updates
export function initializePWAUpdater() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New version available, reloading...');
                // Force reload to get fresh content
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });

    // Listen for cache update messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'CACHE_UPDATED') {
        console.log('📦 Cache updated, reloading app...');
        // Clear any stored data that might conflict
        localStorage.clear();
        sessionStorage.clear();
        // Reload to get fresh content
        window.location.reload();
      }
    });

    // Force update check on app focus
    window.addEventListener('focus', () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
    });
  }
}

// Clear PWA data manually (useful for testing)
export async function clearPWAData() {
  try {
    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      const databases = await indexedDB.databases();
      await Promise.all(databases.map(db => {
        const deleteReq = indexedDB.deleteDatabase(db.name!);
        return new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve(undefined);
          deleteReq.onerror = () => reject();
        });
      }));
    }
    
    console.log('✅ All PWA data cleared');
    return true;
  } catch (error) {
    console.error('Error clearing PWA data:', error);
    return false;
  }
}