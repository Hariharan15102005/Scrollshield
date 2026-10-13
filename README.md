# ScrollShield

> **Take Control. Keep What Matters.**

ScrollShield is a Google Chrome extension (Manifest V3) engineered for selective social media blocking and intentional digital wellbeing.

---

## 1. Problem Statement

Modern social platforms have fused indispensable communication, knowledge, and community tools with hyper-engineered, algorithmically addictive short-form video loops:
- **YouTube:** High-value instructional tutorials, podcasts, and lecture videos sit right next to infinite-scroll YouTube Shorts designed to hook dopamine loops.
- **Instagram:** Direct Messaging (DMs) with close friends and family, photography portfolios, and creator updates share the same platform as infinite Instagram Reels designed to trap attention for hours.
- **Facebook:** Vital Messenger communication, community groups, organization pages, and long-form videos share the screen with endless Facebook Reels algorithms.

Traditional site blockers present a blunt, binary choice: completely block entire domains (breaking communication and valuable content) or keep them unblocked (succumbing to endless doom-scrolling).

## 2. Product Vision

ScrollShield introduces **surgical, selective filtering**:
- **Surgical Platform Blocking:** Eliminates addictive short-form video surfaces (YouTube Shorts, Instagram Reels, Facebook Reels) while preserving utility layers (normal YouTube videos, Instagram DMs, Facebook Messenger, community groups, pages, profiles, normal feed posts, search).
- **Mindful Interstitial Boundaries:** Displays a reflective boundary overlay ("You've reached a ScrollShield boundary. Take a moment and return to what matters.") with accessible navigation buttons.
- **Independent Controls:** Each supported platform has an independent toggle switch; disabling one platform does not affect others.
- **Local-Only Privacy:** 100% offline, zero tracking, zero telemetries, and zero third-party dependencies.

---

## 3. Implementation Status: Phase 4 vs. Planned Roadmap

| Feature Area | Current Status | Implemented Phase |
| :--- | :--- | :--- |
| **Manifest V3 Foundation** | ✅ **Implemented** (Least privilege) | Phase 1 |
| **Extension Popup UI** | ✅ **Implemented** (Three-platform toggles & live status) | Phase 1, 2, 3 & 4 |
| **Settings / Options Page** | ✅ **Implemented** (Three-platform toggles & status badges) | Phase 1, 2, 3 & 4 |
| **YouTube Shorts Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, overlay) | Phase 2 |
| **YouTube Shorts Shelf Suppression** | ✅ **Implemented** (Sidebar links & homepage shelves hidden) | Phase 2 |
| **Instagram Reels Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, boundary overlay) | Phase 3 |
| **Instagram Reels Entry Point Hiding** | ✅ **Implemented** (Sidebar Reels links & profile Reels tabs hidden) | Phase 3 |
| **Instagram SPA Navigation Sync** | ✅ **Implemented** (Handles popstate & client-side navigation) | Phase 3 |
| **Facebook Reels Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, boundary overlay) | Phase 4 |
| **Facebook Reels Entry Point Hiding** | ✅ **Implemented** (Conservative Reels links & tabs hidden) | Phase 4 |
| **Facebook SPA Navigation Sync** | ✅ **Implemented** (Handles popstate & debounced DOM changes) | Phase 4 |
| **Mindful Reflection Prompts** | ⏳ *Intentionally Deferred* | Phase 5 |
| **Daily Time Budgets** | ⏳ *Intentionally Deferred* | Phase 6 |
| **Focus Schedules & Quiet Blocks** | ⏳ *Intentionally Deferred* | Phase 6 |
| **Usage Analytics & Local Dashboard** | ⏳ *Intentionally Deferred* | Phase 7 |

---

## 4. Architecture & Technical Design (Phase 4)

### A. Route Detection Architecture
- **YouTube (`src/content/youtube/route-detector.js`):**
  - Targets `/shorts/*` routes on YouTube hostnames.
  - Preserves `/watch`, `/results`, `/feed/subscriptions`, `/@channel`, `/channel/*`, `/playlist`.
- **Instagram (`src/content/instagram/route-detector.js`):**
  - Targets `/reel/{shortcode}/`, `/reels/{shortcode}/`, and root `/reels/` on Instagram hostnames.
  - Validates shortcodes (`[a-zA-Z0-9_-]{5,35}`).
  - **Explicitly Preserves:** Normal posts (`/p/`), Direct messages (`/direct/`), User profiles, Explore/search, and Stories.
