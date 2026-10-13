/**
 * ScrollShield - Facebook Content Script Controller (Phase 4)
 *
 * Coordinates route detection, blocker overlay, entry point suppression,
 * and live settings synchronization on Facebook.
 */

import { getSettings, onSettingsChanged } from '../../common/settings.js';
import { detectFacebookRoute } from './route-detector.js';
import {
  generateFacebookReelsSuppressionCss,
  suppressFacebookReelsElements,
  restoreSuppressedFacebookReelsElements
} from './selectors.js';
import {
  mountBlockerOverlay,
  dismountBlockerOverlay,
  isBlockerOverlayMounted
} from './blocker-overlay.js';
import { createNavigationMonitor } from './navigation-monitor.js';

let currentSettings = { facebookReelsEnabled: true };
let navigationMonitor = null;

const STYLE_ELEMENT_ID = 'scrollshield-facebook-styles';
const ROOT_ATTRIBUTE = 'data-scrollshield-fb-reels-blocked';

/**
 * Ensures declarative hiding CSS is injected into the document.
 */
function injectDeclarativeStyles() {
  if (typeof document === 'undefined') return;

  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.textContent = generateFacebookReelsSuppressionCss(ROOT_ATTRIBUTE);
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
  const detection = detectFacebookRoute(currentUrl);

  if (currentSettings.facebookReelsEnabled && detection.isReel) {
    mountBlockerOverlay({
      reelId: detection.reelId,
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

  if (currentSettings.facebookReelsEnabled) {
    root.setAttribute(ROOT_ATTRIBUTE, 'true');
    suppressFacebookReelsElements(document);
  } else {
    root.removeAttribute(ROOT_ATTRIBUTE);
    restoreSuppressedFacebookReelsElements(document);
    dismountBlockerOverlay();
  }
}

/**
 * Main initialization entry point.
 */
export async function initializeFacebookShield() {
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
      if (currentSettings.facebookReelsEnabled) {
        suppressFacebookReelsElements(document);
      }
    }
  );
}

// Auto-run in browser content script environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeFacebookShield().catch(() => {});
    });
  } else {
    initializeFacebookShield().catch(() => {});
  }
}
