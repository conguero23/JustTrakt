const $ = id => document.getElementById(id);
async function send(type, data = {}) { const result = await chrome.runtime.sendMessage({ type, ...data }); if (!result.ok) throw new Error(result.error); return result; }
function notice(text) { $('notice').textContent = text || ''; $('notice').hidden = !text; }
let editing = false;
let pkceRedirect='';
function loginMethod(){
  const pkce=$('loginMode').value==='pkce';
  $('redirectUri').value=pkce?pkceRedirect:'http://localhost';
  $('loginHelp').textContent=pkce?'For an approved production app: register the exact HTTPS callback below in Trakt settings, then enter its public Client ID. Development apps cannot use this callback.':'Create a Development app at developer.trakt.tv with http://localhost as its redirect URI. Sign-in uses an activation code; no localhost server or Client Secret is needed. Only the owner and invited users can sign into a development app.';
}
async function render() {
  const state = await send('state');
  $('credentials').hidden = state.connected || state.connecting || !!state.device;
  $('connected').hidden = !state.connected; $('connecting').hidden = !state.connecting;
  $('deviceLogin').hidden=!state.device;if(state.device)$('code').textContent=state.device.user_code;
  pkceRedirect=state.redirectUri;loginMethod();
  $('disconnect').hidden = !state.connected; $('dot').classList.toggle('online', state.connected);
  $('account').textContent = state.connected ? state.username ? `Connected as @${state.username}` : 'Trakt connected' : 'Connect your watch history.';
  $('movies').textContent = state.counts.movies.toLocaleString(); $('shows').textContent = state.counts.shows.toLocaleString();
  $('lastSync').textContent = state.lastSync ? `Synced ${new Date(state.lastSync).toLocaleString()}` : 'Never synced';
  if (!editing) for (const key of ['minProgress','completeProgress','dimWatched','showProgress','hideWatched','showDiagnostics','checkUpdates','traktLastSeen']) { const input = $(key); if (input.type === 'checkbox') input.checked = state.settings[key] ?? ['checkUpdates','traktLastSeen'].includes(key); else input.value = state.settings[key]; }
  const update=state.updates?.available;
  $('updateNotice').hidden=!update || state.settings.checkUpdates===false;
  if(update){$('updateLink').href=update.url;$('updateLink').textContent=`JustTrakt ${update.version}${update.prerelease?' beta':''} is available`;}
  $('checkUpdate').disabled=state.settings.checkUpdates===false;
  $('updateStatus').textContent=state.settings.checkUpdates===false?'Update checks disabled.':state.updates?.error || (state.updates?.checkedAt ? `v${state.version || ''} · Checked ${new Date(state.updates.checkedAt).toLocaleString()}`:'Checks GitHub once a day. No account data is sent.');
  if (state.error) notice(state.error);
  return state;
}
async function act(button, action) { button.disabled = true; notice(''); try { await action(); await render(); } catch(e) { notice(e.message); } finally { button.disabled = false; } }
$('credentials').addEventListener('submit', e => { e.preventDefault(); act($('connect'), async () => { await send('connect', { clientId: $('clientId').value,mode:$('loginMode').value }); }); });
$('loginMode').onchange=loginMethod;
$('cancelLogin').onclick=()=>act($('cancelLogin'),()=>send('cancelLogin'));
$('sync').onclick = () => act($('sync'), () => send('sync'));
$('disconnect').onclick = () => act($('disconnect'), () => send('disconnect'));
$('checkUpdate').onclick = () => act($('checkUpdate'),()=>send('checkUpdates'));
$('copyRedirect').onclick = () => act($('copyRedirect'), async () => { await navigator.clipboard.writeText($('redirectUri').value); notice('Redirect URL copied.'); });
$('settings').addEventListener('input', () => { editing = true; });
$('settings').addEventListener('submit', e => { e.preventDefault(); act($('save'), async () => { await send('settings', { settings: { minProgress: Number($('minProgress').value), completeProgress: Number($('completeProgress').value), dimWatched: $('dimWatched').checked, showProgress: $('showProgress').checked, hideWatched:$('hideWatched').checked, showDiagnostics:$('showDiagnostics').checked, checkUpdates:$('checkUpdates').checked, traktLastSeen:$('traktLastSeen').checked } }); editing = false; notice('Preferences saved.'); }); });
let refreshing=false;
setInterval(async () => { if(refreshing)return;refreshing=true;try { await send('pollDevice');await render(); } catch(e) { notice(e.message); }finally{refreshing=false;} }, 1500);
render().catch(e => notice(e.message));
