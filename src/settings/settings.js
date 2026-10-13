/**
 * ScrollShield - Settings Script (Phase 1)
 * Handles version display and window close action.
 */

const FALLBACK_VERSION = '0.1.0';

/**
 * Safely resolves and displays the extension version from manifest.
 */
function initializeVersion() {
  const versionElement = document.getElementById('settings-version');
  if (!versionElement) return;

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') {
      const manifest = chrome.runtime.getManifest();
      if (manifest && typeof manifest.version === 'string' && manifest.version.trim().length > 0) {
        versionElement.textContent = `Version ${manifest.version}`;
        return;
      }
    }
  } catch {
    // Non-extension or restricted context; fallback is retained
  }

  versionElement.textContent = `Version ${FALLBACK_VERSION}`;
}

/**
 * Handles close button action.
 * Closes the tab if possible, or navigates back in browser history.
 */
function handleClosePage() {
  try {
    window.close();
  } catch {
    // Some browser contexts restrict window.close() for script-opened tabs
  }

  // If window didn't close (e.g. user navigated directly to the page)
  if (!window.closed && window.history.length > 1) {
    window.history.back();
  }
}

/**
 * Initializes settings page handlers.
 */
function init() {
  initializeVersion();

  const closeButton = document.getElementById('close-settings-btn');
  if (closeButton) {
    closeButton.addEventListener('click', handleClosePage);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
