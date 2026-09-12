// STB Singapore — Admin Panel Frontend Controller

let currentPricingData = null;
let googleMapsLoaded = false;
let pendingEmail = '';

// DOM Helpers
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function showToast(message, type = 'success') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size: 20px;">
      ${type === 'success' ? 'check_circle' : 'error'}
    </span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── AUTHENTICATION LOGIC ───
async function checkAuthSession() {
  try {
    const res = await fetch('/api/admin/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated || data.email) {
        onAuthSuccess(data.email);
        return;
      }
    }
    showAuthModal();
  } catch (err) {
    showAuthModal();
  }
}

function showAuthModal() {
  $('#auth-overlay').style.display = 'flex';
  $('#admin-app').style.display = 'none';
  $('#form-request-otp').style.display = 'block';
  $('#form-verify-otp').style.display = 'none';
  $('#auth-step-desc').textContent = 'Enter your authorized email address to receive a secure one-time login code.';
}

function onAuthSuccess(email) {
  $('#auth-overlay').style.display = 'none';
  $('#admin-app').style.display = 'block';
  $('#user-email-display').textContent = email || 'Admin';
  loadConfigAndMaps();
  loadPricingData();
  loadAuditLogs();
}

// Request OTP Event
$('#form-request-otp').addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailInput = $('#admin-email-input');
  const btn = $('#btn-send-otp');
  const email = emailInput.value.trim();

  if (!email) return;
  btn.disabled = true;
  btn.textContent = 'Sending Code...';

  try {
    const res = await fetch('/api/admin/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      pendingEmail = email;
      sessionStorage.setItem('stb_pending_admin_email', email);
      $('#form-request-otp').style.display = 'none';
      $('#form-verify-otp').style.display = 'block';
      $('#auth-step-desc').innerHTML = `We generated a 6-digit code for <strong>${email}</strong>.<br><span style="font-size: 0.78rem; color: #1B7B3F; font-weight: 700;">Check your server terminal console for the code.</span>`;
      $('#admin-otp-input').value = '';
      $('#admin-otp-input').focus();
      showToast(data.message || 'Verification code generated.');
    } else {
      showToast(data.error || 'Failed to send verification code.', 'error');
    }
  } catch (err) {
    showToast('Network error while requesting code.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Verification Code';
  }
});

// Verify OTP Event
$('#form-verify-otp').addEventListener('submit', async (e) => {
  e.preventDefault();
  const otpInput = $('#admin-otp-input');
  const btn = $('#btn-submit-otp');
  const otp = otpInput.value.trim();
  const emailToVerify = pendingEmail || sessionStorage.getItem('stb_pending_admin_email') || $('#admin-email-input').value.trim();

  if (!emailToVerify) {
    showToast('Admin email missing. Please re-enter your email.', 'error');
    $('#btn-back-email').click();
    return;
  }

  if (otp.length !== 6) {
    showToast('Please enter a 6-digit numeric code.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verifying...';

  try {
    const res = await fetch('/api/admin/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailToVerify, otp })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      sessionStorage.removeItem('stb_pending_admin_email');
      showToast('Signed in successfully.');
      onAuthSuccess(data.email || emailToVerify);
    } else {
      showToast(data.error || 'Invalid verification code.', 'error');
    }
  } catch (err) {
    showToast('Network error during verification.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify & Sign In';
  }
});

$('#btn-back-email').addEventListener('click', () => {
  $('#form-verify-otp').style.display = 'none';
  $('#form-request-otp').style.display = 'block';
  $('#auth-step-desc').textContent = 'Enter your authorized email address to receive a secure one-time login code.';
});

$('#btn-resend-otp').addEventListener('click', () => {
  $('#form-request-otp').dispatchEvent(new Event('submit'));
});

// Logout
$('#btn-logout').addEventListener('click', async () => {
  try {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
  } catch (e) {}
  showToast('Signed out.');
  showAuthModal();
});

// ─── TAB NAVIGATION ───
$$('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.nav-tab').forEach((t) => t.classList.remove('active'));
    $$('.view-section').forEach((s) => s.classList.remove('active'));

    tab.classList.add('active');
    const targetId = tab.dataset.tab;
    const targetSection = $(`#${targetId}`);
    if (targetSection) targetSection.classList.add('active');

    if (targetId === 'tab-audit') {
      loadAuditLogs();
    }
  });
});

