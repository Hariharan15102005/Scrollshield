/**
 * ScrollShield - Facebook DOM Selectors & Reels Entry Point Suppression (Phase 4)
 *
 * Maintenance Strategy & Guidelines:
 * 1. Semantic First: Target dedicated Reels navigation anchors and tabs directly
 *    (e.g. a[href^="/reel"], a[href^="/reels"]).
 * 2. Conservative Scope: Never select broad content containers (e.g. feed containers,
 *    #react-root, [role="main"], [role="navigation"]) that host Messenger, groups, pages,
 *    or normal posts.
 * 3. Never Hide Unrelated Media: Do not hide standard watch pages (/watch/*), ordinary video posts,
 *    or thumbnail containers with mixed content.
 * 4. Idempotence: Elements marked for suppression receive [data-scrollshield-hidden="true"]
 *    allowing clean restoration when blocking is disabled.
 * 5. Evolution Fallback: If Facebook alters internal navigation markup, the selectors
 *    will safely match zero elements, leaving normal browsing intact.
 */

/**
 * Verified selectors targeting dedicated Reels navigation items in Facebook sidebars/menus.
 */
export const FB_REELS_NAVIGATION_SELECTORS = [
  'a[href="/reel/"]',
  'a[href="/reels/"]',
  'a[href^="/reel/"]',
  'a[href^="/reels/"]',
  'a[href="/reel"]',
  'a[href="/reels"]'
];

/**
 * Selectors targeting dedicated Reels tab buttons and links.
 */
export const FB_REELS_TAB_SELECTORS = [
  'div[role="tablist"] a[href*="/reel"]',
  'a[role="tab"][href*="/reel"]'
];

/**
 * Combined list of supported Facebook Reels entry selectors.
 */
export const ALL_FB_REELS_SELECTORS = [
  ...FB_REELS_NAVIGATION_SELECTORS,
  ...FB_REELS_TAB_SELECTORS
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
 * Validates that an element is safe to hide and does not contain normal watch links, posts, groups, or Messenger.
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

  // Never hide containers that include normal watch, Messenger, groups, or post links
  if (
    element.querySelector(
      'a[href*="/watch/"], a[href*="/watch?"], a[href*="/messages/"], a[href*="/messenger/"], a[href*="/groups/"], a[href*="/posts/"]'
    )
  ) {
    return false;
  }

  return true;
}

/**
 * Generates scoped CSS for declarative Reels hiding.
 * Active only when html[data-scrollshield-fb-reels-blocked="true"] is set.
 * @param {string} rootAttribute - The attribute placed on <html>
 * @returns {string} Scoped CSS text
 */
export function generateFacebookReelsSuppressionCss(rootAttribute = 'data-scrollshield-fb-reels-blocked') {
  const selectorList = ALL_FB_REELS_SELECTORS
    .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
    .join(',\n');

  return `
/* ScrollShield - Declarative Facebook Reels Suppression (Phase 4) */
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
export function suppressFacebookReelsElements(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;

  let suppressedCount = 0;

  for (const selector of ALL_FB_REELS_SELECTORS) {
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
export function restoreSuppressedFacebookReelsElements(root = document) {
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
