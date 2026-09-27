# Database Schema

> Verified against migrations 001-010 as of commit `15e4184`.

## Entity Relationships

```mermaid
erDiagram
    ADMIN_USERS ||--o{ AUDIT_LOGS : creates
    ADMIN_USERS ||--o{ ADMIN_SESSIONS : has
    ADMIN_USERS }o--|| ROLES : belongs_to
    ROLES ||--o{ ROLE_PERMISSIONS : has
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : granted_to
    CUSTOMERS ||--o{ CUSTOMER_SESSIONS : has
    CUSTOMERS ||--o{ CUSTOMER_BOOKINGS : makes
    CUSTOMERS ||--o{ CUSTOMER_DEVICE_TOKENS : has
    CUSTOMERS ||--o{ CUSTOMER_PASSWORD_RESET_TOKENS : requests
    BOOKINGS ||--o{ BOOKING_STATUS_HISTORY : has
    BOOKINGS }o--|| CUSTOMERS : belongs_to
    BOOKINGS }o--|| DRIVERS : assigned_to
    BOOKINGS }o--|| VEHICLE_TYPES : uses
    BOOKING_STATUS_HISTORY ||--o{ ADMIN_USERS : changed_by
    VEHICLE_TYPES ||--o{ PRICING_RULES : has
    VEHICLE_TYPES ||--o{ VEHICLE_ROUTE_OVERRIDES : has
    ROUTE_OVERRIDES }o--|| PLACES : from
    ROUTE_OVERRIDES }o--|| PLACES : to
    SURCHARGES }o--|| VEHICLE_TYPES : applies_to
    CONTENT_BLOCKS ||--|| PLACES : references
    SYSTEM_SETTINGS ||--|| PLACES : keyed_by
    INTEGRATION_SETTINGS ||--|| PLACES : keyed_by
    NOTIFICATION_TEMPLATES ||--|| PLACES : channel_event
```

## Tables

### Core

| Table | Key | Notes |
|-------|-----|-------|
| `places` | `id` | Airport/hotel/geofence locations |
| `vehicle_types` | `id` | Name, pax, luggage, image, sort_order, is_active |
| `drivers` | `id` uuid | Name, phone, plate, vehicle_type_id, is_active |

### Auth & RBAC

| Table | Key | Notes |
|-------|-----|-------|
| `roles` | `id`, `slug` | is_system_role prevents deletion |
| `permissions` | `id`, `key` | module.action pattern |
| `role_permissions` | `role_id, permission_id` | Junction |
| `admin_users` | `id` uuid | email unique, password_hash, role_id, is_active |
| `admin_sessions` | `id` uuid | admin_id, token_hash, expires_at |
| `password_reset_tokens` | `id` uuid | email, token_hash, expires_at, used_at |

### Customers

| Table | Key | Notes |
|-------|-----|-------|
| `customers` | `id` uuid | email unique, password_hash, name, phone, whatsapp |
| `customer_sessions` | `id` uuid | customer_id, token_hash, expires_at |
| `customer_device_tokens` | `id` uuid | customer_id, token, provider (FCM) |
| `customer_password_reset_tokens` | `id` uuid | customer_id, token_hash, expires_at, used_at |

### Bookings

| Table | Key | Notes |
|-------|-----|-------|
| `bookings` | `id` uuid, `voucher_code` | status, pricing, passenger, driver, vehicle |
| `booking_status_history` | `id` uuid | booking_id, status, changed_by, notes, created_at |

### Pricing

| Table | Key | Notes |
|-------|-----|-------|
| `pricing_rules` | `id` uuid | vehicle_type_id, origin_place_id, destination_place_id, mode |
| `vehicle_route_overrides` | `id` uuid | vehicle_type_id, from_place_id, to_place_id, mode |
| `surcharges` | `id` uuid | name, type, amount, is_active |

### Settings & Config

| Table | Key | Notes |
|-------|-----|-------|
| `system_settings` | `key` | brand_name, contact_phone, whatsapp, email, address, social |
| `booking_settings` | `key` | modes, require_customer_data, reference_prefix |
| `notification_settings` | `channel` | EMAIL/SMS/WHATSAPP/FIREBASE enabled + config |
| `notification_templates` | `id` | channel, event, name, subject, body, is_active |
| `content_blocks` | `id` uuid | category + key unique, title, content, meta_json |

### Integrations

| Table | Key | Notes |
|-------|-----|-------|
| `integration_settings` | `provider_type` | PAYMENT/SMS/WHATSAPP/EFC/FIREBASE/EMAIL |

## Column Alignment Issue

**Migration 010** added columns to `vehicle_types` for alignment with `lib/vehicles.js`:

| Column | Type | Notes |
|--------|------|-------|
| `luggage_capacity` | INTEGER | Explicit; `pax_max` already existed |
| `sort_order` | INTEGER | Confusable with `display_order` |
| `image_url` | TEXT | Explicit |

Two `ORDER BY` columns exist: `sort_order` (earlier migration) and `display_order` (010). Both are used in queries — this is intentional redundancy but should be consolidated.

## Indexes

From migration 005+:
- `bookings.voucher_code` — unique index for fast lookup
- `bookings.customer_id` — for customer booking history
- `bookings.status` — for filtered lists
- `bookings.scheduled_pickup_time` — for dashboard queries

**Known missing indexes**:
- `booking_status_history.booking_id` (foreign key, should exist)
- `admin_sessions.token_hash` (used in lookups)
- `customer_sessions.token_hash`

## Migrations

Migrations run in filename order via `scripts/migrate.js`:

```
001_initial_schema.sql
002_seed_initial_data.sql
003_create_bookings_table.sql
004_rbac_and_users.sql
005_customers_and_booking_lifecycle.sql
006_configuration_and_integrations.sql
007_audit_and_notifications.sql
008_seed_platform_baseline.sql
009_editable_vehicles_and_content.sql
010_align_vehicle_columns.sql
```

**No migration tracking table** — migrations are not idempotent. Re-running `001-010` will fail on `CREATE TABLE` statements that already exist. No way to skip already-applied migrations.

## Data Integrity Issues

1. **`updateBooking` cannot clear driver fields** — `COALESCE($1, driver_name)` only writes if new value is NOT NULL; driver info set once cannot be nulled out (GDPR right to erasure concern).
2. **`createRole` runs without transaction** — if `setRolePermissions` fails, orphaned role without permissions exists.
3. **`deleteAdminUser` allows deleting initial admin** — `INITIAL_ADMIN_EMAIL` fallback to `''` in COALESCE means the email comparison is always true, removing the guard.
4. **OTP race condition** — `attempts < 3` checked then incremented without atomic compare-and-increment or row lock.

## Hardcoded Seed Data

| Data | Source |
|------|--------|
| 4 vehicle types | `002_seed_initial_data.sql` |
| 8 places | `002_seed_initial_data.sql` |
| 2 pricing rules | `002_seed_initial_data.sql` |
| Roles + permissions | `008_seed_platform_baseline.sql` |
| Content blocks (FAQ/services/hero) | `009_editable_vehicles_and_content.sql` |
| Super admin | `INITIAL_ADMIN_EMAIL` env var |
