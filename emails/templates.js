// Email HTML templates — STB Singapore
// Both templates use table-based layouts for maximum email client compatibility.
// Brand palette matches the site (red #E31E24 + gold #D4A24A + cream #FBF7F0)

const escape = (s = '') => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Format ISO datetime-local ("2026-08-06T02:14") into "6 Aug 2026, 2:14 AM"
function fmtDateTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const day = d.getDate();
    const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const year = d.getFullYear();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return `${day} ${mon} ${year}, ${h}:${m} ${ampm}`;
  } catch { return String(iso); }
}

function rowTd(label, val, color) {
  if (!val) return '';
  return `<tr>
    <td style="padding:6px 0;font-size:12px;color:#6B6B6B;vertical-align:top;width:40%;">${escape(label)}</td>
    <td style="padding:6px 0;font-size:13px;font-weight:700;color:${color || '#141414'};vertical-align:top;width:60%;">${escape(val)}</td>
  </tr>`;
}

function nextStep(num, title, desc) {
  return `<tr>
    <td style="vertical-align:top;padding:8px 12px 8px 0;width:32px;">
      <div style="width:28px;height:28px;border-radius:50%;background:#FDECEC;color:#E31E24;font-size:11px;font-weight:800;line-height:28px;text-align:center;">${escape(num)}</div>
    </td>
    <td style="vertical-align:top;padding:8px 0;">
      <div style="font-size:13px;font-weight:700;color:#141414;">${escape(title)}</div>
      <div style="font-size:12px;color:#6B6B6B;line-height:1.5;">${escape(desc)}</div>
    </td>
  </tr>`;
}

function adminBlock(title, rows) {
  if (!rows || (Array.isArray(rows) && rows.length === 0)) return '';
  const renderedRows = Array.isArray(rows)
    ? rows.map(([label, val]) => `
      <tr>
        <td style="padding:4px 0;font-size:11px;color:#888888;width:40%;vertical-align:top;">${escape(label)}</td>
        <td style="padding:4px 0;font-size:12px;font-weight:700;color:#141414;width:60%;vertical-align:top;">${val}</td>
      </tr>
    `).join('')
    : `<tr><td style="padding:4px 0;font-size:12px;color:#141414;">${rows}</td></tr>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF7F0;border-radius:14px;padding:16px;margin-bottom:12px;">
      <tr>
        <td style="font-size:10px;font-weight:800;letter-spacing:0.18em;color:#B08536;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid rgba(20,20,20,0.06);">
          ${escape(title)}
        </td>
      </tr>
      <tr>
        <td style="padding-top:8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${renderedRows}
          </table>
        </td>
      </tr>
    </table>
  `;
}

