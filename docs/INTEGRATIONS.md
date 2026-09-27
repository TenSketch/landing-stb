# Integrations

> Verified against `lib/providers/*.js`, `lib/integrations.js`, `lib/notifications.js` as of commit `15e4184`.

## Current Status

| Provider | Status | Implementation |
|----------|--------|---------------|
| Email | ⚠️ Partial | Nodemailer + SMTP — actually sends |
| SMS | ❌ Placeholder | Only logs; no provider |
| WhatsApp | ❌ Placeholder | Only logs; no provider |
| Payment | ❌ Placeholder | Only logs; no provider |
| Firebase | ❌ Placeholder | Only logs; no provider |
| EFC | ❌ Placeholder | Only logs; no provider |

## Email

- Uses `nodemailer` with SMTP configured via env vars
- `lib/providers/email.js` wraps nodemailer
- `lib/notifications.js` uses templates from `notification_templates` table
- Token replacement: `{{booking.reference}}`, `{{booking.pickup}}`, `{{booking.destination}}`, etc.
- DSN (delivery status) not requested; no retry logic

## SMS

```javascript
// lib/providers/sms.js
async send(payload) {
  console.log('[SmsProvider] placeholder send...', payload);
  return { success: false, error: 'SMS provider not implemented' };
}
```

**Required**: Twilio, Vonage, or other SMS provider integration.

## WhatsApp

```javascript
// lib/providers/whatsapp.js
async send(payload) {
  console.log('[WhatsAppProvider] placeholder send...', payload);
  return { success: false, error: 'WhatsApp provider not implemented' };
}
```

**Fallback**: `main.js` constructs `wa.me` URL directly for booking confirmation. This is the current production path.

**Required**: Twilio WhatsApp API or MessageBird.

## Payment

```javascript
// lib/providers/payment.js
async initiate(transactionId, amount, currency, metadata) {
  return { provider: 'PLACEHOLDER', reference: `PLACEHOLDER-${Date.now()}` };
}
```

**Required**: Stripe, PayPal, or other payment gateway.

## Firebase Cloud Messaging

```javascript
// lib/providers/firebase.js
async send(tokens, notification, data) {
  console.log('[FirebaseProvider] placeholder send...');
  return { success: false, error: 'FCM not implemented' };
}
```

**Required**: Firebase Admin SDK with FCM server key.

## EFC

```javascript
// lib/providers/efc.js
// EFC placeholder — pending API specification
```

**Required**: EFC API specification from provider.

## Provider Configuration

All providers load config from `integration_settings` table:

```sql
SELECT * FROM integration_settings;
// provider_type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PAYMENT' | 'FIREBASE' | 'EFC'
// secrets_encrypted: AES-256-GCM encrypted JSON
```

`lib/integrations.js` `decryptSecrets()` decrypts using `STB_SECRET_KEY`.

## Notification Engine

`lib/notifications.js`:
- `notify(eventName, payload)` — routes to all enabled channels for event
- Event names: `booking_created`, `booking_confirmed`, `driver_assigned`, `booking_completed`, `booking_cancelled`
- Templates stored in `notification_templates` table with channel + event as key
- **Performance issue**: `refreshProviders()` called on every notification — DB round-trip per send

## Missing Integration: Customer Device Tokens

`getCustomerDeviceTokens(customerId)` exists in `lib/notifications.js` but push tokens are never actually collected from customers (no frontend FCM permission flow).

## WhatsApp Number

Hardcoded in multiple places:
- `public/src/main.js` — WhatsApp URL construction
- `public/index.html` — schema.org `telephone`
- `.env.example` — `NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER`
- `lib/handlers.js` — `renderConfirmationPage` for fallback link

Should be sourced from `system_settings.brand` or `/api/config`.
