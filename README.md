# ScrollShield

> **Take Control. Keep What Matters.**

ScrollShield is a Google Chrome extension (Manifest V3) engineered for selective social media blocking and intentional digital wellbeing.

---

## 1. Problem Statement

Modern social platforms have fused indispensable communication, knowledge, and community tools with hyper-engineered, algorithmically addictive short-form video loops:
- **YouTube:** High-value instructional tutorials, podcasts, and lecture videos sit right next to infinite-scroll YouTube Shorts designed to hook dopamine loops.
- **Instagram:** Direct Messaging (DMs) with close friends and family, photography portfolios, and creator updates share the same platform as infinite Instagram Reels designed to trap attention for hours.
- **Facebook:** Vital Messenger communication, community groups, organization pages, and long-form videos share the screen with endless Facebook Reels algorithms.
- **TikTok:** Search queries, creator profiles, direct messages, and individual shared videos are tethered to the infinite, hyper-personalized For You feed designed for endless passive consumption.

Traditional site blockers present a blunt, binary choice: completely block entire domains (breaking communication and valuable content) or keep them unblocked (succumbing to endless doom-scrolling).

## 2. Product Vision

ScrollShield introduces **surgical, selective filtering**:
- **Surgical Platform Blocking:** Eliminates addictive short-form video surfaces (YouTube Shorts, Instagram Reels, Facebook Reels, TikTok For You feed) while preserving utility layers (normal YouTube videos, Instagram DMs, Facebook Messenger, TikTok search, creator profiles, direct messaging, individual videos, community groups, pages, normal feed posts).
- **Mindful Interstitial Boundaries:** Displays a reflective boundary overlay ("You've reached a ScrollShield boundary. Take a moment and return to what matters.") with accessible escape actions.
- **Independent Controls:** Each supported platform has an independent toggle switch; disabling one platform does not affect others.
- **Local-Only Privacy:** 100% offline, zero tracking, zero telemetries, and zero third-party dependencies.

---

## 3. Implementation Status: Phase 5 vs. Planned Roadmap

| Feature Area | Current Status | Implemented Phase |
| :--- | :--- | :--- |
| **Manifest V3 Foundation** | ✅ **Implemented** (Least privilege) | Phase 1 |
| **Extension Popup UI** | ✅ **Implemented** (Four-platform toggles & live status) | Phase 1, 2, 3, 4 & 5 |
| **Settings / Options Page** | ✅ **Implemented** (Four-platform toggles & status badges) | Phase 1, 2, 3, 4 & 5 |
| **YouTube Shorts Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, overlay) | Phase 2 |
| **YouTube Shorts Shelf Suppression** | ✅ **Implemented** (Sidebar links & homepage shelves hidden) | Phase 2 |
| **Instagram Reels Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, boundary overlay) | Phase 3 |
| **Instagram Reels Entry Point Hiding** | ✅ **Implemented** (Sidebar Reels links & profile Reels tabs hidden) | Phase 3 |
| **Instagram SPA Navigation Sync** | ✅ **Implemented** (Handles popstate & client-side navigation) | Phase 3 |
| **Facebook Reels Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, boundary overlay) | Phase 4 |
| **Facebook Reels Entry Point Hiding** | ✅ **Implemented** (Conservative Reels links & tabs hidden) | Phase 4 |
| **Facebook SPA Navigation Sync** | ✅ **Implemented** (Handles popstate & debounced DOM changes) | Phase 4 |
| **TikTok For You Feed Blocker** | ✅ **Implemented** (URL parser, media interceptor, boundary overlay) | Phase 5 |
| **TikTok For You Entry Point Hiding** | ✅ **Implemented** (Conservative For You links & tabs hidden) | Phase 5 |
| **TikTok SPA Navigation Sync** | ✅ **Implemented** (Handles popstate & debounced DOM changes) | Phase 5 |
| **Mindful Reflection Prompts** | ⏳ *Intentionally Deferred* | Phase 6 |
| **Daily Time Budgets** | ⏳ *Intentionally Deferred* | Phase 7 |
| **Focus Schedules & Quiet Blocks** | ⏳ *Intentionally Deferred* | Phase 7 |
| **Usage Analytics & Local Dashboard** | ⏳ *Intentionally Deferred* | Phase 8 |

