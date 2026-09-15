// STB Singapore — Customer PWA + Auth + Dynamic Content
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const escapeHtml = (str) => String(str).replace(/\u0026/g, '&amp;').replace(/\u003c/g, '&lt;').replace(/\u003e/g, '&gt;').replace(/"/g, '&quot;');

  let customer = null;
  let appConfig = {};

  async function api(path, options = {}) {
    const url = path.startsWith('/api') ? path : `/api${path}`;
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function loadConfig() {
    try {
      appConfig = await api('/config');
      applyDynamicContent();
    } catch (e) {
      console.warn('[CustomerApp] config load failed', e.message);
    }
  }

  function applyDynamicContent() {
    const brand = appConfig.brand || {};
    const content = appConfig.content || {};
    document.title = brand.name ? `${brand.name} — Private Transport` : document.title;
    $$('[data-dynamic="brand-name"]').forEach(el => el.textContent = brand.name || el.textContent);
    $$('[data-dynamic="brand-tagline"]').forEach(el => el.textContent = brand.tagline || el.textContent);
    $$('[data-dynamic="phone"]').forEach(el => { el.href = `tel:${(brand.phone || '').replace(/\s/g, '')}`; el.textContent = brand.phone || el.textContent; });
    $$('[data-dynamic="whatsapp"]').forEach(el => { el.href = `https://wa.me/${(brand.whatsapp || '').replace(/\D/g, '')}`; });
    $$('[data-dynamic="email"]').forEach(el => { el.href = `mailto:${brand.email}`; el.textContent = brand.email || el.textContent; });
    $$('[data-dynamic="tolls-text"]').forEach(el => el.textContent = content.tollsExcludedText || el.textContent);
    $$('[data-dynamic="fare-disclaimer"]').forEach(el => el.textContent = content.fareDisclaimer || el.textContent);
    $$('[data-dynamic="fare-text"]').forEach(el => el.textContent = content.estimatedFareText || el.textContent);
    $$('[data-dynamic="instructions"]').forEach(el => el.textContent = content.bookingInstructions || el.textContent);
    $$('[data-dynamic="cancellation"]').forEach(el => el.textContent = content.cancellationText || el.textContent);
  }

  async function loadSession() {
    try {
      const data = await api('/auth/session');
      customer = data.customer;
      updateAccountUI();
    } catch (e) {
      customer = null;
      updateAccountUI();
    }
  }

  function updateAccountUI() {
    const container = $('#account-menu');
    if (!container) return;
    if (customer) {
      container.innerHTML = `
        <button id="account-btn" class="stb-nav-link flex items-center gap-2">
          <span class="material-symbols-outlined">account_circle</span>
          <span class="hidden sm:inline">${escapeHtml(customer.name)}</span>
        </button>
        <div id="account-dropdown" class="hidden absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-[#E8E4DE] p-3 min-w-[180px] z-50">
          <a href="#" class="block px-3 py-2 text-sm font-semibold hover:bg-[#FBF7F0] rounded-lg" data-action="profile">My Profile</a>
          <a href="#" class="block px-3 py-2 text-sm font-semibold hover:bg-[#FBF7F0] rounded-lg" data-action="bookings">My Bookings</a>
          <a href="#" class="block px-3 py-2 text-sm font-semibold hover:bg-[#FBF7F0] rounded-lg text-red-600" data-action="logout">Logout</a>
        </div>`;
    } else {
      container.innerHTML = `
        <button id="account-btn" class="stb-nav-link flex items-center gap-2">
          <span class="material-symbols-outlined">account_circle</span>
          <span class="hidden sm:inline">Account</span>
        </button>`;
    }
    bindAccountMenu();
  }

  function bindAccountMenu() {
    const btn = $('#account-btn');
    const drop = $('#account-dropdown');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!customer) return openAuthModal();
      drop?.classList.toggle('hidden');
    });
    $$('#account-dropdown [data-action]').forEach(a => {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        $('#account-dropdown')?.classList.add('hidden');
        const action = a.dataset.action;
        if (action === 'profile') openProfileModal();
        if (action === 'bookings') openBookingsModal();
        if (action === 'logout') { await api('/auth/logout', { method: 'POST' }); customer = null; updateAccountUI(); }
      });
    });
  }

  function openAuthModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button class="absolute top-4 right-4 text-gray-500 hover:text-black" id="close-auth"><span class="material-symbols-outlined">close</span></button>
        <h2 class="font-display text-xl font-bold mb-1">STB Account</h2>
        <p class="text-sm text-gray-600 mb-5">Sign in to view your booking history, or continue as a guest.</p>
        <form id="auth-form" class="space-y-4">
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label><input type="email" id="auth-email" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold focus:border-[#E31E24] focus:outline-none" required></div>
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Password</label><input type="password" id="auth-password" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold focus:border-[#E31E24] focus:outline-none" required></div>
          <button type="submit" class="w-full bg-[#E31E24] text-white font-bold py-3 rounded-xl shadow-lg hover:brightness-95">Sign In</button>
        </form>
        <div class="mt-4 text-center text-sm">
          <a href="#" class="text-[#E31E24] font-semibold" id="show-register">Create account</a> · <a href="#" class="text-gray-600" id="show-forgot">Forgot password?</a>
        </div>
        <form id="register-form" class="space-y-4 hidden">
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Name</label><input type="text" id="reg-name" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold" required></div>
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label><input type="email" id="reg-email" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold" required></div>
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Password</label><input type="password" id="reg-password" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold" required minlength="8"></div>
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Phone</label><input type="tel" id="reg-phone" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold"></div>
          <button type="submit" class="w-full bg-[#E31E24] text-white font-bold py-3 rounded-xl shadow-lg hover:brightness-95">Create Account</button>
          <p class="text-center text-sm mt-2"><a href="#" class="text-gray-600" id="show-login">Already have an account? Sign in</a></p>
        </form>
      </div>`;
    document.body.appendChild(modal);
    $('#close-auth').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    $('#show-register').addEventListener('click', (e) => { e.preventDefault(); $('#auth-form').classList.add('hidden'); $('#register-form').classList.remove('hidden'); });
    $('#show-login').addEventListener('click', (e) => { e.preventDefault(); $('#register-form').classList.add('hidden'); $('#auth-form').classList.remove('hidden'); });
    $('#show-forgot').addEventListener('click', async (e) => {
      e.preventDefault();
      const email = $('#auth-email').value.trim();
      if (!email) return alert('Enter your email');
      try { await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }); alert('If an account exists, a reset link has been sent.'); } catch (err) { alert(err.message); }
    });

    $('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: $('#auth-email').value.trim(), password: $('#auth-password').value })
        });
        customer = data.customer;
        modal.remove();
        updateAccountUI();
        openBookingsModal();
      } catch (err) { alert(err.message); }
    });

    $('#register-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: $('#reg-name').value.trim(),
            email: $('#reg-email').value.trim(),
            password: $('#reg-password').value,
            phone: $('#reg-phone').value.trim()
          })
        });
        customer = data.customer;
        modal.remove();
        updateAccountUI();
        alert('Account created. Please verify your email (dev mode: verification is automatic).');
      } catch (err) { alert(err.message); }
    });
  }

  async function openBookingsModal() {
    const data = await api('/customer/bookings');
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4';
    const rows = data.bookings?.length ? data.bookings.map(b => `
      <tr class="border-b border-[#E8E4DE]">
        <td class="py-3 px-2 font-bold">${escapeHtml(b.voucher_code)}</td>
        <td class="py-3 px-2">${escapeHtml(b.pickup)}${b.destination ? ` → ${escapeHtml(b.destination)}` : ''}</td>
        <td class="py-3 px-2">${b.date_time ? new Date(b.date_time).toLocaleString() : '-'}</td>
        <td class="py-3 px-2"><span class="inline-block px-2 py-1 rounded-full text-xs font-bold ${statusClass(b.status)}">${(b.status || 'PENDING').replace(/_/g, ' ')}</span></td>
      </tr>`).join('') : '<tr><td colspan="4" class="py-8 text-center text-gray-500">No bookings yet.</td></tr>';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 relative">
        <button class="absolute top-4 right-4 text-gray-500 hover:text-black" id="close-bookings"><span class="material-symbols-outlined">close</span></button>
        <h2 class="font-display text-xl font-bold mb-4">My Bookings</h2>
        <table class="w-full text-sm">
          <thead><tr class="text-left text-xs uppercase text-gray-500 border-b border-[#E8E4DE]"><th class="py-2">Ref</th><th class="py-2">Route</th><th class="py-2">Date/Time</th><th class="py-2">Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    document.body.appendChild(modal);
    $('#close-bookings').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  function statusClass(status) {
    if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
    if (status === 'CANCELLED' || status === 'NO_SHOW') return 'bg-red-100 text-red-700';
    if (['DRIVER_EN_ROUTE','ARRIVED','IN_PROGRESS'].includes(status)) return 'bg-green-100 text-green-700';
    if (status === 'CONFIRMED' || status === 'ASSIGNED') return 'bg-blue-100 text-blue-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  function openProfileModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button class="absolute top-4 right-4 text-gray-500 hover:text-black" id="close-profile"><span class="material-symbols-outlined">close</span></button>
        <h2 class="font-display text-xl font-bold mb-4">My Profile</h2>
        <form id="profile-form" class="space-y-4">
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Name</label><input type="text" id="profile-name" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold" value="${escapeHtml(customer.name || '')}"></div>
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">Phone</label><input type="tel" id="profile-phone" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold" value="${escapeHtml(customer.phone || '')}"></div>
          <div><label class="block text-xs font-bold uppercase text-gray-500 mb-1">WhatsApp</label><input type="tel" id="profile-whatsapp" class="w-full border border-[#E8E4DE] rounded-xl px-4 py-3 font-semibold" value="${escapeHtml(customer.whatsapp || '')}"></div>
          <button type="submit" class="w-full bg-[#E31E24] text-white font-bold py-3 rounded-xl shadow-lg hover:brightness-95">Save</button>
        </form>
      </div>`;
    document.body.appendChild(modal);
    $('#close-profile').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    $('#profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const data = await api('/customer/profile', {
          method: 'PUT',
          body: JSON.stringify({
            name: $('#profile-name').value.trim(),
            phone: $('#profile-phone').value.trim(),
            whatsapp: $('#profile-whatsapp').value.trim()
          })
        });
        customer = data.customer;
        updateAccountUI();
        modal.remove();
      } catch (err) { alert(err.message); }
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.warn('[SW] registration failed', err));
    }
  }

  function init() {
    loadConfig();
    loadSession();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
