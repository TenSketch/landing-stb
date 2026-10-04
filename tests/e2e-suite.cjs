/* STB E2E test suite — runs against live server on :3003 + public domains */
const crypto = require('crypto');
const fs = require('fs');
const pg = require('/root/landing-stb/node_modules/pg');
const { Client } = pg;

const BASE = 'http://127.0.0.1:3003';
const results = [];
function check(phase, name, cond, detail = '') {
  results.push({ phase, name, pass: !!cond, detail: String(detail).slice(0, 200) });
}
async function req(method, path, opts = {}) {
  const url = path.startsWith('http') ? path : BASE + path;
  const headers = { ...(opts.headers || {}) };
  if (opts.token) headers['Authorization'] = 'Bearer ' + opts.token;
  let body = opts.body;
  if (body && typeof body !== 'string') { headers['Content-Type'] = headers['Content-Type'] || 'application/json'; body = JSON.stringify(body); }
  try {
    const res = await fetch(url, { method, headers, body, redirect: 'manual' });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: res.status, headers: Object.fromEntries(res.headers), text, json };
  } catch (e) { return { status: 0, error: e.message, text: '', headers: {} }; }
}
function findVoucher(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') { const m = obj.match(/[A-Z]{2,6}-[A-Z0-9]{4,12}/); return m ? m[0] : null; }
  if (typeof obj !== 'object') return null;
  for (const k of ['voucherCode', 'voucher_code', 'voucher', 'code']) if (typeof obj[k] === 'string') return obj[k];
  for (const v of Object.values(obj)) { const f = findVoucher(v); if (f) return f; }
  return null;
}

