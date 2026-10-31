import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filters,toolsForMovies,justWatchUrl,noteKeys} from '../trakt-tools.js';
const now=Date.parse('2026-10-31T12:00:00Z');
test('rewatch reminders require strictly more than three calendar years and retain actual watch counts',()=>{
  const state={tokens:{},cache:{movies:[['old','2023-10-31T11:59:59Z',3],['boundary','2023-10-31T12:00:00Z',1],['recent','2025-01-01',2]].map(([slug,last_watched_at,plays],i)=>({plays,last_watched_at,movie:{title:slug,year:2000,ids:{slug,trakt:i+1}}}))}};
  const [old,boundary,recent,unwatched]=toolsForMovies(state,['old','boundary','recent','new'],now);
  assert.equal(old.rewatch,true);assert.equal(old.plays,3);assert.equal(boundary.rewatch,false);assert.equal(recent.rewatch,false);
  assert.equal(unwatched.watched,false);assert.equal(unwatched.plays,0);
  assert.equal(toolsForMovies({},['new'],now)[0].watched,null);
});
test('filters reject invalid counts and links encode title queries and validate country',()=>{
  assert.throws(()=>filters({minPlays:3,maxPlays:2}));assert.throws(()=>filters({minPlays:-1}));assert.throws(()=>filters({minPlays:0.5}));
  assert.throws(()=>filters({seenBefore:'not-a-date'}));
  assert.equal(justWatchUrl('A & B','bo'),'https://www.justwatch.com/bo/search?q=A%20%26%20B');assert.throws(()=>justWatchUrl('Movie','../../bad'));
});
test('note identifiers are scoped safely and unify numeric and known movie slug aliases',()=>{
  const state={cache:{movies:[{movie:{ids:{slug:'inception-2010',trakt:123}}}]}};
  assert.equal(noteKeys(state,'inception-2010')[0],'movie:123');assert.equal(noteKeys(state,'123')[0],'movie:123');
  assert.deepEqual(noteKeys({},'constructor'),['slug:constructor']);assert.throws(()=>noteKeys({},'../../tokens'));
});
