# ScrollShield

> **Take Control. Keep What Matters.**

ScrollShield is a Google Chrome extension (Manifest V3) engineered for selective social media blocking and intentional digital wellbeing.

---

## 1. Problem Statement

Modern social platforms have fused indispensable communication, knowledge, and community tools with hyper-engineered, algorithmically addictive feeds and short-form video loops:
- **YouTube:** High-value instructional tutorials, podcasts, and lecture videos sit right next to infinite-scroll YouTube Shorts designed to hook dopamine loops.
- **Instagram:** Direct Messaging (DMs) with close friends and family, photography portfolios, and creator updates share the same platform as infinite Instagram Reels designed to trap attention for hours.
- **Facebook:** Vital Messenger communication, community groups, organization pages, and long-form videos share the screen with endless Facebook Reels algorithms.
- **TikTok:** Search queries, creator profiles, direct messages, and individual shared videos are tethered to the infinite, hyper-personalized For You feed designed for endless passive consumption.
- **X (Twitter):** Direct messages, breaking news search, creator profiles, community lists, and technical discussions share the screen with the infinite, algorithmically optimized Home timeline ("For you" / "Following").
- **Reddit:** Specific communities (subreddits), in-depth technical discussions, comments, search, and direct chat are coupled with endless front-page Home, Popular, and All feeds designed for mindless browsing.

Traditional site blockers present a blunt, binary choice: completely block entire domains (breaking communication, useful research, and community access) or keep them unblocked (succumbing to endless doom-scrolling).

## 2. Product Vision

ScrollShield introduces **surgical, selective filtering**:
- **Surgical Platform Blocking:** Eliminates addictive endless loops (YouTube Shorts, Instagram Reels, Facebook Reels, TikTok For You feed, X Home timeline, Reddit Home/Popular/All feeds) while preserving utility layers (normal YouTube videos, Instagram DMs, Facebook Messenger, TikTok search/profiles, X DMs/search/profiles/posts, Reddit subreddits/discussions/comments/search/chat).
- **Mindful Interstitial Boundaries:** Displays a reflective boundary overlay ("You've reached a ScrollShield boundary. Take a moment and return to what matters.") with accessible escape actions.
- **Independent Controls:** Each supported platform has an independent toggle switch; disabling one platform does not affect any others.
- **Local-Only Privacy:** 100% offline, zero tracking, zero telemetries, and zero third-party dependencies.

---

## 3. Implementation Status: Phase 6 vs. Planned Roadmap

| Feature Area | Current Status | Implemented Phase |
| :--- | :--- | :--- |
| **Manifest V3 Foundation** | ✅ **Implemented** (Least privilege) | Phase 1 |
| **Extension Popup UI** | ✅ **Implemented** (Six-platform toggles & live status) | Phase 1, 2, 3, 4, 5 & 6 |
| **Settings / Options Page** | ✅ **Implemented** (Six-platform toggles & status badges) | Phase 1, 2, 3, 4, 5 & 6 |
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
| **X Home Timeline Blocker** | ✅ **Implemented** (URL parser, media interceptor, boundary overlay) | Phase 6A |
| **X Home Entry Point Hiding** | ✅ **Implemented** (Conservative Home tab & navigation hidden) | Phase 6A |
| **X SPA Navigation Sync** | ✅ **Implemented** (Handles popstate & debounced DOM changes) | Phase 6A |
| **Reddit Feeds Blocker** | ✅ **Implemented** (Home, Popular, All feeds blocked; communities preserved) | Phase 6B |
| **Reddit Feed Entry Point Hiding** | ✅ **Implemented** (Home, Popular, All navigation anchors hidden) | Phase 6B |
| **Reddit SPA Navigation Sync** | ✅ **Implemented** (Handles popstate & debounced DOM changes) | Phase 6B |
| **Mindful Reflection Prompts** | ⏳ *Intentionally Deferred* | Phase 7 |
| **Daily Time Budgets** | ⏳ *Intentionally Deferred* | Phase 7 |
| **Focus Schedules & Quiet Blocks** | ⏳ *Intentionally Deferred* | Phase 7 |
| **Usage Analytics & Local Dashboard** | ⏳ *Intentionally Deferred* | Phase 8 |

---

