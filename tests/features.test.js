import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFeatures} from '../trakt-features.js';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';

test('rating lookup is deduplicated and cached; watchlist writes only through explicit add', async () => {
  let state={tokens:{access_token:'token'},credentials:{clientId:'id'}}, calls=[];
  const features=createFeatures({pages:async()=>[],read:async()=>state,save:async value=>Object.assign(state,value),access:async()=>'token', request:async(path,options)=>{
    calls.push({path,options});
    if(path==='/sync/watchlist') return {added:{movies:1},not_found:{movies:[]}};
    return {ids:{trakt:123},rating:8.75,votes:100};
  }});
  const item={type:'movie',imdb:'tt1375666'};
  const [a,b]=await Promise.all([features.detail(item),features.detail(item)]);
  assert.equal(a.rating,8.75);assert.deepEqual(a,b);assert.equal(calls.length,1);
  await features.detail(item);assert.equal(calls.length,1);
  await features.add(item);
  assert.equal(calls[1].path,'/sync/watchlist');
  assert.deepEqual(calls[1].options.body,{movies:[{ids:{trakt:123}}]});
});
test('watchlist API not_found is an error, not a success',async()=>{
  const state={tokens:{access_token:'token'},credentials:{clientId:'id'}};
  const features=createFeatures({pages:async()=>[],read:async()=>state,save:async v=>Object.assign(state,v),access:async()=>'token',request:async path=>path==='/sync/watchlist'?{not_found:{shows:[{}]}}:{ids:{trakt:123},rating:7,votes:2}});
  await assert.rejects(features.add({type:'show',imdb:'tt123'}),/did not add/);
});
test('ambiguous title search never produces a watchlist write',async()=>{
  let writes=0;
  const features=createFeatures({read:async()=>({tokens:{},credentials:{clientId:'id'}}),save:async()=>{},access:async()=>'token',request:async(path)=>{if(path==='/sync/watchlist') writes++;return [1,2].map(id=>({type:'movie',movie:{title:'Example',year:2020,ids:{trakt:id}}}));}});
  await assert.rejects(features.add({type:'movie',title:'Example',year:2020}),/unambiguous/);assert.equal(writes,0);
});

const source=readFileSync(new URL('../content-features.js',import.meta.url),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,240));
function page(inWatchlist=false,addError=null) {
  const dom=new JSDOM('<div class="title-list-grid__item" data-title="Inception"><a href="/us/movie/inception"><img alt="Inception"></a><span>2010</span><div class="watch-now-button"><button>Watch Now</button></div><div class="jw-scoring-listing"><span>IMDb 8.8</span></div></div>',{url:'https://www.justwatch.com/us',runScripts:'outside-only'});
  const calls=[];
  dom.window.chrome={runtime:{getURL:path=>'chrome-extension://test/'+path,sendMessage:async message=>{calls.push(message);if(message.type==='addWatchlist'&&!addError)inWatchlist=true;if(message.type==='removeWatchlist'&&!addError)inWatchlist=false;return message.type==='titleDetail'?{ok:true,detail:{trakt:123,rating:8.7,votes:500}}:message.type==='watchlistStatus'?{ok:true,inWatchlist}:addError?{ok:false,error:addError}:{ok:true,added:true,inWatchlist};}},storage:{onChanged:{addListener:()=>{}}}};
  dom.window.eval(source);return {dom,calls,doc:dom.window.document};
}
test('hover action replaces Watch Now, shows Trakt rating, and adds only on click',async t=>{
  const {dom,calls,doc}=page();t.after(()=>dom.window.close());await wait();
  assert.ok(doc.querySelector('.watch-now-button').classList.contains('justtrakt-replaced'));
  assert.equal(doc.querySelector('.justtrakt-rating').textContent,'87%');
  assert.equal(doc.querySelector('.justtrakt-rating img').alt,'Trakt');
  assert.ok(doc.querySelector('.justtrakt-rating img').src.endsWith('/assets/trakt.svg'));
  assert.equal(doc.querySelector('.justtrakt-rating').href,'https://trakt.tv/movies/123');
  assert.equal(doc.querySelector('.jw-scoring-listing > span').textContent,'IMDb 8.8');
  assert.equal(calls.filter(c=>c.type==='addWatchlist').length,0);
  doc.querySelector('.justtrakt-watchlist').click();await wait();
  assert.equal(calls.filter(c=>c.type==='addWatchlist').length,1);
  assert.equal(doc.querySelector('.justtrakt-watchlist').textContent,'✓ In Trakt watchlist');
  doc.querySelector('.justtrakt-watchlist').click();await wait();
  assert.equal(calls.filter(c=>c.type==='addWatchlist').length,1);
  assert.equal(calls.filter(c=>c.type==='removeWatchlist').length,1);
  doc.querySelector('.justtrakt-watchlist').remove(); doc.querySelector('.justtrakt-rating').remove();
  await wait();
  assert.equal(doc.querySelectorAll('.justtrakt-watchlist').length,1);
  assert.equal(doc.querySelector('.justtrakt-watchlist').textContent,'+ Add to Trakt watchlist');
});

