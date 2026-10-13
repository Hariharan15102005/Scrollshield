import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectYouTubeRoute,
  validateVideoId,
  isYouTubeHost
} from '../src/content/youtube/route-detector.js';

test('YouTube Route Detector (Phase 2)', async (t) => {
  await t.test('detects a standard Shorts URL', () => {
    const result = detectYouTubeRoute('https://www.youtube.com/shorts/dQw4w9WgXcQ');
    assert.strictEqual(result.isShorts, true);
    assert.strictEqual(result.videoId, 'dQw4w9WgXcQ');
    assert.strictEqual(
      result.canonicalWatchUrl,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
  });

  await t.test('detects a Shorts URL containing query parameters and fragments', () => {
    const result = detectYouTubeRoute(
      'https://www.youtube.com/shorts/abc_123-XYZ?feature=share&si=testParam#t=10s'
    );
    assert.strictEqual(result.isShorts, true);
    assert.strictEqual(result.videoId, 'abc_123-XYZ');
    assert.strictEqual(
      result.canonicalWatchUrl,
      'https://www.youtube.com/watch?v=abc_123-XYZ'
    );
  });

  await t.test('detects root /shorts or /shorts/ route', () => {
    const result = detectYouTubeRoute('https://www.youtube.com/shorts');
    assert.strictEqual(result.isShorts, true);
    assert.strictEqual(result.videoId, null);
    assert.strictEqual(result.canonicalWatchUrl, null);

    const resultTrailing = detectYouTubeRoute('https://www.youtube.com/shorts/');
    assert.strictEqual(resultTrailing.isShorts, true);
    assert.strictEqual(resultTrailing.videoId, null);
  });

  await t.test('does not classify a normal /watch URL as Shorts', () => {
    const result = detectYouTubeRoute('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.strictEqual(result.isShorts, false);
    assert.strictEqual(result.videoId, null);
    assert.strictEqual(result.canonicalWatchUrl, null);
  });

  await t.test('does not classify search results as Shorts even with shorts query', () => {
    const result = detectYouTubeRoute(
      'https://www.youtube.com/results?search_query=best+shorts+compilation'
    );
    assert.strictEqual(result.isShorts, false);
    assert.strictEqual(result.videoId, null);
  });

  await t.test('does not classify subscriptions feed as Shorts', () => {
    const result = detectYouTubeRoute('https://www.youtube.com/feed/subscriptions');
    assert.strictEqual(result.isShorts, false);
    assert.strictEqual(result.videoId, null);
  });

  await t.test('does not classify channel handles or channel IDs as Shorts', () => {
    const handleResult = detectYouTubeRoute('https://www.youtube.com/@mkbhd');
    assert.strictEqual(handleResult.isShorts, false);

    const channelResult = detectYouTubeRoute(
      'https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ'
    );
    assert.strictEqual(channelResult.isShorts, false);

    // Channel handle with "shorts" in name
    const shortsHandle = detectYouTubeRoute('https://www.youtube.com/@shorts_creator');
    assert.strictEqual(shortsHandle.isShorts, false);
  });

  await t.test('does not classify playlist URLs as Shorts', () => {
    const result = detectYouTubeRoute(
      'https://www.youtube.com/playlist?list=PL123456789ABCDEF'
    );
    assert.strictEqual(result.isShorts, false);
    assert.strictEqual(result.videoId, null);
  });

  await t.test('handles malformed URLs safely without throwing exceptions', () => {
    assert.doesNotThrow(() => {
      const r1 = detectYouTubeRoute('not-a-valid-url:::');
      assert.strictEqual(r1.isShorts, false);

      const r2 = detectYouTubeRoute('');
      assert.strictEqual(r2.isShorts, false);

      const r3 = detectYouTubeRoute(null);
      assert.strictEqual(r3.isShorts, false);

      const r4 = detectYouTubeRoute(undefined);
      assert.strictEqual(r4.isShorts, false);

      const r5 = detectYouTubeRoute(12345);
      assert.strictEqual(r5.isShorts, false);
    });
  });

  await t.test('does not match unrelated paths containing the word "shorts"', () => {
    const r1 = detectYouTubeRoute('https://www.youtube.com/feed/shorts_explore');
    assert.strictEqual(r1.isShorts, false);

    const r2 = detectYouTubeRoute(
      'https://www.youtube.com/watch?v=12345678901&ref=shorts_player'
    );
    assert.strictEqual(r2.isShorts, false);

    // Non-YouTube host with /shorts
    const r3 = detectYouTubeRoute('https://www.notyoutube.com/shorts/dQw4w9WgXcQ');
    assert.strictEqual(r3.isShorts, false);
  });

  await t.test('validates video IDs strictly', () => {
    assert.strictEqual(validateVideoId('dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
    assert.strictEqual(validateVideoId('abc_123-XYZ'), 'abc_123-XYZ');
    // Invalid characters or length
    assert.strictEqual(validateVideoId('invalid video id with spaces'), null);
    assert.strictEqual(validateVideoId('<script>'), null);
    assert.strictEqual(validateVideoId('ab'), null); // too short
    assert.strictEqual(validateVideoId(''), null);
    assert.strictEqual(validateVideoId(null), null);
  });

  await t.test('validates YouTube hostnames correctly', () => {
    assert.strictEqual(isYouTubeHost('youtube.com'), true);
    assert.strictEqual(isYouTubeHost('www.youtube.com'), true);
    assert.strictEqual(isYouTubeHost('m.youtube.com'), true);
    assert.strictEqual(isYouTubeHost('music.youtube.com'), true);
    assert.strictEqual(isYouTubeHost('gaming.youtube.com'), true);
    assert.strictEqual(isYouTubeHost('fakeyoutube.com'), false);
    assert.strictEqual(isYouTubeHost('youtube.com.evil.com'), false);
  });
});
