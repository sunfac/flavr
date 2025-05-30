// PWA Update Handler - Service worker disabled to prevent refresh loops
export function initializePWAUpdater() {
  // Unregister any existing service workers to stop refresh loops
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister().then(function(boolean) {
          console.log('Service Worker unregistered:', boolean);
        });
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