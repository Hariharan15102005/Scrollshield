import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  validateSettings,
  getSettings,
  setSetting,
  STORAGE_KEYS
} from '../src/common/settings.js';

test('ScrollShield Settings Layer (Phase 3)', async (t) => {
  await t.test('has safe default policy with both platforms enabled', () => {
    assert.strictEqual(DEFAULT_SETTINGS.youtubeShortsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.instagramReelsEnabled, true);
    assert.strictEqual(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, 'youtubeShortsEnabled');
    assert.strictEqual(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, 'instagramReelsEnabled');
  });

  await t.test('validates fully enabled settings', () => {
    const validated = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true
    });
    assert.strictEqual(validated.youtubeShortsEnabled, true);
    assert.strictEqual(validated.instagramReelsEnabled, true);
  });

  await t.test('validates disabled states independently', () => {
    const ytDisabled = validateSettings({
      youtubeShortsEnabled: false,
      instagramReelsEnabled: true
    });
    assert.strictEqual(ytDisabled.youtubeShortsEnabled, false);
    assert.strictEqual(ytDisabled.instagramReelsEnabled, true);

    const igDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: false
    });
    assert.strictEqual(igDisabled.youtubeShortsEnabled, true);
    assert.strictEqual(igDisabled.instagramReelsEnabled, false);
  });

  await t.test('replaces missing settings with safe defaults', () => {
    const v1 = validateSettings({});
    assert.strictEqual(v1.youtubeShortsEnabled, true);
    assert.strictEqual(v1.instagramReelsEnabled, true);

    const v2 = validateSettings(undefined);
    assert.strictEqual(v2.youtubeShortsEnabled, true);
    assert.strictEqual(v2.instagramReelsEnabled, true);

    const v3 = validateSettings(null);
    assert.strictEqual(v3.youtubeShortsEnabled, true);
    assert.strictEqual(v3.instagramReelsEnabled, true);
  });

  await t.test('replaces malformed types with safe defaults', () => {
    const stringVal = validateSettings({
      youtubeShortsEnabled: 'true',
      instagramReelsEnabled: 'false'
    });
    assert.strictEqual(stringVal.youtubeShortsEnabled, true);
    assert.strictEqual(stringVal.instagramReelsEnabled, true);

    const numVal = validateSettings({
      youtubeShortsEnabled: 0,
      instagramReelsEnabled: 1
    });
    assert.strictEqual(numVal.youtubeShortsEnabled, true);
    assert.strictEqual(numVal.instagramReelsEnabled, true);

    const nullVal = validateSettings({
      youtubeShortsEnabled: null,
      instagramReelsEnabled: null
    });
    assert.strictEqual(nullVal.youtubeShortsEnabled, true);
    assert.strictEqual(nullVal.instagramReelsEnabled, true);
  });

  await t.test('reads and saves settings independently without overwriting', async () => {
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
      assert.strictEqual(initial.instagramReelsEnabled, true);

      // Disable Instagram Reels only
      await setSetting(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, false);
      const afterIgDisable = await getSettings();
      assert.strictEqual(afterIgDisable.youtubeShortsEnabled, true, 'YouTube setting should remain intact');
      assert.strictEqual(afterIgDisable.instagramReelsEnabled, false);

      // Disable YouTube Shorts as well
      await setSetting(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, false);
      const afterBothDisable = await getSettings();
      assert.strictEqual(afterBothDisable.youtubeShortsEnabled, false);
      assert.strictEqual(afterBothDisable.instagramReelsEnabled, false);

      // Re-enable Instagram Reels
      await setSetting(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, true);
      const afterIgReenable = await getSettings();
      assert.strictEqual(afterIgReenable.youtubeShortsEnabled, false, 'YouTube setting should remain false');
      assert.strictEqual(afterIgReenable.instagramReelsEnabled, true);
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
      assert.strictEqual(fallback.instagramReelsEnabled, true);
    } finally {
      delete globalThis.chrome;
    }
  });
});
