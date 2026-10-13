/**
 * ScrollShield - X (Twitter) Route Detector (Phase 6A)
 *
 * Reliably classifies whether a given URL corresponds to the X Home timeline
 * versus Explore, Notifications, Messages, Profiles, Status/Post views, Lists, etc.
 *
 * Supported Home Route Patterns:
 * - https://x.com/home
 * - https://twitter.com/home
 * - https://x.com/ (Only when explicit Home page context or tab parameter is confirmed)
 *
 * Explicitly Preserved Non-Home Patterns:
 * - /explore and /search (Search and discovery)
 * - /notifications (Activity and mentions)
 * - /messages (Direct messaging)
 * - /{username} (User profiles, e.g. /elonmusk)
 * - /{username}/status/{id} (Individual posts/tweets)
 * - /i/lists and /i/communities (Lists & communities)
 * - /settings, /bookmarks, etc. (Utility pages)
 */

/** Valid Twitter/X username handle pattern (1 to 15 alphanumeric characters or underscore) */
const USERNAME_REGEX = /^[a-zA-Z0-9_]{1,15}$/;

/** Valid Twitter/X status ID pattern (numeric Snowflake ID) */
const STATUS_ID_REGEX = /^[0-9]{1,30}$/;

/** Reserved single-segment paths that are NOT user profile handles */
const RESERVED_FIRST_SEGMENTS = new Set([
  'home',
  'explore',
  'search',
  'notifications',
  'messages',
  'i',
  'settings',
  'bookmarks',
  'compose',
  'login',
  'logout',
  'intent',
  'share',
  'tos',
  'privacy',
  'about',
  'help',
  'jobs',
  'download'
]);

/** Supported X / Twitter hostnames */
const X_HOSTNAMES = new Set([
  'x.com',
  'www.x.com',
  'mobile.x.com',
  'twitter.com',
  'www.twitter.com',
  'mobile.twitter.com',
  'm.twitter.com'
]);

/**
 * Checks if a hostname belongs to X or Twitter.
 * @param {string} hostname
 * @returns {boolean}
 */
export function isXHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return (
    X_HOSTNAMES.has(normalized) ||
    normalized.endsWith('.x.com') ||
    normalized.endsWith('.twitter.com')
  );
}

/**
 * Validates an X username.
 * @param {string} raw
 * @returns {string | null}
 */
export function validateUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.startsWith('@') ? raw.slice(1) : raw;
  return USERNAME_REGEX.test(clean) && !RESERVED_FIRST_SEGMENTS.has(clean.toLowerCase())
    ? clean
    : null;
}

/**
 * Validates a status ID.
 * @param {string} raw
 * @returns {string | null}
 */
export function validateStatusId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return STATUS_ID_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * @typedef {Object} XRouteDetectionResult
 * @property {'home' | 'explore' | 'notifications' | 'messages' | 'profile' | 'post' | 'lists' | 'root' | 'other'} category
 * @property {boolean} isHomeTimeline - True if the route represents a confirmed Home timeline
 * @property {string | null} username - User profile handle if present
 * @property {string | null} statusId - Individual post status ID if present
 * @property {string} pathname - Parsed pathname for diagnostics
 */

/**
 * Inspects a URL and determines whether it represents an X Home timeline route.
 * Handles malformed URLs, query parameters, fragments, and trailing slashes safely.
 *
 * @param {string | URL} input
 * @param {{ isHomeActive?: boolean, hasHomeContext?: boolean }} [pageContext={}]
 * @returns {XRouteDetectionResult}
 */
