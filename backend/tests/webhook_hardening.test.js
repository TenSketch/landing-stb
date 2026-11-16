import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Webhook server hardening tests (PR #2): body cap, signature fail-closed
// behaviour, route/method handling, JSON errors, and the single-failure-alert
// guard for spawn errors. NEVER exercises the push-to-main deploy path — all
// signed requests use non-main branches or non-push events.

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SECRET = 'qa-webhook-secret';
let passed = 0;

function test(name, condition) {
  assert.ok(condition, name);
  passed++;
  console.log(`✅ ${name}`);
}

function startServer(port, extraEnv = {}) {
  const child = spawn(process.execPath, [path.join(root, 'webhook-server.cjs')], {
    env: {
      ...process.env,
      PORT: String(port),
      WEBHOOK_SECRET: SECRET,
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', (d) => { output += d; });
  child.stderr.on('data', (d) => { output += d; });
  child.getOutput = () => output;
  return child;
}

function request(port, { method = 'GET', path: p = '/', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: p, headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

async function waitForHealth(port, child) {
  for (let i = 0; i < 50; i++) {
    try {
      const h = await request(port, { path: '/health' });
      if (h.status === 200) return true;
    } catch { /* not up yet */ }
    if (child.exitCode !== null) return false;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

const sign = (payload) => 'sha256=' + crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
const PORT = 19000 + Math.floor(Math.random() * 900);
const child = startServer(PORT);

try {
  const up = await waitForHealth(PORT, child);
  test('webhook server starts and reports healthy', up);

  const notFound = await request(PORT, { path: '/definitely-not-a-route' });
  test('unknown route returns JSON 404', notFound.status === 404 && notFound.body.includes('Not found'));

  const big = 'x'.repeat(2 * 1024 * 1024);
  const oversized = await request(PORT, {
    method: 'POST', path: '/webhook',
    headers: { 'content-type': 'application/json', 'content-length': String(big.length) },
    body: big
  });
  test('oversized declared payload rejected with 413', oversized.status === 413);

  // Overflow without a declared length (chunked streaming) must also be capped.
  const streamed = await new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1', port: PORT, method: 'POST', path: '/webhook',
      headers: { 'content-type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', () => resolve({ status: -1, body: 'client-error' }));
    req.write(big);
    req.end();
  });
  test('streamed payload over the cap rejected with 413', streamed.status === 413);

  const unsigned = await request(PORT, {
    method: 'POST', path: '/webhook',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ref: 'refs/heads/qa-test-branch' })
  });
  test('unsigned webhook rejected with 401', unsigned.status === 401);

  const badSig = await request(PORT, {
    method: 'POST', path: '/webhook',
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=' + 'dead'.repeat(16) },
    body: JSON.stringify({ ref: 'refs/heads/qa-test-branch' })
  });
  test('invalid signature rejected with 401', badSig.status === 401);

  // Safe signed path: non-main branch → skipped, no deploy ever spawns.
  const payload = JSON.stringify({ ref: 'refs/heads/qa-test-branch' });
  const skipped = await request(PORT, {
    method: 'POST', path: '/webhook',
    headers: { 'content-type': 'application/json', 'x-github-event': 'push', 'x-hub-signature-256': sign(payload) },
    body: payload
  });
  test('valid signature with non-main branch is acknowledged and skipped',
    skipped.status === 200 && skipped.body.includes('"skipped":true'));

  const malformed = '{not json';
  const badJson = await request(PORT, {
    method: 'POST', path: '/webhook',
    headers: { 'content-type': 'application/json', 'x-github-event': 'push', 'x-hub-signature-256': sign(malformed) },
    body: malformed
  });
  test('signed but malformed JSON returns a generic 400', badJson.status === 400 && badJson.body.includes('Invalid webhook JSON'));

  const getWebhook = await request(PORT, { method: 'GET', path: '/webhook' });
  test('GET on the webhook route is not treated as a webhook', getWebhook.status === 404);

  // Fail-closed: without WEBHOOK_SECRET the endpoint must refuse everything.
  const PORT2 = PORT + 1000;
  const noSecret = startServer(PORT2, { WEBHOOK_SECRET: '' });
  try {
    const up2 = await waitForHealth(PORT2, noSecret);
    test('second instance without a secret starts', up2);
    const refused = await request(PORT2, {
      method: 'POST', path: '/webhook',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ref: 'refs/heads/qa-test-branch' })
    });
    test('missing WEBHOOK_SECRET fails closed with 503', refused.status === 503);
  } finally {
    noSecret.kill();
  }

  // PR #2 review P2: one failure alert per failed deployment.
  const src = fs.readFileSync(path.join(root, 'webhook-server.cjs'), 'utf8');
  test('close handler short-circuits when the spawn already failed',
    /deploy\.on\('close'[\s\S]{0,140}if \(spawnFailed\) return;/.test(src));
  test('spawn error handler sets the guard before alerting',
    /deploy\.on\('error'[\s\S]{0,90}spawnFailed = true;/.test(src));
  test('deploy still only triggers for push events on main',
    src.includes("event === 'push' && branch === 'main'"));
} finally {
  child.kill();
}

console.log(`Webhook hardening tests: ${passed} assertions passed`);
