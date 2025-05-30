// Complete Fast Refresh and Error Overlay Suppression
(function() {
  'use strict';
  
  if (typeof window === 'undefined') return;
  
  // Early suppression of all refresh runtime
  window.$RefreshReg$ = function() {};
  window.$RefreshSig$ = function() { return function(type) { return type; }; };
  
  // Comprehensive runtime mock
  var mockRuntime = {
    register: function() {},
    createSignatureFunctionForTransform: function() { return function() {}; },
    performReactRefresh: function() {},
    isLikelyComponentType: function() { return false; },
    getFamilyByType: function() { return null; },
    setSignature: function() {},
    collectCustomHooksForSignature: function() { return []; },
    getLikelyComponentType: function() { return null; },
    getRefreshBoundarySignature: function() { return null; },
    isReactRefreshBoundary: function() { return false; },
    shouldInvalidateReactRefreshBoundary: function() { return false; },
    invalidateReactRefreshBoundary: function() {},
    hasUnrecoverableErrors: function() { return false; },
    findAffectedHostInstances: function() { return new Set(); }
  };
  
  window.$RefreshRuntime$ = mockRuntime;
  window.RefreshRuntime = mockRuntime;
  
  // Override all error handling
  var suppressError = function(message) {
    return message && (
      message.includes('RefreshRuntime') ||
      message.includes('register is not a function') ||
      message.includes('$RefreshReg$') ||
      message.includes('$RefreshSig$') ||
      message.includes('Fast Refresh')
    );
  };
  
  // Suppress console errors
  var originalError = console.error;
  console.error = function() {
    var message = Array.prototype.slice.call(arguments).join(' ');
    if (!suppressError(message)) {
      originalError.apply(console, arguments);
    }
  };
  
  // Suppress unhandled errors
  window.addEventListener('error', function(e) {
    if (suppressError(e.message)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  });
  
  // Suppress promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && suppressError(String(e.reason))) {
      e.preventDefault();
      return false;
    }
  });
  
  // Remove error overlays continuously
  var removeOverlays = function() {
    var overlays = document.querySelectorAll('vite-error-overlay, [data-vite-overlay]');
    overlays.forEach(function(overlay) {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });
  };
  
  // Monitor for overlays
  var observer = new MutationObserver(removeOverlays);
  
  // Start monitoring when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
      removeOverlays();
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
    removeOverlays();
  }
  
  // Continuous cleanup
  setInterval(removeOverlays, 100);
})();