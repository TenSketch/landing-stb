/**
 * STB Singapore — Enterprise Analytics Module
 * Supports Google Analytics 4 with Google Consent Mode v2
 * All event names follow GA4 recommended naming conventions.
 */

(function () {
  'use strict';

  // ─── Config ───
  const CONFIG = {
    // Read from global window.__STB_ENV injected by server or fallback
    gaId: (typeof window !== 'undefined' && window.__STB_ENV?.GA_MEASUREMENT_ID) || 'G-L1SLZX61TK',
    debug: (typeof window !== 'undefined' && window.__STB_ENV?.GA_DEBUG_MODE === 'true'),
  };

  // ─── Helpers ───
  function log(...args) {
    if (CONFIG.debug) console.log('[STB Analytics]', ...args);
  }

  function isGtagReady() {
    return typeof gtag === 'function';
  }

  function safeGtag(cmd, eventName, params = {}) {
    if (!isGtagReady()) {
      log('gtag not ready, queuing:', cmd, eventName, params);
      return;
    }
    try {
      gtag(cmd, eventName, params);
      log('sent:', eventName, params);
    } catch (e) {
      console.warn('[STB Analytics] gtag error:', e);
    }
  }

  // ─── Core Events ───
  const Analytics = {
    /**
     * Page view — called on initial load and SPA route changes
     */
    pageView: (pageTitle, pageLocation) => {
      safeGtag('event', 'page_view', {
        page_title: pageTitle || document.title,
        page_location: pageLocation || window.location.href,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Generic CTA click
     */
    ctaClick: (ctaName, ctaLocation = 'body') => {
      safeGtag('event', 'cta_click', {
        cta_name: ctaName,
        cta_location: ctaLocation,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * WhatsApp click
     */
    whatsAppClick: (context = 'floating') => {
      safeGtag('event', 'whatsapp_click', {
        context,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Booking form submission
     */
    formSubmit: (formName, success = true) => {
      safeGtag('event', 'form_submit', {
        form_name: formName,
        success,
        send_to: CONFIG.gaId,
      });
      if (success) {
        safeGtag('event', 'conversion', {
          conversion_name: 'booking_submitted',
          send_to: CONFIG.gaId,
        });
      }
    },

    /**
     * Form validation error
     */
    formError: (formName, fieldName, errorMessage) => {
      safeGtag('event', 'form_error', {
        form_name: formName,
        field_name: fieldName,
        error_message: errorMessage,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Booking type / service selection
     */
    bookingTypeSelect: (type) => {
      safeGtag('event', 'select_content', {
        content_type: 'booking_type',
        item_id: type,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Trip mode selection (one way / return / hourly)
     */
    tripModeSelect: (mode) => {
      safeGtag('event', 'select_content', {
        content_type: 'trip_mode',
        item_id: mode,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Pickup location selection
     */
    pickupSelect: (location) => {
      safeGtag('event', 'select_content', {
        content_type: 'pickup_location',
        item_id: location,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Drop / destination location selection
     */
    dropSelect: (location) => {
      safeGtag('event', 'select_content', {
        content_type: 'drop_location',
        item_id: location,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Fleet card click
     */
    fleetCardClick: (vehicleId, vehicleName) => {
      safeGtag('event', 'select_item', {
        item_list_name: 'fleet',
        item_id: vehicleId,
        item_name: vehicleName,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Destination card click
     */
    destinationCardClick: (destinationName) => {
      safeGtag('event', 'select_content', {
        content_type: 'destination',
        item_id: destinationName,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * FAQ open
     */
    faqOpen: (questionText) => {
      safeGtag('event', 'faq_open', {
        question: questionText,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Phone click
     */
    phoneClick: (number = '+65 9123 4567') => {
      safeGtag('event', 'phone_click', {
        phone_number: number,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Email click
     */
    emailClick: (email = 'dispatch@stbsingapore.com') => {
      safeGtag('event', 'email_click', {
        email_address: email,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Scroll depth milestone (25%, 50%, 75%, 90%, 100%)
     */
    scrollDepth: (percent) => {
      safeGtag('event', 'scroll_depth', {
        percent_scrolled: percent,
        page_title: document.title,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Outbound link click
     */
    outboundLink: (url, domain) => {
      safeGtag('event', 'outbound_click', {
        url,
        domain: domain || new URL(url).hostname,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Time on page (custom event every 30s)
     */
    timeOnPage: (seconds) => {
      safeGtag('event', 'time_on_page', {
        duration_seconds: seconds,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Vehicle selection in booking widget
     */
    vehicleSelect: (vehicleId, vehicleName, price) => {
      safeGtag('event', 'select_item', {
        item_list_name: 'booking_widget_vehicle',
        item_id: vehicleId,
        item_name: vehicleName,
        price: price,
        currency: window.__STB_ENV?.CURRENCY || 'SGD',
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Review submission
     */
    reviewSubmit: (rating) => {
      safeGtag('event', 'review_submitted', {
        rating,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Currency change
     */
    currencyChange: (currency) => {
      safeGtag('event', 'select_content', {
        content_type: 'currency',
        item_id: currency,
        send_to: CONFIG.gaId,
      });
    },

    /**
     * Modal open
     */
    modalOpen: (modalName) => {
      safeGtag('event', 'modal_open', {
        modal_name: modalName,
        send_to: CONFIG.gaId,
      });
    },

    // ─── Mobile UX Conversion Event Aliases (No PII) ───
    bookingFormStart: () => {
      safeGtag('event', 'booking_form_start', { send_to: CONFIG.gaId });
    },
    airportTransferSelected: () => {
      safeGtag('event', 'airport_transfer_selected', { send_to: CONFIG.gaId });
    },
    pickupSearch: () => {
      safeGtag('event', 'pickup_search', { send_to: CONFIG.gaId });
    },
    pickupSelected: (loc) => {
      safeGtag('event', 'pickup_selected', { location: loc, send_to: CONFIG.gaId });
    },
    useLocationClicked: () => {
      safeGtag('event', 'use_location_clicked', { send_to: CONFIG.gaId });
    },
    geolocationSuccess: () => {
      safeGtag('event', 'geolocation_success', { send_to: CONFIG.gaId });
    },
    geolocationFailed: (reason) => {
      safeGtag('event', 'geolocation_failed', { reason: reason || 'unknown', send_to: CONFIG.gaId });
    },
    destinationSelected: (loc) => {
      safeGtag('event', 'destination_selected', { location: loc, send_to: CONFIG.gaId });
    },
    airportDetected: (type) => {
      safeGtag('event', 'airport_detected', { airport_type: type, send_to: CONFIG.gaId });
    },
    airportTerminalSelected: (term) => {
      safeGtag('event', 'airport_terminal_selected', { terminal: term, send_to: CONFIG.gaId });
    },
    flightNumberAdded: () => {
      safeGtag('event', 'flight_number_added', { send_to: CONFIG.gaId });
    },
    bookingTypeSelected: (type) => {
      safeGtag('event', 'booking_type_selected', { booking_type: type, send_to: CONFIG.gaId });
    },
    hourlySelected: () => {
      safeGtag('event', 'hourly_selected', { send_to: CONFIG.gaId });
    },
    dailySelected: () => {
      safeGtag('event', 'daily_selected', { send_to: CONFIG.gaId });
    },
    bookingSubmitAttempt: () => {
      safeGtag('event', 'booking_submit_attempt', { send_to: CONFIG.gaId });
    },
    bookingSubmitted: () => {
      safeGtag('event', 'booking_submitted', { send_to: CONFIG.gaId });
    },
    adminEmailSent: () => {
      safeGtag('event', 'admin_email_sent', { send_to: CONFIG.gaId });
    },
    customerEmailSent: () => {
      safeGtag('event', 'customer_email_sent', { send_to: CONFIG.gaId });
    },
    whatsappOpenAttempt: () => {
      safeGtag('event', 'whatsapp_open_attempt', { send_to: CONFIG.gaId });
    },
    whatsappOpened: () => {
      safeGtag('event', 'whatsapp_opened', { send_to: CONFIG.gaId });
    },
    bookingSuccess: () => {
      safeGtag('event', 'booking_success', { send_to: CONFIG.gaId });
    },
    emailInquiry: () => {
      safeGtag('event', 'email_inquiry', { send_to: CONFIG.gaId });
    },
    hourlyBookingSelected: () => {
      safeGtag('event', 'hourly_booking_selected', { send_to: CONFIG.gaId });
    },
    dailyBookingSelected: () => {
      safeGtag('event', 'daily_booking_selected', { send_to: CONFIG.gaId });
    },
    pointToPointSelected: () => {
      safeGtag('event', 'point_to_point_selected', { send_to: CONFIG.gaId });
    },
  };

  // ─── Scroll Depth Tracking ───
  (function initScrollDepth() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const milestones = [25, 50, 75, 90, 100];
    const fired = new Set();
    let maxScroll = 0;

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);
      if (pct > maxScroll) maxScroll = pct;

      for (const m of milestones) {
        if (maxScroll >= m && !fired.has(m)) {
          fired.add(m);
          Analytics.scrollDepth(m);
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  // ─── Time on Page ───
  (function initTimeOnPage() {
    if (typeof window === 'undefined') return;
    let seconds = 0;
    setInterval(() => {
      seconds += 30;
      Analytics.timeOnPage(seconds);
    }, 30000);
  })();

  // ─── Outbound Link Tracking ───
  (function initOutboundLinks() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('/')) return;
      if (!href.startsWith('http')) return;
      const url = new URL(href, window.location.href);
      if (url.hostname === window.location.hostname) return;
      Analytics.outboundLink(href, url.hostname);
    });
  })();

  // ─── Expose globally ───
  window.STBAnalytics = Analytics;
})();
