import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  validateSettings,
  getSettings,
  setSetting,
  STORAGE_KEYS
} from '../src/common/settings.js';

test('ScrollShield Settings Layer (Phase 5)', async (t) => {
  await t.test('has safe default policy with all four platforms enabled', () => {
    assert.strictEqual(DEFAULT_SETTINGS.youtubeShortsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.instagramReelsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.facebookReelsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.tiktokForYouEnabled, true);
    assert.strictEqual(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, 'youtubeShortsEnabled');
    assert.strictEqual(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, 'instagramReelsEnabled');
    assert.strictEqual(STORAGE_KEYS.FACEBOOK_REELS_ENABLED, 'facebookReelsEnabled');
    assert.strictEqual(STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED, 'tiktokForYouEnabled');
  });

  await t.test('validates fully enabled settings across all platforms', () => {
    const validated = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: true
    });
    assert.strictEqual(validated.youtubeShortsEnabled, true);
    assert.strictEqual(validated.instagramReelsEnabled, true);
    assert.strictEqual(validated.facebookReelsEnabled, true);
    assert.strictEqual(validated.tiktokForYouEnabled, true);
  });

  await t.test('validates disabled states independently for each platform', () => {
    const ttDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: false
    });
    assert.strictEqual(ttDisabled.youtubeShortsEnabled, true);
    assert.strictEqual(ttDisabled.instagramReelsEnabled, true);
    assert.strictEqual(ttDisabled.facebookReelsEnabled, true);
    assert.strictEqual(ttDisabled.tiktokForYouEnabled, false);

    const fbDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: false,
      tiktokForYouEnabled: true
    });
    assert.strictEqual(fbDisabled.youtubeShortsEnabled, true);
    assert.strictEqual(fbDisabled.instagramReelsEnabled, true);
    assert.strictEqual(fbDisabled.facebookReelsEnabled, false);
    assert.strictEqual(fbDisabled.tiktokForYouEnabled, true);

    const igDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: false,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: true
    });
    assert.strictEqual(igDisabled.youtubeShortsEnabled, true);
    assert.strictEqual(igDisabled.instagramReelsEnabled, false);
    assert.strictEqual(igDisabled.facebookReelsEnabled, true);
    assert.strictEqual(igDisabled.tiktokForYouEnabled, true);

    const ytDisabled = validateSettings({
      youtubeShortsEnabled: false,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: true
    });
    assert.strictEqual(ytDisabled.youtubeShortsEnabled, false);
    assert.strictEqual(ytDisabled.instagramReelsEnabled, true);
    assert.strictEqual(ytDisabled.facebookReelsEnabled, true);
    assert.strictEqual(ytDisabled.tiktokForYouEnabled, true);
  });

  await t.test('replaces missing settings with safe defaults', () => {
    const v1 = validateSettings({});
    assert.strictEqual(v1.youtubeShortsEnabled, true);
    assert.strictEqual(v1.instagramReelsEnabled, true);
    assert.strictEqual(v1.facebookReelsEnabled, true);
    assert.strictEqual(v1.tiktokForYouEnabled, true);

    const v2 = validateSettings(undefined);
    assert.strictEqual(v2.youtubeShortsEnabled, true);
    assert.strictEqual(v2.instagramReelsEnabled, true);
    assert.strictEqual(v2.facebookReelsEnabled, true);
    assert.strictEqual(v2.tiktokForYouEnabled, true);

    const v3 = validateSettings(null);
    assert.strictEqual(v3.youtubeShortsEnabled, true);
    assert.strictEqual(v3.instagramReelsEnabled, true);
    assert.strictEqual(v3.facebookReelsEnabled, true);
    assert.strictEqual(v3.tiktokForYouEnabled, true);
  });

  await t.test('replaces malformed types with safe defaults', () => {
    const stringVal = validateSettings({
      youtubeShortsEnabled: 'true',
      instagramReelsEnabled: 'false',
      facebookReelsEnabled: 'invalid',
      tiktokForYouEnabled: 123
    });
    assert.strictEqual(stringVal.youtubeShortsEnabled, true);
    assert.strictEqual(stringVal.instagramReelsEnabled, true);
    assert.strictEqual(stringVal.facebookReelsEnabled, true);
    assert.strictEqual(stringVal.tiktokForYouEnabled, true);

    const numVal = validateSettings({
      youtubeShortsEnabled: 0,
      instagramReelsEnabled: 1,
      facebookReelsEnabled: 2,
      tiktokForYouEnabled: 3
    });
    assert.strictEqual(numVal.youtubeShortsEnabled, true);
    assert.strictEqual(numVal.instagramReelsEnabled, true);
    assert.strictEqual(numVal.facebookReelsEnabled, true);
    assert.strictEqual(numVal.tiktokForYouEnabled, true);

    const nullVal = validateSettings({
      youtubeShortsEnabled: null,
      instagramReelsEnabled: null,
      facebookReelsEnabled: null,
      tiktokForYouEnabled: null
    });
    assert.strictEqual(nullVal.youtubeShortsEnabled, true);
    assert.strictEqual(nullVal.instagramReelsEnabled, true);
    assert.strictEqual(nullVal.facebookReelsEnabled, true);
    assert.strictEqual(nullVal.tiktokForYouEnabled, true);
  });

  await t.test('reads and saves settings independently across all four platforms without overwriting', async () => {
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
      assert.strictEqual(initial.tiktokForYouEnabled, true);

      // Disable TikTok For You only
      await setSetting(STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED, false);
      const afterTtDisable = await getSettings();
      assert.strictEqual(afterTtDisable.youtubeShortsEnabled, true, 'YouTube setting should remain intact');
      assert.strictEqual(afterTtDisable.instagramReelsEnabled, true, 'Instagram setting should remain intact');
      assert.strictEqual(afterTtDisable.facebookReelsEnabled, true, 'Facebook setting should remain intact');
      assert.strictEqual(afterTtDisable.tiktokForYouEnabled, false);

      // Disable Facebook Reels
      await setSetting(STORAGE_KEYS.FACEBOOK_REELS_ENABLED, false);
      const afterFbDisable = await getSettings();
      assert.strictEqual(afterFbDisable.youtubeShortsEnabled, true, 'YouTube setting should remain intact');
      assert.strictEqual(afterFbDisable.instagramReelsEnabled, true, 'Instagram setting should remain intact');
      assert.strictEqual(afterFbDisable.facebookReelsEnabled, false);
      assert.strictEqual(afterFbDisable.tiktokForYouEnabled, false, 'TikTok setting should remain false');

      // Re-enable TikTok For You
      await setSetting(STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED, true);
      const afterTtReenable = await getSettings();
      assert.strictEqual(afterTtReenable.youtubeShortsEnabled, true);
      assert.strictEqual(afterTtReenable.instagramReelsEnabled, true);
      assert.strictEqual(afterTtReenable.facebookReelsEnabled, false, 'Facebook setting should remain false');
      assert.strictEqual(afterTtReenable.tiktokForYouEnabled, true);
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
      assert.strictEqual(fallback.tiktokForYouEnabled, true);
    } finally {
      delete globalThis.chrome;
    }
  });
});
