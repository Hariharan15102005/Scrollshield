/**
 * ScrollShield - Instagram Route Detector (Phase 3)
 *
 * Reliably classifies whether a given URL corresponds to an Instagram Reel route
 * versus normal Instagram pages (posts, profiles, DMs, explore, stories).
 *
 * Supported Reel Route Patterns:
 * - https://www.instagram.com/reel/{SHORTCODE}/
 * - https://www.instagram.com/reels/{SHORTCODE}/
 * - https://www.instagram.com/reels/ (dedicated Reels feed)
 *
 * Explicitly Preserved Non-Reel Patterns:
 * - /p/{SHORTCODE}/ (Normal feed photo/video posts)
 * - /direct/ and /direct/t/{THREAD_ID}/ (Direct Messages)
 * - /{username}/ (User profiles)
 * - /explore/ (Search & Explore grid)
 * - /stories/{username}/ (Stories)
 */

/** Valid Instagram shortcode pattern (typically 11 characters base64url alphanumeric, hyphen, underscore) */
const SHORTCODE_REGEX = /^[a-zA-Z0-9_-]{5,35}$/;

/** Valid Instagram username pattern */
const USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

/** Supported Instagram hostnames */
const INSTAGRAM_HOSTNAMES = new Set([
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com'
]);

/** Reserved root path segments that do not represent user profiles */
const RESERVED_ROOT_PATHS = new Set([
  'p',
  'reel',
  'reels',
  'direct',
  'explore',
  'stories',
  'accounts',
  'emails',
  'about',
  'legal',
  'developer',
  'api',
  'graphql',
  'directory',
  'terms',
  'privacy'
]);

/**
 * Checks if a hostname belongs to Instagram.
 * @param {string} hostname
 * @returns {boolean}
 */
export function isInstagramHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return INSTAGRAM_HOSTNAMES.has(normalized) || normalized.endsWith('.instagram.com');
}

/**
 * Validates an Instagram shortcode string.
 * @param {string} rawShortcode
 * @returns {string | null}
 */
export function validateShortcode(rawShortcode) {
  if (!rawShortcode || typeof rawShortcode !== 'string') return null;
  const trimmed = rawShortcode.trim();
  return SHORTCODE_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Validates an Instagram username string.
 * @param {string} rawUsername
 * @returns {string | null}
 */
export function validateUsername(rawUsername) {
  if (!rawUsername || typeof rawUsername !== 'string') return null;
  const trimmed = rawUsername.trim();
  if (RESERVED_ROOT_PATHS.has(trimmed.toLowerCase())) return null;
  return USERNAME_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * @typedef {Object} InstagramRouteDetectionResult
 * @property {'reel_detail' | 'reels_feed' | 'post' | 'profile' | 'direct' | 'explore' | 'stories' | 'other'} category
 * @property {boolean} isReel - True if the URL represents an active Reel route
 * @property {string | null} shortcode - The validated Reel or Post shortcode if available
 * @property {string | null} username - The validated username if on a profile route
 * @property {string} pathname - Parsed pathname for diagnostics
 */

/**
 * Inspects a URL and determines whether it represents an Instagram Reel route.
 * Handles malformed URLs, query parameters, trailing slashes, and fragments safely without throwing.
 *
 * @param {string | URL} input
 * @returns {InstagramRouteDetectionResult}
 */
export function detectInstagramRoute(input) {
  const defaultResult = {
    category: 'other',
    isReel: false,
    shortcode: null,
    username: null,
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
        parsedUrl = new URL(input, 'https://www.instagram.com');
      } else {
        parsedUrl = new URL(input);
      }
    } else {
      return defaultResult;
    }
  } catch {
    return defaultResult;
  }

  if (!isInstagramHost(parsedUrl.hostname)) {
    return defaultResult;
  }

  const pathname = parsedUrl.pathname || '';
  defaultResult.pathname = pathname;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return {
      category: 'other',
      isReel: false,
      shortcode: null,
      username: null,
      pathname
    };
  }

  const firstSegment = segments[0].toLowerCase();

  // 1. Reel detail routes: /reel/{shortcode}/ or /reels/{shortcode}/
  if (firstSegment === 'reel' || (firstSegment === 'reels' && segments.length > 1)) {
    const rawCode = segments[1];
    const validatedCode = validateShortcode(rawCode);
    return {
      category: 'reel_detail',
      isReel: true,
      shortcode: validatedCode,
      username: null,
      pathname
    };
  }

  // 2. Dedicated Reels feed route: /reels or /reels/
  if (firstSegment === 'reels' && segments.length === 1) {
    return {
      category: 'reels_feed',
      isReel: true,
      shortcode: null,
      username: null,
      pathname
    };
  }

  // 3. Normal photo/video post: /p/{shortcode}/
  if (firstSegment === 'p') {
    const rawCode = segments[1];
    const validatedCode = validateShortcode(rawCode);
    return {
      category: 'post',
      isReel: false,
      shortcode: validatedCode,
      username: null,
      pathname
    };
  }

  // 4. Direct Messages: /direct/ or /direct/t/{thread_id}/
  if (firstSegment === 'direct') {
    return {
      category: 'direct',
      isReel: false,
      shortcode: null,
      username: null,
      pathname
    };
  }

  // 5. Explore & Search: /explore/
  if (firstSegment === 'explore') {
    return {
      category: 'explore',
      isReel: false,
      shortcode: null,
      username: null,
      pathname
    };
  }

  // 6. Stories: /stories/{username}/
  if (firstSegment === 'stories') {
    const username = segments.length > 1 ? validateUsername(segments[1]) : null;
    return {
      category: 'stories',
      isReel: false,
      shortcode: null,
      username,
      pathname
    };
  }

  // 7. User profile: /{username}/
  const validProfile = validateUsername(segments[0]);
  if (validProfile && segments.length === 1) {
    return {
      category: 'profile',
      isReel: false,
      shortcode: null,
      username: validProfile,
      pathname
    };
  }

  return defaultResult;
}