test('existing watchlist membership is fetched once and prevents duplicate writes across titles',async()=>{
  let state={tokens:{access_token:'token'},credentials:{clientId:'id'}},fetches=0,writes=0;
  const features=createFeatures({read:async()=>state,save:async v=>Object.assign(state,v),access:async()=>'token',pages:async path=>{fetches++;assert.equal(path,'/sync/watchlist/shows');return [{show:{ids:{trakt:123}}},{show:{ids:{trakt:124}}}];},request:async path=>{if(path==='/sync/watchlist')writes++;return {ids:{trakt:path.includes('tt124')?124:123},rating:7,votes:100};}});
  assert.equal((await features.membership({type:'show',imdb:'tt123'})).inWatchlist,true);
  assert.equal((await features.membership({type:'show',imdb:'tt124'})).inWatchlist,true);
  assert.equal((await features.add({type:'show',imdb:'tt123'})).existing,true);
  assert.equal(fetches,1);assert.equal(writes,0);
});
test('pre-existing saved titles never show the add action',async t=>{
  const {dom,doc,calls}=page(true);t.after(()=>dom.window.close());await wait();
  const button=doc.querySelector('.justtrakt-watchlist');
  assert.equal(button.textContent,'✓ In Trakt watchlist');assert.equal(button.disabled,false);
  assert.match(button.getAttribute('aria-label'),/Remove/);
  button.click();await wait();assert.equal(calls.filter(c=>c.type==='addWatchlist').length,0);assert.equal(calls.filter(c=>c.type==='removeWatchlist').length,1);
});
test('watchlist click bypasses site card handlers and displays API errors',async t=>{
  const {dom,doc,calls}=page(false,'Your Trakt watchlist account limit has been reached.');t.after(()=>dom.window.close());await wait();
  let navigated=false;
  doc.querySelector('.title-list-grid__item').addEventListener('click',()=>{navigated=true;},true);
  doc.querySelector('.justtrakt-watchlist').click();await wait();
  assert.equal(navigated,false);assert.equal(calls.filter(c=>c.type==='addWatchlist').length,1);
  assert.match(doc.querySelector('.justtrakt-action-error').textContent,/account limit/);
  assert.equal(doc.querySelector('.justtrakt-watchlist').disabled,false);
});

