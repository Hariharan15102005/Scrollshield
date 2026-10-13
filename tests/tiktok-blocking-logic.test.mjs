import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTikTokRoute } from '../src/content/tiktok/route-detector.js';
import {
  isSafeToHide,
  ALL_TIKTOK_FORYOU_SELECTORS,
  TIKTOK_FORYOU_NAVIGATION_SELECTORS,
  TIKTOK_FORYOU_TAB_SELECTORS,
  generateTikTokForYouSuppressionCss
} from '../src/content/tiktok/selectors.js';
import { isForYouVideo } from '../src/content/tiktok/blocker-overlay.js';

/**
 * Pure decision evaluator representing TikTok For You blocking logic.
 * @param {string} url
 * @param {{ tiktokForYouEnabled: boolean }} settings
 * @param {{ isForYouActive?: boolean }} [context]
 * @returns {{ shouldBlock: boolean, category: string, isForYouFeed: boolean }}
 */
function evaluateTikTokBlockingDecision(url, settings, context = {}) {
  const detection = detectTikTokRoute(url, context);
  const shouldBlock = Boolean(settings.tiktokForYouEnabled && detection.isForYouFeed);
  return {
    shouldBlock,
    category: detection.category,
    isForYouFeed: detection.isForYouFeed
  };
}