---

## 4. Architecture & Technical Design (Phase 5)

### A. Route Detection Architecture
- **YouTube (`src/content/youtube/route-detector.js`):**
  - Targets `/shorts/*` routes on YouTube hostnames.
  - Preserves `/watch`, `/results`, `/feed/subscriptions`, `/@channel`, `/channel/*`, `/playlist`.
- **Instagram (`src/content/instagram/route-detector.js`):**
  - Targets `/reel/{shortcode}/`, `/reels/{shortcode}/`, and root `/reels/` on Instagram hostnames.
  - Validates shortcodes (`[a-zA-Z0-9_-]{5,35}`).
  - Explicitly preserves normal posts (`/p/`), direct messages (`/direct/`), profiles, explore/search, and stories.
- **Facebook (`src/content/facebook/route-detector.js`):**
  - Targets `/reel/{id}/`, `/reels/{id}/`, and root `/reels/` feeds on Facebook hostnames.
  - Validates identifier formats (`[a-zA-Z0-9_-]{5,35}`).
  - Explicitly preserves Messenger (`/messages/`, `/messenger/`), ordinary watch videos (`/watch/`), groups, pages, profiles, and home feed.
- **TikTok (`src/content/tiktok/route-detector.js`):**
  - Targets `/foryou`, `/foryou/`, and root `/` (when confirmed with explicit For You page context or tab parameter).
  - **Explicitly Preserves:**
    - Creator profiles: `/@username`
    - Individual videos: `/@username/video/{videoId}` and `/video/{videoId}`
    - Search: `/search` and `/search/...`
    - Direct messaging: `/messages`, `/inbox`, `/chat`
    - Following feed: `/following`
    - LIVE broadcasts: `/live` and `/@username/live`
  - **Root-Route Safety:** The root route `/` with insufficient evidence of a For You feed defaults to unblocked (`category: 'root'`, `isForYouFeed: false`) to prevent accidental platform-wide lockouts.
  - Safe error handling: never throws exceptions on malformed URLs or non-TikTok hostnames.

### B. Media Suppression & Isolated Boundary Overlay
- **TikTok Blocker Overlay (`src/content/tiktok/blocker-overlay.js`):**
  - Injected inside an isolated Shadow DOM (`#scrollshield-tiktok-blocker-root`).
  - Completely covers the feed player with an opaque, dark navy gradient backdrop (`#0b0f19` to `#151d33`).
  - **Selective Media Interceptor:** Targets only media associated with the blocked feed (`isForYouVideo`). Explicitly protects chat containers, message docks, and sidebars from being paused or muted.
  - Displays ScrollShield boundary messaging:
    - **Header:** *"You've reached a ScrollShield boundary."*
    - **Supporting text:** *"You chose to limit endless TikTok scrolling. Take a moment and return to what matters. Your direct messages, search, creator profiles, and individual video links remain accessible."*
    - **Actions:** *"Leave TikTok Feed"* (navigates safely to `/search` or a non-feed destination) and *"Go Back"* (`window.history.back()`).
  - Full keyboard accessibility with visible focus outlines and ARIA dialog semantics.

### C. Conservative Entry Point Hiding
- **TikTok Selectors (`src/content/tiktok/selectors.js`):**
  - Targets verified For You entry anchors and tabs:
    - Navigation: `a[href="/foryou"]`, `a[href="/foryou/"]`, `a[href^="/foryou"]`, `a[data-e2e="nav-foryou"]`
    - Tabs: `div[role="tablist"] a[href*="/foryou"]`, `a[role="tab"][href*="/foryou"]`
  - **Safety Validator (`isSafeToHide`):** Strictly protects containers hosting search (`/search`), messages (`/messages`, `/inbox`), Following (`/following`), or creator profiles (`/@`). Never hides structural containers (`HTML`, `BODY`, `MAIN`, `NAV`, `HEADER`, `SECTION`, `ARTICLE`, `FORM`).
  - Scoped declarative CSS active only when `html[data-scrollshield-tiktok-foryou-blocked="true"]` is present.

### D. SPA Navigation Monitoring
- **TikTok Monitor (`src/content/tiktok/navigation-monitor.js`):**
  - Listens to HTML5 `popstate` events (browser Back/Forward).
  - Uses a lightweight scoped `MutationObserver` on `document.body` or `document.documentElement` to detect client-side route changes and dynamic rendering.
  - Debounced DOM update timer (200ms) prevents unbounded polling loops.
  - Clean `disconnect()` method.