- **Facebook (`src/content/facebook/route-detector.js`):**
  - Targets `/reel/{id}/`, `/reels/{id}/`, and root `/reels/` feeds on Facebook hostnames (`facebook.com`, `www.facebook.com`, `m.facebook.com`, `web.facebook.com`).
  - Validates identifier formats (`[a-zA-Z0-9_-]{5,35}`).
  - **Explicitly Preserves:**
    - Messenger routes: `/messages/` and `/messenger/`
    - Watch and long-form video routes: `/watch/` and `/watch?v=...`
    - Groups: `/groups/{id}/`
    - Pages: `/pages/...` and `/pg/...`
    - User profiles: `/{username}/` and `/profile.php`
    - Search: `/search/`
    - Main feed: `/`
  - Safe error handling: never throws exceptions on malformed URLs or query strings.

### B. Media Suppression & Isolated Boundary Overlay
- **Facebook Blocker Overlay (`src/content/facebook/blocker-overlay.js`):**
  - Injected inside an isolated Shadow DOM (`#scrollshield-facebook-blocker-root`).
  - Completely covers the Reel player with an opaque, dark navy backdrop.
  - **Selective Media Interceptor:** Targets only media associated with the blocked Reel (`isReelVideo`). Explicitly protects Messenger chat tabs, docks, floating calls, and complementary sidebars from being paused or muted.
  - Displays ScrollShield boundary messaging:
    - **Header:** *"You've reached a ScrollShield boundary."*
    - **Supporting text:** *"You chose to block Facebook Reels. Take a moment and return to what matters. Your Messenger conversations, groups, pages, watch videos, and normal feed posts remain accessible."*
    - **Actions:** *"Back to Facebook"* (navigates safely to `/`) and *"Go Back"* (`window.history.back()`).
  - Idempotent mount/dismount with clean event teardown.

### C. Conservative Entry Point Hiding
- **Facebook Selectors (`src/content/facebook/selectors.js`):**
  - Targets verified Reels entry anchors and tabs:
    - Navigation: `a[href="/reel/"]`, `a[href="/reels/"]`, `a[href^="/reel/"]`, `a[href^="/reels/"]`
    - Tabs: `div[role="tablist"] a[href*="/reel"]`, `a[role="tab"][href*="/reel"]`
  - **Safety Validator (`isSafeToHide`):** Strictly protects containers hosting normal watch videos (`/watch/`), Messenger links (`/messages/`, `/messenger/`), groups (`/groups/`), pages (`/pages/`), or posts (`/posts/`). Never hides top-level structural containers (`HTML`, `BODY`, `MAIN`, `NAV`, `HEADER`, `SECTION`, `ARTICLE`, `FORM`).
  - Scoped declarative CSS active only when `html[data-scrollshield-fb-reels-blocked="true"]` is present.

### D. SPA Navigation Monitoring
- **Facebook Monitor (`src/content/facebook/navigation-monitor.js`):**
  - Listens to HTML5 `popstate` events (browser Back/Forward).
  - Uses a lightweight scoped `MutationObserver` on `document.body` or `document.documentElement` to detect client-side route changes and dynamic rendering.
  - Debounced DOM update timer (200ms) prevents unbounded polling loops.
  - Clean `disconnect()` method.

### E. Settings Management (`src/common/settings.js`)
- Manages three independent platform settings:
  - `youtubeShortsEnabled: boolean` (default: `true`)
  - `instagramReelsEnabled: boolean` (default: `true`)
  - `facebookReelsEnabled: boolean` (default: `true`)
- Stored exclusively in local storage via `chrome.storage.local`.
- Non-destructive updates: modifying one platform setting leaves the other settings intact.
- Live change broadcast via `chrome.storage.onChanged`.

---

## 5. Technology Stack & Permissions

- **Extension Specification:** Chrome Extension Manifest V3 (`manifest_version: 3`).
- **Core Languages:** Vanilla JavaScript (ES Modules for source modules, standalone bundled IIFE for content scripts), HTML5, and CSS3.
- **Permissions:**
  - `"storage"`: **Strictly and solely requested** to persist user configuration (`youtubeShortsEnabled`, `instagramReelsEnabled`, `facebookReelsEnabled`) and broadcast live changes.
  - No `tabs`, `history`, `webRequest`, `scripting`, or background service workers are declared.
- **Content Scripts:**
  - YouTube: `*://*.youtube.com/*` -> `src/content/youtube.bundle.js` (`run_at: "document_start"`).
  - Instagram: `https://www.instagram.com/*` -> `src/content/instagram.bundle.js` (`run_at: "document_start"`).
  - Facebook: `https://www.facebook.com/*`, `https://m.facebook.com/*` -> `src/content/facebook.bundle.js` (`run_at: "document_start"`).
  - No broad `host_permissions` requested.

---

## 6. Repository Folder Structure

