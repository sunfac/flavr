// Early Fast Refresh suppression - loaded before React
(function() {
  'use strict';
  
  // Override refresh runtime before any modules load
  if (typeof window !== 'undefined') {
    // Prevent RefreshRuntime errors
    window.$RefreshReg$ = function() {};
    window.$RefreshSig$ = function() { return function(type) { return type; }; };
    
    // Mock the entire refresh runtime
    window.$RefreshRuntime$ = {
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
    
    // Intercept and suppress refresh-related errors
    var originalConsoleError = console.error;
    console.error = function() {
      var args = Array.prototype.slice.call(arguments);
      var message = args.join(' ');
      if (message.includes('RefreshRuntime') || message.includes('register is not a function')) {
        return; // Suppress these errors
      }
      originalConsoleError.apply(console, args);
    };
    
    // Suppress runtime error overlays
    window.addEventListener('error', function(e) {
      if (e.message && (e.message.includes('RefreshRuntime') || e.message.includes('register is not a function'))) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
  }
})();