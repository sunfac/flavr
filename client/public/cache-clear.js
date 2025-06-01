// Aggressive cache clearing for mobile devices
(function() {
  'use strict';
  
  // Clear all possible cache sources
  function clearAllCaches() {
    // Clear localStorage
    if (typeof Storage !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    // Clear service worker caches
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // Clear browser caches
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
    
    // Force reload with cache bypass
    if (window.location.search.indexOf('nocache') === -1) {
      const separator = window.location.search ? '&' : '?';
      window.location.href = window.location.href + separator + 'nocache=' + Date.now();
    }
  }
  
  // Auto-clear on mobile devices
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    clearAllCaches();
  }
  
  // Expose global function for manual clearing
  window.clearFlavrCache = clearAllCaches;
  
})();