(() => {
  const records = new Map();
  let pending;
  function flush() { clearTimeout(pending); pending = setTimeout(() => window.postMessage({ source: 'justtrakt:metadata', items: [...records.values()] }, location.origin), 30); }
  function walk(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    const c = value.content || value;
    const path = c.fullPath || value.fullPath;
    if (typeof path === 'string' && /\/(movie|tv-show)\/[^/]+\/?$/.test(path)) {
      const ids = c.externalIds || value.externalIds || {};
      const old = records.get(path) || {};
      records.set(path, { ...old, path, type: path.includes('/tv-show/') ? 'show' : 'movie', title: c.title || old.title, year: c.originalReleaseYear || old.year, imdb: ids.imdbId || old.imdb, tmdb: ids.tmdbId || old.tmdb });
    }
    for (const child of Object.values(value)) walk(child, seen);
  }
  function capture(data) { try { walk(data); flush(); } catch { /* Ignore unrelated payloads. */ } }
  const original = window.fetch;
  window.fetch = function (...args) {
    const result = original.apply(this, args);
    const url = String(args[0]?.url || args[0]);
    if (/justwatch\.com\/.*graphql|justwatch\.com\/graphql/.test(url)) result.then(r => r.clone().json()).then(capture).catch(() => {});
    return result;
  };
  const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) { this.__justtrakt = /justwatch\.com\/.*graphql|justwatch\.com\/graphql/.test(String(url)); return open.call(this, method, url, ...rest); };
  XMLHttpRequest.prototype.send = function (...args) { if (this.__justtrakt) this.addEventListener('load', () => { try { capture(this.responseType === 'json' ? this.response : JSON.parse(this.responseText)); } catch {} }); return send.apply(this, args); };
  function initial() {
    const element = document.getElementById('__NUXT_DATA__');
    if (element) try {
      const pool = JSON.parse(element.textContent), memo = new Map();
      function decode(index) {
        if (typeof index !== 'number' || index < 0) return undefined;
        if (memo.has(index)) return memo.get(index);
        const v = pool[index];
        if (!v || typeof v !== 'object') return v;
        const out = Array.isArray(v) ? [] : {}; memo.set(index, out);
        if (Array.isArray(v) && typeof v[0] === 'string') { const unwrapped = decode(v[1]); memo.set(index, unwrapped); return unwrapped; }
        for (const [k, val] of Object.entries(v)) out[k] = decode(val);
        return out;
      }
      capture(decode(0));
      // Apollo caches can keep content separately from their parent node.
      for (let i = 0; i < pool.length; i++) if (pool[i] && typeof pool[i] === 'object' && !Array.isArray(pool[i])) capture(decode(i));
    } catch {}
  }
  window.addEventListener('message', e => { if (e.source === window && e.data?.source === 'justtrakt:request') { initial(); flush(); } });
  document.addEventListener('DOMContentLoaded', initial, { once: true });
})();
