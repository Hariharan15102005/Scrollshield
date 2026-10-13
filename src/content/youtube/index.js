/**
 * ScrollShield - YouTube Content Script Controller (Phase 2)
 *
 * Coordinates route detection, blocker overlay, shelf suppression,
 * and live settings synchronization on YouTube.
 */

import { getSettings, onSettingsChanged } from '../../common/settings.js';
import { detectYouTubeRoute } from './route-detector.js';
import {
  generateShortsSuppressionCss,
  suppressShortsElements,
  restoreSuppressedElements
} from './selectors.js';
import {
  mountBlockerOverlay,
  dismountBlockerOverlay,
  isBlockerOverlayMounted
} from './blocker-overlay.js';
import { createNavigationMonitor } from './navigation-monitor.js';

let currentSettings = { youtubeShortsEnabled: true };
let navigationMonitor = null;

const STYLE_ELEMENT_ID = 'scrollshield-youtube-styles';
const ROOT_ATTRIBUTE = 'data-scrollshield-shorts-blocked';

/**
 * Ensures declarative hiding CSS is injected into the document.
 */
function injectDeclarativeStyles() {
  if (typeof document === 'undefined') return;

  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    styleEl.textContent = generateShortsSuppressionCss(ROOT_ATTRIBUTE);
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(styleEl);
    }
  }
}

/**
 * Evaluates the current page URL and applies blocking if appropriate.
 * @param {string} url
 */
function evaluateRoute(url) {
  if (typeof window === 'undefined') return;

  const currentUrl = url || window.location.href;
  const detection = detectYouTubeRoute(currentUrl);

  if (currentSettings.youtubeShortsEnabled && detection.isShorts) {
    mountBlockerOverlay({
      videoId: detection.videoId,
      canonicalWatchUrl: detection.canonicalWatchUrl,
      onNavigateHome: () => {
        window.location.href = '/';
      },
      onNavigateBack: () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/';
        }
      },
      onOpenRegularWatch: (watchUrl) => {
        window.location.href = watchUrl;
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

  if (currentSettings.youtubeShortsEnabled) {
    root.setAttribute(ROOT_ATTRIBUTE, 'true');
    suppressShortsElements(document);
  } else {
    root.removeAttribute(ROOT_ATTRIBUTE);
    restoreSuppressedElements(document);
    dismountBlockerOverlay();
  }
}

/**
 * Main initialization entry point.
 */
export async function initializeYouTubeShield() {
  injectDeclarativeStyles();

  currentSettings = await getSettings();
  updateSuppressionState();
  evaluateRoute(window.location.href);

  // Subscribe to settings changes (e.g. user toggles blocking in popup)
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
      if (currentSettings.youtubeShortsEnabled) {
        suppressShortsElements(document);
      }
    }
  );
}

// Auto-run if running in a browser content script environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeYouTubeShield().catch(() => {});
    });
  } else {
    initializeYouTubeShield().catch(() => {});
  }
}
