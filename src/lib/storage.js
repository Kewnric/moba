// Browser saves that never throw: unreadable data falls back to defaults (keeping a backup copy),
// and failed writes are reported instead of crashing the app.

export const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

export function createSafeStorage(getStorage, onError = () => {}) {
  const report = (action, key, error) => onError({ action, key, error });

  return {
    read(key, fallback, isValid = () => true) {
      let raw;
      try {
        raw = getStorage().getItem(key);
      } catch (error) {
        report('read', key, error);
        return fallback;
      }
      if (raw === null || raw === undefined) return fallback;
      try {
        const value = JSON.parse(raw);
        if (!isValid(value)) throw new Error(`Saved "${key}" is not in the expected format`);
        return value;
      } catch (error) {
        // Keep the unreadable copy so the next save doesn't destroy the only trace of it.
        try { getStorage().setItem(`${key}_corrupt_backup`, raw); } catch (_) { /* storage unusable */ }
        report('read', key, error);
        return fallback;
      }
    },
    write(key, value) {
      try {
        getStorage().setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        report('write', key, error);
        return false;
      }
    },
    remove(key) {
      try {
        getStorage().removeItem(key);
        return true;
      } catch (error) {
        report('remove', key, error);
        return false;
      }
    },
  };
}
