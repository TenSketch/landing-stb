# API Reference

> Verified against `lib/api.js` and `server.js` as of commit `15e4184`.

Base URL: `https://api.singaporetourbooking.com` (prod) or `http://api.localhost:3003` (local)

## Public Endpoints (no auth required)

### `GET /api/config`
Returns safe customer-facing brand/booking configuration.

**Response 200:**
```json
{
  "brandName": "Singapore Tour Booking",
  "contactPhone": "+65 9062 9107",
  "contactWhatsApp": "6590629107",
  "contactEmail": "bookings@singaporetourbooking.com",
  "address": "Singapore",
  "social": { "telegram": "...", "facebook": "..." },
  "currency": "SGD",
  "timezone": "Asia/Singapore",
  "bookingModes": ["one_way", "hourly", "daily"],
  "tollsText": "Tolls excluded.",
  "fareDisclaimer": "Estimated Transport Fare",
  "googleMapsApiKey": "AIza..."
}
```

### `GET /api/vehicles`
Returns active vehicle types for customer selection.

**Response 200:**
```json
{
  "vehicles": [
    {
      "id": 1,
      "name": "4-Seater",
      "slug": "sedan-4",
      "full_name": "Mercedes-Benz E-Class Executive Sedan",
      "category": "sedan",
      "tag": "Popular",
      "tag_style": "bg-green-100 text-green-800",
      "pax_max": 4,
      "luggage_capacity": 2,
      "image_url": "https://...",
      "base_fare_sgd": "40.00",
      "per_km_sgd": "2.20",
      "min_fare_sgd": "55.00",
      "hourly_sgd": "60.00",
      "features_json": ["Nappa Leather Interior", "Burmester Sound System"]
    }
  ]
}
```

### `GET /api/content`
Returns public content blocks (FAQ, services, hero, footer).

**Query params:** `?category=faq`

**Response 200:**
```json
{
  "blocks": [
    { "id": "uuid", "category": "faq", "key": "general_1", "title": "...", "content": "...", "meta_json": {} }
  ]
}
```

### `POST /api/estimate`
Calculate fare estimate.

**Request:**
```json
{
  "bookingType": "one_way",
  "pickupPlaceId": "place:changi_t1",
  "destinationPlaceId": "place:marina_bay",
  "vehicleType": "4-Seater",
  "dateTime": "2026-09-27 14:00"
}
```

**Response 200:**
```json
{
  "currency": "SGD",
  "vehicleType": "4-Seater",
  "distanceKm": 25.3,
  "durationMin": 35,
  "baseFare": 40,
  "perKmRate": 2.2,
  "kmFare": 55.66,
  "totalFare": 95.66,
  "minFareApplied": false,
  "surcharges": [{ "name": "CBD", "amount": 3 }],
  "tolls": 0,
  "estimatedTotal": 98.66
}
```

### `POST /api/bookings`
Create a booking (guest or authenticated).

**Request:**
```json
{
  "bookingType": "one_way",
  "pickupPlaceId": "place:changi_t1",
  "destinationPlaceId": "place:marina_bay",
  "pickupAddress": "Changi Airport Terminal 1",
  "destinationAddress": "Marina Bay Sands",
  "vehicleType": "4-Seater",
  "dateTime": "2026-09-27 14:00",
  "flightNumber": "SQ 123",
  "passengerName": "John Tan",
  "passengerEmail": "john@example.com",
  "passengerPhone": "+65 9123 4567",
  "notes": "Large luggage"
}
```

**Response 200:**
```json
{
  "booking": {
    "voucherCode": "STB-20260927-XXXX",
    "status": "PENDING",
    "estimatedFare": 98.66,
    "pickup": "Changi Airport Terminal 1",
    "destination": "Marina Bay Sands",
    "vehicle": "4-Seater",
    "dateTime": "2026-09-27 14:00",
    "driverNote": "Our team will contact you within 30 minutes."
  }
}
```

## Admin Endpoints (cookie auth required)

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/auth/login` | — | Email + password login |
| POST | `/api/admin/auth/logout` | — | Clear session cookie |
| GET | `/api/admin/auth/session` | — | Current admin + permissions |
| POST | `/api/admin/auth/request-password-reset` | — | Send reset email |
| POST | `/api/admin/auth/reset-password` | — | Set new password with token |
| POST | `/api/admin/auth/request-otp` | SuperAdmin | Request OTP for 2FA |
| POST | `/api/admin/auth/verify-otp` | SuperAdmin | Verify OTP after password login |

### Dashboard

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/dashboard` | `dashboard.view` | Stats, recent bookings |