## 4. Architecture & Technical Design (Phase 6)

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
  - Explicitly preserves creator profiles (`/@username`), individual videos (`/@username/video/{id}`), search (`/search`), DMs (`/messages`), following feed (`/following`), and LIVE (`/live`).
- **X / Twitter (`src/content/x/route-detector.js`):**
  - Targets `/home`, `/home/`, and root `/` (when confirmed with explicit Home page context or tab parameter).
  - **Explicitly Preserves:**
    - Explore and search: `/explore`, `/search`
    - Notifications: `/notifications`
    - Direct messages: `/messages`, `/i/chat`
    - User profiles: `/{username}` (e.g. `/elonmusk`, `/openai/media`)
    - Individual status posts/tweets: `/{username}/status/{id}`, `/i/status/{id}`
    - Lists and communities: `/i/lists`, `/i/communities`, `/{username}/lists`
    - Settings and account utilities: `/settings`, `/bookmarks`
  - **Query Parameter Safety:** Ensures queries like `/search?q=work_from_home` or `/user?ref=home` do NOT trigger blocking.
- **Reddit (`src/content/reddit/route-detector.js`):**
  - Targets Home feed (`/`, `/best`, `/hot`, `/new`, `/top`), Popular feed (`/popular`, `/popular/`, `/r/popular`, `/r/popular/`), and All feed (`/r/all`, `/r/all/`).
  - **Explicitly Preserves (NEVER Blocked):**
    - Specific Subreddits: `/r/{subreddit}/` (e.g. `/r/programming/`, `/r/AskReddit/`, `/r/science/top/`)
    - Subreddit sort filters: `/r/{subreddit}/hot/`, `/r/{subreddit}/top/`, `/r/{subreddit}/new/`
    - Individual Posts and Comments: `/r/{subreddit}/comments/{id}/...`, `/comments/{id}/...`
    - Search: `/search`, `/search/...`, `/r/{subreddit}/search`
    - Direct Messages and Chat: `/message/inbox`, `/message/messages`, `/chat`
    - User Profiles and Saved Items: `/user/{username}/`, `/u/{username}/`, `/user/{username}/saved`
    - Settings and Notifications: `/settings`, `/notifications`
  - **Query Parameter Safety:** Queries containing "popular" or "all" on non-feed routes (e.g. `/search?q=popular_science`) do NOT trigger feed blocking.

### B. Media Suppression & Isolated Boundary Overlays
- **X Overlay (`src/content/x/blocker-overlay.js`):**
  - Injected into isolated Shadow DOM (`#scrollshield-x-blocker-root`).
  - Completely covers the Home timeline with an opaque dark gradient backdrop (`#0b0f19` to `#151d33`).
  - Pauses and mutes timeline video playback while protecting messages and drawer media (`isHomeVideo`).
  - Actions: **Leave Timeline** (navigates safely to `/explore`) and **Go Back** (`window.history.back()` with `/explore` fallback).
- **Reddit Overlay (`src/content/reddit/blocker-overlay.js`):**
  - Injected into isolated Shadow DOM (`#scrollshield-reddit-blocker-root`).
  - Completely covers the endless feed container with an opaque dark gradient backdrop.
  - Pauses feed autoplay videos while protecting comments and discussion media (`isFeedVideo`).
  - Actions: **Leave Feed** (navigates safely to `/search`) and **Go Back** (`window.history.back()` with `/search` fallback).
- Both overlays support full keyboard accessibility, visible focus states, and ARIA dialog semantics.

### C. Conservative Entry Point Hiding
- **X Selectors (`src/content/x/selectors.js`):**
  - Targets verified Home timeline entry points: `a[data-testid="AppTabBar_Home_Link"]`, `a[href="/home"]`, `div[role="tablist"] a[href="/home"]`.
  - Safety check (`isSafeToHide`): Protects navigation bar, Explore, Notifications, DMs, Profiles, and Tweet compose button.
  - Scoped declarative CSS activated by `html[data-scrollshield-x-home-blocked="true"]`.
- **Reddit Selectors (`src/content/reddit/selectors.js`):**
  - Targets verified feed entry points: `a[href="/r/popular"]`, `a[href="/r/all"]`, `a[href="/popular"]`, `a#home-link`, `left-nav a[href="/"]`.
  - Safety check (`isSafeToHide`): Protects Reddit header logo, community links (`/r/{subreddit}`), search bars, user profiles, and chat.
  - Scoped declarative CSS activated by `html[data-scrollshield-reddit-feeds-blocked="true"]`.

