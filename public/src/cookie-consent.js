/**
 * STB Singapore — Cookie Consent & Google Consent Mode v2
 * Supports: Necessary, Functional, Analytics, Marketing
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'stb_cookie_consent';
  const CONSENT_VERSION = '1';

  // Default / denied state for Consent Mode v2
  const DEFAULT_CONSENT = {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
  };

  function readConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.v !== CONSENT_VERSION) return null;
      return parsed.categories;
    } catch {
      return null;
    }
  }

  function writeConsent(categories) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: CONSENT_VERSION, categories }));
    } catch {}
  }

  function applyConsent(categories) {
    const gtagConsent = {
      ad_storage: categories.marketing ? 'granted' : 'denied',
      analytics_storage: categories.analytics ? 'granted' : 'denied',
      functionality_storage: categories.functional ? 'granted' : 'denied',
      personalization_storage: categories.marketing ? 'granted' : 'denied',
      security_storage: 'granted',
    };

    if (typeof gtag === 'function') {
      gtag('consent', 'update', gtagConsent);
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'consent_updated', consent: gtagConsent });
  }

  function buildBanner() {
    const el = document.createElement('div');
    el.id = 'stb-cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie consent');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = `
      <div id="stb-cookie-banner" class="stb-cookie-banner">
        <div class="stb-cookie-content">
          <div>
            <strong class="stb-cookie-title">We value your privacy</strong>
            <p class="stb-cookie-text">We use cookies to enhance your experience, analyze site traffic, and serve personalized content. You can customize your preferences or accept all cookies.</p>
          </div>
          <div class="stb-cookie-actions">
            <button id="stb-cookie-customize" class="stb-cookie-btn ghost">Customize</button>
            <button id="stb-cookie-reject" class="stb-cookie-btn ghost">Reject All</button>
            <button id="stb-cookie-accept" class="stb-cookie-btn primary">Accept All</button>
          </div>
        </div>
        <div id="stb-cookie-preferences" class="stb-cookie-prefs hidden">
          <label class="stb-cookie-pref-item">
            <input type="checkbox" checked disabled />
            <span><strong>Necessary</strong> — Required for the site to function. Cannot be disabled.</span>
          </label>
          <label class="stb-cookie-pref-item">
            <input type="checkbox" id="pref-functional" />
            <span><strong>Functional</strong> — Remember preferences and settings.</span>
          </label>
          <label class="stb-cookie-pref-item">
            <input type="checkbox" id="pref-analytics" />
            <span><strong>Analytics</strong> — Help us understand how visitors interact with the site.</span>
          </label>
          <label class="stb-cookie-pref-item">
            <input type="checkbox" id="pref-marketing" />
            <span><strong>Marketing</strong> — Used to deliver relevant advertisements.</span>
          </label>
          <button id="stb-cookie-save" class="stb-cookie-btn primary">Save Preferences</button>
        </div>
      </div>
    `;
    return el;
  }

  function showBanner() {
    if (document.getElementById('stb-cookie-banner')) return;
    const banner = buildBanner();
    document.body.appendChild(banner);

    banner.querySelector('#stb-cookie-accept').addEventListener('click', () => {
      const all = { necessary: true, functional: true, analytics: true, marketing: true };
      writeConsent(all);
      applyConsent(all);
      banner.remove();
    });

    banner.querySelector('#stb-cookie-reject').addEventListener('click', () => {
      const minimal = { necessary: true, functional: false, analytics: false, marketing: false };
      writeConsent(minimal);
      applyConsent(minimal);
      banner.remove();
    });

    banner.querySelector('#stb-cookie-customize').addEventListener('click', () => {
      banner.querySelector('#stb-cookie-preferences').classList.remove('hidden');
    });

    banner.querySelector('#stb-cookie-save').addEventListener('click', () => {
      const custom = {
        necessary: true,
        functional: banner.querySelector('#pref-functional').checked,
        analytics: banner.querySelector('#pref-analytics').checked,
        marketing: banner.querySelector('#pref-marketing').checked,
      };
      writeConsent(custom);
      applyConsent(custom);
      banner.remove();
    });
  }

  // ─── Init ───
  const existing = readConsent();
  if (existing) {
    applyConsent(existing);
  } else {
    // Set default denied before gtag config loads
    if (typeof gtag === 'function') {
      gtag('consent', 'default', DEFAULT_CONSENT);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
