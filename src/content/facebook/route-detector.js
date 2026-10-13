/**
 * ScrollShield - Facebook Route Detector (Phase 4)
 *
 * Reliably classifies whether a given URL corresponds to a Facebook Reel route
 * versus normal Facebook destinations (watch, feed, Messenger, groups, pages, profiles, search).
 *
 * Supported Reel Route Patterns:
 * - https://www.facebook.com/reel/{ID}/
 * - https://www.facebook.com/reels/{ID}/
 * - https://www.facebook.com/reel/ (Reels feed)
 * - https://www.facebook.com/reels/ (Reels feed)
 * - https://m.facebook.com/reel/{ID}/
 *
 * Explicitly Preserved Non-Reel Patterns:
 * - /watch/ and /watch?v=... (Ordinary Facebook Watch videos)
 * - /messages/ and /messenger/ (Messenger conversations & inbox)
 * - /groups/{id}/ (Facebook Groups)
 * - /pages/... (Facebook Pages)
 * - /{username}/ and /profile.php (User profiles)
 * - /search/ (Facebook search)
 * - / (News feed)
 */

/** Valid Facebook Reel ID pattern (typically numeric or alphanumeric identifier, 5 to 35 chars) */
const REEL_ID_REGEX = /^[a-zA-Z0-9_-]{5,35}$/;

/** Supported Facebook hostnames */
const FACEBOOK_HOSTNAMES = new Set([
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com'
]);

/** Reserved root path segments that represent dedicated features or platforms */
const RESERVED_FEATURE_PATHS = new Set([
  'reel',
  'reels',
  'watch',
  'messages',
  'messenger',
  'groups',
  'pages',
  'pg',
  'search',
  'events',
  'gaming',
  'marketplace',
  'notifications',
  'settings',
  'help',
  'login',
  'recover',
  'privacy',
  'policies',
  'dialog',
  'plugins',
  'share'
]);

/**
 * Checks if a hostname belongs to Facebook.
 * @param {string} hostname
 * @returns {boolean}
 */
export function isFacebookHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return FACEBOOK_HOSTNAMES.has(normalized) || normalized.endsWith('.facebook.com');
}

/**
 * Validates a Facebook Reel ID string.
 * @param {string} rawId
 * @returns {string | null}
 */
export function validateReelId(rawId) {
  if (!rawId || typeof rawId !== 'string') return null;
  const trimmed = rawId.trim();
  return REEL_ID_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * @typedef {Object} FacebookRouteDetectionResult
 * @property {'reel_detail' | 'reels_feed' | 'watch' | 'feed' | 'messenger' | 'group' | 'page' | 'profile' | 'search' | 'other'} category
 * @property {boolean} isReel - True if the URL represents an active Reel route
 * @property {string | null} reelId - Validated Reel ID if present
 * @property {string} pathname - Parsed pathname for diagnostics
 */

/**
 * Inspects a URL and determines whether it represents a Facebook Reel route.
 * Handles malformed URLs, query parameters, fragments, and trailing slashes safely.
 *
 * @param {string | URL} input
 * @returns {FacebookRouteDetectionResult}
 */
export function detectFacebookRoute(input) {
  const defaultResult = {
    category: 'other',
    isReel: false,
    reelId: null,
    pathname: ''
  };

  if (!input) {
    return defaultResult;
  }

  let parsedUrl;
  try {
    if (input instanceof URL) {
      parsedUrl = input;
    } else if (typeof input === 'string') {
      if (input.startsWith('/')) {
        parsedUrl = new URL(input, 'https://www.facebook.com');
      } else {
        parsedUrl = new URL(input);
      }
    } else {
      return defaultResult;
    }
  } catch {
    return defaultResult;
  }

  if (!isFacebookHost(parsedUrl.hostname)) {
    return defaultResult;
  }

  const pathname = parsedUrl.pathname || '';
  defaultResult.pathname = pathname;

  const segments = pathname.split('/').filter(Boolean);

  // 1. Home / Feed: empty path or root
  if (segments.length === 0) {
    return {
      category: 'feed',
      isReel: false,
      reelId: null,
      pathname
    };
  }

  const firstSegment = segments[0].toLowerCase();

  // 2. Messenger: /messages/ or /messenger/ (Explicitly protected)
  if (firstSegment === 'messages' || firstSegment === 'messenger') {
    return {
      category: 'messenger',
      isReel: false,
      reelId: null,
      pathname
    };
  }

  // 3. Dedicated Reel routes: /reel/{id} or /reels/{id}
  if (firstSegment === 'reel' || firstSegment === 'reels') {
    if (segments.length === 1) {
      // Reels feed / tab: /reel or /reels/
      return {
        category: 'reels_feed',
        isReel: true,
        reelId: null,
        pathname
      };
    }

    const rawId = segments[1];
    const validatedId = validateReelId(rawId);
    return {
      category: 'reel_detail',
      isReel: true,
      reelId: validatedId,
      pathname
    };
  }

  // 4. Normal Watch / Videos: /watch/ or /watch?v=...
  if (firstSegment === 'watch') {
    return {
      category: 'watch',
      isReel: false,
      reelId: null,
      pathname
    };
  }

  // 5. Groups: /groups/{id}/
  if (firstSegment === 'groups') {
    return {
      category: 'group',
      isReel: false,
      reelId: null,
      pathname
    };
  }

  // 6. Pages: /pages/ or /pg/
  if (firstSegment === 'pages' || firstSegment === 'pg') {
    return {
      category: 'page',
      isReel: false,
      reelId: null,
      pathname
    };
  }

  // 7. Search: /search/
  if (firstSegment === 'search') {
    return {
      category: 'search',
      isReel: false,
      reelId: null,
      pathname
    };
  }

  // 8. User profiles: /{username}/ or /profile.php
  if (firstSegment === 'profile.php') {
    return {
      category: 'profile',
      isReel: false,
      reelId: null,
      pathname
    };
  }

  if (!RESERVED_FEATURE_PATHS.has(firstSegment) && segments.length === 1) {
    return {
      category: 'profile',
      isReel: false,
      reelId: null,
      pathname
    };
  }

  return defaultResult;
}
