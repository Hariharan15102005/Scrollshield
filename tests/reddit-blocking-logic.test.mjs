import test from 'node:test';
import assert from 'node:assert/strict';
import { detectRedditRoute } from '../src/content/reddit/route-detector.js';
import {
  isSafeToHide,
  ALL_REDDIT_FEED_SELECTORS,
  REDDIT_HOME_SELECTORS,
  REDDIT_POPULAR_SELECTORS,
  REDDIT_ALL_SELECTORS,
  generateRedditFeedSuppressionCss
} from '../src/content/reddit/selectors.js';
import { isFeedVideo } from '../src/content/reddit/blocker-overlay.js';

/**
 * Pure decision evaluator representing Reddit feed blocking logic.
 * @param {string} url
 * @param {{ redditFeedsEnabled: boolean }} settings
 * @returns {{ shouldBlock: boolean, category: string, isBlockedFeed: boolean }}
 */
function evaluateRedditBlockingDecision(url, settings) {
  const detection = detectRedditRoute(url);
  const shouldBlock = Boolean(settings.redditFeedsEnabled && detection.isBlockedFeed);
  return {
    shouldBlock,
    category: detection.category,
    isBlockedFeed: detection.isBlockedFeed
  };
}

test('Reddit Blocking Logic & DOM Safety (Phase 6B)', async (t) => {
  await t.test('blocks root / Home feed route when redditFeedsEnabled is true', () => {
    const decision = evaluateRedditBlockingDecision(
      'https://www.reddit.com/',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'home');
    assert.strictEqual(decision.isBlockedFeed, true);
  });

  await t.test('blocks /popular and /r/popular routes when redditFeedsEnabled is true', () => {
    const decision1 = evaluateRedditBlockingDecision(
      'https://www.reddit.com/popular',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decision1.shouldBlock, true);
    assert.strictEqual(decision1.category, 'popular');

    const decision2 = evaluateRedditBlockingDecision(
      'https://www.reddit.com/r/popular/',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decision2.shouldBlock, true);
    assert.strictEqual(decision2.category, 'popular');
  });

  await t.test('blocks /r/all route when redditFeedsEnabled is true', () => {
    const decision = evaluateRedditBlockingDecision(
      'https://www.reddit.com/r/all/',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'all');
  });

  await t.test('does not block Home, Popular, or All feeds when redditFeedsEnabled is false', () => {
    assert.strictEqual(
      evaluateRedditBlockingDecision('https://www.reddit.com/', { redditFeedsEnabled: false }).shouldBlock,
      false
    );
    assert.strictEqual(
      evaluateRedditBlockingDecision('https://www.reddit.com/popular', { redditFeedsEnabled: false }).shouldBlock,
      false
    );
    assert.strictEqual(
      evaluateRedditBlockingDecision('https://www.reddit.com/r/all', { redditFeedsEnabled: false }).shouldBlock,
      false
    );
  });

  await t.test('NEVER blocks specific community subreddits even when blocking is enabled', () => {
    const decisionProg = evaluateRedditBlockingDecision(
      'https://www.reddit.com/r/programming/',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decisionProg.shouldBlock, false);
    assert.strictEqual(decisionProg.category, 'subreddit');

    const decisionAsk = evaluateRedditBlockingDecision(
      'https://www.reddit.com/r/AskReddit/top/?t=all',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decisionAsk.shouldBlock, false);
    assert.strictEqual(decisionAsk.category, 'subreddit');
  });

  await t.test('individual post and comments routes remain accessible', () => {
    const decisionComments = evaluateRedditBlockingDecision(
      'https://www.reddit.com/r/webdev/comments/123456/great_discussion/',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decisionComments.shouldBlock, false);
    assert.strictEqual(decisionComments.category, 'post');

    const decisionDirect = evaluateRedditBlockingDecision(
      'https://www.reddit.com/comments/123456',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decisionDirect.shouldBlock, false);
    assert.strictEqual(decisionDirect.category, 'post');
  });

  await t.test('search routes remain accessible even when blocking is enabled', () => {
    const decisionSearch = evaluateRedditBlockingDecision(
      'https://www.reddit.com/search/?q=typescript',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decisionSearch.shouldBlock, false);
    assert.strictEqual(decisionSearch.category, 'search');

    const decisionSubSearch = evaluateRedditBlockingDecision(
      'https://www.reddit.com/r/typescript/search/?q=generics',
      { redditFeedsEnabled: true }
    );
    assert.strictEqual(decisionSubSearch.shouldBlock, false);
    assert.strictEqual(decisionSubSearch.category, 'search');
  });

  await t.test('chat, direct messaging, user profiles, and settings remain accessible', () => {
    assert.strictEqual(
      evaluateRedditBlockingDecision('https://www.reddit.com/message/inbox', { redditFeedsEnabled: true }).shouldBlock,
      false
    );
    assert.strictEqual(
      evaluateRedditBlockingDecision('https://www.reddit.com/chat', { redditFeedsEnabled: true }).shouldBlock,
      false
    );
    assert.strictEqual(
      evaluateRedditBlockingDecision('https://www.reddit.com/user/someone', { redditFeedsEnabled: true }).shouldBlock,
      false
    );
    assert.strictEqual(
      evaluateRedditBlockingDecision('https://www.reddit.com/settings', { redditFeedsEnabled: true }).shouldBlock,
      false
    );
  });

  await t.test('simulates navigation transitions into and out of blocked Reddit feeds', () => {
    const settings = { redditFeedsEnabled: true };

    // 1. User starts on search -> Unblocked
    const step1 = evaluateRedditBlockingDecision('https://www.reddit.com/search', settings);
    assert.strictEqual(step1.shouldBlock, false);

    // 2. User clicks into Popular -> Blocked
    const step2 = evaluateRedditBlockingDecision('https://www.reddit.com/popular', settings);
    assert.strictEqual(step2.shouldBlock, true);

    // 3. User navigates to a specific subreddit -> Unblocked
    const step3 = evaluateRedditBlockingDecision('https://www.reddit.com/r/technology', settings);
    assert.strictEqual(step3.shouldBlock, false);

    // 4. User opens comments for a post -> Unblocked
    const step4 = evaluateRedditBlockingDecision('https://www.reddit.com/r/technology/comments/123/ai_news/', settings);
    assert.strictEqual(step4.shouldBlock, false);

    // 5. User navigates to All feed -> Blocked
    const step5 = evaluateRedditBlockingDecision('https://www.reddit.com/r/all', settings);
    assert.strictEqual(step5.shouldBlock, true);

    // 6. User navigates to home -> Blocked
    const step6 = evaluateRedditBlockingDecision('https://www.reddit.com/', settings);
    assert.strictEqual(step6.shouldBlock, true);
  });

  await t.test('simulates idempotence during rapid repeated route evaluations', () => {
    const settings = { redditFeedsEnabled: true };
    const url = 'https://www.reddit.com/popular';

    const decisionA = evaluateRedditBlockingDecision(url, settings);
    const decisionB = evaluateRedditBlockingDecision(url, settings);
    const decisionC = evaluateRedditBlockingDecision(url, settings);

    assert.deepStrictEqual(decisionA, decisionB);
    assert.deepStrictEqual(decisionB, decisionC);
  });

  await t.test('simulates dynamic re-enabling and disabling of setting', () => {
    const url = 'https://www.reddit.com/popular';

    // Initially enabled
    assert.strictEqual(
      evaluateRedditBlockingDecision(url, { redditFeedsEnabled: true }).shouldBlock,
      true
    );

    // User disables in popup
    assert.strictEqual(
      evaluateRedditBlockingDecision(url, { redditFeedsEnabled: false }).shouldBlock,
      false
    );

    // User re-enables in popup
    assert.strictEqual(
      evaluateRedditBlockingDecision(url, { redditFeedsEnabled: true }).shouldBlock,
      true
    );
  });

  await t.test('protects structural tags and mixed containers containing search, community, or profile links', () => {
    const createMockElement = (tagName, isMixed = false) => ({
      tagName,
      id: '',
      getAttribute: () => null,
      querySelector: (selector) => {
        if (
          isMixed &&
          (selector.includes('/search') ||
            selector.includes('/message') ||
            selector.includes('/user/') ||
            selector.includes('input[type="search"]'))
        ) {
          return {};
        }
        return null;
      }
    });

    assert.strictEqual(isSafeToHide(createMockElement('HTML')), false);
    assert.strictEqual(isSafeToHide(createMockElement('BODY')), false);
    assert.strictEqual(isSafeToHide(createMockElement('MAIN')), false);
    assert.strictEqual(isSafeToHide(createMockElement('NAV')), false);
    assert.strictEqual(isSafeToHide(createMockElement('HEADER')), false);
    assert.strictEqual(isSafeToHide(createMockElement('SECTION')), false);
    assert.strictEqual(isSafeToHide(createMockElement('ARTICLE')), false);
    assert.strictEqual(isSafeToHide(createMockElement('FORM')), false);

    // Mixed container hosting search/chat/profile links must NEVER be hidden
    assert.strictEqual(isSafeToHide(createMockElement('DIV', true)), false);

    // Header logo must NEVER be hidden
    const logoMock = {
      tagName: 'A',
      id: 'header-img',
      getAttribute: () => null,
      querySelector: () => null
    };
    assert.strictEqual(isSafeToHide(logoMock), false);

    // Dedicated Popular anchor with no unrelated items is safe to hide
    assert.strictEqual(isSafeToHide(createMockElement('A', false)), true);
  });

  await t.test('verifies all Reddit selector definitions are populated and categorized', () => {
    assert.ok(REDDIT_HOME_SELECTORS.length > 0);
    assert.ok(REDDIT_POPULAR_SELECTORS.length > 0);
    assert.ok(REDDIT_ALL_SELECTORS.length > 0);
    assert.strictEqual(
      ALL_REDDIT_FEED_SELECTORS.length,
      REDDIT_HOME_SELECTORS.length + REDDIT_POPULAR_SELECTORS.length + REDDIT_ALL_SELECTORS.length
    );

    for (const sel of ALL_REDDIT_FEED_SELECTORS) {
      assert.doesNotMatch(sel, /^body/i);
      assert.doesNotMatch(sel, /^main/i);
      assert.doesNotMatch(sel, /^section/i);
      assert.doesNotMatch(sel, /^article/i);
    }
  });

  await t.test('generates valid scoped declarative CSS rules for Reddit', () => {
    const css = generateRedditFeedSuppressionCss('data-scrollshield-reddit-feeds-blocked');
    assert.ok(typeof css === 'string' && css.length > 0);
    assert.ok(css.includes('html[data-scrollshield-reddit-feeds-blocked="true"]'));
    assert.ok(css.includes('display: none !important;'));
  });

  await t.test('isFeedVideo selectively identifies feed videos and protects comment containers', () => {
    const feedVideo = {
      closest: () => null
    };
    assert.strictEqual(isFeedVideo(feedVideo), true);

    const commentVideo = {
      closest: (sel) => {
        if (sel.includes('post-type="comment"') || sel.includes('post-comment-header')) {
          return { id: 'comment-container' };
        }
        return null;
      }
    };
    assert.strictEqual(isFeedVideo(commentVideo), false);

    assert.strictEqual(isFeedVideo(null), false);
  });
});
