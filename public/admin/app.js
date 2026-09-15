// STB Singapore — Admin SPA (modular, permission-aware)
const API = '/api/admin';
const PUBLIC_API = '/api';

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
  const url = path.startsWith('http') ? path : (path.startsWith('/api') ? path : `${API}${path}`);
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = data?.error || `Request failed (${res.status})`;
    showToast(err, 'error');
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

// Auth
async function initAuth() {
  try {
    const session = await api('/auth/session', { headers: {} }); // public doesn't exist, use /api/admin
  } catch (e) {
    // not authenticated
  }
  renderAuth();
}

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
    } catch (err) {}
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
    } catch (err) {}
  });
}

async function loadPermissions() {
  try {
    const session = await api('/auth/session');
    permissions = new Set(session.isSuper ? ['*'] : []);
    currentAdmin = session.admin;
  } catch (e) {}
}

// Layout
function renderApp() {
  const root = $('#root');
  root.innerHTML = `
    <div class="admin-app">
      <aside class="admin-sidebar" id="sidebar">
        <div class="sidebar-header">
          <img src="/stb-logo.png" alt="STB">
          <span class="sidebar-title">STB Admin</span>
        </div>
        <nav class="sidebar-nav" id="sidebar-nav"></nav>
        <div class="sidebar-footer">
          <div style="font-weight:700;color:var(--text-primary);">${escapeHtml(currentAdmin?.name || currentAdmin?.email)}</div>
          <div style="margin-top:4px;">${escapeHtml(currentAdmin?.roleSlug || '')}</div>
          <button id="btn-logout" class="btn-secondary btn-sm" style="margin-top:10px;width:100%;">Sign Out</button>
        </div>
      </aside>
      <main class="admin-main" id="main">
        <div class="admin-header-bar">
          <h1 id="page-title">Dashboard</h1>
          <button class="mobile-menu-btn" id="mobile-menu-btn"><span class="material-symbols-outlined">menu</span></button>
        </div>
        <div id="page-content"></div>
      </main>
    </div>`;

  renderNav();
  $('#btn-logout').addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST' });
    location.reload();
  });
  $('#mobile-menu-btn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  navigate('dashboard');
}