```
ScrollShield/
├── .gitignore
├── manifest.json                       # Manifest V3 (v0.4.0)
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
│   │   │   ├── blocker-overlay.js      # Shadow DOM boundary overlay & media pause
│   │   │   ├── index.js                # Content script controller
│   │   │   ├── navigation-monitor.js   # SPA lifecycle & popstate monitor
│   │   │   ├── route-detector.js       # Pure structured URL route detector
│   │   │   └── selectors.js            # Conservative Reels entry selectors
│   │   ├── instagram.bundle.js         # Production Instagram MV3 content bundle
│   │   ├── instagram/                  # Instagram modular source code
│   │   │   ├── blocker-overlay.js
│   │   │   ├── index.js
│   │   │   ├── navigation-monitor.js
│   │   │   ├── route-detector.js
│   │   │   └── selectors.js
│   │   ├── youtube.bundle.js           # Production YouTube MV3 content bundle
│   │   └── youtube/                    # YouTube modular source code
│   │       ├── blocker-overlay.js
│   │       ├── index.js
│   │       ├── navigation-monitor.js
│   │       ├── route-detector.js
│   │       └── selectors.js
│   ├── popup/                          # Toolbar popup with three platform toggles
│   └── settings/                       # Options page with three platform toggles
└── tests/
    ├── blocking-logic.test.mjs         # YouTube blocking decision tests
    ├── facebook-blocking-logic.test.mjs# Facebook blocking decision & safety tests
    ├── facebook-route-detector.test.mjs# Facebook route detection tests
    ├── instagram-blocking-logic.test.mjs# Instagram blocking decision tests
    ├── instagram-route-detector.test.mjs# Instagram route detection tests
    ├── manifest.test.mjs               # Manifest V3 compliance & security tests
    ├── route-detector.test.mjs         # YouTube route detection tests
    └── settings.test.mjs               # Settings schema, persistence & independence tests
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
node --test tests/manifest.test.mjs tests/route-detector.test.mjs tests/blocking-logic.test.mjs tests/instagram-route-detector.test.mjs tests/instagram-blocking-logic.test.mjs tests/facebook-route-detector.test.mjs tests/facebook-blocking-logic.test.mjs tests/settings.test.mjs
```

### Automated Checks Performed (103 Tests across 8 Suites)

1. **Manifest & Security Specifications (`manifest.test.mjs` - 14 tests):**
   - Valid JSON, MV3 specification, semantic version 0.4.0.
   - All icon files and PNG magic byte headers.
   - Strict enforcement that permissions contain **only** `"storage"`.
   - Strict enforcement that **no** background service worker or host permissions are declared.
   - Verification that `content_scripts` declares YouTube, Instagram, and Facebook with valid, non-empty classic bundles.
2. **Facebook Route Detector (`facebook-route-detector.test.mjs` - 15 tests):**
   - Direct `/reel/{id}/` URLs with and without trailing slash.
   - Query parameters, share tokens, and fragments.
   - Plural `/reels/{id}/` variation and root `/reels/` feed.
   - Strict exclusion of normal `/watch/` video pages.
   - Strict exclusion of Messenger routes (`/messages/`, `/messenger/`).
   - Strict exclusion of groups, pages, user profiles, and search.
   - Safe handling of malformed URLs and non-Facebook hostnames.
   - Identifier validation rules.
3. **Facebook Blocking Logic & DOM Safety (`facebook-blocking-logic.test.mjs` - 14 tests):**
   - Blocking enabled vs. disabled decision logic.
   - Normal `/watch/` videos, Messenger, groups, pages, and profiles non-blocking assurance.
   - SPA navigation transitions into and out of Reels.
   - Idempotence on rapid repeated route evaluations.
   - Dynamic settings toggling updates blocking behavior.
   - DOM safety: ensures mixed containers containing watch or Messenger links are never hidden.
   - Media isolation: ensures `isReelVideo` targets Reel media while protecting Messenger chat docks.
   - Valid scoped declarative CSS generation.
4. **Instagram Route Detector (`instagram-route-detector.test.mjs` - 15 tests):**
   - Complete Instagram route detection and shortcode validation.
5. **Instagram Blocking Logic & DOM Safety (`instagram-blocking-logic.test.mjs` - 12 tests):**
   - Complete Instagram blocking and container safety tests.
6. **YouTube Route Detector (`route-detector.test.mjs` - 12 tests):**
   - Complete YouTube URL classification and regression testing.
7. **YouTube Blocking Logic (`blocking-logic.test.mjs` - 9 tests):**
   - Complete YouTube blocking and DOM container safety regression testing.
8. **Settings Layer (`settings.test.mjs` - 8 tests):**
   - Default setting policy (all three platforms enabled).
   - Independent toggling across all three platforms without overwriting.
   - Missing and malformed setting type recovery.
   - Graceful storage error fallbacks.

---

## 8. Manual Browser Verification Checklist

*(Note: In accordance with testing standards, live Facebook behaviors are labeled **Not Yet Tested** until evaluated in an interactive browser session.)*

