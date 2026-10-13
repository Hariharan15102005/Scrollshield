/**
 * ScrollShield - YouTube DOM Selectors & Shelf Suppression Module (Phase 2)
 *
 * Maintenance Strategy & Guidelines:
 * 1. Semantic First: Always prefer custom elements with semantic names or attributes
 *    (e.g. ytd-reel-shelf-renderer, ytd-rich-shelf-renderer[is-shorts]).
 * 2. Conservative Scope: Never select broad content containers (e.g. ytd-rich-grid-renderer,
 *    #contents, ytd-section-list-renderer) that host regular videos.
 * 3. Verified Ancestors: For navigation items, match the specific guide entry element containing
 *    an anchor referencing /shorts, rather than the entire sidebar or guide section.
 * 4. Idempotence: Elements marked for suppression receive a custom data attribute:
 *    [data-scrollshield-hidden="true"], allowing clean restoration when blocking is toggled off.
 * 5. Evolution Fallback: If YouTube modifies internal custom element tags, the CSS and JS selectors
 *    will simply match zero elements, safely leaving normal browsing functional without errors.
 */

/**
 * Verified selectors targeting identifiable Shorts shelves and grids.
 */
export const SHORTS_SHELF_SELECTORS = [
  // Semantic YouTube attribute for rich section shelves hosting Shorts
  'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
  // Classic/alternate reel shelf container used across search and channel tabs
  'ytd-reel-shelf-renderer',
  // Direct shelf element when not wrapped in rich-section
  'ytd-rich-shelf-renderer[is-shorts]'
];

/**
 * Verified selectors targeting Shorts navigation links in sidebars and bottom bars.
 */
export const SHORTS_NAVIGATION_SELECTORS = [
  // Main expanded desktop navigation sidebar item pointing to /shorts
  'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
  // Collapsed desktop mini-sidebar item pointing to /shorts
  'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
  // Mobile / responsive bottom pivot bar item
  'ytm-pivot-bar-item-renderer:has(a[href^="/shorts"])'
];

/**
 * Combined list of all supported Shorts-specific selectors.
 */
export const ALL_SHORTS_SELECTORS = [
  ...SHORTS_SHELF_SELECTORS,
  ...SHORTS_NAVIGATION_SELECTORS
];

/**
 * Elements that must NEVER be hidden under any circumstances, as they contain regular videos.
 */
const PROTECTED_TAG_NAMES = new Set([
  'YTD-APP',
  'YTD-BROWSE',
  'YTD-SEARCH',
  'YTD-WATCH-FLEXY',
  'YTD-RICH-GRID-RENDERER',
  'YTD-SECTION-LIST-RENDERER',
  'YTD-ITEM-SECTION-RENDERER',
  'BODY',
  'HTML'
]);

/**
 * Validates that an element is safe to hide and does not contain regular videos.
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

  // Ensure element does not contain regular video renderers
  if (element.querySelector('ytd-video-renderer, ytd-rich-item-renderer:not(:has(a[href^="/shorts"]))')) {
    return false;
  }

  return true;
}

/**
 * Generates scoped CSS for declarative hiding.
 * Active only when html[data-scrollshield-shorts-blocked="true"] is set.
 * @param {string} rootAttribute - The attribute placed on <html> (default: data-scrollshield-shorts-blocked)
 * @returns {string} Scoped CSS text
 */
export function generateShortsSuppressionCss(rootAttribute = 'data-scrollshield-shorts-blocked') {
  const selectorList = ALL_SHORTS_SELECTORS
    .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
    .join(',\n');

  return `
/* ScrollShield - Declarative YouTube Shorts Suppression (Phase 2) */
${selectorList} {
  display: none !important;
}
`.trim();
}

/**
 * Suppresses identifiable Shorts elements inside a given root (idempotent).
 * @param {ParentNode} root
 * @returns {number} Count of elements suppressed
 */
export function suppressShortsElements(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return 0;

  let suppressedCount = 0;

  for (const selector of ALL_SHORTS_SELECTORS) {
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
      // Browser might not support :has() or selector syntax changed; fail safely
    }
  }

  return suppressedCount;
}

/**
 * Restores previously suppressed elements when Shorts blocking is toggled off.
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
    // Fail safely
  }

  return restoredCount;
}
