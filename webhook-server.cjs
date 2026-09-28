#!/usr/bin/env node
/**
 * STB Landing - GitHub Webhook Receiver
 * Listens for push events on port 9003 and deploys on main branch push.
 * Sends Telegram notifications via TenSketch bot.
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '9003', 10);
const SECRET = process.env.WEBHOOK_SECRET || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8545990443';

function sendTelegram(msg) {
  if (!BOT_TOKEN) {
    console.log('[TG]', msg);
    return;
  }
  const body = JSON.stringify({ chat_id: CHAT_ID, text: msg, parse_mode: 'Markdown' });
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  };
  const r = https.request(options, () => {});
  r.on('error', (e) => console.error('[TG error]', e.message));
  r.write(body);
  r.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const sig = req.headers['x-hub-signature-256'];
      // Fail closed: require WEBHOOK_SECRET to be configured and a valid
      // HMAC signature on every request. Never skip verification.
      if (!SECRET) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Webhook secret not configured' }));
        return;
      }
      if (!sig) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Signature required' }));
        return;
      }
      {
        const hmac = crypto.createHmac('sha256', SECRET);
        hmac.update(body);
        const digest = 'sha256=' + hmac.digest('hex');
        if (digest !== sig) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid signature' }));
          return;
        }
      }

      try {
        const payload = JSON.parse(body);
        const event = req.headers['x-github-event'];
        const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : '';

        if (event === 'push' && branch === 'main') {
          const start = Date.now();
          sendTelegram(`🚀 *STB Deploy Started*\nBranch: \`main\`\nTime: ${new Date().toISOString()}`);
          const deploy = spawn('/bin/bash', ['-c',
            'cd /root/landing-stb && git fetch origin && git reset --hard origin/main && npm install && pm2 restart stb-server'
          ], { stdio: 'inherit' });
          deploy.on('close', (code) => {
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            if (code === 0) {
              sendTelegram(`✅ *STB Deploy Complete*\nBranch: \`main\`\nDuration: ${elapsed}s`);
            } else {
              sendTelegram(`❌ *STB Deploy Failed*\nBranch: \`main\`\nExit code: ${code}`);
            }
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, deploying: true }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, skipped: true, event, branch }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('STB Webhook OK');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`STB webhook listening on port ${PORT}`);
});
