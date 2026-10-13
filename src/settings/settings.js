/**
 * ScrollShield - Settings Script (Phase 2)
 * Handles version display, YouTube Shorts settings management,
 * and page navigation.
 */

import { getSettings, setSetting, STORAGE_KEYS } from '../common/settings.js';

const FALLBACK_VERSION = '0.2.0';

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
 * Updates status text underneath the settings toggle.
 * @param {boolean} isEnabled
 */
function updateToggleSubtext(isEnabled) {
  const subtext = document.getElementById('status-toggle-yt-shorts');
  if (!subtext) return;

  if (isEnabled) {
    subtext.textContent = 'Currently blocking Shorts';
    subtext.style.color = '#a7f3d0';
  } else {
    subtext.textContent = 'Shorts blocking paused';
    subtext.style.color = '#fbbf24';
  }
}

/**
 * Initializes the YouTube Shorts settings toggle and persists changes.
 */
async function initializeSettingsToggle() {
  const toggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-toggle-youtube-shorts')
  );
  const errorMsg = document.getElementById('settings-save-error');
  if (!toggle) return;

  try {
    const settings = await getSettings();
    toggle.checked = settings.youtubeShortsEnabled;
    toggle.setAttribute('aria-checked', String(settings.youtubeShortsEnabled));
    updateToggleSubtext(settings.youtubeShortsEnabled);
  } catch {
    toggle.checked = true;
    toggle.setAttribute('aria-checked', 'true');
    updateToggleSubtext(true);
  }

  toggle.addEventListener('change', async () => {
    const isChecked = toggle.checked;
    toggle.setAttribute('aria-checked', String(isChecked));
    updateToggleSubtext(isChecked);
    if (errorMsg) errorMsg.hidden = true;

    try {
      await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, isChecked);
    } catch {
      // Revert if saving failed
      toggle.checked = !isChecked;
      toggle.setAttribute('aria-checked', String(!isChecked));
      updateToggleSubtext(!isChecked);
      if (errorMsg) errorMsg.hidden = false;
    }
  });
}

/**
 * Handles close button action.
 */
function handleClosePage() {
  try {
    window.close();
  } catch {
    // Some browser contexts restrict window.close()
  }

  if (!window.closed && window.history.length > 1) {
    window.history.back();
  }
}

/**
 * Initializes settings page handlers.
 */
function init() {
  initializeVersion();
  initializeSettingsToggle().catch(() => {});

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
