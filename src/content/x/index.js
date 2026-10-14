/**
 * ScrollShield - X (Twitter) Content Script Controller (Phase 6A)
 *
 * Coordinates route detection, blocker overlay, entry point suppression,
 * and live settings synchronization on X.
 */

import { getSettings, onSettingsChanged } from '../../common/settings.js';
import { detectXRoute } from './route-detector.js';
import {
  generateXHomeSuppressionCss,
  suppressXHomeElements,
  restoreSuppressedXHomeElements
} from './selectors.js';
import {
  mountBlockerOverlay,
  dismountBlockerOverlay,
  isBlockerOverlayMounted
} from './blocker-overlay.js';
import { createNavigationMonitor } from './navigation-monitor.js';

let currentSettings = { xHomeFeedEnabled: true };
let navigationMonitor = null;

const STYLE_ELEMENT_ID = 'scrollshield-x-styles';
const ROOT_ATTRIBUTE = 'data-scrollshield-x-home-blocked';

/**
 * Checks DOM context to determine whether root / is currently presenting the Home timeline.
 * @returns {{ isHomeActive: boolean, hasHomeContext: boolean }}
 */
function inspectPageContext() {
  if (typeof document === 'undefined') return { isHomeActive: false, hasHomeContext: false };

  try {
    // Check for an active Home navigation indicator or tab
    const activeHomeIndicator = document.querySelector(
      'a[data-testid="AppTabBar_Home_Link"][aria-current="page"], a[href="/home"][aria-current="page"], [role="tab"][aria-selected="true"][href*="/home"], div[data-testid="primaryColumn"] [aria-label*="Timeline: Your Home Timeline"]'
    );
    if (activeHomeIndicator) {
      return { isHomeActive: true, hasHomeContext: true };
    }
  } catch {
    // Safe fallback
  }

  return { isHomeActive: false, hasHomeContext: false };
}

/**
 * Ensures declarative hiding CSS is injected into the document.
 */
function injectDeclarativeStyles() {
  if (typeof document === 'undefined') return;

  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.textContent = generateXHomeSuppressionCss(ROOT_ATTRIBUTE);
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(styleEl);
    }
  }
}

/**
 * Evaluates the current page URL and applies blocking if appropriate.
 * @param {string} [url]
 */
function evaluateRoute(url) {
  if (typeof window === 'undefined') return;

  const currentUrl = url || window.location.href;
  const pageContext = inspectPageContext();
  const detection = detectXRoute(currentUrl, pageContext);

  if (currentSettings.xHomeFeedEnabled && detection.isHomeTimeline) {
    mountBlockerOverlay({
      onLeaveTimeline: () => {
        // Navigate safely to explore / search rather than home timeline
        window.location.href = '/explore';
      },
      onNavigateBack: () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/explore';
        }
      }
    });
  } else {
    if (isBlockerOverlayMounted()) {
      dismountBlockerOverlay();
    }
  }
}

/**
 * Updates UI suppression state based on current settings.
 */
function updateSuppressionState() {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (!root) return;

  if (currentSettings.xHomeFeedEnabled) {
    root.setAttribute(ROOT_ATTRIBUTE, 'true');
    suppressXHomeElements(document);
  } else {
    root.removeAttribute(ROOT_ATTRIBUTE);
    restoreSuppressedXHomeElements(document);
    dismountBlockerOverlay();
  }
}

/**
 * Main initialization entry point.
 */
export async function initializeXShield() {
  injectDeclarativeStyles();

  currentSettings = await getSettings();
  updateSuppressionState();
  evaluateRoute(window.location.href);

  // Subscribe to live settings changes (e.g. user toggles blocking in popup)
  onSettingsChanged((newSettings) => {
    currentSettings = newSettings;
    updateSuppressionState();
    evaluateRoute(window.location.href);
  });

  // Start route and DOM monitoring
  navigationMonitor = createNavigationMonitor(
    (newUrl) => {
      evaluateRoute(newUrl);
    },
    () => {
      if (currentSettings.xHomeFeedEnabled) {
        suppressXHomeElements(document);
      }
      // Re-evaluate route in case tab context changed dynamically
      evaluateRoute(window.location.href);
    }
  );
}

// Auto-run in browser content script environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeXShield().catch(() => {});
    });
  } else {
    initializeXShield().catch(() => {});
  }
}