### D. SPA Navigation Monitoring
- Both X and Reddit utilize dynamic single-page application (SPA) architectures.
- `src/content/x/navigation-monitor.js` and `src/content/reddit/navigation-monitor.js` subscribe to `popstate` events and maintain lightweight, scoped `MutationObserver` instances with debounced updates (200ms) to detect route changes cleanly without high-frequency polling.

### E. Settings Management (`src/common/settings.js`)
- Manages six independent platform settings:
  - `youtubeShortsEnabled: boolean` (default: `true`)
  - `instagramReelsEnabled: boolean` (default: `true`)
  - `facebookReelsEnabled: boolean` (default: `true`)
  - `tiktokForYouEnabled: boolean` (default: `true`)
  - `xHomeFeedEnabled: boolean` (default: `true`)
  - `redditFeedsEnabled: boolean` (default: `true`)
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
  - X: `https://x.com/*`, `https://twitter.com/*` -> `src/content/x.bundle.js` (`run_at: "document_start"`).
  - Reddit: `https://www.reddit.com/*`, `https://reddit.com/*` -> `src/content/reddit.bundle.js` (`run_at: "document_start"`).
  - No broad `host_permissions` requested.

---

## 6. Repository Folder Structure

```
ScrollShield/
├── .gitignore
├── manifest.json                       # Manifest V3 (v0.6.0)
├── package.json                        # npm test script for native Node test runner
├── README.md                           # Complete documentation & test guide
├── src/
│   ├── assets/
│   │   └── icons/                      # High-DPI PNG icons (16, 32, 48, 128)
│   ├── common/
│   │   └── settings.js                 # Shared settings layer & validation (6 platforms)
│   ├── content/
│   │   ├── facebook.bundle.js          # Production Facebook MV3 content bundle
│   │   ├── facebook/                   # Facebook modular source code
│   │   ├── instagram.bundle.js         # Production Instagram MV3 content bundle
│   │   ├── instagram/                  # Instagram modular source code
│   │   ├── reddit.bundle.js            # Production Reddit MV3 content bundle
│   │   ├── reddit/                     # Reddit modular source code
│   │   │   ├── blocker-overlay.js      # Shadow DOM boundary overlay & media pause
│   │   │   ├── index.js                # Content script controller
│   │   │   ├── navigation-monitor.js   # SPA lifecycle & popstate monitor
│   │   │   ├── route-detector.js       # Pure structured URL route detector
│   │   │   └── selectors.js            # Conservative feed entry selectors
│   │   ├── tiktok.bundle.js            # Production TikTok MV3 content bundle
│   │   ├── tiktok/                     # TikTok modular source code
│   │   ├── x.bundle.js                 # Production X MV3 content bundle
│   │   ├── x/                          # X modular source code
│   │   │   ├── blocker-overlay.js      # Shadow DOM boundary overlay & media pause
│   │   │   ├── index.js                # Content script controller
│   │   │   ├── navigation-monitor.js   # SPA lifecycle & popstate monitor
│   │   │   ├── route-detector.js       # Pure structured URL route detector
│   │   │   └── selectors.js            # Conservative Home entry selectors
│   │   ├── youtube.bundle.js           # Production YouTube MV3 content bundle
│   │   └── youtube/                    # YouTube modular source code
│   ├── popup/                          # Toolbar popup with six platform toggles
│   └── settings/                       # Options page with six platform toggles
└── tests/
    ├── blocking-logic.test.mjs         # YouTube blocking decision tests
    ├── facebook-blocking-logic.test.mjs# Facebook blocking decision & safety tests
    ├── facebook-route-detector.test.mjs# Facebook route detection tests
    ├── instagram-blocking-logic.test.mjs# Instagram blocking decision tests
    ├── instagram-route-detector.test.mjs# Instagram route detection tests
    ├── manifest.test.mjs               # Manifest V3 compliance & security tests (6 platforms)
    ├── reddit-blocking-logic.test.mjs  # Reddit blocking decision & safety tests
    ├── reddit-route-detector.test.mjs  # Reddit route detection tests
    ├── route-detector.test.mjs         # YouTube route detection tests
    ├── settings.test.mjs               # Settings schema, persistence & independence tests (6 platforms)
    ├── tiktok-blocking-logic.test.mjs  # TikTok blocking decision & safety tests
    ├── tiktok-route-detector.test.mjs  # TikTok route detection tests
    ├── x-blocking-logic.test.mjs       # X blocking decision & safety tests
    └── x-route-detector.test.mjs       # X route detection tests
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
node --test tests/manifest.test.mjs tests/route-detector.test.mjs tests/blocking-logic.test.mjs tests/instagram-route-detector.test.mjs tests/instagram-blocking-logic.test.mjs tests/facebook-route-detector.test.mjs tests/facebook-blocking-logic.test.mjs tests/tiktok-route-detector.test.mjs tests/tiktok-blocking-logic.test.mjs tests/x-route-detector.test.mjs tests/x-blocking-logic.test.mjs tests/reddit-route-detector.test.mjs tests/reddit-blocking-logic.test.mjs tests/settings.test.mjs
```

