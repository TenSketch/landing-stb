# Google Maps, Places & Routes Integration

**Revalidated:** 2026-10-15  
**Source files:** `public/src/main.js`, `server.js`, `lib/handlers.js`, `lib/googleMapsConfig.js`

## Current flow

1. Customer UI calls `GET /api/config`.
2. The response's `googleMapsApiKey` is the browser key only.
3. `public/src/main.js` loads Maps JavaScript + Places Autocomplete if a browser key is present.
4. If no browser key is present, the customer form uses local Singapore landmark presets.
5. Fare estimation calls the server's `handleEstimateFare()`.
6. The server uses Routes API when a server key is configured; without it, coordinate-based requests use a clearly approximate distance fallback. Place-ID-only requests cannot be resolved without Google and should receive a clear validation error.

## Key separation — required configuration

Use two different keys:

| Variable | Used by | Restriction | Public? |
|---|---|---|---|
| `GOOGLE_MAPS_BROWSER_API_KEY` | Maps JavaScript API + Places API | HTTP referrers limited to approved STB domains and required browser APIs | Yes, by design; returned as `googleMapsApiKey` |
| `GOOGLE_MAPS_SERVER_API_KEY` | Routes API from server | Server source/IP restriction and Routes API only | **No** |
| `GOOGLE_MAPS_API_KEY` | Legacy server-only fallback during migration | Treat as server-only; never expose through public config | **No** |

The key-separation helper is `lib/googleMapsConfig.js`. A browser key is not a secret; the safety boundary is restrictions and quotas. A server key must never be returned from `/api/config`, placed in frontend source, or printed in logs.

## Google Cloud setup checklist

1. Create a staging browser key and server key separately.
2. Enable billing only for the intended Google Cloud project and set quota/budget alerts.
3. Enable Maps JavaScript API and Places API for the browser key.
4. Restrict browser key by HTTP referrer to the exact approved staging/production domains.
5. Enable Routes API for the server key and restrict it to the server source/IP where supported.
6. Set `GOOGLE_MAPS_BROWSER_API_KEY` and `GOOGLE_MAPS_SERVER_API_KEY` in the deployment secret/config store. Do not paste server keys into chat or commit them.
7. Test valid keys, missing keys, invalid restrictions, quota failures and network failures.
8. Verify autocomplete and route estimate in the browser, and confirm public config does not contain the server key.

## Fallback and pricing safety

- Local presets help users choose common Singapore locations without Google, but are not equivalent to global autocomplete.
- Coordinate-only fallback is an estimate, not a guaranteed road distance or quote. The UI must make that limitation clear.
- The server must calculate fare; never trust a client-submitted fare.
- Route API failures need timeouts and useful errors/fallback behavior. Add bounded caching only after checking route input, freshness and billing implications.
- Avoid logging API keys or full sensitive request data.

## Test evidence and remaining work

- Unit regression tests cover browser/server key separation in the tested PR branch.
- The 2026-10-15 isolated QA report does not use real Google credentials or verify billing/quota restrictions.
- After the key split is merged, request the required configuration only when ready to enter Google Cloud and apply restrictions. Do not ask for the server key to be pasted into this conversation.
