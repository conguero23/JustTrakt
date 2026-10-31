import {test} from 'node:test';
import assert from 'node:assert/strict';

test('service worker completes PKCE login and shares single-use refresh across concurrent account requests',async t=>{
  const previousChrome=globalThis.chrome,previousFetch=globalThis.fetch;
  t.after(()=>{globalThis.chrome=previousChrome;globalThis.fetch=previousFetch;});
  let state={credentials:{clientId:'a'.repeat(64),clientSecret:'legacy-test-only'}},listener,refreshes=0;
  const requests=[];
  globalThis.chrome={
    storage:{local:{
      get:async key=>key==='credentials'?{credentials:structuredClone(state.credentials)}:structuredClone(state),
      set:async value=>Object.assign(state,structuredClone(value)),
      remove:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])delete state[key];}
    }},
    alarms:{clear:async()=>true,create:()=>{},onAlarm:{addListener:()=>{}}},
    identity:{getRedirectURL:()=> 'https://example.chromiumapp.org/trakt',launchWebAuthFlow:async({url})=>{
      const login=new URL(url);assert.equal(login.origin,'https://auth.trakt.tv');
      return `https://example.chromiumapp.org/trakt?code=test-code&state=${login.searchParams.get('state')}`;
    }},
    runtime:{getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener:fn=>{listener=fn;}}}
  };
  globalThis.fetch=async(url,options)=>{
    requests.push({url,body:options.body&&JSON.parse(options.body)});
    const path=new URL(url).pathname;
    if(path==='/oauth/token') {
      assert.equal(new URL(url).origin,'https://auth.trakt.tv');
      const body=JSON.parse(options.body);assert.equal('client_secret' in body,false);
      if(body.grant_type==='refresh_token')refreshes++;
      else {assert.equal(body.code,'test-code');assert.ok(body.code_verifier);}
      return Response.json({access_token:'test-access',refresh_token:'test-refresh',created_at:Math.floor(Date.now()/1000),expires_in:604800});
    }
    if(path==='/users/settings')return Response.json({user:{username:'test-user'}});
    if(path==='/sync/last_activities')return Response.json({all:'test'});
    return Response.json([],{headers:{'X-Pagination-Page-Count':'1'}});
  };
  await import(`../background.js?test=${Date.now()}`);
  const invoke=(type,data={})=>new Promise(resolve=>listener({type,...data},{url:'chrome-extension://test/popup.html'},resolve));
  const login=await invoke('connect',{clientId:'a'.repeat(64)});
  assert.equal(login.ok,true);assert.equal(state.username,'test-user');
  assert.equal('clientSecret' in state.credentials,false);assert.ok(state.lastSync);
  state.tokens.created_at=0;
  for(const [type,id] of [['movie',1],['show',2]]) {
    state.titleDetails??={};state.titleDetails[`${type}:imdb:tt${id}`]={trakt:id,type,rating:8,votes:1,fetchedAt:Date.now()};
  }
  const checks=await Promise.all([invoke('watchlistStatus',{item:{type:'movie',imdb:'tt1'}}),invoke('watchlistStatus',{item:{type:'show',imdb:'tt2'}})]);
  assert.ok(checks.every(r=>r.ok));assert.equal(refreshes,1);
  assert.ok(requests.some(r=>r.url.includes('/sync/watched/shows?extended=progress')));
  const disconnected=await invoke('disconnect');assert.equal(disconnected.ok,true);
  assert.equal(state.tokens,undefined);assert.equal(state.watchlistCache,undefined);
});
