// Update this version number on each deployment to force cache refresh
const CACHE_VERSION = 'v' + Date.now();
const CACHE_NAME = 'flavr-' + CACHE_VERSION;
const DATA_CACHE_NAME = 'flavr-data-' + CACHE_VERSION;

const STATIC_CACHE_URLS = [
  '/',
  '/app',
  '/shopping',
  '/fridge', 
  '/chef',
  '/manifest.json'
];

// Clear all storage on version change
const clearAllStorage = async () => {
  try {
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    
    // Clear IndexedDB
    if ('indexedDB' in self) {
      const databases = await indexedDB.databases();
      await Promise.all(databases.map(db => {
        const deleteReq = indexedDB.deleteDatabase(db.name);
        return new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject();
        });
      }));
    }
    
    console.log('✅ All storage cleared for fresh deployment');
  } catch (error) {
    console.log('Cache cleanup error:', error);
  }
};

// Install service worker and cache static resources
self.addEventListener('install', (event) => {
  console.log('Service worker installing:', CACHE_VERSION);
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.log('Cache error during install:', error);
      })
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating:', CACHE_VERSION);
  
  // Take control of all clients immediately
  self.clients.claim();
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service worker activation complete');
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return offline page
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Handle background sync for offline recipe generation
self.addEventListener('sync', (event) => {
  if (event.tag === 'recipe-sync') {
    event.waitUntil(syncRecipes());
  }
});

async function syncRecipes() {
  // This would sync any queued recipe requests when back online
  console.log('Syncing recipes...');
}