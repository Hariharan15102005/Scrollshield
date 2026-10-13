import test from 'node:test';
import assert from 'node:assert/strict';
import { detectYouTubeRoute } from '../src/content/youtube/route-detector.js';
import {
  isSafeToHide,
  ALL_SHORTS_SELECTORS,
  SHORTS_SHELF_SELECTORS,
  SHORTS_NAVIGATION_SELECTORS,
  generateShortsSuppressionCss
} from '../src/content/youtube/selectors.js';

/**
 * Pure decision function representing the core blocking evaluation.
 * @param {string} url
 * @param {{ youtubeShortsEnabled: boolean }} settings
 * @returns {{ shouldBlock: boolean, videoId: string | null, canonicalWatchUrl: string | null }}
 */
function evaluateBlockingDecision(url, settings) {
  const detection = detectYouTubeRoute(url);
  const shouldBlock = Boolean(settings.youtubeShortsEnabled && detection.isShorts);
  return {
    shouldBlock,
    videoId: detection.videoId,
    canonicalWatchUrl: detection.canonicalWatchUrl
  };
}

test('ScrollShield Blocking Logic & DOM Safety (Phase 2)', async (t) => {
  await t.test('evaluates blocking as true when enabled on a Shorts route', () => {
    const decision = evaluateBlockingDecision(
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      { youtubeShortsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.videoId, 'dQw4w9WgXcQ');
    assert.strictEqual(
      decision.canonicalWatchUrl,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
  });

  await t.test('evaluates blocking as false when disabled on a Shorts route', () => {
    const decision = evaluateBlockingDecision(
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      { youtubeShortsEnabled: false }
    );
    assert.strictEqual(decision.shouldBlock, false);
    // Detection still succeeds, but decision respects user setting
    assert.strictEqual(decision.videoId, 'dQw4w9WgXcQ');
  });

  await t.test('evaluates blocking as false for normal watch page even when enabled', () => {
    const decision = evaluateBlockingDecision(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      { youtubeShortsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.videoId, null);
    assert.strictEqual(decision.canonicalWatchUrl, null);
  });

  await t.test('simulates navigation transition between Shorts and regular video', () => {
    const settings = { youtubeShortsEnabled: true };

    // Step 1: User visits Shorts -> Blocked
    const step1 = evaluateBlockingDecision(
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      settings
    );
    assert.strictEqual(step1.shouldBlock, true);

    // Step 2: User clicks regular video link from recommendations -> Unblocked
    const step2 = evaluateBlockingDecision(
      'https://www.youtube.com/watch?v=9bZkp7q19f0',
      settings
    );
    assert.strictEqual(step2.shouldBlock, false);

    // Step 3: User uses browser back button returning to Shorts -> Blocked
    const step3 = evaluateBlockingDecision(
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      settings
    );
    assert.strictEqual(step3.shouldBlock, true);
  });

  await t.test('simulates idempotence during repeated route evaluations', () => {
    const settings = { youtubeShortsEnabled: true };
    const url = 'https://www.youtube.com/shorts/video12345';

    // Multiple rapid calls (e.g. from rapid DOM mutations) produce identical outcomes
    const decisionA = evaluateBlockingDecision(url, settings);
    const decisionB = evaluateBlockingDecision(url, settings);
    const decisionC = evaluateBlockingDecision(url, settings);

    assert.deepStrictEqual(decisionA, decisionB);
    assert.deepStrictEqual(decisionB, decisionC);
  });

  await t.test('protects top-level and broad video containers from being hidden', () => {
    // Mock minimal DOM element interface
    const createMockElement = (tagName, containsRegularVideos = false) => ({
      tagName,
      querySelector: (selector) => {
        if (containsRegularVideos && selector.includes('ytd-video-renderer')) {
          return {}; // Found regular video
        }
        return null;
      }
    });

    // Top level application shells must never be hidden
    assert.strictEqual(isSafeToHide(createMockElement('YTD-APP')), false);
    assert.strictEqual(isSafeToHide(createMockElement('YTD-BROWSE')), false);
    assert.strictEqual(isSafeToHide(createMockElement('YTD-SEARCH')), false);
    assert.strictEqual(isSafeToHide(createMockElement('YTD-WATCH-FLEXY')), false);
    assert.strictEqual(isSafeToHide(createMockElement('BODY')), false);
    assert.strictEqual(isSafeToHide(createMockElement('HTML')), false);

    // Container containing regular videos must never be hidden
    const mixedContainer = createMockElement('DIV', true);
    assert.strictEqual(isSafeToHide(mixedContainer), false);

    // Dedicated shorts shelf with no regular videos is safe to hide
    const shortsShelf = createMockElement('YTD-REEL-SHELF-RENDERER', false);
    assert.strictEqual(isSafeToHide(shortsShelf), true);

    const shortsGuide = createMockElement('YTD-GUIDE-ENTRY-RENDERER', false);
    assert.strictEqual(isSafeToHide(shortsGuide), true);
  });

  await t.test('handles missing or malformed elements in isSafeToHide gracefully', () => {
    assert.strictEqual(isSafeToHide(null), false);
    assert.strictEqual(isSafeToHide(undefined), false);
    assert.strictEqual(isSafeToHide({}), false);
    assert.strictEqual(isSafeToHide('not an element'), false);
  });

  await t.test('verifies all selector definitions are populated and categorized', () => {
    assert.ok(SHORTS_SHELF_SELECTORS.length > 0);
    assert.ok(SHORTS_NAVIGATION_SELECTORS.length > 0);
    assert.strictEqual(
      ALL_SHORTS_SELECTORS.length,
      SHORTS_SHELF_SELECTORS.length + SHORTS_NAVIGATION_SELECTORS.length
    );

    // Verify none of the selectors target global broad components
    for (const sel of ALL_SHORTS_SELECTORS) {
      assert.doesNotMatch(sel, /^ytd-app/);
      assert.doesNotMatch(sel, /^#content/);
      assert.doesNotMatch(sel, /^body/);
    }
  });

  await t.test('generates valid scoped declarative CSS rules', () => {
    const css = generateShortsSuppressionCss('data-scrollshield-shorts-blocked');
    assert.ok(typeof css === 'string' && css.length > 0);
    assert.ok(css.includes('html[data-scrollshield-shorts-blocked="true"]'));
    assert.ok(css.includes('display: none !important;'));
  });
});
