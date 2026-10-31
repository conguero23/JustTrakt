const $ = id => document.getElementById(id);
async function send(type, data = {}) { const result = await chrome.runtime.sendMessage({ type, ...data }); if (!result.ok) throw new Error(result.error); return result; }
function notice(text) { $('notice').textContent = text || ''; $('notice').hidden = !text; }
let editing = false;
async function render() {
  const state = await send('state');
  $('credentials').hidden = state.connected || state.connecting;
  $('connected').hidden = !state.connected; $('connecting').hidden = !state.connecting;
  $('redirectUri').value=state.redirectUri;
  $('disconnect').hidden = !state.connected; $('dot').classList.toggle('online', state.connected);
  $('account').textContent = state.connected ? state.username ? `Connected as @${state.username}` : 'Trakt connected' : 'Connect your watch history.';
  $('movies').textContent = state.counts.movies.toLocaleString(); $('shows').textContent = state.counts.shows.toLocaleString();
  $('lastSync').textContent = state.lastSync ? `Synced ${new Date(state.lastSync).toLocaleString()}` : 'Never synced';
  if (!editing) for (const key of ['minProgress','completeProgress','dimWatched','showProgress']) { const input = $(key); if (input.type === 'checkbox') input.checked = state.settings[key]; else input.value = state.settings[key]; }
  if (state.error) notice(state.error);
  return state;
}
async function act(button, action) { button.disabled = true; notice(''); try { await action(); await render(); } catch(e) { notice(e.message); } finally { button.disabled = false; } }
$('credentials').addEventListener('submit', e => { e.preventDefault(); act($('connect'), async () => { await send('connect', { clientId: $('clientId').value }); }); });
$('sync').onclick = () => act($('sync'), () => send('sync'));
$('disconnect').onclick = () => act($('disconnect'), () => send('disconnect'));
$('copyRedirect').onclick = () => act($('copyRedirect'), async () => { await navigator.clipboard.writeText($('redirectUri').value); notice('Redirect URL copied.'); });
$('settings').addEventListener('input', () => { editing = true; });
$('settings').addEventListener('submit', e => { e.preventDefault(); act($('save'), async () => { await send('settings', { settings: { minProgress: Number($('minProgress').value), completeProgress: Number($('completeProgress').value), dimWatched: $('dimWatched').checked, showProgress: $('showProgress').checked } }); editing = false; notice('Preferences saved.'); }); });
setInterval(async () => { try { await render(); } catch(e) { notice(e.message); } }, 1500);
render().catch(e => notice(e.message));
