// STB Singapore — Admin SPA (modular, permission-aware)
const _isProdHost = !/(\.localhost|localhost|^127\.|^10\.|^192\.|^0\.0\.0\.0)/i.test(window.location.hostname);
const API_ORIGIN = _isProdHost && window.location.hostname.startsWith('admin.')
  ? `${window.location.protocol}//api.${window.location.hostname.replace(/^admin\./, '')}`
  : ''; // local dev → same origin (cookies work, CSP allows 'self')
const API = `${API_ORIGIN}/api/admin`;
const PUBLIC_API = `${API_ORIGIN}/api`;

let currentAdmin = null;
let permissions = new Set();
let currentView = 'dashboard';
let googleMapsApiKey = '';

// Utility helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const escapeHtml = (str) => String(str).replace(/\u0026/g, '&amp;').replace(/\u003c/g, '&lt;').replace(/\u003e/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => Number(n || 0).toFixed(2);

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : (path.startsWith('/api') ? `${API_ORIGIN}${path}` : `${API}${path}`);
  const res = await fetch(url, {
    credentials: API_ORIGIN ? 'include' : 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = data?.error || `Request failed (${res.status})`;
    if (res.status === 401 && !path.includes('/auth/')) {
      renderAuth();
    } else {
      showToast(err, 'error');
    }
    throw new Error(err);
  }
  return data;
}

function hasPerm(key) {
  if (currentAdmin?.roleSlug === 'SUPER_ADMIN' || permissions.has('*')) return true;
  if (permissions.has(key)) return true;
  if (key.includes('.')) {
    const [module] = key.split('.');
    if (permissions.has(`${module}.*`)) return true;
  }
  return false;
}

function canSee(module) {
  const map = {
    dashboard: 'dashboard.view', bookings: 'bookings.view', customers: 'customers.view',
    vehicles: 'vehicles.view', pricing: 'pricing.view', drivers: 'drivers.view',
    notifications: 'notifications.view', payments: 'payments.view', integrations: 'integrations.view',
    settings: 'settings.view', users: 'users.view', audit: 'audit_logs.view'
  };
  return hasPerm(map[module] || `${module}.view`);
}

function requirePerm(key) {
  if (!hasPerm(key)) {
    showToast('You do not have permission for this action.', 'error');
    throw new Error('Forbidden');
  }
}

// (initAuth removed — boot() handles session check directly)

function renderAuth() {
  const root = $('#root');
  root.innerHTML = `
    <div class="auth-overlay">
      <div class="auth-modal">
        <img src="/stb-logo.png" alt="STB" class="auth-logo">
        <h1 class="auth-title">STB Admin</h1>
        <p class="auth-subtitle" id="auth-desc">Sign in with your admin email and password.</p>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" id="login-email" class="form-input" required autofocus placeholder="admin@example.com">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="login-password" class="form-input" required placeholder="••••••••">
          </div>
          <button type="submit" class="btn-primary" style="width:100%;margin-top:8px;">Sign In</button>
          <p style="margin-top:14px;font-size:0.8rem;">
            <a href="#" id="forgot-link">Forgot password?</a>
            <span id="setup-hint" style="display:none;"> · <a href="#" id="setup-link">First-time setup</a></span>
          </p>
        </form>
      </div>
    </div>`;

  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (data.requiresOtp) {
        renderOtp(email);
        return;
      }
      currentAdmin = data.admin;
      await loadPermissions();
      renderApp();
    } catch (err) {
      // error shown by api
    }
  });

  $('#forgot-link').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    if (!email) return showToast('Enter your email first', 'error');
    try {
      await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      showToast('If an account exists, a reset link has been sent.', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function renderOtp(email) {
  $('#auth-desc').textContent = `Enter the 6-digit verification code sent to ${email}.`;
  $('#login-form').innerHTML = `
    <div class="form-group">
      <label class="form-label">Verification Code</label>
      <input type="text" id="otp-input" class="form-input" inputmode="numeric" maxlength="6" placeholder="000000" required>
    </div>
    <button type="submit" class="btn-primary" style="width:100%;margin-top:8px;">Verify</button>`;
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp: $('#otp-input').value.trim() }) });
      currentAdmin = data.admin;
      await loadPermissions();
      renderApp();
    } catch (err) { showToast(err.message, 'error'); }
  });
}

async function loadPermissions() {
  try {
    const session = await api('/auth/session');
    permissions = new Set(session.isSuper ? ['*'] : (session.permissions || []));
    currentAdmin = session.admin;
  } catch (e) {
    permissions = new Set();
  }
}

// Layout
function renderApp() {
  const root = $('#root');
  root.innerHTML = `
    <div class="admin-app">
      <!-- Top navigation bar (always visible) -->
      <header class="admin-topbar">
        <div class="topbar-left">
          <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">
            <span class="material-symbols-outlined">menu</span>
          </button>
          <a href="/" class="topbar-brand">
            <img src="/stb-logo.png" alt="STB">
            <span>STB Admin</span>
          </a>
        </div>
        <div class="topbar-right">
          <div class="topbar-user">
            <div class="topbar-user-info">
              <div class="topbar-user-name">${escapeHtml(currentAdmin?.name || currentAdmin?.email || '')}</div>
              <div class="topbar-user-role">${escapeHtml(currentAdmin?.roleSlug || '')}</div>
            </div>
            <div class="topbar-avatar">${escapeHtml((currentAdmin?.name || currentAdmin?.email || '?').charAt(0).toUpperCase())}</div>
          </div>
          <button id="btn-logout" class="btn-logout" title="Sign out">
            <span class="material-symbols-outlined">logout</span>
            <span class="btn-logout-label">Sign Out</span>
          </button>
        </div>
      </header>

      <!-- Side navigation (drawer on mobile, fixed on desktop) -->
      <aside class="admin-sidebar" id="sidebar">
        <nav class="sidebar-nav" id="sidebar-nav"></nav>
      </aside>

      <!-- Backdrop for mobile drawer -->
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>

      <main class="admin-main" id="main">
        <div class="admin-header-bar">
          <h1 id="page-title">Dashboard</h1>
        </div>
        <div id="page-content"></div>
      </main>
    </div>`;

  renderNav();

  // Sign out
  $('#btn-logout').addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST' });
    location.reload();
  });

  // Hamburger toggle (open drawer)
  $('#mobile-menu-btn').addEventListener('click', openSidebar);
  $('#sidebar-backdrop').addEventListener('click', closeSidebar);

  // Auto-close drawer on Escape key (a11y)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  navigate('dashboard');
}

function openSidebar() {
  $('#sidebar').classList.add('open');
  $('#sidebar-backdrop').classList.add('open');
}

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-backdrop').classList.remove('open');
}

function renderNav() {
  const items = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', perm: 'dashboard.view' },
    { id: 'bookings', icon: 'calendar_month', label: 'Bookings', perm: 'bookings.view' },
    { id: 'customers', icon: 'group', label: 'Customers', perm: 'customers.view' },
    { id: 'vehicles', icon: 'local_taxi', label: 'Vehicles', perm: 'vehicles.view' },
    { id: 'pricing', icon: 'payments', label: 'Pricing', perm: 'pricing.view' },
    { id: 'drivers', icon: 'person_pin', label: 'Drivers / Partners', perm: 'drivers.view' },
    { id: 'content', icon: 'edit_note', label: 'Content', perm: 'settings.view' },
    { id: 'notifications', icon: 'notifications', label: 'Notifications', perm: 'notifications.view' },
    { id: 'payments', icon: 'credit_card', label: 'Payments', perm: 'payments.view' },
    { id: 'integrations', icon: 'settings_input_component', label: 'Integrations', perm: 'integrations.view' },
    { id: 'settings', icon: 'settings', label: 'Settings', perm: 'settings.view' },
    { id: 'users', icon: 'admin_panel_settings', label: 'Users & Roles', perm: 'users.view' },
    { id: 'audit', icon: 'history', label: 'Audit Logs', perm: 'audit_logs.view' }
  ];

  $('#sidebar-nav').innerHTML = items
    .filter(i => hasPerm(i.perm))
    .map(i => `
      <button class="nav-item ${i.id === currentView ? 'active' : ''}" data-view="${i.id}">
        <span class="material-symbols-outlined">${i.icon}</span>
        <span class="nav-label">${i.label}</span>
      </button>`).join('');

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.view);
      closeSidebar(); // auto-close drawer on mobile/tablet after navigation
    });
  });
}

