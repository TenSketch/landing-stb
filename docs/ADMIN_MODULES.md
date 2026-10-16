# Admin Modules

> Verified against `public/admin/app.js` and `lib/api.js` as of commit `15e4184`.

## Current Admin Modules

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| Dashboard | `/admin` | ✅ Working | Stats cards, recent bookings |
| Bookings | `/admin/bookings` | ⚠️ Partial | List + status change + accessible driver assignment dialog; server-side driver eligibility remains to verify |
| Customers | `/admin/customers` | ❌ Not implemented | Listed in nav but no UI |
| Vehicles | `/admin/vehicles` | ✅ Working | Full CRUD with extended fields |
| Pricing | `/admin/pricing` | ⚠️ Partial | Rules list, add form, add/edit modal |
| Drivers | `/admin/drivers` | ❌ Not implemented | Listed in nav but no UI |
| Content | `/admin/content` | ✅ Working | FAQ/services/hero/footer CRUD |
| Settings | `/admin/settings` | ⚠️ Partial | General + booking tabs |
| Notifications | `/admin/notifications` | ❌ Not implemented | Listed in nav but no UI |
| Payments | `/admin/payments` | ❌ Not implemented | Listed in nav but no UI |
| Integrations | `/admin/integrations` | ⚠️ Partial | Provider list, edit form |
| Users & Roles | `/admin/users` | ⚠️ Partial | User list, role editor |
| Audit Logs | `/admin/audit` | ✅ Working | Filterable log table |
| Sign Out | — | ✅ Working | Clears cookie, redirects |

## Navigation

Sidebar navigation is role-aware — `hasPerm()` checks UI visibility.

Current `app.js` topbar has hamburger + brand + user avatar + sign-out button.

## Module Implementation Details

### Bookings
- List: `GET /api/admin/bookings` with optional `?status=&date=&assigned=`
- Status update: `PUT /api/admin/bookings/:voucherCode/status`
- Driver assignment: `PUT /api/admin/bookings/:voucherCode/assign-driver` with JSON body `{ driverId }` (UUID of an active driver record; client-supplied driver details are ignored)
- Driver assignment uses a modal that shows the selected driver's details for confirmation; the server resolves every value from the driver record.
- The dialog has an accessible name/description, labelled controls, Escape-to-close, focus trapping, and focus restoration.
- The admin API resolves the submitted driver ID against the database and rejects missing, malformed or inactive drivers; it ignores client-supplied driver details.
- The assignment-choice endpoint is scoped to the dispatch permission and returns only fields needed by the modal.
- Regression coverage checks active-driver assignment, malformed IDs and inactive-driver rejection.

### Customers
- Nav link exists but no route handler or UI component
- Backend `GET /api/admin/customers` exists in `lib/api.js` line 500-515
- Need: UI list + detail view + booking history

### Drivers
- Nav link exists but no route handler or UI component
- Backend `GET /api/admin/drivers` exists in `lib/api.js` line 458-476
- Need: UI list + add/edit form

### Notifications
- Nav link exists but no route handler or UI component
- Backend `GET /api/admin/notification-templates` exists
- Need: Template editor with subject/body fields

### Payments
- Nav link exists but no route handler or UI component
- No backend route for payment management
- Need: Decide scope — transaction history? refund? configuration?

## Extensibility Pattern

The admin SPA uses a simple render-based navigation pattern in `app.js`:

```javascript
if (path === '/vehicles') renderVehicles();
if (path === '/bookings') renderBookings();
```

To add a new module:
1. Add nav link with `hasPerm('module.permission')` guard
2. Add route check in `navigateTo(path)`
3. Create `renderModuleName()` function
4. Add API call in that function
5. Add permission key to `lib/rbac.js seedRolesAndPermissions()`

**Gap**: No formal module registration system. Duplication of auth/API patterns across modules.

## Incomplete Components (app.js)

| Component | Lines | Status |
|-----------|-------|--------|
| Dashboard stats | ~1800-1900 | Working |
| Bookings table | ~280-550 | Working |
| Booking status change | ~370-390 | Working (no error feedback) |
| Driver assign | ~380-400 | Working but uses `prompt()` |
| Customer tab | — | Not implemented |
| Driver tab | — | Not implemented |
| Notification templates | — | Not implemented |
| Payment management | — | Not implemented |

## Accessibility follow-up — driver assignment dialog

The driver assignment dialog in `public/admin/app.js` is keyboard-operable: focus moves into the dialog, Tab/Shift+Tab stays within it, Escape and close/cancel controls close it, and focus is restored to the invoking control. The dialog exposes `role="dialog"`, `aria-modal="true"`, a labelled heading and description, and explicit labels for its form controls.

Manual browser verification is still required for keyboard-only use, screen-reader announcements, narrow viewport behavior and focus restoration after the booking list refresh. Automated syntax/CI success is not a substitute for this manual check.
