/**
 * Google Maps key separation.
 *
 * Browser keys are intentionally public and must be restricted by HTTP referrer
 * and API. Server keys must never be returned from public configuration routes.
 */
export function getBrowserMapsApiKey(env = process.env) {
  return String(env.GOOGLE_MAPS_BROWSER_API_KEY || env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
}

export function getServerMapsApiKey(env = process.env) {
  // GOOGLE_MAPS_API_KEY is a legacy server-only fallback. Never expose it to the browser.
  return String(env.GOOGLE_MAPS_SERVER_API_KEY || env.GOOGLE_MAPS_API_KEY || '').trim();
}
