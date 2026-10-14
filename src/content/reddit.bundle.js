/**
 * ScrollShield - Reddit Content Script Bundle (Phase 6B)
 *
 * Self-contained bundle for Chrome Manifest V3 content script injection.
 * Operates in isolated world without external runtime dependencies.
 */
(() => {
  'use strict';

  /* ==========================================================================
     1. Settings Management Layer
     ========================================================================== */

  const DEFAULT_SETTINGS = Object.freeze({
    youtubeShortsEnabled: true,
    instagramReelsEnabled: true,
    facebookReelsEnabled: true,
    tiktokForYouEnabled: true,
    xHomeFeedEnabled: true,
    redditFeedsEnabled: true
  });

  const STORAGE_KEYS = Object.freeze({
    YOUTUBE_SHORTS_ENABLED: 'youtubeShortsEnabled',
    INSTAGRAM_REELS_ENABLED: 'instagramReelsEnabled',
    FACEBOOK_REELS_ENABLED: 'facebookReelsEnabled',
    TIKTOK_FOR_YOU_ENABLED: 'tiktokForYouEnabled',
    X_HOME_FEED_ENABLED: 'xHomeFeedEnabled',
    REDDIT_FEEDS_ENABLED: 'redditFeedsEnabled'
  });

  function validateSettings(raw) {
    if (!raw || typeof raw !== 'object') {
      return { ...DEFAULT_SETTINGS };
    }
    const rawObj = raw;

    const youtubeShortsEnabled =
      typeof rawObj.youtubeShortsEnabled === 'boolean'
        ? rawObj.youtubeShortsEnabled
        : DEFAULT_SETTINGS.youtubeShortsEnabled;

    const instagramReelsEnabled =
      typeof rawObj.instagramReelsEnabled === 'boolean'
        ? rawObj.instagramReelsEnabled
        : DEFAULT_SETTINGS.instagramReelsEnabled;

    const facebookReelsEnabled =
      typeof rawObj.facebookReelsEnabled === 'boolean'
        ? rawObj.facebookReelsEnabled
        : DEFAULT_SETTINGS.facebookReelsEnabled;

    const tiktokForYouEnabled =
      typeof rawObj.tiktokForYouEnabled === 'boolean'
        ? rawObj.tiktokForYouEnabled
        : DEFAULT_SETTINGS.tiktokForYouEnabled;

    const xHomeFeedEnabled =
      typeof rawObj.xHomeFeedEnabled === 'boolean'
        ? rawObj.xHomeFeedEnabled
        : DEFAULT_SETTINGS.xHomeFeedEnabled;

    const redditFeedsEnabled =
      typeof rawObj.redditFeedsEnabled === 'boolean'
        ? rawObj.redditFeedsEnabled
        : DEFAULT_SETTINGS.redditFeedsEnabled;

    return {
      youtubeShortsEnabled,
      instagramReelsEnabled,
      facebookReelsEnabled,
      tiktokForYouEnabled,
      xHomeFeedEnabled,
      redditFeedsEnabled
    };
  }

  async function getSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get(
            [
              STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED,
              STORAGE_KEYS.INSTAGRAM_REELS_ENABLED,
              STORAGE_KEYS.FACEBOOK_REELS_ENABLED,
              STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED,
              STORAGE_KEYS.X_HOME_FEED_ENABLED,
              STORAGE_KEYS.REDDIT_FEEDS_ENABLED
            ],
            (result) => {
              if (chrome.runtime && chrome.runtime.lastError) {
                resolve({ ...DEFAULT_SETTINGS });
                return;
              }
              resolve(validateSettings(result));
            }
          );
        } catch {
          resolve({ ...DEFAULT_SETTINGS });
        }
      });
    }

    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('scrollshield_settings');
        if (stored) {
          return validateSettings(JSON.parse(stored));
        }
      }
    } catch {
      // Ignore
    }

    return { ...DEFAULT_SETTINGS };
  }

  function onSettingsChanged(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const listener = (changes, areaName) => {
        if (
          areaName === 'local' &&
          (changes[STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED] ||
            changes[STORAGE_KEYS.INSTAGRAM_REELS_ENABLED] ||
            changes[STORAGE_KEYS.FACEBOOK_REELS_ENABLED] ||
            changes[STORAGE_KEYS.TIKTOK_FOR_YOU_ENABLED] ||
            changes[STORAGE_KEYS.X_HOME_FEED_ENABLED] ||
            changes[STORAGE_KEYS.REDDIT_FEEDS_ENABLED])
        ) {
          getSettings().then(callback);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
    return () => {};
  }

  /* ==========================================================================
     2. Reddit Route Detector Module
     ========================================================================== */

  const SUBREDDIT_REGEX = /^[a-zA-Z0-9_]{2,30}$/;
  const POST_ID_REGEX = /^[a-zA-Z0-9]{4,15}$/;
  const ROOT_FEED_SORTS = new Set(['best', 'hot', 'new', 'top', 'rising']);

  const REDDIT_HOSTNAMES = new Set([
    'reddit.com',
    'www.reddit.com',
    'old.reddit.com',
    'new.reddit.com',
    'sh.reddit.com',
    'm.reddit.com'
  ]);

  function isRedditHost(hostname) {
    if (!hostname || typeof hostname !== 'string') return false;
    const normalized = hostname.toLowerCase();
    return (
      REDDIT_HOSTNAMES.has(normalized) ||
      normalized.endsWith('.reddit.com')
    );
  }

  function validateSubreddit(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.trim();
    return SUBREDDIT_REGEX.test(clean) ? clean : null;
  }

  function validatePostId(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.trim();
    return POST_ID_REGEX.test(clean) ? clean : null;
  }

  function detectRedditRoute(input) {
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

    // 8. User profiles: /user/{username}/, /u/{username}/
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

    return {
      category: 'other',
      isBlockedFeed: false,
      subreddit: null,
      postId: null,
      pathname
    };
  }

  /* ==========================================================================
     3. Selectors & DOM Suppression Layer
     ========================================================================== */

  const REDDIT_POPULAR_SELECTORS = [
    'a[href="/r/popular"]',
    'a[href="/r/popular/"]',
    'a[href="/popular"]',
    'a[href="/popular/"]',
    'faceplate-tracker[noun="popular"]'
  ];

  const REDDIT_ALL_SELECTORS = [
    'a[href="/r/all"]',
    'a[href="/r/all/"]',
    'faceplate-tracker[noun="all"]'
  ];

  const REDDIT_HOME_SELECTORS = [
    'a#home-link',
    'a[data-testid="feed-home"]',
    'left-nav a[href="/"]',
    'faceplate-tracker[noun="home"]'
  ];

  const ALL_REDDIT_FEED_SELECTORS = [
    ...REDDIT_HOME_SELECTORS,
    ...REDDIT_POPULAR_SELECTORS,
    ...REDDIT_ALL_SELECTORS
  ];

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

  function isSafeToHide(element) {
    if (!element || typeof element.tagName !== 'string') {
      return false;
    }

    const tagName = element.tagName.toUpperCase();
    if (PROTECTED_TAG_NAMES.has(tagName)) {
      return false;
    }

    if (
      element.querySelector(
        'input[type="search"], [role="search"], a[href*="/search"], a[href*="/message"], a[href*="/chat"], a[href^="/user/"], a[href^="/u/"]'
      )
    ) {
      return false;
    }

    if (
      element.id === 'header-img' ||
      element.getAttribute('aria-label') === 'Home' ||
      element.querySelector('[data-testid="reddit-logo"], svg[aria-label="Reddit Logo"]')
    ) {
      return false;
    }

    return true;
  }

  function generateRedditFeedSuppressionCss(rootAttribute = 'data-scrollshield-reddit-feeds-blocked') {
    const selectorList = ALL_REDDIT_FEED_SELECTORS
      .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
      .join(',\n');

    return `
/* ScrollShield - Declarative Reddit Feed Suppression (Phase 6B) */
${selectorList} {
  display: none !important;
}
`.trim();
  }

  function suppressRedditFeedElements(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return 0;

    let suppressedCount = 0;
    for (const selector of ALL_REDDIT_FEED_SELECTORS) {
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

  function restoreSuppressedRedditFeedElements(root = document) {
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

  /* ==========================================================================
     4. Blocker Overlay Layer
     ========================================================================== */

  const OVERLAY_CONTAINER_ID = 'scrollshield-reddit-blocker-root';
  let activeMediaInterceptor = null;

  function isFeedVideo(videoEl) {
    if (!videoEl) return false;
    if (typeof videoEl.closest === 'function') {
      if (
        videoEl.closest(
          'shreddit-post[post-type="comment"], [data-testid="post-comment-header"], [aria-label*="Chat"], [role="complementary"]'
        )
      ) {
        return false;
      }
    }
    return true;
  }

  function startMediaSuppression() {
    stopMediaSuppression();

    const pauseFeedVideos = () => {
      try {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (isFeedVideo(v)) {
            if (!v.paused) {
              v.pause();
            }
            v.muted = true;
          }
        }
      } catch {
        // Ignore
      }
    };

    pauseFeedVideos();

    const preventPlay = (e) => {
      try {
        if (e.target && typeof e.target.pause === 'function') {
          if (isFeedVideo(e.target)) {
            e.target.pause();
            e.target.muted = true;
          }
        }
      } catch {
        // Ignore
      }
    };

    window.addEventListener('play', preventPlay, true);
    window.addEventListener('playing', preventPlay, true);

    const intervalId = setInterval(pauseFeedVideos, 250);

    activeMediaInterceptor = {
      cleanup: () => {
        window.removeEventListener('play', preventPlay, true);
        window.removeEventListener('playing', preventPlay, true);
        clearInterval(intervalId);
      }
    };
  }

  function stopMediaSuppression() {
    if (activeMediaInterceptor) {
      try {
        activeMediaInterceptor.cleanup();
      } catch {
        // Ignore
      }
      activeMediaInterceptor = null;
    }
  }

  function mountBlockerOverlay(options = {}) {
    startMediaSuppression();

    let root = document.getElementById(OVERLAY_CONTAINER_ID);
    if (!root) {
      root = document.createElement('div');
      root.id = OVERLAY_CONTAINER_ID;
      document.body.appendChild(root);
    }

    let shadow = root.shadowRoot;
    if (!shadow) {
      shadow = root.attachShadow({ mode: 'open' });
    }

    const { onLeaveFeed, onNavigateBack } = options;

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          display: block;
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background-color: #0b0f19;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }

        .overlay-backdrop {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          box-sizing: border-box;
          background: radial-gradient(circle at 50% 30%, #151d33 0%, #0b0f19 70%);
        }

        .card {
          background-color: #121829;
          border: 1px solid #222e49;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          padding: 32px 28px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 18px;
          box-sizing: border-box;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #1a233a;
          border: 1px solid #24304f;
          border-radius: 8px;
          color: #818cf8;
        }

        .brand-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }

        .badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: #fbbf24;
          background-color: #271f10;
          border: 1px solid rgba(251, 191, 36, 0.3);
          padding: 3px 10px;
          border-radius: 999px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .heading {
          font-size: 1.4375rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
          margin: 0;
        }

        .description {
          font-size: 0.9375rem;
          color: #94a3b8;
          line-height: 1.55;
          margin: 0;
        }

        .actions {
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: 10px;
          margin-top: 6px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 11px 18px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          text-decoration: none;
          box-sizing: border-box;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }

        .btn-primary {
          background-color: #6366f1;
          color: #ffffff;
          border-color: #4f46e5;
        }

        .btn-primary:hover {
          background-color: #4f46e5;
        }

        .btn-secondary {
          background-color: #1a233a;
          color: #e2e8f0;
          border-color: #2b395d;
        }

        .btn-secondary:hover {
          background-color: #243152;
        }

        .btn:focus-visible {
          outline: 2px solid #818cf8;
          outline-offset: 2px;
        }

        .footer-note {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
        }
      </style>

      <div class="overlay-backdrop">
        <div class="card" role="dialog" aria-labelledby="reddit-shield-title" aria-describedby="reddit-shield-desc">
          <div class="brand">
            <div class="brand-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <span class="brand-title">ScrollShield</span>
          </div>

          <span class="badge">Reddit Feed Shielded</span>

          <h1 id="reddit-shield-title" class="heading">You've reached a ScrollShield boundary.</h1>

          <p id="reddit-shield-desc" class="description">
            You chose to limit endless Reddit feed browsing. Your communities, discussions and search remain accessible.
          </p>

          <div class="actions">
            <button id="btn-reddit-leave" type="button" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Leave Feed</span>
            </button>

            <button id="btn-reddit-back" type="button" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Go Back</span>
            </button>
          </div>

          <p class="footer-note">ScrollShield &bull; Take Control. Keep What Matters.</p>
        </div>
      </div>
    `;

    const leaveBtn = shadow.getElementById('btn-reddit-leave');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        if (typeof onLeaveFeed === 'function') {
          onLeaveFeed();
        } else {
          window.location.href = '/search';
        }
      });
    }

    const backBtn = shadow.getElementById('btn-reddit-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (typeof onNavigateBack === 'function') {
          onNavigateBack();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/search';
        }
      });
    }
  }

  function dismountBlockerOverlay() {
    stopMediaSuppression();

    const root = document.getElementById(OVERLAY_CONTAINER_ID);
    if (root && root.parentNode) {
      root.parentNode.removeChild(root);
    }
  }

  function isBlockerOverlayMounted() {
    return document.getElementById(OVERLAY_CONTAINER_ID) !== null;
  }

  /* ==========================================================================
     5. SPA Navigation Monitor
     ========================================================================== */

  function createNavigationMonitor(onRouteChange, onDomUpdated) {
    let lastHref = typeof window !== 'undefined' ? window.location.href : '';
    let domUpdateTimer = null;

    const checkCurrentRoute = () => {
      if (typeof window === 'undefined') return;
      const currentHref = window.location.href;
      if (currentHref !== lastHref) {
        lastHref = currentHref;
        onRouteChange(currentHref);
      }
    };

    const scheduleDomUpdate = () => {
      if (domUpdateTimer) return;
      domUpdateTimer = setTimeout(() => {
        domUpdateTimer = null;
        if (typeof onDomUpdated === 'function') {
          onDomUpdated();
        }
      }, 200);
    };

    const handlePopState = () => {
      checkCurrentRoute();
    };

    window.addEventListener('popstate', handlePopState, true);

    let observer = null;
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      observer = new MutationObserver((mutations) => {
        if (window.location.href !== lastHref) {
          checkCurrentRoute();
        }

        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length > 0) {
            scheduleDomUpdate();
            break;
          }
        }
      });

      const targetNode = document.body || document.documentElement;
      if (targetNode) {
        observer.observe(targetNode, {
          childList: true,
          subtree: true
        });
      }
    }

    return {
      disconnect: () => {
        window.removeEventListener('popstate', handlePopState, true);
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (domUpdateTimer) {
          clearTimeout(domUpdateTimer);
          domUpdateTimer = null;
        }
      },
      checkCurrentRoute
    };
  }

  /* ==========================================================================
     6. Controller & Initialization
     ========================================================================== */

  let currentSettings = { redditFeedsEnabled: true };
  let navigationMonitor = null;

  const STYLE_ELEMENT_ID = 'scrollshield-reddit-styles';
  const ROOT_ATTRIBUTE = 'data-scrollshield-reddit-feeds-blocked';

  function injectDeclarativeStyles() {
    if (typeof document === 'undefined') return;

    let styleEl = document.getElementById(STYLE_ELEMENT_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ELEMENT_ID;
      styleEl.textContent = generateRedditFeedSuppressionCss(ROOT_ATTRIBUTE);
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(styleEl);
      }
    }
  }

  function evaluateRoute(url) {
    if (typeof window === 'undefined') return;

    const currentUrl = url || window.location.href;
    const detection = detectRedditRoute(currentUrl);

    if (currentSettings.redditFeedsEnabled && detection.isBlockedFeed) {
      mountBlockerOverlay({
        onLeaveFeed: () => {
          window.location.href = '/search';
        },
        onNavigateBack: () => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = '/search';
          }
        }
      });
    } else {
      if (isBlockerOverlayMounted()) {
        dismountBlockerOverlay();
      }
    }
  }

  function updateSuppressionState() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (!root) return;

    if (currentSettings.redditFeedsEnabled) {
      root.setAttribute(ROOT_ATTRIBUTE, 'true');
      suppressRedditFeedElements(document);
    } else {
      root.removeAttribute(ROOT_ATTRIBUTE);
      restoreSuppressedRedditFeedElements(document);
      dismountBlockerOverlay();
    }
  }

  async function initializeRedditShield() {
    injectDeclarativeStyles();

    currentSettings = await getSettings();
    updateSuppressionState();
    evaluateRoute(window.location.href);

    onSettingsChanged((newSettings) => {
      currentSettings = newSettings;
      updateSuppressionState();
      evaluateRoute(window.location.href);
    });

    navigationMonitor = createNavigationMonitor(
      (newUrl) => {
        evaluateRoute(newUrl);
      },
      () => {
        if (currentSettings.redditFeedsEnabled) {
          suppressRedditFeedElements(document);
        }
        evaluateRoute(window.location.href);
      }
    );
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initializeRedditShield().catch(() => {});
      });
    } else {
      initializeRedditShield().catch(() => {});
    }
  }
})();
