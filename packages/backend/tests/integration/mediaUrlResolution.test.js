import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer } from '../helpers/testServer.js';

// Regression test for a real bug caught on the live app: Railway (like
// Heroku/Render) terminates TLS at its own edge and forwards plain HTTP
// internally, so req.protocol was always 'http' unless Express trusts the
// X-Forwarded-Proto header from that hop (app.js's `app.set('trust proxy',
// 1)`). Without it, resolveLocalMediaUrl (audiobookController.js) built
// cover/audio URLs as http://, which Android refuses to load at all
// (cleartext traffic is blocked by default) - real users saw missing
// covers and a play button that silently failed on the mobile app, even
// though the same URLs "worked" in a browser (which tolerates/upgrades
// mixed content more leniently than a native app does).
describe('Media URL protocol resolution behind a reverse proxy (Dia 96-100)', () => {
  let server;
  let baseUrl;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    await stopTestServer(server);
  });

  test('builds https:// cover URLs when X-Forwarded-Proto: https is present (Railway-like proxy)', async () => {
    const res = await fetch(`${baseUrl}/api/audiobooks`, {
      headers: { 'X-Forwarded-Proto': 'https' },
    });
    const audiobooks = await res.json();
    const withCover = audiobooks.find((b) => b.cover_image_url);
    assert.ok(withCover, 'expected at least one seeded audiobook to have a cover_image_url');
    assert.match(withCover.cover_image_url, /^https:\/\//);
  });

  test('builds http:// cover URLs for a plain local request (no proxy)', async () => {
    const res = await fetch(`${baseUrl}/api/audiobooks`);
    const audiobooks = await res.json();
    const withCover = audiobooks.find((b) => b.cover_image_url);
    assert.ok(withCover);
    assert.match(withCover.cover_image_url, /^http:\/\//);
  });
});