async function navigate(view) {
  currentView = view;
  renderNav();
  const title = $('#page-title');
  const content = $('#page-content');
  title.textContent = view.charAt(0).toUpperCase() + view.slice(1);
  content.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">hourglass_empty</span><p>Loading...</p></div>';
  try {
    if (view === 'dashboard') await renderDashboard();
    else if (view === 'bookings') await renderBookings();
    else if (view === 'customers') await renderCustomers();
    else if (view === 'vehicles') await renderVehicles();
    else if (view === 'pricing') await renderPricing();
    else if (view === 'drivers') await renderDrivers();
    else if (view === 'content') await renderContent();
    else if (view === 'notifications') await renderNotifications();
    else if (view === 'payments') await renderPayments();
    else if (view === 'integrations') await renderIntegrations();
    else if (view === 'settings') await renderSettings();
    else if (view === 'users') await renderUsers();
    else if (view === 'audit') await renderAudit();
    else content.innerHTML = '<div class="empty-state"><p>Page not found.</p></div>';
  } catch (err) {
    console.error(`[navigate:${view}]`, err);
    content.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Failed to load ${view}: ${escapeHtml(err.message || 'unknown error')}</p></div>`;
  }
}

// Dashboard
async function renderDashboard() {
  const data = await api('/dashboard');
  $('#page-title').textContent = 'Dashboard';
  const c = data.counts;
  $('#page-content').innerHTML = `
    <div class="stats-grid">
      ${statCard('Today', c.today, 'primary')}
      ${statCard('Pending', c.pending)}
      ${statCard('Confirmed', c.confirmed)}
      ${statCard('Assigned', c.assigned)}
      ${statCard('Active Trips', c.active, 'success')}
      ${statCard('Completed', c.completed)}
      ${statCard('Cancelled', c.cancelled)}
      ${statCard('Unassigned', c.unassigned)}
    </div>
    <div class="admin-card">
      <div class="card-header"><div><div class="card-title">Recent Bookings</div><div class="card-sub">Last few inquiries across the platform.</div></div></div>
      <div class="table-responsive">${bookingsTable(data.recent)}</div>
    </div>`;
}

function statCard(label, value, variant = '') {
  return `<div class="stat-card ${variant}">
    <div class="stat-label">${label}</div>
    <div class="stat-value">${Number(value || 0)}</div>
  </div>`;
}

function bookingsTable(bookings) {
  if (!bookings?.length) return '<p class="empty-state">No bookings yet.</p>';
  return `<table class="admin-table">
    <thead><tr><th>Ref</th><th>Passenger</th><th>Pickup</th><th>Vehicle</th><th>Status</th><th>Date/Time</th></tr></thead>
    <tbody>${bookings.map(b => `<tr>
      <td><strong>${escapeHtml(b.voucherCode)}</strong></td>
      <td>${escapeHtml(b.passengerName)}</td>
      <td>${escapeHtml(b.pickup)}${b.destination ? ` → ${escapeHtml(b.destination)}` : ''}</td>
      <td>${escapeHtml(b.vehicle)}</td>
      <td>${statusBadge(b.status || 'PENDING')}</td>
      <td>${b.dateTime ? new Date(b.dateTime).toLocaleString() : '-'}</td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function statusBadge(status) {
  const map = {
    PENDING: 'badge-pending', CONFIRMED: 'badge-confirmed', ASSIGNED: 'badge-assigned',
    DRIVER_EN_ROUTE: 'badge-active', ARRIVED: 'badge-active', IN_PROGRESS: 'badge-active',
    COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled', NO_SHOW: 'badge-cancelled'
  };
  return `<span class="badge ${map[status] || 'badge-pending'}">${status.replace(/_/g, ' ')}</span>`;
}

function showDriverAssignModal(voucher, drivers) {
  const existing = (drivers || []).find(d => d.is_active);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:440px;">
      <div class="modal-header">
        <h3>Assign Driver</h3>
        <button class="btn-ghost btn-sm modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="margin:0 0 16px;font-size:0.85rem;color:#6B6B6B;">Booking: <strong>${escapeHtml(voucher)}</strong></p>
        <div class="form-group">
          <label class="form-label">Select Active Driver</label>
          <select id="dam-driver" class="form-select">
            <option value="">— Enter manually —</option>
            ${(drivers || []).filter(d => d.is_active).map(d =>
              `<option value="${escapeHtml(d.name)}|||${escapeHtml(d.phone || '')}|||${escapeHtml(d.plate_number || '')}">${escapeHtml(d.name)} ${d.phone ? `(${escapeHtml(d.phone)})` : ''}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Driver Name</label>
          <input type="text" id="dam-name" class="form-input" placeholder="e.g. Chandran Raj" value="${escapeHtml(existing?.name || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Driver Phone</label>
          <input type="tel" id="dam-phone" class="form-input" placeholder="+65 9123 4567" value="${escapeHtml(existing?.phone || '')}">
        </div>
        <div class="form-group">
          <label class="form-label">Vehicle Plate</label>
          <input type="text" id="dam-plate" class="form-input" placeholder="SGX 1234 A" style="text-transform:uppercase;" value="${escapeHtml(existing?.plate_number || '')}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary modal-close">Cancel</button>
        <button class="btn-primary" id="dam-submit">Assign Driver</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  $('#dam-driver').addEventListener('change', () => {
    const parts = $('#dam-driver').value.split('|||');
    if (parts.length >= 2) {
      $('#dam-name').value = parts[0];
      $('#dam-phone').value = parts[1];
      if (parts[2]) $('#dam-plate').value = parts[2];
    }
  });

  $$('.modal-close', overlay).forEach(btn => btn.addEventListener('click', () => overlay.remove()));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  $('#dam-submit').addEventListener('click', async () => {
    const driverName = $('#dam-name').value.trim();
    const driverPhone = $('#dam-phone').value.trim();
    const driverPlate = $('#dam-plate').value.trim().toUpperCase();
    if (!driverName) { showToast('Driver name is required.', 'error'); return; }
    try {
      await api(`/bookings/${voucher}/assign-driver`, {
        method: 'PUT',
        body: JSON.stringify({ driverName, driverPhone, driverPlate })
      });
      showToast('Driver assigned', 'success');
      overlay.remove();
      navigate('bookings');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// Bookings
async function renderBookings() {
  const { bookings = [] } = await api('/bookings');
  const drivers = hasPerm('drivers.view') ? (await api('/drivers').catch(() => ({ drivers: [] }))).drivers || [] : [];
  $('#page-title').textContent = 'Bookings';
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <div><div class="card-title">All Bookings</div><div class="card-sub">Manage status, assign drivers, view history.</div></div>
      </div>
      <div class="table-responsive">${bookingsTableFull(bookings, drivers)}</div>
    </div>`;

  if (hasPerm('bookings.update_status') || hasPerm('bookings.assign_driver')) {
    $$('.btn-booking-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const voucher = btn.closest('tr').dataset.voucher;
        const status = btn.value;
        try {
          await api(`/bookings/${voucher}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
          showToast(`Status updated to ${status}`, 'success');
          navigate('bookings');
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    $$('.btn-assign-driver').forEach(btn => {
      btn.addEventListener('click', async () => {
        const voucher = btn.closest('tr').dataset.voucher;
        const allDrivers = drivers || [];
        showDriverAssignModal(voucher, allDrivers);
      });
    });
  }
}

function bookingsTableFull(bookings, drivers) {
  if (!bookings?.length) return '<p class="empty-state">No bookings yet.</p>';
  const canStatus = hasPerm('bookings.update_status');
  const canAssign = hasPerm('bookings.assign_driver');
  const STATUSES = ['PENDING','CONFIRMED','ASSIGNED','DRIVER_EN_ROUTE','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'];
  return `<table class="admin-table">
    <thead><tr><th>Ref</th><th>Passenger</th><th>Pickup</th><th>Vehicle</th><th>Status</th><th>Date/Time</th>${canStatus || canAssign ? '<th>Actions</th>' : ''}</tr></thead>
    <tbody>${bookings.map(b => `<tr data-voucher="${escapeHtml(b.voucherCode)}">
      <td><strong>${escapeHtml(b.voucherCode)}</strong></td>
      <td>${escapeHtml(b.passengerName)}</td>
      <td>${escapeHtml(b.pickup)}${b.destination ? ` → ${escapeHtml(b.destination)}` : ''}</td>
      <td>${escapeHtml(b.vehicle)}</td>
      <td>${statusBadge(b.status || 'PENDING')}</td>
      <td>${b.dateTime ? new Date(b.dateTime).toLocaleString() : '-'}</td>
      ${canStatus || canAssign ? `<td style="white-space:nowrap;">
        ${canStatus ? `<select class="form-select btn-booking-status" style="width:auto;display:inline-block;font-size:0.78rem;" value="${escapeHtml(b.status || 'PENDING')}">${STATUSES.map(s => `<option value="${s}" ${b.status === s ? 'selected' : ''}>${s.replace(/_/g,' ')}</option>`).join('')}</select>` : ''}
        ${canAssign ? `<button class="btn-ghost btn-sm btn-assign-driver" style="margin-left:4px;">Assign Driver</button>` : ''}
      </td>` : ''}
    </tr>`).join('')}</tbody>
  </table>`;
}

// Customers
async function renderCustomers() {
  $('#page-title').textContent = 'Customers';
  $('#page-content').innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">hourglass_empty</span><p>Loading customers...</p></div>';
  try {
    const { customers = [] } = await api('/customers');
    $('#page-content').innerHTML = `
      <div class="admin-card">
        <div class="card-header">
          <div><div class="card-title">Registered Customers</div><div class="card-sub">${customers.length} customer account${customers.length !== 1 ? 's' : ''} registered.</div></div>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Active</th><th>Joined</th></tr></thead>
            <tbody>${customers.map(c => `<tr>
              <td><strong>${escapeHtml(c.name || '-')}</strong></td>
              <td>${escapeHtml(c.email)}</td>
              <td>${escapeHtml(c.phone || '-')}</td>
              <td>${Number(c.booking_count || 0)}</td>
              <td>${c.is_active ? '<span class="badge badge-confirmed">Active</span>' : '<span class="badge badge-cancelled">Inactive</span>'}</td>
              <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    $('#page-content').innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">person_off</span><p>Could not load customers: ${escapeHtml(err.message)}</p></div>`;
  }
}

// Vehicles
async function renderVehicles() {
  const { vehicles = [] } = await api('/vehicles');
  const canManage = hasPerm('vehicles.manage');
  $('#page-title').textContent = 'Vehicles';
  $('#page-content').innerHTML = `
    ${canManage ? `
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Add Vehicle Category</div></div>
      <form id="vehicle-form" class="form-grid">
        <div class="form-group"><label class="form-label">Name *</label><input type="text" id="v-name" class="form-input" required placeholder="e.g. Mercedes V-Class MPV"></div>
        <div class="form-group"><label class="form-label">Slug (URL id)</label><input type="text" id="v-slug" class="form-input" placeholder="auto from name"></div>
        <div class="form-group"><label class="form-label">Full Display Name</label><input type="text" id="v-full-name" class="form-input" placeholder="e.g. Mercedes-Benz V-Class Executive MPV"></div>
        <div class="form-group"><label class="form-label">Category</label>
          <select id="v-category" class="form-select">
            <option value="sedan">Sedan</option>
            <option value="mpv">MPV</option>
            <option value="luxury">Luxury</option>
            <option value="van">Van</option>
            <option value="bus">Bus</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Tag (small badge)</label><input type="text" id="v-tag" class="form-input" placeholder="e.g. Most Popular"></div>
        <div class="form-group"><label class="form-label">Tag Style</label>
          <select id="v-tag-style" class="form-select">
            <option value="gold">Gold</option>
            <option value="red">Red</option>
            <option value="green">Green</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Max Pax</label><input type="number" id="v-pax" class="form-input" value="4"></div>
        <div class="form-group"><label class="form-label">Luggage</label><input type="number" id="v-luggage" class="form-input" value="2"></div>
        <div class="form-group"><label class="form-label">Base Fare (SGD)</label><input type="number" step="0.5" id="v-base" class="form-input" value="40"></div>
        <div class="form-group"><label class="form-label">Per KM (SGD)</label><input type="number" step="0.1" id="v-km" class="form-input" value="2.2"></div>
        <div class="form-group"><label class="form-label">Min Fare (SGD)</label><input type="number" step="0.5" id="v-min" class="form-input" value="55"></div>
        <div class="form-group"><label class="form-label">Hourly Rate (SGD)</label><input type="number" step="1" id="v-hourly" class="form-input" value="60"></div>
        <div class="form-group"><label class="form-label">Sort Order</label><input type="number" id="v-sort" class="form-input" value="0"></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Image URL</label><input type="url" id="v-image" class="form-input" placeholder="https://..."></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Fallback Image URL</label><input type="url" id="v-fallback" class="form-input" placeholder="https://..."></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Description</label><textarea id="v-desc" class="form-textarea" rows="2" placeholder="Short customer-facing description..."></textarea></div>
        <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Features (one per line)</label><textarea id="v-features" class="form-textarea" rows="4" placeholder="Nappa Leather&#10;Burmester Sound&#10;Free WiFi"></textarea></div>
      </form>
      <div class="form-actions"><button class="btn-primary" id="btn-add-vehicle">Add Vehicle</button></div>
    </div>` : ''}
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Fleet (${vehicles.length} ${vehicles.length===1?'vehicle':'vehicles'})</div><div class="card-sub">Click <strong>Edit</strong> on any row to update image, features, fares.</div></div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Vehicle</th><th>Category</th><th>Pax</th><th>Base S$</th><th>Per km S$</th><th>Hourly S$</th><th>Order</th><th>Active</th>${canManage ? '<th>Actions</th>' : ''}</tr></thead>
          <tbody>${vehicles.map(v => `<tr data-id="${v.id}">
            <td>
              <strong>${escapeHtml(v.name)}</strong>
              ${v.tag ? `<span class="badge badge-confirmed" style="margin-left:6px;">${escapeHtml(v.tag)}</span>` : ''}
              <div class="muted-note">${escapeHtml(v.full_name || v.slug || '')}</div>
            </td>
            <td>${escapeHtml(v.category || '-')}</td>
            <td>${v.pax ?? v.pax_max ?? 0}</td>
            <td>${Number(v.base_fare_sgd||0).toFixed(2)}</td>
            <td>${Number(v.per_km_sgd||0).toFixed(2)}</td>
            <td>${Number(v.hourly_sgd||0).toFixed(2)}</td>
            <td>${v.display_order ?? v.sort_order ?? 0}</td>
            <td>${v.is_active ? '<span class="badge badge-confirmed">Yes</span>' : '<span class="badge badge-cancelled">No</span>'}</td>
            ${canManage ? `<td style="white-space:nowrap;">
              <button class="btn-ghost btn-sm btn-edit-vehicle">Edit</button>
              <button class="btn-danger btn-sm btn-toggle-vehicle">${v.is_active ? 'Deactivate' : 'Activate'}</button>
            </td>` : ''}
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  if (!canManage) return;

  $('#btn-add-vehicle').addEventListener('click', async () => {
    const body = {
      name: $('#v-name').value.trim(),
      slug: $('#v-slug').value.trim() || null,
      full_name: $('#v-full-name').value.trim() || null,
      category: $('#v-category').value,
      tag: $('#v-tag').value.trim() || null,
      tag_style: $('#v-tag-style').value,
      pax: Number($('#v-pax').value || 4),
      luggage: Number($('#v-luggage').value || 2),
      description: $('#v-desc').value.trim() || null,
      paxMax: Number($('#v-pax').value || 4),
      luggageCapacity: Number($('#v-luggage').value || 2),
      imageUrl: $('#v-image').value.trim() || null,
      sortOrder: Number($('#v-sort').value || 0)
    };
    try {
      const { vehicle } = await api('/vehicles', { method: 'POST', body: JSON.stringify(body) });
      // Then patch extended fields (fares, features, image fallback)
      const features = $('#v-features').value.split('\n').map(s => s.trim()).filter(Boolean);
      const extended = {
        base_fare_sgd: Number($('#v-base').value || 0),
        per_km_sgd: Number($('#v-km').value || 0),
        min_fare_sgd: Number($('#v-min').value || 0),
        hourly_sgd: Number($('#v-hourly').value || 0),
        fallback_image_url: $('#v-fallback').value.trim() || null,
        features_json: features
      };
      await api(`/vehicles/${vehicle.id}/extended`, { method: 'PUT', body: JSON.stringify(extended) });
      showToast('Vehicle added', 'success');
      navigate('vehicles');
    } catch (err) { showToast(err.message, 'error'); }
  });

  $$('.btn-edit-vehicle').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.closest('tr').dataset.id;
    const v = vehicles.find(x => String(x.id) === id);
    if (v) openVehicleModal(v);
  }));

  $$('.btn-toggle-vehicle').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.closest('tr').dataset.id;
    const isActive = btn.textContent.trim() === 'Activate';
    try {
      await api(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) });
      showToast(isActive ? 'Vehicle activated' : 'Vehicle deactivated', 'success');
      navigate('vehicles');
    } catch (err) { showToast(err.message, 'error'); }
  }));
}

