import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFacebookRoute } from '../src/content/facebook/route-detector.js';
import {
  isSafeToHide,
  ALL_FB_REELS_SELECTORS,
  FB_REELS_NAVIGATION_SELECTORS,
  FB_REELS_TAB_SELECTORS,
  generateFacebookReelsSuppressionCss
} from '../src/content/facebook/selectors.js';
import { isReelVideo } from '../src/content/facebook/blocker-overlay.js';

/**
 * Pure decision evaluator representing Facebook Reels blocking logic.
 * @param {string} url
 * @param {{ facebookReelsEnabled: boolean }} settings
 * @returns {{ shouldBlock: boolean, category: string, reelId: string | null }}
 */
function evaluateFacebookBlockingDecision(url, settings) {
  const detection = detectFacebookRoute(url);
  const shouldBlock = Boolean(settings.facebookReelsEnabled && detection.isReel);
  return {
    shouldBlock,
    category: detection.category,
    reelId: detection.reelId
  };
}

test('Facebook Blocking Logic & DOM Safety (Phase 4)', async (t) => {
  await t.test('blocks dedicated Reel detail route when facebookReelsEnabled is true', () => {
    const decision = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/reel/1029384756/',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'reel_detail');
    assert.strictEqual(decision.reelId, '1029384756');
  });

  await t.test('blocks dedicated Reels feed route when facebookReelsEnabled is true', () => {
    const decision = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/reels/',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'reels_feed');
  });

  await t.test('does not block Reel routes when facebookReelsEnabled is false', () => {
    const decision = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/reel/1029384756/',
      { facebookReelsEnabled: false }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'reel_detail');
  });

  await t.test('ordinary watch pages are NEVER blocked by default even when enabled', () => {
    const decision1 = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/watch/',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decision1.shouldBlock, false);
    assert.strictEqual(decision1.category, 'watch');

    const decision2 = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/watch/?v=987654321',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decision2.shouldBlock, false);
    assert.strictEqual(decision2.category, 'watch');
  });

  await t.test('Messenger is NEVER blocked even when Reels blocking is enabled', () => {
    const decisionInbox = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/messages/t/123456789/',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decisionInbox.shouldBlock, false);
    assert.strictEqual(decisionInbox.category, 'messenger');

    const decisionMessenger = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/messenger/',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decisionMessenger.shouldBlock, false);
    assert.strictEqual(decisionMessenger.category, 'messenger');
  });

  await t.test('groups, pages, profiles, and normal feed remain accessible', () => {
    const decisionGroup = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/groups/codingcommunity/',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decisionGroup.shouldBlock, false);
    assert.strictEqual(decisionGroup.category, 'group');

    const decisionPage = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/pages/category/business/',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decisionPage.shouldBlock, false);
    assert.strictEqual(decisionPage.category, 'page');

    const decisionProfile = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/zuck',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decisionProfile.shouldBlock, false);
    assert.strictEqual(decisionProfile.category, 'profile');

    const decisionFeed = evaluateFacebookBlockingDecision(
      'https://www.facebook.com/',
      { facebookReelsEnabled: true }
    );
    assert.strictEqual(decisionFeed.shouldBlock, false);
    assert.strictEqual(decisionFeed.category, 'feed');
  });

  await t.test('simulates navigation transitions into and out of Facebook Reels', () => {
    const settings = { facebookReelsEnabled: true };

    // 1. User starts on feed
    const step1 = evaluateFacebookBlockingDecision('https://www.facebook.com/', settings);
    assert.strictEqual(step1.shouldBlock, false);

    // 2. User navigates to a dedicated Reel
    const step2 = evaluateFacebookBlockingDecision('https://www.facebook.com/reel/1029384756/', settings);
    assert.strictEqual(step2.shouldBlock, true);

    // 3. User clicks Back or navigates to Messenger
    const step3 = evaluateFacebookBlockingDecision('https://www.facebook.com/messages/', settings);
    assert.strictEqual(step3.shouldBlock, false);

    // 4. User navigates to Watch video
    const step4 = evaluateFacebookBlockingDecision('https://www.facebook.com/watch/?v=112233', settings);
    assert.strictEqual(step4.shouldBlock, false);

    // 5. User navigates back into Reel
    const step5 = evaluateFacebookBlockingDecision('https://www.facebook.com/reel/1029384756/', settings);
    assert.strictEqual(step5.shouldBlock, true);
  });

  await t.test('simulates idempotence during rapid repeated route evaluations', () => {
    const settings = { facebookReelsEnabled: true };
    const url = 'https://www.facebook.com/reel/1029384756/';

    const decisionA = evaluateFacebookBlockingDecision(url, settings);
    const decisionB = evaluateFacebookBlockingDecision(url, settings);
    const decisionC = evaluateFacebookBlockingDecision(url, settings);

    assert.deepStrictEqual(decisionA, decisionB);
    assert.deepStrictEqual(decisionB, decisionC);
  });

  await t.test('simulates dynamic re-enabling and disabling of setting', () => {
    const url = 'https://www.facebook.com/reel/1029384756/';

    // Initially enabled
    assert.strictEqual(
      evaluateFacebookBlockingDecision(url, { facebookReelsEnabled: true }).shouldBlock,
      true
    );

    // User disables in popup
    assert.strictEqual(
      evaluateFacebookBlockingDecision(url, { facebookReelsEnabled: false }).shouldBlock,
      false
    );

    // User re-enables in popup
    assert.strictEqual(
      evaluateFacebookBlockingDecision(url, { facebookReelsEnabled: true }).shouldBlock,
      true
    );
  });

  await t.test('protects structural tags and mixed containers containing watch or Messenger links', () => {
    const createMockElement = (tagName, containsSafeContent = false) => ({
      tagName,
      querySelector: (selector) => {
        if (
          containsSafeContent &&
          (selector.includes('/watch/') ||
            selector.includes('/messages/') ||
            selector.includes('/groups/') ||
            selector.includes('/posts/'))
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

    // Mixed container hosting normal watch or Messenger links must NEVER be hidden
    assert.strictEqual(isSafeToHide(createMockElement('DIV', true)), false);

    // Dedicated Reel anchor with no unrelated items is safe to hide
    assert.strictEqual(isSafeToHide(createMockElement('A', false)), true);
  });

  await t.test('verifies all Facebook selector definitions are populated and categorized', () => {
    assert.ok(FB_REELS_NAVIGATION_SELECTORS.length > 0);
    assert.ok(FB_REELS_TAB_SELECTORS.length > 0);
    assert.strictEqual(
      ALL_FB_REELS_SELECTORS.length,
      FB_REELS_NAVIGATION_SELECTORS.length + FB_REELS_TAB_SELECTORS.length
    );

    for (const sel of ALL_FB_REELS_SELECTORS) {
      assert.doesNotMatch(sel, /^body/i);
      assert.doesNotMatch(sel, /^main/i);
      assert.doesNotMatch(sel, /^section/i);
      assert.doesNotMatch(sel, /^article/i);
    }
  });

  await t.test('generates valid scoped declarative CSS rules for Facebook', () => {
    const css = generateFacebookReelsSuppressionCss('data-scrollshield-fb-reels-blocked');
    assert.ok(typeof css === 'string' && css.length > 0);
    assert.ok(css.includes('html[data-scrollshield-fb-reels-blocked="true"]'));
    assert.ok(css.includes('display: none !important;'));
  });

  await t.test('isReelVideo selectively identifies Reel videos and protects Messenger chat tabs', () => {
    // Normal reel video element
    const reelVideo = {
      closest: () => null
    };
    assert.strictEqual(isReelVideo(reelVideo), true);

    // Video inside a Messenger chat dock
    const messengerVideo = {
      closest: (sel) => {
        if (sel.includes('Chat') || sel.includes('Messenger')) {
          return { id: 'messenger-dock' };
        }
        return null;
      }
    };
    assert.strictEqual(isReelVideo(messengerVideo), false);

    // Video inside a complementary sidebar
    const sidebarVideo = {
      closest: (sel) => {
        if (sel.includes('complementary')) {
          return { id: 'sidebar' };
        }
        return null;
      }
    };
    assert.strictEqual(isReelVideo(sidebarVideo), false);

    // Null/undefined video
    assert.strictEqual(isReelVideo(null), false);
  });
});
