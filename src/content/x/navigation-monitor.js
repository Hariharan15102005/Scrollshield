/**
 * ScrollShield - X (Twitter) SPA Navigation Monitor (Phase 6A)
 *
 * Reliably detects client-side route changes on X.
 * Subscribes to HTML5 popstate, scoped MutationObserver, and URL tracking.
 */

/**
 * Creates and starts an X route monitor.
 *
 * @param {(currentUrl: string) => void} onRouteChange - Callback invoked when route changes
 * @param {() => void} onDomUpdated - Callback invoked when elements are added to DOM (debounced)
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

  // 1. Popstate (browser back / forward navigation)
  const handlePopState = () => {
    checkCurrentRoute();
  };

  window.addEventListener('popstate', handlePopState, true);

  // 2. Scoped MutationObserver to catch client-side SPA navigation and dynamic DOM rendering
  let observer = null;
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    observer = new MutationObserver((mutations) => {
      if (window.location.href !== lastHref) {
        checkCurrentRoute();
      }

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
