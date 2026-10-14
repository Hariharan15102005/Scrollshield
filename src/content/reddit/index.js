/**
 * ScrollShield - Reddit Content Script Controller (Phase 6B)
 *
 * Coordinates route detection, blocker overlay, feed entry point suppression,
 * and live settings synchronization on Reddit.
 */

import { getSettings, onSettingsChanged } from '../../common/settings.js';
import { detectRedditRoute } from './route-detector.js';
import {
  generateRedditFeedSuppressionCss,
  suppressRedditFeedElements,
  restoreSuppressedRedditFeedElements
} from './selectors.js';
import {
  mountBlockerOverlay,
  dismountBlockerOverlay,
  isBlockerOverlayMounted
} from './blocker-overlay.js';
import { createNavigationMonitor } from './navigation-monitor.js';

let currentSettings = { redditFeedsEnabled: true };
let navigationMonitor = null;

const STYLE_ELEMENT_ID = 'scrollshield-reddit-styles';
const ROOT_ATTRIBUTE = 'data-scrollshield-reddit-feeds-blocked';

/**
 * Ensures declarative hiding CSS is injected into the document.
 */
function injectDeclarativeStyles() {
  if (typeof document === 'undefined') return;

  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.textContent = generateRedditFeedSuppressionCss(ROOT_ATTRIBUTE);
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
  const detection = detectRedditRoute(currentUrl);

  if (currentSettings.redditFeedsEnabled && detection.isBlockedFeed) {
    mountBlockerOverlay({
      onLeaveFeed: () => {
        // Navigate safely to search or another utility page rather than endless feeds
        window.location.href = '/search';
      },
      onNavigateBack: () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/search';
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

  if (currentSettings.redditFeedsEnabled) {
    root.setAttribute(ROOT_ATTRIBUTE, 'true');
    suppressRedditFeedElements(document);
  } else {
    root.removeAttribute(ROOT_ATTRIBUTE);
    restoreSuppressedRedditFeedElements(document);
    dismountBlockerOverlay();
  }
}

/**
 * Main initialization entry point.
 */
export async function initializeRedditShield() {
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
      if (currentSettings.redditFeedsEnabled) {
        suppressRedditFeedElements(document);
      }
      evaluateRoute(window.location.href);
    }
  );
}

// Auto-run in browser content script environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeRedditShield().catch(() => {});
    });
  } else {
    initializeRedditShield().catch(() => {});
  }
}
