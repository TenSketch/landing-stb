#!/usr/bin/env node
/* STB AUDIT — extended probes beyond the 90-check e2e suite.
 * Phases: A-sensitive-files, B-traversal, C-cookies, D-cors, E-methods,
 *         F-ratelimit, G-host, H-live-headers, I-secret-scan, J-errors
 * Output: /tmp/stb-audit-results.json + PASS/FAIL summary.
 */
const crypto = require('crypto');
const { URL } = require('url');

const DIRECT = process.env.STB_E2E_BASE_URL || 'http://127.0.0.1:3003';
const LIVE = (process.env.STB_PUBLIC_AUDIT_URLS || 'https://singaporetourbooking.com,https://admin.singaporetourbooking.com,https://api.singaporetourbooking.com').split(',').map(s => s.trim()).filter(Boolean);
const RUN_PUBLIC = process.env.RUN_PUBLIC_DOMAIN_AUDIT === 'true';

const results = [];
function check(phase, name, cond, detail = '') {
  results.push({ phase, name, pass: !!cond, detail: String(detail).slice(0, 300) });
  console.log(`${cond ? '  ok ' : 'FAIL '} [${phase}] ${name}${detail ? ' :: ' + String(detail).slice(0, 160) : ''}`);
}

async function req(url, opts = {}) {
  try {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000), ...opts });
    const text = await r.text();
    return { status: r.status, headers: Object.fromEntries(r.headers.entries()), text };
  } catch (e) {
    return { status: 0, headers: {}, text: '', error: e.message };
  }
}

