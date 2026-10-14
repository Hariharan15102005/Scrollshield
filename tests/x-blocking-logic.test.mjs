import test from 'node:test';
import assert from 'node:assert/strict';
import { detectXRoute } from '../src/content/x/route-detector.js';
import {
  isSafeToHide,
  ALL_X_HOME_SELECTORS,
  X_HOME_NAVIGATION_SELECTORS,
  X_HOME_TAB_SELECTORS,
  generateXHomeSuppressionCss
} from '../src/content/x/selectors.js';
import { isHomeVideo } from '../src/content/x/blocker-overlay.js';

/**
 * Pure decision evaluator representing X Home timeline blocking logic.
 * @param {string} url
 * @param {{ xHomeFeedEnabled: boolean }} settings
 * @param {{ isHomeActive?: boolean, hasHomeContext?: boolean }} [context]
 * @returns {{ shouldBlock: boolean, category: string, isHomeTimeline: boolean }}
 */
function evaluateXBlockingDecision(url, settings, context = {}) {
  const detection = detectXRoute(url, context);
  const shouldBlock = Boolean(settings.xHomeFeedEnabled && detection.isHomeTimeline);
  return {
    shouldBlock,
    category: detection.category,
    isHomeTimeline: detection.isHomeTimeline
  };
}