test('add/remove loader stays visible until completion, prevents duplicate clicks, and clears on failure',async t=>{
  const {dom,doc}=page();t.after(()=>dom.window.close());await wait();
  const previous=dom.window.chrome.runtime.sendMessage;let complete,mutations=0;
  dom.window.chrome.runtime.sendMessage=message=>{
    if(['addWatchlist','removeWatchlist'].includes(message.type)){mutations++;return new Promise(resolve=>{complete=resolve;});}
    return previous(message);
  };
  const button=doc.querySelector('.justtrakt-watchlist');
  button.click();assert.equal(button.getAttribute('aria-busy'),'true');assert.equal(button.disabled,true);assert.match(button.textContent,/Adding/);
  button.click();assert.equal(mutations,1);
  complete({ok:true,inWatchlist:true});await wait();assert.equal(button.getAttribute('aria-busy'),'false');assert.equal(button.disabled,false);
  button.click();assert.equal(button.getAttribute('aria-busy'),'true');assert.match(button.textContent,/Removing/);
  complete({ok:false,error:'Network unavailable'});await wait();assert.equal(button.getAttribute('aria-busy'),'false');assert.equal(button.disabled,false);assert.match(doc.querySelector('.justtrakt-action-error').textContent,/Network unavailable/);
});

for (const [route,title,type] of [['tv-show/time-2021','Time','show'],['movie/inception','Inception','movie']]) {
  test(`detail page ${type} has a hero rating and independent watchlist action`,async t=>{
    const dom=new JSDOM(`<main><div class="title-detail-hero"><div class="title-detail-hero__details"><h1>${title} <span class="release-year">(${type==='show'?2021:2010})</span></h1><div class="title-detail-hero-details"><div class="hidden-horizontal-scrollbar__items"><span>IMDb 8.2</span></div></div></div></div><div class="title-sidebar"><div class="poster-detail-infos"><div class="jw-scoring-listing">IMDb 8.2</div></div></div><div class="offer-container"><button class="offer__cta">Watch Now</button></div><a href="/us/movie/other">Other movie</a><a href="/us/tv-show/unrelated">Unrelated show</a></main>`,{url:`https://www.justwatch.com/us/${route}`,runScripts:'outside-only'});
    t.after(()=>dom.window.close());const calls=[];
    dom.window.chrome={runtime:{getURL:path=>'chrome-extension://test/'+path,sendMessage:async message=>{calls.push(message);return message.type==='titleDetail'?{ok:true,detail:{trakt:123,rating:8.2,votes:100}}:message.type==='titleInfo'?{ok:true,info:{lastWatched:'Last watched 2024-01-01',diagnostic:'Matched Trakt history',...(type==='show'?{progress:{remaining:3,next:{season:2,number:4}}}:{})}}:message.type==='watchlistStatus'?{ok:true,inWatchlist:false}:{ok:true,added:true};}},storage:{onChanged:{addListener:()=>{}}}};
    dom.window.eval(source);await wait();
    const doc=dom.window.document;
    assert.equal(doc.querySelector('.title-detail-hero-details .justtrakt-rating').textContent,'82%');
    assert.equal(doc.querySelector('.title-sidebar .justtrakt-rating').textContent,'82%');
    assert.equal(doc.querySelector('.justtrakt-info-date').textContent,'Last watched 2024-01-01');
    assert.match(doc.querySelector('.justtrakt-info-diagnostic').textContent,/Matched Trakt history/);
    if(type==='show')assert.equal(doc.querySelector('.justtrakt-next-episode').textContent,'Next: S02E04 · 3 aired episodes remaining');
    assert.equal(doc.querySelectorAll('.justtrakt-detail-actions .justtrakt-watchlist').length,1);
    assert.equal(doc.querySelector('.offer__cta').textContent,'Watch Now');
    doc.querySelector('.justtrakt-detail-actions button').click();await wait();
    const write=calls.find(c=>c.type==='addWatchlist');assert.equal(write.item.title,title);assert.equal(write.item.type,type);
    assert.equal(doc.querySelector('.justtrakt-detail-actions button').textContent,'✓ In Trakt watchlist');
    doc.querySelector('.justtrakt-detail-actions').remove();await wait();
    assert.equal(doc.querySelectorAll('.justtrakt-detail-actions').length,1);
  });
}
