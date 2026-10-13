# ScrollShield

> **Take Control. Keep What Matters.**

ScrollShield is a Google Chrome extension (Manifest V3) engineered for selective social media blocking and intentional digital wellbeing.

---

## 1. Problem Statement

Modern social platforms have fused indispensable communication and knowledge tools with hyper-engineered, algorithmically addictive short-form video loops:
- **YouTube:** High-value instructional tutorials, podcasts, and lecture videos sit right next to infinite-scroll YouTube Shorts designed to hook dopamine loops.
- **Instagram:** Direct Messaging (DMs) with close friends and family shares the same surface as algorithmic Instagram Reels designed to trap attention for hours.

Traditional site blockers present a blunt, binary choice: completely block entire domains (breaking communication and valuable content) or keep them unblocked (succumbing to endless doom-scrolling).

## 2. Product Vision

ScrollShield introduces **surgical, selective filtering**:
- **Surgical Platform Blocking:** Eliminates addictive short-form video surfaces (YouTube Shorts, Instagram Reels) while preserving utility layers (normal YouTube videos, Instagram DMs, subscriptions).
- **Mindful Interstitial Friction:** Displays reflective questions ("What is your core intention here?") and an intentional pause timer before allowing access to potentially distracting web surfaces.
- **Daily Time Budgets:** Gives users intentional quotas rather than complete prohibition.
- **Scheduled Focus Windows:** Automates quiet focus blocks during deep work or sleep intervals.
- **Local-Only Privacy:** 100% offline, zero tracking, zero telemetries, and zero third-party dependencies.

---

## 3. Implementation Status: Phase 2 vs. Planned Roadmap

| Feature Area | Current Status | Implemented Phase |
| :--- | :--- | :--- |
| **Manifest V3 Foundation** | ✅ **Implemented** (Least privilege) | Phase 1 |
| **Extension Popup UI** | ✅ **Implemented** (With active Shorts toggle) | Phase 1 & 2 |
| **Settings / Options Page** | ✅ **Implemented** (With active Shorts toggle) | Phase 1 & 2 |
| **YouTube Shorts Route Blocker** | ✅ **Implemented** (URL parser, media interceptor, overlay) | Phase 2 |
| **YouTube Shorts Shelf Suppression** | ✅ **Implemented** (Sidebar links & homepage shelves hidden) | Phase 2 |
| **Client-Side SPA Navigation Sync** | ✅ **Implemented** (Handles yt-navigate-finish, popstate) | Phase 2 |
| **Instagram Reels Blocking** | ⏳ *Intentionally Deferred* | Phase 3 |
| **Reflective Intervention Prompts** | ⏳ *Intentionally Deferred* | Phase 3 |
| **Daily Time Budgets** | ⏳ *Intentionally Deferred* | Phase 4 |
| **Focus Schedules & Quiet Blocks** | ⏳ *Intentionally Deferred* | Phase 4 |
| **Usage Analytics & Local Dashboard** | ⏳ *Intentionally Deferred* | Phase 5 |

---

## 4. Architecture & Technical Design (Phase 2)

### A. Route Detection (`src/content/youtube/route-detector.js`)
- Uses the standard structured `URL` API.
- Strictly targets `/shorts` and `/shorts/{VIDEO_ID}` routes on YouTube hostnames (`youtube.com`, `www.youtube.com`, `m.youtube.com`).
- Disallows false positives: `/watch?v=...`, `/results?search_query=...`, `/feed/subscriptions`, `/@channel`, `/channel/...`, and `/playlist?list=...` are explicitly recognized as normal YouTube pages and are never blocked.
- Handles query parameters (`?feature=share`) and hashes (`#t=10s`) safely.
- Gracefully returns safe non-blocking defaults for malformed URLs without throwing exceptions.
- Provides optional `canonicalWatchUrl` (`https://www.youtube.com/watch?v={VIDEO_ID}`) strictly when a valid 6-16 character alphanumeric video ID is present.

### B. Media Suppression & Isolated Overlay (`src/content/youtube/blocker-overlay.js`)
- Completely covers the Shorts player with an opaque, isolated interface injected via Shadow DOM (`#scrollshield-youtube-blocker-root`).
- Automatically pauses any active HTML5 `<video>` elements and sets `muted = true`.
- Hooks `play` and `playing` capture listeners to prevent background audio/video resumption behind the overlay.
- Provides accessible navigation controls:
  - **Return to YouTube Home:** Navigates safely to `/`.
  - **Go Back:** Uses browser history (`window.history.back()`) with fallback to `/`.
  - **Watch as Regular Video:** Explicit optional conversion to `/watch?v={VIDEO_ID}` only when a valid video ID was parsed.