// ─── LOAD DATA & GOOGLE MAPS ───
async function loadConfigAndMaps() {
  if (googleMapsLoaded) return;
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (config.googleMapsApiKey) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}&libraries=places`;
      script.async = true;
      script.onload = () => {
        googleMapsLoaded = true;
        initPlacesAutocomplete();
      };
      document.head.appendChild(script);
    }
  } catch (err) {
    console.warn('[ADMIN] Could not load Google Maps API key:', err);
  }
}

async function loadPricingData() {
  try {
    const res = await fetch('/api/admin/pricing');
    if (!res.ok) {
      if (res.status === 401) return showAuthModal();
      throw new Error('Failed to load pricing data');
    }
    const data = await res.json();
    if (data.success) {
      currentPricingData = data;
      renderDistanceRules(data.rules);
      renderCharterRules(data.rules);
      renderOverrides(data.overrides, data.vehicles);
      renderSurcharges(data.surcharges);
      populateVehicleSelect(data.vehicles);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ─── TAB 1: RENDER & SAVE DISTANCE RULES ───
function renderDistanceRules(rules) {
  const tbody = $('#distance-rules-tbody');
  tbody.innerHTML = '';

  rules.forEach((rule) => {
    const tr = document.createElement('tr');
    tr.dataset.vehicleId = rule.vehicle_id;
    tr.innerHTML = `
      <td><strong>${rule.vehicle_name}</strong></td>
      <td>
        <div class="input-prefix-wrapper" style="max-width: 150px;">
          <span class="input-prefix">SGD</span>
          <input type="number" step="0.5" min="0" class="form-input rule-base-fare" value="${parseFloat(rule.base_fare).toFixed(2)}">
        </div>
      </td>
      <td>
        <div class="input-prefix-wrapper" style="max-width: 150px;">
          <span class="input-prefix">SGD</span>
          <input type="number" step="0.1" min="0" class="form-input rule-km-rate" value="${parseFloat(rule.per_km_rate).toFixed(2)}">
        </div>
      </td>
      <td>
        <div class="input-prefix-wrapper" style="max-width: 150px;">
          <span class="input-prefix">SGD</span>
          <input type="number" step="0.5" min="0" class="form-input rule-min-fare" value="${parseFloat(rule.minimum_fare || rule.base_fare).toFixed(2)}">
        </div>
      </td>
      <td>
        <span class="${rule.is_active ? 'badge-active' : 'badge-inactive'}">
          ${rule.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

$('#btn-save-distance-rules').addEventListener('click', async () => {
  const btn = $('#btn-save-distance-rules');
  const rows = $$('#distance-rules-tbody tr');
  const updatedRules = [];

  rows.forEach((row) => {
    const vehicleId = row.dataset.vehicleId;
    const baseFare = parseFloat(row.querySelector('.rule-base-fare').value) || 0;
    const perKmRate = parseFloat(row.querySelector('.rule-km-rate').value) || 0;
    const minimumFare = parseFloat(row.querySelector('.rule-min-fare').value) || 0;

    const existingRule = currentPricingData.rules.find((r) => String(r.vehicle_id) === String(vehicleId));
    updatedRules.push({
      vehicle_id: vehicleId,
      base_fare: baseFare,
      per_km_rate: perKmRate,
      minimum_fare: minimumFare,
      hourly_rate: existingRule ? existingRule.hourly_rate : 60,
      daily_rate: existingRule ? existingRule.daily_rate : 450,
      is_active: true
    });
  });

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/admin/pricing/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: updatedRules })
    });
    const result = await res.json();
    if (res.ok && result.success) {
      showToast('Distance pricing rules saved successfully.');
      loadPricingData();
    } else {
      showToast(result.error || 'Failed to save rules', 'error');
    }
  } catch (err) {
    showToast('Network error while saving.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Pricing Rules';
  }
});

