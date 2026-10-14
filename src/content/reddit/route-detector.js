/**
 * ScrollShield - Reddit Route Detector (Phase 6B)
 *
 * Reliably classifies whether a given URL corresponds to a blocked endless feed
 * (Home feed, Popular feed, All feed) versus specific community subreddits,
 * individual posts/comments, search results, chat, messages, user profiles, etc.
 *
 * Supported Feed Route Patterns (Blocked when redditFeedsEnabled is true):
 * - https://www.reddit.com/ (Home feed)
 * - https://www.reddit.com/popular, /popular/
 * - https://www.reddit.com/r/popular, /r/popular/
 * - https://www.reddit.com/r/all, /r/all/
 * - https://www.reddit.com/best, /hot, /new, /top (Root Home feed sorting views)
 *
 * Explicitly Preserved Community & Utility Patterns (NEVER Blocked):
 * - Specific Subreddits: /r/{subreddit}/ (e.g. /r/programming/, /r/AskReddit/)
 * - Subreddit sort filters: /r/{subreddit}/top/, /r/{subreddit}/hot/, etc.
 * - Individual Posts & Comments: /r/{subreddit}/comments/{id}/..., /comments/{id}/...
 * - Search: /search, /search/..., /r/{subreddit}/search
 * - Messages & Chat: /message/inbox, /message/messages, /chat
 * - User Profiles & History: /user/{username}/, /u/{username}/, /user/{username}/saved
 * - Settings & Notifications: /settings, /notifications
 */

/** Valid Reddit subreddit name pattern (2 to 30 alphanumeric characters or underscore) */
const SUBREDDIT_REGEX = /^[a-zA-Z0-9_]{2,30}$/;

/** Valid Reddit post ID pattern (alphanumeric string, usually base36 Snowflake ID) */
const POST_ID_REGEX = /^[a-zA-Z0-9]{4,15}$/;

/** Valid Reddit username pattern */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

/** Root-level feed sorting paths */
const ROOT_FEED_SORTS = new Set(['best', 'hot', 'new', 'top', 'rising']);

/** Supported Reddit hostnames */
const REDDIT_HOSTNAMES = new Set([
  'reddit.com',
  'www.reddit.com',
  'old.reddit.com',
  'new.reddit.com',
  'sh.reddit.com',
  'm.reddit.com'
]);

/**
 * Checks if a hostname belongs to Reddit.
 * @param {string} hostname
 * @returns {boolean}
 */
export function isRedditHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return (
    REDDIT_HOSTNAMES.has(normalized) ||
    normalized.endsWith('.reddit.com')
  );
}

/**
 * Validates a subreddit identifier.
 * @param {string} raw
 * @returns {string | null}
 */
export function validateSubreddit(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim();
  return SUBREDDIT_REGEX.test(clean) ? clean : null;
}

/**
 * Validates a post ID.
 * @param {string} raw
 * @returns {string | null}
 */
export function validatePostId(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim();
  return POST_ID_REGEX.test(clean) ? clean : null;
}

/**
 * @typedef {Object} RedditRouteDetectionResult
 * @property {'home' | 'popular' | 'all' | 'subreddit' | 'post' | 'search' | 'messages' | 'profile' | 'settings' | 'other'} category
 * @property {boolean} isBlockedFeed - True if the route represents Home, Popular, or All feeds
 * @property {string | null} subreddit - Subreddit name if present
 * @property {string | null} postId - Individual post ID if present
 * @property {string} pathname - Parsed pathname for diagnostics
 */

/**
 * Inspects a URL and determines whether it represents a blocked Reddit feed route.
 * Handles malformed URLs, query parameters, fragments, and trailing slashes safely.
 *
 * @param {string | URL} input
 * @returns {RedditRouteDetectionResult}
 */
