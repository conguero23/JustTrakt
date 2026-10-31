import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {movieDates} from '../core.js';
const source=readFileSync(new URL('../trakt-content.js',import.meta.url),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,260));
function page(url,html){
  const dom=new JSDOM(html,{url,runScripts:'outside-only'});let signedIn=true,notify;const calls=[];
  dom.window.chrome={runtime:{sendMessage:async message=>{calls.push(message);return {ok:true,dates:message.slugs.map(slug=>signedIn&&slug==='inception-2010'?{date:'2025-03-15',username:'test-user'}:null)};}},storage:{onChanged:{addListener:fn=>{notify=fn;}}}};
  dom.window.eval(source);return {dom,doc:dom.window.document,calls,disconnect:()=>{signedIn=false;notify({tokens:{}},'local');}};
}
test('Trakt movie covers show cached last seen, restore after rerender, and clear on disconnect',async t=>{
  const {dom,doc,calls,disconnect}=page('https://app.trakt.tv/discover/trending?mode=movie','<a href="/movies/inception-2010"><div class="trakt-card-cover"><img></div></a><a href="/movies/unknown"><img></a><a href="/shows/inception-2010"><img></a>');t.after(()=>dom.window.close());await wait();
  assert.equal(doc.querySelector('.justtrakt-trakt-date').textContent,'Last seen 2025-03-15');assert.equal(doc.querySelectorAll('.justtrakt-trakt-date').length,1);
  assert.ok(calls.every(c=>c.type==='traktMovieDates'));
  doc.querySelector('.justtrakt-trakt-date').remove();await wait();assert.ok(doc.querySelector('.justtrakt-trakt-date'));
  const link=doc.querySelector('a[href="/movies/inception-2010"]');link.href='/shows/inception-2010';await wait();assert.equal(doc.querySelector('.justtrakt-trakt-date'),null);
  link.href='/movies/inception-2010';await wait();assert.ok(doc.querySelector('.justtrakt-trakt-date'));
  disconnect();await wait();assert.equal(doc.querySelector('.justtrakt-trakt-date'),null);
});
test('Trakt movie detail includes date on poster and in information area; navigation clears stale date',async t=>{
  const {dom,doc}=page('https://app.trakt.tv/movies/inception-2010','<main><div class="trakt-summary-poster"><img></div><div class="trakt-summary-main-content"><div class="trakt-summary-header"><h1>Inception</h1></div></div></main>');t.after(()=>dom.window.close());await wait();
  assert.equal(doc.querySelector('.trakt-summary-poster .justtrakt-trakt-date').textContent,'Last seen 2025-03-15');
  assert.equal(doc.querySelectorAll('.justtrakt-trakt-info').length,1);assert.match(doc.querySelector('.justtrakt-trakt-info').title,/@test-user/);
  dom.window.history.pushState({},'', '/movies/unknown');dom.window.dispatchEvent(new dom.window.PopStateEvent('popstate'));await wait();
  assert.equal(doc.querySelector('.justtrakt-trakt-info'),null);assert.equal(doc.querySelector('.justtrakt-trakt-date'),null);
});
test('last-seen lookup requires exact cached slug/ID, watched plays, and a valid past date',()=>{
  const state={tokens:{},username:'owner',cache:{movies:[{plays:1,last_watched_at:'2025-03-15T00:00:00Z',movie:{ids:{trakt:123,slug:'inception-2010'}}},{plays:0,last_watched_at:'2025-03-15',movie:{ids:{trakt:456,slug:'not-watched'}}}]}};
  const result=movieDates(state,['inception-2010','123','unknown','not-watched'],Date.parse('2026-01-01'));
  assert.equal(result[0].date,'2025-03-15');assert.equal(result[1].date,'2025-03-15');assert.equal(result[2],null);assert.equal(result[3],null);
  assert.equal(movieDates({...state,tokens:null},['inception-2010'])[0],null);
  assert.equal(movieDates({...state,settings:{traktLastSeen:false}},['inception-2010'])[0],null);
});
