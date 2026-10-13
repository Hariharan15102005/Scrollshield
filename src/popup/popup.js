/**
 * ScrollShield - Popup Script (Phase 2)
 * Handles version display, active YouTube Shorts blocking toggle,
 * and settings page navigation.
 */

import { getSettings, setSetting, STORAGE_KEYS } from '../common/settings.js';

const FALLBACK_VERSION = 'v0.2.0';

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
 * Updates status card presentation based on blocking toggle state.
 * @param {boolean} isEnabled
 */
function updateStatusCard(isEnabled) {
  const dot = document.getElementById('status-indicator-dot');
  const title = document.getElementById('status-title');
  const desc = document.getElementById('status-description');

  if (!dot || !title || !desc) return;

  if (isEnabled) {
    dot.classList.add('active');
    title.textContent = 'Shield Active';
    desc.textContent =
      'YouTube Shorts blocking is active. Regular videos, subscriptions, and search remain accessible.';
  } else {
    dot.classList.remove('active');
    title.textContent = 'Shield Paused';
    desc.textContent =
      'YouTube Shorts blocking is currently paused. Shorts feeds and reels player are accessible.';
  }
}

/**
 * Initializes the YouTube Shorts blocking toggle and attaches change listeners.
 */
async function initializeToggle() {
  const toggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-youtube-shorts')
  );
  const errorMsg = document.getElementById('save-error-message');
  if (!toggle) return;

  try {
    const settings = await getSettings();
    toggle.checked = settings.youtubeShortsEnabled;
    toggle.setAttribute('aria-checked', String(settings.youtubeShortsEnabled));
    updateStatusCard(settings.youtubeShortsEnabled);
  } catch {
    // Default checked if reading fails
    toggle.checked = true;
    toggle.setAttribute('aria-checked', 'true');
    updateStatusCard(true);
  }

  toggle.addEventListener('change', async () => {
    const isChecked = toggle.checked;
    toggle.setAttribute('aria-checked', String(isChecked));
    updateStatusCard(isChecked);
    if (errorMsg) errorMsg.hidden = true;

    try {
      await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, isChecked);
    } catch {
      // Revert on save error
      toggle.checked = !isChecked;
      toggle.setAttribute('aria-checked', String(!isChecked));
      updateStatusCard(!isChecked);
      if (errorMsg) errorMsg.hidden = false;
    }
  });
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
  initializeToggle().catch(() => {});

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
