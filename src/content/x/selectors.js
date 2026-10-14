/**
 * ScrollShield - X (Twitter) DOM Selectors & Home Entry Suppression (Phase 6A)
 *
 * Maintenance Strategy & Guidelines:
 * 1. Semantic & TestID First: Target dedicated Home navigation anchors and tabs
 *    (e.g. a[data-testid="AppTabBar_Home_Link"], a[href="/home"]).
 * 2. Conservative Scope: Never select broad content containers (e.g. navigation bars,
 *    [role="banner"], [role="navigation"], [role="main"]) that host Explore, Notifications, DMs, or Profiles.
 * 3. Never Hide Unrelated Features: Keep Explore, Search, Notifications, Messages,
 *    and User Profiles completely accessible.
 * 4. Idempotence: Elements marked for suppression receive [data-scrollshield-hidden="true"]
 *    allowing clean restoration when blocking is disabled.
 * 5. Evolution Fallback: If X alters internal navigation markup, the selectors
 *    safely match zero elements, leaving normal browsing intact.
 */

/**
 * Selectors targeting dedicated Home navigation items in X primary navigation bar.
 */
export const X_HOME_NAVIGATION_SELECTORS = [
  'a[data-testid="AppTabBar_Home_Link"]',
  'a[href="/home"]',
  'a[href="/home/"]'
];

/**
 * Selectors targeting dedicated Home tabs.
 */
export const X_HOME_TAB_SELECTORS = [
  'div[role="tablist"] a[href="/home"]',
  'a[role="tab"][href="/home"]',
  'div[role="tablist"] a[href="/home/"]'
];

/**
 * Combined list of supported X Home entry selectors.
 */
export const ALL_X_HOME_SELECTORS = [
  ...X_HOME_NAVIGATION_SELECTORS,
  ...X_HOME_TAB_SELECTORS
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
 * Validates that an element is safe to hide and does not contain Explore, Notifications, DMs, or Profiles.
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

  // Never hide containers that include Explore, Notifications, Messages, Profiles, or Tweet compose
  if (
    element.querySelector(
      'a[data-testid="AppTabBar_Explore_Link"], a[data-testid="AppTabBar_Notifications_Link"], a[data-testid="AppTabBar_DirectMessage_Link"], a[data-testid="AppTabBar_Profile_Link"], a[data-testid="SideNav_NewTweet_Button"], a[href*="/explore"], a[href*="/search"], a[href*="/notifications"], a[href*="/messages"]'
    )
  ) {
    return false;
  }

  return true;
}

/**
 * Generates scoped CSS for declarative X Home timeline entry hiding.
 * Active only when html[data-scrollshield-x-home-blocked="true"] is set.
 * @param {string} rootAttribute - The attribute placed on <html>
 * @returns {string} Scoped CSS text
 */
export function generateXHomeSuppressionCss(rootAttribute = 'data-scrollshield-x-home-blocked') {
  const selectorList = ALL_X_HOME_SELECTORS
    .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
    .join(',\n');

  return `
/* ScrollShield - Declarative X Home Suppression (Phase 6A) */
${selectorList} {
  display: none !important;
}
`.trim();
}

/**
 * Suppresses identifiable Home entry elements inside a given root (idempotent).
 * @param {ParentNode} root
 * @returns {number} Count of elements suppressed
 */
export function suppressXHomeElements(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;

  let suppressedCount = 0;

  for (const selector of ALL_X_HOME_SELECTORS) {
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
 * Restores previously suppressed elements when Home blocking is toggled off.
 * @param {ParentNode} root
 * @returns {number} Count of elements restored
 */
export function restoreSuppressedXHomeElements(root = document) {
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
