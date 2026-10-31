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

test('Trakt filters hide watched cards, reset safely, and actions open JustWatch and private note editor',async t=>{
  const {dom,doc,calls}=page('https://app.trakt.tv/discover/trending?mode=movie','<main><a href="/movies/inception-2010"><div class="trakt-card-cover"><img alt="Inception"></div></a><a href="/movies/unknown"><img alt="Unknown"></a></main>');t.after(()=>dom.window.close());
  let config={hideWatched:false,seenBefore:'',minPlays:0,maxPlays:null};
  dom.window.chrome.runtime.sendMessage=async message=>{
    calls.push(message);
    if(message.type==='traktFilters'){config=message.filters;return {ok:true};}
    if(message.type==='openJustWatch'||message.type==='openNotes')return {ok:true};
    return {ok:true,dates:message.slugs.map(slug=>slug==='inception-2010'?{date:'2020-01-01',username:'owner'}:null),movies:message.slugs.map(slug=>slug==='inception-2010'?{watched:true,plays:3,date:'2020-01-01',rewatch:true,title:'Inception',username:'owner'}:{watched:false,plays:0,date:null,rewatch:false}),settings:{},filters:config};
  };
  await wait();assert.equal(doc.querySelector('.justtrakt-trakt-count').textContent,'Seen 3 times');assert.match(doc.querySelector('.justtrakt-trakt-rewatch').textContent,/3\+ years/);
  const input=doc.querySelector('[data-filter="hideWatched"]');input.checked=true;input.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await wait();
  assert.equal(doc.querySelectorAll('.justtrakt-trakt-filtered').length,1);
  doc.querySelector('.justtrakt-trakt-filterbar > button').click();await wait();assert.equal(doc.querySelectorAll('.justtrakt-trakt-filtered').length,0);
  doc.querySelector('[data-action="jw"]').click();await wait();assert.equal(calls.find(c=>c.type==='openJustWatch').title,'Inception');
  doc.querySelector('[data-action="note"]').click();await wait();assert.equal(calls.find(c=>c.type==='openNotes').slug,'inception-2010');
});

test('summary cards dock dates and actions in the right details panel without covering poster or native rating',async t=>{
  const {dom,doc}=page('https://app.trakt.tv/discover/trending?mode=movie','<main><div class="trakt-card trakt-summary-card"><div class="trakt-card-content"><a href="/movies/inception-2010"><div class="trakt-summary-poster"><div class="trakt-card-cover"><img alt="Inception"></div></div><div class="trakt-summary-card-details"><div class="trakt-summary-card-titles"><h3>Inception</h3></div><div class="trakt-summary-card-tags">2010 · 148m</div></div></a><div class="trakt-summary-card-bottom-bar">82%</div></div></div></main>');t.after(()=>dom.window.close());await wait();
  const poster=doc.querySelector('.trakt-card-cover'),details=doc.querySelector('.trakt-summary-card-details'),dock=details.querySelector('.justtrakt-trakt-dock');
  assert.equal(poster.querySelector('.justtrakt-trakt-date,.justtrakt-trakt-tools'),null);
  assert.equal(dock.querySelector('.justtrakt-trakt-date').textContent,'Last seen 2025-03-15');
  assert.equal(dock.querySelectorAll('button').length,2);
  assert.equal(details.children[0].className,'trakt-summary-card-titles');assert.equal(details.children[1],dock);assert.equal(details.children[2].className,'trakt-summary-card-tags');
  assert.equal(doc.querySelector('.trakt-summary-card-bottom-bar').textContent,'82%');
  dock.remove();await wait();assert.equal(details.querySelectorAll('.justtrakt-trakt-dock').length,1);assert.equal(poster.querySelector('.justtrakt-trakt-tools'),null);
});
