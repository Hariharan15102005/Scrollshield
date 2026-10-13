import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectInstagramRoute,
  validateShortcode,
  validateUsername,
  isInstagramHost
} from '../src/content/instagram/route-detector.js';

test('Instagram Route Detector (Phase 3)', async (t) => {
  await t.test('detects a direct /reel/{shortcode}/ route', () => {
    const result = detectInstagramRoute('https://www.instagram.com/reel/C12345AbcDE/');
    assert.strictEqual(result.isReel, true);
    assert.strictEqual(result.category, 'reel_detail');
    assert.strictEqual(result.shortcode, 'C12345AbcDE');
  });

  await t.test('detects a Reel URL containing query parameters and fragments', () => {
    const result = detectInstagramRoute(
      'https://www.instagram.com/reel/C12345AbcDE/?utm_source=ig_web_button_share_sheet&igsh=testParam#t=10s'
    );
    assert.strictEqual(result.isReel, true);
    assert.strictEqual(result.category, 'reel_detail');
    assert.strictEqual(result.shortcode, 'C12345AbcDE');
  });

  await t.test('detects a Reel URL without a trailing slash', () => {
    const result = detectInstagramRoute('https://www.instagram.com/reel/C12345AbcDE');
    assert.strictEqual(result.isReel, true);
    assert.strictEqual(result.category, 'reel_detail');
    assert.strictEqual(result.shortcode, 'C12345AbcDE');
  });

  await t.test('detects /reels/{shortcode}/ plural route variation', () => {
    const result = detectInstagramRoute('https://www.instagram.com/reels/C12345AbcDE/');
    assert.strictEqual(result.isReel, true);
    assert.strictEqual(result.category, 'reel_detail');
    assert.strictEqual(result.shortcode, 'C12345AbcDE');
  });

  await t.test('detects root /reels/ feed route', () => {
    const resultWithSlash = detectInstagramRoute('https://www.instagram.com/reels/');
    assert.strictEqual(resultWithSlash.isReel, true);
    assert.strictEqual(resultWithSlash.category, 'reels_feed');
    assert.strictEqual(resultWithSlash.shortcode, null);

    const resultWithoutSlash = detectInstagramRoute('https://www.instagram.com/reels');
    assert.strictEqual(resultWithoutSlash.isReel, true);
    assert.strictEqual(resultWithoutSlash.category, 'reels_feed');
  });

  await t.test('ensures a normal post /p/{shortcode}/ is NEVER classified as a Reel', () => {
    const result = detectInstagramRoute('https://www.instagram.com/p/B98765XyzAB/');
    assert.strictEqual(result.isReel, false);
    assert.strictEqual(result.category, 'post');
    assert.strictEqual(result.shortcode, 'B98765XyzAB');
  });

  await t.test('classifies direct messages routes correctly without blocking', () => {
    const inbox = detectInstagramRoute('https://www.instagram.com/direct/inbox/');
    assert.strictEqual(inbox.isReel, false);
    assert.strictEqual(inbox.category, 'direct');

    const thread = detectInstagramRoute('https://www.instagram.com/direct/t/17841400000000000/');
    assert.strictEqual(thread.isReel, false);
    assert.strictEqual(thread.category, 'direct');
  });

  await t.test('classifies explore and search routes correctly without blocking', () => {
    const explore = detectInstagramRoute('https://www.instagram.com/explore/');
    assert.strictEqual(explore.isReel, false);
    assert.strictEqual(explore.category, 'explore');

    const search = detectInstagramRoute('https://www.instagram.com/explore/search/');
    assert.strictEqual(search.isReel, false);
    assert.strictEqual(search.category, 'explore');
  });

  await t.test('classifies user profile routes correctly without blocking', () => {
    const profile = detectInstagramRoute('https://www.instagram.com/natgeo/');
    assert.strictEqual(profile.isReel, false);
    assert.strictEqual(profile.category, 'profile');
    assert.strictEqual(profile.username, 'natgeo');

    const profileDots = detectInstagramRoute('https://www.instagram.com/john.doe_official/');
    assert.strictEqual(profileDots.isReel, false);
    assert.strictEqual(profileDots.category, 'profile');
    assert.strictEqual(profileDots.username, 'john.doe_official');
  });

  await t.test('classifies stories routes correctly without blocking', () => {
    const story = detectInstagramRoute('https://www.instagram.com/stories/natgeo/123456789/');
    assert.strictEqual(story.isReel, false);
    assert.strictEqual(story.category, 'stories');
    assert.strictEqual(story.username, 'natgeo');
  });

  await t.test('handles unknown routes safely', () => {
    const result = detectInstagramRoute('https://www.instagram.com/accounts/login/');
    assert.strictEqual(result.isReel, false);
    assert.strictEqual(result.category, 'other');
  });

  await t.test('handles malformed URLs safely without throwing exceptions', () => {
    assert.doesNotThrow(() => {
      const r1 = detectInstagramRoute('not-a-valid-url:::');
      assert.strictEqual(r1.isReel, false);

      const r2 = detectInstagramRoute('');
      assert.strictEqual(r2.isReel, false);

      const r3 = detectInstagramRoute(null);
      assert.strictEqual(r3.isReel, false);

      const r4 = detectInstagramRoute(undefined);
      assert.strictEqual(r4.isReel, false);

      const r5 = detectInstagramRoute(12345);
      assert.strictEqual(r5.isReel, false);
    });
  });

  await t.test('does not classify non-Instagram hosts as Reels', () => {
    const nonIg = detectInstagramRoute('https://www.notinstagram.com/reel/C12345AbcDE/');
    assert.strictEqual(nonIg.isReel, false);
    assert.strictEqual(nonIg.category, 'other');
  });

  await t.test('validates shortcodes and usernames rigorously', () => {
    assert.strictEqual(validateShortcode('C12345AbcDE'), 'C12345AbcDE');
    assert.strictEqual(validateShortcode('abc'), null); // too short
    assert.strictEqual(validateShortcode('has spaces'), null);

    assert.strictEqual(validateUsername('natgeo'), 'natgeo');
    assert.strictEqual(validateUsername('reels'), null); // reserved word
    assert.strictEqual(validateUsername('direct'), null); // reserved word
    assert.strictEqual(validateUsername(''), null);
  });

  await t.test('validates Instagram hostnames accurately', () => {
    assert.strictEqual(isInstagramHost('instagram.com'), true);
    assert.strictEqual(isInstagramHost('www.instagram.com'), true);
    assert.strictEqual(isInstagramHost('m.instagram.com'), true);
    assert.strictEqual(isInstagramHost('fakeinstagram.com'), false);
    assert.strictEqual(isInstagramHost('instagram.com.attacker.com'), false);
  });
});
