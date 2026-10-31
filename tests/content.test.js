import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../content.js', import.meta.url), 'utf8');
const pause = () => new Promise(resolve => setTimeout(resolve, 240));
function page(status = {kind:'watched', label:'✓', tooltip:'Watched'}) {
  const dom = new JSDOM('<a href="/us/tv-show/example"><img alt="Example"></a>', {url:'https://www.justwatch.com/us', runScripts:'outside-only'});
  let notify;
  const preferences = {dimWatched:true, showProgress:true};
  dom.window.chrome = {
    runtime: { sendMessage: async ({items}) => ({ok:true, statuses:items.map(()=>status), settings:preferences}) },
    storage: {onChanged:{addListener:fn=>{notify=fn;}}}
  };
  dom.window.eval(source);
  return {dom, host:dom.window.document.querySelector('a'), preferences, notify:()=>notify({settings:{}},'local')};
}
test('restores badge removed by hydration and repairs dimming without losing watched badge', async t => {
  const {dom,host}=page(); t.after(()=>dom.window.close());
  await pause();
  assert.ok(host.classList.contains('justtrakt-dim'));
  host.querySelector('.justtrakt-badge').remove();
  await pause();
  assert.equal(host.querySelectorAll('.justtrakt-badge').length,1);
  host.className='site-rendered-poster';
  await pause();
  assert.ok(host.classList.contains('justtrakt-host'));
  assert.ok(host.classList.contains('justtrakt-dim'));
  assert.equal(host.querySelectorAll('.justtrakt-badge').length,1);
});
test('progress includes percentage and episode count; settings update existing posters', async t => {
  const {dom,host,preferences,notify}=page({kind:'progress',label:'60% · 12/20 eps',percent:60,tooltip:'12/20 episodes watched'});
  t.after(()=>dom.window.close()); await pause();
  assert.equal(host.querySelector('.justtrakt-badge').textContent,'60% · 12/20 eps');
  assert.equal(host.querySelector('.justtrakt-badge i').style.width,'60%');
  assert.equal(host.classList.contains('justtrakt-dim'),false);
  preferences.showProgress=false; notify(); await pause();
  assert.equal(host.querySelector('.justtrakt-badge'),null);
  preferences.showProgress=true; notify(); await pause();
  assert.ok(host.querySelector('.justtrakt-badge'));
});
test('dimming can be turned off while watched marker stays visible', async t => {
  const {dom,host,preferences,notify}=page(); t.after(()=>dom.window.close()); await pause();
  preferences.dimWatched=false; notify(); await pause();
  assert.equal(host.classList.contains('justtrakt-dim'),false);
  assert.equal(host.querySelector('.justtrakt-badge').textContent,'✓');
});
