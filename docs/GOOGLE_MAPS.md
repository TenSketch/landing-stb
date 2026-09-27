# Google Maps Integration

> Verified against `public/src/main.js`, `lib/api.js` as of commit `15e4184`.

## What's Used

| API | Used For | Key Source |
|-----|----------|------------|
| Maps JavaScript API | Map display on confirmation page | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| Places Autocomplete | Pickup/destination inputs | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| Routes API | Distance + duration for fare calc | `GOOGLE_SERVER_API_KEY` (server-side) |

## Flow

```
main.js loads Google Maps JS API
  → initMap() creates map
  → initAutocomplete() attaches to #pickup-input, #destination-input

Customer types → Places Autocomplete returns place_id + description
  → stored in state.pickupPlaceId, state.destinationPlaceId

On booking estimate:
  → POST /api/estimate sends place_ids
  → server calls Google Routes API (server key)
  → returns distance/duration
  → pricing.js calculates fare
```

## Configuration

```javascript
// public/src/main.js
window.__STB_ENV = {
  GOOGLE_MAPS_API_KEY: 'AIzaSy...',     // injected by server.js
  GOOGLE_PLACES_API_KEY: 'AIzaSy...',    // same key, used client-side
};
```

## Server-side Routes API Call (lib/api.js)

```javascript
Referer: referer || "https://singaporetourbooking.com/"
```

**Issue**: `referer` header used directly — potential open redirect risk if attacker controls the Referer.

## Known Issues

| Severity | Issue | Impact |
|----------|-------|--------|
| High | `referer` header used directly in Routes API call | Indirect open redirect risk |
| Medium | Google API key hardcoded in `window.__STB_ENV` injected server-side | Key visible in page source — acceptable for client-side key with domain restrictions |
| Medium | No Places Autocomplete on admin side | Admin must manually enter place IDs for pricing rules |
| Low | No timeout on server-side Routes API call | Could hang indefinitely |
| Low | No caching of Routes API responses | Repeated same-route calls hit Google billing |

## Domain Restrictions

Google Maps API keys should be restricted:
- HTTP referrer: `*.singaporetourbooking.com/*`
- API key type: Maps JavaScript + Places + Routes
