/**
 * ScrollShield - Popup Script (Phase 4)
 * Handles version display, active YouTube Shorts, Instagram Reels & Facebook Reels toggles,
 * dynamic status indicators, and settings page navigation.
 */

import { getSettings, setSetting, onSettingsChanged, STORAGE_KEYS } from '../common/settings.js';

const FALLBACK_VERSION = 'v0.4.0';

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
 * Updates roadmap feature items to accurately reflect current active/paused status.
 * @param {boolean} ytEnabled
 * @param {boolean} igEnabled
 * @param {boolean} fbEnabled
 */
function updateRoadmapStatus(ytEnabled, igEnabled, fbEnabled) {
  const platforms = [
    {
      id: 'feature-item-yt',
      metaId: 'feature-meta-yt',
      enabled: ytEnabled,
      activeMeta: 'Active · /shorts blocked & shelves hidden',
      pausedMeta: 'Paused · Shorts unblocked'
    },
    {
      id: 'feature-item-ig',
      metaId: 'feature-meta-ig',
      enabled: igEnabled,
      activeMeta: 'Active · /reel/ blocked & DMs preserved',
      pausedMeta: 'Paused · Reels unblocked'
    },
    {
      id: 'feature-item-fb',
      metaId: 'feature-meta-fb',
      enabled: fbEnabled,
      activeMeta: 'Active · /reel/ blocked & Messenger preserved',
      pausedMeta: 'Paused · Reels unblocked'
    }
  ];

  for (const p of platforms) {
    const item = document.getElementById(p.id);
    const meta = document.getElementById(p.metaId);
    if (item && meta) {
      if (p.enabled) {
        item.classList.add('feature-item-active');
        item.classList.remove('feature-item-paused');
        meta.textContent = p.activeMeta;
      } else {
        item.classList.remove('feature-item-active');
        item.classList.add('feature-item-paused');
        meta.textContent = p.pausedMeta;
      }
    }
  }
}

/**
 * Updates status card presentation based on blocking toggles.
 * @param {boolean} ytEnabled
 * @param {boolean} igEnabled
 * @param {boolean} fbEnabled
 */
function updateStatusCard(ytEnabled, igEnabled, fbEnabled) {
  const dot = document.getElementById('status-indicator-dot');
  const title = document.getElementById('status-title');
  const desc = document.getElementById('status-description');

  if (!dot || !title || !desc) return;

  const anyActive = ytEnabled || igEnabled || fbEnabled;

  if (anyActive) {
    dot.classList.add('active');
    title.textContent = 'Shield Active';

    const activeList = [];
    if (ytEnabled) activeList.push('YouTube Shorts');
    if (igEnabled) activeList.push('Instagram Reels');
    if (fbEnabled) activeList.push('Facebook Reels');

    if (activeList.length === 3) {
      desc.textContent =
        'YouTube Shorts, Instagram Reels, and Facebook Reels are shielded. Normal videos, Messenger, DMs, posts, and search remain accessible.';
    } else {
      desc.textContent = `${activeList.join(' and ')} shielding is active. Other platforms are paused.`;
    }
  } else {
    dot.classList.remove('active');
    title.textContent = 'Shields Paused';
    desc.textContent =
      'Short-form video shielding is currently paused across all platforms.';
  }

  updateRoadmapStatus(ytEnabled, igEnabled, fbEnabled);
}

/**
 * Synchronizes visible toggles with given settings object.
 * @param {{ youtubeShortsEnabled: boolean, instagramReelsEnabled: boolean, facebookReelsEnabled: boolean }} settings
 */
function applySettingsToUi(settings) {
  const ytToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-youtube-shorts')
  );
  const igToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-instagram-reels')
  );
  const fbToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-facebook-reels')
  );

  if (ytToggle) {
    ytToggle.checked = settings.youtubeShortsEnabled;
    ytToggle.setAttribute('aria-checked', String(settings.youtubeShortsEnabled));
  }

  if (igToggle) {
    igToggle.checked = settings.instagramReelsEnabled;
    igToggle.setAttribute('aria-checked', String(settings.instagramReelsEnabled));
  }

  if (fbToggle) {
    fbToggle.checked = settings.facebookReelsEnabled;
    fbToggle.setAttribute('aria-checked', String(settings.facebookReelsEnabled));
  }

  updateStatusCard(
    settings.youtubeShortsEnabled,
    settings.instagramReelsEnabled,
    settings.facebookReelsEnabled
  );
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
  const fbToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-facebook-reels')
  );
  const errorMsg = document.getElementById('save-error-message');

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

  // Subscribe to settings changes from options page or external updates
  onSettingsChanged((newSettings) => {
    currentSettings = newSettings;
    applySettingsToUi(currentSettings);
  });

  // YouTube Toggle handler
  if (ytToggle) {
    ytToggle.addEventListener('change', async () => {
      const isChecked = ytToggle.checked;
      ytToggle.setAttribute('aria-checked', String(isChecked));
      currentSettings.youtubeShortsEnabled = isChecked;
      updateStatusCard(
        currentSettings.youtubeShortsEnabled,
        currentSettings.instagramReelsEnabled,
        currentSettings.facebookReelsEnabled
      );
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, isChecked);
      } catch {
        ytToggle.checked = !isChecked;
        ytToggle.setAttribute('aria-checked', String(!isChecked));
        currentSettings.youtubeShortsEnabled = !isChecked;
        updateStatusCard(
          currentSettings.youtubeShortsEnabled,
          currentSettings.instagramReelsEnabled,
          currentSettings.facebookReelsEnabled
        );
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
      updateStatusCard(
        currentSettings.youtubeShortsEnabled,
        currentSettings.instagramReelsEnabled,
        currentSettings.facebookReelsEnabled
      );
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, isChecked);
      } catch {
        igToggle.checked = !isChecked;
        igToggle.setAttribute('aria-checked', String(!isChecked));
        currentSettings.instagramReelsEnabled = !isChecked;
        updateStatusCard(
          currentSettings.youtubeShortsEnabled,
          currentSettings.instagramReelsEnabled,
          currentSettings.facebookReelsEnabled
        );
        if (errorMsg) errorMsg.hidden = false;
      }
    });
  }

  // Facebook Toggle handler
  if (fbToggle) {
    fbToggle.addEventListener('change', async () => {
      const isChecked = fbToggle.checked;
      fbToggle.setAttribute('aria-checked', String(isChecked));
      currentSettings.facebookReelsEnabled = isChecked;
      updateStatusCard(
        currentSettings.youtubeShortsEnabled,
        currentSettings.instagramReelsEnabled,
        currentSettings.facebookReelsEnabled
      );
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(STORAGE_KEYS.FACEBOOK_REELS_ENABLED, isChecked);
      } catch {
        fbToggle.checked = !isChecked;
        fbToggle.setAttribute('aria-checked', String(!isChecked));
        currentSettings.facebookReelsEnabled = !isChecked;
        updateStatusCard(
          currentSettings.youtubeShortsEnabled,
          currentSettings.instagramReelsEnabled,
          currentSettings.facebookReelsEnabled
        );
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