### E. Settings Management (`src/common/settings.js`)
- Manages four independent platform settings:
  - `youtubeShortsEnabled: boolean` (default: `true`)
  - `instagramReelsEnabled: boolean` (default: `true`)
  - `facebookReelsEnabled: boolean` (default: `true`)
  - `tiktokForYouEnabled: boolean` (default: `true`)
- Stored exclusively in local storage via `chrome.storage.local`.
- Non-destructive updates: modifying one platform setting leaves all other platform settings intact.
- Live change broadcast via `chrome.storage.onChanged`.

---

## 5. Technology Stack & Permissions

- **Extension Specification:** Chrome Extension Manifest V3 (`manifest_version: 3`).
- **Core Languages:** Vanilla JavaScript (ES Modules for source modules, standalone bundled IIFE for content scripts), HTML5, and CSS3.
- **Permissions:**
  - `"storage"`: **Strictly and solely requested** to persist user configuration and broadcast live changes.
  - No `tabs`, `history`, `webRequest`, `scripting`, or background service workers are declared.
- **Content Scripts:**
  - YouTube: `*://*.youtube.com/*` -> `src/content/youtube.bundle.js` (`run_at: "document_start"`).
  - Instagram: `https://www.instagram.com/*` -> `src/content/instagram.bundle.js` (`run_at: "document_start"`).
  - Facebook: `https://www.facebook.com/*`, `https://m.facebook.com/*` -> `src/content/facebook.bundle.js` (`run_at: "document_start"`).
  - TikTok: `https://www.tiktok.com/*`, `https://m.tiktok.com/*` -> `src/content/tiktok.bundle.js` (`run_at: "document_start"`).
  - No broad `host_permissions` requested.

---

## 6. Repository Folder Structure

```
ScrollShield/
├── .gitignore
├── manifest.json                       # Manifest V3 (v0.5.0)
├── package.json                        # npm test script for native Node test runner
├── README.md                           # Complete documentation & test guide
├── src/
│   ├── assets/
│   │   └── icons/                      # High-DPI PNG icons (16, 32, 48, 128)
│   ├── common/
│   │   └── settings.js                 # Shared settings layer & validation
│   ├── content/
│   │   ├── facebook.bundle.js          # Production Facebook MV3 content bundle
│   │   ├── facebook/                   # Facebook modular source code
│   │   ├── instagram.bundle.js         # Production Instagram MV3 content bundle
│   │   ├── instagram/                  # Instagram modular source code
│   │   ├── tiktok.bundle.js            # Production TikTok MV3 content bundle
│   │   ├── tiktok/                     # TikTok modular source code
│   │   │   ├── blocker-overlay.js      # Shadow DOM boundary overlay & media pause
│   │   │   ├── index.js                # Content script controller
│   │   │   ├── navigation-monitor.js   # SPA lifecycle & popstate monitor
│   │   │   ├── route-detector.js       # Pure structured URL route detector
│   │   │   └── selectors.js            # Conservative For You entry selectors
│   │   ├── youtube.bundle.js           # Production YouTube MV3 content bundle
│   │   └── youtube/                    # YouTube modular source code
│   ├── popup/                          # Toolbar popup with four platform toggles
│   └── settings/                       # Options page with four platform toggles
└── tests/
    ├── blocking-logic.test.mjs         # YouTube blocking decision tests
    ├── facebook-blocking-logic.test.mjs# Facebook blocking decision & safety tests
    ├── facebook-route-detector.test.mjs# Facebook route detection tests
    ├── instagram-blocking-logic.test.mjs# Instagram blocking decision tests
    ├── instagram-route-detector.test.mjs# Instagram route detection tests
    ├── manifest.test.mjs               # Manifest V3 compliance & security tests
    ├── route-detector.test.mjs         # YouTube route detection tests
    ├── settings.test.mjs               # Settings schema, persistence & independence tests
    ├── tiktok-blocking-logic.test.mjs  # TikTok blocking decision & safety tests
    └── tiktok-route-detector.test.mjs  # TikTok route detection tests
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
node --test tests/manifest.test.mjs tests/route-detector.test.mjs tests/blocking-logic.test.mjs tests/instagram-route-detector.test.mjs tests/instagram-blocking-logic.test.mjs tests/facebook-route-detector.test.mjs tests/facebook-blocking-logic.test.mjs tests/tiktok-route-detector.test.mjs tests/tiktok-blocking-logic.test.mjs tests/settings.test.mjs
```

