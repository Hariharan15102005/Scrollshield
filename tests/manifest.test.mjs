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

test('ScrollShield Phase 2 Manifest & Security Specifications', async (t) => {
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

  await t.test('version is a valid semantic version', () => {
    assert.ok(typeof manifest.version === 'string', 'version must be a string');
    assert.match(
      manifest.version,
      /^\d+\.\d+\.\d+$/,
      'version must follow semantic versioning (e.g. 0.2.0)'
    );
    assert.strictEqual(manifest.version, '0.2.0');
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
      'Only "storage" permission should be requested in Phase 2'
    );
  });

  await t.test('no broad host_permissions are declared', () => {
    if (manifest.host_permissions) {
      assert.ok(
        Array.isArray(manifest.host_permissions) && manifest.host_permissions.length === 0,
        'Phase 2 must not declare host_permissions'
      );
    }
  });

  await t.test('no background worker is declared in Phase 2', () => {
    assert.strictEqual(
      manifest.background,
      undefined,
      'Phase 2 must not declare a background service worker'
    );
  });

  await t.test('content_scripts is declared exclusively for YouTube', () => {
    assert.ok(Array.isArray(manifest.content_scripts), 'content_scripts must be an array');
    assert.strictEqual(manifest.content_scripts.length, 1);

    const ytScript = manifest.content_scripts[0];
    assert.deepStrictEqual(ytScript.matches, ['*://*.youtube.com/*']);
    assert.ok(Array.isArray(ytScript.js));
    assert.strictEqual(ytScript.js[0], 'src/content/youtube.bundle.js');
    assert.strictEqual(ytScript.run_at, 'document_start');

    // Verify bundle file exists and is non-empty
    const bundleFullPath = path.resolve(rootDir, ytScript.js[0]);
    assert.ok(fs.existsSync(bundleFullPath), 'youtube.bundle.js must exist on disk');
    const content = fs.readFileSync(bundleFullPath, 'utf8');
    assert.ok(content.length > 500, 'Bundle must be populated');
    // Ensure no ES module export/import syntax in classic content script bundle
    assert.doesNotMatch(content, /\bexport\s+(default|function|const|let)\b/);
  });

  await t.test('popup companion files (html, css, js) all exist', () => {
    const popupDir = path.resolve(rootDir, 'src', 'popup');
    assert.ok(fs.existsSync(path.join(popupDir, 'popup.html')), 'popup.html exists');
    assert.ok(fs.existsSync(path.join(popupDir, 'popup.css')), 'popup.css exists');
    assert.ok(fs.existsSync(path.join(popupDir, 'popup.js')), 'popup.js exists');
  });

  await t.test('settings companion files (html, css, js) all exist', () => {
    const settingsDir = path.resolve(rootDir, 'src', 'settings');
    assert.ok(fs.existsSync(path.join(settingsDir, 'settings.html')), 'settings.html exists');
    assert.ok(fs.existsSync(path.join(settingsDir, 'settings.css')), 'settings.css exists');
    assert.ok(fs.existsSync(path.join(settingsDir, 'settings.js')), 'settings.js exists');
  });

  await t.test('common and content source files all exist', () => {
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/common/settings.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/route-detector.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/selectors.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/blocker-overlay.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/navigation-monitor.js')));
    assert.ok(fs.existsSync(path.resolve(rootDir, 'src/content/youtube/index.js')));
  });
});
