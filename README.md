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

## 3. Implementation Status: Phase 1 vs. Planned Roadmap

| Feature Area | Current Status (Phase 1) | Planned Phase |
| :--- | :--- | :--- |
| **Manifest V3 Foundation** | ✅ **Implemented** (Zero unnecessary permissions) | Phase 1 |
| **Extension Popup UI** | ✅ **Implemented** (Dark navy theme, status badge, feature roadmap) | Phase 1 |
| **Settings / Options Page** | ✅ **Implemented** (Static roadmap preview & architectural overview) | Phase 1 |
| **Popup-to-Settings Navigation** | ✅ **Implemented** (Using `chrome.runtime.openOptionsPage()`) | Phase 1 |
| **Automated Foundation Testing** | ✅ **Implemented** (12-check test suite with Node test runner) | Phase 1 |
| **YouTube Shorts Blocking** | ⏳ *Intentionally Deferred* | Phase 2 |
| **Instagram Reels Blocking** | ⏳ *Intentionally Deferred* | Phase 2 |
| **Reflective Intervention Prompts** | ⏳ *Intentionally Deferred* | Phase 3 |
| **Daily Time Budgets** | ⏳ *Intentionally Deferred* | Phase 4 |
| **Focus Schedules & Quiet Blocks** | ⏳ *Intentionally Deferred* | Phase 4 |
| **Usage Analytics & Local Dashboard** | ⏳ *Intentionally Deferred* | Phase 5 |

> **Note on Phase 1:** No fake toggles or mockup blocking rules are enabled. The popup displays a clear **"Setup in progress"** status indicator, faithfully reporting the project's foundation state.

---

## 4. Technology Stack

- **Extension Specification:** Chrome Extension Manifest V3 (`manifest_version: 3`).
- **Core Languages:** Vanilla JavaScript (ES Modules), HTML5, and CSS3.
- **Permissions:** None requested in Phase 1 (least privilege principle).
- **Styling Architecture:** Custom CSS design system with dark navy (`#0b0f19`) and restrained violet/indigo accents (`#6366f1`), full WCAG-compliant color contrast, and visible `:focus-visible` keyboard focus rings.
- **Testing Runner:** Node.js built-in test runner (`node:test`, `node:assert/strict`).
- **Assets:** Custom PNG icons generated at 16x16, 32x32, 48x48, and 128x128 pixels.

---

## 5. Repository Folder Structure

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
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   └── settings/
│       ├── settings.html
│       ├── settings.css
│       └── settings.js
└── tests/
    └── manifest.test.mjs
```

---

## 6. Prerequisites

- **Google Chrome** (version 88+ for Manifest V3 support; version 120+ recommended).
- **Node.js** (v18+ recommended; project validated on Node v24.12.0) for running automated tests.

---

## 7. How to Load the Extension Unpacked in Chrome

Follow these steps to install and inspect ScrollShield in your local Google Chrome browser:

1. Open `chrome://extensions` in your Chrome browser address bar.
2. Enable **Developer mode** using the toggle switch located in the top-right corner.
3. Select the **Load unpacked** button in the top-left toolbar.
4. Choose the `ScrollShield` directory (the folder containing `manifest.json`).
5. Pin the extension if desired by clicking the Chrome puzzle extensions menu and pinning **ScrollShield**.
6. Click the toolbar icon and inspect the popup (verify branding, "Setup in progress" status badge, version number, and planned feature preview).
7. Open Settings by clicking **Open Settings** inside the popup, and verify that the full settings options page opens in a new tab.

---

## 8. How to Run Validation Tests

ScrollShield includes a lightweight, zero-dependency test suite utilizing Node.js's native test runner to validate the Manifest V3 specification, icon integrity, and file references.

### Command

```bash
npm test
```

Or invoke Node directly:

```bash
node --test tests/manifest.test.mjs
```

### Verified Checks

- Valid JSON parsing of `manifest.json`.
- Strict enforcement of `manifest_version: 3`.
- Exact project name match (`ScrollShield`) and valid description.
- Semantic versioning format compliance.
- Action popup file existence (`src/popup/popup.html`).
- Options page file existence (`src/settings/settings.html`).
- Verification that all icon resolutions (16x16, 32x32, 48x48, 128x128) exist on disk and have valid PNG binary magic signatures (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`).
- Strict enforcement that no unnecessary permissions or host permissions are declared.
- Strict enforcement that no background service workers or content scripts are declared in Phase 1.
- Integrity verification of all popup and settings companion files (HTML, CSS, JS).

---

## 9. Current Limitations

- **No Active Blocking:** Phase 1 delivers the structural foundation, manifest configuration, and UI surfaces. YouTube Shorts and Instagram Reels filtering rules are intentionally deferred to Phase 2.
- **Static Settings:** The settings page displays the upcoming configuration architecture and planned toggles without enabling interactive toggle storage.
- **Offline / Local Execution:** No cloud syncing or external integrations are active.

---

## 10. Upcoming Development Phases

1. **Phase 2 — Selective Blocking Engine:**
   - Content scripts and declarative net request rules for YouTube Shorts.
   - Selective DOM and routing intercepts for Instagram Reels while protecting Direct Messages.
2. **Phase 3 — Mindful Friction & Reflection Layer:**
   - Pre-navigation interstitial pause checkpoint.
   - Customizable reflection prompts stored via `chrome.storage.local`.
3. **Phase 4 — Daily Budgets & Focus Schedules:**
   - Dynamic time tracking engine and focus schedules.
4. **Phase 5 — Analytics & Digital Wellbeing Dashboard:**
   - Local privacy-preserving visualization of saved focus time and reels prevented.
