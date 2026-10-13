/**
 * ScrollShield - Settings Script (Phase 4)
 * Handles version display, YouTube Shorts, Instagram Reels & Facebook Reels settings management,
 * dynamic badge indicators, and page navigation.
 */

import { getSettings, setSetting, onSettingsChanged, STORAGE_KEYS } from '../common/settings.js';

const FALLBACK_VERSION = '0.4.0';

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
 * Updates platform status badge presentation.
 * @param {string} badgeId
 * @param {boolean} isEnabled
 */
function updateBadge(badgeId, isEnabled) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;

  if (isEnabled) {
    badge.textContent = 'Active';
    badge.className = 'control-badge badge-active';
  } else {
    badge.textContent = 'Paused';
    badge.className = 'control-badge badge-paused';
  }
}

/**
 * Updates status text underneath the YouTube toggle.
 * @param {boolean} isEnabled
 */
function updateYtToggleSubtext(isEnabled) {
  const subtext = document.getElementById('status-toggle-yt-shorts');
  if (subtext) {
    if (isEnabled) {
      subtext.textContent = 'Currently blocking Shorts';
      subtext.style.color = '#a7f3d0';
    } else {
      subtext.textContent = 'Shorts blocking paused';
      subtext.style.color = '#fbbf24';
    }
  }
  updateBadge('badge-yt-shorts', isEnabled);
}

/**
 * Updates status text underneath the Instagram toggle.
 * @param {boolean} isEnabled
 */
function updateIgToggleSubtext(isEnabled) {
  const subtext = document.getElementById('status-toggle-ig-reels');
  if (subtext) {
    if (isEnabled) {
      subtext.textContent = 'Currently blocking Reels';
      subtext.style.color = '#a7f3d0';
    } else {
      subtext.textContent = 'Reels blocking paused';
      subtext.style.color = '#fbbf24';
    }
  }
  updateBadge('badge-ig-reels', isEnabled);
}

/**
 * Updates status text underneath the Facebook toggle.
 * @param {boolean} isEnabled
 */
function updateFbToggleSubtext(isEnabled) {
  const subtext = document.getElementById('status-toggle-fb-reels');
  if (subtext) {
    if (isEnabled) {
      subtext.textContent = 'Currently blocking Reels';
      subtext.style.color = '#a7f3d0';
    } else {
      subtext.textContent = 'Reels blocking paused';
      subtext.style.color = '#fbbf24';
    }
  }
  updateBadge('badge-fb-reels', isEnabled);
}

/**
 * Applies settings state to all UI switches and labels.
 * @param {{ youtubeShortsEnabled: boolean, instagramReelsEnabled: boolean, facebookReelsEnabled: boolean }} settings
 */
function applySettingsToUi(settings) {
  const ytToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-toggle-youtube-shorts')
  );
  const igToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-toggle-instagram-reels')
  );
  const fbToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-toggle-facebook-reels')
  );

  if (ytToggle) {
    ytToggle.checked = settings.youtubeShortsEnabled;
    ytToggle.setAttribute('aria-checked', String(settings.youtubeShortsEnabled));
    updateYtToggleSubtext(settings.youtubeShortsEnabled);
  }

  if (igToggle) {
    igToggle.checked = settings.instagramReelsEnabled;
    igToggle.setAttribute('aria-checked', String(settings.instagramReelsEnabled));
    updateIgToggleSubtext(settings.instagramReelsEnabled);
  }

  if (fbToggle) {
    fbToggle.checked = settings.facebookReelsEnabled;
    fbToggle.setAttribute('aria-checked', String(settings.facebookReelsEnabled));
    updateFbToggleSubtext(settings.facebookReelsEnabled);
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
  const fbToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('settings-toggle-facebook-reels')
  );
  const errorMsg = document.getElementById('settings-save-error');

  let currentSettings = {
    youtubeShortsEnabled: true,
    instagramReelsEnabled: true,
    facebookReelsEnabled: true
  };

  try {
    currentSettings = await getSettings();
  } catch {
    // Retain defaults
  }

  applySettingsToUi(currentSettings);

  // Subscribe to external settings changes
  onSettingsChanged((newSettings) => {
    currentSettings = newSettings;
    applySettingsToUi(currentSettings);
  });

  // YouTube Toggle Listener
  if (ytToggle) {
    ytToggle.addEventListener('change', async () => {
      const isChecked = ytToggle.checked;
      ytToggle.setAttribute('aria-checked', String(isChecked));
      currentSettings.youtubeShortsEnabled = isChecked;
      updateYtToggleSubtext(isChecked);
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, isChecked);
      } catch {
        ytToggle.checked = !isChecked;
        ytToggle.setAttribute('aria-checked', String(!isChecked));
        currentSettings.youtubeShortsEnabled = !isChecked;
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
      currentSettings.instagramReelsEnabled = isChecked;
      updateIgToggleSubtext(isChecked);
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, isChecked);
      } catch {
        igToggle.checked = !isChecked;
        igToggle.setAttribute('aria-checked', String(!isChecked));
        currentSettings.instagramReelsEnabled = !isChecked;
        updateIgToggleSubtext(!isChecked);
        if (errorMsg) errorMsg.hidden = false;
      }
    });
  }

  // Facebook Toggle Listener
  if (fbToggle) {
    fbToggle.addEventListener('change', async () => {
      const isChecked = fbToggle.checked;
      fbToggle.setAttribute('aria-checked', String(isChecked));
      currentSettings.facebookReelsEnabled = isChecked;
      updateFbToggleSubtext(isChecked);
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.FACEBOOK_REELS_ENABLED, isChecked);
      } catch {
        fbToggle.checked = !isChecked;
        fbToggle.setAttribute('aria-checked', String(!isChecked));
        currentSettings.facebookReelsEnabled = !isChecked;
        updateFbToggleSubtext(!isChecked);
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
