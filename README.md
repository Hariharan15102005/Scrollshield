# ScrollShield

> **Take Control. Keep What Matters.**

ScrollShield is a Google Chrome extension (Manifest V3) engineered for selective social media blocking and intentional digital wellbeing.

---

## 1. Problem Statement

Modern social platforms have fused indispensable communication and knowledge tools with hyper-engineered, algorithmically addictive short-form video loops:
- **YouTube:** High-value instructional tutorials, podcasts, and lecture videos sit right next to infinite-scroll YouTube Shorts designed to hook dopamine loops.
- **Instagram:** Direct Messaging (DMs) with close friends and family, photography portfolios, and creator updates share the same platform as infinite Instagram Reels designed to trap attention for hours.

Traditional site blockers present a blunt, binary choice: completely block entire domains (breaking communication and valuable content) or keep them unblocked (succumbing to endless doom-scrolling).

## 2. Product Vision

ScrollShield introduces **surgical, selective filtering**:
- **Surgical Platform Blocking:** Eliminates addictive short-form video surfaces (YouTube Shorts, Instagram Reels) while preserving utility layers (normal YouTube videos, Instagram DMs, profile grids, normal feed posts, search).
- **Mindful Interstitial Boundaries:** Displays a reflective boundary overlay ("You've reached a ScrollShield boundary. Take a moment and return to what matters.") with one-click safe navigation.
- **Independent Controls:** Each supported platform has an independent toggle switch; disabling one platform does not affect others.
- **Local-Only Privacy:** 100% offline, zero tracking, zero telemetries, and zero third-party dependencies.

---

## 3. Implementation Status: Phase 3 vs. Planned Roadmap

| Feature Area | Current Status | Implemented Phase |
| :--- | :--- | :--- |
| **Manifest V3 Foundation** | ✅ **Implemented** (Least privilege) | Phase 1 |
| **Extension Popup UI** | ✅ **Implemented** (Dual platform toggles) | Phase 1, 2 & 3 |
| **Settings / Options Page** | ✅ **Implemented** (Dual platform toggles) | Phase 1, 2 & 3 |
| **YouTube Shorts Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, overlay) | Phase 2 |
| **YouTube Shorts Shelf Suppression** | ✅ **Implemented** (Sidebar links & homepage shelves hidden) | Phase 2 |
| **Instagram Reels Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, boundary overlay) | Phase 3 |
| **Instagram Reels Entry Point Hiding** | ✅ **Implemented** (Sidebar Reels links & profile Reels tabs hidden) | Phase 3 |
| **Instagram SPA Navigation Sync** | ✅ **Implemented** (Handles popstate & client-side navigation) | Phase 3 |
| **Mindful Reflection Prompts** | ⏳ *Intentionally Deferred* | Phase 4 |
| **Daily Time Budgets** | ⏳ *Intentionally Deferred* | Phase 5 |
| **Focus Schedules & Quiet Blocks** | ⏳ *Intentionally Deferred* | Phase 5 |
| **Usage Analytics & Local Dashboard** | ⏳ *Intentionally Deferred* | Phase 6 |

---

## 4. Architecture & Technical Design (Phase 3)

### A. Route Detection Architecture
- **YouTube (`src/content/youtube/route-detector.js`):**
  - Targets `/shorts/*` routes on YouTube hostnames.
  - Preserves `/watch`, `/results`, `/feed/subscriptions`, `/@channel`, `/channel/*`, `/playlist`.
- **Instagram (`src/content/instagram/route-detector.js`):**
  - Targets `/reel/{shortcode}/`, `/reels/{shortcode}/`, and root `/reels/` on Instagram hostnames.
  - Validates shortcodes (`[a-zA-Z0-9_-]{5,35}`).
  - **Explicitly Preserves:**
    - Normal posts: `/p/{shortcode}/`
    - Direct messages: `/direct/` and `/direct/t/{thread_id}/`
    - User profiles: `/{username}/` (with reserved path protection for `direct`, `explore`, `stories`, etc.)
    - Explore and search: `/explore/`
    - Stories: `/stories/{username}/`
  - Safe error handling: never throws exceptions on malformed URLs or non-Instagram domains.