### Automated Checks Performed (137 Tests across 10 Suites)

1. **Manifest & Security Specifications (`manifest.test.mjs` - 14 tests):**
   - Valid JSON, MV3 specification, semantic version 0.5.0.
   - All icon files and PNG magic byte headers.
   - Strict enforcement that permissions contain **only** `"storage"`.
   - Strict enforcement that **no** background service worker or host permissions are declared.
   - Verification that `content_scripts` declares YouTube, Instagram, Facebook, and TikTok with valid, non-empty classic bundles.
2. **TikTok Route Detector (`tiktok-route-detector.test.mjs` - 17 tests):**
   - Dedicated `/foryou` routes with and without trailing slashes.
   - Root route `/` safe handling (unblocked by default, blocked with explicit context/parameter).
   - Following feed route (`/following`) non-blocking assurance.
   - User profile (`/@username`), individual video (`/@username/video/{id}`, `/video/{id}`), search, direct messages, and LIVE routes.
   - Query strings with "foryou" that do not trigger blocking.
   - Safe handling of malformed URLs and non-TikTok hostnames.
3. **TikTok Blocking Logic & DOM Safety (`tiktok-blocking-logic.test.mjs` - 17 tests):**
   - Blocking enabled vs. disabled decision logic.
   - Root route and Following feed preservation.
   - Profiles, search, individual videos, and messaging non-blocking assurance.
   - SPA navigation transitions into and out of For You feed.
   - Idempotence on rapid repeated route evaluations.
   - Dynamic settings toggling updates blocking behavior.
   - DOM safety: ensures containers containing search, messages, or profiles are never hidden.
   - Media isolation: ensures `isForYouVideo` targets feed media while protecting chat containers.
   - Valid scoped declarative CSS generation.
4. **Facebook Route Detector (`facebook-route-detector.test.mjs` - 14 tests):**
   - Complete Facebook URL classification and route safety.
5. **Facebook Blocking Logic & DOM Safety (`facebook-blocking-logic.test.mjs` - 13 tests):**
   - Complete Facebook blocking decision, container safety, and media isolation tests.
6. **Instagram Route Detector (`instagram-route-detector.test.mjs` - 15 tests):**
   - Complete Instagram route detection and shortcode validation.
7. **Instagram Blocking Logic & DOM Safety (`instagram-blocking-logic.test.mjs` - 12 tests):**
   - Complete Instagram blocking and container safety tests.
8. **YouTube Route Detector (`route-detector.test.mjs` - 12 tests):**
   - Complete YouTube URL classification and regression testing.
9. **YouTube Blocking Logic (`blocking-logic.test.mjs` - 9 tests):**
   - Complete YouTube blocking and DOM container safety regression testing.
10. **Settings Layer (`settings.test.mjs` - 8 tests):**
    - Default setting policy (all four platforms enabled).
    - Independent toggling across all four platforms without overwriting.
    - Missing and malformed setting type recovery.
    - Graceful storage error fallbacks.

---

## 8. Manual Browser Verification Checklist

*(Note: In accordance with testing standards, live TikTok behaviors are labeled **Not Yet Tested** until evaluated in an interactive browser session.)*

### TikTok Verification
1. **Load/Reload Extension:**
   - Open `chrome://extensions`.
   - Enable **Developer mode** (top-right).
   - Click **Load unpacked** and select the `ScrollShield` directory (or click Reload).
   - Confirm version `0.5.0` is displayed without errors. [Passed in automated headless test; Not Yet Tested in interactive browser]
2. **Verify TikTok Home Page:**
   - Open `https://www.tiktok.com/`.
   - Verify expected feed behavior and that non-feed elements remain usable. [Not Yet Tested in interactive browser]
