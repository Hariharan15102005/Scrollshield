/**
 * ScrollShield - Settings Module (Phase 2)
 * Provides centralized, validated access to extension configuration.
 */

export const DEFAULT_SETTINGS = Object.freeze({
  youtubeShortsEnabled: true
});

export const STORAGE_KEYS = Object.freeze({
  YOUTUBE_SHORTS_ENABLED: 'youtubeShortsEnabled'
});

/**
 * Validates a raw settings object, replacing missing or invalid fields with defaults.
 * @param {unknown} raw
 * @returns {{ youtubeShortsEnabled: boolean }}
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

  return {
    youtubeShortsEnabled
  };
}

/**
 * Retrieves current settings from chrome.storage.local with safe defaults.
 * @returns {Promise<{ youtubeShortsEnabled: boolean }>}
 */
export async function getSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED], (result) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            resolve({ ...DEFAULT_SETTINGS });
            return;
          }
          resolve(validateSettings(result));
        });
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
 * Updates a specific setting in storage.
 * @param {string} key
 * @param {unknown} value
 * @returns {Promise<void>}
 */
export async function setSetting(key, value) {
  if (key === STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED) {
    const validatedValue = typeof value === 'boolean' ? value : DEFAULT_SETTINGS.youtubeShortsEnabled;

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
}

/**
 * Subscribes to settings changes.
 * @param {(newSettings: { youtubeShortsEnabled: boolean }) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onSettingsChanged(callback) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    const listener = (changes, areaName) => {
      if (areaName === 'local' && changes[STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED]) {
        getSettings().then(callback);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  return () => {};
}
