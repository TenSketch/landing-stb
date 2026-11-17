import assert from 'node:assert/strict';
import { getBrowserMapsApiKey, getServerMapsApiKey } from '../../lib/googleMapsConfig.js';

assert.equal(
  getBrowserMapsApiKey({ GOOGLE_MAPS_SERVER_API_KEY: 'server-secret', GOOGLE_MAPS_API_KEY: 'legacy-server-secret' }),
  '',
  'public/browser key must never fall back to a server-only key'
);
assert.equal(
  getBrowserMapsApiKey({ GOOGLE_MAPS_BROWSER_API_KEY: 'browser-key', GOOGLE_MAPS_SERVER_API_KEY: 'server-secret' }),
  'browser-key',
  'explicit browser key should be selected'
);
assert.equal(
  getBrowserMapsApiKey({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'public-browser-key' }),
  'public-browser-key',
  'explicitly public browser key remains supported'
);
assert.equal(
  getServerMapsApiKey({ GOOGLE_MAPS_SERVER_API_KEY: 'server-key', GOOGLE_MAPS_API_KEY: 'legacy-key' }),
  'server-key',
  'explicit server key takes priority'
);
assert.equal(
  getServerMapsApiKey({ GOOGLE_MAPS_API_KEY: 'legacy-server-key' }),
  'legacy-server-key',
  'legacy key remains server-only during migration'
);

console.log('Google Maps key separation tests: 5/5 passed');