### B. Media Suppression & Isolated Boundary Overlay
- **Instagram Blocker Overlay (`src/content/instagram/blocker-overlay.js`):**
  - Injected inside an isolated Shadow DOM (`#scrollshield-instagram-blocker-root`).
  - Completely covers the Reel player with an opaque, dark navy backdrop.
  - Automatically pauses any active HTML5 `<video>` elements and sets `muted = true`.
  - Attaches capture-phase listeners to `play` and `playing` events to prevent background audio/video playback.
  - Displays ScrollShield boundary messaging:
    - **Header:** *"You've reached a ScrollShield boundary."*
    - **Supporting text:** *"You chose to block Instagram Reels. Take a moment and return to what matters."*
    - **Actions:** *"Back to Instagram"* (navigates safely to `/`) and *"Go Back"* (`window.history.back()`).
  - Idempotent mount/dismount with clean event teardown.

### C. Conservative Entry Point Hiding
- **Instagram Selectors (`src/content/instagram/selectors.js`):**
  - Targets verified Reels entry anchors:
    - Sidebar navigation: `a[href="/reels/"]`, `a[href^="/reels/"]`, `a[href="/reels"]`
    - Profile tabs: `a[role="tab"][href*="/reels/"]`, `a[href$="/reels/"]`
  - **Safety Validator (`isSafeToHide`):** Strictly protects containers hosting normal posts (`/p/`), DMs (`/direct/`), or stories (`/stories/`). Never hides top-level layout containers (`HTML`, `BODY`, `MAIN`, `NAV`, `SECTION`, `ARTICLE`).
  - Injects scoped declarative CSS active only when `html[data-scrollshield-reels-blocked="true"]` is set.

### D. SPA Navigation Monitoring
- **Instagram Monitor (`src/content/instagram/navigation-monitor.js`):**
  - Listens to HTML5 `popstate` events (browser Back/Forward).
  - Uses a lightweight scoped `MutationObserver` on `document.body` or `document.documentElement` to detect client-side React navigation and dynamic DOM rendering.
  - Debounced DOM update timer (200ms) prevents unbounded polling loops.
  - Clean `disconnect()` method.

### E. Settings Management (`src/common/settings.js`)
- Manages dual platform settings:
  - `youtubeShortsEnabled: boolean` (default: `true`)
  - `instagramReelsEnabled: boolean` (default: `true`)
- Stored exclusively in local storage via `chrome.storage.local`.
- Non-destructive updates: modifying one platform setting leaves the other platform setting unchanged.
- Live change broadcast via `chrome.storage.onChanged`.

---

## 5. Technology Stack & Permissions

- **Extension Specification:** Chrome Extension Manifest V3 (`manifest_version: 3`).
- **Core Languages:** Vanilla JavaScript (ES Modules for source modules, standalone bundled IIFE for content scripts), HTML5, and CSS3.
- **Permissions:**
  - `"storage"`: **Strictly and solely requested** to persist user configuration (`youtubeShortsEnabled`, `instagramReelsEnabled`) and broadcast live changes.
  - No `tabs`, `history`, `webRequest`, `scripting`, or background service workers are declared.
- **Content Scripts:**
  - YouTube: `*://*.youtube.com/*` -> `src/content/youtube.bundle.js` (`run_at: "document_start"`).
  - Instagram: `https://www.instagram.com/*` -> `src/content/instagram.bundle.js` (`run_at: "document_start"`).
  - No broad `host_permissions` requested.

---

## 6. Repository Folder Structure

