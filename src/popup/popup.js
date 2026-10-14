/**
 * ScrollShield - Popup Script (Phase 6)
 * Handles version display, active YouTube Shorts, Instagram Reels, Facebook Reels,
 * TikTok For You, X Home timeline & Reddit feeds toggles,
 * dynamic status indicators, and settings page navigation.
 */

import { getSettings, setSetting, onSettingsChanged, STORAGE_KEYS } from '../common/settings.js';

const FALLBACK_VERSION = 'v0.6.0';

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
 * @param {boolean} ttEnabled
 * @param {boolean} xEnabled
 * @param {boolean} redditEnabled
 */
function updateRoadmapStatus(ytEnabled, igEnabled, fbEnabled, ttEnabled, xEnabled, redditEnabled) {
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
    },
    {
      id: 'feature-item-tt',
      metaId: 'feature-meta-tt',
      enabled: ttEnabled,
      activeMeta: 'Active · For You feed blocked & search/profiles preserved',
      pausedMeta: 'Paused · For You unblocked'
    },
    {
      id: 'feature-item-x',
      metaId: 'feature-meta-x',
      enabled: xEnabled,
      activeMeta: 'Active · Home timeline blocked & search/DMs preserved',
      pausedMeta: 'Paused · Timeline unblocked'
    },
    {
      id: 'feature-item-reddit',
      metaId: 'feature-meta-reddit',
      enabled: redditEnabled,
      activeMeta: 'Active · Home/Popular/All blocked & communities preserved',
      pausedMeta: 'Paused · Feeds unblocked'
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
 * @param {boolean} ttEnabled
 * @param {boolean} xEnabled
 * @param {boolean} redditEnabled
 */
function updateStatusCard(ytEnabled, igEnabled, fbEnabled, ttEnabled, xEnabled, redditEnabled) {
  const dot = document.getElementById('status-indicator-dot');
  const title = document.getElementById('status-title');
  const desc = document.getElementById('status-description');

  if (!dot || !title || !desc) return;

  const anyActive = ytEnabled || igEnabled || fbEnabled || ttEnabled || xEnabled || redditEnabled;

  if (anyActive) {
    dot.classList.add('active');
    title.textContent = 'Shield Active';

    const activeList = [];
    if (ytEnabled) activeList.push('YouTube Shorts');
    if (igEnabled) activeList.push('Instagram Reels');
    if (fbEnabled) activeList.push('Facebook Reels');
    if (ttEnabled) activeList.push('TikTok For You');
    if (xEnabled) activeList.push('X Home Timeline');
    if (redditEnabled) activeList.push('Reddit Feeds');

    if (activeList.length === 6) {
      desc.textContent =
        'YouTube Shorts, Instagram Reels, Facebook Reels, TikTok For You, X Home timeline, and Reddit feeds are shielded. Utility features remain accessible.';
    } else {
      desc.textContent = `${activeList.join(', ')} shielding is active. Other platforms are paused.`;
    }
  } else {
    dot.classList.remove('active');
    title.textContent = 'Shields Paused';
    desc.textContent =
      'Short-form video and feed shielding is currently paused across all platforms.';
  }

  updateRoadmapStatus(ytEnabled, igEnabled, fbEnabled, ttEnabled, xEnabled, redditEnabled);
}

/**
 * Synchronizes visible toggles with given settings object.
 * @param {{ youtubeShortsEnabled: boolean, instagramReelsEnabled: boolean, facebookReelsEnabled: boolean, tiktokForYouEnabled: boolean, xHomeFeedEnabled: boolean, redditFeedsEnabled: boolean }} settings
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
  const ttToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-tiktok-foryou')
  );
  const xToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-x-home')
  );
  const redditToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-reddit-feeds')
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

  if (ttToggle) {
    ttToggle.checked = settings.tiktokForYouEnabled;
    ttToggle.setAttribute('aria-checked', String(settings.tiktokForYouEnabled));
  }

  if (xToggle) {
    xToggle.checked = settings.xHomeFeedEnabled;
    xToggle.setAttribute('aria-checked', String(settings.xHomeFeedEnabled));
  }

  if (redditToggle) {
    redditToggle.checked = settings.redditFeedsEnabled;
    redditToggle.setAttribute('aria-checked', String(settings.redditFeedsEnabled));
  }

  updateStatusCard(
    settings.youtubeShortsEnabled,
    settings.instagramReelsEnabled,
    settings.facebookReelsEnabled,
    settings.tiktokForYouEnabled,
    settings.xHomeFeedEnabled,
    settings.redditFeedsEnabled
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
  const ttToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-tiktok-foryou')
  );
  const xToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-x-home')
  );
  const redditToggle = /** @type {HTMLInputElement | null} */ (
    document.getElementById('toggle-reddit-feeds')
  );
  const errorMsg = document.getElementById('save-error-message');

  let currentSettings = {
    youtubeShortsEnabled: true,
    instagramReelsEnabled: true,
    facebookReelsEnabled: true,
    tiktokForYouEnabled: true,
    xHomeFeedEnabled: true,
    redditFeedsEnabled: true
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

  // Helper for toggle change handler
  const setupToggleListener = (toggleEl, key, settingProp) => {
    if (!toggleEl) return;
    toggleEl.addEventListener('change', async () => {
      const isChecked = toggleEl.checked;
      toggleEl.setAttribute('aria-checked', String(isChecked));
      currentSettings[settingProp] = isChecked;
      updateStatusCard(
        currentSettings.youtubeShortsEnabled,
        currentSettings.instagramReelsEnabled,
        currentSettings.facebookReelsEnabled,
        currentSettings.tiktokForYouEnabled,
        currentSettings.xHomeFeedEnabled,
        currentSettings.redditFeedsEnabled
      );
      if (errorMsg) errorMsg.hidden = true;

      try {
        await setSetting(key, isChecked);
      } catch {
        toggleEl.checked = !isChecked;
        toggleEl.setAttribute('aria-checked', String(!isChecked));
        currentSettings[settingProp] = !isChecked;
        updateStatusCard(
          currentSettings.youtubeShortsEnabled,
          currentSettings.instagramReelsEnabled,
          currentSettings.facebookReelsEnabled,
          currentSettings.tiktokForYouEnabled,
          currentSettings.xHomeFeedEnabled,
          currentSettings.redditFeedsEnabled
        );
        if (errorMsg) errorMsg.hidden = false;
      }
    });
  };

  setupToggleListener(ytToggle, STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, 'youtubeShortsEnabled');
  setupToggleListener(igToggle, STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, 'instagramReelsEnabled');
  setupToggleListener(fbToggle, STORAGE_KEYS.FACEBOOK_REELS_ENABLED, 'facebookReelsEnabled');
  setupToggleListener(ttToggle, STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED, 'tiktokForYouEnabled');
  setupToggleListener(xToggle, STORAGE_KEYS.X_HOME_FEED_ENABLED, 'xHomeFeedEnabled');
  setupToggleListener(redditToggle, STORAGE_KEYS.REDDIT_FEEDS_ENABLED, 'redditFeedsEnabled');
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