export function detectRedditRoute(input) {
  const defaultResult = {
    category: 'other',
    isBlockedFeed: false,
    subreddit: null,
    postId: null,
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
        parsedUrl = new URL(input, 'https://www.reddit.com');
      } else {
        parsedUrl = new URL(input);
      }
    } else {
      return defaultResult;
    }
  } catch {
    return defaultResult;
  }

  if (!isRedditHost(parsedUrl.hostname)) {
    return defaultResult;
  }

  const pathname = parsedUrl.pathname || '';
  defaultResult.pathname = pathname;

  const segments = pathname.split('/').filter(Boolean);

  // 1. Root route: / -> Home Feed
  if (segments.length === 0) {
    return {
      category: 'home',
      isBlockedFeed: true,
      subreddit: null,
      postId: null,
      pathname
    };
  }

  const firstSegment = segments[0].toLowerCase();

  // 2. Root Feed Sorting Views: /best, /hot, /new, /top, /rising
  if (segments.length === 1 && ROOT_FEED_SORTS.has(firstSegment)) {
    return {
      category: 'home',
      isBlockedFeed: true,
      subreddit: null,
      postId: null,
      pathname
    };
  }

  // 3. Popular Feed: /popular, /popular/
  if (firstSegment === 'popular') {
    return {
      category: 'popular',
      isBlockedFeed: true,
      subreddit: 'popular',
      postId: null,
      pathname
    };
  }

  // 4. Subreddit-prefixed routes: /r/...
  if (firstSegment === 'r' && segments.length >= 2) {
    const rawSubreddit = segments[1].toLowerCase();

    // /r/all, /r/all/
    if (rawSubreddit === 'all') {
      return {
        category: 'all',
        isBlockedFeed: true,
        subreddit: 'all',
        postId: null,
        pathname
      };
    }

    // /r/popular, /r/popular/
    if (rawSubreddit === 'popular') {
      return {
        category: 'popular',
        isBlockedFeed: true,
        subreddit: 'popular',
        postId: null,
        pathname
      };
    }

    // Check for comments / post: /r/{sub}/comments/{id}/...
    if (segments.length >= 4 && segments[2].toLowerCase() === 'comments') {
      const postId = validatePostId(segments[3]);
      return {
        category: 'post',
        isBlockedFeed: false,
        subreddit: validateSubreddit(segments[1]),
        postId,
        pathname
      };
    }

    // Check for subreddit search: /r/{sub}/search
    if (segments.length >= 3 && segments[2].toLowerCase() === 'search') {
      return {
        category: 'search',
        isBlockedFeed: false,
        subreddit: validateSubreddit(segments[1]),
        postId: null,
        pathname
      };
    }

    // Any specific community subreddit: /r/{subreddit}/ or /r/{subreddit}/top/ etc.
    const validSub = validateSubreddit(segments[1]);
    if (validSub) {
      return {
        category: 'subreddit',
        isBlockedFeed: false,
        subreddit: validSub,
        postId: null,
        pathname
      };
    }
  }

  // 5. Standalone Comments / Post route: /comments/{id}/...
  if (firstSegment === 'comments' && segments.length >= 2) {
    const postId = validatePostId(segments[1]);
    return {
      category: 'post',
      isBlockedFeed: false,
      subreddit: null,
      postId,
      pathname
    };
  }

  // 6. Search: /search, /search/
  if (firstSegment === 'search') {
    return {
      category: 'search',
      isBlockedFeed: false,
      subreddit: null,
      postId: null,
      pathname
    };
  }

  // 7. Messages and Chat: /message, /chat
  if (firstSegment === 'message' || firstSegment === 'chat') {
    return {
      category: 'messages',
      isBlockedFeed: false,
      subreddit: null,
      postId: null,
      pathname
    };
  }

  // 8. User profiles and history: /user/{username}/, /u/{username}/
  if (firstSegment === 'user' || firstSegment === 'u') {
    return {
      category: 'profile',
      isBlockedFeed: false,
      subreddit: null,
      postId: null,
      pathname
    };
  }

  // 9. Settings and Notifications
  if (firstSegment === 'settings' || firstSegment === 'notifications') {
    return {
      category: 'settings',
      isBlockedFeed: false,
      subreddit: null,
      postId: null,
      pathname
    };
  }

  // 10. Other unknown or utility routes
  return {
    category: 'other',
    isBlockedFeed: false,
    subreddit: null,
    postId: null,
    pathname
  };
}