```
ScrollShield/
├── .gitignore
├── manifest.json                  # Manifest V3 (v0.3.0)
├── package.json                   # npm test script for native Node test runner
├── README.md                      # Complete documentation & test guide
├── src/
│   ├── assets/
│   │   └── icons/                 # High-DPI PNG icons (16, 32, 48, 128)
│   ├── common/
│   │   └── settings.js            # Shared settings layer & validation
│   ├── content/
│   │   ├── instagram.bundle.js    # Production Instagram MV3 content bundle
│   │   ├── instagram/             # Instagram modular source code
│   │   │   ├── blocker-overlay.js # Shadow DOM boundary overlay & media pause
│   │   │   ├── index.js           # Content script controller
│   │   │   ├── navigation-monitor.js # SPA lifecycle & popstate monitor
│   │   │   ├── route-detector.js  # Pure structured URL route detector
│   │   │   └── selectors.js       # Conservative Reels entry selectors
│   │   ├── youtube.bundle.js      # Production YouTube MV3 content bundle
│   │   └── youtube/               # YouTube modular source code
│   │       ├── blocker-overlay.js
│   │       ├── index.js
│   │       ├── navigation-monitor.js
│   │       ├── route-detector.js
│   │       └── selectors.js
│   ├── popup/                     # Toolbar popup with dual platform toggles
│   └── settings/                  # Options page with dual platform toggles
└── tests/
    ├── blocking-logic.test.mjs    # YouTube blocking decision tests
    ├── instagram-blocking-logic.test.mjs # Instagram blocking decision tests
    ├── instagram-route-detector.test.mjs # Instagram route detection tests
    ├── manifest.test.mjs          # Manifest V3 compliance & security tests
    ├── route-detector.test.mjs    # YouTube route detection tests
    └── settings.test.mjs          # Settings schema, persistence & independence tests
```

---

## 7. How to Run Automated Tests

ScrollShield includes a zero-dependency automated test suite leveraging Node.js's native test runner.

### Command

```bash
npm test
```

Or run directly:

```bash
node --test tests/manifest.test.mjs tests/route-detector.test.mjs tests/blocking-logic.test.mjs tests/instagram-route-detector.test.mjs tests/instagram-blocking-logic.test.mjs tests/settings.test.mjs
```

### Automated Checks Performed (74 Tests across 6 Suites)

1. **Manifest & Security Specifications (`manifest.test.mjs`):**
   - Valid JSON, MV3 specification, semantic version 0.3.0.
   - All icon files and PNG magic byte headers.
   - Strict enforcement that permissions contain **only** `"storage"`.
   - Strict enforcement that **no** background service worker or host permissions are declared.
   - Verification that `content_scripts` declares both YouTube and Instagram with valid, non-empty classic bundles.
2. **Instagram Route Detector (`instagram-route-detector.test.mjs`):**
   - Direct `/reel/{shortcode}/` URLs with and without trailing slash.
   - Query parameters, share tokens, and fragments.
   - Plural `/reels/{shortcode}/` variation and root `/reels/` feed.
   - Strict exclusion of normal posts (`/p/{shortcode}/`).
   - Strict exclusion of direct messages (`/direct/t/...`).
   - Strict exclusion of explore, search, user profiles (`/{username}/`), and stories (`/stories/...`).
   - Safe handling of malformed URLs and non-Instagram hostnames.
   - Shortcode and username validation rules.
3. **Instagram Blocking Logic & DOM Safety (`instagram-blocking-logic.test.mjs`):**
   - Blocking enabled vs. disabled decision logic.
   - Normal posts, DMs, and profiles non-blocking assurance.
   - SPA navigation transitions into and out of Reels.
   - Idempotence on rapid repeated route evaluations.
   - Dynamic settings toggling updates blocking behavior.
   - DOM safety: ensures containers containing normal posts or DMs are never hidden.
   - Valid scoped declarative CSS generation.
4. **Settings Layer (`settings.test.mjs`):**
   - Default setting policy (`youtubeShortsEnabled = true`, `instagramReelsEnabled = true`).
   - Independent toggling: disabling one platform leaves the other intact.
   - Missing and malformed setting type recovery.
   - Storage error graceful fallbacks.
5. **YouTube Route Detector (`route-detector.test.mjs`):**
   - Complete YouTube URL classification and regression testing.
6. **YouTube Blocking Logic (`blocking-logic.test.mjs`):**
   - Complete YouTube blocking and DOM container safety regression testing.

---

## 8. Manual Browser Verification Checklist

To verify real-world YouTube and Instagram integration in Google Chrome:

