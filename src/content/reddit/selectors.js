/**
 * ScrollShield - Reddit DOM Selectors & Feed Entry Suppression (Phase 6B)
 *
 * Maintenance Strategy & Guidelines:
 * 1. Semantic & URL First: Target dedicated Home, Popular, and All navigation anchors
 *    (e.g. a[href="/r/popular"], a[href="/r/all"], a[href="/popular"]).
 * 2. Conservative Scope: Never select broad content containers (e.g. navigation bars,
 *    #left-sidebar, shreddit-app, [role="navigation"]) that host community subreddits, search, chat, or profiles.
 * 3. Never Hide Unrelated Features: Preserve subreddit links, post containers, search inputs,
 *    messages/chat, and creator profiles.
 * 4. Idempotence: Elements marked for suppression receive [data-scrollshield-hidden="true"]
 *    allowing clean restoration when blocking is disabled.
 * 5. Evolution Fallback: If Reddit alters internal navigation markup, the selectors
 *    safely match zero elements, leaving normal browsing intact.
 */

/**
 * Selectors targeting dedicated Popular feed navigation items.
 */
export const REDDIT_POPULAR_SELECTORS = [
  'a[href="/r/popular"]',
  'a[href="/r/popular/"]',
  'a[href="/popular"]',
  'a[href="/popular/"]',
  'faceplate-tracker[noun="popular"]'
];

/**
 * Selectors targeting dedicated All feed navigation items.
 */
export const REDDIT_ALL_SELECTORS = [
  'a[href="/r/all"]',
  'a[href="/r/all/"]',
  'faceplate-tracker[noun="all"]'
];

/**
 * Selectors targeting dedicated Home feed navigation items (excluding header logo).
 */
export const REDDIT_HOME_SELECTORS = [
  'a#home-link',
  'a[data-testid="feed-home"]',
  'left-nav a[href="/"]',
  'faceplate-tracker[noun="home"]'
];

/**
 * Combined list of supported Reddit feed entry selectors.
 */
export const ALL_REDDIT_FEED_SELECTORS = [
  ...REDDIT_HOME_SELECTORS,
  ...REDDIT_POPULAR_SELECTORS,
  ...REDDIT_ALL_SELECTORS
];

/**
 * Elements that must NEVER be hidden, as they contain critical page infrastructure or normal content.
 */
const PROTECTED_TAG_NAMES = new Set([
  'HTML',
  'BODY',
  'MAIN',
  'NAV',
  'HEADER',
  'SECTION',
  'ARTICLE',
  'FORM'
]);

/**
 * Validates that an element is safe to hide and does not contain communities, search, chat, or profiles.
 * @param {Element} element
 * @returns {boolean}
 */
export function isSafeToHide(element) {
  if (!element || typeof element.tagName !== 'string') {
    return false;
  }

  const tagName = element.tagName.toUpperCase();
  if (PROTECTED_TAG_NAMES.has(tagName)) {
    return false;
  }

  // Never hide containers that include search, chat/messages, user profiles, or specific community links
  if (
    element.querySelector(
      'input[type="search"], [role="search"], a[href*="/search"], a[href*="/message"], a[href*="/chat"], a[href^="/user/"], a[href^="/u/"]'
    )
  ) {
    return false;
  }

  // Never hide headers or brand logo links
  if (
    element.id === 'header-img' ||
    element.getAttribute('aria-label') === 'Home' ||
    element.querySelector('[data-testid="reddit-logo"], svg[aria-label="Reddit Logo"]')
  ) {
    return false;
  }

  return true;
}

/**
 * Generates scoped CSS for declarative Reddit feed entry hiding.
 * Active only when html[data-scrollshield-reddit-feeds-blocked="true"] is set.
 * @param {string} rootAttribute - The attribute placed on <html>
 * @returns {string} Scoped CSS text
 */
export function generateRedditFeedSuppressionCss(rootAttribute = 'data-scrollshield-reddit-feeds-blocked') {
  const selectorList = ALL_REDDIT_FEED_SELECTORS
    .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
    .join(',\n');

  return `
/* ScrollShield - Declarative Reddit Feed Suppression (Phase 6B) */
${selectorList} {
  display: none !important;
}
`.trim();
}

/**
 * Suppresses identifiable feed entry elements inside a given root (idempotent).
 * @param {ParentNode} root
 * @returns {number} Count of elements suppressed
 */
export function suppressRedditFeedElements(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;

  let suppressedCount = 0;

  for (const selector of ALL_REDDIT_FEED_SELECTORS) {
    try {
      const elements = root.querySelectorAll(selector);
      for (const el of elements) {
        if (isSafeToHide(el) && el.getAttribute('data-scrollshield-hidden') !== 'true') {
          el.setAttribute('data-scrollshield-hidden', 'true');
          el.setAttribute('data-scrollshield-original-display', el.style.display || '');
          el.style.display = 'none';
          suppressedCount++;
        }
      }
    } catch {
      // Safe fallback
    }
  }

  return suppressedCount;
}

/**
 * Restores previously suppressed elements when Reddit feed blocking is toggled off.
 * @param {ParentNode} root
 * @returns {number} Count of elements restored
 */
export function restoreSuppressedRedditFeedElements(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;

  let restoredCount = 0;
  try {
    const hiddenElements = root.querySelectorAll('[data-scrollshield-hidden="true"]');
    for (const el of hiddenElements) {
      const originalDisplay = el.getAttribute('data-scrollshield-original-display') || '';
      el.style.display = originalDisplay;
      el.removeAttribute('data-scrollshield-hidden');
      el.removeAttribute('data-scrollshield-original-display');
      restoredCount++;
    }
  } catch {
    // Safe fallback
  }

  return restoredCount;
}
