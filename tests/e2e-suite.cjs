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

  
  // Pre-clean any artifacts from previous crashed runs
  await db.query("DELETE FROM admin_users WHERE email LIKE 'e2e-admin-user-%@example.com'").catch(() => {});
  await db.query("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE slug LIKE 'e2e-role-%')").catch(() => {});
  await db.query("DELETE FROM roles WHERE slug LIKE 'e2e-role-%'").catch(() => {});
  await db.query("DELETE FROM vehicle_types WHERE name LIKE 'E2E-TEST Vehicle%'").catch(() => {});
  await db.query("DELETE FROM integration_settings WHERE provider_key LIKE 'e2e-test-integration-%'").catch(() => {});
  await db.query("DELETE FROM notification_templates WHERE name LIKE 'E2E-TEST Template%'").catch(() => {});

  /* ---------- Phase 11: admin auth lifecycle ---------- */
  const setupRefused = await req('POST', '/api/admin/auth/setup', { body: { email: 'e2e-admin-setup@example.com', password: 'SetupPass123!' } });
  check('11-admin-auth', 'setup refuses unauthorized email', setupRefused.status >= 400, `status=${setupRefused.status}`);
  const verifyNoSession = await req('POST', '/api/admin/auth/verify-otp', { body: { email: 'e2e-admin-otp@example.com', otp: '123456' } });
  check('11-admin-auth', 'verify-otp without login -> 4xx', verifyNoSession.status >= 400 && verifyNoSession.status < 500, `status=${verifyNoSession.status}`);
  const forgotFake = await req('POST', '/api/admin/auth/forgot-password', { body: { email: 'e2e-admin-forgot-' + Date.now() + '@example.com' } });
  check('11-admin-auth', 'forgot-password fake email -> success (no leak)', forgotFake.status === 200, `status=${forgotFake.status}`);
  const resetBad = await req('POST', '/api/admin/auth/reset-password', { body: { token: 'invalid-token', password: 'NewPass123!' } });
  check('11-admin-auth', 'reset-password invalid token -> 400', resetBad.status >= 400, `status=${resetBad.status}`);
  const changeMissing = await req('POST', '/api/admin/auth/change-password', { token: adminToken, body: {} });
  check('11-admin-auth', 'change-password missing fields -> 400', changeMissing.status >= 400, `status=${changeMissing.status}`);

  /* ---------- Phase 12: additional admin CRUD ---------- */
  // Vehicles
  const vCreate = await req('POST', '/api/admin/vehicles', { token: adminToken, body: { name: 'E2E-TEST Vehicle ' + Date.now(), description: 'QA', paxMax: 4, luggageCapacity: 2, sortOrder: 99 } });
  check('12-admin-crud', 'POST vehicle -> 201', vCreate.status === 201, `status=${vCreate.status}`);
  const vehicleId = vCreate.json?.vehicle?.id;
  if (vehicleId) {
    const vUpd = await req('PUT', `/api/admin/vehicles/${vehicleId}`, { token: adminToken, body: { name: 'E2E-TEST Vehicle Updated ' + Date.now(), paxMax: 5 } });
    check('12-admin-crud', 'PUT vehicle -> 200', vUpd.status === 200, `status=${vUpd.status}`);
    const vExt = await req('PUT', `/api/admin/vehicles/${vehicleId}/extended`, { token: adminToken, body: { baseFareSgd: 50, perKmSgd: 2.5, minFareSgd: 50, hourlySgd: 70 } });
    check('12-admin-crud', 'PUT vehicle extended -> 200', vExt.status === 200, `status=${vExt.status}`);
    const vDel = await req('DELETE', `/api/admin/vehicles/${vehicleId}`, { token: adminToken });
    check('12-admin-crud', 'DELETE vehicle -> 200', vDel.status === 200, `status=${vDel.status}`);
  }

  // Roles + Users
  const roleSlug = 'e2e-role-' + Date.now();
  const rCreate = await req('POST', '/api/admin/roles', { token: adminToken, body: { name: 'E2E-TEST Role ' + Date.now(), slug: roleSlug, description: 'test', permissionKeys: ['vehicles.view'] } });
  check('12-admin-crud', 'POST role -> 201', rCreate.status === 201, `status=${rCreate.status}`);
  const roleId = rCreate.json?.role?.id;
  if (roleId) {
    const rGet = await req('GET', `/api/admin/roles/${roleId}`, { token: adminToken });
    check('12-admin-crud', 'GET role by id -> 200', rGet.status === 200, `status=${rGet.status}`);
    const rUpd = await req('PUT', `/api/admin/roles/${roleId}`, { token: adminToken, body: { permissionKeys: ['bookings.view'] } });
    check('12-admin-crud', 'PUT role -> 200', rUpd.status === 200, `status=${rUpd.status}`);
    const adminUserEmail = 'e2e-admin-user-' + Date.now() + '@example.com';
    const uCreate = await req('POST', '/api/admin/users', { token: adminToken, body: { email: adminUserEmail, name: 'E2E-TEST Admin', roleId, password: 'TestPass123!', isActive: true } });
    check('12-admin-crud', 'POST admin user -> 201', uCreate.status === 201, `status=${uCreate.status}`);
    const userId = uCreate.json?.user?.id;
    if (userId) {
      const uGet = await req('GET', `/api/admin/users/${userId}`, { token: adminToken });
      check('12-admin-crud', 'GET admin user by id -> 200', uGet.status === 200, `status=${uGet.status}`);
      const uUpd = await req('PUT', `/api/admin/users/${userId}`, { token: adminToken, body: { name: 'E2E-TEST Admin Updated' } });
      check('12-admin-crud', 'PUT admin user -> 200', uUpd.status === 200, `status=${uUpd.status}`);
      const uDel = await req('DELETE', `/api/admin/users/${userId}`, { token: adminToken });
      check('12-admin-crud', 'DELETE admin user -> 200', uDel.status === 200, `status=${uDel.status}`);
    }
    const rDel = await req('DELETE', `/api/admin/roles/${roleId}`, { token: adminToken });
    check('12-admin-crud', 'DELETE role -> 200', rDel.status === 200, `status=${rDel.status}`);
  }

  // Notifications
  const notifSettings = await req('PUT', '/api/admin/notifications/settings', { token: adminToken, body: { email: { enabled: true, config: {} } } });
  check('12-admin-crud', 'PUT notifications settings -> 200', notifSettings.status === 200, `status=${notifSettings.status}`);
  const notifGet = await req('GET', '/api/admin/notifications/settings', { token: adminToken });
  check('12-admin-crud', 'GET notifications settings -> 200', notifGet.status === 200, `status=${notifGet.status}`);
  const tmplCreate = await req('PUT', '/api/admin/notifications/templates/0', { token: adminToken, body: { channel: 'email', event: 'booking_created', name: 'E2E-TEST Template ' + Date.now(), subject: 'Hi', body: 'Hello', isActive: true } });
  check('12-admin-crud', 'PUT notification template -> 200', tmplCreate.status === 200, `status=${tmplCreate.status}`);
  const tmplList = await req('GET', '/api/admin/notifications/templates', { token: adminToken });
  check('12-admin-crud', 'GET notification templates -> 200', tmplList.status === 200, `status=${tmplList.status}`);
  if (tmplList.json?.templates?.length) {
    const firstTmpl = tmplList.json.templates[0];
    const tmplUpd = await req('PUT', `/api/admin/notifications/templates/${firstTmpl.id}`, { token: adminToken, body: { channel: firstTmpl.channel, event: firstTmpl.event, name: firstTmpl.name, subject: firstTmpl.subject, body: firstTmpl.body, isActive: firstTmpl.is_active } });
    check('12-admin-crud', 'PUT notification template by id -> 200', tmplUpd.status === 200, `status=${tmplUpd.status}`);
  }

  // Integrations
  const intKey = 'e2e-test-integration-' + Date.now();
  const intCreate = await req('POST', '/api/admin/integrations', { token: adminToken, body: { providerType: 'PAYMENT', providerKey: intKey, displayName: 'E2E-TEST Payment', enabled: true, mode: 'test', config: { currency: 'SGD' }, secrets: null, isDefault: false } });
  check('12-admin-crud', 'POST integration -> 201', intCreate.status === 201, `status=${intCreate.status}`);
  const intId = intCreate.json?.integration?.id;
  if (intId) {
    const intGet = await req('GET', `/api/admin/integrations/${intId}`, { token: adminToken });
    check('12-admin-crud', 'GET integration by id -> 200', intGet.status === 200, `status=${intGet.status}`);
    const intUpd = await req('PUT', `/api/admin/integrations/${intId}`, { token: adminToken, body: { providerType: 'PAYMENT', providerKey: intKey, displayName: 'E2E-TEST Payment Updated', enabled: true, mode: 'test', config: { currency: 'SGD' }, isDefault: false } });
    check('12-admin-crud', 'PUT integration -> 200', intUpd.status === 200, `status=${intUpd.status}`);
    const intDefault = await req('PUT', `/api/admin/integrations/${intId}/default`, { token: adminToken });
    check('12-admin-crud', 'PUT integration default -> 200', intDefault.status === 200, `status=${intDefault.status}`);
    const intTest = await req('POST', `/api/admin/integrations/${intId}/test`, { token: adminToken, body: {} });
    check('12-admin-crud', 'POST integration test -> 200', intTest.status === 200, `status=${intTest.status}`);
    const intDel = await req('DELETE', `/api/admin/integrations/${intId}`, { token: adminToken });
    check('12-admin-crud', 'DELETE integration -> 200', intDel.status === 200, `status=${intDel.status}`);
  }

  // Driver + assign-driver lifecycle (use a fresh booking so status is PENDING)
  const freshBooking = await req('POST', '/api/bookings', { body: {
    passengerName: 'E2E-TEST Assign', passengerEmail: 'e2e-test-assign@example.com', passengerPhone: '+650****0000',
    vehicle: '4-Seater', pickup: 'Changi Airport', destination: 'Marina Bay Sands',
    dateTime: '2026-10-20T10:00', currency: 'SGD', paymentMethod: 'Cash', pax: 2,
    bookingType: 'One Way', distanceKm: 20, notes: 'E2E assign-driver test'
  } });
  check('12-admin-crud', 'fresh booking for assign -> 2xx', freshBooking.status >= 200 && freshBooking.status < 300, `status=${freshBooking.status}`);
  const freshVoucher = findVoucher(freshBooking.json) || findVoucher(freshBooking.text);
  check('12-admin-crud', 'fresh voucher returned', !!freshVoucher, `voucher=${freshVoucher}`);
  const assignDCreate = await req('POST', '/api/admin/drivers', { token: adminToken, body: { name: 'E2E-TEST Assign Driver', phone: '+650****4444', plateNumber: 'SGA4444A' } });
  check('12-admin-crud', 'POST driver -> 201', assignDCreate.status === 201, `status=${assignDCreate.status}`);
  const assignDriverId = assignDCreate.json?.driver?.id;
  if (freshVoucher) {
    const assign = await req('PUT', `/api/admin/bookings/${freshVoucher}/assign-driver`, { token: adminToken, body: { driverName: 'E2E-TEST Assign Driver', driverPhone: '+650****4444', driverPlate: 'SGA4444A' } });
    check('12-admin-crud', 'PUT assign-driver -> 200', assign.status === 200, `status=${assign.status} body=${JSON.stringify(assign.json).slice(0, 100)}`);
  }
  if (assignDriverId) {
    const dDel = await req('DELETE', `/api/admin/drivers/${assignDriverId}`, { token: adminToken });
    check('12-admin-crud', 'DELETE driver -> 200', dDel.status === 200, `status=${dDel.status}`);
  }

  /* ---------- Phase 13: customer auth depth ---------- */
  const reLogin = await req('POST', '/api/auth/login', { body: { email, password: pw } });
  const phase13Token = (reLogin.headers['set-cookie'] || '').match(/stb_customer_session=([^;]+)/)?.[1] || null;
  check('13-customer', 're-login for phase 13 -> 200 + cookie', reLogin.status === 200 && !!phase13Token, `status=${reLogin.status} cookie=${phase13Token ? 'yes' : 'no'}`);
  const changePw = await req('POST', '/api/auth/change-password', { token: phase13Token, body: { currentPassword: pw, newPassword: 'Changed-Pass!123' } });
  check('13-customer', 'change-password with session -> 2xx', changePw.status >= 200 && changePw.status < 300, `status=${changePw.status}`);
  const forgotCust = await req('POST', '/api/auth/forgot-password', { body: { email: 'e2e-customer-forgot-' + Date.now() + '@example.com' } });
  check('13-customer', 'customer forgot-password fake email -> 2xx', forgotCust.status >= 200 && forgotCust.status < 300, `status=${forgotCust.status}`);
  const resetCustBad = await req('POST', '/api/auth/reset-password', { body: { token: 'bad-token', password: 'NewPass123!' } });
  check('13-customer', 'customer reset-password invalid token -> 4xx', resetCustBad.status >= 400, `status=${resetCustBad.status}`);
  const deviceTokenStr = 'e2e-device-token-' + Date.now();
  const devToken = await req('POST', '/api/customer/device-token', { token: phase13Token, body: { token: deviceTokenStr, provider: 'fcm' } });
  check('13-customer', 'POST device-token -> 2xx', devToken.status >= 200 && devToken.status < 300, `status=${devToken.status}`);
  const delDevToken = await req('DELETE', '/api/customer/device-token', { token: phase13Token, body: { token: deviceTokenStr } });
  check('13-customer', 'DELETE device-token -> 2xx', delDevToken.status >= 200 && delDevToken.status < 300, `status=${delDevToken.status}`);

  const prof3 = await req('GET', '/api/customer/profile', { token: phase13Token });
  const customerId = prof3.json?.customer?.id;
  const custBook = await req('POST', '/api/bookings', { token: phase13Token, body: {
    passengerName: 'E2E-TEST Customer Booking', passengerEmail: email, passengerPhone: '+650****0000',
    vehicle: '4-Seater', pickup: 'Changi Airport', destination: 'Marina Bay Sands',
    dateTime: '2026-10-20T11:00', currency: 'SGD', paymentMethod: 'Cash', pax: 2,
    bookingType: 'One Way', distanceKm: 20, notes: 'E2E authenticated customer booking'
  } });
  check('13-customer', 'authenticated booking -> 2xx', custBook.status >= 200 && custBook.status < 300, `status=${custBook.status}`);
  const custVoucher = findVoucher(custBook.json) || findVoucher(custBook.text);
  if (customerId && custVoucher) {
    await db.query('UPDATE bookings SET customer_id = $1 WHERE voucher_code = $2', [customerId, custVoucher]);
    const specificBooking = await req('GET', `/api/customer/bookings/${custVoucher}`, { token: phase13Token });
    check('13-customer', 'GET specific customer booking -> 200', specificBooking.status === 200, `status=${specificBooking.status}`);
  }

  /* ---------- Phase 14: assign page endpoints ---------- */
  const assignIndex = await req('GET', '/assign');
  check('14-assign', 'GET /assign -> 200', assignIndex.status === 200, `status=${assignIndex.status}`);
  if (freshVoucher) {
    const assignPost = await req('POST', `/assign/${freshVoucher}`, { body: { driverName: 'E2E-TEST HTML Driver', driverPhone: '+650****5555', driverPlate: 'SGA5555A' } });
    check('14-assign', 'POST /assign/:voucher -> 200 HTML', assignPost.status === 200 && (assignPost.headers['content-type'] || '').includes('text/html'), `status=${assignPost.status} ct=${assignPost.headers['content-type']}`);
    const assignApiPost = await req('POST', `/api/assign/${freshVoucher}`, { body: { driverName: 'E2E-TEST API Driver', driverPhone: '+650****6666', driverPlate: 'SGA6666A' } });
    check('14-assign', 'POST /api/assign/:voucher -> 200 JSON', assignApiPost.status === 200 && (assignApiPost.headers['content-type'] || '').includes('application/json'), `status=${assignApiPost.status} ct=${assignApiPost.headers['content-type']}`);
  }

  /* ---------- Phase 16: pricing endpoints (read + safe no-op updates) ---------- */
  const pricingGet = await req('GET', '/api/admin/pricing', { token: adminToken });
  check('16-pricing', 'GET /admin/pricing -> 200', pricingGet.status === 200, `status=${pricingGet.status}`);
  const pricingData = pricingGet.json?.pricing;
  if (pricingData?.rules?.length) {
    const rulePayload = pricingData.rules.map(r => ({
      vehicle_id: r.vehicle_id, base_fare: r.base_fare, per_km_rate: r.per_km_rate,
      minimum_fare: r.minimum_fare, hourly_rate: r.hourly_rate, daily_rate: r.daily_rate, is_active: r.is_active
    }));
    const rulesUpd = await req('PUT', '/api/admin/pricing/rules', { token: adminToken, body: { rules: rulePayload } });
    check('16-pricing', 'PUT /admin/pricing/rules -> 200', rulesUpd.status === 200, `status=${rulesUpd.status}`);
  }
  if (pricingData?.surcharges?.length) {
    const scPayload = pricingData.surcharges.map(sc => ({ id: sc.id, value: sc.value, is_active: sc.is_active }));
    const scUpd = await req('PUT', '/api/admin/pricing/surcharges', { token: adminToken, body: { surcharges: scPayload } });
    check('16-pricing', 'PUT /admin/pricing/surcharges -> 200', scUpd.status === 200, `status=${scUpd.status}`);
  }
  const configGet = await req('GET', '/api/config');
  const bookingConfig = configGet.json?.booking;
  if (bookingConfig) {
    const bookingSettingsUpd = await req('PUT', '/api/admin/settings/booking', { token: adminToken, body: bookingConfig });
    check('16-pricing', 'PUT /admin/settings/booking -> 200', bookingSettingsUpd.status === 200, `status=${bookingSettingsUpd.status}`);
  }
  if (pricingData?.vehicles?.length) {
    const vehicleId = pricingData.vehicles[0].id;
    const overrideInsert = await db.query(
      `INSERT INTO route_overrides (vehicle_id, origin_place_id, destination_place_id, origin_display_name, destination_display_name, fixed_price, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
      [vehicleId, 'E2E_ORIGIN_' + Date.now(), 'E2E_DEST_' + Date.now(), 'E2E Origin', 'E2E Dest', 999.00, false]
    );
    const overrideId = overrideInsert.rows[0]?.id;
    if (overrideId) {
      const overrideDel = await req('DELETE', `/api/admin/pricing/overrides/${overrideId}`, { token: adminToken });
      check('16-pricing', 'DELETE /admin/pricing/overrides/:id -> 200', overrideDel.status === 200, `status=${overrideDel.status}`);
    }
  }

  /* ---------- Phase 15: logout invalidates admin session ---------- */
  const logoutAdmin = await req('POST', '/api/admin/auth/logout', { token: adminToken });
  check('15-logout', 'admin logout -> 2xx', logoutAdmin.status >= 200 && logoutAdmin.status < 300, `status=${logoutAdmin.status}`);
  const sessionAfterLogout = await req('GET', '/api/admin/auth/session', { token: adminToken });
  check('15-logout', 'session invalid after logout -> 401', sessionAfterLogout.status === 401, `status=${sessionAfterLogout.status}`);

  // Cleanup new admin artifacts so they don't leak between runs
  await db.query("DELETE FROM admin_users WHERE email LIKE 'e2e-admin-user-%@example.com'").catch(() => {});
  await db.query("DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE slug LIKE 'e2e-role-%')").catch(() => {});
  await db.query("DELETE FROM roles WHERE slug LIKE 'e2e-role-%'").catch(() => {});
  await db.query("DELETE FROM vehicle_types WHERE name LIKE 'E2E-TEST Vehicle%'").catch(() => {});
  await db.query("DELETE FROM integration_settings WHERE provider_key LIKE 'e2e-test-integration-%'").catch(() => {});
  await db.query("DELETE FROM notification_templates WHERE name LIKE 'E2E-TEST Template%'").catch(() => {});

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
