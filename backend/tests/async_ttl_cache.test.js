import assert from 'node:assert/strict';
import { createAsyncTtlCache } from '../../lib/asyncTtlCache.js';

let now = 100;
let loads = 0;
const cache = createAsyncTtlCache(async () => ({ version: ++loads }), { ttlMs: 50, now: () => now });

const first = await cache.get();
const second = await cache.get();
assert.equal(first.version, 1, 'first load returns the loader value');
assert.equal(second.version, 1, 'cache reuses a value inside the TTL');
assert.equal(loads, 1, 'fresh cache avoids repeated loader work');

now = 151;
const expired = await cache.get();
assert.equal(expired.version, 2, 'expired value reloads');
assert.equal(loads, 2, 'TTL expiry invokes the loader again');

cache.invalidate();
const invalidated = await cache.get();
assert.equal(invalidated.version, 3, 'invalidation forces a fresh value');

let release;
let concurrentLoads = 0;
const concurrent = createAsyncTtlCache(() => {
  concurrentLoads++;
  return new Promise(resolve => { release = resolve; });
}, { ttlMs: 100, now: () => now });
const pendingA = concurrent.get();
const pendingB = concurrent.get();
await Promise.resolve();
assert.equal(concurrentLoads, 1, 'concurrent callers share one in-flight load');
release('shared');
assert.equal(await pendingA, 'shared');
assert.equal(await pendingB, 'shared');

let resolveOld;
let versionLoads = 0;
const racing = createAsyncTtlCache(() => {
  versionLoads++;
  if (versionLoads === 1) return new Promise(resolve => { resolveOld = resolve; });
  return Promise.resolve('fresh');
}, { ttlMs: 100, now: () => now });
const oldPending = racing.get();
await Promise.resolve();
racing.invalidate();
assert.equal(await racing.get(), 'fresh', 'new request can reload after invalidation during an in-flight load');
resolveOld('stale');
await oldPending;
assert.equal(await racing.get(), 'fresh', 'stale in-flight result does not overwrite the invalidated cache');
assert.equal(versionLoads, 2, 'invalidation during load causes a fresh load');

let attempts = 0;
const retrying = createAsyncTtlCache(async () => {
  attempts++;
  if (attempts === 1) throw new Error('expected test failure');
  return 'recovered';
}, { ttlMs: 100, now: () => now });
await assert.rejects(retrying.get(), /expected test failure/);
assert.equal(await retrying.get(), 'recovered', 'failed loads are not cached and can be retried');

console.log('Async TTL cache tests: 9 assertions passed');
