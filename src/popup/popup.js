/**
 * ScrollShield - Popup Script (Phase 3)
 * Handles version display, active YouTube Shorts & Instagram Reels toggles,
 * and settings page navigation.
 */

import { getSettings, setSetting, STORAGE_KEYS } from '../common/settings.js';

const FALLBACK_VERSION = 'v0.3.0';

/**
 * Safely resolves extension version from Chrome manifest or uses fallback.
 */
function initializeVersion() {
  const versionElement = document.getElementById('extension-version');
  if (!versionElement) return;

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getManifest === 'function') {
      const manifest = chrome.runtime.getManifest();
      if (manifest && typeof manifest.version === 'string' && manifest.version.trim().length > 0) {
        versionElement.textContent = `v${manifest.version}`;
        return;
      }
    }
  } catch {
    // Non-extension or restricted context; fallback is retained
  }

  versionElement.textContent = FALLBACK_VERSION;
}

/**
 * Updates status card presentation based on blocking toggles.
 * @param {boolean} ytEnabled
 * @param {boolean} igEnabled
 */
function updateStatusCard(ytEnabled, igEnabled) {
  const dot = document.getElementById('status-indicator-dot');
  const title = document.getElementById('status-title');
  const desc = document.getElementById('status-description');

  if (!dot || !title || !desc) return;

  const anyActive = ytEnabled || igEnabled;

  if (anyActive) {
    dot.classList.add('active');
    title.textContent = 'Shield Active';

    if (ytEnabled && igEnabled) {
      desc.textContent =
        'YouTube Shorts and Instagram Reels are shielded. Normal videos, DMs, posts, and search remain accessible.';
    } else if (ytEnabled) {
      desc.textContent =
        'YouTube Shorts blocking is active. Instagram Reels blocking is currently paused.';
    } else {
      desc.textContent =
        'Instagram Reels blocking is active. YouTube Shorts blocking is currently paused.';
    }
  } else {
    dot.classList.remove('active');
    title.textContent = 'Shields Paused';
    desc.textContent =
      'Short-form video shielding is currently paused across all platforms.';
  }
}

/**
 * Initializes platform toggles and attaches change listeners.
 */
async function initializeToggles() {
  const ytToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-youtube-shorts')
  );
  const igToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-instagram-reels')
  );
  const errorMsg = document.getElementById('save-error-message');

  let currentSettings = { youtubeShortsEnabled: true, instagramReelsEnabled: true };

  try {
    currentSettings = await getSettings();
  } catch {
    // Retain defaults
  }

  if (ytToggle) {
    ytToggle.checked = currentSettings.youtubeShortsEnabled;
    ytToggle.setAttribute('aria-checked', String(currentSettings.youtubeShortsEnabled));
  }

  if (igToggle) {
    igToggle.checked = currentSettings.instagramReelsEnabled;
    igToggle.setAttribute('aria-checked', String(currentSettings.instagramReelsEnabled));
  }

  updateStatusCard(currentSettings.youtubeShortsEnabled, currentSettings.instagramReelsEnabled);

  // YouTube Toggle handler
  if (ytToggle) {
    ytToggle.addEventListener('change', async () => {
      const isChecked = ytToggle.checked;
      ytToggle.setAttribute('aria-checked', String(isChecked));
      currentSettings.youtubeShortsEnabled = isChecked;
      updateStatusCard(currentSettings.youtubeShortsEnabled, currentSettings.instagramReelsEnabled);
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, isChecked);
      } catch {
        ytToggle.checked = !isChecked;
        ytToggle.setAttribute('aria-checked', String(!isChecked));
        currentSettings.youtubeShortsEnabled = !isChecked;
        updateStatusCard(currentSettings.youtubeShortsEnabled, currentSettings.instagramReelsEnabled);
        if (errorMsg) errorMsg.hidden = false;
      }
    });
  }

  // Instagram Toggle handler
  if (igToggle) {
    igToggle.addEventListener('change', async () => {
      const isChecked = igToggle.checked;
      igToggle.setAttribute('aria-checked', String(isChecked));
      currentSettings.instagramReelsEnabled = isChecked;
      updateStatusCard(currentSettings.youtubeShortsEnabled, currentSettings.instagramReelsEnabled);
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, isChecked);
      } catch {
        igToggle.checked = !isChecked;
        igToggle.setAttribute('aria-checked', String(!isChecked));
        currentSettings.instagramReelsEnabled = !isChecked;
        updateStatusCard(currentSettings.youtubeShortsEnabled, currentSettings.instagramReelsEnabled);
        if (errorMsg) errorMsg.hidden = false;
      }
    });
  }
}

/**
 * Handles navigation to the settings / options page.
 */
function handleOpenSettings(event) {
  event.preventDefault();

  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.openOptionsPage === 'function') {
      chrome.runtime.openOptionsPage(() => {
        if (chrome.runtime.lastError) {
          window.open('../settings/settings.html', '_blank');
        }
      });
      return;
    }
  } catch {
    // Fallback
  }

  window.open('../settings/settings.html', '_blank');
}

/**
 * Main initialization entry point.
 */
function init() {
  initializeVersion();
  initializeToggles().catch(() => {});

  const settingsButton = document.getElementById('open-settings-btn');
  if (settingsButton) {
    settingsButton.addEventListener('click', handleOpenSettings);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
