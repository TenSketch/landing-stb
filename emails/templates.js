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
// GUEST — RESERVATION CONFIRMED
// ============================================
function guestEmail(booking, brand) {
  const b = {
    voucherCode: escape(booking.voucherCode || ''),
    passengerName: escape(booking.passengerName || 'Guest'),
    firstName: escape((booking.passengerName || 'Guest').split(' ')[0]),
    passengerEmail: escape(booking.passengerEmail || ''),
    passengerPhone: escape(booking.passengerPhone || ''),
    vehicle: escape(booking.vehicle || ''),
    pickup: escape(booking.pickup || ''),
    destination: escape(booking.destination || ''),
    dateTime: escape(fmtDateTime(booking.dateTime) || 'To be confirmed'),
    flightNo: escape(booking.flightNo || ''),
    fare: escape(booking.fare || ''),
    currency: escape(booking.currency || 'SGD'),
    paymentMethod: escape(booking.paymentMethod || ''),
    pax: escape(booking.pax || ''),
  };

  const waNumber = (brand.whatsapp || '').replace(/[^0-9]/g, '');
  const waMsg = encodeURIComponent(`Hello STB, I would like to confirm my booking ${b.voucherCode} (Passenger: ${booking.passengerName}).`);
  const waLink = `https://wa.me/${waNumber}?text=${waMsg}`;

  const bodyHtml = `
    <!-- Success badge -->
    <tr>
      <td class="px" align="center" style="padding:8px 40px 4px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:#E8F5E9;color:#1B7B3F;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">
            ✓ Reservation Confirmed
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- Headline -->
    <tr>
      <td class="px" align="center" style="padding:16px 40px 8px 40px;">
        <h1 class="serif h1" style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:1.15;font-weight:500;color:#141414;letter-spacing:-0.02em;">
          Thank you, ${b.firstName}. <span style="color:#E31E24;font-style:italic;">Your ride is booked.</span>
        </h1>
      </td>
    </tr>

    <tr>
      <td class="px" align="center" style="padding:0 40px 24px 40px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#6B6B6B;max-width:440px;">
          A chauffeur will be assigned within 24 hours of your pickup. You'll receive the driver's name and vehicle plate details on WhatsApp.
        </p>
      </td>
    </tr>

    <!-- VIP PASS -->
    <tr>
      <td class="px" style="padding:0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#FDECEC 0%,#FBF3E1 100%);border-radius:20px;border:2px dashed #E31E24;">
          <tr>
            <td style="padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:11px;font-weight:800;letter-spacing:0.22em;color:#E31E24;text-transform:uppercase;">
                    STB VIP Pass
                  </td>
                  <td align="right" style="font-family:'Courier New',monospace;background:#E31E24;color:#ffffff;font-size:12px;font-weight:800;padding:6px 12px;border-radius:8px;letter-spacing:0.05em;">
                    ${b.voucherCode}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(227,30,36,0.15);">
                ${rowTd('Passenger', b.passengerName)}
                ${rowTd('Vehicle', b.vehicle)}
                ${rowTd('Pickup', b.pickup)}
                ${b.destination ? rowTd('Destination', b.destination) : ''}
                ${rowTd('Date &amp; Time', b.dateTime)}
                ${b.flightNo ? rowTd('Flight', b.flightNo, '#E31E24') : ''}
                ${rowTd('Passengers', b.pax)}
                ${rowTd('Payment', b.paymentMethod)}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(227,30,36,0.2);">
                <tr>
                  <td style="font-size:13px;font-weight:700;color:#141414;">Total (guaranteed)</td>
                  <td align="right" class="serif" style="font-family:Georgia,serif;font-size:26px;font-weight:500;color:#E31E24;letter-spacing:-0.02em;">
                    ${b.fare} <span style="font-size:12px;color:#6B6B6B;font-family:Helvetica,sans-serif;font-weight:600;">${b.currency}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- WhatsApp CTA -->
    <tr>
      <td class="px" align="center" style="padding:28px 40px 8px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="background:#25D366;border-radius:14px;">
              <a href="${waLink}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
                💬 &nbsp;Chat with dispatch on WhatsApp
              </a>
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;font-size:11px;color:#6B6B6B;">Or reply to this email — we respond within 30 minutes, 24/7.</div>
      </td>
    </tr>

    <!-- What happens next -->
    <tr>
      <td class="px" style="padding:32px 40px 8px 40px;">
        <div class="serif" style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:#141414;letter-spacing:-0.01em;margin-bottom:12px;">
          What happens next
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${nextStep('01', 'Chauffeur assigned', 'You will receive driver name, contact, and vehicle plate 24 hours before pickup.')}
          ${nextStep('02', 'Live tracking', b.flightNo ? `We are monitoring flight ${b.flightNo} in real-time. Your chauffeur adjusts automatically.` : 'We monitor traffic conditions and adjust arrival timing accordingly.')}
          ${nextStep('03', 'Enjoy your ride', 'Onboard 5G WiFi, complimentary water, and VIP treatment. Zero surcharges.')}
        </table>
      </td>
    </tr>

    <!-- Contact info block -->
    <tr>
      <td class="px" style="padding:24px 40px 40px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF7F0;border-radius:14px;">
          <tr>
            <td style="padding:20px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#B08536;text-transform:uppercase;margin-bottom:8px;">Need to change something?</div>
              <div style="font-size:13px;color:#141414;line-height:1.6;">
                Cancel or reschedule free of charge up to <strong>2 hours before pickup</strong>. Reply to this email with your voucher code <strong>${b.voucherCode}</strong> or ping WhatsApp.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return shell({
    title: `Reservation Confirmed — ${b.voucherCode}`,
    preheader: `Your STB VIP chauffeur is booked. Voucher ${b.voucherCode} · ${b.fare} ${b.currency}`,
    bodyHtml,
    brand,
  });
}

// ============================================
// ADMIN — NEW BOOKING ALERT
// ============================================
function adminEmail(booking, brand) {
  const b = {
    voucherCode: escape(booking.voucherCode || ''),
    passengerName: escape(booking.passengerName || ''),
    passengerEmail: escape(booking.passengerEmail || ''),
    passengerPhone: escape(booking.passengerPhone || ''),
    vehicle: escape(booking.vehicle || ''),
    pickup: escape(booking.pickup || ''),
    destination: escape(booking.destination || ''),
    dateTime: escape(fmtDateTime(booking.dateTime) || ''),
    flightNo: escape(booking.flightNo || ''),
    fare: escape(booking.fare || ''),
    currency: escape(booking.currency || 'SGD'),
    paymentMethod: escape(booking.paymentMethod || ''),
    pax: escape(booking.pax || ''),
    createdAt: escape(booking.createdAt || new Date().toISOString()),
  };

  const waNumber = (booking.passengerPhone || '').replace(/[^0-9]/g, '');
  const custWaLink = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${booking.passengerName}, this is STB Dispatch confirming your booking ${b.voucherCode}.`)}`
    : '#';
  const mailtoLink = `mailto:${b.passengerEmail}?subject=${encodeURIComponent('STB Singapore — Chauffeur Assignment for ' + b.voucherCode)}`;

  const bodyHtml = `
    <!-- Alert badge -->
    <tr>
      <td class="px" align="center" style="padding:8px 40px 4px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:#FDECEC;color:#B8171C;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">
            ⚡ New Booking · Action Required
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- Headline -->
    <tr>
      <td class="px" align="center" style="padding:16px 40px 4px 40px;">
        <h1 class="serif h1" style="margin:0;font-family:Georgia,serif;font-size:28px;line-height:1.15;font-weight:500;color:#141414;letter-spacing:-0.02em;">
          Booking <span style="color:#E31E24;">${b.voucherCode}</span>
        </h1>
      </td>
    </tr>
    <tr>
      <td class="px" align="center" style="padding:0 40px 20px 40px;">
        <div style="font-size:12px;color:#6B6B6B;">Received ${b.createdAt}</div>
      </td>
    </tr>

    <!-- Two-column summary: PASSENGER + TRIP -->
    <tr>
      <td class="px" style="padding:0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stack" style="vertical-align:top;width:50%;padding-right:8px;">
              ${adminBlock('Passenger', [
                ['Name', b.passengerName],
                ['Phone', b.passengerPhone],
                ['Email', b.passengerEmail],
                ['Pax', b.pax],
              ])}
            </td>
            <td class="stack stack-pad" style="vertical-align:top;width:50%;padding-left:8px;">
              ${adminBlock('Trip', [
                ['Vehicle', b.vehicle],
                ['Pickup', b.pickup],
                ['Destination', b.destination || '—'],
                ['Date/Time', b.dateTime],
                ...(b.flightNo ? [['Flight', b.flightNo]] : []),
              ])}
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Payment strip -->
    <tr>
      <td class="px" style="padding:16px 40px 0 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#141414;border-radius:14px;">
          <tr>
            <td style="padding:18px 22px;color:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size:10px;font-weight:800;letter-spacing:0.2em;color:#D4A24A;text-transform:uppercase;margin-bottom:2px;">Fare</div>
                    <div class="serif" style="font-family:Georgia,serif;font-size:24px;font-weight:500;color:#ffffff;letter-spacing:-0.01em;">
                      ${b.fare} <span style="font-size:12px;color:#B0B0B0;font-family:Helvetica,sans-serif;font-weight:600;">${b.currency}</span>
                    </div>
                  </td>
                  <td align="right">
                    <div style="font-size:10px;font-weight:800;letter-spacing:0.2em;color:#D4A24A;text-transform:uppercase;margin-bottom:2px;">Payment Method</div>
                    <div style="font-size:14px;font-weight:700;color:#ffffff;">${b.paymentMethod}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Action buttons -->
    <tr>
      <td class="px" style="padding:24px 40px 8px 40px;">
        <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#B08536;text-transform:uppercase;margin-bottom:12px;">
          Quick Actions
        </div>

        <!-- Primary: Assign Driver (opens tiny form) -->
        ${brand.assignUrl ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#E31E24,#B8171C);border-radius:12px;margin-bottom:10px;">
          <tr><td align="center">
            <a href="${brand.assignUrl}" style="display:block;padding:16px 20px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
              🚗 &nbsp;Assign Driver &amp; Vehicle
              <span style="display:block;font-size:10px;font-weight:600;color:rgba(255,255,255,0.7);margin-top:3px;letter-spacing:0.08em;">Guest reminder auto-fires 12h before pickup</span>
            </a>
          </td></tr>
        </table>
        ` : ''}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stack" style="padding-right:6px;width:50%;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#25D366;border-radius:12px;">
                <tr><td align="center">
                  <a href="${custWaLink}" style="display:block;padding:14px 20px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.02em;">
                    💬 &nbsp;WhatsApp Customer
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
      </td>
    </tr>

    <!-- Checklist -->
    <tr>
      <td class="px" style="padding:20px 40px 40px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF7F0;border-radius:14px;">
          <tr>
            <td style="padding:18px 22px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.18em;color:#B08536;text-transform:uppercase;margin-bottom:10px;">Dispatch Checklist</div>
              <div style="font-size:13px;color:#141414;line-height:1.9;">
                ☐ &nbsp;Assign chauffeur &amp; confirm vehicle availability<br>
                ☐ &nbsp;Send driver name + plate to guest via WhatsApp (24h prior)<br>
                ${b.flightNo ? '☐ &nbsp;Set flight tracking alert for ' + b.flightNo + '<br>' : ''}
                ☐ &nbsp;Confirm payment method &amp; collect if PayNow/Card<br>
                ☐ &nbsp;Log booking in dispatch sheet
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return shell({
    title: `[NEW BOOKING] ${b.voucherCode} — ${b.passengerName}`,
    preheader: `${b.passengerName} · ${b.vehicle} · ${b.pickup} → ${b.destination || 'Hourly'} · ${b.fare} ${b.currency}`,
    bodyHtml,
    footerHtml: `Internal dispatch email — do not forward. © ${new Date().getFullYear()} STB Singapore Dispatch.`,
    brand,
  });
}

// ============================================
// Small helpers for table rows
// ============================================
function rowTd(label, value, valueColor = '#141414') {
  return `
    <tr>
      <td style="padding:5px 0;font-size:12px;color:#6B6B6B;">${label}</td>
      <td align="right" style="padding:5px 0;font-size:13px;font-weight:700;color:${valueColor};">${value}</td>
    </tr>
  `;
}

function nextStep(num, title, desc) {
  return `
    <tr>
      <td style="padding:10px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="44" style="vertical-align:top;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" width="32" height="32" style="background:#FDECEC;color:#E31E24;border-radius:16px;font-family:Georgia,serif;font-size:12px;font-weight:700;">${num}</td></tr>
              </table>
            </td>
            <td style="vertical-align:top;">
              <div style="font-size:13px;font-weight:700;color:#141414;margin-bottom:2px;">${title}</div>
              <div style="font-size:12px;color:#6B6B6B;line-height:1.55;">${desc}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function adminBlock(title, rows) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBF7F0;border-radius:14px;height:100%;">
      <tr>
        <td style="padding:16px 18px;">
          <div style="font-size:10px;font-weight:800;letter-spacing:0.2em;color:#B08536;text-transform:uppercase;margin-bottom:10px;">${title}</div>
          ${rows.map(([label, value]) => `
            <div style="margin-bottom:8px;">
              <div style="font-size:10px;font-weight:700;color:#6B6B6B;text-transform:uppercase;letter-spacing:0.06em;">${label}</div>
              <div style="font-size:13px;font-weight:700;color:#141414;word-break:break-word;">${value || '—'}</div>
            </div>
          `).join('')}
        </td>
      </tr>
    </table>
  `;
}

// ============================================
// PLAIN-TEXT versions (fallback for text-only clients)
// ============================================
function guestText(booking) {
  return [
    `STB Singapore — Reservation Confirmed`,
    ``,
    `Thank you, ${booking.passengerName}. Your ride is booked.`,
    ``,
    `Voucher: ${booking.voucherCode}`,
    `Vehicle: ${booking.vehicle}`,
    `Pickup: ${booking.pickup}`,
    booking.destination ? `Destination: ${booking.destination}` : ``,
    `Date/Time: ${booking.dateTime}`,
    booking.flightNo ? `Flight: ${booking.flightNo}` : ``,
    `Passengers: ${booking.pax}`,
    `Payment: ${booking.paymentMethod}`,
    `Total (guaranteed): ${booking.fare} ${booking.currency}`,
    ``,
    `A chauffeur will be assigned within 24h of pickup. You'll receive the driver's name, contact, and vehicle plate on WhatsApp.`,
    ``,
    `Questions? Reply to this email — 24/7 dispatch response within 30 minutes.`,
    ``,
    `© Singapore Tour Booking (STB) · Majestic Hospitality Group`,
  ].filter(Boolean).join('\n');
}

function adminText(booking) {
  return [
    `[NEW BOOKING] ${booking.voucherCode}`,
    ``,
    `PASSENGER`,
    `  Name: ${booking.passengerName}`,
    `  Phone: ${booking.passengerPhone}`,
    `  Email: ${booking.passengerEmail}`,
    `  Pax: ${booking.pax}`,
    ``,
    `TRIP`,
    `  Vehicle: ${booking.vehicle}`,
    `  Pickup: ${booking.pickup}`,
    `  Destination: ${booking.destination || '—'}`,
    `  Date/Time: ${booking.dateTime}`,
    booking.flightNo ? `  Flight: ${booking.flightNo}` : ``,
    ``,
    `PAYMENT`,
    `  Fare: ${booking.fare} ${booking.currency}`,
    `  Method: ${booking.paymentMethod}`,
    ``,
    `ACTION: assign chauffeur, send driver details to guest 24h prior.`,
  ].filter(Boolean).join('\n');
}

// ============================================
// GUEST — 12-HOUR REMINDER
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
    <!-- Reminder badge -->
    <tr>
      <td class="px" align="center" style="padding:8px 40px 4px 40px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:#FBF3E1;color:#B08536;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:6px 14px;border-radius:999px;">
            ⏰ 12 Hours to Pickup
          </td></tr>
        </table>
      </td>
    </tr>

    <!-- Headline -->
    <tr>
      <td class="px" align="center" style="padding:16px 40px 8px 40px;">
        <h1 class="serif h1" style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1.15;font-weight:500;color:#141414;letter-spacing:-0.02em;">
          ${b.firstName}, your ride is <span style="color:#E31E24;font-style:italic;">tomorrow.</span>
        </h1>
      </td>
    </tr>

    <tr>
      <td class="px" align="center" style="padding:0 40px 20px 40px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#6B6B6B;max-width:440px;">
          Here's everything you need for a smooth ride. Save this email or screenshot the plate number.
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
          ${nextStep('03', 'Zero surcharges', 'ERP, tolls, and peak charges are all included. Your fare is guaranteed.')}
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
    title: `Your ride is tomorrow — ${b.voucherCode}`,
    preheader: hasDriver
      ? `Chauffeur ${booking.driverName} · Plate ${booking.driverPlate} · Pickup ${booking.dateTime}`
      : `Pickup in 12 hours · ${b.pickup} · Voucher ${b.voucherCode}`,
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