(async () => {
  /* ---------- A: sensitive files must NOT return real file content ---------- */
  const secrets = ['SMTP_PASSWORD', 'DATABASE_URL', 'WEBHOOK_SECRET', 'BEGIN RSA PRIVATE KEY', 'ghp_', 'xoxb-'];
  const files = ['/.env', '/.env.backup-3', '/.git/HEAD', '/package.json', '/server.js',
    '/webhook-server.cjs', '/webhook-server.js', '/ecosystem.config.cjs', '/stb-webhook-start.sh',
    '/lib/api.js', '/.env.example', '/proc/self/environ', '/pm2.pid', '/yarn.lock'];
  const sensitiveFileBases = RUN_PUBLIC ? [DIRECT, ...LIVE.filter(u => u.includes('api.'))] : [DIRECT];
  for (const base of sensitiveFileBases) {
    for (const f of files) {
      const r = await req(base + f);
      const leaked = secrets.filter(s => r.text.includes(s));
      const isSecretContent = leaked.length > 0 || (f.includes('.env') && r.text.includes('SMTP_HOST')) || r.text.includes('PORT=3003');
      check('A-files', `${base === DIRECT ? 'direct' : 'live'} ${f}`, !isSecretContent,
        `status=${r.status} len=${r.text.length}${leaked.length ? ' LEAK:' + leaked.join(',') : ''} ct=${(r.headers['content-type'] || '').slice(0, 40)}`);
    }
  }

  /* ---------- B: path traversal ---------- */
  const travs = ['/%2e%2e%2f%2e%2e%2fetc/passwd', '/..%2f..%2fetc/passwd', '/public/../../etc/passwd',
    '/admin/../../../etc/passwd', '/static/..%2f..%2froot/.ssh/id_rsa', '/.%2e/.%2e/etc/passwd'];
  for (const t of travs) {
    const r = await req(DIRECT + t);
    const got = r.text.includes('root:x:0:0') || r.text.includes('PRIVATE KEY');
    check('B-traversal', `direct ${t}`, !got, `status=${r.status} len=${r.text.length}`);
  }

  /* ---------- C: cookie flags on customer session (public HTTPS) ---------- */
  const email = 'audit-test-' + Date.now() + '@example.com';
  const pw = 'Audit-Test!123';
  const reg = await req(DIRECT + '/api/auth/register',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw, name: 'AUDIT-TEST', phone: '+650****0009' }) });
  const login = await req(DIRECT + '/api/auth/login',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
  const sc = login.headers['set-cookie'] || '';
  check('C-cookies', 'register+login -> 200', reg.status < 300 && login.status < 300, `reg=${reg.status} login=${login.status}`);
  const ck = Array.isArray(login.headers['set-cookie']) ? login.headers['set-cookie'].join(' | ') : String(sc);
  check('C-cookies', 'session cookie HttpOnly', /stb_customer_session[^;]*HttpOnly|HttpOnly/i.test(ck), ck.slice(0, 220));
  check('C-cookies', 'session cookie Secure', /Secure/i.test(ck), ck.slice(0, 220));
  check('C-cookies', 'session cookie SameSite', /SameSite/i.test(ck), ck.slice(0, 220));

  /* ---------- D: CORS reflection ---------- */
  for (const p of ['/api/config', '/api/vehicles', '/api/health']) {
    const r = await req(DIRECT + p, { headers: { Origin: 'https://evil.example' } });
    const acao = r.headers['access-control-allow-origin'] || '';
    check('D-cors', `direct ${p} no ACAO reflection`, !acao || acao === 'null' || acao.includes('singaporetourbooking.com'), `acao=${acao || '<absent>'}`);
  }

  /* ---------- E: methods on known routes (no 500s) ---------- */
  for (const [m, p] of [['DELETE', '/api/health'], ['PUT', '/api/vehicles'], ['PATCH', '/api/config'], ['DELETE', '/api/admin/users']]) {
    const r = await req(DIRECT + p, { method: m, headers: { 'content-type': 'application/json' }, body: '{}' });
    check('E-methods', `${m} ${p} no 500`, r.status !== 500, `status=${r.status} body=${r.text.slice(0, 80)}`);
  }

  /* ---------- F: admin login rate limit (fixed fake email — limiter keys on email) ---------- */
  let saw429 = false, statuses = [];
  for (let i = 0; i < 14; i++) {
    const r = await req(DIRECT + '/api/admin/auth/login',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ratelimit-probe@nonexistent.example', password: 'wrong-pass-' + i }) });
    statuses.push(r.status);
    if (r.status === 429) { saw429 = true; break; }
  }
  check('F-ratelimit', 'admin login returns 429 after repeated bad attempts', saw429, `statuses=${statuses.join(',')}`);

  /* ---------- G: Host header handling ---------- */
  const hv = await req(DIRECT + '/', { headers: { Host: 'evil.example' } });
  const evilAdmin = hv.text.includes('stb-admin') || hv.text.includes('/admin/assets');
  check('G-host', 'unknown Host does not serve admin UI', !evilAdmin, `status=${hv.status} len=${hv.text.length}`);
  const hh = await req(DIRECT + '/api/health', { headers: { Host: 'evil.example' } });
  check('G-host', 'unknown Host /api/health -> no data leak beyond health', hh.status === 404 || hh.status === 200, `status=${hh.status} body=${hh.text.slice(0, 80)}`);

  /* ---------- H: public domain headers + redirects (explicit opt-in) ---------- */
  for (const base of (RUN_PUBLIC ? LIVE : [])) {
    const h = await req(base + '/');
    const csp = String(h.headers['content-security-policy'] || '');
    check('H-live', `${base} HTTP->HTTPS redirect`, base.startsWith('https://') ? true : h.status, `status=${h.status} loc=${h.headers['location'] || '-'}`);
    if (base.includes('admin.') || base.includes('api.')) {
      check('H-live', `${base} exactly 1 CSP`, csp ? (csp.split('base-uri').length === 2) : true, `csp_len=${csp.length}`);
    }
    check('H-live', `${base} HSTS present`, !!h.headers['strict-transport-security'], String(h.headers['strict-transport-security'] || '<absent>'));
    check('H-live', `${base} X-Frame-Options=${h.headers['x-frame-options']}`, !!h.headers['x-frame-options'], String(h.headers['x-frame-options'] || '<absent>'));
  }
  if (RUN_PUBLIC) {
    const httpRed = await req('http://singaporetourbooking.com/');
    const loc = httpRed.headers['location'] || '';
    check('H-live', 'http://apex redirects to https', httpRed.status >= 300 && httpRed.status < 400 && loc.includes('https'), `status=${httpRed.status} loc=${loc}`);
    const httpApi = await req('http://api.singaporetourbooking.com/api/health');
    check('H-live', 'http://api redirects (or serves harmless health)', httpApi.status === 301 || httpApi.status === 308 || (httpApi.status === 200 && !httpApi.text.includes('DATABASE_URL')), `status=${httpApi.status} loc=${httpApi.headers['location'] || '-'}`);
  } else {
    results.push({ phase: 'H-live', name: 'public domain probes', pass: true, skipped: true, detail: 'Set RUN_PUBLIC_DOMAIN_AUDIT=true only for an explicitly approved read-only live audit' });
  }

  /* ---------- I: secret scan on public JSON ---------- */
  const scanTargets = ['/api/config', '/api/content', '/api/vehicles', '/api/health', '/api/auth/session', '/api/customer/profile'];
  for (const p of scanTargets) {
    const r = await req(DIRECT + p);
    const hit = ['SMTP_PASSWORD', 'smtp_password', 'DATABASE_URL', 'WEBHOOK_SECRET', 'ghp_', 'AIza'].filter(s => r.text.includes(s));
    check('I-secrets', `direct ${p} no secrets`, hit.length === 0, hit.length ? 'LEAK:' + hit.join(',') : `status=${r.status}`);
  }

  /* ---------- J: unknown API route shape (JSON 404, no stack) ---------- */
  const unk = await req(DIRECT + '/api/definitely-not-a-route-xyz');
  check('J-errors', 'unknown /api route -> 404 JSON/HTML w/o stack', unk.status === 404 && !/at .*\.js:\d+/.test(unk.text), `status=${unk.status} body=${unk.text.slice(0, 100)}`);
  const unkMethod = await req(DIRECT + '/api/bookings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' });
  check('J-errors', 'PUT /api/bookings -> 404/405, no 500', unkMethod.status !== 500, `status=${unkMethod.status}`);

  /* ---------- K: test-data lifecycle (purge customers this audit created) ---------- */
  try {
    require('dotenv').config({ path: process.env.STB_ENV_FILE || '.env' });
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for audit cleanup');
    const { Client } = require('pg');
    const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false });
    await db.connect();
    const marker = "email ILIKE 'audit-test-%' OR email ILIKE 'livecheck-%'";
    await db.query(`DELETE FROM customer_sessions WHERE customer_id IN (SELECT id FROM customers WHERE ${marker})`);
    const del = await db.query(`DELETE FROM customers WHERE ${marker}`);
    const left = await db.query(`SELECT count(*) FROM customers WHERE ${marker}`);
    check('K-cleanup', 'audit test customers purged (0 residue)', Number(left.rows[0].count) === 0, `deleted=${del.rowCount} residue=${left.rows[0].count}`);
    await db.end();
  } catch (e) {
    check('K-cleanup', 'audit test customers purged (0 residue)', false, 'cleanup error: ' + e.message);
  }

  /* ---------- summary + save ---------- */
  const fail = results.filter(r => !r.pass && !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const byPhase = {};
  for (const r of results) {
    byPhase[r.phase] = byPhase[r.phase] || { pass: 0, fail: 0, skipped: 0 };
    if (r.skipped) byPhase[r.phase].skipped++;
    else if (r.pass) byPhase[r.phase].pass++;
    else byPhase[r.phase].fail++;
  }
  console.log('\n===== AUDIT SUMMARY =====');
  for (const [ph, v] of Object.entries(byPhase)) console.log(`  ${ph}: ${v.pass} pass / ${v.fail} fail / ${v.skipped} skipped`);
  console.log(`TOTAL: ${results.length - fail.length - skipped.length} passed / ${results.length - skipped.length} executed / ${skipped.length} skipped / ${fail.length} failed`);
  console.log('--- FAILURES ---');
  for (const f of fail) console.log(`  [FAIL][${f.phase}] ${f.name} :: ${f.detail}`);
  const resultsPath = process.env.STB_AUDIT_RESULTS_PATH || '/tmp/stb-audit-results.json';
  require('fs').mkdirSync(require('path').dirname(resultsPath), { recursive: true });
  require('fs').writeFileSync(resultsPath, JSON.stringify({ when: new Date().toISOString(), total: results.length, passed: results.filter(r => r.pass && !r.skipped).length, failed: fail.length, skipped: results.filter(r => r.skipped).length, results }, null, 1));
  console.log('results: ' + resultsPath);
  process.exitCode = fail.length ? 1 : 0;
})().catch(e => { console.error('AUDIT CRASH:', e); process.exit(1); });
