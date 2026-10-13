import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectXRoute,
  isXHost,
  validateUsername,
  validateStatusId
} from '../src/content/x/route-detector.js';

test('X Route Detector (Phase 6A)', async (t) => {
  await t.test('detects dedicated /home route on x.com and twitter.com', () => {
    const resX = detectXRoute('https://x.com/home');
    assert.strictEqual(resX.category, 'home');
    assert.strictEqual(resX.isHomeTimeline, true);
    assert.strictEqual(resX.pathname, '/home');

    const resTwitter = detectXRoute('https://twitter.com/home');
    assert.strictEqual(resTwitter.category, 'home');
    assert.strictEqual(resTwitter.isHomeTimeline, true);
    assert.strictEqual(resTwitter.pathname, '/home');
  });

  await t.test('detects dedicated /home/ route with trailing slash, parameters, and fragments', () => {
    const res = detectXRoute('https://x.com/home/?lang=en&ref=tab#top');
    assert.strictEqual(res.category, 'home');
    assert.strictEqual(res.isHomeTimeline, true);
    assert.strictEqual(res.pathname, '/home/');
  });

  await t.test('root route / with insufficient evidence is NOT classified as Home timeline', () => {
    const res = detectXRoute('https://x.com/');
    assert.strictEqual(res.category, 'root');
    assert.strictEqual(res.isHomeTimeline, false);
  });

  await t.test('root route / with explicit Home pageContext IS classified as Home timeline', () => {
    const res1 = detectXRoute('https://x.com/', { isHomeActive: true });
    assert.strictEqual(res1.category, 'home');
    assert.strictEqual(res1.isHomeTimeline, true);

    const res2 = detectXRoute('https://twitter.com/', { hasHomeContext: true });
    assert.strictEqual(res2.category, 'home');
    assert.strictEqual(res2.isHomeTimeline, true);
  });

  await t.test('root route / with explicit feed/tab query parameter IS classified as Home timeline', () => {
    const resFeed = detectXRoute('https://x.com/?feed=home');
    assert.strictEqual(resFeed.category, 'home');
    assert.strictEqual(resFeed.isHomeTimeline, true);

    const resTab = detectXRoute('https://x.com/?tab=home');
    assert.strictEqual(resTab.category, 'home');
    assert.strictEqual(resTab.isHomeTimeline, true);
  });

  await t.test('classifies explore and search correctly without blocking', () => {
    const resExplore = detectXRoute('https://x.com/explore');
    assert.strictEqual(resExplore.category, 'explore');
    assert.strictEqual(resExplore.isHomeTimeline, false);

    const resSearch = detectXRoute('https://x.com/search?q=technology&src=typed_query');
    assert.strictEqual(resSearch.category, 'explore');
    assert.strictEqual(resSearch.isHomeTimeline, false);
  });

  await t.test('ensures query parameters containing "home" do NOT trigger blocking on other routes', () => {
    const resSearch = detectXRoute('https://x.com/search?q=work_from_home');
    assert.strictEqual(resSearch.category, 'explore');
    assert.strictEqual(resSearch.isHomeTimeline, false);

    const resProfile = detectXRoute('https://x.com/nasa?ref=home');
    assert.strictEqual(resProfile.category, 'profile');
    assert.strictEqual(resProfile.isHomeTimeline, false);
  });

  await t.test('classifies notifications correctly without blocking', () => {
    const res = detectXRoute('https://x.com/notifications');
    assert.strictEqual(res.category, 'notifications');
    assert.strictEqual(res.isHomeTimeline, false);
  });

  await t.test('classifies direct messaging routes correctly without blocking', () => {
    const resDMs = detectXRoute('https://x.com/messages');
    assert.strictEqual(resDMs.category, 'messages');
    assert.strictEqual(resDMs.isHomeTimeline, false);

    const resChat = detectXRoute('https://x.com/i/chat');
    assert.strictEqual(resChat.category, 'messages');
    assert.strictEqual(resChat.isHomeTimeline, false);
  });

  await t.test('classifies user profiles correctly without blocking', () => {
    const resProfile = detectXRoute('https://x.com/openai');
    assert.strictEqual(resProfile.category, 'profile');
    assert.strictEqual(resProfile.username, 'openai');
    assert.strictEqual(resProfile.isHomeTimeline, false);

    const resMedia = detectXRoute('https://x.com/openai/media');
    assert.strictEqual(resMedia.category, 'profile');
    assert.strictEqual(resMedia.username, 'openai');
    assert.strictEqual(resMedia.isHomeTimeline, false);
  });

  await t.test('classifies individual post/tweet status routes correctly without blocking', () => {
    const resPost = detectXRoute('https://x.com/openai/status/1760000000000000000');
    assert.strictEqual(resPost.category, 'post');
    assert.strictEqual(resPost.username, 'openai');
    assert.strictEqual(resPost.statusId, '1760000000000000000');
    assert.strictEqual(resPost.isHomeTimeline, false);

    const resIStatus = detectXRoute('https://x.com/i/status/1760000000000000000');
    assert.strictEqual(resIStatus.category, 'post');
    assert.strictEqual(resIStatus.statusId, '1760000000000000000');
    assert.strictEqual(resIStatus.isHomeTimeline, false);
  });

  await t.test('classifies lists and communities correctly without blocking', () => {
    const resLists = detectXRoute('https://x.com/i/lists');
    assert.strictEqual(resLists.category, 'lists');
    assert.strictEqual(resLists.isHomeTimeline, false);

    const resCommunities = detectXRoute('https://x.com/i/communities');
    assert.strictEqual(resCommunities.category, 'lists');
    assert.strictEqual(resCommunities.isHomeTimeline, false);
  });

  await t.test('handles unknown routes safely', () => {
    const res = detectXRoute('https://x.com/settings/account');
    assert.strictEqual(res.category, 'other');
    assert.strictEqual(res.isHomeTimeline, false);
  });

  await t.test('handles malformed URLs safely without throwing exceptions', () => {
    assert.doesNotThrow(() => {
      const r1 = detectXRoute('not-a-valid-url:::');
      assert.strictEqual(r1.isHomeTimeline, false);

      const r2 = detectXRoute('');
      assert.strictEqual(r2.isHomeTimeline, false);

      const r3 = detectXRoute(null);
      assert.strictEqual(r3.isHomeTimeline, false);

      const r4 = detectXRoute(undefined);
      assert.strictEqual(r4.isHomeTimeline, false);
    });
  });

  await t.test('does not classify non-X hostnames as Home timeline', () => {
    const res = detectXRoute('https://www.instagram.com/home');
    assert.strictEqual(res.category, 'other');
    assert.strictEqual(res.isHomeTimeline, false);
  });

  await t.test('validates X hostnames and identifiers accurately', () => {
    assert.strictEqual(isXHost('x.com'), true);
    assert.strictEqual(isXHost('www.x.com'), true);
    assert.strictEqual(isXHost('mobile.x.com'), true);
    assert.strictEqual(isXHost('twitter.com'), true);
    assert.strictEqual(isXHost('mobile.twitter.com'), true);
    assert.strictEqual(isXHost('notx.com'), false);

    assert.strictEqual(validateUsername('elonmusk'), 'elonmusk');
    assert.strictEqual(validateUsername('@elonmusk'), 'elonmusk');
    assert.strictEqual(validateUsername('home'), null); // reserved
    assert.strictEqual(validateUsername('notifications'), null); // reserved
    assert.strictEqual(validateStatusId('1234567890'), '1234567890');
    assert.strictEqual(validateStatusId('invalid_id'), null);
  });
});
