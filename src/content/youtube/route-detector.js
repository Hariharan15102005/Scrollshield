/**
 * ScrollShield - YouTube Route Detector (Phase 2)
 *
 * Reliably classifies whether a given URL corresponds to a YouTube Shorts route
 * versus normal YouTube pages (watch, search, subscriptions, channel, playlist).
 *
 * Supported Shorts Route Patterns:
 * - https://www.youtube.com/shorts/{VIDEO_ID}
 * - https://m.youtube.com/shorts/{VIDEO_ID}
 * - https://youtube.com/shorts/{VIDEO_ID}
 * - https://www.youtube.com/shorts/ (root Shorts player)
 * - Queries and hashes: /shorts/{VIDEO_ID}?feature=share#time=10s
 *
 * Explicitly Excluded Patterns:
 * - /watch?v=... (even with &q=shorts or comments about shorts)
 * - /results?search_query=shorts
 * - /feed/subscriptions
 * - /@channel
 * - /channel/CHANNEL_ID
 * - /playlist?list=PLAYLIST_ID
 * - Non-YouTube hostnames (e.g. https://example.com/shorts/123)
 */

/** Valid YouTube video ID pattern (typically 11 characters alphanumeric, hyphen, underscore) */
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{6,16}$/;

/** Supported YouTube hostnames */
const YOUTUBE_HOSTNAMES = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com'
]);

/**
 * Checks if a hostname belongs to YouTube.
 * @param {string} hostname
 * @returns {boolean}
 */
export function isYouTubeHost(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase();
  return YOUTUBE_HOSTNAMES.has(normalized) || normalized.endsWith('.youtube.com');
}

/**
 * Parses a YouTube video ID from a string, ensuring it is alphanumeric and safe.
 * @param {string} rawId
 * @returns {string | null}
 */
export function validateVideoId(rawId) {
  if (!rawId || typeof rawId !== 'string') return null;
  const trimmed = rawId.trim();
  return VIDEO_ID_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * @typedef {Object} RouteDetectionResult
 * @property {boolean} isShorts - True if the URL represents an active Shorts route
 * @property {string | null} videoId - The extracted Shorts video ID, if present and valid
 * @property {string | null} canonicalWatchUrl - A safe /watch?v= URL if videoId is valid, else null
 * @property {string} pathname - Parsed pathname for diagnostic logging
 */

/**
 * Inspects a URL and determines whether it represents a YouTube Shorts route.
 * Handles malformed URLs, query parameters, and fragments safely without throwing.
 *
 * @param {string | URL} input
 * @returns {RouteDetectionResult}
 */
export function detectYouTubeRoute(input) {
  const defaultResult = {
    isShorts: false,
    videoId: null,
    canonicalWatchUrl: null,
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
      // Handle relative paths when tested or running within window.location
      if (input.startsWith('/')) {
        parsedUrl = new URL(input, 'https://www.youtube.com');
      } else {
        parsedUrl = new URL(input);
      }
    } else {
      return defaultResult;
    }
  } catch {
    // Malformed URL, fail safe
    return defaultResult;
  }

  // Ensure hostname is YouTube
  if (!isYouTubeHost(parsedUrl.hostname)) {
    return defaultResult;
  }

  const pathname = parsedUrl.pathname || '';
  defaultResult.pathname = pathname;

  // Normalise path segments (split by '/', filter empty)
  const segments = pathname.split('/').filter(Boolean);

  // Check if first segment is exactly 'shorts'
  // (Prevents matching /feed/shorts_explore or /results?search_query=shorts or /watch?v=shorts)
  if (segments.length === 0 || segments[0].toLowerCase() !== 'shorts') {
    return defaultResult;
  }

  // Case 1: /shorts or /shorts/ (YouTube defaults to the first short)
  if (segments.length === 1) {
    return {
      isShorts: true,
      videoId: null,
      canonicalWatchUrl: null,
      pathname
    };
  }

  // Case 2: /shorts/{VIDEO_ID}
  const rawVideoId = segments[1];
  const validatedId = validateVideoId(rawVideoId);

  return {
    isShorts: true,
    videoId: validatedId,
    canonicalWatchUrl: validatedId ? `https://www.youtube.com/watch?v=${validatedId}` : null,
    pathname
  };
}