// ============================================
// SHARED HEAD + WRAPPER
// ============================================
function shell({ title, preheader, bodyHtml, footerHtml, brand }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escape(title)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  body,table,td,a{ -webkit-text-size-adjust:100%;-ms-text-size-adjust:100%; }
  table,td{ mso-table-lspace:0pt;mso-table-rspace:0pt; }
  img{ -ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none; }
  body{ margin:0!important;padding:0!important;width:100%!important;background:#FBF7F0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
  .serif{ font-family: Georgia,'Times New Roman',serif; }
  a{ color:#E31E24;text-decoration:none; }
  @media only screen and (max-width:600px){
    .wrap{ width:100%!important; }
    .px{ padding-left:20px!important;padding-right:20px!important; }
    .h1{ font-size:26px!important;line-height:1.2!important; }
    .stack{ display:block!important;width:100%!important;padding-right:0!important;padding-left:0!important; }
    .stack-pad{ padding-top:16px!important; }
    .hide-sm{ display:none!important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FBF7F0;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escape(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF7F0;">
    <tr>
      <td align="center" style="padding:30px 12px;">
        <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(20,20,20,0.06);">

          <!-- Brand ribbon (thin gradient bar) -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg,#E31E24 0%,#D4A24A 50%,#E31E24 100%);">&nbsp;</td>
          </tr>

          <!-- Header with logo -->
          <tr>
            <td class="px" align="center" style="padding:32px 40px 20px 40px;">
              <img src="${escape(brand.logoUrl)}" width="120" alt="${escape(brand.name)}" style="display:block;width:120px;height:auto;margin:0 auto;" />
              <div class="serif" style="margin-top:12px;font-size:20px;font-weight:600;color:#141414;letter-spacing:-0.01em;">${escape(brand.name)}</div>
              <div style="margin-top:4px;font-size:10px;font-weight:800;letter-spacing:0.22em;color:#B08536;text-transform:uppercase;">${escape(brand.tagline)}</div>
            </td>
          </tr>

          ${bodyHtml}

          <!-- Footer -->
          <tr>
            <td style="background:#141414;padding:32px 40px;color:#B0B0B0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="stack" style="vertical-align:top;padding-right:20px;">
                    <div class="serif" style="font-size:16px;font-weight:600;color:#ffffff;margin-bottom:6px;">${escape(brand.name)}</div>
                    <div style="font-size:11px;line-height:1.6;color:#9a9a9a;">
                      Premium private transport &amp; tour booking service across Singapore &amp; Malaysia.
                    </div>
                  </td>
                  <td class="stack stack-pad" style="vertical-align:top;text-align:right;font-size:12px;line-height:1.7;color:#B0B0B0;">
                    <div><span style="color:#D4A24A;">✆</span> <a href="tel:${escape(brand.phone)}" style="color:#B0B0B0;text-decoration:none;">${escape(brand.phone)}</a></div>
                    <div><span style="color:#D4A24A;">✉</span> <a href="mailto:${escape(brand.email)}" style="color:#B0B0B0;text-decoration:none;">${escape(brand.email)}</a></div>
                    <div style="margin-top:4px;color:#D4A24A;font-weight:700;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;">24/7 Dispatch</div>
                  </td>
                </tr>
              </table>
              <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:16px;font-size:10px;color:#7a7a7a;text-align:center;">
                ${footerHtml || `© ${new Date().getFullYear()} Singapore Tour Booking (STB). Majestic Hospitality Group. Licensed by LTA · TA-2140-SG.`}
              </div>
            </td>
          </tr>
        </table>

        <!-- After-shell whitespace -->
        <table role="presentation" width="600" class="wrap" style="max-width:600px;">
          <tr><td style="padding:12px;font-size:10px;color:#a0a0a0;text-align:center;">
            You are receiving this email because you booked a ride with STB Singapore.
          </td></tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// GUEST — INQUIRY RECEIVED
// ============================================
function guestEmail(booking, brand) {
  const b = {
    voucherCode: escape(booking.voucherCode || ''),
    passengerName: escape(booking.passengerName || 'Guest'),
    firstName: escape((booking.passengerName || 'Guest').split(' ')[0]),
    passengerEmail: escape(booking.passengerEmail || ''),
    passengerPhone: escape(booking.passengerPhone || ''),
    vehicle: escape(booking.vehicle || 'Private Transport'),
    bookingType: escape(booking.bookingType || 'One Way'),
    pickup: escape(booking.pickup || ''),
    destination: escape(booking.destination || ''),
    dateTime: escape(fmtDateTime(booking.dateTime) || booking.dateTime || 'To be confirmed'),
    flightNo: escape(booking.flightNo || ''),
    notes: escape(booking.notes || ''),
    fare: escape(booking.fare || 'Fixed quote on dispatch'),
    currency: escape(booking.currency || 'SGD'),
    paymentMethod: escape(booking.paymentMethod || 'Pay after service'),
    pax: escape(booking.pax || '1-3 Passengers'),
  };

  const waNumber = (brand.whatsapp || '').replace(/[^0-9]/g, '');
  const waMsg = encodeURIComponent(`Hello STB Dispatch, I submitted transport inquiry ${b.voucherCode} (Passenger: ${booking.passengerName}). Please confirm availability.`);
  const waLink = `https://wa.me/${waNumber}?text=${waMsg}`;
  const callLink = `tel:${(brand.phone || '+6590629107').replace(/[^0-9+]/g, '')}`;

  const bodyHtml = `
    <!-- Success badge -->
    <tr>
      <td class="px" align="center" style="padding:8px 40px 4px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:#E8F5E9;color:#1B7B3F;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">
            ✓ Transport Inquiry Received
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- Headline -->
    <tr>
      <td class="px" align="center" style="padding:16px 40px 8px 40px;">
        <h1 class="serif h1" style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1.15;font-weight:500;color:#141414;letter-spacing:-0.02em;">
          Thank you, ${b.firstName}. <span style="color:#E31E24;font-style:italic;">Inquiry received.</span>
        </h1>
      </td>
    </tr>

    <tr>
      <td class="px" align="center" style="padding:0 40px 24px 40px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#6B6B6B;max-width:460px;">
          Your transport booking request has been received. Our Singapore dispatch team is verifying chauffeur availability and will confirm your booking via WhatsApp. <strong>No prepayment is required</strong> — pay after your trip is completed.
        </p>
      </td>
    </tr>

    <!-- VIP INQUIRY PASS -->
    <tr>
      <td class="px" style="padding:0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#FDECEC 0%,#FBF3E1 100%);border-radius:20px;border:2px dashed #E31E24;">
          <tr>
            <td style="padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:11px;font-weight:800;letter-spacing:0.22em;color:#E31E24;text-transform:uppercase;">
                    STB Transport Inquiry
                  </td>
                  <td align="right" style="font-family:'Courier New',monospace;background:#E31E24;color:#ffffff;font-size:12px;font-weight:800;padding:6px 12px;border-radius:8px;letter-spacing:0.05em;">
                    ${b.voucherCode}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(227,30,36,0.15);">
                ${rowTd('Passenger Name', b.passengerName)}
                ${rowTd('WhatsApp / Phone', b.passengerPhone)}
                ${rowTd('Email', b.passengerEmail)}
                ${rowTd('Vehicle Category', b.vehicle)}
                ${booking.distanceKm ? rowTd('Route Distance', `${Number(booking.distanceKm).toFixed(1)} km`) : ''}
                ${rowTd('Booking Type', b.bookingType)}
                ${rowTd('Pickup Location', b.pickup)}
                ${b.destination ? rowTd('Destination', b.destination) : ''}
                ${rowTd('Travel Date &amp; Time', b.dateTime)}
                ${b.flightNo ? rowTd('Flight Number', b.flightNo, '#E31E24') : ''}
                ${b.notes ? rowTd('Special Notes', b.notes) : ''}
                ${rowTd('Passengers', b.pax)}
                ${rowTd('Estimated Fare', b.fare, '#E31E24')}
                ${rowTd('Payment Option', b.paymentMethod)}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(227,30,36,0.2);">
                <tr>
                  <td style="font-size:13px;font-weight:700;color:#141414;">Status</td>
                  <td align="right" style="font-size:13px;font-weight:800;color:#E31E24;">
                    Dispatch Availability Verification In Progress
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Contact & Action CTAs -->
    <tr>
      <td class="px" style="padding:28px 40px 8px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stack" style="padding-right:6px;width:50%;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#25D366;border-radius:14px;">
                <tr><td align="center">
                  <a href="${waLink}" style="display:block;padding:14px 20px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
                    💬 &nbsp;WhatsApp Dispatch
                  </a>
                </td></tr>
              </table>
            </td>
            <td class="stack stack-pad" style="padding-left:6px;width:50%;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141414;border-radius:14px;">
                <tr><td align="center">
                  <a href="${callLink}" style="display:block;padding:14px 20px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
                    ✆ &nbsp;Call STB Support
                  </a>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;font-size:11px;color:#6B6B6B;text-align:center;">Dispatch Hotline: <strong>${escape(brand.phone)}</strong> (24/7 Available)</div>
      </td>
    </tr>

    <!-- Next Steps -->
    <tr>
      <td class="px" style="padding:28px 40px 8px 40px;">
        <div class="serif" style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:#141414;letter-spacing:-0.01em;margin-bottom:12px;">
          What to expect next
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${nextStep('01', 'Inquiry review', 'Our dispatch team confirms chauffeur allocation and message you via WhatsApp.')}
          ${nextStep('02', 'Driver & Vehicle details', 'You will receive the chauffeur name, direct phone, and vehicle registration before your trip.')}
          ${nextStep('03', 'Pay after trip', 'Zero prepayment. Settle directly with the driver in cash or PayNow SG after service.')}
        </table>
      </td>
    </tr>

    <!-- Change info -->
    <tr>
      <td class="px" style="padding:16px 40px 40px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF7F0;border-radius:14px;">
          <tr>
            <td style="padding:18px 22px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#B08536;text-transform:uppercase;margin-bottom:6px;">Need to modify your inquiry?</div>
              <div style="font-size:12px;color:#141414;line-height:1.6;">
                Reply directly to this email or contact WhatsApp with your reference <strong>${b.voucherCode}</strong>.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return shell({
    title: `STB Transport Inquiry Received — ${b.voucherCode}`,
    preheader: `Transport inquiry received for ${b.passengerName}. Reference ${b.voucherCode} · Availability verification in progress.`,
    bodyHtml,
    brand,
  });
}

// ============================================
// ADMIN — NEW INQUIRY ALERT
// ============================================
function adminEmail(booking, brand) {
  const b = {
    voucherCode: escape(booking.voucherCode || ''),
    passengerName: escape(booking.passengerName || '—'),
    passengerEmail: escape(booking.passengerEmail || '—'),
    passengerPhone: escape(booking.passengerPhone || '—'),
    vehicle: escape(booking.vehicle || 'Standard Private Transport'),
    bookingType: escape(booking.bookingType || 'One Way'),
    pickup: escape(booking.pickup || '—'),
    destination: escape(booking.destination || '—'),
    dateTime: escape(fmtDateTime(booking.dateTime) || booking.dateTime || '—'),
    flightNo: escape(booking.flightNo || ''),
    notes: escape(booking.notes || ''),
    fare: escape(booking.fare || 'Pending Quote'),
    currency: escape(booking.currency || 'SGD'),
    paymentMethod: escape(booking.paymentMethod || 'Pay after service'),
    pax: escape(booking.pax || '1-3 Passengers'),
    pickupPlaceId: escape(booking.pickupPlaceId || ''),
    destPlaceId: escape(booking.destPlaceId || ''),
    pickupCoords: booking.pickupCoords ? `${booking.pickupCoords.lat}, ${booking.pickupCoords.lng}` : '',
    destCoords: booking.destCoords ? `${booking.destCoords.lat}, ${booking.destCoords.lng}` : '',
    createdAt: escape(booking.createdAt || new Date().toISOString()),
  };

  const waDigits = (booking.passengerPhone || '').replace(/[^0-9]/g, '');
  const custWaLink = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello ${booking.passengerName}, this is STB Singapore Dispatch regarding your transport inquiry ${b.voucherCode}.`)}`
    : '#';
  const mailtoLink = `mailto:${b.passengerEmail}?subject=${encodeURIComponent('STB Singapore — Transport Inquiry ' + b.voucherCode)}`;

  const customerRows = [
    ['Name', b.passengerName],
    ['WhatsApp Number', `<a href="${custWaLink}" style="color:#1B7B3F;font-weight:800;text-decoration:underline;">${b.passengerPhone} ↗</a>`],
    ['Email', `<a href="${mailtoLink}" style="color:#E31E24;">${b.passengerEmail}</a>`],
    ['Passengers', b.pax],
  ];

  const tripRows = [
    ['Vehicle Choice', b.vehicle],
    ...(booking.distanceKm ? [['Route Distance', `${Number(booking.distanceKm).toFixed(1)} km`]] : []),
    ['Estimated Fare', `<strong style="color:#E31E24;">${b.fare}</strong>`],
    ['Booking Type', b.bookingType],
    ['Pickup Location', b.pickup],
    ...(b.pickupPlaceId ? [['Pickup Place ID', `<span style="font-family:monospace;font-size:11px;">${b.pickupPlaceId}</span>`]] : []),
    ...(b.pickupCoords ? [['Pickup Coordinates', b.pickupCoords]] : []),
    ['Destination', b.destination],
    ...(b.destPlaceId ? [['Dest Place ID', `<span style="font-family:monospace;font-size:11px;">${b.destPlaceId}</span>`]] : []),
    ...(b.destCoords ? [['Dest Coordinates', b.destCoords]] : []),
    ['Travel Date / Time', b.dateTime],
    ...(b.flightNo ? [['Flight Number', b.flightNo]] : []),
    ...(b.notes ? [['Special Notes', b.notes]] : []),
  ];

  const bodyHtml = `
    <!-- Alert badge -->
    <tr>
      <td class="px" align="center" style="padding:8px 40px 4px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:#FDECEC;color:#B8171C;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">
            ⚡ New Transport Inquiry · Action Required
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- Headline -->
    <tr>
      <td class="px" align="center" style="padding:16px 40px 4px 40px;">
        <h1 class="serif h1" style="margin:0;font-family:Georgia,serif;font-size:28px;line-height:1.15;font-weight:500;color:#141414;letter-spacing:-0.02em;">
          Inquiry <span style="color:#E31E24;">${b.voucherCode}</span>
        </h1>
      </td>
    </tr>
    <tr>
      <td class="px" align="center" style="padding:0 40px 20px 40px;">
        <div style="font-size:12px;color:#6B6B6B;">Received ${b.createdAt}</div>
      </td>
    </tr>

    <!-- Two-column summary: CUSTOMER + TRIP -->
    <tr>
      <td class="px" style="padding:0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stack" style="vertical-align:top;width:50%;padding-right:8px;">
              ${adminBlock('CUSTOMER', customerRows)}
            </td>
            <td class="stack stack-pad" style="vertical-align:top;width:50%;padding-left:8px;">
              ${adminBlock('TRIP DETAILS', tripRows)}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Action buttons -->
    <tr>
      <td class="px" style="padding:24px 40px 8px 40px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#B08536;text-transform:uppercase;margin-bottom:12px;">
          Quick Dispatch Actions
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
          <tr>
            <td class="stack" style="padding-right:6px;width:50%;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#25D366;border-radius:12px;">
                <tr><td align="center">
                  <a href="${custWaLink}" style="display:block;padding:14px 20px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
                    💬 &nbsp;WhatsApp Customer (${b.passengerPhone})
                  </a>
                </td></tr>
              </table>
            </td>
            <td class="stack stack-pad" style="padding-left:6px;width:50%;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141414;border-radius:12px;">
                <tr><td align="center">
                  <a href="${mailtoLink}" style="display:block;padding:14px 20px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
                    ✉ &nbsp;Email Customer
                  </a>
                </td></tr>
              </table>
            </td>
          </tr>
        </table>

        ${brand.assignUrl ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#E31E24,#B8171C);border-radius:12px;">
          <tr><td align="center">
            <a href="${brand.assignUrl}" style="display:block;padding:14px 20px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
              🚗 &nbsp;Assign Driver &amp; Notify Guest
            </a>
          </td></tr>
        </table>
        ` : ''}
      </td>
    </tr>
  `;

  return shell({
    title: `New STB Transport Inquiry — ${b.voucherCode}`,
    preheader: `Customer: ${b.passengerName} (${b.passengerPhone}) · ${b.pickup} → ${b.destination} · ${b.dateTime}`,
    bodyHtml,
    footerHtml: `Internal dispatch notification — do not forward. © ${new Date().getFullYear()} STB Singapore Dispatch.`,
    brand,
  });
}

// ============================================
// PLAIN-TEXT versions (fallback for text-only clients)
// ============================================
function guestText(booking) {
  return [
    `STB Singapore — Transport Inquiry Received`,
    ``,
    `Thank you, ${booking.passengerName}. Your transport inquiry has been received.`,
    ``,
    `Inquiry Reference: ${booking.voucherCode}`,
    `Vehicle Category: ${booking.vehicle}`,
    booking.distanceKm ? `Route Distance: ${Number(booking.distanceKm).toFixed(1)} km` : ``,
    `Booking Type: ${booking.bookingType || 'One Way'}`,
    `Pickup: ${booking.pickup}`,
    booking.destination ? `Destination: ${booking.destination}` : ``,
    `Date/Time: ${booking.dateTime}`,
    booking.flightNo ? `Flight: ${booking.flightNo}` : ``,
    booking.notes ? `Notes: ${booking.notes}` : ``,
    `Passengers: ${booking.pax}`,
    `Estimated Fare: ${booking.fare}`,
    `Payment: No prepayment required (Pay after trip)`,
    ``,
    `Our Singapore dispatch team is verifying chauffeur availability and will confirm your booking via WhatsApp.`,
    ``,
    `Questions or urgent changes?`,
    `WhatsApp: ${booking.whatsapp || '+65 9062 9107'}`,
    `Hotline: +65 9062 9107`,
    ``,
    `© Singapore Tour Booking (STB) · Majestic Hospitality Group`,
  ].filter(Boolean).join('\n');
}

function adminText(booking) {
  return [
    `[NEW TRANSPORT INQUIRY] ${booking.voucherCode}`,
    ``,
    `CUSTOMER`,
    `  Name: ${booking.passengerName}`,
    `  WhatsApp: ${booking.passengerPhone}`,
    `  Email: ${booking.passengerEmail}`,
    `  Pax: ${booking.pax}`,
    ``,
    `TRIP`,
    `  Vehicle Category: ${booking.vehicle}`,
    booking.distanceKm ? `  Route Distance: ${Number(booking.distanceKm).toFixed(1)} km` : ``,
    `  Estimated Fare: ${booking.fare}`,
    `  Booking Type: ${booking.bookingType || 'One Way'}`,
    `  Pickup: ${booking.pickup}`,
    booking.pickupPlaceId ? `  Pickup Place ID: ${booking.pickupPlaceId}` : ``,
    booking.destination ? `  Destination: ${booking.destination}` : ``,
    booking.destPlaceId ? `  Dest Place ID: ${booking.destPlaceId}` : ``,
    `  Date/Time: ${booking.dateTime}`,
    booking.flightNo ? `  Flight: ${booking.flightNo}` : ``,
    booking.notes ? `  Notes: ${booking.notes}` : ``,
    ``,
    `ACTION: Verify vehicle availability & contact customer via WhatsApp (${booking.passengerPhone}).`,
  ].filter(Boolean).join('\n');
}

// ============================================
// GUEST — CHAUFFEUR ASSIGNED (fires on driver assignment)
// ============================================
function reminderEmail(booking, brand) {
  const b = {
    voucherCode: escape(booking.voucherCode || ''),
    passengerName: escape(booking.passengerName || 'Guest'),
    firstName: escape((booking.passengerName || 'Guest').split(' ')[0]),
    vehicle: escape(booking.vehicle || ''),
    pickup: escape(booking.pickup || ''),
    destination: escape(booking.destination || ''),
    dateTime: escape(fmtDateTime(booking.dateTime) || ''),
    flightNo: escape(booking.flightNo || ''),
    fare: escape(booking.fare || ''),
    currency: escape(booking.currency || 'SGD'),
    driverName: escape(booking.driverName || ''),
    driverPhone: escape(booking.driverPhone || ''),
    driverPlate: escape(booking.driverPlate || ''),
    driverPhotoUrl: escape(booking.driverPhotoUrl || ''),
  };

  const hasDriver = Boolean(booking.driverName && booking.driverPlate);

  // Relative countdown to pickup
  let countdown = 'Pickup ahead';
  try {
    const pickupMs = new Date(booking.dateTime).getTime();
    const diff = pickupMs - Date.now();
    if (!Number.isNaN(diff) && diff > 0) {
      const hours = Math.round(diff / (60 * 60 * 1000));
      if (hours < 1) countdown = 'Pickup in under an hour';
      else if (hours < 24) countdown = `Pickup in ~${hours} hour${hours === 1 ? '' : 's'}`;
      else countdown = `Pickup in ~${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? '' : 's'}`;
    } else if (!Number.isNaN(diff)) {
      countdown = 'Pickup scheduled';
    }
  } catch { /* ignore */ }

  const waNumber = (brand.whatsapp || '').replace(/[^0-9]/g, '');
  const waMsg = encodeURIComponent(`Hello STB, this is ${booking.passengerName} regarding booking ${b.voucherCode}.`);
  const waLink = `https://wa.me/${waNumber}?text=${waMsg}`;

  const driverBlock = hasDriver ? `
    <!-- Driver Card -->
    <tr>
      <td class="px" style="padding:8px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141414;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:24px 26px;color:#ffffff;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.22em;color:#D4A24A;text-transform:uppercase;margin-bottom:14px;">
                Your Chauffeur
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${b.driverPhotoUrl ? `
                  <td width="80" style="vertical-align:top;padding-right:16px;">
                    <img src="${b.driverPhotoUrl}" width="70" height="70" alt="${b.driverName}" style="display:block;width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #D4A24A;" />
                  </td>
                  ` : ''}
                  <td style="vertical-align:top;">
                    <div class="serif" style="font-family:Georgia,serif;font-size:22px;font-weight:500;color:#ffffff;letter-spacing:-0.01em;margin-bottom:4px;">
                      ${b.driverName}
                    </div>
                    ${b.driverPhone ? `<div style="font-size:12px;color:#B0B0B0;margin-bottom:4px;">✆ <a href="tel:${b.driverPhone}" style="color:#B0B0B0;text-decoration:none;">${b.driverPhone}</a></div>` : ''}
                    <div style="display:inline-block;background:#D4A24A;color:#141414;font-family:'Courier New',monospace;font-size:14px;font-weight:800;padding:6px 14px;border-radius:8px;letter-spacing:0.1em;margin-top:6px;">
                      ${b.driverPlate}
                    </div>
                    <div style="font-size:11px;color:#7a7a7a;margin-top:6px;">${b.vehicle}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : `
    <!-- Driver pending -->
    <tr>
      <td class="px" style="padding:8px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF3E1;border:1px dashed #B08536;border-radius:16px;">
          <tr>
            <td style="padding:18px 22px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#B08536;text-transform:uppercase;margin-bottom:6px;">
                Driver Details Incoming
              </div>
              <div style="font-size:13px;color:#141414;line-height:1.55;">
                Our dispatch team will send your chauffeur's name, contact, and vehicle plate to your WhatsApp shortly. Please keep <strong>${b.voucherCode}</strong> handy.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const bodyHtml = `
    <!-- Assigned badge -->
    <tr>
      <td class="px" align="center" style="padding:8px 40px 4px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:#E8F5E9;color:#1B7B3F;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">
            ${hasDriver ? '✓ Chauffeur Assigned' : '⏰ Ride Update'}
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- Headline -->
    <tr>
      <td class="px" align="center" style="padding:16px 40px 8px 40px;">
        <h1 class="serif h1" style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1.15;font-weight:500;color:#141414;letter-spacing:-0.02em;">
          ${hasDriver
            ? `Meet your chauffeur, <span style="color:#E31E24;font-style:italic;">${b.driverName.split(' ')[0]}.</span>`
            : `${b.firstName}, your ride is <span style="color:#E31E24;font-style:italic;">coming up.</span>`}
        </h1>
      </td>
    </tr>

    <tr>
      <td class="px" align="center" style="padding:0 40px 20px 40px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#6B6B6B;max-width:440px;">
          <strong style="color:#B08536;">${countdown}.</strong> Here's everything you need for a smooth ride — save this email or screenshot the plate number.
        </p>
      </td>
    </tr>

    ${driverBlock}

    <!-- Pickup summary -->
    <tr>
      <td class="px" style="padding:16px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FDECEC;border-radius:16px;">
          <tr>
            <td style="padding:22px 24px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#E31E24;text-transform:uppercase;margin-bottom:12px;">
                Pickup Details
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${rowTd('Voucher', b.voucherCode, '#E31E24')}
                ${rowTd('Pickup', b.pickup)}
                ${b.destination ? rowTd('Destination', b.destination) : ''}
                ${rowTd('Time', b.dateTime)}
                ${b.flightNo ? rowTd('Flight', b.flightNo, '#E31E24') : ''}
                ${rowTd('Vehicle', b.vehicle)}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WhatsApp CTA -->
    <tr>
      <td class="px" align="center" style="padding:24px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background:#25D366;border-radius:14px;">
              <a href="${waLink}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
                💬 &nbsp;Message dispatch on WhatsApp
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Tips -->
    <tr>
      <td class="px" style="padding:24px 40px 8px 40px;">
        <div class="serif" style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:#141414;letter-spacing:-0.01em;margin-bottom:12px;">
          A few reminders
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${nextStep('01', 'Be ready 10 minutes early', 'Your chauffeur arrives 10 minutes ahead of pickup time. Complimentary waiting from actual landing if flight delayed.')}
          ${nextStep('02', 'Look for the name board', b.flightNo ? 'At Changi arrivals hall, your chauffeur will hold a printed board with your name.' : 'Your chauffeur will call/WhatsApp you upon arrival.')}
          ${nextStep('03', 'Fixed transport fare', 'Your transport fare is guaranteed as calculated. ERP tolls and parking charges are excluded.')}
        </table>
      </td>
    </tr>

    <!-- Change info -->
    <tr>
      <td class="px" style="padding:16px 40px 40px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF7F0;border-radius:14px;">
          <tr>
            <td style="padding:18px 22px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#B08536;text-transform:uppercase;margin-bottom:8px;">Last-minute changes?</div>
              <div style="font-size:12px;color:#141414;line-height:1.6;">
                Reply to this email or WhatsApp us with voucher <strong>${b.voucherCode}</strong>. Free cancellation until 2 hours before pickup.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return shell({
    title: hasDriver
      ? `Chauffeur assigned — ${b.voucherCode}`
      : `Ride update — ${b.voucherCode}`,
    preheader: hasDriver
      ? `${booking.driverName} · Plate ${booking.driverPlate} · ${countdown}`
      : `${countdown} · ${b.pickup} · Voucher ${b.voucherCode}`,
    bodyHtml,
    brand,
  });
}

function reminderText(booking) {
  const hasDriver = Boolean(booking.driverName && booking.driverPlate);
  return [
    `STB Singapore — Your Ride is Tomorrow`,
    ``,
    `${booking.passengerName}, your pickup is in 12 hours.`,
    ``,
    hasDriver ? `CHAUFFEUR` : `DISPATCH`,
    hasDriver ? `  Driver: ${booking.driverName}` : `  We'll message your driver details via WhatsApp shortly.`,
    hasDriver && booking.driverPhone ? `  Phone: ${booking.driverPhone}` : ``,
    hasDriver ? `  Plate: ${booking.driverPlate}` : ``,
    ``,
    `TRIP`,
    `  Voucher: ${booking.voucherCode}`,
    `  Pickup: ${booking.pickup}`,
    booking.destination ? `  Destination: ${booking.destination}` : ``,
    `  Time: ${booking.dateTime}`,
    booking.flightNo ? `  Flight: ${booking.flightNo}` : ``,
    `  Vehicle: ${booking.vehicle}`,
    ``,
    `Reply to this email or WhatsApp us with voucher ${booking.voucherCode} for any changes.`,
  ].filter(Boolean).join('\n');
}

export { guestEmail, adminEmail, reminderEmail, guestText, adminText, reminderText };
