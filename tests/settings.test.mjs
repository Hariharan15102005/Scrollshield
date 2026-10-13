import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  validateSettings,
  getSettings,
  setSetting,
  STORAGE_KEYS
} from '../src/common/settings.js';

test('ScrollShield Settings Layer (Phase 4)', async (t) => {
  await t.test('has safe default policy with all three platforms enabled', () => {
    assert.strictEqual(DEFAULT_SETTINGS.youtubeShortsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.instagramReelsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.facebookReelsEnabled, true);
    assert.strictEqual(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, 'youtubeShortsEnabled');
    assert.strictEqual(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, 'instagramReelsEnabled');
    assert.strictEqual(STORAGE_KEYS.FACEBOOK_REELS_ENABLED, 'facebookReelsEnabled');
  });

  await t.test('validates fully enabled settings across all platforms', () => {
    const validated = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true
    });
    assert.strictEqual(validated.youtubeShortsEnabled, true);
    assert.strictEqual(validated.instagramReelsEnabled, true);
    assert.strictEqual(validated.facebookReelsEnabled, true);
  });

  await t.test('validates disabled states independently for each platform', () => {
    const fbDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: false
    });
    assert.strictEqual(fbDisabled.youtubeShortsEnabled, true);
    assert.strictEqual(fbDisabled.instagramReelsEnabled, true);
    assert.strictEqual(fbDisabled.facebookReelsEnabled, false);

    const igDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: false,
      facebookReelsEnabled: true
    });
    assert.strictEqual(igDisabled.youtubeShortsEnabled, true);
    assert.strictEqual(igDisabled.instagramReelsEnabled, false);
    assert.strictEqual(igDisabled.facebookReelsEnabled, true);

    const ytDisabled = validateSettings({
      youtubeShortsEnabled: false,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true
    });
    assert.strictEqual(ytDisabled.youtubeShortsEnabled, false);
    assert.strictEqual(ytDisabled.instagramReelsEnabled, true);
    assert.strictEqual(ytDisabled.facebookReelsEnabled, true);
  });

  await t.test('replaces missing settings with safe defaults', () => {
    const v1 = validateSettings({});
    assert.strictEqual(v1.youtubeShortsEnabled, true);
    assert.strictEqual(v1.instagramReelsEnabled, true);
    assert.strictEqual(v1.facebookReelsEnabled, true);

    const v2 = validateSettings(undefined);
    assert.strictEqual(v2.youtubeShortsEnabled, true);
    assert.strictEqual(v2.instagramReelsEnabled, true);
    assert.strictEqual(v2.facebookReelsEnabled, true);

    const v3 = validateSettings(null);
    assert.strictEqual(v3.youtubeShortsEnabled, true);
    assert.strictEqual(v3.instagramReelsEnabled, true);
    assert.strictEqual(v3.facebookReelsEnabled, true);
  });

  await t.test('replaces malformed types with safe defaults', () => {
    const stringVal = validateSettings({
      youtubeShortsEnabled: 'true',
      instagramReelsEnabled: 'false',
      facebookReelsEnabled: 'invalid'
    });
    assert.strictEqual(stringVal.youtubeShortsEnabled, true);
    assert.strictEqual(stringVal.instagramReelsEnabled, true);
    assert.strictEqual(stringVal.facebookReelsEnabled, true);

    const numVal = validateSettings({
      youtubeShortsEnabled: 0,
      instagramReelsEnabled: 1,
      facebookReelsEnabled: 2
    });
    assert.strictEqual(numVal.youtubeShortsEnabled, true);
    assert.strictEqual(numVal.instagramReelsEnabled, true);
    assert.strictEqual(numVal.facebookReelsEnabled, true);

    const nullVal = validateSettings({
      youtubeShortsEnabled: null,
      instagramReelsEnabled: null,
      facebookReelsEnabled: null
    });
    assert.strictEqual(nullVal.youtubeShortsEnabled, true);
    assert.strictEqual(nullVal.instagramReelsEnabled, true);
    assert.strictEqual(nullVal.facebookReelsEnabled, true);
  });

  await t.test('reads and saves settings independently across all three platforms without overwriting', async () => {
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
      assert.strictEqual(initial.facebookReelsEnabled, true);

      // Disable Facebook Reels only
      await setSetting(STORAGE_KEYS.FACEBOOK_REELS_ENABLED, false);
      const afterFbDisable = await getSettings();
      assert.strictEqual(afterFbDisable.youtubeShortsEnabled, true, 'YouTube setting should remain intact');
      assert.strictEqual(afterFbDisable.instagramReelsEnabled, true, 'Instagram setting should remain intact');
      assert.strictEqual(afterFbDisable.facebookReelsEnabled, false);

      // Disable Instagram Reels
      await setSetting(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, false);
      const afterIgDisable = await getSettings();
      assert.strictEqual(afterIgDisable.youtubeShortsEnabled, true, 'YouTube setting should remain intact');
      assert.strictEqual(afterIgDisable.instagramReelsEnabled, false);
      assert.strictEqual(afterIgDisable.facebookReelsEnabled, false, 'Facebook setting should remain false');

      // Re-enable Facebook Reels
      await setSetting(STORAGE_KEYS.FACEBOOK_REELS_ENABLED, true);
      const afterFbReenable = await getSettings();
      assert.strictEqual(afterFbReenable.youtubeShortsEnabled, true);
      assert.strictEqual(afterFbReenable.instagramReelsEnabled, false, 'Instagram setting should remain false');
      assert.strictEqual(afterFbReenable.facebookReelsEnabled, true);
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
      assert.strictEqual(fallback.facebookReelsEnabled, true);
    } finally {
      delete globalThis.chrome;
    }
  });
});
