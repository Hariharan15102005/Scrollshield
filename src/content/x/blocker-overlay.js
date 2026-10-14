/**
 * ScrollShield - X (Twitter) Blocker Overlay (Phase 6A)
 *
 * Injects an isolated, namespaced intervention interface on X Home timeline routes.
 * Completely covers the timeline and pauses associated media playback.
 */

const OVERLAY_CONTAINER_ID = 'scrollshield-x-blocker-root';

let activeMediaInterceptor = null;

/**
 * Determines whether a video element is associated with the blocked Home timeline
 * rather than a messages dock or sidebar element.
 * @param {HTMLVideoElement} videoEl
 * @returns {boolean}
 */
export function isHomeVideo(videoEl) {
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

/**
 * Actively intercepts and pauses media elements associated with the blocked Home timeline.
 */
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

/**
 * Halts active media interception.
 */
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

/**
 * Renders the isolated ScrollShield blocking overlay on X Home timeline routes.
 *
 * @param {{
 *   onLeaveTimeline?: () => void,
 *   onNavigateBack?: () => void
 * }} [options={}]
 */
export function mountBlockerOverlay(options = {}) {
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
        // Navigate to a safe, non-feed destination such as explore/search or notifications
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

/**
 * Dismounts the blocker overlay and removes media suppression.
 */
export function dismountBlockerOverlay() {
  stopMediaSuppression();

  const root = document.getElementById(OVERLAY_CONTAINER_ID);
  if (root && root.parentNode) {
    root.parentNode.removeChild(root);
  }
}

/**
 * Checks whether the blocker overlay is currently mounted.
 * @returns {boolean}
 */
export function isBlockerOverlayMounted() {
  return document.getElementById(OVERLAY_CONTAINER_ID) !== null;
}
