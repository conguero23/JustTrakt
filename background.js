import { defaults, settings, buildIndex, match, watchedDate, diagnostic } from './core.js';
import { createUpdateChecker } from './updates.js';
import { createFeatures } from './trakt-features.js';
import { AUTH, createLogin, tokenBody } from './auth.js';
const API = 'https://api.trakt.tv';
let syncTask, authTask, refreshTask, generation = 0;
// Remove legacy client secrets on upgrade; public builds use PKCE only.
const ready = chrome.storage.local.get(null).then(async state => {
  const {credentials}=state;
  if (credentials?.clientSecret) await chrome.storage.local.set({credentials:{clientId:credentials.clientId}});
  await chrome.storage.local.remove('device');
  await chrome.alarms.clear('auth');
  if(state.cache && state.dataSchema!==2)await chrome.storage.local.set({...buildIndex(state.cache,settings(state.settings),state.baselines),dataSchema:2});
});
const read = async () => { await ready; return chrome.storage.local.get(null); };
async function request(path, { body, token, clientId, raw = false } = {}) {
  const response = await fetch((path.startsWith('/oauth/') ? AUTH : API) + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'trakt-api-version': '2', 'trakt-api-key': clientId, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
  if (!response.ok) { const error = new Error(response.status === 420 ? 'Your Trakt watchlist account limit has been reached. Remove an item or check your Trakt plan.' : response.status === 429 ? 'Trakt rate limit reached. Try again later.' : response.status === 401 ? 'Trakt authorization expired. Reconnect your account.' : `Trakt request failed (${response.status}).`); error.status = response.status; throw error; }
  return raw ? response : response.status === 204 ? null : response.json();
}
async function access(state) {
  if (!state.tokens) throw new Error('Connect Trakt first.');
  if (state.tokens.created_at * 1000 + state.tokens.expires_in * 1000 > Date.now() + 120000) return state.tokens.access_token;
  if (refreshTask) return refreshTask;
  refreshTask=(async()=>{
    const epoch=generation, current=await read();
    if (!current.tokens) throw new Error('Connect Trakt first.');
    const tokens=await request('/oauth/token',{clientId:current.credentials.clientId,body:{refresh_token:current.tokens.refresh_token,client_id:current.credentials.clientId,grant_type:'refresh_token'}});
    if (epoch!==generation) throw new Error('Account changed.');
    await chrome.storage.local.set({tokens});return tokens.access_token;
  })().finally(()=>{refreshTask=null;});
  return refreshTask;
}
async function connect(clientId) {
  if (authTask) throw new Error('A Trakt sign-in window is already open.');
  if ((await read()).tokens) throw new Error('Disconnect before connecting a different account.');
  const epoch=++generation;
  authTask=(async()=>{
    const login=await createLogin(clientId,chrome.identity.getRedirectURL('trakt'));
    await chrome.storage.local.set({error:null});
    const callback=await chrome.identity.launchWebAuthFlow({url:login.url,interactive:true});
    if (!callback) throw new Error('Trakt sign-in was cancelled.');
    const tokens=await request('/oauth/token',{clientId,body:tokenBody(callback,login)});
    if(epoch!==generation)return;
    await chrome.storage.local.set({tokens,credentials:{clientId},error:null});
    try { const user=await request('/users/settings',{token:tokens.access_token,clientId}); if(epoch===generation)await chrome.storage.local.set({username:user.user.username}); } catch {}
    await sync(true);
  })().catch(async error=>{if(epoch===generation)await chrome.storage.local.set({error:error.message});throw error;}).finally(()=>{authTask=null;});
  return authTask;
}
async function pages(path, opts) {
  const all = [];
  for (let page = 1; ; page++) {
    const res = await request(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`, { ...opts, raw: true });
    const rows = await res.json(); if (!Array.isArray(rows)) throw new Error('Unexpected Trakt response.');
    all.push(...rows);
    const count = Number(res.headers.get('X-Pagination-Page-Count'));
    if (!rows.length || (count > 0 && page >= count)) return all;
  }
}
function sync(force = false) {
  if (syncTask) return syncTask;
  syncTask = (async () => {
    const epoch = generation, state = await read();
    const token = await access(state), opts = { token, clientId: state.credentials.clientId };
    const activities = await request('/sync/last_activities', opts);
    if (force || JSON.stringify(activities.movies?.watchlisted_at) !== JSON.stringify(state.activities?.movies?.watchlisted_at) || JSON.stringify(activities.shows?.watchlisted_at) !== JSON.stringify(state.activities?.shows?.watchlisted_at)) await chrome.storage.local.remove('watchlistCache');
    let cache = state.cache;
    // Refresh show metadata daily even without user activity: newly aired episodes do not change watch history.
    if (force || !cache || JSON.stringify(activities) !== JSON.stringify(state.activities) || Date.now() - (state.lastFullSync || 0) > 86400000) {
      const [movies, shows, playback] = await Promise.all([pages('/sync/watched/movies', opts), pages('/sync/watched/shows?extended=progress', opts), pages('/sync/playback', opts)]);
      if (shows.some(row => !Array.isArray(row.seasons))) throw new Error('Trakt did not return episode progress. Cached history has been preserved; try Sync now again.');
      cache = { movies, shows, playback };
    }
    if (epoch !== generation) return;
    const current = await read();
    const built = buildIndex(cache, settings(current.settings), state.baselines);
    await chrome.storage.local.set({ cache, activities, ...built, lastSync: Date.now(), lastFullSync: cache !== state.cache ? Date.now() : state.lastFullSync, error: null });
  })().catch(async e => { await chrome.storage.local.set({ error: e.message }); throw e; }).finally(() => { syncTask = null; });
  return syncTask;
}
chrome.alarms.create('sync', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener(alarm => { if(alarm.name==='sync') read().then(s=>s.tokens && sync()).catch(()=>{}); });
const features = createFeatures({read, save: value => chrome.storage.local.set(value), request, access, pages});
const checkUpdates=createUpdateChecker({read,save:value=>chrome.storage.local.set(value),version:chrome.runtime.getManifest?.().version || '1.3.0'});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const fromPopup = sender.url === chrome.runtime.getURL('popup.html');
  let fromJustWatch = false;
  try { const url = new URL(sender.url); fromJustWatch = url.protocol === 'https:' && (url.hostname === 'justwatch.com' || url.hostname.endsWith('.justwatch.com')); } catch {}
  if (!fromPopup && !(fromJustWatch && ['match','titleDetail','titleInfo','addWatchlist','removeWatchlist','watchlistStatus','showAll'].includes(message.type))) return false;
  (async () => {
    const state = await read();
    switch (message.type) {
      case 'titleDetail': return { detail: await features.detail(message.item) };
      case 'titleInfo': return {info:await features.info(message.item)};
      case 'addWatchlist': return await features.add(message.item);
      case 'removeWatchlist': return await features.remove(message.item);
      case 'watchlistStatus': return await features.membership(message.item);
      case 'match': return { statuses: (message.items || []).slice(0, 1000).map(item => {const hit=match(state.index || {}, item);return hit ? {...hit,dateLabel:watchedDate(hit)}:null;}), diagnostics:(message.items || []).slice(0,1000).map(item=>diagnostic(state,item)), settings: settings(state.settings) };
      case 'state': checkUpdates().catch(()=>{}); return { updates:state.updateCheck, version:chrome.runtime.getManifest?.().version || '1.3.0', connected: !!state.tokens, username: state.username, connecting: !!authTask, redirectUri: chrome.identity.getRedirectURL('trakt'), clientId: state.credentials?.clientId || '', lastSync: state.lastSync, error: state.error, settings: settings(state.settings), configured: !!state.credentials, counts: { movies: state.cache?.movies?.length || 0, shows: state.cache?.shows?.length || 0 } };
      case 'checkUpdates': return {updates:await checkUpdates(true)};
      case 'showAll': await chrome.storage.local.set({settings:{...settings(state.settings),hideWatched:false}});return;
      case 'connect': await connect(message.clientId?.trim()); return;
      case 'sync': await sync(true); return;
      case 'settings': { const value = settings(message.settings); await chrome.storage.local.set({ settings: value, ...buildIndex(state.cache, value, state.baselines) }); return; }
      case 'disconnect': generation++; await chrome.storage.local.remove(['tokens','credentials','device','username','cache','activities','index','baselines','lastSync','lastFullSync','error','titleDetails','watchlistCache','showProgress']); return;
      default: throw new Error('Unknown action.');
    }
  })().then(data => reply({ ok: true, ...data }), e => reply({ ok: false, error: e.message })); return true;
});
