import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  validateSettings,
  getSettings,
  setSetting,
  STORAGE_KEYS
} from '../src/common/settings.js';

test('ScrollShield Settings Layer (Phase 2)', async (t) => {
  await t.test('has safe default policy with youtubeShortsEnabled = true', () => {
    assert.strictEqual(DEFAULT_SETTINGS.youtubeShortsEnabled, true);
    assert.strictEqual(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, 'youtubeShortsEnabled');
  });

  await t.test('validates an enabled setting', () => {
    const validated = validateSettings({ youtubeShortsEnabled: true });
    assert.strictEqual(validated.youtubeShortsEnabled, true);
  });

  await t.test('validates a disabled setting', () => {
    const validated = validateSettings({ youtubeShortsEnabled: false });
    assert.strictEqual(validated.youtubeShortsEnabled, false);
  });

  await t.test('replaces missing setting with safe default', () => {
    const v1 = validateSettings({});
    assert.strictEqual(v1.youtubeShortsEnabled, true);

    const v2 = validateSettings(undefined);
    assert.strictEqual(v2.youtubeShortsEnabled, true);

    const v3 = validateSettings(null);
    assert.strictEqual(v3.youtubeShortsEnabled, true);
  });

  await t.test('replaces malformed types with safe default', () => {
    const stringVal = validateSettings({ youtubeShortsEnabled: 'true' });
    assert.strictEqual(stringVal.youtubeShortsEnabled, true);

    const numVal = validateSettings({ youtubeShortsEnabled: 0 });
    assert.strictEqual(numVal.youtubeShortsEnabled, true);

    const nullVal = validateSettings({ youtubeShortsEnabled: null });
    assert.strictEqual(nullVal.youtubeShortsEnabled, true);

    const arrVal = validateSettings({ youtubeShortsEnabled: [true] });
    assert.strictEqual(arrVal.youtubeShortsEnabled, true);
  });

  await t.test('reads and saves using Chrome storage API when available', async () => {
    // Mock chrome.storage.local
    let storageStore = {};
    globalThis.chrome = {
      runtime: { lastError: null },
      storage: {
        local: {
          get: (keys, callback) => {
            const out = {};
            for (const k of keys) {
              if (k in storageStore) out[k] = storageStore[k];
            }
            callback(out);
          },
          set: (items, callback) => {
            Object.assign(storageStore, items);
            callback();
          }
        }
      }
    };

    try {
      const initial = await getSettings();
      assert.strictEqual(initial.youtubeShortsEnabled, true);

      // Save disabled state
      await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, false);
      const updated = await getSettings();
      assert.strictEqual(updated.youtubeShortsEnabled, false);

      // Save enabled state back
      await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, true);
      const reEnabled = await getSettings();
      assert.strictEqual(reEnabled.youtubeShortsEnabled, true);
    } finally {
      delete globalThis.chrome;
    }
  });

  await t.test('handles storage error gracefully during getSettings', async () => {
    globalThis.chrome = {
      runtime: { lastError: { message: 'Storage connection failure' } },
      storage: {
        local: {
          get: (keys, callback) => {
            callback({});
          }
        }
      }
    };

    try {
      const fallback = await getSettings();
      assert.strictEqual(fallback.youtubeShortsEnabled, true);
    } finally {
      delete globalThis.chrome;
    }
  });
});