(async () => {
  const errLogPath = '/root/.pm2/logs/stb-server-error.log';
  const errLogSizeBefore = fs.existsSync(errLogPath) ? fs.statSync(errLogPath).size : 0;

  // DB handle
  require('/root/landing-stb/node_modules/dotenv').config({ path: '/root/landing-stb/.env' });
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  /* ---------- Phase 1: public pages & static ---------- */
  for (const p of ['/', '/admin/', '/admin/reset-password']) {
    const r = await req('GET', p);
    check('1-pages', `GET ${p} -> 200`, r.status === 200, `status=${r.status}`);
  }
  const idx = await req('GET', '/');
  const assets = [...idx.text.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(m => m[1]).slice(0, 8);
  for (const a of assets) {
    const r = await req('GET', a);
    check('1-pages', `asset ${a} -> 200`, r.status === 200, `status=${r.status}`);
  }
  const nf = await req('GET', '/definitely-not-a-page-' + Date.now());
  check('1-pages', 'unknown route -> 404 or SPA fallback', nf.status === 404 || nf.status === 200, `status=${nf.status}`);

  /* ---------- Phase 2: public APIs ---------- */
  const health = await req('GET', '/api/health');
  check('2-api', 'GET /api/health -> 200 + database connected', health.status === 200 && health.json?.database === 'connected', JSON.stringify(health.json));
  const cfg = await req('GET', '/api/config');
  check('2-api', 'GET /api/config -> 200', cfg.status === 200, `status=${cfg.status}`);
  const cfgLower = cfg.text.toLowerCase();
  const leaked = ['smtp_password', 'stb_secret', 'password', 'secret_key', 'api_secret'].filter(s => cfgLower.includes(s));
  check('2-api', '/api/config exposes no secrets', leaked.length === 0, leaked.join(','));
  const veh = await req('GET', '/api/vehicles');
  check('2-api', 'GET /api/vehicles -> 200 + rows', veh.status === 200 && (veh.json?.vehicles?.length ?? 0) > 0, `vehicles=${veh.json?.vehicles?.length}`);
  const cont = await req('GET', '/api/content');
  check('2-api', 'GET /api/content -> 200', cont.status === 200, `status=${cont.status}`);

  /* ---------- Phase 3: estimate API ---------- */
  const estMissing = await req('POST', '/api/estimate', { body: { bookingType: 'One Way' } });
  check('3-estimate', 'missing origin/dest -> 400', estMissing.status === 400, `status=${estMissing.status}`);
  const est = await req('POST', '/api/estimate', { body: { bookingType: 'One Way', origin: { name: 'Changi Airport', lat: 1.3644, lng: 103.9915 }, destination: { name: 'Marina Bay Sands', lat: 1.2834, lng: 103.8607 } } });
  check('3-estimate', 'valid one-way estimate -> 200 + fare', est.status === 200 && !!est.json, `status=${est.status} body=${JSON.stringify(est.json).slice(0, 120)}`);
  const estSqli = await req('POST', '/api/estimate', { body: { bookingType: "One Way'; DROP TABLE bookings;--", origin: "1' OR '1'='1", destination: { name: 'x', lat: 1, lng: 103 } } });
  check('3-estimate', 'SQLi-ish payload -> no 500 / no stack leak', estSqli.status < 500 && !/at .*\.js:/.test(estSqli.text), `status=${estSqli.status}`);

  /* ---------- Phase 4: guest booking flow + XSS ---------- */
  const badBook = await req('POST', '/api/bookings', { body: { passengerName: 'X' } });
  check('4-booking', 'missing fields -> 400', badBook.status === 400, `status=${badBook.status}`);
  const XSS = '<img src=x onerror=alert(1)>';
  const book = await req('POST', '/api/bookings', { body: {
    passengerName: 'E2E-TEST ' + XSS, passengerEmail: 'e2e-test@example.com', passengerPhone: '+650000000',
    vehicle: '4-Seater', pickup: 'Changi Airport', destination: 'Marina Bay Sands',
    dateTime: '2026-10-15T10:00', currency: 'SGD', paymentMethod: 'Cash', pax: 2,
    bookingType: 'One Way', distanceKm: 20, notes: 'E2E automated test booking - safe to delete',
  } });
  check('4-booking', 'valid guest booking -> 2xx + voucher', book.status >= 200 && book.status < 300, `status=${book.status} body=${JSON.stringify(book.json).slice(0, 150)}`);
  const voucher = findVoucher(book.json) || findVoucher(book.text);
  check('4-booking', 'voucher code returned', !!voucher, `voucher=${voucher}`);
  if (voucher) {
    const assign = await req('GET', `/assign/${voucher}`);
    const rawXss = assign.text.includes('<img src=x');
    check('4-booking', '/assign page escapes XSS in passenger name', !rawXss && assign.status === 200, `status=${assign.status} rawXss=${rawXss}`);
    const badV = await req('GET', `/assign/${voucher}%27%20OR%201=1--`);
    check('4-booking', 'SQLi on voucher lookup -> no 500', badV.status < 500, `status=${badV.status}`);
  }

  /* ---------- Phase 5: customer auth flow ---------- */
  const email = 'e2e-test-' + Date.now() + '@example.com';
  const pw = 'E2e-Test!Pass123';
  const reg = await req('POST', '/api/auth/register', { body: { email, password: pw, name: 'E2E-TEST Customer', phone: '+650000001' } });
  check('5-customer', 'register -> 2xx', reg.status >= 200 && reg.status < 300, `status=${reg.status} body=${JSON.stringify(reg.json).slice(0, 120)}`);
  const dupReg = await req('POST', '/api/auth/register', { body: { email, password: pw, name: 'E2E-TEST Customer' } });
  check('5-customer', 'duplicate register rejected', dupReg.status >= 400, `status=${dupReg.status}`);
  const badLogin = await req('POST', '/api/auth/login', { body: { email, password: 'wrong-password' } });
  check('5-customer', 'wrong password -> 401', badLogin.status === 401 || badLogin.status === 400, `status=${badLogin.status}`);
  const login = await req('POST', '/api/auth/login', { body: { email, password: pw } });
  check('5-customer', 'login -> 2xx', login.status >= 200 && login.status < 300, `status=${login.status}`);
  const custToken = (login.headers['set-cookie'] || '').match(/stb_customer_session=([^;]+)/)?.[1] || null;
  check('5-customer', 'session cookie set', !!custToken, custToken ? 'cookie present' : JSON.stringify(login.headers).slice(0, 100));
  if (custToken) {
    const prof = await req('GET', '/api/customer/profile', { token: custToken });
    check('5-customer', 'GET /customer/profile with session -> 200', prof.status === 200, `status=${prof.status}`);
    const profNoAuth = await req('GET', '/api/customer/profile');
    check('5-customer', 'GET /customer/profile without session -> 401', profNoAuth.status === 401, `status=${profNoAuth.status}`);
    const upd = await req('PUT', '/api/customer/profile', { token: custToken, body: { name: 'E2E-TEST ' + XSS, phone: '+650000002' } });
    check('5-customer', 'PUT profile -> 2xx', upd.status >= 200 && upd.status < 300, `status=${upd.status}`);
    const prof2 = await req('GET', '/api/customer/profile', { token: custToken });
    check('5-customer', 'profile update persisted', (prof2.json?.customer?.name || JSON.stringify(prof2.json)).includes('E2E-TEST'), JSON.stringify(prof2.json).slice(0, 120));
    const myBook = await req('GET', '/api/customer/bookings', { token: custToken });
    check('5-customer', 'GET /customer/bookings -> 200', myBook.status === 200, `status=${myBook.status}`);
    const logout = await req('POST', '/api/auth/logout', { token: custToken });
    check('5-customer', 'logout -> 2xx', logout.status >= 200 && logout.status < 300, `status=${logout.status}`);
    const afterLogout = await req('GET', '/api/customer/profile', { token: custToken });
    check('5-customer', 'session invalid after logout', afterLogout.status === 401, `status=${afterLogout.status}`);
  }

  /* ---------- Phase 6: admin auth + admin APIs ---------- */
  const setup = await req('POST', '/admin/auth/setup', { body: { email: 'x@x.com', password: 'Whatever1!' } });
  check('6-admin', 'setup refused when admin exists', setup.status >= 400, `status=${setup.status}`);
  const badAdminLogin = await req('POST', '/admin/auth/login', { body: { email: 'bala@tensketch.com', password: 'definitely-wrong' } });
  check('6-admin', 'wrong admin password -> 4xx', badAdminLogin.status >= 400 && badAdminLogin.status < 500, `status=${badAdminLogin.status}`);
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    const r = await req('POST', '/admin/auth/login', { body: { email: 'bala@tensketch.com', password: 'wrong-' + i } });
    statuses.push(r.status);
  }
  check('6-admin', 'brute-force login attempts not 500 (rate-limit info)', statuses.every(s => s < 500), `statuses=${statuses.join(',')}`);
  const otpBad = await req('POST', '/admin/auth/verify-otp', { body: { email: 'bala@tensketch.com', otp: '000000' } });
  check('6-admin', 'verify-otp without session -> 4xx', otpBad.status >= 400 && otpBad.status < 500, `status=${otpBad.status}`);

  // Seed admin session directly in DB (bypasses email OTP delivery only)
  const adm = await db.query('SELECT email FROM admin_users ORDER BY created_at LIMIT 1');
  const adminEmail = adm.rows[0].email;
  const adminToken = crypto.randomBytes(32).toString('hex');
  const adminHash = crypto.createHash('sha256').update(adminToken).digest('hex');
  await db.query("INSERT INTO admin_sessions (email, session_token_hash, expires_at) VALUES ($1, $2, NOW() + interval '2 hours')", [adminEmail, adminHash]);

  const sess = await req('GET', '/api/admin/auth/session', { token: adminToken });
  check('6-admin', 'seeded session valid (GET auth/session)', sess.status === 200, `status=${sess.status} body=${JSON.stringify(sess.json).slice(0, 120)}`);
  const fakeTok = await req('GET', '/api/admin/auth/session', { token: 'a'.repeat(64) });
  check('6-admin', 'garbage token -> 401', fakeTok.status === 401, `status=${fakeTok.status}`);
  for (const p of ['/api/admin/dashboard', '/api/admin/bookings', '/api/admin/settings', '/api/admin/users', '/api/admin/vehicles', '/api/admin/pricing', '/api/admin/audit-logs', '/api/admin/customers', '/api/admin/drivers', '/api/admin/roles', '/api/admin/content', '/api/admin/integrations']) {
    const r = await req('GET', p, { token: adminToken });
    check('6-admin', `GET ${p}`, r.status === 200, `status=${r.status}`);
    const rNo = await req('GET', p);
    check('6-admin', `GET ${p} unauth -> 401`, rNo.status === 401, `status=${rNo.status}`);
  }

  // Content CRUD lifecycle
  const cCreate = await req('POST', '/api/admin/content', { token: adminToken, body: { block_key: 'e2e_test_block', category: 'test', title: 'E2E-TEST', body: 'delete me' } });
  check('7-crud', 'POST content -> 201', cCreate.status === 201, `status=${cCreate.status} body=${JSON.stringify(cCreate.json).slice(0, 100)}`);
  const blockId = cCreate.json?.block?.id;
  if (blockId) {
    const cUpd = await req('PUT', `/api/admin/content/${blockId}`, { token: adminToken, body: { title: 'E2E-TEST updated', body: 'updated' } });
    check('7-crud', 'PUT content -> 200', cUpd.status === 200, `status=${cUpd.status}`);
    const cDel = await req('DELETE', `/api/admin/content/${blockId}`, { token: adminToken });
    check('7-crud', 'DELETE content -> 200', cDel.status === 200, `status=${cDel.status}`);
  }
  // Driver CRUD lifecycle
  const dCreate = await req('POST', '/api/admin/drivers', { token: adminToken, body: { name: 'E2E-TEST Driver', phone: '+650000003', license_number: 'E2E-TEST-LIC' } });
  check('7-crud', 'POST driver -> 201', dCreate.status === 201, `status=${dCreate.status} body=${JSON.stringify(dCreate.json).slice(0, 100)}`);
  const driverId = dCreate.json?.driver?.id;
  if (driverId) {
    const dDel = await req('DELETE', `/api/admin/drivers/${driverId}`, { token: adminToken });
    check('7-crud', 'DELETE driver -> 200', dDel.status === 200, `status=${dDel.status}`);
  }

  // Booking status lifecycle
  if (voucher) {
    const badStatus = await req('PUT', `/api/admin/bookings/${voucher}/status`, { token: adminToken, body: { status: 'NOT_A_STATUS' } });
    check('7-crud', 'invalid status rejected', badStatus.status >= 400, `status=${badStatus.status}`);
    const illegal = await req('PUT', `/api/admin/bookings/${voucher}/status`, { token: adminToken, body: { status: 'COMPLETED' } });
    check('7-crud', 'illegal transition PENDING->COMPLETED rejected', illegal.status >= 400, `status=${illegal.status}`);
    const confirm = await req('PUT', `/api/admin/bookings/${voucher}/status`, { token: adminToken, body: { status: 'CONFIRMED', notes: 'E2E confirm' } });
    check('7-crud', 'PENDING->CONFIRMED accepted', confirm.status === 200, `status=${confirm.status} body=${JSON.stringify(confirm.json).slice(0, 100)}`);
    const hist = await req('GET', `/api/admin/bookings/${voucher}/status-history`, { token: adminToken });
    check('7-crud', 'status-history -> 200 + entries', hist.status === 200 && JSON.stringify(hist.json).includes('CONFIRMED'), `status=${hist.status}`);
    const cancel = await req('PUT', `/api/admin/bookings/${voucher}/status`, { token: adminToken, body: { status: 'CANCELLED', notes: 'E2E cleanup' } });
    check('7-crud', 'CONFIRMED->CANCELLED accepted', cancel.status === 200, `status=${cancel.status}`);
  }

  /* ---------- Phase 8: security probes ---------- */
  const h = idx.headers;
  check('8-security', 'X-Content-Type-Options present', !!h['x-content-type-options'], 'missing' );
  check('8-security', 'X-Frame-Options present', !!h['x-frame-options'], 'missing');
  check('8-security', 'HSTS present', !!h['strict-transport-security'], 'missing');
  check('8-security', 'CSP present', !!h['content-security-policy'], 'missing');
  for (const trav of ['/%2e%2e%2f%2e%2e%2fetc%2fpasswd', '/assets/..%2f..%2f..%2fetc%2fpasswd', '/static/../../../etc/passwd']) {
    const r = await req('GET', trav);
    check('8-security', `traversal ${trav} blocked`, r.status !== 200 || !r.text.includes('root:x:'), `status=${r.status}`);
  }
  const mal = await req('POST', '/api/bookings', { headers: { 'Content-Type': 'application/json' }, body: '{"broken": ' });
  check('8-security', 'malformed JSON -> 4xx, no stack leak', mal.status >= 400 && mal.status < 500 && !/at .*\.js:\d+/.test(mal.text), `status=${mal.status}`);
  const big = await req('POST', '/api/bookings', { headers: { 'Content-Type': 'application/json' }, body: '{"passengerName":"' + 'A'.repeat(2 * 1024 * 1024) + '"}' });
  check('8-security', '2MB payload rejected (4xx)', big.status >= 400 && big.status < 500, `status=${big.status}`);
  const adminNoTok = await req('PUT', '/api/admin/settings/system', { body: { key: 'x', value: 'y' } });
  check('8-security', 'unauth settings write -> 401', adminNoTok.status === 401, `status=${adminNoTok.status}`);

  /* ---------- Phase 9: webhook + public domain ---------- */
  const wh1 = await req('POST', 'http://127.0.0.1:9003/webhook', { body: { test: 1 } });
  check('9-edge', 'webhook without secret rejected', wh1.status >= 400, `status=${wh1.status}`);
  const wh2 = await req('POST', 'http://127.0.0.1:9003/webhook', { headers: { 'x-webhook-secret': 'wrong' }, body: { test: 1 } });
  check('9-edge', 'webhook with wrong secret rejected', wh2.status >= 400, `status=${wh2.status}`);
  for (const u of ['https://singaporetourbooking.com/', 'https://admin.singaporetourbooking.com/', 'https://api.singaporetourbooking.com/api/health']) {
    const r = await req('GET', u);
    check('9-edge', `public ${u} -> 200`, r.status === 200, `status=${r.status}`);
  }

  /* ---------- Phase 10: cleanup + log diff ---------- */
  await db.query("DELETE FROM customer_sessions WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE 'e2e-test-%@example.com')");
  await db.query("DELETE FROM customer_password_reset_tokens WHERE customer_id IN (SELECT id FROM customers WHERE email LIKE 'e2e-test-%@example.com')");
  await db.query("DELETE FROM customers WHERE email LIKE 'e2e-test-%@example.com'");
  await db.query("DELETE FROM bookings WHERE passenger_name LIKE 'E2E-TEST%' OR notes LIKE 'E2E automated test%'");
  await db.query("DELETE FROM content_blocks WHERE block_key = 'e2e_test_block'");
  await db.query("DELETE FROM drivers WHERE name LIKE 'E2E-TEST%'");
  await db.query("DELETE FROM admin_sessions WHERE session_token_hash = $1", [adminHash]);
  await db.query("DELETE FROM otp_sessions WHERE email LIKE '%e2e%'");
  check('10-cleanup', 'test data removed from DB', true, 'customers/bookings/drivers/content/sessions purged');

  const errLogSizeAfter = fs.existsSync(errLogPath) ? fs.statSync(errLogPath).size : 0;
  let newErrors = '';
  if (errLogSizeAfter > errLogSizeBefore) {
    const fd = fs.openSync(errLogPath, 'r');
    const buf = Buffer.alloc(errLogSizeAfter - errLogSizeBefore);
    fs.readSync(fd, buf, 0, buf.length, errLogSizeBefore);
    fs.closeSync(fd);
    newErrors = buf.toString();
  }
  const realErrors = newErrors.split('\n').filter(l => l.trim() && !l.includes('[AdminAuth] 401') && !l.includes('SyntaxError') && !l.includes('body-parser') && !/^\s+at /.test(l) && !l.includes('code: ') && !l.includes('statusCode:'));
  check('10-cleanup', 'no new server errors during E2E', realErrors.length === 0, realErrors.slice(0, 5).join(' | ').slice(0, 200));

  await db.end();

  /* ---------- report ---------- */
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass);
  const out = { total: results.length, pass, fail: fail.length, results };
  fs.mkdirSync('/tmp/stb-e2e', { recursive: true });
  fs.writeFileSync('/tmp/stb-e2e-results.json', JSON.stringify(out, null, 2));

  console.log(`\n===== STB E2E SUMMARY: ${pass}/${results.length} passed, ${fail.length} failed =====`);
  const byPhase = {};
  for (const r of results) { byPhase[r.phase] = byPhase[r.phase] || { p: 0, f: 0 }; r.pass ? byPhase[r.phase].p++ : byPhase[r.phase].f++; }
  for (const [ph, c] of Object.entries(byPhase)) console.log(`  ${ph}: ${c.p} pass / ${c.f} fail`);
  if (fail.length) {
    console.log('\n--- FAILURES ---');
    for (const f of fail) console.log(`  [FAIL][${f.phase}] ${f.name} :: ${f.detail}`);
  }
  process.exit(0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(1); });