function openVehicleModal(v) {
  const features = Array.isArray(v.features_json)
    ? v.features_json
    : (typeof v.features_json === 'string' ? JSON.parse(v.features_json) : []);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:760px;">
      <div class="modal-header">
        <div class="modal-title">Edit ${escapeHtml(v.name)}</div>
        <button class="btn-ghost" type="button" data-modal-close>✕</button>
      </div>
      <form id="veh-form">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Name</label><input type="text" id="ev-name" class="form-input" value="${escapeHtml(v.name||'')}" required></div>
          <div class="form-group"><label class="form-label">Slug</label><input type="text" id="ev-slug" class="form-input" value="${escapeHtml(v.slug||'')}"></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Full Name</label><input type="text" id="ev-full-name" class="form-input" value="${escapeHtml(v.full_name||'')}"></div>
          <div class="form-group"><label class="form-label">Category</label>
            <select id="ev-category" class="form-select">
              ${['sedan','mpv','luxury','van','bus'].map(c => `<option value="${c}" ${v.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Tag</label><input type="text" id="ev-tag" class="form-input" value="${escapeHtml(v.tag||'')}"></div>
          <div class="form-group"><label class="form-label">Tag Style</label>
            <select id="ev-tag-style" class="form-select">
              ${['gold','red','green'].map(s => `<option value="${s}" ${v.tag_style===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Pax</label><input type="number" id="ev-pax" class="form-input" value="${v.pax ?? v.pax_max ?? 4}"></div>
          <div class="form-group"><label class="form-label">Luggage</label><input type="number" id="ev-luggage" class="form-input" value="${v.luggage ?? v.luggage_capacity ?? 2}"></div>
          <div class="form-group"><label class="form-label">Base Fare S$</label><input type="number" step="0.5" id="ev-base" class="form-input" value="${Number(v.base_fare_sgd||0)}"></div>
          <div class="form-group"><label class="form-label">Per KM S$</label><input type="number" step="0.1" id="ev-km" class="form-input" value="${Number(v.per_km_sgd||0)}"></div>
          <div class="form-group"><label class="form-label">Min Fare S$</label><input type="number" step="0.5" id="ev-min" class="form-input" value="${Number(v.min_fare_sgd||0)}"></div>
          <div class="form-group"><label class="form-label">Hourly S$</label><input type="number" step="1" id="ev-hourly" class="form-input" value="${Number(v.hourly_sgd||0)}"></div>
          <div class="form-group"><label class="form-label">Sort Order</label><input type="number" id="ev-order" class="form-input" value="${v.display_order ?? v.sort_order ?? 0}"></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Image URL</label><input type="url" id="ev-image" class="form-input" value="${escapeHtml(v.image_url||'')}"></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Fallback Image URL</label><input type="url" id="ev-fallback" class="form-input" value="${escapeHtml(v.fallback_image_url||'')}"></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Description</label><textarea id="ev-desc" class="form-textarea" rows="3">${escapeHtml(v.description||'')}</textarea></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Features (one per line)</label><textarea id="ev-features" class="form-textarea" rows="5">${escapeHtml(features.join('\n'))}</textarea></div>
          <div class="form-group"><label class="form-label">Image Preview</label><img id="ev-preview" src="${escapeHtml(v.image_url||'')}" alt="" style="max-width:180px;max-height:120px;border-radius:8px;${v.image_url?'':'display:none;'}"></div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Save Changes</button>
          <button type="button" class="btn-secondary" data-modal-close>Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay || e.target.hasAttribute('data-modal-close')) overlay.remove(); });

  // Live preview
  const imgInput = $('#ev-image', overlay);
  const preview = $('#ev-preview', overlay);
  imgInput.addEventListener('input', () => {
    if (imgInput.value) { preview.src = imgInput.value; preview.style.display = ''; }
    else { preview.style.display = 'none'; }
  });

  $('#veh-form', overlay).addEventListener('submit', async (e) => {
    e.preventDefault();
    const baseBody = {
      name: $('#ev-name').value.trim(),
      slug: $('#ev-slug').value.trim() || null,
      full_name: $('#ev-full-name').value.trim() || null,
      category: $('#ev-category').value,
      tag: $('#ev-tag').value.trim() || null,
      tag_style: $('#ev-tag-style').value,
      pax: Number($('#ev-pax').value || 4),
      luggage: Number($('#ev-luggage').value || 2),
      paxMax: Number($('#ev-pax').value || 4),
      luggageCapacity: Number($('#ev-luggage').value || 2),
      sortOrder: Number($('#ev-order').value || 0),
      imageUrl: $('#ev-image').value.trim() || null,
      description: $('#ev-desc').value.trim() || null
    };
    const features = $('#ev-features').value.split('\n').map(s => s.trim()).filter(Boolean);
    const extBody = {
      base_fare_sgd: Number($('#ev-base').value || 0),
      per_km_sgd: Number($('#ev-km').value || 0),
      min_fare_sgd: Number($('#ev-min').value || 0),
      hourly_sgd: Number($('#ev-hourly').value || 0),
      fallback_image_url: $('#ev-fallback').value.trim() || null,
      features_json: features
    };
    try {
      await api(`/vehicles/${v.id}`, { method: 'PUT', body: JSON.stringify(baseBody) });
      await api(`/vehicles/${v.id}/extended`, { method: 'PUT', body: JSON.stringify(extBody) });
      overlay.remove();
      showToast('Vehicle updated', 'success');
      navigate('vehicles');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// Pricing
async function renderPricing() {
  $('#page-title').textContent = 'Pricing';
  $('#page-content').innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">hourglass_empty</span><p>Loading pricing...</p></div>';
  try {
    const { pricing } = await api('/pricing');
    const { vehicles = [], rules = [], overrides = [], surcharges = [] } = pricing || {};
    const canManage = hasPerm('pricing.manage');

    $('#page-content').innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        ${['distance','charter','overrides','surcharges'].map((t,i) => `<button class="${i===0?'btn-primary':'btn-secondary'} btn-sm pricing-tab" data-tab="${t}">${{distance:'Distance Rules',charter:'Charter Rates',overrides:'Route Overrides',surcharges:'Surcharges'}[t]}</button>`).join('')}
      </div>

      <!-- Distance Rules -->
      <div id="ptab-distance" class="admin-card">
        <div class="card-header"><div><div class="card-title">One-Way Distance Pricing Rules</div><div class="card-sub">Base fare, per-km rate, and minimum fare for point-to-point transfers.</div></div>${canManage ? '<button id="btn-save-rules" class="btn-primary">Save Rules</button>' : ''}</div>
        <div class="table-responsive"><table class="admin-table">
          <thead><tr><th>Vehicle</th><th>Base Fare (SGD)</th><th>Per KM (SGD)</th><th>Min Fare (SGD)</th><th>Active</th></tr></thead>
          <tbody>${rules.map(r => `<tr data-vid="${r.vehicle_id}">
            <td><strong>${escapeHtml(r.vehicle_name)}</strong></td>
            <td>${canManage ? `<input type="number" step="0.5" class="form-input r-base" value="${money(r.base_fare)}" style="width:90px;">` : `S$${money(r.base_fare)}`}</td>
            <td>${canManage ? `<input type="number" step="0.1" class="form-input r-km" value="${money(r.per_km_rate)}" style="width:90px;">` : `S$${money(r.per_km_rate)}`}</td>
            <td>${canManage ? `<input type="number" step="0.5" class="form-input r-min" value="${money(r.minimum_fare)}" style="width:90px;">` : `S$${money(r.minimum_fare)}`}</td>
            <td>${r.is_active ? '<span class="badge badge-confirmed">Yes</span>' : '<span class="badge badge-cancelled">No</span>'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>

      <!-- Charter Rates -->
      <div id="ptab-charter" class="admin-card" style="display:none;">
        <div class="card-header"><div><div class="card-title">Hourly & Daily Charter Rates</div><div class="card-sub">Dedicated chauffeur and full-day rates.</div></div>${canManage ? '<button id="btn-save-charter" class="btn-primary">Save Charter</button>' : ''}</div>
        <div class="table-responsive"><table class="admin-table">
          <thead><tr><th>Vehicle</th><th>Hourly Rate (SGD/hr)</th><th>Daily Rate (SGD/day)</th></tr></thead>
          <tbody>${rules.map(r => `<tr data-vid="${r.vehicle_id}">
            <td><strong>${escapeHtml(r.vehicle_name)}</strong></td>
            <td>${canManage ? `<input type="number" step="1" class="form-input r-hourly" value="${money(r.hourly_rate)}" style="width:100px;">` : `S$${money(r.hourly_rate)}`}</td>
            <td>${canManage ? `<input type="number" step="5" class="form-input r-daily" value="${money(r.daily_rate)}" style="width:100px;">` : `S$${money(r.daily_rate)}`}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>

      <!-- Route Overrides -->
      <div id="ptab-overrides" class="admin-card" style="display:none;">
        <div class="card-header"><div><div class="card-title">Fixed Route Price Overrides</div><div class="card-sub">Fixed prices that override per-km calculations for specific routes.</div></div></div>
        <div class="table-responsive"><table class="admin-table">
          <thead><tr><th>Vehicle</th><th>Origin</th><th>Destination</th><th>Fixed Price</th><th>Active</th>${canManage ? '<th>Actions</th>' : ''}</tr></thead>
          <tbody id="overrides-tbody">${overrides.map(o => `<tr data-oid="${o.id}">
            <td>${escapeHtml(o.vehicle_name)}</td>
            <td>${escapeHtml(o.origin_display_name || o.origin_place_id)}</td>
            <td>${escapeHtml(o.destination_display_name || o.destination_place_id)}</td>
            <td>S$${money(o.fixed_price)}</td>
            <td>${o.is_active ? '<span class="badge badge-confirmed">Yes</span>' : '<span class="badge badge-cancelled">No</span>'}</td>
            ${canManage ? `<td><button class="btn-danger btn-sm btn-del-override">Delete</button></td>` : ''}
          </tr>`).join('')}</tbody>
        </table></div>
      </div>

      <!-- Surcharges -->
      <div id="ptab-surcharges" class="admin-card" style="display:none;">
        <div class="card-header"><div><div class="card-title">Surcharges (Singapore Time / UTC+8)</div><div class="card-sub">Night surcharges, peak-hour fees, time windows.</div></div>${canManage ? '<button id="btn-save-surcharges" class="btn-primary">Save Surcharges</button>' : ''}</div>
        <div class="table-responsive"><table class="admin-table">
          <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Start (SGT)</th><th>End (SGT)</th><th>Mode</th><th>Active</th></tr></thead>
          <tbody>${surcharges.map(s => `<tr data-sid="${s.id}">
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.type)}</td>
            <td>${canManage ? `<input type="number" step="0.5" class="form-input s-val" value="${money(s.value)}" style="width:80px;">` : money(s.value)}</td>
            <td>${escapeHtml(s.start_time || '-')}</td>
            <td>${escapeHtml(s.end_time || '-')}</td>
            <td>${escapeHtml(s.applicable_mode || 'all')}</td>
            <td>${canManage ? `<input type="checkbox" class="s-active" ${s.is_active ? 'checked' : ''}>` : (s.is_active ? 'Yes' : 'No')}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;

    // Tab switching
    $$('.pricing-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.pricing-tab').forEach(b => { b.className = 'btn-secondary btn-sm pricing-tab'; });
        btn.className = 'btn-primary btn-sm pricing-tab';
        ['distance','charter','overrides','surcharges'].forEach(t => {
          const el = $(`#ptab-${t}`);
          if (el) el.style.display = btn.dataset.tab === t ? '' : 'none';
        });
      });
    });

    if (!canManage) return;

    // Save distance rules
    const btnSaveRules = $('#btn-save-rules');
    if (btnSaveRules) {
      btnSaveRules.addEventListener('click', async () => {
        const updated = Array.from($$('#ptab-distance tbody tr')).map(row => ({
          vehicle_id: Number(row.dataset.vid),
          base_fare: parseFloat(row.querySelector('.r-base')?.value || 0),
          per_km_rate: parseFloat(row.querySelector('.r-km')?.value || 0),
          minimum_fare: parseFloat(row.querySelector('.r-min')?.value || 0)
        }));
        try {
          await api('/pricing/rules', { method: 'PUT', body: JSON.stringify({ rules: updated }) });
          showToast('Distance rules saved', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      });
    }

    // Save charter rates
    const btnSaveCharter = $('#btn-save-charter');
    if (btnSaveCharter) {
      btnSaveCharter.addEventListener('click', async () => {
        const updated = Array.from($$('#ptab-charter tbody tr')).map(row => ({
          vehicle_id: Number(row.dataset.vid),
          hourly_rate: parseFloat(row.querySelector('.r-hourly')?.value || 0),
          daily_rate: parseFloat(row.querySelector('.r-daily')?.value || 0)
        }));
        try {
          await api('/pricing/rules', { method: 'PUT', body: JSON.stringify({ rules: updated }) });
          showToast('Charter rates saved', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      });
    }

    // Delete override
    $$('.btn-del-override').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.oid;
        if (!confirm('Delete this route override?')) return;
        try {
          await api(`/pricing/overrides/${id}`, { method: 'DELETE' });
          showToast('Override deleted', 'success');
          navigate('pricing');
        } catch (err) { showToast(err.message, 'error'); }
      });
    });

    // Save surcharges
    const btnSaveSC = $('#btn-save-surcharges');
    if (btnSaveSC) {
      btnSaveSC.addEventListener('click', async () => {
        const updated = Array.from($$('#ptab-surcharges tbody tr')).map(row => ({
          id: Number(row.dataset.sid),
          value: parseFloat(row.querySelector('.s-val')?.value || 0),
          is_active: row.querySelector('.s-active')?.checked ?? true
        }));
        try {
          await api('/pricing/surcharges', { method: 'PUT', body: JSON.stringify({ surcharges: updated }) });
          showToast('Surcharges saved', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      });
    }

  } catch (err) {
    $('#page-content').innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Could not load pricing: ${escapeHtml(err.message)}</p></div>`;
  }
}

// Content (FAQ, hero, services, footer)
async function renderContent() {
  $('#page-title').textContent = 'Content';
  const canManage = hasPerm('settings.manage');
  $('#page-content').innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">hourglass_empty</span><p>Loading content...</p></div>';
  try {
    const { blocks = [] } = await api('/content');
    const cats = ['faq', 'service', 'hero', 'footer'];
    const grouped = Object.fromEntries(cats.map(c => [c, []]));
    blocks.forEach(b => { if (grouped[b.category]) grouped[b.category].push(b); });

    const tabs = cats.map((c, i) => `<button class="${i===0?'btn-primary':'btn-secondary'} btn-sm content-tab" data-cat="${c}">${c.charAt(0).toUpperCase()+c.slice(1)}${grouped[c].length?` (${grouped[c].length})`:''}</button>`).join('');

    const renderList = (cat) => {
      const items = grouped[cat] || [];
      if (!items.length) return '<p class="empty-state">No content yet.</p>';
      const isFaq = cat === 'faq';
      const isService = cat === 'service';
      const isHero = cat === 'hero';
      return `<table class="admin-table">
        <thead><tr><th>${isFaq?'Question':isService?'Title':'Key'}</th>${isFaq?'':'<th>Subtitle</th>'}<th>${isFaq?'Answer':isService?'Price (SGD)':'Body'}</th><th>Order</th><th>Active</th>${canManage?'<th>Actions</th>':''}</tr></thead>
        <tbody>${items.map(b => `<tr data-id="${b.id}" data-key="${escapeHtml(b.block_key)}">
          <td><strong>${escapeHtml(b.title || b.block_key)}</strong></td>
          ${isFaq?'':`<td>${escapeHtml(b.icon || '')}</td>`}
          <td style="max-width:480px;white-space:normal;">${escapeHtml((b.body || '').substring(0,160))}${(b.body||'').length>160?'…':''}${(b.meta_json && (b.meta_json.priceSGD!==undefined))?`<div class="muted-note">priceSGD: ${b.meta_json.priceSGD}</div>`:''}</td>
          <td>${b.sort_order}</td>
          <td>${b.is_active ? '<span class="badge badge-confirmed">Yes</span>' : '<span class="badge badge-cancelled">No</span>'}</td>
          ${canManage?`<td>
            <button class="btn-ghost btn-sm btn-edit-content">Edit</button>
            <button class="btn-danger btn-sm btn-del-content">Delete</button>
          </td>`:''}
        </tr>`).join('')}</tbody>
      </table>`;
    };

    $('#page-content').innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">${tabs}</div>
      ${cats.map((c, i) => `<div id="ctab-${c}" class="admin-card"${i===0?'':' style="display:none;"'}>
        <div class="card-header">
          <div><div class="card-title">${c.charAt(0).toUpperCase()+c.slice(1)}</div>
          <div class="card-sub">${c==='faq'?'Frequently asked questions shown on landing page.':c==='service'?'Service tiles shown on landing page.':c==='hero'?'Hero section text and image.':'Footer link/section entries.'}</div></div>
          ${canManage?`<button class="btn-primary btn-sm btn-add-content" data-cat="${c}">+ Add ${c}</button>`:''}
        </div>
        ${renderList(c)}
      </div>`).join('')}`;

    // Tab switching
    $$('.content-tab').forEach(btn => btn.addEventListener('click', () => {
      $$('.content-tab').forEach(b => b.className = 'btn-secondary btn-sm content-tab');
      btn.className = 'btn-primary btn-sm content-tab';
      cats.forEach(c => { const el = $('#ctab-'+c); if (el) el.style.display = btn.dataset.cat===c?'':'none'; });
    }));

    if (!canManage) return;

    // Edit existing
    $$('.btn-edit-content').forEach(btn => btn.addEventListener('click', () => {
      const tr = btn.closest('tr');
      const id = tr.dataset.id;
      const block = blocks.find(b => String(b.id) === id);
      if (block) openContentModal(block);
    }));
    // Add new
    $$('.btn-add-content').forEach(btn => btn.addEventListener('click', () => {
      openContentModal({ category: btn.dataset.cat, block_key: '', title: '', body: '', icon: '', meta_json: {}, sort_order: 0, is_active: true });
    }));
    // Delete
    $$('.btn-del-content').forEach(btn => btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      if (!confirm('Delete this content block?')) return;
      try {
        await api(`/content/${tr.dataset.id}`, { method: 'DELETE' });
        showToast('Deleted', 'success');
        navigate('content');
      } catch (err) { showToast(err.message, 'error'); }
    }));
  } catch (err) {
    $('#page-content').innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Could not load content: ${escapeHtml(err.message)}</p></div>`;
  }
}

function openContentModal(block) {
  const isNew = !block.id;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${isNew?'Add':'Edit'} ${escapeHtml(block.category)} content</div>
        <button class="btn-ghost" type="button" data-modal-close>✕</button>
      </div>
      <form id="content-form">
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Key (slug, no spaces)</label><input type="text" id="c-key" class="form-input" value="${escapeHtml(block.block_key)}" required ${isNew?'':'disabled'}></div>
          <div class="form-group"><label class="form-label">Sort Order</label><input type="number" id="c-order" class="form-input" value="${block.sort_order||0}"></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Title ${block.category==='faq'?'(Question)':''}</label><input type="text" id="c-title" class="form-input" value="${escapeHtml(block.title||'')}" required></div>
          ${block.category==='service'?`<div class="form-group"><label class="form-label">Icon (Material Symbol)</label><input type="text" id="c-icon" class="form-input" value="${escapeHtml(block.icon||'')}" placeholder="directions_car"></div>
          <div class="form-group"><label class="form-label">Price (SGD)</label><input type="number" step="1" id="c-price" class="form-input" value="${(block.meta_json&&block.meta_json.priceSGD)||0}"></div>`:''}
          ${block.category==='hero'?`<div class="form-group" style="grid-column:1/-1;"><label class="form-label">Image URL</label><input type="text" id="c-image" class="form-input" value="${escapeHtml(block.image_url||'')}"></div>`:''}
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Body ${block.category==='faq'?'(Answer)':''}</label><textarea id="c-body" class="form-textarea" rows="5" required>${escapeHtml(block.body||'')}</textarea></div>
          <div class="form-group"><label class="form-label"><input type="checkbox" id="c-active" ${block.is_active?'checked':''}> Active</label></div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">${isNew?'Create':'Save'}</button>
          <button type="button" class="btn-secondary" data-modal-close>Cancel</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay || e.target.hasAttribute('data-modal-close')) overlay.remove(); });
  $('#content-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      title: $('#c-title').value.trim(),
      body: $('#c-body').value.trim(),
      sort_order: Number($('#c-order').value || 0),
      is_active: $('#c-active').checked
    };
    if (block.category === 'service') {
      body.icon = $('#c-icon').value.trim();
      body.meta_json = { priceSGD: Number($('#c-price').value || 0) };
    }
    if (block.category === 'hero') {
      body.image_url = $('#c-image').value.trim();
    }
    try {
      if (isNew) {
        body.block_key = $('#c-key').value.trim();
        body.category = block.category;
        await api('/content', { method: 'POST', body: JSON.stringify(body) });
      } else {
        await api(`/content/${block.id}`, { method: 'PUT', body: JSON.stringify(body) });
      }
      overlay.remove();
      showToast(isNew ? 'Content created' : 'Content saved', 'success');
      navigate('content');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// Drivers
async function renderDrivers() {
  const data = await api('/drivers');
  const canManage = hasPerm('drivers.manage');
  $('#page-title').textContent = 'Drivers / Partners';
  $('#page-content').innerHTML = `
    ${canManage ? `
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Add Driver</div></div>
      <form id="driver-form" class="form-grid">
        <div class="form-group"><label class="form-label">Name</label><input type="text" id="d-name" class="form-input" required></div>
        <div class="form-group"><label class="form-label">Phone</label><input type="tel" id="d-phone" class="form-input"></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="d-email" class="form-input"></div>
        <div class="form-group"><label class="form-label">Plate Number</label><input type="text" id="d-plate" class="form-input"></div>
        <div class="form-group"><label class="form-label">Photo URL</label><input type="url" id="d-photo" class="form-input"></div>
      </form>
      <div class="form-actions"><button class="btn-primary" id="btn-add-driver">Add Driver</button></div>
    </div>` : ''}
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Drivers</div></div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Plate</th><th>Active</th>${canManage ? '<th>Actions</th>' : ''}</tr></thead>
          <tbody>${data.drivers.map(d => `<tr data-id="${d.id}">
            <td><strong>${escapeHtml(d.name)}</strong></td>
            <td>${escapeHtml(d.phone || '-')}</td>
            <td>${escapeHtml(d.email || '-')}</td>
            <td>${escapeHtml(d.plate_number || '-')}</td>
            <td>${d.is_active ? 'Yes' : 'No'}</td>
            ${canManage ? `<td>
              <button class="btn-danger btn-sm btn-toggle-driver">${d.is_active ? 'Deactivate' : 'Activate'}</button>
            </td>` : ''}
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  if (canManage) {
    $('#btn-add-driver').addEventListener('click', async () => {
      const body = {
        name: $('#d-name').value.trim(),
        phone: $('#d-phone').value.trim(),
        email: $('#d-email').value.trim(),
        plateNumber: $('#d-plate').value.trim(),
        photoUrl: $('#d-photo').value.trim()
      };
      try {
        await api('/drivers', { method: 'POST', body: JSON.stringify(body) });
        showToast('Driver added', 'success');
        navigate('drivers');
      } catch (err) { showToast(err.message, 'error'); }
    });
    $$('.btn-toggle-driver').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.id;
        const isActive = btn.textContent === 'Activate';
        try {
          await api(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) });
          showToast('Driver updated', 'success');
          navigate('drivers');
        } catch (err) { showToast(err.message, 'error'); }
      });
    });
  }
}

// Notifications
async function renderNotifications() {
  $('#page-title').textContent = 'Notifications';
  try {
    const [settingsRes, templatesRes] = await Promise.all([
      api('/notifications/settings'),
      api('/notifications/templates')
    ]);
    // Fix: unwrap { success, settings } and { success, templates }
    const settings = settingsRes.settings || settingsRes || {};
    const templates = templatesRes.templates || templatesRes || [];
    const canManage = hasPerm('notifications.manage');
    $('#page-content').innerHTML = `
      <div class="admin-card">
        <div class="card-header"><div class="card-title">Channel Settings</div></div>
        ${['email','sms','whatsapp','push'].map(ch => toggleRow(ch, settings[ch]?.enabled)).join('')}
        ${canManage ? '<div class="form-actions"><button class="btn-primary" id="btn-save-notif-settings">Save Channel Settings</button></div>' : ''}
      </div>
      <div class="admin-card">
        <div class="card-header"><div class="card-title">Notification Templates</div></div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead><tr><th>Channel</th><th>Event</th><th>Name</th><th>Subject</th><th>Active</th></tr></thead>
            <tbody>${(Array.isArray(templates) ? templates : []).map(t => `<tr>
              <td>${escapeHtml(t.channel)}</td>
              <td>${escapeHtml(t.event)}</td>
              <td>${escapeHtml(t.name)}</td>
              <td>${escapeHtml(t.subject || '-')}</td>
              <td>${t.is_active ? '<span class="badge badge-confirmed">Yes</span>' : '<span class="badge badge-cancelled">No</span>'}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;

    if (canManage) {
      $('#btn-save-notif-settings').addEventListener('click', async () => {
        const payload = {};
        ['email','sms','whatsapp','push'].forEach(ch => {
          payload[ch] = { enabled: $(`#toggle-${ch}`)?.checked ?? false, config: {} };
        });
        try {
          await api('/notifications/settings', { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Notification settings saved', 'success');
        } catch (err) { showToast(err.message, 'error'); }
      });
    }
  } catch (err) {
    $('#page-content').innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Could not load notifications: ${escapeHtml(err.message)}</p></div>`;
  }
}

function toggleRow(channel, enabled) {
  const label = channel.charAt(0).toUpperCase() + channel.slice(1);
  return `<div class="toggle-row">
    <div><strong>${label}</strong></div>
    <label class="switch">
      <input type="checkbox" id="toggle-${channel}" ${enabled ? 'checked' : ''}>
      <span class="slider"></span>
    </label>
  </div>`;
}

// Payments
async function renderPayments() {
  $('#page-title').textContent = 'Payments';
  try {
    const { integrations = [] } = await api('/integrations');
    const payments = integrations.filter(i => i.provider_type === 'PAYMENT');
    $('#page-content').innerHTML = `
      <div class="admin-card">
        <div class="card-header"><div class="card-title">Payment Providers</div><div class="card-sub">Configure via Integrations tab. Payment gateway credentials can be added there.</div></div>
        ${payments.map(p => `
          <div class="toggle-row">
            <div><strong>${escapeHtml(p.display_name || p.provider_key)}</strong> &middot; ${escapeHtml(p.provider_key)}</div>
            <span class="badge ${p.enabled ? 'badge-confirmed' : 'badge-cancelled'}">${p.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>`).join('') || '<p class="empty-state">No payment providers configured. Add one in the Integrations tab.</p>'}
      </div>`;
  } catch (err) {
    $('#page-content').innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Could not load payment providers: ${escapeHtml(err.message)}</p></div>`;
  }
}

// Integrations
const INTEGRATION_FIELDS = {
  EMAIL: [
    { key: 'host', label: 'SMTP Host', type: 'text', secret: false, required: true },
    { key: 'port', label: 'SMTP Port', type: 'number', secret: false, required: true, default: 587 },
    { key: 'secure', label: 'Use SSL/465', type: 'checkbox', secret: false, default: false },
    { key: 'user', label: 'SMTP Username', type: 'text', secret: false, required: true },
    { key: 'password', label: 'SMTP Password', type: 'password', secret: true, required: true },
    { key: 'from', label: 'From Address', type: 'text', secret: false, required: true, placeholder: 'STB \u003cbala@example.com\u003e' }
  ],
  SMS: [
    { key: 'providerKey', label: 'Provider (twilio | msg91 | ...)', type: 'text', secret: false, required: true, default: 'twilio' },
    { key: 'senderId', label: 'Sender ID', type: 'text', secret: false, required: true },
    { key: 'accountSid', label: 'Account SID / Username', type: 'text', secret: false, required: true },
    { key: 'authToken', label: 'Auth Token / API Key', type: 'password', secret: true, required: true },
    { key: 'region', label: 'Region', type: 'text', secret: false }
  ],
  WHATSAPP: [
    { key: 'providerKey', label: 'Provider (twilio | wati | 360dialog)', type: 'text', secret: false, required: true, default: 'twilio' },
    { key: 'senderNumber', label: 'Sender Number', type: 'text', secret: false, required: true },
    { key: 'apiKey', label: 'API Key / Token', type: 'password', secret: true, required: true },
    { key: 'fallbackEnabled', label: 'Enable wa.me fallback', type: 'checkbox', secret: false, default: true }
  ],
  FIREBASE: [
    { key: 'projectId', label: 'Firebase Project ID', type: 'text', secret: false, required: true },
    { key: 'clientEmail', label: 'Service Account Client Email', type: 'text', secret: false, required: true },
    { key: 'privateKey', label: 'Service Account Private Key', type: 'textarea', secret: true, required: true },
    { key: 'serverKey', label: 'Legacy Server Key (optional)', type: 'password', secret: true }
  ],
  PAYMENT: [
    { key: 'providerKey', label: 'Provider (stripe | billdesk | razorpay)', type: 'text', secret: false, required: true, default: 'stripe' },
    { key: 'publishableKey', label: 'Publishable Key', type: 'text', secret: false },
    { key: 'secretKey', label: 'Secret Key', type: 'password', secret: true },
    { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', secret: true }
  ],
  EFC: [
    { key: 'providerKey', label: 'Provider Name', type: 'text', secret: false, required: true, default: 'efc' },
    { key: 'merchantId', label: 'Merchant ID', type: 'text', secret: false, required: true },
    { key: 'apiKey', label: 'API Key', type: 'password', secret: true, required: true },
    { key: 'endpoint', label: 'API Endpoint', type: 'text', secret: false }
  ]
};

function integrationFormHtml(type, data = null) {
  const cfg = data?.config || {};
  const secrets = data?.secrets || {};
  const fields = INTEGRATION_FIELDS[type] || [];
  const providerKeyValue = cfg.providerKey || data?.provider_key || secrets.providerKey || '';
  const common = `
    <div class="form-group"><label class="form-label">Provider Type</label><select id="i-type" class="form-select" ${data ? 'disabled' : ''}>${Object.keys(INTEGRATION_FIELDS).map(t => `<option value="${t}" ${t === type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Display Name</label><input type="text" id="i-name" class="form-input" value="${escapeHtml(data?.display_name || '')}" placeholder="e.g. Gmail SMTP"></div>
    <div class="form-group"><label class="form-label">Mode</label><select id="i-mode" class="form-select"><option value="sandbox" ${(data?.mode || 'sandbox') === 'sandbox' ? 'selected' : ''}>Sandbox</option><option value="live" ${data?.mode === 'live' ? 'selected' : ''}>Live</option></select></div>
    <div class="form-group"><label class="form-label">Enabled</label><select id="i-enabled" class="form-select"><option value="true" ${data?.enabled !== false ? 'selected' : ''}>Yes</option><option value="false" ${data?.enabled === false ? 'selected' : ''}>No</option></select></div>
  `;
  const fieldsHtml = fields.map(f => {
    const val = cfg[f.key] ?? secrets[f.key] ?? f.default ?? '';
    const isCheck = f.type === 'checkbox';
    const inputId = `i-f-${f.key}`;
    const checkAttr = isCheck && val ? 'checked' : '';
    const input = f.type === 'textarea'
      ? `<textarea id="${inputId}" class="form-textarea" rows="4" ${f.required ? 'required' : ''} placeholder="${escapeHtml(f.placeholder || '')}">${escapeHtml(val)}</textarea>`
      : `<input type="${f.type}" id="${inputId}" class="form-input" value="${isCheck ? '' : escapeHtml(val)}" ${checkAttr} ${f.required ? 'required' : ''} placeholder="${escapeHtml(f.placeholder || '')}">`;
    return `<div class="form-group" style="${f.type === 'textarea' || f.key === 'privateKey' ? 'grid-column:1/-1;' : ''}"><label class="form-label">${escapeHtml(f.label)}${f.secret ? ' (encrypted)' : ''}</label>${input}</div>`;
  }).join('');
  return `<form id="integration-form" class="form-grid" data-type="${type}">${common}${fieldsHtml}</form>`;
}

function getIntegrationFormData(type) {
  const fields = INTEGRATION_FIELDS[type] || [];
  const config = {};
  const secrets = {};
  fields.forEach(f => {
    const el = $(`#i-f-${f.key}`);
    let value = el ? (f.type === 'checkbox' ? el.checked : el.value.trim()) : (f.default ?? '');
    if (f.type === 'number') value = Number(value) || 0;
    if (f.secret) secrets[f.key] = value;
    else config[f.key] = value;
  });
  return {
    providerType: type,
    providerKey: config.providerKey || (type === 'EMAIL' ? 'smtp' : type.toLowerCase()),
    displayName: $('#i-name').value.trim(),
    mode: $('#i-mode').value,
    enabled: $('#i-enabled').value === 'true',
    config,
    secrets
  };
}

async function renderIntegrations() {
  const { integrations = [] } = await api('/integrations');
  const canManage = hasPerm('integrations.manage');
  $('#page-title').textContent = 'Integrations';
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <div><div class="card-title">Provider Integrations</div><div class="card-sub">Configure SMTP, SMS, WhatsApp, Firebase, EFC, and payment gateways (payment is scaffolded for future use).</div></div>
        ${canManage ? '<button class="btn-primary" id="btn-add-integration">Add Integration</button>' : ''}
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Type</th><th>Provider</th><th>Display Name</th><th>Mode</th><th>Enabled</th><th>Default</th><th>Actions</th></tr></thead>
          <tbody>${integrations.map(i => `<tr data-id="${i.id}">
            <td><strong>${i.provider_type}</strong></td>
            <td>${escapeHtml(i.provider_key)}</td>
            <td>${escapeHtml(i.display_name || '-')}</td>
            <td><span class="badge ${i.mode === 'live' ? 'badge-active' : 'badge-pending'}">${i.mode || '-'}</span></td>
            <td>${i.enabled ? 'Yes' : 'No'}</td>
            <td>${i.is_default ? 'Yes' : 'No'}</td>
            <td>
              ${canManage ? `<button class="btn-ghost btn-sm btn-edit-integration">Edit</button>` : ''}
              ${canManage && i.provider_type !== 'PAYMENT' ? `<button class="btn-ghost btn-sm btn-test-integration">Test</button>` : ''}
              ${canManage ? `<button class="btn-ghost btn-sm btn-default-integration" ${i.is_default ? 'disabled' : ''}>Set Default</button>` : ''}
              ${canManage ? `<button class="btn-danger btn-sm btn-delete-integration">Delete</button>` : ''}
            </td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  if (!canManage) return;

  $('#btn-add-integration').addEventListener('click', () => openIntegrationModal());

  $$('.btn-edit-integration').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      const { integration } = await api(`/integrations/${id}`);
      openIntegrationModal(integration);
    });
  });

  $$('.btn-test-integration').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      await testIntegration(id);
    });
  });

  $$('.btn-default-integration').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      await api(`/integrations/${id}/default`, { method: 'PUT' });
      showToast('Default provider set', 'success');
      navigate('integrations');
    });
  });

  $$('.btn-delete-integration').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('tr').dataset.id;
      if (!confirm('Delete this integration?')) return;
      await api(`/integrations/${id}`, { method: 'DELETE' });
      showToast('Integration deleted', 'success');
      navigate('integrations');
    });
  });
}

function openIntegrationModal(data = null) {
  const type = data?.provider_type || 'EMAIL';
  const title = data ? `Edit ${type} Integration` : 'Add Integration';
  const html = integrationFormHtml(type, data);
  showModal(title, html, async () => {
    const selectedType = data ? type : $('#i-type').value;
    const body = getIntegrationFormData(selectedType);
    if (data) body.id = data.id;
    await api(data ? `/integrations/${data.id}` : '/integrations', { method: data ? 'PUT' : 'POST', body: JSON.stringify(body) });
    showToast(data ? 'Integration updated' : 'Integration added', 'success');
    navigate('integrations');
  }, (overlay) => {
    const typeSelect = $('#i-type', overlay);
    if (typeSelect && !data) {
      typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        $('#modal-body', overlay).innerHTML = integrationFormHtml(newType, null);
      });
    }
  });
}

async function testIntegration(id) {
  try {
    const { integration } = await api(`/integrations/${id}`);
    const testTo = prompt(`Send test ${integration.provider_type.toLowerCase()}?\nEmail: enter recipient address and click OK.\nSMS/WhatsApp: enter phone number.\nOther: leave blank to validate config only.`);
    if (testTo === null) return;
    const payload = {};
    if (integration.provider_type === 'EMAIL') payload.to = testTo.trim();
    else if (['SMS', 'WHATSAPP'].includes(integration.provider_type)) payload.to = testTo.trim();
    const result = await api(`/integrations/${id}/test`, { method: 'POST', body: JSON.stringify(payload) });
    if (result.success) showToast('Test passed', 'success');
    else showToast(result.error || 'Test failed', 'error');
  } catch (err) {
    showToast(err.message || 'Test failed', 'error');
  }
}

function showModal(title, html, onConfirm, onMount) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button class="btn-ghost" id="modal-close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="modal-body" id="modal-body">${html}</div>
      <div class="form-actions" style="margin-top:20px;">
        <button class="btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn-primary" id="modal-confirm">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  $('#modal-close', overlay).addEventListener('click', close);
  $('#modal-cancel', overlay).addEventListener('click', close);
  $('#modal-confirm', overlay).addEventListener('click', async () => {
    try { await onConfirm(); close(); } catch (err) { showToast(err.message, 'error'); }
  });
  if (onMount) onMount(overlay);
}

// Settings
async function renderSettings() {
  const data = await api('/settings');
  const canManage = hasPerm('settings.manage');
  $('#page-title').textContent = 'Settings';
  const brand = data.settings?.system?.brand || {};
  const contact = data.settings?.system?.contact || {};
  const content = data.settings?.system?.content || {};
  $('#page-content').innerHTML = `
    <form id="settings-form">
      <div class="admin-card">
        <div class="card-header"><div class="card-title">Brand / Contact</div></div>
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Business Name</label><input type="text" id="s-brand-name" class="form-input" value="${escapeHtml(brand.name || '')}"></div>
          <div class="form-group"><label class="form-label">Tagline</label><input type="text" id="s-brand-tagline" class="form-input" value="${escapeHtml(brand.tagline || '')}"></div>
          <div class="form-group"><label class="form-label">Logo URL</label><input type="text" id="s-brand-logo" class="form-input" value="${escapeHtml(brand.logoUrl || '')}"></div>
          <div class="form-group"><label class="form-label">Phone</label><input type="text" id="s-contact-phone" class="form-input" value="${escapeHtml(contact.phone || '')}"></div>
          <div class="form-group"><label class="form-label">Email</label><input type="text" id="s-contact-email" class="form-input" value="${escapeHtml(contact.email || '')}"></div>
          <div class="form-group"><label class="form-label">WhatsApp</label><input type="text" id="s-contact-whatsapp" class="form-input" value="${escapeHtml(contact.whatsapp || '')}"></div>
        </div>
      </div>

      <div class="admin-card">
        <div class="card-header"><div class="card-title">Customer-Facing Content</div></div>
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Tolls Excluded Text</label><textarea id="s-tolls" class="form-textarea">${escapeHtml(content.tollsExcludedText || '')}</textarea></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Fare Disclaimer</label><textarea id="s-disclaimer" class="form-textarea">${escapeHtml(content.fareDisclaimer || '')}</textarea></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Estimated Fare Wording</label><input type="text" id="s-fare-text" class="form-input" value="${escapeHtml(content.estimatedFareText || '')}"></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Booking Instructions</label><textarea id="s-instructions" class="form-textarea">${escapeHtml(content.bookingInstructions || '')}</textarea></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Cancellation Text</label><textarea id="s-cancellation" class="form-textarea">${escapeHtml(content.cancellationText || '')}</textarea></div>
        </div>
      </div>

      ${canManage ? '<div class="form-actions"><button type="submit" class="btn-primary">Save Settings</button></div>' : ''}
    </form>`;

  if (canManage) {
    $('#settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        brand: {
          name: $('#s-brand-name').value.trim(),
          tagline: $('#s-brand-tagline').value.trim(),
          logoUrl: $('#s-brand-logo').value.trim()
        },
        contact: {
          phone: $('#s-contact-phone').value.trim(),
          email: $('#s-contact-email').value.trim(),
          whatsapp: $('#s-contact-whatsapp').value.trim()
        },
        content: {
          tollsExcludedText: $('#s-tolls').value.trim(),
          fareDisclaimer: $('#s-disclaimer').value.trim(),
          estimatedFareText: $('#s-fare-text').value.trim(),
          bookingInstructions: $('#s-instructions').value.trim(),
          cancellationText: $('#s-cancellation').value.trim()
        }
      };
      try {
        await api('/settings/system', { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Settings saved', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
  }
}

// Users & Roles
async function renderUsers() {
  // Fix: destructure { users } and { roles } from API responses
  const [usersRes, rolesRes] = await Promise.all([api('/users'), api('/roles')]);
  const users = usersRes.users || [];
  const roles = rolesRes.roles || [];
  const canManage = hasPerm('users.manage');
  $('#page-title').textContent = 'Users & Roles';
  $('#page-content').innerHTML = `
    ${canManage ? `
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Add Admin User</div></div>
      <form id="user-form" class="form-grid">
        <div class="form-group"><label class="form-label">Email</label><input type="email" id="u-email" class="form-input" required></div>
        <div class="form-group"><label class="form-label">Name</label><input type="text" id="u-name" class="form-input"></div>
        <div class="form-group"><label class="form-label">Role</label>
          <select id="u-role" class="form-select">${roles.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label class="form-label">Password (optional)</label><input type="password" id="u-password" class="form-input"></div>
      </form>
      <div class="form-actions"><button class="btn-primary" id="btn-add-user">Add User</button></div>
    </div>` : ''}
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Admin Users</div></div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Active</th></tr></thead>
          <tbody>${users.map(u => `<tr>
            <td>${escapeHtml(u.email)}</td>
            <td>${escapeHtml(u.name || '-')}</td>
            <td>${escapeHtml(u.role_name || u.role_slug || '-')}</td>
            <td>${u.is_active ? '<span class="badge badge-confirmed">Yes</span>' : '<span class="badge badge-cancelled">No</span>'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="admin-card">
      <div class="card-header"><div class="card-title">Roles</div></div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Slug</th><th>System</th></tr></thead>
          <tbody>${roles.map(r => `<tr>
            <td><strong>${escapeHtml(r.name)}</strong></td>
            <td>${escapeHtml(r.slug)}</td>
            <td>${r.is_system_role ? 'Yes' : 'No'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  if (canManage) {
    $('#btn-add-user').addEventListener('click', async () => {
      const body = {
        email: $('#u-email').value.trim(),
        name: $('#u-name').value.trim(),
        roleId: Number($('#u-role').value),
        password: $('#u-password').value
      };
      try {
        await api('/users', { method: 'POST', body: JSON.stringify(body) });
        showToast('User added', 'success');
        navigate('users');
      } catch (err) { showToast(err.message, 'error'); }
    });
  }
}

// Audit
async function renderAudit() {
  const data = await api('/audit-logs?limit=200');
  $('#page-title').textContent = 'Audit Logs';
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Audit Logs</div></div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Table</th><th>Record</th><th>Changes</th></tr></thead>
          <tbody>${data.logs.map(l => `<tr>
            <td>${new Date(l.created_at).toLocaleString()}</td>
            <td>${escapeHtml(l.actor_email || l.actor_type)}</td>
            <td>${escapeHtml(l.action)}</td>
            <td>${escapeHtml(l.table_name || '-')}</td>
            <td>${escapeHtml(l.record_id || '-')}</td>
            <td><pre style="font-size:0.75rem;max-width:300px;overflow:auto;">${escapeHtml(JSON.stringify({ old: l.old_values, new: l.new_values }, null, 2))}</pre></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

// Boot
(async function boot() {
  try {
    const config = await (await fetch('/api/config', { credentials: 'same-origin' })).json();
    googleMapsApiKey = config.googleMapsApiKey || '';
  } catch (e) {}

  try {
    const session = await api('/auth/session');
    currentAdmin = session.admin;
    // Fix: populate permissions from server response (was always empty [])
    permissions = new Set(session.isSuper ? ['*'] : (session.permissions || []));
    renderApp();
  } catch (e) {
    renderAuth();
  }
})();
