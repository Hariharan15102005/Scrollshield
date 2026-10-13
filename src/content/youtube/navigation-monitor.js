/**
 * ScrollShield - YouTube SPA Navigation Monitor (Phase 2)
 *
 * Reliably detects client-side route changes on YouTube without unbounded polling.
 * Subscribes to YouTube's custom events (yt-navigate-finish, yt-page-data-updated),
 * HTML5 popstate, and a lightweight scoped MutationObserver.
 */

/**
 * Creates and starts a route monitor.
 *
 * @param {(currentUrl: string) => void} onRouteChange - Callback invoked when route changes
 * @param {() => void} onDomUpdated - Callback invoked when new elements are added to DOM (debounced)
 * @returns {{ disconnect: () => void, checkCurrentRoute: () => void }}
 */
export function createNavigationMonitor(onRouteChange, onDomUpdated) {
  let lastHref = typeof window !== 'undefined' ? window.location.href : '';
  let domUpdateTimer = null;

  const checkCurrentRoute = () => {
    if (typeof window === 'undefined') return;
    const currentHref = window.location.href;
    if (currentHref !== lastHref) {
      lastHref = currentHref;
      onRouteChange(currentHref);
    }
  };

  const scheduleDomUpdate = () => {
    if (domUpdateTimer) return;
    domUpdateTimer = setTimeout(() => {
      domUpdateTimer = null;
      if (typeof onDomUpdated === 'function') {
        onDomUpdated();
      }
    }, 200);
  };

  // 1. YouTube-specific SPA lifecycle events
  const handleYtNavigateFinish = () => {
    checkCurrentRoute();
    scheduleDomUpdate();
  };

  const handleYtPageDataUpdated = () => {
    checkCurrentRoute();
    scheduleDomUpdate();
  };

  // 2. Standard history popstate (back / forward navigation)
  const handlePopState = () => {
    checkCurrentRoute();
  };

  window.addEventListener('yt-navigate-finish', handleYtNavigateFinish, true);
  window.addEventListener('yt-page-data-updated', handleYtPageDataUpdated, true);
  window.addEventListener('popstate', handlePopState, true);

  // 3. Scoped MutationObserver to catch asynchronous shelf rendering and URL updates
  let observer = null;
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    observer = new MutationObserver((mutations) => {
      // Fast URL check in case URL mutated during client navigation
      if (window.location.href !== lastHref) {
        checkCurrentRoute();
      }

      // Check if child nodes were added (potential Shorts shelves loaded)
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          scheduleDomUpdate();
          break;
        }
      }
    });

    const targetNode = document.body || document.documentElement;
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true
      });
    }
  }

  return {
    disconnect: () => {
      window.removeEventListener('yt-navigate-finish', handleYtNavigateFinish, true);
      window.removeEventListener('yt-page-data-updated', handleYtPageDataUpdated, true);
      window.removeEventListener('popstate', handlePopState, true);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (domUpdateTimer) {
        clearTimeout(domUpdateTimer);
        domUpdateTimer = null;
      }
    },
    checkCurrentRoute
  };
}
