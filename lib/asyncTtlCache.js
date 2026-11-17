/**
 * Small async TTL cache with single-flight loading and invalidation generations.
 * If invalidated while a loader is in flight, its result is not cached.
 */
export function createAsyncTtlCache(loader, { ttlMs = 30_000, now = Date.now } = {}) {
  let value;
  let hasValue = false;
  let expiresAt = 0;
  let generation = 0;
  let inFlight = null;

  async function get({ force = false } = {}) {
    if (force) invalidate();
    if (hasValue && now() < expiresAt) return value;
    if (inFlight) return inFlight;

    const startedGeneration = generation;
    const promise = Promise.resolve()
      .then(loader)
      .then(loaded => {
        if (startedGeneration === generation) {
          value = loaded;
          hasValue = true;
          expiresAt = now() + Math.max(0, ttlMs);
        }
        return loaded;
      })
      .finally(() => {
        if (inFlight === promise) inFlight = null;
      });
    inFlight = promise;
    return promise;
  }

  function invalidate() {
    generation++;
    value = undefined;
    hasValue = false;
    expiresAt = 0;
    // Let a new caller start a fresh load even if an older load is still pending.
    inFlight = null;
  }

  return { get, invalidate };
}
