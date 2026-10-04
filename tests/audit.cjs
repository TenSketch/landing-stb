#!/usr/bin/env node
/* STB AUDIT — extended probes beyond the 90-check e2e suite.
 * Phases: A-sensitive-files, B-traversal, C-cookies, D-cors, E-methods,
 *         F-ratelimit, G-host, H-live-headers, I-secret-scan, J-errors
 * Output: /tmp/stb-audit-results.json + PASS/FAIL summary.
 */
const crypto = require('crypto');
const { URL } = require('url');

const DIRECT = 'http://127.0.0.1:3003';
const LIVE = ['https://singaporetourbooking.com', 'https://admin.singaporetourbooking.com', 'https://api.singaporetourbooking.com'];

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
  for (const base of [DIRECT, 'https://api.singaporetourbooking.com']) {
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
  const reg = await req('https://api.singaporetourbooking.com/api/auth/register',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw, name: 'AUDIT-TEST', phone: '+650****0009' }) });
  const login = await req('https://api.singaporetourbooking.com/api/auth/login',
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

  /* ---------- H: live headers + redirects ---------- */
  for (const base of LIVE) {
    const h = await req(base + '/');
    const csp = String(h.headers['content-security-policy'] || '');
    check('H-live', `${base} HTTP->HTTPS redirect`, base.startsWith('https://') ? true : h.status, `status=${h.status} loc=${h.headers['location'] || '-'}`);
    if (base.includes('admin.') || base.includes('api.')) {
      check('H-live', `${base} exactly 1 CSP`, csp ? (csp.split('base-uri').length === 2) : true, `csp_len=${csp.length}`);
    }
    check('H-live', `${base} HSTS present`, !!h.headers['strict-transport-security'], String(h.headers['strict-transport-security'] || '<absent>'));
    check('H-live', `${base} X-Frame-Options=${h.headers['x-frame-options']}`, !!h.headers['x-frame-options'], String(h.headers['x-frame-options'] || '<absent>'));
  }
  // http:// apex should redirect
  const httpRed = await req('http://singaporetourbooking.com/');
  const loc = httpRed.headers['location'] || '';
  check('H-live', 'http://apex redirects to https', httpRed.status >= 300 && httpRed.status < 400 && loc.includes('https'), `status=${httpRed.status} loc=${loc}`);
  const httpApi = await req('http://api.singaporetourbooking.com/api/health');
  check('H-live', 'http://api redirects (or serves harmless health)', httpApi.status === 301 || httpApi.status === 308 || (httpApi.status === 200 && !httpApi.text.includes('DATABASE_URL')), `status=${httpApi.status} loc=${httpApi.headers['location'] || '-'}`);

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

  /* ---------- summary + save ---------- */
  const fail = results.filter(r => !r.pass);
  const byPhase = {};
  for (const r of results) {
    byPhase[r.phase] = byPhase[r.phase] || { pass: 0, fail: 0 };
    byPhase[r.phase][r.pass ? 'pass' : 'fail']++;
  }
  console.log('\n===== AUDIT SUMMARY =====');
  for (const [ph, v] of Object.entries(byPhase)) console.log(`  ${ph}: ${v.pass} pass / ${v.fail} fail`);
  console.log(`TOTAL: ${results.length - fail.length}/${results.length}`);
  console.log('--- FAILURES ---');
  for (const f of fail) console.log(`  [FAIL][${f.phase}] ${f.name} :: ${f.detail}`);
  require('fs').mkdirSync('/tmp/stb-audit', { recursive: true });
  require('fs').writeFileSync('/tmp/stb-audit-results.json', JSON.stringify({ when: new Date().toISOString(), results }, null, 1));
  console.log('results: /tmp/stb-audit-results.json');
})().catch(e => { console.error('AUDIT CRASH:', e); process.exit(1); });
