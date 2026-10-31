import {watchedDate} from './core.js';
export const filterDefaults={hideWatched:false,seenBefore:'',minPlays:0,maxPlays:null};
export function filters(value={}){
  const result={...filterDefaults,...value};
  if(typeof result.seenBefore!=='string')throw new Error('Enter a valid last-seen date.');
  if(typeof result.hideWatched!=='boolean' || !Number.isInteger(result.minPlays) || result.minPlays<0 || (result.maxPlays!==null&&(!Number.isInteger(result.maxPlays)||result.maxPlays<result.minPlays)))throw new Error('Watch counts must be whole numbers, with maximum at least minimum.');
  if(result.seenBefore && (!/^\d{4}-\d{2}-\d{2}$/.test(result.seenBefore)||new Date(result.seenBefore).toISOString().slice(0,10)!==result.seenBefore))throw new Error('Enter a valid last-seen date.');
  return {hideWatched:result.hideWatched,seenBefore:result.seenBefore,minPlays:result.minPlays,maxPlays:result.maxPlays};
}
export function movieSlug(value){if(typeof value!=='string'||!/^[a-z0-9][a-z0-9-]{0,200}$/.test(value))throw new Error('Invalid movie identifier.');return value;}
export function toolsForMovies(state,slugs,now=Date.now()){
  const rows=new Map();
  for(const row of state.cache?.movies || []){if(row.plays<1)continue;rows.set(String(row.movie.ids.trakt),row);if(row.movie.ids.slug)rows.set(row.movie.ids.slug,row);}
  const ready=!!state.tokens&&!!state.cache;
  const cutoff=new Date(now),month=cutoff.getUTCMonth();cutoff.setUTCFullYear(cutoff.getUTCFullYear()-3);if(cutoff.getUTCMonth()!==month)cutoff.setUTCDate(0);
  return slugs.slice(0,500).map(slug=>{
    const row=ready?rows.get(slug):null;
    const date=row?watchedDate({id:`movie:${row.movie.ids.trakt}`,lastWatchedAt:row.last_watched_at},now):null;
    return {watched:ready?!!row:null,plays:ready?(row?.plays || 0):null,date:date?.replace('Last watched ','') || null,rewatch:!!date&&Date.parse(row.last_watched_at)<cutoff.getTime(),title:row?.movie.title || null,year:row?.movie.year || null,username:state.username || null};
  });
}
export function noteKeys(state,slug){
  movieSlug(slug);
  const row=state.cache?.movies?.find(r=>r.movie.ids.slug===slug||String(r.movie.ids.trakt)===slug);
  return row?[`movie:${row.movie.ids.trakt}`,`slug:${row.movie.ids.slug}`,`slug:${slug}`]:[`slug:${slug}`];
}
export function justWatchUrl(title,country='us'){
  if(typeof title!=='string'||!title.trim()||title.length>250)throw new Error('Movie title is missing.');
  if(!/^[a-z]{2}$/.test(country))throw new Error('Use a two-letter JustWatch country code.');
  return `https://www.justwatch.com/${country}/search?q=${encodeURIComponent(title.trim())}`;
}