3. **Verify Dedicated For You Feed Route:**
   - Navigate to `https://www.tiktok.com/foryou`.
   - Verify the ScrollShield boundary overlay appears immediately:
     - Header: *"You've reached a ScrollShield boundary."*
     - Supporting text: *"You chose to limit endless TikTok scrolling. Take a moment and return to what matters."*
   - Confirm feed video playback is paused and muted. [Not Yet Tested in interactive browser]
4. **Verify "Leave TikTok Feed" Action:**
   - Click **Leave TikTok Feed**; confirm navigation to a safe non-feed destination (`/search`). [Not Yet Tested in interactive browser]
5. **Verify "Go Back" Action:**
   - Click **Go Back**; confirm browser returns to previous safe page. [Not Yet Tested in interactive browser]
6. **Verify Following Feed is Accessible:**
   - Open `https://www.tiktok.com/following`.
   - Confirm Following feed is not blocked according to product policy. [Not Yet Tested in interactive browser]
7. **Verify Creator Profiles:**
   - Open a creator profile (e.g. `https://www.tiktok.com/@username`).
   - Confirm creator bio, avatar, and video grid display normally. [Not Yet Tested in interactive browser]
8. **Verify Individual Video Links:**
   - Open a specific video link (e.g. `https://www.tiktok.com/@username/video/123...`).
   - Confirm it is **not blocked** and can be viewed directly. [Not Yet Tested in interactive browser]
9. **Verify Search:**
   - Use search and open a search result; verify search results remain functional. [Not Yet Tested in interactive browser]
10. **Verify Direct Messages:**
    - Open messages (`https://www.tiktok.com/messages`); verify messaging remains functional. [Not Yet Tested in interactive browser]
11. **Verify Internal SPA Navigation:**
    - Transition into the For You feed and back out; confirm overlay lifecycle responds. [Not Yet Tested in interactive browser]
12. **Verify Browser Back and Forward:**
    - Navigate back/forward between search and For You; confirm correct boundary lifecycle. [Not Yet Tested in interactive browser]
13. **Verify Toggling in Popup & Settings:**
    - Open the ScrollShield popup.
    - Disable **Block TikTok For You Feed**; confirm the current feed becomes accessible.
    - Re-enable the toggle; confirm feed blocking resumes immediately. [Not Yet Tested in interactive browser]
14. **Verify Settings Persistence:**
    - Reload the extension; confirm all four toggles retain their saved states. [Passed in automated storage suite; Not Yet Tested in interactive browser]
15. **Verify Regression Across YouTube, Instagram, and Facebook:**
    - Confirm YouTube Shorts, Instagram Reels, and Facebook Reels remain independently configured and blocked. [Passed in automated regression suite; Not Yet Tested in interactive browser]
16. **Check Console for Errors:**
    - Inspect developer console on TikTok; confirm no uncaught exceptions or broken scripts. [Not Yet Tested in interactive browser]

---

## 9. Strategy for Maintaining Selectors

TikTok is a client-side React SPA with obfuscated, dynamically generated classes and frequent A/B testing.

**Maintenance Rules:**
1. **Never rely on obfuscated class names:** Avoid selectors targeting auto-generated class names.
2. **Rely on stable semantic attributes and paths:** Use `a[href="/foryou"]`, `a[href^="/foryou"]`, `a[data-e2e="nav-foryou"]`.
3. **Safety First:** If TikTok alters an entry link structure, the selector matches 0 nodes, which leaves regular navigation, profiles, and search untouched rather than hiding unintended elements.
4. **URL-Level Absolute Defense:** Even if TikTok changes its DOM, direct navigation to `/foryou` will always remain blocked because route detection relies on the structured `URL` API.

---

## 10. Known Limitations

- **TikTok Interface A/B Variations:** TikTok frequently tests multiple navigation layouts. If a For You entry uses an unexpected internal structure without standard `/foryou` anchor patterns, it may remain visible until updated selectors are added. Direct navigation to `/foryou` remains protected at the URL level.
- **Root URL Ambiguity:** For some logged-in users, the root `/` may render the For You feed. ScrollShield uses conservative page-context inspection to identify active For You tabs on `/`, defaulting to unblocked when evidence is insufficient to avoid accidental site-wide lockouts.
- **Mobile Web TikTok (`m.tiktok.com`):** While route blocking is active on mobile web, mobile DOM hierarchies may differ from desktop layouts.