- Prevents infinite redirect loops and preserves browser history.

### C. Conservative Shelf Suppression (`src/content/youtube/selectors.js`)
- Targets only verified, semantic custom elements:
  - `ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])`
  - `ytd-reel-shelf-renderer`
  - `ytd-guide-entry-renderer:has(a[href^="/shorts"])`
  - `ytd-mini-guide-entry-renderer:has(a[href^="/shorts"])`
- Safety check `isSafeToHide()` ensures top-level containers (`YTD-APP`, `YTD-BROWSE`, `YTD-SEARCH`, `YTD-WATCH-FLEXY`) and containers hosting regular videos are never hidden.
- Declarative CSS injection applies hiding rules scoped to `html[data-scrollshield-shorts-blocked="true"]`.

### D. SPA Navigation Monitoring (`src/content/youtube/navigation-monitor.js`)
- Detects client-side SPA route transitions by subscribing to YouTube lifecycle events (`yt-navigate-finish`, `yt-page-data-updated`), browser history `popstate` events, and a scoped `MutationObserver`.
- Avoids unbounded polling loops and avoids memory leaks through idempotent DOM cleanup.

### E. Settings Management (`src/common/settings.js`)
- Stores `youtubeShortsEnabled: boolean` (defaults to `true` for first-time users).
- Stored exclusively in local browser storage via `chrome.storage.local`.
- Live synchronization: changes made in the popup or settings page immediately broadcast to content scripts via `chrome.storage.onChanged`.

---

## 5. Technology Stack & Permissions

- **Extension Specification:** Chrome Extension Manifest V3 (`manifest_version: 3`).
- **Core Languages:** Vanilla JavaScript (ES Modules for source, standalone bundled IIFE for content script), HTML5, and CSS3.
- **Permissions:**
  - `"storage"`: **Strictly and solely requested** to persist user configuration (`youtubeShortsEnabled`) locally and notify content scripts of setting updates.
  - No `tabs`, `history`, `webRequest`, `scripting`, or background service workers are declared.
- **Content Scripts:**
  - Statically scoped to `*://*.youtube.com/*`.
  - No broad `host_permissions` requested.

---

## 6. Repository Folder Structure

```
ScrollShield/
├── .gitignore
├── manifest.json
├── package.json
├── README.md
├── src/
│   ├── assets/
│   │   └── icons/
│   │       ├── icon16.png
│   │       ├── icon32.png
│   │       ├── icon48.png
│   │       └── icon128.png
│   ├── common/
│   │   └── settings.js
│   ├── content/
│   │   ├── youtube.bundle.js
│   │   └── youtube/
│   │       ├── blocker-overlay.js
│   │       ├── index.js
│   │       ├── navigation-monitor.js
│   │       ├── route-detector.js
│   │       └── selectors.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── settings/
│       ├── settings.html
│       ├── settings.css
│       └── settings.js
└── tests/
    ├── blocking-logic.test.mjs
    ├── manifest.test.mjs
    ├── route-detector.test.mjs
    └── settings.test.mjs
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
node --test tests/manifest.test.mjs tests/route-detector.test.mjs tests/settings.test.mjs tests/blocking-logic.test.mjs
```

### Automated Checks Performed (46 Tests across 4 Suites)

1. **Manifest & Security Specifications (`manifest.test.mjs`):**
   - Valid JSON parsing, MV3 specification, semantic version 0.2.0.
   - All icon files and PNG magic byte headers.
   - Strict enforcement that permissions contain **only** `"storage"`.
   - Strict enforcement that **no** background service worker or host permissions are declared.
   - Verification that `content_scripts` is scoped exclusively to YouTube and references `youtube.bundle.js`.
2. **URL Route Detector (`route-detector.test.mjs`):**
   - Standard `/shorts/VIDEO_ID` URLs.
   - Shorts with query parameters and fragments.
   - Root `/shorts` player route.
   - Exclusion of `/watch`, `/results`, `/feed/subscriptions`, `/@channel`, `/channel/ID`, `/playlist`.
   - Safe non-throwing handling of malformed URLs.
   - Safe exclusion of unrelated paths containing the substring "shorts".
   - Alphanumeric video ID validation.
   - YouTube hostname validation.
