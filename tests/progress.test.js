import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createFeatures} from '../trakt-features.js';

function setup() {
  const state={tokens:{access_token:'test'},credentials:{clientId:'test'},cache:{},lastSync:Date.now(),lastFullSync:123,index:{'trakt:show:12':{id:'show:12',kind:'progress',tooltip:'Progress',lastWatchedAt:'2020-01-01'}}};
  const calls=[];
  const features=createFeatures({read:async()=>state,save:async v=>Object.assign(state,v),access:async()=>'test',pages:async()=>[{show:{ids:{trakt:12}}}],request:async(path,opts)=>{
    calls.push({path,opts});
    if(path.includes('/progress/watched'))return {aired:10,completed:7,next_episode:{season:2,number:4,title:'Next'}};
    if(path==='/sync/watchlist/remove')return {deleted:{shows:1},not_found:{shows:[]}};
    return {ids:{trakt:12},rating:8,votes:100};
  }});
  return {state,calls,features,item:{type:'show',imdb:'tt12'}};
}
test('watchlist removal uses the correct endpoint and updates membership without changing history',async()=>{
  const {state,calls,features,item}=setup();
  assert.equal((await features.membership(item)).inWatchlist,true);
  const result=await features.remove(item);assert.equal(result.removed,true);
  const mutation=calls.find(c=>c.path==='/sync/watchlist/remove');assert.deepEqual(mutation.opts.body,{shows:[{ids:{trakt:12}}]});
  assert.equal((await features.membership(item)).inWatchlist,false);assert.ok(state.index['trakt:show:12']);
});
test('next-episode progress loads on demand, is cached, and invalidates after history refresh',async()=>{
  const {state,calls,features,item}=setup();
  const a=await features.info(item);assert.equal(a.progress.remaining,3);assert.equal(a.progress.next.season,2);assert.equal(a.progress.next.number,4);
  assert.equal(a.lastWatched,null);
  assert.equal(a.traktUrl,'https://trakt.tv/shows/12');
  await features.info(item);assert.equal(calls.filter(c=>c.path.includes('/progress/watched')).length,1);
  state.lastFullSync=124;await features.info(item);assert.equal(calls.filter(c=>c.path.includes('/progress/watched')).length,2);
});

test('Trakt slug membership shares one watchlist snapshot; writes resolve the exact slug',async()=>{
  const state={tokens:{access_token:'test'},credentials:{clientId:'test'}},requests=[];let lists=0;
  const features=createFeatures({read:async()=>state,save:async value=>Object.assign(state,value),access:async()=>'test',pages:async()=>{lists++;return [{movie:{ids:{trakt:123,slug:'inception-2010'}}}];},request:async(path,opts)=>{requests.push({path,opts});if(path==='/sync/watchlist/remove')return {deleted:{movies:1}};if(path==='/sync/watchlist')return {added:{movies:1}};return {ids:{trakt:123,slug:'inception-2010'},rating:8,votes:10};}});
  assert.equal((await features.membershipSlug('inception-2010')).inWatchlist,true);
  assert.equal((await features.membershipSlug('123')).inWatchlist,true);assert.equal(lists,1);assert.equal(requests.length,0);
  await features.remove({type:'movie',slug:'inception-2010'});assert.equal(requests[0].path,'/movies/inception-2010?extended=full');assert.equal((await features.membershipSlug('inception-2010')).inWatchlist,false);
  await features.add({type:'movie',slug:'inception-2010'});assert.equal((await features.membershipSlug('inception-2010')).inWatchlist,true);assert.equal(lists,1);
  assert.deepEqual(requests.find(r=>r.path==='/sync/watchlist').opts.body,{movies:[{ids:{trakt:123}}]});
});
