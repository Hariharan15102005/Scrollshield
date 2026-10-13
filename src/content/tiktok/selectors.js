/**
 * ScrollShield - TikTok DOM Selectors & For You Entry Suppression (Phase 5)
 *
 * Maintenance Strategy & Guidelines:
 * 1. Semantic First: Target dedicated For You navigation anchors and tabs directly
 *    (e.g. a[href="/foryou"], a[href^="/foryou"], [data-e2e="nav-foryou"]).
 * 2. Conservative Scope: Never select broad content containers (e.g. navigation bars,
 *    #app, [role="main"], [role="navigation"]) that host Following, search, DMs, or profiles.
 * 3. Never Hide Unrelated Media: Do not hide standard search videos, profile grids,
 *    or direct message interfaces.
 * 4. Idempotence: Elements marked for suppression receive [data-scrollshield-hidden="true"]
 *    allowing clean restoration when blocking is disabled.
 * 5. Evolution Fallback: If TikTok alters internal navigation markup, the selectors
 *    safely match zero elements, leaving normal browsing intact.
 */

/**
 * Selectors targeting dedicated For You navigation items in TikTok sidebars/headers.
 */
export const TIKTOK_FORYOU_NAVIGATION_SELECTORS = [
  'a[href="/foryou"]',
  'a[href="/foryou/"]',
  'a[href^="/foryou"]',
  'a[data-e2e="nav-foryou"]'
];

/**
 * Selectors targeting dedicated For You tabs.
 */
export const TIKTOK_FORYOU_TAB_SELECTORS = [
  'div[role="tablist"] a[href*="/foryou"]',
  'a[role="tab"][href*="/foryou"]'
];

/**
 * Combined list of supported TikTok For You entry selectors.
 */
export const ALL_TIKTOK_FORYOU_SELECTORS = [
  ...TIKTOK_FORYOU_NAVIGATION_SELECTORS,
  ...TIKTOK_FORYOU_TAB_SELECTORS
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
 * Validates that an element is safe to hide and does not contain profiles, search, Following, or messages.
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

  // Never hide containers that include search, messages, profiles, or Following links
  if (
    element.querySelector(
      'a[href*="/search"], a[href*="/messages"], a[href*="/inbox"], a[href*="/following"], a[href*="/live"], a[href^="/@"]'
    )
  ) {
    return false;
  }

  return true;
}

/**
 * Generates scoped CSS for declarative For You feed entry hiding.
 * Active only when html[data-scrollshield-tiktok-foryou-blocked="true"] is set.
 * @param {string} rootAttribute - The attribute placed on <html>
 * @returns {string} Scoped CSS text
 */
export function generateTikTokForYouSuppressionCss(rootAttribute = 'data-scrollshield-tiktok-foryou-blocked') {
  const selectorList = ALL_TIKTOK_FORYOU_SELECTORS
    .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
    .join(',\n');

  return `
/* ScrollShield - Declarative TikTok For You Suppression (Phase 5) */
${selectorList} {
  display: none !important;
}
`.trim();
}

/**
 * Suppresses identifiable For You entry elements inside a given root (idempotent).
 * @param {ParentNode} root
 * @returns {number} Count of elements suppressed
 */
export function suppressTikTokForYouElements(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;

  let suppressedCount = 0;

  for (const selector of ALL_TIKTOK_FORYOU_SELECTORS) {
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
 * Restores previously suppressed elements when For You blocking is toggled off.
 * @param {ParentNode} root
 * @returns {number} Count of elements restored
 */
export function restoreSuppressedTikTokForYouElements(root = document) {
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
