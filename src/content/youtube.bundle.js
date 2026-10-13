/**
 * ScrollShield - YouTube Content Script Bundle (Phase 2)
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
    youtubeShortsEnabled: true
  });

  const STORAGE_KEYS = Object.freeze({
    YOUTUBE_SHORTS_ENABLED: 'youtubeShortsEnabled'
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

    return { youtubeShortsEnabled };
  }

  async function getSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get([STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED], (result) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              resolve({ ...DEFAULT_SETTINGS });
              return;
            }
            resolve(validateSettings(result));
          });
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
        if (areaName === 'local' && changes[STORAGE_KEYS.YOUTUBE_SHORTS_ENABLED]) {
          getSettings().then(callback);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
    return () => {};
  }

  /* ==========================================================================
     2. YouTube Route Detector Layer
     ========================================================================== */

  const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{6,16}$/;
  const YOUTUBE_HOSTNAMES = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com'
  ]);

  function isYouTubeHost(hostname) {
    if (!hostname || typeof hostname !== 'string') return false;
    const normalized = hostname.toLowerCase();
    return YOUTUBE_HOSTNAMES.has(normalized) || normalized.endsWith('.youtube.com');
  }

  function validateVideoId(rawId) {
    if (!rawId || typeof rawId !== 'string') return null;
    const trimmed = rawId.trim();
    return VIDEO_ID_REGEX.test(trimmed) ? trimmed : null;
  }

  function detectYouTubeRoute(input) {
    const defaultResult = {
      isShorts: false,
      videoId: null,
      canonicalWatchUrl: null,
      pathname: ''
    };

    if (!input) return defaultResult;

    let parsedUrl;
    try {
      if (input instanceof URL) {
        parsedUrl = input;
      } else if (typeof input === 'string') {
        if (input.startsWith('/')) {
          parsedUrl = new URL(input, 'https://www.youtube.com');
        } else {
          parsedUrl = new URL(input);
        }
      } else {
        return defaultResult;
      }
    } catch {
      return defaultResult;
    }

    if (!isYouTubeHost(parsedUrl.hostname)) {
      return defaultResult;
    }

    const pathname = parsedUrl.pathname || '';
    defaultResult.pathname = pathname;

    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0 || segments[0].toLowerCase() !== 'shorts') {
      return defaultResult;
    }

    if (segments.length === 1) {
      return {
        isShorts: true,
        videoId: null,
        canonicalWatchUrl: null,
        pathname
      };
    }

    const rawVideoId = segments[1];
    const validatedId = validateVideoId(rawVideoId);

    return {
      isShorts: true,
      videoId: validatedId,
      canonicalWatchUrl: validatedId ? `https://www.youtube.com/watch?v=${validatedId}` : null,
      pathname
    };
  }

  /* ==========================================================================
     3. Selectors and Shelf Suppression Layer
     ========================================================================== */

  const ALL_SHORTS_SELECTORS = [
    'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
    'ytd-reel-shelf-renderer',
    'ytd-rich-shelf-renderer[is-shorts]',
    'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
    'ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])',
    'ytm-pivot-bar-item-renderer:has(a[href^="/shorts"])'
  ];

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

  function isSafeToHide(element) {
    if (!element || typeof element.tagName !== 'string') return false;
    const tagName = element.tagName.toUpperCase();
    if (PROTECTED_TAG_NAMES.has(tagName)) return false;
    if (element.querySelector('ytd-video-renderer, ytd-rich-item-renderer:not(:has(a[href^="/shorts"]))')) {
      return false;
    }
    return true;
  }

  function generateShortsSuppressionCss(rootAttribute = 'data-scrollshield-shorts-blocked') {
    const selectorList = ALL_SHORTS_SELECTORS
      .map((sel) => `html[${rootAttribute}="true"] ${sel}`)
      .join(',\n');

    return `\n/* ScrollShield Phase 2 Styles */\n${selectorList} {\n  display: none !important;\n}\n`;
  }

  function suppressShortsElements(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return 0;
    let count = 0;
    for (const selector of ALL_SHORTS_SELECTORS) {
      try {
        const elements = root.querySelectorAll(selector);
        for (const el of elements) {
          if (isSafeToHide(el) && el.getAttribute('data-scrollshield-hidden') !== 'true') {
            el.setAttribute('data-scrollshield-hidden', 'true');
            el.setAttribute('data-scrollshield-original-display', el.style.display || '');
            el.style.display = 'none';
            count++;
          }
        }
      } catch {
        // Safe fallback
      }
    }
    return count;
  }

  function restoreSuppressedElements(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return 0;
    let count = 0;
    try {
      const hiddenElements = root.querySelectorAll('[data-scrollshield-hidden="true"]');
      for (const el of hiddenElements) {
        const originalDisplay = el.getAttribute('data-scrollshield-original-display') || '';
        el.style.display = originalDisplay;
        el.removeAttribute('data-scrollshield-hidden');
        el.removeAttribute('data-scrollshield-original-display');
        count++;
      }
    } catch {
      // Safe fallback
    }
    return count;
  }

  /* ==========================================================================
     4. Blocker Overlay Layer
     ========================================================================== */

  const OVERLAY_CONTAINER_ID = 'scrollshield-youtube-blocker-root';
  let activeMediaInterceptor = null;

  function startMediaSuppression() {
    stopMediaSuppression();

    const pauseAllVideos = () => {
      try {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (!v.paused) {
            v.pause();
          }
          v.muted = true;
        }
      } catch {
        // Ignore
      }
    };

    pauseAllVideos();

    const preventPlay = (e) => {
      try {
        if (e.target && typeof e.target.pause === 'function') {
          e.target.pause();
          e.target.muted = true;
        }
      } catch {
        // Ignore
      }
    };

    window.addEventListener('play', preventPlay, true);
    window.addEventListener('playing', preventPlay, true);

    const intervalId = setInterval(pauseAllVideos, 250);

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

  function mountBlockerOverlay(options) {
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

    const { videoId, canonicalWatchUrl, onNavigateHome, onNavigateBack, onOpenRegularWatch } = options;

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
          font-size: 1.5rem;
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

        .btn-tertiary {
          background-color: transparent;
          color: #a5b4fc;
          border-color: #222e49;
          font-size: 0.8125rem;
        }

        .btn-tertiary:hover {
          background-color: rgba(99, 102, 241, 0.1);
          border-color: #6366f1;
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
        <div class="card" role="dialog" aria-labelledby="shield-title" aria-describedby="shield-desc">
          <div class="brand">
            <div class="brand-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <span class="brand-title">ScrollShield</span>
          </div>

          <span class="badge">YouTube Shorts Shielded</span>

          <h1 id="shield-title" class="heading">YouTube Shorts Blocked</h1>

          <p id="shield-desc" class="description">
            Short-form video has been shielded according to your ScrollShield digital wellbeing settings.
            Regular YouTube videos, search results, subscriptions, and playlists remain fully accessible.
          </p>

          <div class="actions">
            <button id="btn-home" type="button" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Return to YouTube Home</span>
            </button>

            <button id="btn-back" type="button" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Go Back</span>
            </button>

            ${
              canonicalWatchUrl && videoId
                ? `
              <button id="btn-watch-regular" type="button" class="btn btn-tertiary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Watch as Regular Video (${videoId})</span>
              </button>
              `
                : ''
            }
          </div>

          <p class="footer-note">ScrollShield &bull; Take Control. Keep What Matters.</p>
        </div>
      </div>
    `;

    const homeBtn = shadow.getElementById('btn-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        if (typeof onNavigateHome === 'function') {
          onNavigateHome();
        } else {
          window.location.href = '/';
        }
      });
    }

    const backBtn = shadow.getElementById('btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (typeof onNavigateBack === 'function') {
          onNavigateBack();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/';
        }
      });
    }

    const regularBtn = shadow.getElementById('btn-watch-regular');
    if (regularBtn && canonicalWatchUrl) {
      regularBtn.addEventListener('click', () => {
        if (typeof onOpenRegularWatch === 'function') {
          onOpenRegularWatch(canonicalWatchUrl);
        } else {
          window.location.href = canonicalWatchUrl;
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
     5. SPA Navigation Monitor Layer
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

    const handleYtNavigateFinish = () => {
      checkCurrentRoute();
      scheduleDomUpdate();
    };

    const handleYtPageDataUpdated = () => {
      checkCurrentRoute();
      scheduleDomUpdate();
    };

    const handlePopState = () => {
      checkCurrentRoute();
    };

    window.addEventListener('yt-navigate-finish', handleYtNavigateFinish, true);
    window.addEventListener('yt-page-data-updated', handleYtPageDataUpdated, true);
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
        window.removeEventListener('yt-navigate-finish', handleYtNavigateFinish, true);
        window.removeEventListener('yt-page-data-updated', handleYtPageDataUpdated, true);
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
     6. Content Script Controller Layer
     ========================================================================== */

  let currentSettings = { youtubeShortsEnabled: true };
  const STYLE_ELEMENT_ID = 'scrollshield-youtube-styles';
  const ROOT_ATTRIBUTE = 'data-scrollshield-shorts-blocked';

  function injectDeclarativeStyles() {
    if (typeof document === 'undefined') return;
    let styleEl = document.getElementById(STYLE_ELEMENT_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ELEMENT_ID;
      styleEl.textContent = generateShortsSuppressionCss(ROOT_ATTRIBUTE);
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(styleEl);
      }
    }
  }

  function evaluateRoute(url) {
    if (typeof window === 'undefined') return;
    const currentUrl = url || window.location.href;
    const detection = detectYouTubeRoute(currentUrl);

    if (currentSettings.youtubeShortsEnabled && detection.isShorts) {
      mountBlockerOverlay({
        videoId: detection.videoId,
        canonicalWatchUrl: detection.canonicalWatchUrl,
        onNavigateHome: () => {
          window.location.href = '/';
        },
        onNavigateBack: () => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.href = '/';
          }
        },
        onOpenRegularWatch: (watchUrl) => {
          window.location.href = watchUrl;
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

    if (currentSettings.youtubeShortsEnabled) {
      root.setAttribute(ROOT_ATTRIBUTE, 'true');
      suppressShortsElements(document);
    } else {
      root.removeAttribute(ROOT_ATTRIBUTE);
      restoreSuppressedElements(document);
      dismountBlockerOverlay();
    }
  }

  async function initializeYouTubeShield() {
    injectDeclarativeStyles();
    currentSettings = await getSettings();
    updateSuppressionState();
    evaluateRoute(window.location.href);

    onSettingsChanged((newSettings) => {
      currentSettings = newSettings;
      updateSuppressionState();
      evaluateRoute(window.location.href);
    });

    createNavigationMonitor(
      (newUrl) => {
        evaluateRoute(newUrl);
      },
      () => {
        if (currentSettings.youtubeShortsEnabled) {
          suppressShortsElements(document);
        }
      }
    );
  }

  // Execution bootstrap
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initializeYouTubeShield().catch(() => {});
      });
    } else {
      initializeYouTubeShield().catch(() => {});
    }
  }
})();
