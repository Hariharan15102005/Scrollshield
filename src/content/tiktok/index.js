/**
 * ScrollShield - TikTok Content Script Controller (Phase 5)
 *
 * Coordinates route detection, blocker overlay, entry point suppression,
 * and live settings synchronization on TikTok.
 */

import { getSettings, onSettingsChanged } from '../../common/settings.js';
import { detectTikTokRoute } from './route-detector.js';
import {
  generateTikTokForYouSuppressionCss,
  suppressTikTokForYouElements,
  restoreSuppressedTikTokForYouElements
} from './selectors.js';
import {
  mountBlockerOverlay,
  dismountBlockerOverlay,
  isBlockerOverlayMounted
} from './blocker-overlay.js';
import { createNavigationMonitor } from './navigation-monitor.js';

let currentSettings = { tiktokForYouEnabled: true };
let navigationMonitor = null;

const STYLE_ELEMENT_ID = 'scrollshield-tiktok-styles';
const ROOT_ATTRIBUTE = 'data-scrollshield-tiktok-foryou-blocked';

/**
 * Checks DOM context to determine whether root / is currently presenting the For You feed.
 * @returns {{ isForYouActive: boolean }}
 */
function inspectPageContext() {
  if (typeof document === 'undefined') return { isForYouActive: false };

  try {
    // Check for an active For You navigation indicator or tab
    const activeForYouTab = document.querySelector(
      'a[href="/foryou"][aria-current="page"], a[data-e2e="nav-foryou"][aria-current="page"], [data-e2e="foryou-tab"].active, [role="tab"][aria-selected="true"][href*="/foryou"]'
    );
    if (activeForYouTab) {
      return { isForYouActive: true };
    }
  } catch {
    // Safe fallback
  }

  return { isForYouActive: false };
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
    styleEl.textContent = generateTikTokForYouSuppressionCss(ROOT_ATTRIBUTE);
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
  const detection = detectTikTokRoute(currentUrl, pageContext);

  if (currentSettings.tiktokForYouEnabled && detection.isForYouFeed) {
    mountBlockerOverlay({
      onLeaveFeed: () => {
        // Navigate safely to search or messages rather than an addictive feed
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

  if (currentSettings.tiktokForYouEnabled) {
    root.setAttribute(ROOT_ATTRIBUTE, 'true');
    suppressTikTokForYouElements(document);
  } else {
    root.removeAttribute(ROOT_ATTRIBUTE);
    restoreSuppressedTikTokForYouElements(document);
    dismountBlockerOverlay();
  }
}

/**
 * Main initialization entry point.
 */
export async function initializeTikTokShield() {
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
      if (currentSettings.tiktokForYouEnabled) {
        suppressTikTokForYouElements(document);
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
      initializeTikTokShield().catch(() => {});
    });
  } else {
    initializeTikTokShield().catch(() => {});
  }
}
