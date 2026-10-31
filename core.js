export const defaults = { minProgress: 5, completeProgress: 90, dimWatched: false, showProgress: true };
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
    const keys = [ids.imdb && `imdb:${ids.imdb}`, ids.tmdb && `tmdb:${type}:${ids.tmdb}`, item.year && `title:${type}:${normalize(item.title)}:${item.year}`].filter(Boolean);
    for (const key of keys) index[key] = index[key] && index[key].id !== `${type}:${ids.trakt}` ? { ambiguous: true } : { ...status, id: `${type}:${ids.trakt}` };
  }
  for (const row of cache.movies || []) if (row.plays >= 1) put(row.movie, 'movie', { kind: 'watched', label: '✓', tooltip: `Watched ${row.plays} time${row.plays === 1 ? '' : 's'}${row.last_watched_at ? `, last on ${row.last_watched_at.slice(0,10)}` : ''}` });
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
    put(row.show, 'show', { kind: complete ? 'watched' : newCount > 0 ? 'new' : 'progress', label: complete ? '✓' : newCount > 0 ? `${newCount} new · ${Math.round(percent)}%` : `${Math.round(percent)}% · ${watched}/${aired} eps`, percent, tooltip: `${Math.round(percent)}% · ${watched}/${aired} episodes watched (regular seasons)${newCount > 0 ? ` · ${newCount} new` : ''}` });
  }
  return { index, baselines };
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
