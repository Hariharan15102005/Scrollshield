/**
 * ScrollShield - Instagram Content Script Controller (Phase 3)
 *
 * Coordinates route detection, blocker overlay, entry point suppression,
 * and live settings synchronization on Instagram.
 */

import { getSettings, onSettingsChanged } from '../../common/settings.js';
import { detectInstagramRoute } from './route-detector.js';
import {
  generateReelsSuppressionCss,
  suppressReelsElements,
  restoreSuppressedElements
} from './selectors.js';
import {
  mountBlockerOverlay,
  dismountBlockerOverlay,
  isBlockerOverlayMounted
} from './blocker-overlay.js';
import { createNavigationMonitor } from './navigation-monitor.js';

let currentSettings = { instagramReelsEnabled: true };
let navigationMonitor = null;

const STYLE_ELEMENT_ID = 'scrollshield-instagram-styles';
const ROOT_ATTRIBUTE = 'data-scrollshield-reels-blocked';

/**
 * Ensures declarative hiding CSS is injected into the document.
 */
function injectDeclarativeStyles() {
  if (typeof document === 'undefined') return;

  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.textContent = generateReelsSuppressionCss(ROOT_ATTRIBUTE);
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
  const detection = detectInstagramRoute(currentUrl);

  if (currentSettings.instagramReelsEnabled && detection.isReel) {
    mountBlockerOverlay({
      shortcode: detection.shortcode,
      onNavigateHome: () => {
        window.location.href = '/';
      },
      onNavigateBack: () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/';
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

  if (currentSettings.instagramReelsEnabled) {
    root.setAttribute(ROOT_ATTRIBUTE, 'true');
    suppressReelsElements(document);
  } else {
    root.removeAttribute(ROOT_ATTRIBUTE);
    restoreSuppressedElements(document);
    dismountBlockerOverlay();
  }
}

/**
 * Main initialization entry point.
 */
export async function initializeInstagramShield() {
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
      if (currentSettings.instagramReelsEnabled) {
        suppressReelsElements(document);
      }
    }
  );
}

// Auto-run in browser content script environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeInstagramShield().catch(() => {});
    });
  } else {
    initializeInstagramShield().catch(() => {});
  }
}