// ─── TAB 2: RENDER & SAVE CHARTER RULES ───
function renderCharterRules(rules) {
  const tbody = $('#charter-rules-tbody');
  tbody.innerHTML = '';

  rules.forEach((rule) => {
    const tr = document.createElement('tr');
    tr.dataset.vehicleId = rule.vehicle_id;
    tr.innerHTML = `
      <td><strong>${rule.vehicle_name}</strong></td>
      <td>
        <div class="input-prefix-wrapper" style="max-width: 180px;">
          <span class="input-prefix">SGD</span>
          <input type="number" step="1" min="0" class="form-input rule-hourly-rate" value="${parseFloat(rule.hourly_rate).toFixed(2)}">
        </div>
      </td>
      <td>
        <div class="input-prefix-wrapper" style="max-width: 180px;">
          <span class="input-prefix">SGD</span>
          <input type="number" step="5" min="0" class="form-input rule-daily-rate" value="${parseFloat(rule.daily_rate).toFixed(2)}">
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

$('#btn-save-charter-rules').addEventListener('click', async () => {
  const btn = $('#btn-save-charter-rules');
  const rows = $$('#charter-rules-tbody tr');
  const updatedRules = [];

  rows.forEach((row) => {
    const vehicleId = row.dataset.vehicleId;
    const hourlyRate = parseFloat(row.querySelector('.rule-hourly-rate').value) || 0;
    const dailyRate = parseFloat(row.querySelector('.rule-daily-rate').value) || 0;

    const existingRule = currentPricingData.rules.find((r) => String(r.vehicle_id) === String(vehicleId));
    updatedRules.push({
      vehicle_id: vehicleId,
      base_fare: existingRule ? existingRule.base_fare : 40,
      per_km_rate: existingRule ? existingRule.per_km_rate : 2.2,
      minimum_fare: existingRule ? existingRule.minimum_fare : 40,
      hourly_rate: hourlyRate,
      daily_rate: dailyRate,
      is_active: true
    });
  });

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/admin/pricing/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: updatedRules })
    });
    const result = await res.json();
    if (res.ok && result.success) {
      showToast('Charter rates saved successfully.');
      loadPricingData();
    } else {
      showToast(result.error || 'Failed to save charter rates', 'error');
    }
  } catch (err) {
    showToast('Network error while saving.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Charter Rates';
  }
});

// ─── TAB 3: ROUTE OVERRIDES & GOOGLE PLACES ───
function populateVehicleSelect(vehicles) {
  const select = $('#override-vehicle-select');
  select.innerHTML = '';
  vehicles.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.name} (${v.description || 'Standard'})`;
    select.appendChild(opt);
  });
}

function initPlacesAutocomplete() {
  if (!window.google || !window.google.maps || !window.google.maps.places) return;

  const originInput = $('#override-origin-input');
  const destInput = $('#override-dest-input');

  const originAuto = new google.maps.places.Autocomplete(originInput, {
    fields: ['place_id', 'name', 'formatted_address']
  });

  originAuto.addListener('place_changed', () => {
    const place = originAuto.getPlace();
    if (place && place.place_id) {
      $('#override-origin-placeid').value = place.place_id;
      $('#override-origin-name').value = place.name || place.formatted_address;
    }
  });

  const destAuto = new google.maps.places.Autocomplete(destInput, {
    fields: ['place_id', 'name', 'formatted_address']
  });

  destAuto.addListener('place_changed', () => {
    const place = destAuto.getPlace();
    if (place && place.place_id) {
      $('#override-dest-placeid').value = place.place_id;
      $('#override-dest-name').value = place.name || place.formatted_address;
    }
  });
}

