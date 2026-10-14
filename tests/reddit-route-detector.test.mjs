import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectRedditRoute,
  isRedditHost,
  validateSubreddit,
  validatePostId
} from '../src/content/reddit/route-detector.js';

test('Reddit Route Detector (Phase 6B)', async (t) => {
  await t.test('detects root / Home feed route on reddit.com and www.reddit.com', () => {
    const resRoot = detectRedditRoute('https://www.reddit.com/');
    assert.strictEqual(resRoot.category, 'home');
    assert.strictEqual(resRoot.isBlockedFeed, true);
    assert.strictEqual(resRoot.pathname, '/');

    const resApex = detectRedditRoute('https://reddit.com/');
    assert.strictEqual(resApex.category, 'home');
    assert.strictEqual(resApex.isBlockedFeed, true);
  });

  await t.test('detects root feed sorting routes as Home feed', () => {
    const resBest = detectRedditRoute('https://www.reddit.com/best');
    assert.strictEqual(resBest.category, 'home');
    assert.strictEqual(resBest.isBlockedFeed, true);

    const resTop = detectRedditRoute('https://www.reddit.com/top');
    assert.strictEqual(resTop.category, 'home');
    assert.strictEqual(resTop.isBlockedFeed, true);

    const resHot = detectRedditRoute('https://www.reddit.com/hot/');
    assert.strictEqual(resHot.category, 'home');
    assert.strictEqual(resHot.isBlockedFeed, true);
  });

  await t.test('detects /popular and /popular/ routes as Popular feed', () => {
    const res1 = detectRedditRoute('https://www.reddit.com/popular');
    assert.strictEqual(res1.category, 'popular');
    assert.strictEqual(res1.isBlockedFeed, true);

    const res2 = detectRedditRoute('https://www.reddit.com/popular/');
    assert.strictEqual(res2.category, 'popular');
    assert.strictEqual(res2.isBlockedFeed, true);

    const resParams = detectRedditRoute('https://www.reddit.com/popular/?geo_filter=GLOBAL#content');
    assert.strictEqual(resParams.category, 'popular');
    assert.strictEqual(resParams.isBlockedFeed, true);
    assert.strictEqual(resParams.pathname, '/popular/');
  });

  await t.test('detects /r/popular and /r/popular/ routes as Popular feed', () => {
    const res1 = detectRedditRoute('https://www.reddit.com/r/popular');
    assert.strictEqual(res1.category, 'popular');
    assert.strictEqual(res1.isBlockedFeed, true);

    const res2 = detectRedditRoute('https://www.reddit.com/r/popular/');
    assert.strictEqual(res2.category, 'popular');
    assert.strictEqual(res2.isBlockedFeed, true);
  });

  await t.test('detects /r/all and /r/all/ routes as All feed', () => {
    const res1 = detectRedditRoute('https://www.reddit.com/r/all');
    assert.strictEqual(res1.category, 'all');
    assert.strictEqual(res1.isBlockedFeed, true);

    const res2 = detectRedditRoute('https://www.reddit.com/r/all/');
    assert.strictEqual(res2.category, 'all');
    assert.strictEqual(res2.isBlockedFeed, true);
  });

  await t.test('NEVER classifies specific community subreddits as blocked feeds', () => {
    const resProg = detectRedditRoute('https://www.reddit.com/r/programming/');
    assert.strictEqual(resProg.category, 'subreddit');
    assert.strictEqual(resProg.isBlockedFeed, false);
    assert.strictEqual(resProg.subreddit, 'programming');

    const resAsk = detectRedditRoute('https://www.reddit.com/r/AskReddit');
    assert.strictEqual(resAsk.category, 'subreddit');
    assert.strictEqual(resAsk.isBlockedFeed, false);
    assert.strictEqual(resAsk.subreddit, 'AskReddit');

    const resTop = detectRedditRoute('https://www.reddit.com/r/programming/top/?t=month');
    assert.strictEqual(resTop.category, 'subreddit');
    assert.strictEqual(resTop.isBlockedFeed, false);
    assert.strictEqual(resTop.subreddit, 'programming');
  });

  await t.test('classifies individual post and comments routes correctly without blocking', () => {
    const resComments = detectRedditRoute(
      'https://www.reddit.com/r/programming/comments/18j0xyz/modern_web_development_in_2026/'
    );
    assert.strictEqual(resComments.category, 'post');
    assert.strictEqual(resComments.isBlockedFeed, false);
    assert.strictEqual(resComments.subreddit, 'programming');
    assert.strictEqual(resComments.postId, '18j0xyz');

    const resDirectPost = detectRedditRoute('https://www.reddit.com/comments/18j0xyz');
    assert.strictEqual(resDirectPost.category, 'post');
    assert.strictEqual(resDirectPost.isBlockedFeed, false);
    assert.strictEqual(resDirectPost.postId, '18j0xyz');
  });

  await t.test('classifies search routes correctly without blocking', () => {
    const resSearch = detectRedditRoute('https://www.reddit.com/search/?q=mechanical+keyboards');
    assert.strictEqual(resSearch.category, 'search');
    assert.strictEqual(resSearch.isBlockedFeed, false);

    const resSubSearch = detectRedditRoute('https://www.reddit.com/r/mechanicalkeyboards/search/?q=switches');
    assert.strictEqual(resSubSearch.category, 'search');
    assert.strictEqual(resSubSearch.isBlockedFeed, false);
    assert.strictEqual(resSubSearch.subreddit, 'mechanicalkeyboards');
  });

  await t.test('ensures query parameters containing "popular" or "all" do NOT trigger blocking', () => {
    const resSearch = detectRedditRoute('https://www.reddit.com/search/?q=popular+science+articles');
    assert.strictEqual(resSearch.category, 'search');
    assert.strictEqual(resSearch.isBlockedFeed, false);

    const resSub = detectRedditRoute('https://www.reddit.com/r/technology?sort=all');
    assert.strictEqual(resSub.category, 'subreddit');
    assert.strictEqual(resSub.isBlockedFeed, false);
  });

  await t.test('classifies chat and direct message routes correctly without blocking', () => {
    const resInbox = detectRedditRoute('https://www.reddit.com/message/inbox/');
    assert.strictEqual(resInbox.category, 'messages');
    assert.strictEqual(resInbox.isBlockedFeed, false);

    const resMessages = detectRedditRoute('https://www.reddit.com/message/messages/');
    assert.strictEqual(resMessages.category, 'messages');
    assert.strictEqual(resMessages.isBlockedFeed, false);

    const resChat = detectRedditRoute('https://www.reddit.com/chat');
    assert.strictEqual(resChat.category, 'messages');
    assert.strictEqual(resChat.isBlockedFeed, false);
  });

  await t.test('classifies user profiles and saved content correctly without blocking', () => {
    const resProfile = detectRedditRoute('https://www.reddit.com/user/spez/');
    assert.strictEqual(resProfile.category, 'profile');
    assert.strictEqual(resProfile.isBlockedFeed, false);

    const resUProfile = detectRedditRoute('https://www.reddit.com/u/spez');
    assert.strictEqual(resUProfile.category, 'profile');
    assert.strictEqual(resUProfile.isBlockedFeed, false);

    const resSaved = detectRedditRoute('https://www.reddit.com/user/spez/saved/');
    assert.strictEqual(resSaved.category, 'profile');
    assert.strictEqual(resSaved.isBlockedFeed, false);
  });

  await t.test('classifies settings and notifications correctly without blocking', () => {
    const resSettings = detectRedditRoute('https://www.reddit.com/settings/account');
    assert.strictEqual(resSettings.category, 'settings');
    assert.strictEqual(resSettings.isBlockedFeed, false);

    const resNotifications = detectRedditRoute('https://www.reddit.com/notifications');
    assert.strictEqual(resNotifications.category, 'settings');
    assert.strictEqual(resNotifications.isBlockedFeed, false);
  });

  await t.test('handles unknown routes safely', () => {
    const res = detectRedditRoute('https://www.reddit.com/coins');
    assert.strictEqual(res.category, 'other');
    assert.strictEqual(res.isBlockedFeed, false);
  });

  await t.test('handles malformed URLs safely without throwing exceptions', () => {
    assert.doesNotThrow(() => {
      const r1 = detectRedditRoute('not-a-valid-url:::');
      assert.strictEqual(r1.isBlockedFeed, false);

      const r2 = detectRedditRoute('');
      assert.strictEqual(r2.isBlockedFeed, false);

      const r3 = detectRedditRoute(null);
      assert.strictEqual(r3.isBlockedFeed, false);

      const r4 = detectRedditRoute(undefined);
      assert.strictEqual(r4.isBlockedFeed, false);
    });
  });

  await t.test('does not classify non-Reddit hostnames as blocked feeds', () => {
    const res = detectRedditRoute('https://www.google.com/popular');
    assert.strictEqual(res.category, 'other');
    assert.strictEqual(res.isBlockedFeed, false);
  });

  await t.test('validates Reddit hostnames and identifiers accurately', () => {
    assert.strictEqual(isRedditHost('reddit.com'), true);
    assert.strictEqual(isRedditHost('www.reddit.com'), true);
    assert.strictEqual(isRedditHost('old.reddit.com'), true);
    assert.strictEqual(isRedditHost('sh.reddit.com'), true);
    assert.strictEqual(isRedditHost('notreddit.com'), false);

    assert.strictEqual(validateSubreddit('programming'), 'programming');
    assert.strictEqual(validateSubreddit('AskReddit'), 'AskReddit');
    assert.strictEqual(validateSubreddit('a'), null); // too short
    assert.strictEqual(validateSubreddit('invalid sub with spaces'), null);

    assert.strictEqual(validatePostId('18j0xyz'), '18j0xyz');
    assert.strictEqual(validatePostId('abc'), null); // too short
  });
});