export function detectXRoute(input, pageContext = {}) {
  const defaultResult = {
    category: 'other',
    isHomeTimeline: false,
    username: null,
    statusId: null,
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
        parsedUrl = new URL(input, 'https://x.com');
      } else {
        parsedUrl = new URL(input);
      }
    } else {
      return defaultResult;
    }
  } catch {
    return defaultResult;
  }

  if (!isXHost(parsedUrl.hostname)) {
    return defaultResult;
  }

  const pathname = parsedUrl.pathname || '';
  defaultResult.pathname = pathname;

  const segments = pathname.split('/').filter(Boolean);

  // 1. Root route: /
  if (segments.length === 0) {
    const explicitFeedParam = parsedUrl.searchParams.get('feed');
    const explicitTabParam = parsedUrl.searchParams.get('tab');
    const isExplicitParamHome =
      (explicitFeedParam && explicitFeedParam.toLowerCase() === 'home') ||
      (explicitTabParam && explicitTabParam.toLowerCase() === 'home');

    if (
      isExplicitParamHome ||
      pageContext.isHomeActive === true ||
      pageContext.hasHomeContext === true
    ) {
      return {
        category: 'home',
        isHomeTimeline: true,
        username: null,
        statusId: null,
        pathname
      };
    }

    // Conservative default: Root route with insufficient evidence is left unblocked
    return {
      category: 'root',
      isHomeTimeline: false,
      username: null,
      statusId: null,
      pathname
    };
  }

  const firstSegment = segments[0].toLowerCase();

  // 2. Dedicated Home Timeline: /home or /home/
  if (firstSegment === 'home') {
    return {
      category: 'home',
      isHomeTimeline: true,
      username: null,
      statusId: null,
      pathname
    };
  }

  // 3. Explore & Search: /explore, /search
  if (firstSegment === 'explore' || firstSegment === 'search') {
    return {
      category: 'explore',
      isHomeTimeline: false,
      username: null,
      statusId: null,
      pathname
    };
  }

  // 4. Notifications: /notifications
  if (firstSegment === 'notifications') {
    return {
      category: 'notifications',
      isHomeTimeline: false,
      username: null,
      statusId: null,
      pathname
    };
  }

  // 5. Messages: /messages or /i/chat
  if (
    firstSegment === 'messages' ||
    (firstSegment === 'i' && segments[1] && segments[1].toLowerCase() === 'chat')
  ) {
    return {
      category: 'messages',
      isHomeTimeline: false,
      username: null,
      statusId: null,
      pathname
    };
  }

  // 6. Lists & Communities: /i/lists, /i/communities
  if (
    firstSegment === 'i' &&
    segments[1] &&
    (segments[1].toLowerCase() === 'lists' || segments[1].toLowerCase() === 'communities')
  ) {
    return {
      category: 'lists',
      isHomeTimeline: false,
      username: null,
      statusId: null,
      pathname
    };
  }

  // 7. Individual status posts under /i/status/{id}
  if (firstSegment === 'i' && segments[1] && segments[1].toLowerCase() === 'status') {
    const statusId = validateStatusId(segments[2]);
    return {
      category: 'post',
      isHomeTimeline: false,
      username: null,
      statusId,
      pathname
    };
  }

  // 8. Individual status posts under /{username}/status/{id}
  if (segments.length >= 3 && segments[1].toLowerCase() === 'status') {
    const username = validateUsername(segments[0]);
    const statusId = validateStatusId(segments[2]);
    return {
      category: 'post',
      isHomeTimeline: false,
      username,
      statusId,
      pathname
    };
  }

  // 9. Lists under /{username}/lists
  if (segments.length >= 2 && segments[1].toLowerCase() === 'lists') {
    const username = validateUsername(segments[0]);
    return {
      category: 'lists',
      isHomeTimeline: false,
      username,
      statusId: null,
      pathname
    };
  }

  // 10. User profile: /{username} or subroutes like /{username}/with_replies, /{username}/media, etc.
  const profileUsername = validateUsername(segments[0]);
  if (profileUsername) {
    return {
      category: 'profile',
      isHomeTimeline: false,
      username: profileUsername,
      statusId: null,
      pathname
    };
  }

  // 11. Other unknown or unblocked utility routes
  return {
    category: 'other',
    isHomeTimeline: false,
    username: null,
    statusId: null,
    pathname
  };
}