function renderOverrides(overrides) {
  const tbody = $('#overrides-list-tbody');
  tbody.innerHTML = '';

  if (!overrides || overrides.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 24px;">No route overrides configured. KM-based fallback rates will apply.</td></tr>`;
    return;
  }

  overrides.forEach((o) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${o.vehicle_name}</strong></td>
      <td>
        <div><strong>${o.origin_display_name}</strong></div>
        <div style="font-size: 0.72rem; color: var(--text-light); font-family: monospace;">ID: ${o.origin_place_id.slice(0, 16)}...</div>
      </td>
      <td>
        <div><strong>${o.destination_display_name}</strong></div>
        <div style="font-size: 0.72rem; color: var(--text-light); font-family: monospace;">ID: ${o.destination_place_id.slice(0, 16)}...</div>
      </td>
      <td><strong style="color: var(--color-red);">SGD ${parseFloat(o.fixed_price).toFixed(2)}</strong></td>
      <td>
        <span class="${o.is_active ? 'badge-active' : 'badge-inactive'}">
          ${o.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <button class="btn-danger btn-delete-override" data-id="${o.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  $$('.btn-delete-override').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      if (!confirm('Are you sure you want to delete this route override?')) return;

      try {
        const res = await fetch(`/api/admin/pricing/overrides/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('Route override deleted.');
          loadPricingData();
        } else {
          showToast(data.error || 'Failed to delete', 'error');
        }
      } catch (err) {
        showToast('Network error.', 'error');
      }
    });
  });
}

$('#form-add-override').addEventListener('submit', async (e) => {
  e.preventDefault();

  const vehicle_id = $('#override-vehicle-select').value;
  const fixed_price = parseFloat($('#override-price-input').value);
  const origin_place_id = $('#override-origin-placeid').value || $('#override-origin-input').value.trim();
  const destination_place_id = $('#override-dest-placeid').value || $('#override-dest-input').value.trim();
  const origin_display_name = $('#override-origin-name').value || $('#override-origin-input').value.trim();
  const destination_display_name = $('#override-dest-name').value || $('#override-dest-input').value.trim();

  if (!origin_place_id || !destination_place_id || !fixed_price) {
    showToast('Please select valid pickup, destination, and fixed price.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/admin/pricing/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id,
        origin_place_id,
        destination_place_id,
        origin_display_name,
        destination_display_name,
        fixed_price,
        is_active: true
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Fixed price route override added.');
      $('#form-add-override').reset();
      $('#override-origin-placeid').value = '';
      $('#override-dest-placeid').value = '';
      $('#override-origin-name').value = '';
      $('#override-dest-name').value = '';
      loadPricingData();
    } else {
      showToast(data.error || 'Failed to add override', 'error');
    }
  } catch (err) {
    showToast('Network error adding override.', 'error');
  }
});

// ─── TAB 4: RENDER & SAVE SURCHARGES ───
function renderSurcharges(surcharges) {
  const tbody = $('#surcharges-tbody');
  tbody.innerHTML = '';

  surcharges.forEach((sc) => {
    const tr = document.createElement('tr');
    tr.dataset.surchargeId = sc.id;
    tr.innerHTML = `
      <td><strong>${sc.name}</strong></td>
      <td>
        <select class="form-select sc-type" style="padding: 6px 10px; width: 110px;">
          <option value="flat" ${sc.type === 'flat' ? 'selected' : ''}>Flat (SGD)</option>
          <option value="percentage" ${sc.type === 'percentage' ? 'selected' : ''}>Percent (%)</option>
        </select>
      </td>
      <td>
        <input type="number" step="0.5" min="0" class="form-input sc-value" value="${parseFloat(sc.value).toFixed(2)}" style="width: 100px; padding: 6px 10px;">
      </td>
      <td>
        <input type="time" class="form-input sc-start" value="${sc.start_time.slice(0, 5)}" style="width: 120px; padding: 6px 10px;">
      </td>
      <td>
        <input type="time" class="form-input sc-end" value="${sc.end_time.slice(0, 5)}" style="width: 120px; padding: 6px 10px;">
      </td>
      <td>
        <select class="form-select sc-mode" style="padding: 6px 10px; width: 110px;">
          <option value="ALL" ${sc.applicable_mode === 'ALL' ? 'selected' : ''}>All Modes</option>
          <option value="ONE_WAY" ${sc.applicable_mode === 'ONE_WAY' ? 'selected' : ''}>One Way Only</option>
          <option value="HOURLY" ${sc.applicable_mode === 'HOURLY' ? 'selected' : ''}>Hourly Only</option>
          <option value="DAILY" ${sc.applicable_mode === 'DAILY' ? 'selected' : ''}>Daily Only</option>
        </select>
      </td>
      <td>
        <input type="checkbox" class="sc-active" ${sc.is_active ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--color-red);">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

$('#btn-save-surcharges').addEventListener('click', async () => {
  const btn = $('#btn-save-surcharges');
  const rows = $$('#surcharges-tbody tr');
  const updatedSurcharges = [];

  rows.forEach((row) => {
    const id = row.dataset.surchargeId;
    const type = row.querySelector('.sc-type').value;
    const value = parseFloat(row.querySelector('.sc-value').value) || 0;
    const start_time = row.querySelector('.sc-start').value + ':00';
    const end_time = row.querySelector('.sc-end').value + ':00';
    const applicable_mode = row.querySelector('.sc-mode').value;
    const is_active = row.querySelector('.sc-active').checked;

    const existing = currentPricingData.surcharges.find((s) => String(s.id) === String(id));
    updatedSurcharges.push({
      id,
      name: existing ? existing.name : 'Surcharge',
      type,
      value,
      start_time,
      end_time,
      applicable_mode,
      is_active
    });
  });

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/admin/pricing/surcharges', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surcharges: updatedSurcharges })
    });
    const result = await res.json();
    if (res.ok && result.success) {
      showToast('Surcharges updated successfully.');
      loadPricingData();
    } else {
      showToast(result.error || 'Failed to save surcharges', 'error');
    }
  } catch (err) {
    showToast('Network error while saving.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Surcharges';
  }
});

// ─── TAB 5: AUDIT LOGS ───
async function loadAuditLogs() {
  const tbody = $('#audit-tbody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">Loading audit timeline...</td></tr>`;

  try {
    const res = await fetch('/api/admin/audit');
    if (!res.ok) throw new Error('Failed to load audit logs');
    const data = await res.json();

    tbody.innerHTML = '';
    if (!data.logs || data.logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">No audit records found.</td></tr>`;
      return;
    }

    data.logs.forEach((log) => {
      const date = new Date(log.changed_at);
      const formattedDate = date.toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' });

      let diffHtml = '<div style="font-size: 0.78rem; font-family: monospace;">';
      if (log.new_values) {
        diffHtml += `<span style="color: var(--color-emerald);">[NEW] ${JSON.stringify(log.new_values)}</span>`;
      }
      if (log.old_values) {
        diffHtml += `<br><span style="color: var(--text-light);">[PREV] ${JSON.stringify(log.old_values)}</span>`;
      }
      diffHtml += '</div>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="white-space: nowrap; font-size: 0.8rem;">${formattedDate}</td>
        <td><strong>${log.admin_email}</strong></td>
        <td><span style="font-size: 0.78rem; padding: 2px 6px; background: var(--bg-subtle); border-radius: 4px;">${log.table_name}</span></td>
        <td><span class="badge-active" style="font-size: 0.7rem;">${log.action}</span></td>
        <td style="max-width: 450px; overflow-x: auto;">${diffHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--color-red); padding: 20px;">Failed to load audit history.</td></tr>`;
  }
}

$('#btn-refresh-audit').addEventListener('click', () => {
  loadAuditLogs();
  showToast('Audit log refreshed.');
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  checkAuthSession();
});
