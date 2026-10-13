/**
 * ScrollShield - Settings Module (Phase 5)
 * Provides centralized, validated access to extension configuration
 * for YouTube Shorts, Instagram Reels, Facebook Reels, and TikTok For You Feed selective blocking.
 */

export const DEFAULT_SETTINGS = Object.freeze({
  youtubeShortsEnabled: true,
  instagramReelsEnabled: true,
  facebookReelsEnabled: true,
  tiktokForYouEnabled: true,
  xHomeFeedEnabled: true,
  redditFeedsEnabled: true
});

export const STORAGE_KEYS = Object.freeze({
  YOUTUBE_SHORTS_ENABLED: 'youtubeShortsEnabled',
  INSTAGRAM_REELS_ENABLED: 'instagramReelsEnabled',
  FACEBOOK_REELS_ENABLED: 'facebookReelsEnabled',
  TIKTOK_FOR_YOU_ENABLED: 'tiktokForYouEnabled',
  X_HOME_FEED_ENABLED: 'xHomeFeedEnabled',
  REDDIT_FEEDS_ENABLED: 'redditFeedsEnabled'
});

/**
 * Validates a raw settings object, replacing missing or invalid fields with defaults.
 * @param {unknown} raw
 * @returns {{ youtubeShortsEnabled: boolean, instagramReelsEnabled: boolean, facebookReelsEnabled: boolean, tiktokForYouEnabled: boolean, xHomeFeedEnabled: boolean, redditFeedsEnabled: boolean }}
 */
export function validateSettings(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const rawObj = /** @type {Record<string, unknown>} */ (raw);

  const youtubeShortsEnabled =
    typeof rawObj.youtubeShortsEnabled === 'boolean'
      ? rawObj.youtubeShortsEnabled
      : DEFAULT_SETTINGS.youtubeShortsEnabled;

  const instagramReelsEnabled =
    typeof rawObj.instagramReelsEnabled === 'boolean'
      ? rawObj.instagramReelsEnabled
      : DEFAULT_SETTINGS.instagramReelsEnabled;

  const facebookReelsEnabled =
    typeof rawObj.facebookReelsEnabled === 'boolean'
      ? rawObj.facebookReelsEnabled
      : DEFAULT_SETTINGS.facebookReelsEnabled;

  const tiktokForYouEnabled =
    typeof rawObj.tiktokForYouEnabled === 'boolean'
      ? rawObj.tiktokForYouEnabled
      : DEFAULT_SETTINGS.tiktokForYouEnabled;

  const xHomeFeedEnabled =
    typeof rawObj.xHomeFeedEnabled === 'boolean'
      ? rawObj.xHomeFeedEnabled
      : DEFAULT_SETTINGS.xHomeFeedEnabled;

  const redditFeedsEnabled =
    typeof rawObj.redditFeedsEnabled === 'boolean'
      ? rawObj.redditFeedsEnabled
      : DEFAULT_SETTINGS.redditFeedsEnabled;

  return {
    youtubeShortsEnabled,
    instagramReelsEnabled,
    facebookReelsEnabled,
    tiktokForYouEnabled,
    xHomeFeedEnabled,
    redditFeedsEnabled
  };
}

/**
 * Retrieves current settings from chrome.storage.local with safe defaults.
 * @returns {Promise<{ youtubeShortsEnabled: boolean, instagramReelsEnabled: boolean, facebookReelsEnabled: boolean, tiktokForYouEnabled: boolean, xHomeFeedEnabled: boolean, redditFeedsEnabled: boolean }>}
 */
export async function getSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(
          [
            STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED,
            STORAGE_KEYS.INSTAGRAM_REELS_ENABLED,
            STORAGE_KEYS.FACEBOOK_REELS_ENABLED,
            STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED,
            STORAGE_KEYS.X_HOME_FEED_ENABLED,
            STORAGE_KEYS.REDDIT_FEEDS_ENABLED
          ],
          (result) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              resolve({ ...DEFAULT_SETTINGS });
              return;
            }
            resolve(validateSettings(result));
          }
        );
      } catch {
        resolve({ ...DEFAULT_SETTINGS });
      }
    });
  }

  // Fallback for non-extension environments (tests, local browser preview)
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('scrollshield_settings');
      if (stored) {
        return validateSettings(JSON.parse(stored));
      }
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }

  return { ...DEFAULT_SETTINGS };
}

/**
 * Updates a specific setting in storage without overwriting other keys.
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  const allowedKeys = new Set([
    STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED,
    STORAGE_KEYS.INSTAGRAM_REELS_ENABLED,
    STORAGE_KEYS.FACEBOOK_REELS_ENABLED,
    STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED,
    STORAGE_KEYS.X_HOME_FEED_ENABLED,
    STORAGE_KEYS.REDDIT_FEEDS_ENABLED
  ]);

  if (!allowedKeys.has(key)) {
    return;
  }

  const defaultValue = DEFAULT_SETTINGS[key];
  const validatedValue = typeof value === 'boolean' ? value : defaultValue;

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ [key]: validatedValue }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || 'Failed to save setting'));
            return;
          }
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // Fallback for local preview / testing
  try {
    if (typeof localStorage !== 'undefined') {
      const current = await getSettings();
      current[key] = validatedValue;
      localStorage.setItem('scrollshield_settings', JSON.stringify(current));
    }
  } catch {
    // Ignore
  }
}

/**
 * Subscribes to settings changes.
 * @param {(newSettings: { youtubeShortsEnabled: boolean, instagramReelsEnabled: boolean, facebookReelsEnabled: boolean, tiktokForYouEnabled: boolean, xHomeFeedEnabled: boolean, redditFeedsEnabled: boolean }) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onSettingsChanged(callback) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    const listener = (changes, areaName) => {
      if (
        areaName === 'local' &&
        (changes[STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED] ||
          changes[STORAGE_KEYS.INSTAGRAM_REELS_ENABLED] ||
          changes[STORAGE_KEYS.FACEBOOK_REELS_ENABLED] ||
          changes[STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED] ||
          changes[STORAGE_KEYS.X_HOME_FEED_ENABLED] ||
          changes[STORAGE_KEYS.REDDIT_FEEDS_ENABLED])
      ) {
        getSettings().then(callback);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  return () => {};
}