### Instagram Verification
1. **Load/Reload Extension:**
   - Open `chrome://extensions`.
   - Enable **Developer mode** (top-right).
   - Click **Load unpacked** and select the `ScrollShield` directory (or click Reload).
   - Confirm version `0.3.0` is displayed without errors.
2. **Verify Instagram Feed & Navigation:**
   - Open `https://www.instagram.com/`.
   - Confirm that the dedicated "Reels" link in the left navigation sidebar is hidden.
   - Confirm normal feed posts, stories tray, search, and navigation links remain visible and functional.
3. **Verify Direct Reel Route Blocking:**
   - Open an Instagram Reel directly (e.g. `https://www.instagram.com/reel/{SHORTCODE}/`).
   - Verify the ScrollShield boundary overlay appears immediately:
     - Header: *"You've reached a ScrollShield boundary."*
     - Supporting text: *"You chose to block Instagram Reels. Take a moment and return to what matters."*
   - Confirm video playback is paused and muted.
   - Click **Back to Instagram**; confirm navigation to the home feed `/`.
4. **Verify Normal Posts & DMs are Accessible:**
   - Open a standard photo/video post (`https://www.instagram.com/p/{SHORTCODE}/`).
   - Confirm it is **not blocked** and displays normally.
   - Navigate to Direct Messages (`https://www.instagram.com/direct/inbox/`) and open a conversation thread.
   - Confirm messaging remains completely accessible.
5. **Verify Profiles:**
   - Visit a user profile (e.g. `https://www.instagram.com/{username}/`).
   - Confirm profile information, avatar, follower count, and post grid display normally.
   - Confirm the Reels tab under the profile header is hidden.
6. **Verify SPA Navigation & Browser Back/Forward:**
   - Navigate from home feed to a Reel; confirm the boundary overlay engages without a full page reload.
   - Click browser **Back**; confirm feed access is restored.
   - Click browser **Forward**; confirm the boundary overlay re-engages cleanly.
7. **Verify Toggling in Popup & Settings:**
   - Open the ScrollShield popup.
   - Toggle **Instagram Reels Blocker** off; refresh or visit `/reel/*` and verify normal Reels access is restored.
   - Toggle **Instagram Reels Blocker** back on; verify blocking takes effect immediately without extension reload.
   - Verify that toggling Instagram does **not** affect the YouTube Shorts setting.

### YouTube Regression Verification
8. **Confirm YouTube Shorts Blocking Still Works:**
   - Navigate to `https://www.youtube.com/`.
   - Confirm YouTube Shorts shelves and sidebar links are hidden.
   - Open a YouTube Short (`https://www.youtube.com/shorts/...`); confirm the YouTube blocking overlay appears.
   - Open a standard YouTube video (`https://www.youtube.com/watch?v=...`); confirm normal playback.

---

## 9. Strategy for Maintaining Selectors

Instagram is a React Single Page Application that uses dynamic, obfuscated class names (e.g. `x1n2onr6`).

**Maintenance Rules:**
1. **Never rely on obfuscated class names:** Avoid selectors targeting auto-generated class names like `._ab6-`.
2. **Rely on stable semantic attributes and paths:** Use `a[href^="/reels/"]`, `a[role="tab"][href*="/reels/"]`.
3. **Safety First:** If Instagram alters an entry link structure, the selector matches 0 nodes, which leaves regular posts and DMs untouched rather than hiding unintended elements.
4. **URL-Level Absolute Defense:** Even if Instagram changes its DOM, direct navigation to `/reel/*` will always remain blocked because route detection relies on the structured `URL` API.

---

## 10. Known Limitations

- **Live Instagram UI A/B Tests:** Instagram frequently experiments with navigation layouts. In cases where Reels links do not use standard `href="/reels/"` patterns, the entry link may remain visible until updated selectors are added. Direct navigation to `/reel/*` will always remain blocked.
- **Mobile Web Instagram (`m.instagram.com`):** Route blocking is active on mobile web, but mobile DOM structures may differ from desktop layouts.
- **Audio Autoplay Edge Cases:** The extension actively mutes and pauses all `<video>` elements on Reel pages and intercepts `play` events. Highly specialized custom Web Audio integrations may require ongoing monitoring.
