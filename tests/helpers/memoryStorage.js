// In-memory stand-in for window.localStorage.
export const memoryStorage = (initial = {}) => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => { items.set(key, String(value)); },
    removeItem: (key) => { items.delete(key); },
    key: (index) => Array.from(items.keys())[index] ?? null,
    get length() { return items.size; },
  };
};
