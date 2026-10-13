import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectFacebookRoute,
  validateReelId,
  isFacebookHost
} from '../src/content/facebook/route-detector.js';

test('Facebook Route Detector (Phase 4)', async (t) => {
  await t.test('detects dedicated /reel/{id}/ route', () => {
    const result = detectFacebookRoute('https://www.facebook.com/reel/104859602938475/');
    assert.strictEqual(result.isReel, true);
    assert.strictEqual(result.category, 'reel_detail');
    assert.strictEqual(result.reelId, '104859602938475');
  });

  await t.test('detects Reel URL containing query parameters and fragments', () => {
    const result = detectFacebookRoute(
      'https://www.facebook.com/reel/104859602938475/?s=single_unit&__cft__[0]=AZX#t=5s'
    );
    assert.strictEqual(result.isReel, true);
    assert.strictEqual(result.category, 'reel_detail');
    assert.strictEqual(result.reelId, '104859602938475');
  });

  await t.test('detects Reel URL without a trailing slash', () => {
    const result = detectFacebookRoute('https://www.facebook.com/reel/104859602938475');
    assert.strictEqual(result.isReel, true);
    assert.strictEqual(result.category, 'reel_detail');
    assert.strictEqual(result.reelId, '104859602938475');
  });

  await t.test('detects plural /reels/{id}/ variation', () => {
    const result = detectFacebookRoute('https://www.facebook.com/reels/104859602938475/');
    assert.strictEqual(result.isReel, true);
    assert.strictEqual(result.category, 'reel_detail');
    assert.strictEqual(result.reelId, '104859602938475');
  });

  await t.test('detects root /reels/ and /reel/ feed routes', () => {
    const feedPlural = detectFacebookRoute('https://www.facebook.com/reels/');
    assert.strictEqual(feedPlural.isReel, true);
    assert.strictEqual(feedPlural.category, 'reels_feed');
    assert.strictEqual(feedPlural.reelId, null);

    const feedSingular = detectFacebookRoute('https://www.facebook.com/reel');
    assert.strictEqual(feedSingular.isReel, true);
    assert.strictEqual(feedSingular.category, 'reels_feed');
  });

  await t.test('ensures ordinary /watch/ pages are NEVER classified as Reels', () => {
    const watchRoot = detectFacebookRoute('https://www.facebook.com/watch/');
    assert.strictEqual(watchRoot.isReel, false);
    assert.strictEqual(watchRoot.category, 'watch');

    const watchVideo = detectFacebookRoute('https://www.facebook.com/watch/?v=9876543210');
    assert.strictEqual(watchVideo.isReel, false);
    assert.strictEqual(watchVideo.category, 'watch');
  });

  await t.test('ensures query parameters containing "reel" do NOT trigger blocking', () => {
    const watchWithReelRef = detectFacebookRoute('https://www.facebook.com/watch/?ref=reels_tab');
    assert.strictEqual(watchWithReelRef.isReel, false);
    assert.strictEqual(watchWithReelRef.category, 'watch');

    const searchWithReelsQuery = detectFacebookRoute('https://www.facebook.com/search/top/?q=reels');
    assert.strictEqual(searchWithReelsQuery.isReel, false);
    assert.strictEqual(searchWithReelsQuery.category, 'search');
  });

  await t.test('classifies Messenger routes as messenger without blocking', () => {
    const messages = detectFacebookRoute('https://www.facebook.com/messages/t/1000123456789/');
    assert.strictEqual(messages.isReel, false);
    assert.strictEqual(messages.category, 'messenger');

    const messenger = detectFacebookRoute('https://www.facebook.com/messenger/');
    assert.strictEqual(messenger.isReel, false);
    assert.strictEqual(messenger.category, 'messenger');
  });

  await t.test('classifies groups and pages correctly without blocking', () => {
    const group = detectFacebookRoute('https://www.facebook.com/groups/reactdevelopers/');
    assert.strictEqual(group.isReel, false);
    assert.strictEqual(group.category, 'group');

    const page = detectFacebookRoute('https://www.facebook.com/pages/category/community/');
    assert.strictEqual(page.isReel, false);
    assert.strictEqual(page.category, 'page');
  });

  await t.test('classifies user profiles and feed routes correctly without blocking', () => {
    const home = detectFacebookRoute('https://www.facebook.com/');
    assert.strictEqual(home.isReel, false);
    assert.strictEqual(home.category, 'feed');

    const feedSort = detectFacebookRoute('https://www.facebook.com/?sk=h_chr');
    assert.strictEqual(feedSort.isReel, false);
    assert.strictEqual(feedSort.category, 'feed');

    const usernameProfile = detectFacebookRoute('https://www.facebook.com/zuck');
    assert.strictEqual(usernameProfile.isReel, false);
    assert.strictEqual(usernameProfile.category, 'profile');

    const phpProfile = detectFacebookRoute('https://www.facebook.com/profile.php?id=1000123');
    assert.strictEqual(phpProfile.isReel, false);
    assert.strictEqual(phpProfile.category, 'profile');
  });

  await t.test('handles malformed URLs safely without throwing exceptions', () => {
    assert.doesNotThrow(() => {
      const r1 = detectFacebookRoute('invalid-url-string:::');
      assert.strictEqual(r1.isReel, false);

      const r2 = detectFacebookRoute('');
      assert.strictEqual(r2.isReel, false);

      const r3 = detectFacebookRoute(null);
      assert.strictEqual(r3.isReel, false);

      const r4 = detectFacebookRoute(undefined);
      assert.strictEqual(r4.isReel, false);
    });
  });

  await t.test('does not classify non-Facebook hostnames as Reels', () => {
    const external = detectFacebookRoute('https://www.notfacebook.com/reel/123456789/');
    assert.strictEqual(external.isReel, false);
    assert.strictEqual(external.category, 'other');
  });

  await t.test('validates Reel IDs rigorously', () => {
    assert.strictEqual(validateReelId('104859602938475'), '104859602938475');
    assert.strictEqual(validateReelId('abc12'), 'abc12');
    assert.strictEqual(validateReelId('123'), null); // too short (<5)
    assert.strictEqual(validateReelId('invalid spaces'), null);
    assert.strictEqual(validateReelId(''), null);
    assert.strictEqual(validateReelId(null), null);
  });

  await t.test('validates Facebook hostnames accurately', () => {
    assert.strictEqual(isFacebookHost('facebook.com'), true);
    assert.strictEqual(isFacebookHost('www.facebook.com'), true);
    assert.strictEqual(isFacebookHost('m.facebook.com'), true);
    assert.strictEqual(isFacebookHost('web.facebook.com'), true);
    assert.strictEqual(isFacebookHost('fakefacebook.com'), false);
    assert.strictEqual(isFacebookHost('facebook.com.attacker.com'), false);
  });
});