test('X Blocking Logic & DOM Safety (Phase 6A)', async (t) => {
  await t.test('blocks dedicated /home route when xHomeFeedEnabled is true', () => {
    const decision = evaluateXBlockingDecision(
      'https://x.com/home',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'home');
    assert.strictEqual(decision.isHomeTimeline, true);
  });

  await t.test('blocks root route / when explicit Home page context is confirmed', () => {
    const decision = evaluateXBlockingDecision(
      'https://x.com/',
      { xHomeFeedEnabled: true },
      { isHomeActive: true }
    );
    assert.strictEqual(decision.shouldBlock, true);
    assert.strictEqual(decision.category, 'home');
  });

  await t.test('leaves root route / accessible when Home context is insufficient', () => {
    const decision = evaluateXBlockingDecision(
      'https://x.com/',
      { xHomeFeedEnabled: true },
      { isHomeActive: false }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'root');
  });

  await t.test('does not block /home route when xHomeFeedEnabled is false', () => {
    const decision = evaluateXBlockingDecision(
      'https://x.com/home',
      { xHomeFeedEnabled: false }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'home');
  });

  await t.test('explore and search routes remain accessible even when blocking is enabled', () => {
    const decisionExplore = evaluateXBlockingDecision(
      'https://x.com/explore',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decisionExplore.shouldBlock, false);
    assert.strictEqual(decisionExplore.category, 'explore');

    const decisionSearch = evaluateXBlockingDecision(
      'https://x.com/search?q=space',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decisionSearch.shouldBlock, false);
    assert.strictEqual(decisionSearch.category, 'explore');
  });

  await t.test('notifications remain accessible even when blocking is enabled', () => {
    const decision = evaluateXBlockingDecision(
      'https://x.com/notifications',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'notifications');
  });

  await t.test('direct messages remain accessible even when blocking is enabled', () => {
    const decisionMessages = evaluateXBlockingDecision(
      'https://x.com/messages',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decisionMessages.shouldBlock, false);
    assert.strictEqual(decisionMessages.category, 'messages');

    const decisionChat = evaluateXBlockingDecision(
      'https://x.com/i/chat',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decisionChat.shouldBlock, false);
    assert.strictEqual(decisionChat.category, 'messages');
  });

  await t.test('user profiles remain accessible even when blocking is enabled', () => {
    const decision = evaluateXBlockingDecision(
      'https://x.com/nasa',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decision.shouldBlock, false);
    assert.strictEqual(decision.category, 'profile');
  });

  await t.test('individual post/status routes are not blocked', () => {
    const decisionStatus = evaluateXBlockingDecision(
      'https://x.com/nasa/status/1234567890123456789',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decisionStatus.shouldBlock, false);
    assert.strictEqual(decisionStatus.category, 'post');

    const decisionIStatus = evaluateXBlockingDecision(
      'https://x.com/i/status/1234567890123456789',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decisionIStatus.shouldBlock, false);
    assert.strictEqual(decisionIStatus.category, 'post');
  });

  await t.test('lists and communities remain accessible even when blocking is enabled', () => {
    const decisionLists = evaluateXBlockingDecision(
      'https://x.com/i/lists',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decisionLists.shouldBlock, false);
    assert.strictEqual(decisionLists.category, 'lists');

    const decisionCommunities = evaluateXBlockingDecision(
      'https://x.com/i/communities',
      { xHomeFeedEnabled: true }
    );
    assert.strictEqual(decisionCommunities.shouldBlock, false);
    assert.strictEqual(decisionCommunities.category, 'lists');
  });

  await t.test('simulates navigation transitions into and out of Home timeline', () => {
    const settings = { xHomeFeedEnabled: true };

    // 1. User on Explore -> Unblocked
    const step1 = evaluateXBlockingDecision('https://x.com/explore', settings);
    assert.strictEqual(step1.shouldBlock, false);

    // 2. User clicks Home -> Blocked
    const step2 = evaluateXBlockingDecision('https://x.com/home', settings);
    assert.strictEqual(step2.shouldBlock, true);

    // 3. User navigates to Notifications -> Unblocked
    const step3 = evaluateXBlockingDecision('https://x.com/notifications', settings);
    assert.strictEqual(step3.shouldBlock, false);

    // 4. User navigates to a profile -> Unblocked
    const step4 = evaluateXBlockingDecision('https://x.com/openai', settings);
    assert.strictEqual(step4.shouldBlock, false);

    // 5. User navigates back to Home -> Blocked
    const step5 = evaluateXBlockingDecision('https://x.com/home', settings);
    assert.strictEqual(step5.shouldBlock, true);
  });

  await t.test('simulates idempotence during rapid repeated route evaluations', () => {
    const settings = { xHomeFeedEnabled: true };
    const url = 'https://x.com/home';

    const decisionA = evaluateXBlockingDecision(url, settings);
    const decisionB = evaluateXBlockingDecision(url, settings);
    const decisionC = evaluateXBlockingDecision(url, settings);

    assert.deepStrictEqual(decisionA, decisionB);
    assert.deepStrictEqual(decisionB, decisionC);
  });

  await t.test('simulates dynamic re-enabling and disabling of setting', () => {
    const url = 'https://x.com/home';

    // Initially enabled
    assert.strictEqual(
      evaluateXBlockingDecision(url, { xHomeFeedEnabled: true }).shouldBlock,
      true
    );

    // User disables in popup
    assert.strictEqual(
      evaluateXBlockingDecision(url, { xHomeFeedEnabled: false }).shouldBlock,
      false
    );

    // User re-enables in popup
    assert.strictEqual(
      evaluateXBlockingDecision(url, { xHomeFeedEnabled: true }).shouldBlock,
      true
    );
  });

  await t.test('protects structural tags and mixed containers containing explore or profile links', () => {
    const createMockElement = (tagName, containsSafeContent = false) => ({
      tagName,
      querySelector: (selector) => {
        if (
          containsSafeContent &&
          (selector.includes('AppTabBar_Explore_Link') ||
            selector.includes('AppTabBar_DirectMessage_Link') ||
            selector.includes('AppTabBar_Profile_Link') ||
            selector.includes('/explore') ||
            selector.includes('/notifications') ||
            selector.includes('/messages'))
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

    // Mixed container hosting explore/messages/profile links must NEVER be hidden
    assert.strictEqual(isSafeToHide(createMockElement('DIV', true)), false);

    // Dedicated Home anchor with no unrelated items is safe to hide
    assert.strictEqual(isSafeToHide(createMockElement('A', false)), true);
  });

  await t.test('verifies all X selector definitions are populated and categorized', () => {
    assert.ok(X_HOME_NAVIGATION_SELECTORS.length > 0);
    assert.ok(X_HOME_TAB_SELECTORS.length > 0);
    assert.strictEqual(
      ALL_X_HOME_SELECTORS.length,
      X_HOME_NAVIGATION_SELECTORS.length + X_HOME_TAB_SELECTORS.length
    );

    for (const sel of ALL_X_HOME_SELECTORS) {
      assert.doesNotMatch(sel, /^body/i);
      assert.doesNotMatch(sel, /^main/i);
      assert.doesNotMatch(sel, /^section/i);
      assert.doesNotMatch(sel, /^article/i);
    }
  });

  await t.test('generates valid scoped declarative CSS rules for X', () => {
    const css = generateXHomeSuppressionCss('data-scrollshield-x-home-blocked');
    assert.ok(typeof css === 'string' && css.length > 0);
    assert.ok(css.includes('html[data-scrollshield-x-home-blocked="true"]'));
    assert.ok(css.includes('display: none !important;'));
  });

  await t.test('isHomeVideo selectively identifies timeline videos and protects message containers', () => {
    const timelineVideo = {
      closest: () => null
    };
    assert.strictEqual(isHomeVideo(timelineVideo), true);

    const messageVideo = {
      closest: (sel) => {
        if (sel.includes('Message') || sel.includes('DMDrawer')) {
          return { id: 'dm-drawer' };
        }
        return null;
      }
    };
    assert.strictEqual(isHomeVideo(messageVideo), false);

    assert.strictEqual(isHomeVideo(null), false);
  });
});
