import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, match, defaults, settings, watchedDate, diagnostic } from '../core.js';
const movie = {title:'The Example',year:2020,ids:{trakt:1,imdb:'tt1',tmdb:10}};
const show = {title:'A Show',year:2021,ids:{trakt:2,imdb:'tt2',tmdb:10},aired_episodes:2};
test('movie thresholds and watched history precedence', () => {
  for (const [progress,kind] of [[4,null],[5,'progress'],[89,'progress'],[90,'watched']]) {
    const {index}=buildIndex({playback:[{movie,progress}]}); assert.equal(match(index,{imdb:'tt1'})?.kind || null,kind);
  }
  const {index}=buildIndex({movies:[{movie,plays:2}],playback:[{movie,progress:30}]}); assert.equal(match(index,{imdb:'tt1'}).kind,'watched');
});
test('specials excluded and repeated episodes counted once', () => {
  const {index}=buildIndex({shows:[{show,seasons:[{number:0,episodes:[{number:1,plays:1}]},{number:1,episodes:[{number:1,plays:3},{number:1,plays:1}]}]}]});
  assert.equal(match(index,{imdb:'tt2'}).label,'50% · 1/2 eps');
});
test('completion baseline persists until newly aired episodes are watched', () => {
  const seasons=[{number:1,episodes:[{number:1,plays:1},{number:2,plays:1}]}];
  const complete=buildIndex({shows:[{show,seasons}]}); assert.equal(complete.baselines['2'],2);
  const next=buildIndex({shows:[{show:{...show,aired_episodes:5},seasons}]},defaults,complete.baselines);
  assert.equal(match(next.index,{imdb:'tt2'}).label,'3 new · 40%');
  assert.equal(match(buildIndex({shows:[{show:{...show,aired_episodes:5},seasons}]},defaults,next.baselines).index,{imdb:'tt2'}).label,'3 new · 40%');
});
test('matching requires year and type, isolates TMDB namespaces, refuses collisions', () => {
  const {index}=buildIndex({movies:[{movie,plays:1}],shows:[{show,seasons:[{number:1,episodes:[{number:1,plays:1}]}]}]});
  assert.equal(match(index,{tmdb:10,type:'movie'}).id,'movie:1'); assert.equal(match(index,{tmdb:10,type:'show'}).id,'show:2');
  assert.equal(match(index,{title:'Example',type:'movie'}),null);
  assert.equal(match(index,{title:'Example',year:2020,type:'movie'}).kind,'watched');
  assert.equal(match(index,{title:'Example',year:2020,type:'movie',imdb:'unknown'}),null);
  assert.equal(match(index,{imdb:'tt1',tmdb:10,type:'show'}),null);
  const collision=buildIndex({movies:[{movie,plays:1},{movie:{...movie,ids:{trakt:9}},plays:1}]}).index;
  assert.equal(match(collision,{title:'Example',year:2020,type:'movie'}),null);
});
test('invalid settings rejected', () => { assert.throws(()=>settings({minProgress:90,completeProgress:5})); assert.throws(()=>settings({minProgress:NaN})); });
test('movie dates always display; shows require strictly more than one calendar year',()=>{
  const now=Date.parse('2026-10-31T12:00:00Z');
  assert.equal(watchedDate({id:'movie:1',lastWatchedAt:'2026-10-30T12:00:00Z'},now),'Last watched 2026-10-30');
  assert.equal(watchedDate({id:'show:1',lastWatchedAt:'2026-01-01T12:00:00Z'},now),null);
  assert.equal(watchedDate({id:'show:1',lastWatchedAt:'2025-10-31T12:00:00Z'},now),null);
  assert.equal(watchedDate({id:'show:1',lastWatchedAt:'2025-10-31T11:59:59Z'},now),'Last watched 2025-10-31');
  assert.equal(watchedDate({id:'movie:1',lastWatchedAt:'invalid'},now),null);
  assert.equal(watchedDate({id:'movie:1',lastWatchedAt:'2030-01-01'},now),null);
});
test('diagnostics distinguish missing credentials, sync and uncertain match',()=>{
  assert.match(diagnostic({},{}),/Connect Trakt/);
  assert.match(diagnostic({tokens:{}},{}),/Sync needed/);
  assert.match(diagnostic({tokens:{},cache:{},lastSync:Date.now()},{}),/No reliable match/);
});
