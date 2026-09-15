// Smoke test script for STB local server
import dotenv from 'dotenv';
dotenv.config();

const BASE = 'http://localhost:3003';

function extractCookies(setCookies) {
  if (!setCookies) return '';
  const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
  return arr.map(c => c.split(';')[0]).filter(Boolean).join('; ');
}

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  const cookies = typeof res.headers.getSetCookie === 'function'
    ? extractCookies(res.headers.getSetCookie())
    : extractCookies(res.headers.get('set-cookie'));
  return { status: res.status, json, text, cookies };
}

let adminCookie = '';
let customerToken = '';
const results = [];

function push(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@example.com';

  // health
  const health = await req('/api/health');
  push('Health', health.status === 200 && health.json?.status === 'ok', `status ${health.status}`);

  // admin setup: first time 200, already set 400
  const setup = await req('/api/admin/auth/setup', {
    method: 'POST',
    body: { email: adminEmail, password: 'AdminPass123!' }
  });
  const setupOk = setup.status === 200 || (setup.status === 400 && /already set/i.test(setup.json?.error || setup.text));
  push('Admin setup', setupOk, `status ${setup.status}`);

  // admin login
  const login = await req('/api/admin/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: 'AdminPass123!' }
  });
  adminCookie = login.cookies;
  push('Admin login', login.status === 200 && login.json?.success, `status ${login.status}, cookie=${Boolean(adminCookie)}`);

  // admin session
  const sess = await req('/api/admin/auth/session', { headers: adminCookie ? { Cookie: adminCookie } : {} });
  push('Admin session', sess.status === 200 && sess.json?.admin?.roleSlug, `role=${sess.json?.admin?.roleSlug}`);

  // admin dashboard
  const dash = await req('/api/admin/dashboard', { headers: adminCookie ? { Cookie: adminCookie } : {} });
  push('Admin dashboard', dash.status === 200 && typeof dash.json?.counts?.today === 'number', `status ${dash.status}`);

  // roles
  const roles = await req('/api/admin/roles', { headers: adminCookie ? { Cookie: adminCookie } : {} });
  push('Admin roles', roles.status === 200 && Array.isArray(roles.json?.roles), `count=${roles.json?.roles?.length}`);

  // vehicles
  const vehicles = await req('/api/admin/vehicles', { headers: adminCookie ? { Cookie: adminCookie } : {} });
  push('Admin vehicles', vehicles.status === 200 && Array.isArray(vehicles.json?.vehicles), `count=${vehicles.json?.vehicles?.length}`);

  // drivers
  const drivers = await req('/api/admin/drivers', { headers: adminCookie ? { Cookie: adminCookie } : {} });
  push('Admin drivers', drivers.status === 200 && Array.isArray(drivers.json?.drivers), `count=${drivers.json?.drivers?.length}`);

  // settings
  const settings = await req('/api/admin/settings', { headers: adminCookie ? { Cookie: adminCookie } : {} });
  push('Admin settings', settings.status === 200 && typeof settings.json?.settings === 'object', `status ${settings.status}`);

  // public config
  const pub = await req('/api/config');
  push('Public config', pub.status === 200 && pub.json?.brand?.name, `brand=${pub.json?.brand?.name}`);

  // customer register
  const ts = Date.now();
  const reg = await req('/api/auth/register', {
    method: 'POST',
    body: { name: 'Test User', email: `smoke${ts}@example.com`, phone: '+6590000001', password: 'TestPass123' }
  });
  customerToken = reg.cookies || '';
  push('Customer register', reg.status === 200 && reg.json?.success, `status ${reg.status}`);

  // customer login
  const cl = await req('/api/auth/login', {
    method: 'POST',
    body: { email: `smoke${ts}@example.com`, password: 'TestPass123' }
  });
  if (cl.cookies) customerToken = cl.cookies;
  push('Customer login', cl.status === 200 && cl.json?.success, `status ${cl.status}`);

  // customer profile without auth should fail
  const profNoAuth = await req('/api/customer/profile');
  push('Customer profile 401', profNoAuth.status === 401, `status ${profNoAuth.status}`);

  // customer profile with auth
  const prof = await req('/api/customer/profile', { headers: customerToken ? { Cookie: customerToken } : {} });
  push('Customer profile authed', prof.status === 200 && prof.json?.customer?.email, `status ${prof.status}`);

  // customer bookings
  const cb = await req('/api/customer/bookings', { headers: customerToken ? { Cookie: customerToken } : {} });
  push('Customer bookings', cb.status === 200 && Array.isArray(cb.json?.bookings), `count=${cb.json?.bookings?.length}`);

  // audit logs
  const audit = await req('/api/admin/audit-logs', { headers: adminCookie ? { Cookie: adminCookie } : {} });
  push('Audit logs', audit.status === 200 && Array.isArray(audit.json?.logs), `count=${audit.json?.logs?.length}`);

  console.log('\n--- Summary ---');
  const passed = results.filter(r => r.ok).length;
  console.log(`${passed}/${results.length} passed`);
  process.exit(results.some(r => !r.ok) ? 1 : 0);
}

main().catch(err => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