### Automated Checks Performed (205 Tests across 14 Suites)

1. **Manifest & Security Specifications (`manifest.test.mjs` - 14 tests):**
   - Valid JSON, MV3 specification, semantic version 0.6.0.
   - All icon files and PNG magic byte headers.
   - Strict enforcement that permissions contain **only** `"storage"`.
   - Strict enforcement that **no** background service worker or broad host permissions are declared.
   - Verification that `content_scripts` configures YouTube, Instagram, Facebook, TikTok, X, and Reddit with valid, non-empty classic bundles.
2. **X Route Detector (`x-route-detector.test.mjs` - 17 tests):**
   - Dedicated `/home` routes on x.com and twitter.com.
   - Root `/` handling (unblocked by default, blocked with explicit context/parameter).
   - Explore (`/explore`), search (`/search`), notifications (`/notifications`), direct messages (`/messages`, `/i/chat`).
   - User profiles (`/{username}`), individual tweets/status (`/{username}/status/{id}`, `/i/status/{id}`), lists and communities.
   - Query strings with "home" that do not trigger blocking.
   - Malformed URLs and non-X hostnames.
3. **X Blocking Logic & DOM Safety (`x-blocking-logic.test.mjs` - 18 tests):**
   - Blocking decision logic for enabled vs. disabled settings.
   - Preservation of Explore, Notifications, DMs, Profiles, Status posts, Lists.
   - Navigation transitions and rapid repeated evaluations (idempotence).
   - Structural container safety (`HTML`, `BODY`, `NAV`, `MAIN`, mixed containers).
   - Selector verification and scoped declarative CSS.
   - Media isolation (`isHomeVideo`).
4. **Reddit Route Detector (`reddit-route-detector.test.mjs` - 17 tests):**
   - Root `/` Home feed and root sorting views (`/best`, `/hot`, `/top`).
   - Popular feed (`/popular`, `/r/popular`) and All feed (`/r/all`).
   - Specific subreddit routes (`/r/programming/`, `/r/AskReddit/`) preserved.
   - Comments and post routes (`/r/{sub}/comments/{id}/...`, `/comments/{id}/...`) preserved.
   - Search, chat, messages, user profiles, saved content, and settings preserved.
   - Query strings with "popular" or "all" on non-feed routes.
   - Malformed URLs and non-Reddit hostnames.
5. **Reddit Blocking Logic & DOM Safety (`reddit-blocking-logic.test.mjs` - 16 tests):**
   - Blocking decision logic for Home, Popular, and All feeds.
   - Specific subreddit non-blocking guarantee.
   - Preservation of posts, search, messages, and profiles.
   - Navigation transitions and idempotence.
   - Container safety (`HTML`, `BODY`, `MAIN`, `NAV`, header logo, mixed containers).
   - Selector verification and scoped declarative CSS.
   - Media isolation (`isFeedVideo`).
6. **TikTok Route Detector (`tiktok-route-detector.test.mjs` - 17 tests):**
   - Complete TikTok URL classification and route safety.
7. **TikTok Blocking Logic & DOM Safety (`tiktok-blocking-logic.test.mjs` - 16 tests):**
   - Complete TikTok blocking decision, container safety, and media isolation tests.
8. **Facebook Route Detector (`facebook-route-detector.test.mjs` - 14 tests):**
   - Complete Facebook URL classification and route safety.
9. **Facebook Blocking Logic & DOM Safety (`facebook-blocking-logic.test.mjs` - 13 tests):**
   - Complete Facebook blocking decision, container safety, and media isolation tests.
