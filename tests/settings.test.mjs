import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  validateSettings,
  getSettings,
  setSetting,
  STORAGE_KEYS
} from '../src/common/settings.js';

test('ScrollShield Settings Layer (Phase 6)', async (t) => {
  await t.test('has safe default policy with all six platforms enabled', () => {
    assert.strictEqual(DEFAULT_SETTINGS.youtubeShortsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.instagramReelsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.facebookReelsEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.tiktokForYouEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.xHomeFeedEnabled, true);
    assert.strictEqual(DEFAULT_SETTINGS.redditFeedsEnabled, true);
    assert.strictEqual(STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED, 'youtubeShortsEnabled');
    assert.strictEqual(STORAGE_KEYS.INSTAGRAM_REELS_ENABLED, 'instagramReelsEnabled');
    assert.strictEqual(STORAGE_KEYS.FACEBOOK_REELS_ENABLED, 'facebookReelsEnabled');
    assert.strictEqual(STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED, 'tiktokForYouEnabled');
    assert.strictEqual(STORAGE_KEYS.X_HOME_FEED_ENABLED, 'xHomeFeedEnabled');
    assert.strictEqual(STORAGE_KEYS.REDDIT_FEEDS_ENABLED, 'redditFeedsEnabled');
  });

  await t.test('validates fully enabled settings across all six platforms', () => {
    const validated = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: true,
      xHomeFeedEnabled: true,
      redditFeedsEnabled: true
    });
    assert.strictEqual(validated.youtubeShortsEnabled, true);
    assert.strictEqual(validated.instagramReelsEnabled, true);
    assert.strictEqual(validated.facebookReelsEnabled, true);
    assert.strictEqual(validated.tiktokForYouEnabled, true);
    assert.strictEqual(validated.xHomeFeedEnabled, true);
    assert.strictEqual(validated.redditFeedsEnabled, true);
  });

  await t.test('validates disabled states independently for each platform', () => {
    const xDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: true,
      xHomeFeedEnabled: false,
      redditFeedsEnabled: true
    });
    assert.strictEqual(xDisabled.xHomeFeedEnabled, false);
    assert.strictEqual(xDisabled.redditFeedsEnabled, true);
    assert.strictEqual(xDisabled.youtubeShortsEnabled, true);

    const redditDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: true,
      xHomeFeedEnabled: true,
      redditFeedsEnabled: false
    });
    assert.strictEqual(redditDisabled.redditFeedsEnabled, false);
    assert.strictEqual(redditDisabled.xHomeFeedEnabled, true);
    assert.strictEqual(redditDisabled.tiktokForYouEnabled, true);

    const ttDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: false,
      xHomeFeedEnabled: true,
      redditFeedsEnabled: true
    });
    assert.strictEqual(ttDisabled.tiktokForYouEnabled, false);

    const fbDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: true,
      facebookReelsEnabled: false,
      tiktokForYouEnabled: true,
      xHomeFeedEnabled: true,
      redditFeedsEnabled: true
    });
    assert.strictEqual(fbDisabled.facebookReelsEnabled, false);

    const igDisabled = validateSettings({
      youtubeShortsEnabled: true,
      instagramReelsEnabled: false,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: true,
      xHomeFeedEnabled: true,
      redditFeedsEnabled: true
    });
    assert.strictEqual(igDisabled.instagramReelsEnabled, false);

    const ytDisabled = validateSettings({
      youtubeShortsEnabled: false,
      instagramReelsEnabled: true,
      facebookReelsEnabled: true,
      tiktokForYouEnabled: true,
      xHomeFeedEnabled: true,
      redditFeedsEnabled: true
    });
    assert.strictEqual(ytDisabled.youtubeShortsEnabled, false);
  });

  await t.test('replaces missing settings with safe defaults', () => {
    const v1 = validateSettings({});
    assert.strictEqual(v1.youtubeShortsEnabled, true);
    assert.strictEqual(v1.instagramReelsEnabled, true);
    assert.strictEqual(v1.facebookReelsEnabled, true);
    assert.strictEqual(v1.tiktokForYouEnabled, true);
    assert.strictEqual(v1.xHomeFeedEnabled, true);
    assert.strictEqual(v1.redditFeedsEnabled, true);

    const v2 = validateSettings(undefined);
    assert.strictEqual(v2.youtubeShortsEnabled, true);
    assert.strictEqual(v2.xHomeFeedEnabled, true);
    assert.strictEqual(v2.redditFeedsEnabled, true);

    const v3 = validateSettings(null);
    assert.strictEqual(v3.youtubeShortsEnabled, true);
    assert.strictEqual(v3.xHomeFeedEnabled, true);
    assert.strictEqual(v3.redditFeedsEnabled, true);
  });

  await t.test('replaces malformed types with safe defaults', () => {
    const stringVal = validateSettings({
      youtubeShortsEnabled: 'true',
      instagramReelsEnabled: 'false',
      facebookReelsEnabled: 'invalid',
      tiktokForYouEnabled: 123,
      xHomeFeedEnabled: 'no',
      redditFeedsEnabled: 'yes'
    });
    assert.strictEqual(stringVal.youtubeShortsEnabled, true);
    assert.strictEqual(stringVal.instagramReelsEnabled, true);
    assert.strictEqual(stringVal.facebookReelsEnabled, true);
    assert.strictEqual(stringVal.tiktokForYouEnabled, true);
    assert.strictEqual(stringVal.xHomeFeedEnabled, true);
    assert.strictEqual(stringVal.redditFeedsEnabled, true);

    const numVal = validateSettings({
      youtubeShortsEnabled: 0,
      instagramReelsEnabled: 1,
      facebookReelsEnabled: 2,
      tiktokForYouEnabled: 3,
      xHomeFeedEnabled: 4,
      redditFeedsEnabled: 5
    });
    assert.strictEqual(numVal.youtubeShortsEnabled, true);
    assert.strictEqual(numVal.instagramReelsEnabled, true);
    assert.strictEqual(numVal.facebookReelsEnabled, true);
    assert.strictEqual(numVal.tiktokForYouEnabled, true);
    assert.strictEqual(numVal.xHomeFeedEnabled, true);
    assert.strictEqual(numVal.redditFeedsEnabled, true);

    const nullVal = validateSettings({
      youtubeShortsEnabled: null,
      instagramReelsEnabled: null,
      facebookReelsEnabled: null,
      tiktokForYouEnabled: null,
      xHomeFeedEnabled: null,
      redditFeedsEnabled: null
    });
    assert.strictEqual(nullVal.youtubeShortsEnabled, true);
    assert.strictEqual(nullVal.instagramReelsEnabled, true);
    assert.strictEqual(nullVal.facebookReelsEnabled, true);
    assert.strictEqual(nullVal.tiktokForYouEnabled, true);
    assert.strictEqual(nullVal.xHomeFeedEnabled, true);
    assert.strictEqual(nullVal.redditFeedsEnabled, true);
  });

  await t.test('reads and saves settings independently across all six platforms without overwriting', async () => {
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
      assert.strictEqual(initial.xHomeFeedEnabled, true);
      assert.strictEqual(initial.redditFeedsEnabled, true);

      // Disable X Home Feed only
      await setSetting(STORAGE_KEYS.X_HOME_FEED_ENABLED, false);
      const afterXDisable = await getSettings();
      assert.strictEqual(afterXDisable.xHomeFeedEnabled, false);
      assert.strictEqual(afterXDisable.redditFeedsEnabled, true, 'Reddit setting should remain intact');
      assert.strictEqual(afterXDisable.youtubeShortsEnabled, true, 'YouTube setting should remain intact');
      assert.strictEqual(afterXDisable.instagramReelsEnabled, true, 'Instagram setting should remain intact');
      assert.strictEqual(afterXDisable.facebookReelsEnabled, true, 'Facebook setting should remain intact');
      assert.strictEqual(afterXDisable.tiktokForYouEnabled, true, 'TikTok setting should remain intact');

      // Disable Reddit Feeds only
      await setSetting(STORAGE_KEYS.REDDIT_FEEDS_ENABLED, false);
      const afterRedditDisable = await getSettings();
      assert.strictEqual(afterRedditDisable.xHomeFeedEnabled, false, 'X setting should remain false');
      assert.strictEqual(afterRedditDisable.redditFeedsEnabled, false);
      assert.strictEqual(afterRedditDisable.tiktokForYouEnabled, true);

      // Re-enable X Home Feed
      await setSetting(STORAGE_KEYS.X_HOME_FEED_ENABLED, true);
      const afterXReenable = await getSettings();
      assert.strictEqual(afterXReenable.xHomeFeedEnabled, true);
      assert.strictEqual(afterXReenable.redditFeedsEnabled, false, 'Reddit setting should remain false');
      assert.strictEqual(afterXReenable.tiktokForYouEnabled, true);

      // Re-enable Reddit Feeds
      await setSetting(STORAGE_KEYS.REDDIT_FEEDS_ENABLED, true);
      const afterRedditReenable = await getSettings();
      assert.strictEqual(afterRedditReenable.xHomeFeedEnabled, true);
      assert.strictEqual(afterRedditReenable.redditFeedsEnabled, true);
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
      assert.strictEqual(fallback.xHomeFeedEnabled, true);
      assert.strictEqual(fallback.redditFeedsEnabled, true);
    } finally {
      delete globalThis.chrome;
    }
  });
});