3. **Settings Layer (`settings.test.mjs`):**
   - Default setting policy (`youtubeShortsEnabled = true`).
   - Enabled and disabled states.
   - Missing and malformed setting type recovery.
   - Chrome storage get/set mocked integration.
   - Storage connection failure graceful fallback.
4. **Blocking Logic & DOM Safety (`blocking-logic.test.mjs`):**
   - Blocking enabled vs. disabled decision logic.
   - Normal watch page non-blocking assurance.
   - SPA navigation transitions between Shorts and regular video.
   - Idempotence on rapid repeated route evaluations.
   - DOM safety: ensures containers containing regular videos are never hidden.
   - Category coverage for shelf and navigation selectors.
   - Valid scoped declarative CSS generation.

---

## 8. Manual Browser Verification Procedure

To verify real-world YouTube integration in Google Chrome:

1. **Load/Reload Extension:**
   - Open `chrome://extensions`.
   - Enable **Developer mode** in top-right.
   - Click **Load unpacked** and select the `ScrollShield` directory (or click reload icon if already loaded).
   - Verify version `0.2.0` is displayed with no manifest errors.
2. **Verify Homepage & Navigation:**
   - Navigate to `https://www.youtube.com`.
   - Confirm that identifiable Shorts shelves on the homepage and the "Shorts" link in the left sidebar are hidden.
   - Confirm normal recommended videos, channel avatars, and navigation links remain visible and functional.
3. **Verify Direct Shorts Route Blocking:**
   - Open any Shorts URL (e.g. `https://www.youtube.com/shorts/{VIDEO_ID}`).
   - Verify the ScrollShield **"YouTube Shorts Blocked"** overlay appears immediately.
   - Confirm audio and video are paused and cannot be resumed in the background.
   - Click **Return to YouTube Home** and confirm you are taken to `/`.
4. **Verify Normal Watch Pages:**
   - Click any regular YouTube video (`https://www.youtube.com/watch?v=...`).
   - Confirm the video plays normally with standard controls, comments, and recommendations.
5. **Verify SPA Navigation & Back/Forward:**
   - Navigate from a regular video to a Shorts route; confirm the overlay appears without a full page reload.
   - Use browser **Back** button; confirm the regular video is restored.
   - Use browser **Forward** button; confirm the overlay re-engages cleanly.
6. **Verify Toggle in Popup & Settings:**
   - Click the ScrollShield extension toolbar icon.
   - Toggle **YouTube Shorts Blocker** off; refresh or navigate to Shorts and confirm normal Shorts access is restored and shelves reappear.
   - Toggle **YouTube Shorts Blocker** back on; confirm blocking takes effect immediately without needing to reinstall the extension.
7. **Console Health Check:**
   - Open Chrome DevTools Console (`F12`); confirm no unhandled exceptions or CSP errors are thrown.

---

## 9. Strategy for Maintaining YouTube Selectors

YouTube uses a client-rendered Polymer architecture with custom elements (`ytd-*`). While custom element tags are relatively stable, YouTube occasionally modifies internal class names or DOM hierarchies.

**Maintenance Rules:**
1. **Never rely on obfuscated classes:** Avoid selectors based on dynamic class names like `.ytd-reel-shelf-renderer-0`.
2. **Prefer semantic tags and attributes:** Rely on `ytd-reel-shelf-renderer` and `ytd-rich-shelf-renderer[is-shorts]`.
3. **Fail-safe fallback:** If YouTube alters an internal shelf element name, the selector matches 0 nodes, which leaves regular videos untouched rather than hiding unintended elements.
4. **Scoped CSS via Data Attributes:** The extension injects scoped CSS enabled only when `html[data-scrollshield-shorts-blocked="true"]` is set, avoiding flash-of-unstyled-content (FOUC).

---

## 10. Known Limitations

- **YouTube Internal Layout A/B Tests:** YouTube periodically experiments with alternate shelf wrappers. In new experiments where `[is-shorts]` attribute or `ytd-reel-shelf-renderer` is absent, the shelf may remain visible until updated selectors are added. However, direct navigation to `/shorts/*` will always remain blocked because route detection is based on the URL API, independent of DOM markup.
- **Mobile Web YouTube (`m.youtube.com`):** Route blocking is active on mobile web YouTube, but mobile DOM structures (`ytm-*`) may vary from desktop layouts.