function renderNav() {
  const items = [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', perm: 'dashboard.view' },
    { id: 'bookings', icon: 'calendar_month', label: 'Bookings', perm: 'bookings.view' },
    { id: 'customers', icon: 'group', label: 'Customers', perm: 'customers.view' },
    { id: 'vehicles', icon: 'local_taxi', label: 'Vehicles', perm: 'vehicles.view' },
    { id: 'pricing', icon: 'payments', label: 'Pricing', perm: 'pricing.view' },
    { id: 'drivers', icon: 'person_pin', label: 'Drivers / Partners', perm: 'drivers.view' },
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
        <span>${i.label}</span>
      </button>`).join('');

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.view));
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
    else if (view === 'notifications') await renderNotifications();
    else if (view === 'payments') await renderPayments();
    else if (view === 'integrations') await renderIntegrations();
    else if (view === 'settings') await renderSettings();
    else if (view === 'users') await renderUsers();
    else if (view === 'audit') await renderAudit();
    else content.innerHTML = '<div class="empty-state"><p>Page not found.</p></div>';
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">error</span><p>Failed to load ${view}.</p></div>`;
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

// Bookings
async function renderBookings() {
  const data = await api('/bookings');
  $('#page-title').textContent = 'Bookings';
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <div><div class="card-title">All Bookings</div><div class="card-sub">Manage status, assign drivers, view history.</div></div>
      </div>
      <div class="table-responsive">${bookingsTable(data.bookings)}</div>
    </div>`;
}

// Customers
async function renderCustomers() {
  $('#page-title').textContent = 'Customers';
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <div><div class="card-title">Customers</div><div class="card-sub">Registered customer accounts.</div></div>
      </div>
      <p class="empty-state">Customer list is available via API. UI import/export can be added.</p>
    </div>`;
}

// Vehicles
async function renderVehicles() {
  const data = await api('/vehicles');
  const canManage = hasPerm('vehicles.manage');
  $('#page-title').textContent = 'Vehicles';
  $('#page-content').innerHTML = `
    ${canManage ? `
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Add Vehicle Category</div></div>
      <form id="vehicle-form" class="form-grid">
        <div class="form-group"><label class="form-label">Name</label><input type="text" id="v-name" class="form-input" required></div>
        <div class="form-group"><label class="form-label">Description</label><input type="text" id="v-desc" class="form-input"></div>
        <div class="form-group"><label class="form-label">Max Pax</label><input type="number" id="v-pax" class="form-input" value="4"></div>
        <div class="form-group"><label class="form-label">Luggage Capacity</label><input type="number" id="v-luggage" class="form-input" value="2"></div>
        <div class="form-group"><label class="form-label">Image URL</label><input type="url" id="v-image" class="form-input"></div>
        <div class="form-group"><label class="form-label">Sort Order</label><input type="number" id="v-sort" class="form-input" value="0"></div>
      </form>
      <div class="form-actions"><button class="btn-primary" id="btn-add-vehicle">Add Vehicle</button></div>
    </div>` : ''}
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Vehicle Categories</div></div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Description</th><th>Pax</th><th>Luggage</th><th>Sort</th><th>Active</th>${canManage ? '<th>Actions</th>' : ''}</tr></thead>
          <tbody>${data.vehicles.map(v => `<tr data-id="${v.id}">
            <td><strong>${escapeHtml(v.name)}</strong></td>
            <td>${escapeHtml(v.description || '-')}</td>
            <td>${v.pax_max}</td>
            <td>${v.luggage_capacity}</td>
            <td>${v.sort_order}</td>
            <td>${v.is_active ? 'Yes' : 'No'}</td>
            ${canManage ? `<td>
              <button class="btn-ghost btn-sm btn-edit-vehicle">Edit</button>
              <button class="btn-danger btn-sm btn-toggle-vehicle">${v.is_active ? 'Deactivate' : 'Activate'}</button>
            </td>` : ''}
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  if (canManage) {
    $('#btn-add-vehicle').addEventListener('click', async () => {
      const body = {
        name: $('#v-name').value.trim(),
        description: $('#v-desc').value.trim(),
        paxMax: Number($('#v-pax').value),
        luggageCapacity: Number($('#v-luggage').value),
        imageUrl: $('#v-image').value.trim(),
        sortOrder: Number($('#v-sort').value)
      };
      try {
        await api('/vehicles', { method: 'POST', body: JSON.stringify(body) });
        showToast('Vehicle added', 'success');
        navigate('vehicles');
      } catch (err) {}
    });

    $$('.btn-toggle-vehicle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.id;
        const isActive = btn.textContent === 'Activate';
        try {
          await api(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) });
          showToast('Vehicle updated', 'success');
          navigate('vehicles');
        } catch (err) {}
      });
    });
  }
}

