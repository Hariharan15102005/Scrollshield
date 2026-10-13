/**
 * ScrollShield - Instagram DOM Selectors & Reels Entry Point Suppression (Phase 3)
 *
 * Maintenance Strategy & Guidelines:
 * 1. Semantic First: Target dedicated Reels navigation anchors and profile tabs directly
 *    (e.g. a[href^="/reels"], a[role="tab"][href*="/reels/"]).
 * 2. Conservative Scope: Never select broad content containers (e.g. main, section, article,
 *    #react-root) that host normal posts, profile headers, or messaging threads.
 * 3. Never Hide Unrelated Media: Do not hide standard photo/video posts (/p/*), stories, or DMs.
 * 4. Idempotence: Elements marked for suppression receive [data-scrollshield-hidden="true"]
 *    allowing clean restoration when blocking is disabled.
 * 5. Evolution Fallback: If Instagram modifies internal navigation markup, the selectors
 *    will match zero elements, safely leaving normal browsing functional.
 */

/**
 * Verified selectors targeting dedicated Reels navigation items in Instagram sidebars/menus.
 */
export const REELS_NAVIGATION_SELECTORS = [
  // Primary desktop left navigation link to Reels
  'a[href="/reels/"]',
  'a[href^="/reels/"]',
  'a[href="/reels"]'
];

/**
 * Verified selectors targeting dedicated Reels tabs on user profiles.
 */
export const REELS_TAB_SELECTORS = [
  // Profile tab leading to /username/reels/
  'a[role="tab"][href*="/reels/"]',
  'a[href$="/reels/"]'
];

/**
 * Combined list of all supported Reels entry point selectors.
 */
export const ALL_REELS_SELECTORS = [
  ...REELS_NAVIGATION_SELECTORS,
  ...REELS_TAB_SELECTORS
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
 * Validates that an element is safe to hide and does not contain normal posts or DMs.
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

  // Never hide containers that include normal post links or DM links
  if (element.querySelector('a[href^="/p/"], a[href^="/direct/"], a[href^="/stories/"]')) {
    return false;
  }

  return true;
}

/**
 * Generates scoped CSS for declarative Reels hiding.
 * Active only when html[data-scrollshield-reels-blocked="true"] is set.
 * @param {string} rootAttribute - The attribute placed on <html>
 * @returns {string} Scoped CSS text
 */
export function generateReelsSuppressionCss(rootAttribute = 'data-scrollshield-reels-blocked') {
  const selectorList = ALL_REELS_SELECTORS
    .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
    .join(',\n');

  return `
/* ScrollShield - Declarative Instagram Reels Suppression (Phase 3) */
${selectorList} {
  display: none !important;
}
`.trim();
}

/**
 * Suppresses identifiable Reels entry elements inside a given root (idempotent).
 * @param {ParentNode} root
 * @returns {number} Count of elements suppressed
 */
export function suppressReelsElements(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;

  let suppressedCount = 0;

  for (const selector of ALL_REELS_SELECTORS) {
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
 * Restores previously suppressed elements when Reels blocking is toggled off.
 * @param {ParentNode} root
 * @returns {number} Count of elements restored
 */
export function restoreSuppressedElements(root = document) {
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
