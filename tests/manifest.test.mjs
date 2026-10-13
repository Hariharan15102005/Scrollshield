import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function verifyPngFile(relativePath, expectedDimensions = null) {
  const fullPath = path.resolve(rootDir, relativePath);
  assert.ok(fs.existsSync(fullPath), `Referenced file does not exist: ${relativePath}`);

  const stat = fs.statSync(fullPath);
  assert.ok(stat.size > 0, `File is empty: ${relativePath}`);

  const fd = fs.openSync(fullPath, 'r');
  const buffer = Buffer.alloc(24);
  fs.readSync(fd, buffer, 0, 24, 0);
  fs.closeSync(fd);

  assert.ok(
    buffer.subarray(0, 8).equals(PNG_HEADER),
    `File ${relativePath} does not contain valid PNG magic header`
  );

  if (expectedDimensions) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    assert.strictEqual(
      width,
      expectedDimensions,
      `Width for ${relativePath} expected ${expectedDimensions}, got ${width}`
    );
    assert.strictEqual(
      height,
      expectedDimensions,
      `Height for ${relativePath} expected ${expectedDimensions}, got ${height}`
    );
  }
}

test('ScrollShield Phase 4 Manifest & Security Specifications', async (t) => {
  const manifestPath = path.resolve(rootDir, 'manifest.json');

  await t.test('manifest.json exists and parses successfully', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist in root directory');
    const raw = fs.readFileSync(manifestPath, 'utf8');
    assert.doesNotThrow(() => JSON.parse(raw), 'manifest.json must be valid JSON');
  });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  await t.test('manifest_version is 3', () => {
    assert.strictEqual(manifest.manifest_version, 3, 'manifest_version must be 3 for Manifest V3');
  });

  await t.test('name is ScrollShield and description is valid', () => {
    assert.strictEqual(manifest.name, 'ScrollShield');
    assert.ok(typeof manifest.description === 'string' && manifest.description.length > 0);
  });

  await t.test('version is semantic version 0.4.0', () => {
    assert.ok(typeof manifest.version === 'string', 'version must be a string');
    assert.match(
      manifest.version,
      /^\d+\.\d+\.\d+$/,
      'version must follow semantic versioning'
    );
    assert.strictEqual(manifest.version, '0.4.0');
  });

  await t.test('action popup path exists on disk', () => {
    assert.ok(manifest.action, 'manifest.action must be defined');
    assert.ok(manifest.action.default_popup, 'manifest.action.default_popup must be defined');
    const popupFullPath = path.resolve(rootDir, manifest.action.default_popup);
    assert.ok(
      fs.existsSync(popupFullPath),
      `Popup file missing at path: ${manifest.action.default_popup}`
    );
  });

  await t.test('options_ui page path exists on disk', () => {
    assert.ok(manifest.options_ui, 'manifest.options_ui must be defined');
    assert.ok(manifest.options_ui.page, 'manifest.options_ui.page must be defined');
    const settingsFullPath = path.resolve(rootDir, manifest.options_ui.page);
    assert.ok(
      fs.existsSync(settingsFullPath),
      `Settings page missing at path: ${manifest.options_ui.page}`
    );
  });

  await t.test('all manifest icon references exist and are valid PNG files of exact sizes', () => {
    const requiredSizes = ['16', '32', '48', '128'];

    assert.ok(manifest.icons, 'manifest.icons must be defined');
    for (const size of requiredSizes) {
      assert.ok(manifest.icons[size], `manifest.icons[${size}] must be defined`);
      verifyPngFile(manifest.icons[size], parseInt(size, 10));
    }

    assert.ok(manifest.action.default_icon, 'manifest.action.default_icon must be defined');
    for (const size of requiredSizes) {
      assert.ok(manifest.action.default_icon[size], `manifest.action.default_icon[${size}] must be defined`);
      verifyPngFile(manifest.action.default_icon[size], parseInt(size, 10));
    }
  });

  await t.test('permissions declares strictly and only "storage"', () => {
    assert.ok(Array.isArray(manifest.permissions), 'permissions must be an array');
    assert.deepStrictEqual(
      manifest.permissions,
      ['storage'],
      'Only "storage" permission should be requested in Phase 4'
    );
  });

  await t.test('no broad host_permissions are declared', () => {
    if (manifest.host_permissions) {
      assert.ok(
        Array.isArray(manifest.host_permissions) && manifest.host_permissions.length === 0,
        'Phase 4 must not declare host_permissions'
      );
    }
  });

  await t.test('no background worker is declared in Phase 4', () => {
    assert.strictEqual(
      manifest.background,
      undefined,
      'Phase 4 must not declare a background service worker'
    );
  });

  await t.test('content_scripts configures YouTube, Instagram, and Facebook with valid bundles', () => {
    assert.ok(Array.isArray(manifest.content_scripts), 'content_scripts must be an array');
    assert.strictEqual(manifest.content_scripts.length, 3, 'Should declare YouTube, Instagram, and Facebook content scripts');

    // 1. YouTube entry
    const ytScript = manifest.content_scripts.find((s) => s.matches.includes('*://*.youtube.com/*'));
    assert.ok(ytScript, 'YouTube content script must be configured');
    assert.strictEqual(ytScript.js[0], 'src/content/youtube.bundle.js');
    assert.strictEqual(ytScript.run_at, 'document_start');

    const ytBundlePath = path.resolve(rootDir, ytScript.js[0]);
    assert.ok(fs.existsSync(ytBundlePath), 'youtube.bundle.js must exist on disk');
    const ytContent = fs.readFileSync(ytBundlePath, 'utf8');
    assert.ok(ytContent.length > 500);
    assert.doesNotMatch(ytContent, /\bexport\s+(default|function|const|let)\b/);

    // 2. Instagram entry
    const igScript = manifest.content_scripts.find((s) => s.matches.includes('https://www.instagram.com/*'));
    assert.ok(igScript, 'Instagram content script must be configured');
    assert.strictEqual(igScript.js[0], 'src/content/instagram.bundle.js');
    assert.strictEqual(igScript.run_at, 'document_start');

    const igBundlePath = path.resolve(rootDir, igScript.js[0]);
    assert.ok(fs.existsSync(igBundlePath), 'instagram.bundle.js must exist on disk');
    const igContent = fs.readFileSync(igBundlePath, 'utf8');
    assert.ok(igContent.length > 500);
    assert.doesNotMatch(igContent, /\bexport\s+(default|function|const|let)\b/);

    // 3. Facebook entry
    const fbScript = manifest.content_scripts.find((s) => s.matches.includes('https://www.facebook.com/*'));
    assert.ok(fbScript, 'Facebook content script must be configured');
    assert.strictEqual(fbScript.js[0], 'src/content/facebook.bundle.js');
    assert.strictEqual(fbScript.run_at, 'document_start');

    const fbBundlePath = path.resolve(rootDir, fbScript.js[0]);
    assert.ok(fs.existsSync(fbBundlePath), 'facebook.bundle.js must exist on disk');
    const fbContent = fs.readFileSync(fbBundlePath, 'utf8');
    assert.ok(fbContent.length > 500);
    assert.doesNotMatch(fbContent, /\bexport\s+(default|function|const|let)\b/);
  });

  await t.test('popup and settings companion files all exist', () => {
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/popup/popup.html')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/popup/popup.css')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/popup/popup.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/settings/settings.html')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/settings/settings.css')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/settings/settings.js')));
  });

  await t.test('source modules for all three platforms and common layer all exist', () => {
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/common/settings.js')));

    // YouTube source modules
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/route-detector.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/selectors.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/blocker-overlay.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/navigation-monitor.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/index.js')));

    // Instagram source modules
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/instagram/route-detector.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/instagram/selectors.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/instagram/blocker-overlay.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/instagram/navigation-monitor.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/instagram/index.js')));

    // Facebook source modules
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/facebook/route-detector.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/facebook/selectors.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/facebook/blocker-overlay.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/facebook/navigation-monitor.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/facebook/index.js')));
  });
});
