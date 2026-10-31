import { normalize } from './core.js';

export function titleKey(item) {
  if (!['movie', 'show'].includes(item?.type)) throw new Error('Unknown title type.');
  if (/^tt\d+$/.test(item.imdb)) return `${item.type}:imdb:${item.imdb}`;
  if (/^\d+$/.test(String(item.tmdb))) return `${item.type}:tmdb:${item.tmdb}`;
  if (item.title && Number.isInteger(Number(item.year)) && Number(item.year) > 1800) return `${item.type}:title:${normalize(item.title)}:${item.year}`;
  throw new Error('This title has no reliable ID or release year yet.');
}

export function createFeatures({ read, save, request, access, pages }) {
  const pending = new Map();
  let queue = Promise.resolve(), blockedUntil = 0;
  function serial(work) {
    const task = queue.then(async () => {
      if (Date.now() < blockedUntil) throw new Error('Trakt is busy. Please try again later.');
      try { return await work(); }
      catch (e) { if (e.status === 429) blockedUntil = Date.now() + 60000; throw e; }
    });
    queue = task.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 350)));
    return task;
  }
  async function resolve(item, state) {
    const opts = {clientId: state.credentials.clientId};
    const type = item.type, plural = type === 'movie' ? 'movies' : 'shows';
    if (/^tt\d+$/.test(item.imdb)) return request(`/${plural}/${item.imdb}?extended=full`, opts);
    let results;
    if (/^\d+$/.test(String(item.tmdb))) results = await request(`/search/tmdb/${item.tmdb}?type=${type}`, opts);
    else results = await request(`/search/${type}?query=${encodeURIComponent(item.title)}&years=${Number(item.year)}`, opts);
    const hits = results.filter(r => r.type === type).map(r => r[type]).filter(Boolean).filter(title => item.tmdb ? String(title.ids?.tmdb) === String(item.tmdb) : normalize(title.title) === normalize(item.title) && Number(title.year) === Number(item.year));
    if (new Set(hits.map(title => title.ids?.trakt)).size !== 1 || !hits[0]?.ids?.trakt) throw new Error('No unambiguous Trakt match for this title.');
    return request(`/${plural}/${hits[0].ids.trakt}?extended=full`, opts);
  }
  async function detail(item) {
    const key = titleKey(item), state = await read();
    if (!state.tokens || !state.credentials) throw new Error('Connect Trakt in the extension popup first.');
    const cached = state.titleDetails?.[key];
    if (cached && Date.now() - cached.fetchedAt < 86400000) return cached;
    if (pending.has(key)) return pending.get(key);
    const task = serial(async () => {
      const title = await resolve(item, state);
      if (!title?.ids?.trakt) throw new Error('Trakt did not return a title ID.');
      const value = {trakt: title.ids.trakt, type:item.type, rating:typeof title.rating === 'number' ? title.rating : null, votes:title.votes || 0, fetchedAt:Date.now()};
      const current = await read();
      if (current.credentials?.clientId !== state.credentials.clientId || current.tokens?.access_token !== state.tokens.access_token) throw new Error('Account changed. Please try again.');
      const entries = Object.entries({...current.titleDetails, [key]:value}).sort((a,b)=>b[1].fetchedAt-a[1].fetchedAt).slice(0,1500);
      await save({titleDetails:Object.fromEntries(entries)}); return value;
    }).finally(()=>pending.delete(key));
    pending.set(key,task); return task;
  }
  async function add(item) {
    const title = await detail(item), key = `add:${title.type}:${title.trakt}`;
    if (pending.has(key)) return pending.get(key);
    // User writes must not wait behind the rating request queue.
    const task = (async () => {
      if ((await membership(item)).inWatchlist) return {added:true, existing:true};
      const state = await read(), token = await access(state);
      const plural = title.type === 'movie' ? 'movies' : 'shows';
      const result = await request('/sync/watchlist', {clientId:state.credentials.clientId, token, body:{[plural]:[{ids:{trakt:title.trakt}}]}});
      if (result.not_found?.[plural]?.length || !((result.added?.[plural] || 0) + (result.existing?.[plural] || 0))) throw new Error('Trakt did not add this title to your watchlist.');
      const current = await read();
      if (!current.tokens || current.credentials?.clientId !== state.credentials.clientId) throw new Error('Account changed.');
      const snapshot = current.watchlistCache?.[title.type] || {ids:[],fetchedAt:Date.now()};
      await save({watchlistCache:{...current.watchlistCache,[title.type]:{...snapshot,ids:[...new Set([...snapshot.ids,title.trakt])]}}});
      return {added:true, existing:!!result.existing?.[plural]};
    })().finally(()=>pending.delete(key));
    pending.set(key, task); return task;
  }
  async function membership(item) {
    const title = await detail(item), type = title.type, state = await read();
    let snapshot = state.watchlistCache?.[type];
    if (!snapshot || Date.now()-snapshot.fetchedAt > 300000) {
      const key = `watchlist:${type}`;
      if (!pending.has(key)) {
        const task = (async () => {
          const token = await access(await read());
          const rows = await pages(`/sync/watchlist/${type === 'movie' ? 'movies' : 'shows'}`, {clientId:state.credentials.clientId,token});
          const value = {ids:rows.map(row=>row[type]?.ids?.trakt).filter(Number.isFinite),fetchedAt:Date.now()};
          const current = await read();
          if (!current.tokens || current.credentials?.clientId !== state.credentials.clientId) throw new Error('Account changed.');
          await save({watchlistCache:{...current.watchlistCache,[type]:value}});
          return value;
        })().finally(()=>pending.delete(key));
        pending.set(key,task);
      }
      snapshot = await pending.get(key);
    }
    return {inWatchlist:snapshot.ids.includes(title.trakt),trakt:title.trakt};
  }
  return { detail, add, membership };
}