// Pricing
async function renderPricing() {
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <div><div class="card-title">Pricing Configuration</div><div class="card-sub">Use the existing Pricing Engine tab for detailed rules. This view will be enhanced with full CRUD in a follow-up.</div></div>
      </div>
      <p class="empty-state">The existing pricing engine remains functional. Extended pricing CRUD coming.</p>
    </div>`;
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
      } catch (err) {}
    });
    $$('.btn-toggle-driver').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.id;
        const isActive = btn.textContent === 'Activate';
        try {
          await api(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify({ isActive }) });
          showToast('Driver updated', 'success');
          navigate('drivers');
        } catch (err) {}
      });
    });
  }
}

// Notifications
async function renderNotifications() {
  const [settings, templates] = await Promise.all([api('/notifications/settings'), api('/notifications/templates')]);
  const canManage = hasPerm('notifications.manage');
  $('#page-title').textContent = 'Notifications';
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Channel Settings</div></div>
      ${['email','sms','whatsapp','push'].map(ch => toggleRow(ch, settings[ch]?.enabled)).join('')}
      ${canManage ? '<div class="form-actions"><button class="btn-primary" id="btn-save-notif-settings">Save Channel Settings</button></div>' : ''}
    </div>
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Templates</div></div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Channel</th><th>Event</th><th>Name</th><th>Subject</th><th>Active</th></tr></thead>
          <tbody>${templates.map(t => `<tr>
            <td>${t.channel}</td>
            <td>${t.event}</td>
            <td>${escapeHtml(t.name)}</td>
            <td>${escapeHtml(t.subject || '-')}</td>
            <td>${t.is_active ? 'Yes' : 'No'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  if (canManage) {
    $('#btn-save-notif-settings').addEventListener('click', async () => {
      const payload = {};
      ['email','sms','whatsapp','push'].forEach(ch => {
        payload[ch] = { enabled: $(`#toggle-${ch}`).checked, config: {} };
      });
      try {
        await api('/notifications/settings', { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Notification settings saved', 'success');
      } catch (err) {}
    });
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
  const integrations = await api('/integrations');
  const payments = integrations.filter(i => i.provider_type === 'PAYMENT');
  $('#page-title').textContent = 'Payments';
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header"><div class="card-title">Payment Providers</div></div>
      ${payments.map(p => `
        <div class="toggle-row">
          <div><strong>${escapeHtml(p.display_name || p.provider_key)}</strong> · ${p.provider_key}</div>
          <span class="badge ${p.enabled ? 'badge-active' : 'badge-cancelled'}">${p.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>`).join('') || '<p class="empty-state">No payment providers configured.</p>'}
    </div>`;
}

// Integrations
async function renderIntegrations() {
  const integrations = await api('/integrations');
  const canManage = hasPerm('integrations.manage');
  $('#page-title').textContent = 'Integrations';
  $('#page-content').innerHTML = `
    <div class="admin-card">
      <div class="card-header">
        <div><div class="card-title">Integrations</div><div class="card-sub">Configure providers for Email, SMS, WhatsApp, Payments, Firebase, EFC.</div></div>
        ${canManage ? '<button class="btn-primary" id="btn-add-integration">Add Integration</button>' : ''}
      </div>
      <div class="table-responsive">
        <table class="admin-table">
          <thead><tr><th>Type</th><th>Provider</th><th>Display Name</th><th>Mode</th><th>Enabled</th><th>Default</th></tr></thead>
          <tbody>${integrations.map(i => `<tr data-id="${i.id}">
            <td>${i.provider_type}</td>
            <td>${i.provider_key}</td>
            <td>${escapeHtml(i.display_name || '-')}</td>
            <td>${i.mode || '-'}</td>
            <td>${i.enabled ? 'Yes' : 'No'}</td>
            <td>${i.is_default ? 'Yes' : 'No'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  if (canManage) {
    $('#btn-add-integration').addEventListener('click', () => {
      showModal('Add Integration', `
        <form id="integration-form" class="form-grid">
          <div class="form-group"><label class="form-label">Provider Type</label>
            <select id="i-type" class="form-select">
              <option value="EMAIL">EMAIL</option><option value="PAYMENT">PAYMENT</option><option value="SMS">SMS</option>
              <option value="WHATSAPP">WHATSAPP</option><option value="FIREBASE">FIREBASE</option><option value="EFC">EFC</option>
            </select>
          </div>
          <div class="form-group"><label class="form-label">Provider Key</label><input type="text" id="i-key" class="form-input" required></div>
          <div class="form-group"><label class="form-label">Display Name</label><input type="text" id="i-name" class="form-input"></div>
          <div class="form-group"><label class="form-label">Mode</label><input type="text" id="i-mode" class="form-input" value="sandbox"></div>
          <div class="form-group"><label class="form-label">Enabled</label><select id="i-enabled" class="form-select"><option value="true">Yes</option><option value="false">No</option></select></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Configuration JSON</label><textarea id="i-config" class="form-textarea">{}\u003c/textarea></div>
          <div class="form-group" style="grid-column:1/-1;"><label class="form-label">Secrets JSON (encrypted server-side)</label><textarea id="i-secrets" class="form-textarea" placeholder="{"apiKey":"..."}"\u003e{}\u003c/textarea></div>
        </form>`, async () => {
        const body = {
          providerType: $('#i-type').value,
          providerKey: $('#i-key').value.trim(),
          displayName: $('#i-name').value.trim(),
          mode: $('#i-mode').value.trim(),
          enabled: $('#i-enabled').value === 'true',
          config: JSON.parse($('#i-config').value || '{}'),
          secrets: JSON.parse($('#i-secrets').value || '{}')
        };
        await api('/integrations', { method: 'POST', body: JSON.stringify(body) });
        showToast('Integration added', 'success');
        navigate('integrations');
      });
    });
  }
}

function showModal(title, html, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button class="btn-ghost" id="modal-close"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div class="modal-body">${html}</div>
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
    try { await onConfirm(); close(); } catch (err) {}
  });
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
      } catch (err) {}
    });
  }
}

// Users & Roles
async function renderUsers() {
  const [users, roles] = await Promise.all([api('/users'), api('/roles')]);
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
            <td>${escapeHtml(u.role_name || '-')}</td>
            <td>${u.is_active ? 'Yes' : 'No'}</td>
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
      } catch (err) {}
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
    permissions = new Set(session.isSuper ? ['*'] : []);
    renderApp();
  } catch (e) {
    renderAuth();
  }
})();
