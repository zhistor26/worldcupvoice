/**
 * Dev fallback: publish samples/*.mp4 directly to Agora RTC as the match-feed UID.
 * Use when Media Gateway is not activated on your Agora project yet.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { RtcRole, RtcTokenBuilder } = require('agora-token');

const projectRoot = process.cwd();
const defaultChannel = 'worldcup-live';
const defaultFeedUid = 234567;
const expirationSeconds = 3600;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!process.env[key]) {
      process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

function readEnv(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function resolveInputClip() {
  const input = process.env.RTMP_INPUT?.trim();
  if (input) {
    return path.isAbsolute(input) ? input : path.join(projectRoot, input);
  }
  const samplesDir = path.join(projectRoot, 'samples');
  if (!fs.existsSync(samplesDir)) return null;
  const mp4 = fs
    .readdirSync(samplesDir)
    .filter((name) => name.toLowerCase().endsWith('.mp4'))
    .sort()[0];
  return mp4 ? path.join(samplesDir, mp4) : null;
}

function startVideoServer(videoPath) {
  const port = Number.parseInt(process.env.LOCAL_FEED_HTTP_PORT || '8765', 10);
  const server = http.createServer((req, res) => {
    if (req.url === '/clip.mp4') {
      res.writeHead(200, { 'Content-Type': 'video/mp4', 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port }));
    server.on('error', reject);
  });
}

loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

const appId = readEnv('NEXT_PUBLIC_AGORA_APP_ID', 'AGORA_APP_ID');
const certificate = readEnv('NEXT_AGORA_APP_CERTIFICATE', 'AGORA_APP_CERTIFICATE');
const channel =
  readEnv('NEXT_PUBLIC_LIVE_CHANNEL_NAME', 'LIVE_CHANNEL_NAME') || defaultChannel;
const feedUid = Number.parseInt(
  readEnv('NEXT_PUBLIC_MATCH_FEED_UID', 'MATCH_FEED_UID') || String(defaultFeedUid),
  10,
);
const clipPath = resolveInputClip();

if (!appId || !certificate) {
  console.error('Missing NEXT_PUBLIC_AGORA_APP_ID or NEXT_AGORA_APP_CERTIFICATE in .env.local');
  process.exit(1);
}
if (!clipPath || !fs.existsSync(clipPath)) {
  console.error('No MP4 found. Put a clip in samples/ or set RTMP_INPUT.');
  process.exit(1);
}

const expireAt = Math.floor(Date.now() / 1000) + expirationSeconds;
const token = RtcTokenBuilder.buildTokenWithUid(
  appId,
  certificate,
  channel,
  feedUid,
  RtcRole.PUBLISHER,
  expireAt,
  expireAt,
);

const { server, port } = await startVideoServer(clipPath);
const videoUrl = `http://127.0.0.1:${port}/clip.mp4`;

console.log('Local RTC feed publisher (Media Gateway bypass)');
console.log(`  channel: ${channel}`);
console.log(`  feed uid: ${feedUid}`);
console.log(`  clip: ${path.relative(projectRoot, clipPath)}`);
console.log('  Keep this terminal open. Press Ctrl+C to stop.');
console.log('');

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();

page.on('console', (msg) => {
  const text = msg.text();
  if (text.startsWith('[feed]')) console.log(text);
});

await page.setContent(`<!doctype html>
<html><body>
<script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.24.3.js"></script>
<script>
(async () => {
  const config = ${JSON.stringify({ appId, channel, token, feedUid, videoUrl })};
  const video = document.createElement('video');
  video.src = config.videoUrl;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    video.addEventListener('canplay', resolve, { once: true });
    video.addEventListener('error', () => reject(new Error('video load failed')), { once: true });
    video.load();
    video.play().catch(reject);
  });

  const client = AgoraRTC.createClient({ mode: 'live', codec: 'h264' });
  await client.setClientRole('host');
  await client.join(config.appId, config.channel, config.token, config.feedUid);

  const [videoTrack] = video.captureStream(30).getVideoTracks();
  const track = AgoraRTC.createCustomVideoTrack({ mediaStreamTrack: videoTrack });
  await client.publish([track]);
  console.log('[feed] publishing to RTC — browser should show live video now');
})().catch((err) => {
  console.error('[feed] failed:', err && err.message ? err.message : err);
});
</script>
</body></html>`);

const shutdown = async () => {
  await browser.close().catch(() => {});
  server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await new Promise(() => {});