test('TikTok Blocking Logic & DOM Safety (Phase 5)', async (t) => {
  await t.test('blocks dedicated /foryou route when tiktokForYouEnabled is true', () => {
    const decision = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/foryou',
      { tiktokForYouEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'foryou');
    assert.strictEqual(decision.isForYouFeed, true);
  });

  await t.test('blocks root route / when explicit For You page context is confirmed', () => {
    const decision = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/',
      { tiktokForYouEnabled: true },
      { isForYouActive: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'foryou');
  });

  await t.test('leaves root route / accessible when For You context is insufficient', () => {
    const decision = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/',
      { tiktokForYouEnabled: true },
      { isForYouActive: false }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'root');
  });

  await t.test('does not block /foryou route when tiktokForYouEnabled is false', () => {
    const decision = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/foryou',
      { tiktokForYouEnabled: false }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'foryou');
  });

  await t.test('Following feed remains accessible according to documented policy', () => {
    const decision = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/following',
      { tiktokForYouEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'following');
  });

  await t.test('user profiles remain accessible even when blocking is enabled', () => {
    const decision = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/@creator',
      { tiktokForYouEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'profile');
  });

  await t.test('search routes remain accessible even when blocking is enabled', () => {
    const decision = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/search?q=woodworking+tips',
      { tiktokForYouEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'search');
  });

  await t.test('individual video routes are not accidentally blocked', () => {
    const decision1 = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/@creator/video/7123456789012345678',
      { tiktokForYouEnabled: true }
    );
    assert.strictEqual(decision1.shouldBlock, false);
    assert.strictEqual(decision1.category, 'video');

    const decision2 = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/video/7123456789012345678',
      { tiktokForYouEnabled: true }
    );
    assert.strictEqual(decision2.shouldBlock, false);
    assert.strictEqual(decision2.category, 'video');
  });

  await t.test('direct messaging and LIVE routes remain accessible', () => {
    const decisionMsg = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/messages',
      { tiktokForYouEnabled: true }
    );
    assert.strictEqual(decisionMsg.shouldBlock, false);
    assert.strictEqual(decisionMsg.category, 'messages');

    const decisionLive = evaluateTikTokBlockingDecision(
      'https://www.tiktok.com/live',
      { tiktokForYouEnabled: true }
    );
    assert.strictEqual(decisionLive.shouldBlock, false);
    assert.strictEqual(decisionLive.category, 'live');
  });

  await t.test('simulates navigation transitions into and out of For You feed', () => {
    const settings = { tiktokForYouEnabled: true };

    // 1. User starts on Search -> Unblocked
    const step1 = evaluateTikTokBlockingDecision('https://www.tiktok.com/search', settings);
    assert.strictEqual(step1.shouldBlock, false);

    // 2. User clicks into For You feed -> Blocked
    const step2 = evaluateTikTokBlockingDecision('https://www.tiktok.com/foryou', settings);
    assert.strictEqual(step2.shouldBlock, true);

    // 3. User navigates to Following -> Unblocked
    const step3 = evaluateTikTokBlockingDecision('https://www.tiktok.com/following', settings);
    assert.strictEqual(step3.shouldBlock, false);

    // 4. User navigates to a creator profile -> Unblocked
    const step4 = evaluateTikTokBlockingDecision('https://www.tiktok.com/@scitok', settings);
    assert.strictEqual(step4.shouldBlock, false);

    // 5. User navigates back to For You -> Blocked
    const step5 = evaluateTikTokBlockingDecision('https://www.tiktok.com/foryou', settings);
    assert.strictEqual(step5.shouldBlock, true);
  });

  await t.test('simulates idempotence during rapid repeated route evaluations', () => {
    const settings = { tiktokForYouEnabled: true };
    const url = 'https://www.tiktok.com/foryou';

    const decisionA = evaluateTikTokBlockingDecision(url, settings);
    const decisionB = evaluateTikTokBlockingDecision(url, settings);
    const decisionC = evaluateTikTokBlockingDecision(url, settings);

    assert.deepStrictEqual(decisionA, decisionB);
    assert.deepStrictEqual(decisionB, decisionC);
  });

  await t.test('simulates dynamic re-enabling and disabling of setting', () => {
    const url = 'https://www.tiktok.com/foryou';

    // Initially enabled
    assert.strictEqual(
      evaluateTikTokBlockingDecision(url, { tiktokForYouEnabled: true }).shouldBlock,
      true
    );

    // User disables in popup
    assert.strictEqual(
      evaluateTikTokBlockingDecision(url, { tiktokForYouEnabled: false }).shouldBlock,
      false
    );

    // User re-enables in popup
    assert.strictEqual(
      evaluateTikTokBlockingDecision(url, { tiktokForYouEnabled: true }).shouldBlock,
      true
    );
  });

  await t.test('protects structural tags and mixed containers containing profile or search links', () => {
    const createMockElement = (tagName, containsSafeContent = false) => ({
      tagName,
      querySelector: (selector) => {
        if (
          containsSafeContent &&
          (selector.includes('/search') ||
            selector.includes('/messages') ||
            selector.includes('/following') ||
            selector.includes('/@'))
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

    // Mixed container hosting profile/search/following links must NEVER be hidden
    assert.strictEqual(isSafeToHide(createMockElement('DIV', true)), false);

    // Dedicated For You anchor with no unrelated items is safe to hide
    assert.strictEqual(isSafeToHide(createMockElement('A', false)), true);
  });

  await t.test('verifies all TikTok selector definitions are populated and categorized', () => {
    assert.ok(TIKTOK_FORYOU_NAVIGATION_SELECTORS.length > 0);
    assert.ok(TIKTOK_FORYOU_TAB_SELECTORS.length > 0);
    assert.strictEqual(
      ALL_TIKTOK_FORYOU_SELECTORS.length,
      TIKTOK_FORYOU_NAVIGATION_SELECTORS.length + TIKTOK_FORYOU_TAB_SELECTORS.length
    );

    for (const sel of ALL_TIKTOK_FORYOU_SELECTORS) {
      assert.doesNotMatch(sel, /^body/i);
      assert.doesNotMatch(sel, /^main/i);
      assert.doesNotMatch(sel, /^section/i);
      assert.doesNotMatch(sel, /^article/i);
    }
  });

  await t.test('generates valid scoped declarative CSS rules for TikTok', () => {
    const css = generateTikTokForYouSuppressionCss('data-scrollshield-tiktok-foryou-blocked');
    assert.ok(typeof css === 'string' && css.length > 0);
    assert.ok(css.includes('html[data-scrollshield-tiktok-foryou-blocked="true"]'));
    assert.ok(css.includes('display: none !important;'));
  });

  await t.test('isForYouVideo selectively identifies feed videos and protects message containers', () => {
    const feedVideo = {
      closest: () => null
    };
    assert.strictEqual(isForYouVideo(feedVideo), true);

    const messageVideo = {
      closest: (sel) => {
        if (sel.includes('Message') || sel.includes('chat-container')) {
          return { id: 'chat-container' };
        }
        return null;
      }
    };
    assert.strictEqual(isForYouVideo(messageVideo), false);

    assert.strictEqual(isForYouVideo(null), false);
  });
});