### Bookings

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/bookings` | `bookings.view` | List with filters |
| GET | `/api/admin/bookings/:voucherCode` | `bookings.view` | Detail |
| PUT | `/api/admin/bookings/:voucherCode/status` | `bookings.update_status` | Update status |
| PUT | `/api/admin/bookings/:voucherCode/assign-driver` | `bookings.assign_driver` | Assign driver |
| GET | `/api/admin/audit` | `audit.view` | Audit log |

### Vehicles

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/vehicles` | `vehicles.view` | List all |
| POST | `/api/admin/vehicles` | `vehicles.manage` | Create basic |
| PUT | `/api/admin/vehicles/:id/extended` | `vehicles.manage` | Update all extended fields |
| PUT | `/api/admin/vehicles/:id` | `vehicles.manage` | Update basic |
| PUT | `/api/admin/vehicles/:id/activate` | `vehicles.manage` | Activate |
| PUT | `/api/admin/vehicles/:id/deactivate` | `vehicles.manage` | Deactivate |

### Drivers

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/drivers` | `drivers.view` | List |
| POST | `/api/admin/drivers` | `drivers.manage` | Create |
| PUT | `/api/admin/drivers/:id` | `drivers.manage` | Update |
| DELETE | `/api/admin/drivers/:id` | `drivers.manage` | Soft delete |

### Pricing

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/pricing` | `pricing.view` | All pricing rules |
| POST | `/api/admin/pricing` | `pricing.manage` | Create rule |
| PUT | `/api/admin/pricing/rules/:id` | `pricing.manage` | Update rule |
| DELETE | `/api/admin/pricing/rules/:id` | `pricing.manage` | Delete rule |
| GET | `/api/admin/pricing/route-overrides` | `pricing.view` | Route overrides |
| POST | `/api/admin/pricing/route-overrides` | `pricing.manage` | Create override |
| PUT | `/api/admin/pricing/route-overrides/:id` | `pricing.manage` | Update |
| DELETE | `/api/admin/pricing/route-overrides/:id` | `pricing.manage` | Delete |
| GET | `/api/admin/pricing/surcharges` | `pricing.view` | Surcharges |
| POST | `/api/admin/pricing/surcharges` | `pricing.manage` | Create |
| PUT | `/api/admin/pricing/surcharges/:id` | `pricing.manage` | Update |
| DELETE | `/api/admin/pricing/surcharges/:id` | `pricing.manage` | Delete |
| POST | `/api/admin/pricing/surcharges/bulk` | `pricing.manage` | Replace all surcharges |

### Content

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/content` | `content.view` | List all blocks |
| GET | `/api/admin/content/:category` | `content.view` | List by category |
| PUT | `/api/admin/content/:id` | `content.manage` | Update block |
| POST | `/api/admin/content` | `content.manage` | Create block |

### Settings

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/settings/general` | `settings.view` | Brand/system settings |
| PUT | `/api/admin/settings/general` | `settings.manage` | Update |
| GET | `/api/admin/settings/booking` | `settings.view` | Booking settings |
| PUT | `/api/admin/settings/booking` | `settings.manage` | Update |
| GET | `/api/admin/settings/notifications` | `notifications.view` | Notification settings |
| PUT | `/api/admin/settings/notifications` | `notifications.manage` | Update |

### Integrations

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/integrations` | `integrations.view` | List all (no secrets) |
| PUT | `/api/admin/integrations/:type` | `integrations.manage` | Update config + secrets |

### Users & Roles

| Method | Path | Perm | Description |
|--------|------|------|-------------|
| GET | `/api/admin/roles` | `roles.view` | List roles |
| POST | `/api/admin/roles` | `roles.manage` | Create role |
| PUT | `/api/admin/roles/:id` | `roles.manage` | Update role + permissions |
| DELETE | `/api/admin/roles/:id` | `roles.manage` | Delete (non-system only) |
| GET | `/api/admin/users` | `users.view` | List admin users |
| POST | `/api/admin/users` | `users.manage` | Create user |
| PUT | `/api/admin/users/:id` | `users.manage` | Update user |
| DELETE | `/api/admin/users/:id` | `users.manage` | Deactivate user |

## Customer Endpoints (cookie auth required)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/customer/register` | — | Register |
| POST | `/api/customer/login` | — | Login |
| POST | `/api/customer/logout` | — | Logout |
| GET | `/api/customer/me` | Customer | Get profile |
| PUT | `/api/customer/me` | Customer | Update profile |
| POST | `/api/customer/change-password` | Customer | Change password |
| GET | `/api/customer/bookings` | Customer | List bookings |
| GET | `/api/customer/bookings/:voucherCode` | Customer | Booking detail |
| POST | `/api/customer/request-password-reset` | — | Request reset |
| POST | `/api/customer/reset-password` | — | Reset with token |

## Error Response Format

All errors follow:
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_CODE"
}
```

Common codes: `INVALID_CREDENTIALS`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `RATE_LIMITED`, `SERVER_ERROR`

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 429 | Rate limited |
| 500 | Server error |
