export const defaults = { minProgress: 5, completeProgress: 90, dimWatched: false, showProgress: true, hideWatched: false, showDiagnostics: false, checkUpdates: true, traktLastSeen: true };
export function settings(input = {}) {
  const result = { ...defaults, ...input };
  if (!Number.isFinite(result.minProgress) || !Number.isFinite(result.completeProgress) || result.minProgress < 0 || result.completeProgress > 100 || result.minProgress >= result.completeProgress) throw new Error('Thresholds must satisfy 0 ≤ minimum < complete ≤ 100.');
  return result;
}
export const normalize = title => String(title || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\b(the|an|a)\b/g, ' ').replace(/\s+/g, ' ').trim();
export function buildIndex(cache = {}, options = defaults, previous = {}) {
  const index = {}, baselines = { ...previous };
  function put(item, type, status) {
    const ids = item.ids || {};
    const keys = [ids.trakt && `trakt:${type}:${ids.trakt}`, ids.imdb && `imdb:${ids.imdb}`, ids.tmdb && `tmdb:${type}:${ids.tmdb}`, item.year && `title:${type}:${normalize(item.title)}:${item.year}`].filter(Boolean);
    for (const key of keys) index[key] = index[key] && index[key].id !== `${type}:${ids.trakt}` ? { ambiguous: true } : { ...status, id: `${type}:${ids.trakt}` };
  }
  for (const row of cache.movies || []) if (row.plays >= 1) put(row.movie, 'movie', { kind: 'watched', label: '✓', lastWatchedAt: row.last_watched_at, tooltip: `Watched ${row.plays} time${row.plays === 1 ? '' : 's'}${row.last_watched_at ? `, last on ${row.last_watched_at.slice(0,10)}` : ''}` });
  for (const row of cache.playback || []) {
    if (!row.movie || !(row.progress >= options.minProgress)) continue;
    if (index[`imdb:${row.movie.ids?.imdb}`]?.kind === 'watched' || (cache.movies || []).some(r => r.plays >= 1 && r.movie.ids.trakt === row.movie.ids.trakt)) continue;
    const complete = row.progress >= options.completeProgress;
    put(row.movie, 'movie', { kind: complete ? 'watched' : 'progress', percent: row.progress, label: complete ? '✓' : `${Math.round(row.progress)}%`, tooltip: complete ? 'Treated as watched from playback progress' : `${Math.round(row.progress)}% watched` });
  }
  for (const row of cache.shows || []) {
    const aired = row.show.aired_episodes;
    const watched = new Set((row.seasons || []).filter(s => s.number > 0).flatMap(s => (s.episodes || []).filter(e => e.plays > 0).map(e => `${s.number}:${e.number}`))).size;
    const key = String(row.show.ids.trakt), baseline = previous[key];
    if (!(aired > 0) || !watched) continue;
    const complete = watched >= aired;
    if (complete) baselines[key] = aired;
    const newCount = !complete && baseline && aired > baseline ? aired - Math.max(baseline, watched) : 0;
    const percent = Math.min(100, watched / aired * 100);
    put(row.show, 'show', { kind: complete ? 'watched' : newCount > 0 ? 'new' : 'progress', label: complete ? '✓' : newCount > 0 ? `${newCount} new · ${Math.round(percent)}%` : `${Math.round(percent)}% · ${watched}/${aired} eps`, percent, lastWatchedAt: row.last_watched_at, tooltip: `${Math.round(percent)}% · ${watched}/${aired} episodes watched (regular seasons)${newCount > 0 ? ` · ${newCount} new` : ''}` });
  }
  return { index, baselines };
}
export function watchedDate(status, now = Date.now()) {
  const date = new Date(status?.lastWatchedAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() > now) return null;
  const cutoff = new Date(now), month=cutoff.getUTCMonth();cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
  if(cutoff.getUTCMonth()!==month)cutoff.setUTCDate(0);
  if (status.id?.startsWith('show:') && date.getTime() >= cutoff.getTime()) return null;
  return `Last watched ${date.toISOString().slice(0,10)}`;
}
export function movieDates(state, slugs, now=Date.now()) {
  const dates=new Map();
  if(state.tokens && state.settings?.traktLastSeen!==false)for(const row of state.cache?.movies || []){
    if(row.plays<1)continue;
    const date=watchedDate({id:`movie:${row.movie.ids.trakt}`,lastWatchedAt:row.last_watched_at},now);
    if(!date)continue;
    const value={date:date.replace('Last watched ','') ,username:state.username || null};
    if(row.movie.ids.slug)dates.set(row.movie.ids.slug,value);
    dates.set(String(row.movie.ids.trakt),value);
  }
  return slugs.slice(0,500).map(slug=>dates.get(slug) || null);
}
export function diagnostic(state, item, status = match(state.index || {}, item)) {
  if (!state.tokens) return 'Connect Trakt in the extension popup.';
  if (!state.cache || !state.lastSync) return 'Sync needed: no history has been downloaded yet.';
  if (state.error || Date.now()-state.lastSync > 3600000) return 'Sync needed: showing cached history.';
  if (status) return `Matched Trakt history: ${status.tooltip}`;
  if (!(item.imdb || item.tmdb || (item.title && item.year && item.type))) return 'No reliable match: title ID or release year is missing.';
  return 'No cached watch record. Open the title page for a verified Trakt match.';
}
export function match(index, item) {
  const keys = [item.imdb && `imdb:${item.imdb}`, item.tmdb && item.type && `tmdb:${item.type}:${item.tmdb}`].filter(Boolean);
  if (keys.length) {
    const hits = keys.map(k => index[k]).filter(Boolean);
    if (hits.some(s => s.ambiguous) || new Set(hits.map(s => s.id)).size > 1) return null;
    return hits[0] || null;
  }
  if (!item.year || !item.type || !item.title) return null;
  const hit = index[`title:${item.type}:${normalize(item.title)}:${item.year}`];
  return hit?.ambiguous ? null : hit || null;
}
