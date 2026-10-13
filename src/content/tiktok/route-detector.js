/**
 * ScrollShield - TikTok Route Detector (Phase 5)
 *
 * Reliably classifies whether a given URL corresponds to the TikTok For You feed
 * versus Following feed, profiles, search, direct messages, individual videos, LIVE, etc.
 *
 * Supported For You Route Patterns:
 * - https://www.tiktok.com/foryou
 * - https://www.tiktok.com/foryou/
 * - https://www.tiktok.com/ (Only when explicit For You page context or tab parameter is confirmed)
 *
 * Explicitly Preserved Non-Feed Patterns:
 * - /@username (User profiles)
 * - /@username/video/{videoId} (Individual video pages)
 * - /video/{videoId} (Direct video pages)
 * - /search and /search/... (Search results)
 * - /messages, /inbox, /chat (Direct messaging)
 * - /following (Following feed)
 * - /live and /@username/live (LIVE broadcasts)
 */

/** Valid TikTok username pattern */
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{1,50}$/;

/** Valid TikTok video ID pattern (typically numeric identifier) */
const VIDEO_ID_REGEX = /^[0-9]{10,30}$/;

/** Supported TikTok hostnames */
const TIKTOK_HOSTNAMES = new Set([
  'tiktok.com',
  'www.tiktok.com',
  'm.tiktok.com',
  'v.tiktok.com',
  't.tiktok.com'
]);

/**
 * Checks if a hostname belongs to TikTok.
 * @param {string} hostname
 * @returns {boolean}
 */
export function isTikTokHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return TIKTOK_HOSTNAMES.has(normalized) || normalized.endsWith('.tiktok.com');
}

/**
 * Validates a TikTok username.
 * @param {string} raw
 * @returns {string | null}
 */
export function validateUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.startsWith('@') ? raw.slice(1) : raw;
  return USERNAME_REGEX.test(clean) ? clean : null;
}

/**
 * Validates a TikTok video ID.
 * @param {string} raw
 * @returns {string | null}
 */
export function validateVideoId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return VIDEO_ID_REGEX.test(trimmed) ? trimmed : trimmed.length > 0 ? trimmed : null;
}

/**
 * @typedef {Object} TikTokRouteDetectionResult
 * @property {'foryou' | 'following' | 'profile' | 'video' | 'search' | 'messages' | 'live' | 'root' | 'other'} category
 * @property {boolean} isForYouFeed - True if the route represents a confirmed For You feed
 * @property {string | null} username - User profile handle if present
 * @property {string | null} videoId - Individual video ID if present
 * @property {string} pathname - Parsed pathname for diagnostics
 */

/**
 * Inspects a URL and determines whether it represents a TikTok For You feed route.
 * Handles malformed URLs, query parameters, fragments, and trailing slashes safely.
 *
 * @param {string | URL} input
 * @param {{ isForYouActive?: boolean, hasForYouContext?: boolean }} [pageContext={}]
 * @returns {TikTokRouteDetectionResult}
 */
export function detectTikTokRoute(input, pageContext = {}) {
  const defaultResult = {
    category: 'other',
    isForYouFeed: false,
    username: null,
    videoId: null,
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
        parsedUrl = new URL(input, 'https://www.tiktok.com');
      } else {
        parsedUrl = new URL(input);
      }
    } else {
      return defaultResult;
    }
  } catch {
    return defaultResult;
  }

  if (!isTikTokHost(parsedUrl.hostname)) {
    return defaultResult;
  }

  const pathname = parsedUrl.pathname || '';
  defaultResult.pathname = pathname;

  const segments = pathname.split('/').filter(Boolean);

  // 1. Root route: /
  if (segments.length === 0) {
    // Check for explicit query parameter indication e.g. ?feed=foryou or ?tab=foryou
    const explicitFeedParam = parsedUrl.searchParams.get('feed');
    const explicitTabParam = parsedUrl.searchParams.get('tab');
    const isExplicitParamForYou =
      (explicitFeedParam && explicitFeedParam.toLowerCase() === 'foryou') ||
      (explicitTabParam && explicitTabParam.toLowerCase() === 'foryou');

    // Confirmed For You ONLY if explicit pageContext or explicit parameter is present
    if (
      isExplicitParamForYou ||
      pageContext.isForYouActive === true ||
      pageContext.hasForYouContext === true
    ) {
      return {
        category: 'foryou',
        isForYouFeed: true,
        username: null,
        videoId: null,
        pathname
      };
    }

    // Conservative default: Root route with insufficient evidence is left unblocked
    return {
      category: 'root',
      isForYouFeed: false,
      username: null,
      videoId: null,
      pathname
    };
  }

  const firstSegment = segments[0].toLowerCase();

  // 2. Dedicated For You Feed: /foryou or /foryou/
  if (firstSegment === 'foryou') {
    return {
      category: 'foryou',
      isForYouFeed: true,
      username: null,
      videoId: null,
      pathname
    };
  }

  // 3. Following Feed: /following
  if (firstSegment === 'following') {
    return {
      category: 'following',
      isForYouFeed: false,
      username: null,
      videoId: null,
      pathname
    };
  }

  // 4. Search: /search or /search/...
  if (firstSegment === 'search') {
    return {
      category: 'search',
      isForYouFeed: false,
      username: null,
      videoId: null,
      pathname
    };
  }

  // 5. Direct Messages / Inbox: /messages, /inbox, /chat
  if (firstSegment === 'messages' || firstSegment === 'inbox' || firstSegment === 'chat') {
    return {
      category: 'messages',
      isForYouFeed: false,
      username: null,
      videoId: null,
      pathname
    };
  }

  // 6. LIVE pages: /live
  if (firstSegment === 'live') {
    return {
      category: 'live',
      isForYouFeed: false,
      username: null,
      videoId: null,
      pathname
    };
  }

  // 7. Direct video routes: /video/{videoId}
  if (firstSegment === 'video') {
    const vid = segments[1] ? validateVideoId(segments[1]) : null;
    return {
      category: 'video',
      isForYouFeed: false,
      username: null,
      videoId: vid,
      pathname
    };
  }

  // 8. User profiles or profile-nested routes: /@username/...
  if (segments[0].startsWith('@')) {
    const rawUsername = segments[0].slice(1);
    const validUser = validateUsername(rawUsername);

    if (segments.length === 1) {
      return {
        category: 'profile',
        isForYouFeed: false,
        username: validUser,
        videoId: null,
        pathname
      };
    }

    const subSegment = segments[1].toLowerCase();

    // Individual video: /@username/video/{videoId}
    if (subSegment === 'video' && segments.length >= 3) {
      const vid = validateVideoId(segments[2]);
      return {
        category: 'video',
        isForYouFeed: false,
        username: validUser,
        videoId: vid,
        pathname
      };
    }

    // Profile LIVE: /@username/live
    if (subSegment === 'live') {
      return {
        category: 'live',
        isForYouFeed: false,
        username: validUser,
        videoId: null,
        pathname
      };
    }

    // Other profile subtabs (e.g. /@username/liked)
    return {
      category: 'profile',
      isForYouFeed: false,
      username: validUser,
      videoId: null,
      pathname
    };
  }

  return defaultResult;
}