### Facebook Verification
1. **Load/Reload Extension:**
   - Open `chrome://extensions`.
   - Enable **Developer mode** (top-right).
   - Click **Load unpacked** and select the `ScrollShield` directory (or click Reload).
   - Confirm version `0.4.0` is displayed without errors. [Passed in automated headless test; Not Yet Tested in interactive browser]
2. **Verify Facebook Home Feed & Navigation:**
   - Open `https://www.facebook.com/`.
   - Confirm normal feed posts, stories tray, notifications, and navigation links remain visible and functional. [Not Yet Tested in interactive browser]
3. **Verify Dedicated Reel Route Blocking:**
   - Open a dedicated Reel URL (e.g. `https://www.facebook.com/reel/{ID}/`).
   - Verify the ScrollShield boundary overlay appears immediately:
     - Header: *"You've reached a ScrollShield boundary."*
     - Supporting text: *"You chose to block Facebook Reels. Take a moment and return to what matters."*
   - Confirm Reel video playback is paused and muted. [Not Yet Tested in interactive browser]
4. **Verify "Back to Facebook" Action:**
   - Click **Back to Facebook**; confirm navigation to the home feed `/`. [Not Yet Tested in interactive browser]
5. **Verify "Go Back" Action:**
   - Click **Go Back**; confirm browser returns to previous safe page. [Not Yet Tested in interactive browser]
6. **Verify Normal Videos & Watch Pages Remain Accessible:**
   - Open an ordinary Facebook video or watch page (`https://www.facebook.com/watch/?v=...`).
   - Confirm it is **not blocked** and plays normally. [Not Yet Tested in interactive browser]
7. **Verify Messenger is Fully Functional:**
   - Open Messenger (`https://www.facebook.com/messages/`) and test a conversation thread.
   - Confirm messaging, chat heads, and video previews remain functional. [Not Yet Tested in interactive browser]
8. **Verify Groups and Pages:**
   - Visit a Facebook group (`https://www.facebook.com/groups/...`) and a page (`https://www.facebook.com/pages/...`).
   - Confirm group/page posts display normally. [Not Yet Tested in interactive browser]
9. **Verify User Profiles:**
   - Visit a user profile; navigate through normal profile posts. [Not Yet Tested in interactive browser]
10. **Verify Internal SPA Navigation:**
    - Use Facebook client-side navigation to transition into a Reel and back to the feed.
    - Confirm the boundary overlay engages on Reel and dismounts when navigating away. [Not Yet Tested in interactive browser]
11. **Verify Browser Back and Forward:**
    - Navigate back/forward between feed and Reel; confirm correct boundary lifecycle. [Not Yet Tested in interactive browser]
12. **Verify Toggling in Popup & Settings:**
    - Open the ScrollShield popup.
    - Disable **Block Facebook Reels**; confirm Facebook Reels become accessible again.
    - Re-enable the toggle; confirm Reels blocking resumes immediately. [Not Yet Tested in interactive browser]
13. **Verify Settings Persistence:**
    - Reload the extension; confirm all three toggles retain their saved states. [Passed in automated storage test; Not Yet Tested in interactive browser]
14. **Verify YouTube Shorts & Instagram Reels Regression:**
    - Confirm YouTube Shorts and Instagram Reels remain blocked and their toggles work independently. [Passed in automated regression test; Not Yet Tested in interactive browser]

---

## 9. Strategy for Maintaining Selectors

Facebook is a massive React SPA with obfuscated, dynamically generated classes (e.g. `x1i10hfl`).

**Maintenance Rules:**
1. **Never rely on obfuscated class names:** Avoid selectors targeting auto-generated class names.
2. **Rely on stable semantic attributes and paths:** Use `a[href^="/reel/"]`, `a[href^="/reels/"]`, `div[role="tablist"] a[href*="/reel"]`.
3. **Safety First:** If Facebook alters an entry link structure, the selector matches 0 nodes, which leaves regular posts, Messenger, groups, and pages untouched rather than hiding unintended elements.
4. **URL-Level Absolute Defense:** Even if Facebook changes its DOM, direct navigation to `/reel/*` will always remain blocked because route detection relies on the structured `URL` API.

---

## 10. Known Limitations

- **Facebook Interface A/B Variations:** Facebook tests multiple layout variations. If a Reels entry uses an unexpected internal structure without a standard `/reel/` anchor, it may remain visible until updated selectors are added. Direct navigation to `/reel/*` remains strictly protected.
- **Mobile Web Facebook (`m.facebook.com`):** Route blocking is active on mobile web, but mobile DOM structures may differ from desktop layouts.
- **Embedded Videos in Feeds:** Posts with video attachments on the feed are ordinary posts and are intentionally preserved. ScrollShield blocks dedicated Reels surfaces, not ordinary video posts.
