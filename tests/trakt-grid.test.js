import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const source=readFileSync(new URL('../trakt-grid.js',import.meta.url),'utf8');
const wait=()=>new Promise(resolve=>setTimeout(resolve,180));
const card=(type,slug)=>`<article class="trakt-card trakt-summary-card"><a href="/${type}/${slug}"><div class="trakt-card-cover"><img alt="${slug}"></div><div class="trakt-summary-card-details">${slug}<button>Watchlist</button></div></a></article>`;
test('JustWatchIt handles movies, shows, infinite scroll and settings without replacing native controls',async t=>{
  const dom=new JSDOM(`<main><h1>Discover</h1><div id="grid"><div class="original-slot">${card('movies','inception-2010')}</div><div>${card('shows','time-2021')}</div></div><aside>${card('movies','detail-2020')}</aside></main>`,{url:'https://app.trakt.tv/discover',runScripts:'outside-only'});t.after(()=>dom.window.close());
  let change;dom.window.chrome={storage:{local:{get:async()=>({settings:{traktPosterGrid:false}})},onChanged:{addListener:fn=>change=fn}}};
  const d=dom.window.document,button=d.querySelector('button');let clicks=0;button.onclick=()=>clicks++;
  dom.window.eval(source);await wait();assert.equal(d.querySelector('.justtrakt-poster-grid'),null);
  change({settings:{newValue:{traktPosterGrid:true}}},'local');await wait();
  assert.equal(d.querySelector('#grid').classList.contains('justtrakt-poster-grid'),true);assert.equal(d.querySelectorAll('.justtrakt-grid-card').length,2);assert.equal(d.querySelector('aside .justtrakt-grid-card'),null);
  button.click();assert.equal(clicks,1);assert.equal(d.querySelector('.trakt-card button'),button);
  d.querySelector('#grid').insertAdjacentHTML('beforeend',`<div>${card('shows','new-show-2026')}</div>`);await wait();assert.equal(d.querySelectorAll('.justtrakt-grid-card').length,3);
  change({settings:{newValue:{traktPosterGrid:false}}},'local');await wait();assert.equal(d.querySelector('.justtrakt-grid-card,.justtrakt-grid-slot'),null);assert.equal(d.querySelector('.justtrakt-poster-grid'),null);assert.ok(d.querySelector('.original-slot'));assert.equal(d.querySelector('.trakt-card button'),button);
});

test('JustWatchIt leaves positioned virtual lists and section wrappers alone',async t=>{
  const dom=new JSDOM(`<main><div id="virtual"><div style="position:absolute">${card('movies','one')}</div><div style="transform:translateY(20px)">${card('shows','two')}</div></div><div id="sections"><section>${card('movies','three')}${card('shows','four')}</section><section>${card('movies','five')}</section></div></main>`,{url:'https://app.trakt.tv/discover',runScripts:'outside-only'});t.after(()=>dom.window.close());
  dom.window.chrome={storage:{local:{get:async()=>({settings:{traktPosterGrid:true}})},onChanged:{addListener:()=>{}}}};dom.window.eval(source);await wait();
  assert.equal(dom.window.document.querySelector('#virtual.justtrakt-poster-grid'),null);assert.equal(dom.window.document.querySelector('#sections.justtrakt-poster-grid'),null);
});

test('page toggle sits beside Last seen before, persists on click and restores the layout',async t=>{
  const dom=new JSDOM(`<main><div class="justtrakt-trakt-filterbar"><label>Last seen before<input data-filter="seenBefore" type="date"></label><label>Min watches<input></label></div><div>${card('movies','one')}${card('shows','two')}</div></main>`,{url:'https://app.trakt.tv/discover',runScripts:'outside-only'});t.after(()=>dom.window.close());
  const calls=[];let finish;
  dom.window.chrome={runtime:{sendMessage:message=>{calls.push(message);return new Promise(resolve=>finish=resolve);}},storage:{local:{get:async()=>({settings:{traktPosterGrid:false}})},onChanged:{addListener:()=>{}}}};
  dom.window.eval(source);await wait();const d=dom.window.document,button=d.querySelector('.justtrakt-grid-toggle');
  assert.equal(d.querySelector('[data-filter=seenBefore]').parentElement.nextElementSibling,button);assert.equal(button.textContent,'JustWatchIt');
  button.click();button.click();assert.equal(calls.length,1);assert.equal(calls[0].type,'traktGrid');assert.equal(calls[0].enabled,true);assert.equal(button.disabled,true);
  finish({ok:true,enabled:true});await wait();assert.ok(d.querySelector('.justtrakt-poster-grid'));assert.equal(button.getAttribute('aria-pressed'),'true');
  button.click();finish({ok:true,enabled:false});await wait();assert.equal(d.querySelector('.justtrakt-poster-grid'),null);assert.equal(button.getAttribute('aria-pressed'),'false');
  d.querySelector('.justtrakt-trakt-filterbar').remove();await wait();assert.ok(d.querySelector('.justtrakt-grid-toolbar .justtrakt-grid-toggle'));
});