10. **Instagram Route Detector (`instagram-route-detector.test.mjs` - 15 tests):**
    - Complete Instagram route detection and shortcode validation.
11. **Instagram Blocking Logic & DOM Safety (`instagram-blocking-logic.test.mjs` - 12 tests):**
    - Complete Instagram blocking and container safety tests.
12. **YouTube Route Detector (`route-detector.test.mjs` - 12 tests):**
    - Complete YouTube URL classification and regression testing.
13. **YouTube Blocking Logic (`blocking-logic.test.mjs` - 9 tests):**
    - Complete YouTube blocking and DOM container safety regression testing.
14. **Settings Layer (`settings.test.mjs` - 7 tests):**
    - Default setting policy (all six platforms enabled).
    - Independent toggling across all six platforms without overwriting.
    - Missing and malformed setting type recovery.
    - Graceful storage error fallbacks.

---

## 8. Manual Browser Verification Checklist

*(Note: In accordance with rigorous testing standards, live site behaviors are labeled **Not Yet Tested** until evaluated in an interactive browser session.)*

### X (Twitter) Verification
1. **Load/Reload Extension:**
   - Open `chrome://extensions`.
   - Enable **Developer mode** (top-right).
   - Click **Load unpacked** and select the `ScrollShield` directory (or click Reload).
   - Confirm version `0.6.0` is displayed without errors. [Passed in automated headless test; Not Yet Tested in interactive browser]
2. **Verify X Home Timeline Blocking:**
   - Open `https://x.com/home` (or `https://twitter.com/home`).
   - Confirm the ScrollShield boundary overlay appears immediately:
     - Heading: *"You've reached a ScrollShield boundary."*
     - Supporting text: *"You chose to limit your X Home timeline. Take a moment and return to what matters."*
   - Confirm timeline video playback is paused. [Not Yet Tested in interactive browser]
3. **Verify "Leave Timeline" Action:**
   - Click **Leave Timeline**; confirm navigation to safe destination (`/explore`). [Not Yet Tested in interactive browser]
4. **Verify "Go Back" Action:**
   - Click **Go Back**; confirm browser returns to previous safe page. [Not Yet Tested in interactive browser]
5. **Verify Explore & Search:**
   - Navigate to `https://x.com/explore` and perform a search.
   - Confirm Explore and Search results remain completely accessible. [Not Yet Tested in interactive browser]
6. **Verify Notifications:**
   - Open `https://x.com/notifications`; confirm activity and mentions display normally. [Not Yet Tested in interactive browser]
7. **Verify Direct Messages:**
   - Open `https://x.com/messages`; confirm private conversations function normally. [Not Yet Tested in interactive browser]
8. **Verify User Profiles:**
   - Visit a user profile (e.g. `https://x.com/openai`); confirm bio, posts, and media remain unblocked. [Not Yet Tested in interactive browser]
9. **Verify Individual Posts:**
   - Open an individual post link (e.g. `https://x.com/username/status/123...`); confirm the post and replies remain accessible. [Not Yet Tested in interactive browser]
10. **Verify SPA Transitions:**
    - Navigate into Home from Explore, and back to Explore; confirm boundary lifecycle responds accurately. [Not Yet Tested in interactive browser]
11. **Verify Toggling in Popup & Settings:**
    - Disable **X Home Timeline** in the popup; confirm Home timeline becomes accessible immediately.
    - Re-enable the toggle; confirm blocking resumes immediately. [Not Yet Tested in interactive browser]

### Reddit Verification
1. **Verify Reddit Home Feed Blocking:**
   - Open `https://www.reddit.com/`.
   - Confirm the ScrollShield boundary overlay appears:
     - Heading: *"You've reached a ScrollShield boundary."*
     - Supporting text: *"You chose to limit endless Reddit feed browsing. Your communities, discussions and search remain accessible."* [Not Yet Tested in interactive browser]
2. **Verify Popular Feed Blocking:**
   - Open `https://www.reddit.com/r/popular` or `/popular`.
   - Confirm overlay appears and feed videos are paused. [Not Yet Tested in interactive browser]
3. **Verify All Feed Blocking:**
   - Open `https://www.reddit.com/r/all`.
   - Confirm overlay appears and feed is blocked. [Not Yet Tested in interactive browser]
