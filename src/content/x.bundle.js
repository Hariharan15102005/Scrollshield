/**
 * ScrollShield - X (Twitter) Content Script Bundle (Phase 6A)
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
     2. X Route Detector Module
     ========================================================================== */

  const USERNAME_REGEX = /^[a-zA-Z0-9_]{1,15}$/;
  const STATUS_ID_REGEX = /^[0-9]{1,30}$/;

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

  const X_HOSTNAMES = new Set([
    'x.com',
    'www.x.com',
    'mobile.x.com',
    'twitter.com',
    'www.twitter.com',
    'mobile.twitter.com',
    'm.twitter.com'
  ]);

  function isXHost(hostname) {
    if (!hostname || typeof hostname !== 'string') return false;
    const normalized = hostname.toLowerCase();
    return (
      X_HOSTNAMES.has(normalized) ||
      normalized.endsWith('.x.com') ||
      normalized.endsWith('.twitter.com')
    );
  }

  function validateUsername(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.startsWith('@') ? raw.slice(1) : raw;
    return USERNAME_REGEX.test(clean) && !RESERVED_FIRST_SEGMENTS.has(clean.toLowerCase())
      ? clean
      : null;
  }

  function validateStatusId(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return STATUS_ID_REGEX.test(trimmed) ? trimmed : null;
  }

  function detectXRoute(input, pageContext = {}) {
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

    // 10. User profile: /{username}
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

    return {
      category: 'other',
      isHomeTimeline: false,
      username: null,
      statusId: null,
      pathname
    };
  }

  /* ==========================================================================
     3. Selectors & DOM Suppression Layer
     ========================================================================== */

  const X_HOME_NAVIGATION_SELECTORS = [
    'a[data-testid="AppTabBar_Home_Link"]',
    'a[href="/home"]',
    'a[href="/home/"]'
  ];

  const X_HOME_TAB_SELECTORS = [
    'div[role="tablist"] a[href="/home"]',
    'a[role="tab"][href="/home"]',
    'div[role="tablist"] a[href="/home/"]'
  ];

  const ALL_X_HOME_SELECTORS = [
    ...X_HOME_NAVIGATION_SELECTORS,
    ...X_HOME_TAB_SELECTORS
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
        'a[data-testid="AppTabBar_Explore_Link"], a[data-testid="AppTabBar_Notifications_Link"], a[data-testid="AppTabBar_DirectMessage_Link"], a[data-testid="AppTabBar_Profile_Link"], a[data-testid="SideNav_NewTweet_Button"], a[href*="/explore"], a[href*="/search"], a[href*="/notifications"], a[href*="/messages"]'
      )
    ) {
      return false;
    }

    return true;
  }

  function generateXHomeSuppressionCss(rootAttribute = 'data-scrollshield-x-home-blocked') {
    const selectorList = ALL_X_HOME_SELECTORS
      .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
      .join(',\n');

    return `
/* ScrollShield - Declarative X Home Suppression (Phase 6A) */
${selectorList} {
  display: none !important;
}
`.trim();
  }

  function suppressXHomeElements(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return 0;

    let suppressedCount = 0;
    for (const selector of ALL_X_HOME_SELECTORS) {
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

  function restoreSuppressedXHomeElements(root = document) {
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

  const OVERLAY_CONTAINER_ID = 'scrollshield-x-blocker-root';
  let activeMediaInterceptor = null;

  function isHomeVideo(videoEl) {
    if (!videoEl) return false;
    if (typeof videoEl.closest === 'function') {
      if (
        videoEl.closest(
          '[aria-label*="Message"], [aria-label*="Direct Messages"], [data-testid="DMDrawer"], [role="complementary"]'
        )
      ) {
        return false;
      }
    }
    return true;
  }

  function startMediaSuppression() {
    stopMediaSuppression();

    const pauseHomeVideos = () => {
      try {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (isHomeVideo(v)) {
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

    pauseHomeVideos();

    const preventPlay = (e) => {
      try {
        if (e.target && typeof e.target.pause === 'function') {
          if (isHomeVideo(e.target)) {
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

    const intervalId = setInterval(pauseHomeVideos, 250);

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

    const { onLeaveTimeline, onNavigateBack } = options;

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
        <div class="card" role="dialog" aria-labelledby="x-shield-title" aria-describedby="x-shield-desc">
          <div class="brand">
            <div class="brand-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <span class="brand-title">ScrollShield</span>
          </div>

          <span class="badge">X Home Timeline Shielded</span>

          <h1 id="x-shield-title" class="heading">You've reached a ScrollShield boundary.</h1>

          <p id="x-shield-desc" class="description">
            You chose to limit your X Home timeline. Take a moment and return to what matters.
          </p>

          <div class="actions">
            <button id="btn-x-leave" type="button" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Leave Timeline</span>
            </button>

            <button id="btn-x-back" type="button" class="btn btn-secondary">
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

    const leaveBtn = shadow.getElementById('btn-x-leave');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        if (typeof onLeaveTimeline === 'function') {
          onLeaveTimeline();
        } else {
          window.location.href = '/explore';
        }
      });
    }

    const backBtn = shadow.getElementById('btn-x-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (typeof onNavigateBack === 'function') {
          onNavigateBack();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/explore';
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

  let currentSettings = { xHomeFeedEnabled: true };
  let navigationMonitor = null;

  const STYLE_ELEMENT_ID = 'scrollshield-x-styles';
  const ROOT_ATTRIBUTE = 'data-scrollshield-x-home-blocked';

  function inspectPageContext() {
    if (typeof document === 'undefined') return { isHomeActive: false, hasHomeContext: false };

    try {
      const activeHomeIndicator = document.querySelector(
        'a[data-testid="AppTabBar_Home_Link"][aria-current="page"], a[href="/home"][aria-current="page"], [role="tab"][aria-selected="true"][href*="/home"], div[data-testid="primaryColumn"] [aria-label*="Timeline: Your Home Timeline"]'
      );
      if (activeHomeIndicator) {
        return { isHomeActive: true, hasHomeContext: true };
      }
    } catch {
      // Safe fallback
    }

    return { isHomeActive: false, hasHomeContext: false };
  }

  function injectDeclarativeStyles() {
    if (typeof document === 'undefined') return;

    let styleEl = document.getElementById(STYLE_ELEMENT_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ELEMENT_ID;
      styleEl.textContent = generateXHomeSuppressionCss(ROOT_ATTRIBUTE);
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(styleEl);
      }
    }
  }

  function evaluateRoute(url) {
    if (typeof window === 'undefined') return;

    const currentUrl = url || window.location.href;
    const pageContext = inspectPageContext();
    const detection = detectXRoute(currentUrl, pageContext);

    if (currentSettings.xHomeFeedEnabled && detection.isHomeTimeline) {
      mountBlockerOverlay({
        onLeaveTimeline: () => {
          window.location.href = '/explore';
        },
        onNavigateBack: () => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = '/explore';
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

    if (currentSettings.xHomeFeedEnabled) {
      root.setAttribute(ROOT_ATTRIBUTE, 'true');
      suppressXHomeElements(document);
    } else {
      root.removeAttribute(ROOT_ATTRIBUTE);
      restoreSuppressedXHomeElements(document);
      dismountBlockerOverlay();
    }
  }

  async function initializeXShield() {
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
        if (currentSettings.xHomeFeedEnabled) {
          suppressXHomeElements(document);
        }
        evaluateRoute(window.location.href);
      }
    );
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initializeXShield().catch(() => {});
      });
    } else {
      initializeXShield().catch(() => {});
    }
  }
})();
