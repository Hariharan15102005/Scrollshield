import test from 'node:test';
import assert from 'node:assert/strict';
import { detectInstagramRoute } from '../src/content/instagram/route-detector.js';
import {
  isSafeToHide,
  ALL_REELS_SELECTORS,
  REELS_NAVIGATION_SELECTORS,
  REELS_TAB_SELECTORS,
  generateReelsSuppressionCss
} from '../src/content/instagram/selectors.js';

/**
 * Pure decision evaluator representing Instagram Reels blocking logic.
 * @param {string} url
 * @param {{ instagramReelsEnabled: boolean }} settings
 * @returns {{ shouldBlock: boolean, category: string, shortcode: string | null }}
 */
function evaluateInstagramBlockingDecision(url, settings) {
  const detection = detectInstagramRoute(url);
  const shouldBlock = Boolean(settings.instagramReelsEnabled && detection.isReel);
  return {
    shouldBlock,
    category: detection.category,
    shortcode: detection.shortcode
  };
}

test('Instagram Blocking Logic & DOM Safety (Phase 3)', async (t) => {
  await t.test('blocks Reel detail route when instagramReelsEnabled is true', () => {
    const decision = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/reel/C12345AbcDE/',
      { instagramReelsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'reel_detail');
    assert.strictEqual(decision.shortcode, 'C12345AbcDE');
  });

  await t.test('blocks dedicated Reels feed route when instagramReelsEnabled is true', () => {
    const decision = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/reels/',
      { instagramReelsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'reels_feed');
  });

  await t.test('does not block Reel routes when instagramReelsEnabled is false', () => {
    const decision = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/reel/C12345AbcDE/',
      { instagramReelsEnabled: false }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'reel_detail');
  });

  await t.test('never blocks normal posts (/p/) even when Reels blocking is enabled', () => {
    const decision = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/p/B98765XyzAB/',
      { instagramReelsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'post');
    assert.strictEqual(decision.shortcode, 'B98765XyzAB');
  });

  await t.test('never blocks direct messages even when Reels blocking is enabled', () => {
    const decision = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/direct/t/17841400000000000/',
      { instagramReelsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'direct');
  });

  await t.test('never blocks user profiles even when Reels blocking is enabled', () => {
    const decision = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/natgeo/',
      { instagramReelsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'profile');
  });

  await t.test('simulates navigation transitions into and out of Reels', () => {
    const settings = { instagramReelsEnabled: true };

    // 1. User is on home feed -> Unblocked
    const step1 = evaluateInstagramBlockingDecision('https://www.instagram.com/', settings);
    assert.strictEqual(step1.shouldBlock, false);

    // 2. User clicks a Reel -> Blocked
    const step2 = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/reel/C12345AbcDE/',
      settings
    );
    assert.strictEqual(step2.shouldBlock, true);

    // 3. User navigates to DMs -> Unblocked
    const step3 = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/direct/inbox/',
      settings
    );
    assert.strictEqual(step3.shouldBlock, false);

    // 4. User navigates back to Reel -> Blocked
    const step4 = evaluateInstagramBlockingDecision(
      'https://www.instagram.com/reel/C12345AbcDE/',
      settings
    );
    assert.strictEqual(step4.shouldBlock, true);
  });

  await t.test('simulates idempotence during rapid repeated route evaluations', () => {
    const settings = { instagramReelsEnabled: true };
    const url = 'https://www.instagram.com/reel/C12345AbcDE/';

    const decisionA = evaluateInstagramBlockingDecision(url, settings);
    const decisionB = evaluateInstagramBlockingDecision(url, settings);
    const decisionC = evaluateInstagramBlockingDecision(url, settings);

    assert.deepStrictEqual(decisionA, decisionB);
    assert.deepStrictEqual(decisionB, decisionC);
  });

  await t.test('simulates dynamic re-enabling and disabling of setting', () => {
    const url = 'https://www.instagram.com/reel/C12345AbcDE/';

    // Initially enabled
    assert.strictEqual(
      evaluateInstagramBlockingDecision(url, { instagramReelsEnabled: true }).shouldBlock,
      true
    );

    // User disables in popup
    assert.strictEqual(
      evaluateInstagramBlockingDecision(url, { instagramReelsEnabled: false }).shouldBlock,
      false
    );

    // User re-enables in popup
    assert.strictEqual(
      evaluateInstagramBlockingDecision(url, { instagramReelsEnabled: true }).shouldBlock,
      true
    );
  });

  await t.test('protects top-level containers and containers with normal posts/DMs from hiding', () => {
    const createMockElement = (tagName, containsOther = false) => ({
      tagName,
      querySelector: (selector) => {
        if (containsOther && (selector.includes('/p/') || selector.includes('/direct/'))) {
          return {};
        }
        return null;
      }
    });

    assert.strictEqual(isSafeToHide(createMockElement('HTML')), false);
    assert.strictEqual(isSafeToHide(createMockElement('BODY')), false);
    assert.strictEqual(isSafeToHide(createMockElement('MAIN')), false);
    assert.strictEqual(isSafeToHide(createMockElement('NAV')), false);
    assert.strictEqual(isSafeToHide(createMockElement('SECTION')), false);
    assert.strictEqual(isSafeToHide(createMockElement('ARTICLE')), false);

    // Container containing normal posts must never be hidden
    assert.strictEqual(isSafeToHide(createMockElement('DIV', true)), false);

    // Dedicated Reel anchor with no unrelated items is safe to hide
    assert.strictEqual(isSafeToHide(createMockElement('A', false)), true);
  });

  await t.test('verifies all selector definitions are populated and categorized', () => {
    assert.ok(REELS_NAVIGATION_SELECTORS.length > 0);
    assert.ok(REELS_TAB_SELECTORS.length > 0);
    assert.strictEqual(
      ALL_REELS_SELECTORS.length,
      REELS_NAVIGATION_SELECTORS.length + REELS_TAB_SELECTORS.length
    );

    for (const sel of ALL_REELS_SELECTORS) {
      assert.doesNotMatch(sel, /^body/);
      assert.doesNotMatch(sel, /^main/);
      assert.doesNotMatch(sel, /^section/);
      assert.doesNotMatch(sel, /^article/);
    }
  });

  await t.test('generates valid scoped declarative CSS rules for Instagram', () => {
    const css = generateReelsSuppressionCss('data-scrollshield-reels-blocked');
    assert.ok(typeof css === 'string' && css.length > 0);
    assert.ok(css.includes('html[data-scrollshield-reels-blocked="true"]'));
    assert.ok(css.includes('display: none !important;'));
  });
});
