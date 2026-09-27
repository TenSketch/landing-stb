# Testing

## Existing Tests

```bash
npm test
# Runs:
# backend/tests/pricing_engine.test.js
# backend/tests/auth_and_audit.test.js
```

## Test Files Found

| File | Status |
|------|--------|
| `backend/tests/pricing_engine.test.js` | Exists |
| `backend/tests/auth_and_audit.test.js` | Exists |
| `backend/tests/customer_auth.test.js` | ❌ Does not exist (planned) |
| `backend/tests/rbac.test.js` | ❌ Does not exist (planned) |
| `backend/tests/admin_auth.test.js` | ❌ Does not exist (planned) |
| `backend/tests/booking_lifecycle.test.js` | ❌ Does not exist (planned) |
| `backend/tests/dynamic_settings.test.js` | ❌ Does not exist (planned) |
| `backend/tests/notification_engine.test.js` | ❌ Does not exist (planned) |
| `backend/tests/security_boundaries.test.js` | ❌ Does not exist (planned) |

## Running Tests

```bash
# From project root
npm test
```

## Coverage Gaps

- No unit tests for `lib/vehicles.js`
- No unit tests for `lib/rbac.js` createRole transaction
- No unit tests for `lib/bookingStatus.js` status transitions
- No unit tests for `lib/notifications.js` template routing
- No integration tests for API endpoints
- No tests for `lib/pricing.js` edge cases (route override, min fare, surcharges)
- No CSRF, XSS, or injection test suite
- No test database — tests run against development DB

## Code-Level Validation Available

```bash
node --check lib/vehicles.js       # Syntax check
node --check lib/api.js            # Syntax check
node --check server.js              # Syntax check
```