4. **Verify Specific Subreddits are Accessible:**
   - Open a community (e.g. `https://www.reddit.com/r/programming/` or `https://www.reddit.com/r/AskReddit/`).
   - Confirm the community posts, sidebar, and sort options display normally without blocking. [Not Yet Tested in interactive browser]
5. **Verify Individual Posts & Comments:**
   - Open an individual post and comment thread; confirm full discussion access. [Not Yet Tested in interactive browser]
6. **Verify Reddit Search:**
   - Search on Reddit; confirm search results page remains unblocked. [Not Yet Tested in interactive browser]
7. **Verify Chat & Messages:**
   - Open `/message/inbox` or `/chat`; confirm messaging remains unblocked. [Not Yet Tested in interactive browser]
8. **Verify User Profiles & Saved Items:**
   - Open `/user/{username}/` or `/user/{username}/saved`; confirm user profile and history are accessible. [Not Yet Tested in interactive browser]
9. **Verify "Leave Feed" Action:**
   - Click **Leave Feed** on blocked feed overlay; confirm safe redirection to `/search`. [Not Yet Tested in interactive browser]
10. **Verify Toggling in Popup & Settings:**
    - Disable **Reddit Feeds** in the popup; confirm Home/Popular/All feeds become accessible.
    - Re-enable the toggle; confirm feed blocking resumes immediately. [Not Yet Tested in interactive browser]

### Platform Regression Checks
11. **Verify YouTube Shorts:**
    - Confirm YouTube Shorts route (`/shorts/*`) and homepage shelves remain blocked when enabled. [Passed in automated suite; Not Yet Tested in interactive browser]
12. **Verify Instagram Reels:**
    - Confirm Instagram Reels (`/reel/*`) remain blocked while DMs and photos remain accessible. [Passed in automated suite; Not Yet Tested in interactive browser]
13. **Verify Facebook Reels:**
    - Confirm Facebook Reels (`/reel/*`) remain blocked while Messenger and groups remain accessible. [Passed in automated suite; Not Yet Tested in interactive browser]
14. **Verify TikTok For You:**
    - Confirm TikTok For You feed remains blocked while search and profiles remain accessible. [Passed in automated suite; Not Yet Tested in interactive browser]
15. **Verify Settings Persistence & Independence:**
    - Reload extension and verify all six settings persist independently without overwriting. [Passed in automated storage suite; Not Yet Tested in interactive browser]

---

## 9. Strategy for Maintaining Selectors

Both X and Reddit utilize client-side single-page applications with dynamically generated class names and continuous UI updates.

**Maintenance Rules:**
1. **Never rely on obfuscated class names:** Avoid selectors targeting auto-generated class names (e.g. `css-175oi2r`, `_3xpx798f`).
2. **Rely on stable semantic attributes and paths:**
   - On X: `a[data-testid="AppTabBar_Home_Link"]`, `a[href="/home"]`.
   - On Reddit: `a[href="/r/popular"]`, `a[href="/r/all"]`, `a[href="/popular"]`, `a#home-link`.
3. **Safety First:** If a platform alters an entry link structure, the selector matches 0 nodes, which leaves regular navigation, communities, and search untouched rather than hiding unintended elements.
4. **URL-Level Absolute Defense:** Even if X or Reddit changes its DOM structure, direct navigation to `/home`, `/popular`, `/r/all`, or `/` will always remain blocked because route detection operates at the URL parser level.

---

## 10. Known Limitations

- **X Root URL Ambiguity:** On `x.com/`, logged-in users may be presented with the Home timeline. ScrollShield inspects active tab indicators to confirm Home context, defaulting to unblocked when evidence is insufficient to prevent accidental lockouts.
- **Reddit Web Component Evolution (`shreddit-app`):** Reddit's newest desktop interface heavily utilizes custom web components (`<shreddit-app>`, `<faceplate-tracker>`). While primary feed entry points are suppressed, some dynamically rendered sub-navigation variants may remain visible. Direct navigation to Home, Popular, and All feeds is strictly intercepted by the route detector.
- **Mobile Web Platforms (`m.twitter.com`, `m.reddit.com`):** Route blocking is active on mobile web domains, but specific entry-point hiding selectors are optimized primarily for desktop web layouts.
- **Direct Navigation:** Entering a blocked route URL directly or via bookmark always activates the boundary overlay.
