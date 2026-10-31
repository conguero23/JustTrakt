import { defaults, settings, buildIndex, match, watchedDate, diagnostic, movieDates } from './core.js';
import { createUpdateChecker } from './updates.js';
import { createFeatures } from './trakt-features.js';
import { AUTH, createLogin, tokenBody } from './auth.js';
const API = 'https://api.trakt.tv';
let syncTask, authTask, deviceTask, refreshTask, generation = 0;
// Remove legacy client secrets on upgrade; neither supported login flow needs one.
const ready = chrome.storage.local.get(null).then(async state => {
  const {credentials}=state;
  if (credentials?.clientSecret) await chrome.storage.local.set({credentials:{clientId:credentials.clientId}});
  if(state.device && Date.now()>=state.device.expiresAt)await chrome.storage.local.remove('device');
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
async function connect(clientId, mode='device') {
  if (authTask) throw new Error('A Trakt sign-in window is already open.');
  const state=await read();
  if (state.tokens) throw new Error('Disconnect before connecting a different account.');
  if(state.device)throw new Error('Cancel the pending sign-in before starting again.');
  if(!/^[a-zA-Z0-9_-]{16,256}$/.test(clientId || ''))throw new Error('Enter a valid Trakt Client ID.');
  if(!['device','pkce'].includes(mode))throw new Error('Unknown login method.');
  const epoch=++generation;
  authTask=(async()=>{
    if(mode==='device'){
      const codes=await request('/oauth/device/code',{clientId,body:{client_id:clientId}});
      if(!codes.device_code || !codes.user_code || !(codes.expires_in>0) || !(codes.interval>0))throw new Error('Trakt did not return valid sign-in codes.');
      if(epoch!==generation)return;
      await chrome.storage.local.set({device:{clientId,device_code:codes.device_code,user_code:codes.user_code,expiresAt:Date.now()+codes.expires_in*1000,interval:codes.interval,nextPoll:Date.now()+codes.interval*1000},error:null});
      return;
    }
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
async function pollDevice(){
  if(deviceTask)return deviceTask;
  deviceTask=(async()=>{
    const {device}=await read(),epoch=generation;
    if(!device)return;
    if(Date.now()>=device.expiresAt){await chrome.storage.local.remove('device');await chrome.storage.local.set({error:'Trakt sign-in code expired. Connect again.'});return;}
    if(Date.now()<device.nextPoll)return;
    let authorized=false;
    try{
      const tokens=await request('/oauth/device/token',{clientId:device.clientId,body:{code:device.device_code,client_id:device.clientId}});
      if(epoch!==generation)return;
      authorized=true;
      await chrome.storage.local.set({tokens,credentials:{clientId:device.clientId},error:null});await chrome.storage.local.remove('device');
      try{const profile=await request('/users/settings',{clientId:device.clientId,token:tokens.access_token});if(epoch===generation)await chrome.storage.local.set({username:profile.user.username});}catch{}
      await sync(true);
    }catch(error){
      if(epoch!==generation)return;
      if(authorized){await chrome.storage.local.set({error:error.message});return;}
      if([400,429].includes(error.status)){
        const interval=device.interval+(error.status===429?5:0);
        await chrome.storage.local.set({device:{...device,interval,nextPoll:Date.now()+interval*1000}});
      }else{
        await chrome.storage.local.remove('device');
        const messages={404:'Trakt sign-in code is invalid. Connect again.',409:'Trakt sign-in code was already used. Connect again.',410:'Trakt sign-in code expired. Connect again.',418:'Trakt sign-in was declined.'};
        await chrome.storage.local.set({error:messages[error.status] || error.message});
      }
    }
  })().finally(()=>{deviceTask=null;});return deviceTask;
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
chrome.alarms.create('auth',{periodInMinutes:0.5});
chrome.alarms.onAlarm.addListener(alarm => { if(alarm.name==='auth')pollDevice().catch(()=>{});else if(alarm.name==='sync') read().then(s=>s.tokens && sync()).catch(()=>{}); });
const features = createFeatures({read, save: value => chrome.storage.local.set(value), request, access, pages});
const checkUpdates=createUpdateChecker({read,save:value=>chrome.storage.local.set(value),version:chrome.runtime.getManifest?.().version || '1.3.1'});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const fromPopup = sender.url === chrome.runtime.getURL('popup.html');
  let fromJustWatch = false;
  let fromTrakt=false;
  try { const url = new URL(sender.url); fromJustWatch = url.protocol === 'https:' && (url.hostname === 'justwatch.com' || url.hostname.endsWith('.justwatch.com')); } catch {}
  try{const url=new URL(sender.url);fromTrakt=url.protocol==='https:' && ['app.trakt.tv','trakt.tv'].includes(url.hostname);}catch{}
  if (!fromPopup && !(fromTrakt && message.type==='traktMovieDates') && !(fromJustWatch && ['match','titleDetail','titleInfo','addWatchlist','removeWatchlist','watchlistStatus','showAll'].includes(message.type))) return false;
  (async () => {
    const state = await read();
    switch (message.type) {
      case 'traktMovieDates': return {dates:movieDates(state,Array.isArray(message.slugs)?message.slugs:[])};
      case 'titleDetail': return { detail: await features.detail(message.item) };
      case 'titleInfo': return {info:await features.info(message.item)};
      case 'addWatchlist': return await features.add(message.item);
      case 'removeWatchlist': return await features.remove(message.item);
      case 'watchlistStatus': return await features.membership(message.item);
      case 'match': return { statuses: (message.items || []).slice(0, 1000).map(item => {const hit=match(state.index || {}, item);return hit ? {...hit,dateLabel:watchedDate(hit)}:null;}), diagnostics:(message.items || []).slice(0,1000).map(item=>diagnostic(state,item)), settings: settings(state.settings) };
      case 'state': checkUpdates().catch(()=>{}); return { updates:state.updateCheck, version:chrome.runtime.getManifest?.().version || '1.3.1', connected: !!state.tokens, username: state.username, connecting: !!authTask, device:state.device && {user_code:state.device.user_code,expiresAt:state.device.expiresAt}, redirectUri: chrome.identity.getRedirectURL('trakt'), clientId: state.credentials?.clientId || '', lastSync: state.lastSync, error: state.error, settings: settings(state.settings), configured: !!state.credentials, counts: { movies: state.cache?.movies?.length || 0, shows: state.cache?.shows?.length || 0 } };
      case 'checkUpdates': return {updates:await checkUpdates(true)};
      case 'showAll': await chrome.storage.local.set({settings:{...settings(state.settings),hideWatched:false}});return;
      case 'connect': await connect(message.clientId?.trim(),message.mode); return;
      case 'pollDevice': await pollDevice();return;
      case 'cancelLogin': generation++;await chrome.storage.local.remove('device');await chrome.storage.local.set({error:null});return;
      case 'sync': await sync(true); return;
      case 'settings': { const value = settings(message.settings); await chrome.storage.local.set({ settings: value, ...buildIndex(state.cache, value, state.baselines) }); return; }
      case 'disconnect': generation++; await chrome.storage.local.remove(['tokens','credentials','device','username','cache','activities','index','baselines','lastSync','lastFullSync','error','titleDetails','watchlistCache','showProgress']); return;
      default: throw new Error('Unknown action.');
    }
  })().then(data => reply({ ok: true, ...data }), e => reply({ ok: false, error: e.message })); return true;
});
