/**
 * ScrollShield - Settings Script (Phase 3)
 * Handles version display, YouTube Shorts & Instagram Reels settings management,
 * and page navigation.
 */

import { getSettings, setSetting, STORAGE_KEYS } from '../common/settings.js';

const FALLBACK_VERSION = '0.3.0';

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
    // Retain fallback
  }

  versionElement.textContent = `Version ${FALLBACK_VERSION}`;
}

/**
 * Updates status text underneath the YouTube toggle.
 * @param {boolean} isEnabled
 */
function updateYtToggleSubtext(isEnabled) {
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
 * Updates status text underneath the Instagram toggle.
 * @param {boolean} isEnabled
 */
function updateIgToggleSubtext(isEnabled) {
  const subtext = document.getElementById('status-toggle-ig-reels');
  if (!subtext) return;

  if (isEnabled) {
    subtext.textContent = 'Currently blocking Reels';
    subtext.style.color = '#a7f3d0';
  } else {
    subtext.textContent = 'Reels blocking paused';
    subtext.style.color = '#fbbf24';
  }
}

/**
 * Initializes settings toggles and persists changes.
 */
async function initializeSettingsToggles() {
  const ytToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-toggle-youtube-shorts')
  );
  const igToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-toggle-instagram-reels')
  );
  const errorMsg = document.getElementById('settings-save-error');

  let currentSettings = { youtubeShortsEnabled: true, instagramReelsEnabled: true };

  try {
    currentSettings = await getSettings();
  } catch {
    // Retain defaults
  }

  if (ytToggle) {
    ytToggle.checked = currentSettings.youtubeShortsEnabled;
    ytToggle.setAttribute('aria-checked', String(currentSettings.youtubeShortsEnabled));
    updateYtToggleSubtext(currentSettings.youtubeShortsEnabled);
  }

  if (igToggle) {
    igToggle.checked = currentSettings.instagramReelsEnabled;
    igToggle.setAttribute('aria-checked', String(currentSettings.instagramReelsEnabled));
    updateIgToggleSubtext(currentSettings.instagramReelsEnabled);
  }

  // YouTube Toggle Listener
  if (ytToggle) {
    ytToggle.addEventListener('change', async () => {
      const isChecked = ytToggle.checked;
      ytToggle.setAttribute('aria-checked', String(isChecked));
      updateYtToggleSubtext(isChecked);
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, isChecked);
      } catch {
        ytToggle.checked = !isChecked;
        ytToggle.setAttribute('aria-checked', String(!isChecked));
        updateYtToggleSubtext(!isChecked);
        if (errorMsg) errorMsg.hidden = false;
      }
    });
  }

  // Instagram Toggle Listener
  if (igToggle) {
    igToggle.addEventListener('change', async () => {
      const isChecked = igToggle.checked;
      igToggle.setAttribute('aria-checked', String(isChecked));
      updateIgToggleSubtext(isChecked);
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, isChecked);
      } catch {
        igToggle.checked = !isChecked;
        igToggle.setAttribute('aria-checked', String(!isChecked));
        updateIgToggleSubtext(!isChecked);
        if (errorMsg) errorMsg.hidden = false;
      }
    });
  }
}

/**
 * Handles close button action.
 */
function handleClosePage() {
  try {
    window.close();
  } catch {
    // Some contexts restrict window.close()
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
  initializeSettingsToggles().catch(() => {});

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
