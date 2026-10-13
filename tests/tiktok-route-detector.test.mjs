import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectTikTokRoute,
  isTikTokHost,
  validateUsername,
  validateVideoId
} from '../src/content/tiktok/route-detector.js';

test('TikTok Route Detector (Phase 5)', async (t) => {
  await t.test('detects dedicated /foryou route', () => {
    const res = detectTikTokRoute('https://www.tiktok.com/foryou');
    assert.strictEqual(res.category, 'foryou');
    assert.strictEqual(res.isForYouFeed, true);
    assert.strictEqual(res.pathname, '/foryou');
  });

  await t.test('detects dedicated /foryou/ route with trailing slash, parameters, and fragments', () => {
    const res = detectTikTokRoute('https://www.tiktok.com/foryou/?lang=en&ref=home#top');
    assert.strictEqual(res.category, 'foryou');
    assert.strictEqual(res.isForYouFeed, true);
    assert.strictEqual(res.pathname, '/foryou/');
  });

  await t.test('root route / with insufficient evidence is NOT classified as For You feed', () => {
    const res = detectTikTokRoute('https://www.tiktok.com/');
    assert.strictEqual(res.category, 'root');
    assert.strictEqual(res.isForYouFeed, false);
  });

  await t.test('root route / with explicit For You pageContext IS classified as For You feed', () => {
    const res1 = detectTikTokRoute('https://www.tiktok.com/', { isForYouActive: true });
    assert.strictEqual(res1.category, 'foryou');
    assert.strictEqual(res1.isForYouFeed, true);

    const res2 = detectTikTokRoute('https://www.tiktok.com/', { hasForYouContext: true });
    assert.strictEqual(res2.category, 'foryou');
    assert.strictEqual(res2.isForYouFeed, true);
  });

  await t.test('root route / with explicit feed/tab query parameter IS classified as For You feed', () => {
    const resFeed = detectTikTokRoute('https://www.tiktok.com/?feed=foryou');
    assert.strictEqual(resFeed.category, 'foryou');
    assert.strictEqual(resFeed.isForYouFeed, true);

    const resTab = detectTikTokRoute('https://www.tiktok.com/?tab=foryou');
    assert.strictEqual(resTab.category, 'foryou');
    assert.strictEqual(resTab.isForYouFeed, true);
  });

  await t.test('classifies Following feed correctly without blocking', () => {
    const res = detectTikTokRoute('https://www.tiktok.com/following');
    assert.strictEqual(res.category, 'following');
    assert.strictEqual(res.isForYouFeed, false);
  });

  await t.test('ensures search routes are NEVER classified as For You feed', () => {
    const res = detectTikTokRoute('https://www.tiktok.com/search?q=educational+science');
    assert.strictEqual(res.category, 'search');
    assert.strictEqual(res.isForYouFeed, false);
  });

  await t.test('ensures query parameters containing "foryou" do NOT trigger blocking on other routes', () => {
    const resSearch = detectTikTokRoute('https://www.tiktok.com/search?q=foryou_dance');
    assert.strictEqual(resSearch.category, 'search');
    assert.strictEqual(resSearch.isForYouFeed, false);

    const resProfile = detectTikTokRoute('https://www.tiktok.com/@creator?ref=foryou');
    assert.strictEqual(resProfile.category, 'profile');
    assert.strictEqual(resProfile.isForYouFeed, false);
  });

  await t.test('classifies user profiles correctly without blocking', () => {
    const res = detectTikTokRoute('https://www.tiktok.com/@charlidamelio');
    assert.strictEqual(res.category, 'profile');
    assert.strictEqual(res.username, 'charlidamelio');
    assert.strictEqual(res.isForYouFeed, false);
  });

  await t.test('classifies individual video routes correctly without blocking', () => {
    const resProfileVideo = detectTikTokRoute(
      'https://www.tiktok.com/@creator/video/7123456789012345678'
    );
    assert.strictEqual(resProfileVideo.category, 'video');
    assert.strictEqual(resProfileVideo.username, 'creator');
    assert.strictEqual(resProfileVideo.videoId, '7123456789012345678');
    assert.strictEqual(resProfileVideo.isForYouFeed, false);

    const resDirectVideo = detectTikTokRoute(
      'https://www.tiktok.com/video/7123456789012345678'
    );
    assert.strictEqual(resDirectVideo.category, 'video');
    assert.strictEqual(resDirectVideo.videoId, '7123456789012345678');
    assert.strictEqual(resDirectVideo.isForYouFeed, false);
  });

  await t.test('classifies direct messaging routes correctly without blocking', () => {
    const resMessages = detectTikTokRoute('https://www.tiktok.com/messages');
    assert.strictEqual(resMessages.category, 'messages');
    assert.strictEqual(resMessages.isForYouFeed, false);

    const resInbox = detectTikTokRoute('https://www.tiktok.com/inbox');
    assert.strictEqual(resInbox.category, 'messages');
    assert.strictEqual(resInbox.isForYouFeed, false);
  });

  await t.test('classifies LIVE pages correctly without blocking', () => {
    const resLive = detectTikTokRoute('https://www.tiktok.com/live');
    assert.strictEqual(resLive.category, 'live');
    assert.strictEqual(resLive.isForYouFeed, false);

    const resCreatorLive = detectTikTokRoute('https://www.tiktok.com/@creator/live');
    assert.strictEqual(resCreatorLive.category, 'live');
    assert.strictEqual(resCreatorLive.isForYouFeed, false);
  });

  await t.test('handles unknown routes safely', () => {
    const res = detectTikTokRoute('https://www.tiktok.com/about/company');
    assert.strictEqual(res.category, 'other');
    assert.strictEqual(res.isForYouFeed, false);
  });

  await t.test('handles malformed URLs safely without throwing exceptions', () => {
    assert.doesNotThrow(() => {
      const resNull = detectTikTokRoute(null);
      assert.strictEqual(resNull.isForYouFeed, false);

      const resEmpty = detectTikTokRoute('');
      assert.strictEqual(resEmpty.isForYouFeed, false);

      const resGarbage = detectTikTokRoute('not_a_valid_url:///random');
      assert.strictEqual(resGarbage.isForYouFeed, false);
    });
  });

  await t.test('does not classify non-TikTok hostnames as For You feed', () => {
    const res = detectTikTokRoute('https://www.youtube.com/foryou');
    assert.strictEqual(res.isForYouFeed, false);
    assert.strictEqual(res.category, 'other');
  });

  await t.test('validates TikTok hostnames and identifiers accurately', () => {
    assert.strictEqual(isTikTokHost('tiktok.com'), true);
    assert.strictEqual(isTikTokHost('www.tiktok.com'), true);
    assert.strictEqual(isTikTokHost('m.tiktok.com'), true);
    assert.strictEqual(isTikTokHost('v.tiktok.com'), true);
    assert.strictEqual(isTikTokHost('malicious-tiktok.com'), false);
    assert.strictEqual(isTikTokHost('example.com'), false);

    assert.strictEqual(validateUsername('valid_user.123'), 'valid_user.123');
    assert.strictEqual(validateUsername('@valid_user'), 'valid_user');
    assert.strictEqual(validateUsername(''), null);

    assert.strictEqual(validateVideoId('7123456789012345678'), '7123456789012345678');
    assert.strictEqual(validateVideoId(''), null);
  });
});
