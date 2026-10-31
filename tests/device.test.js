import {test} from 'node:test';
import assert from 'node:assert/strict';
let serial=0;
async function setup(t){
  const old={chrome:globalThis.chrome,fetch:globalThis.fetch,now:Date.now};
  t.after(()=>{globalThis.chrome=old.chrome;globalThis.fetch=old.fetch;Date.now=old.now;});
  let now=2000000000000,reply=400;const state={},calls=[];Date.now=()=>now;
  let listener;
  globalThis.chrome={storage:{local:{get:async()=>structuredClone(state),set:async v=>Object.assign(state,structuredClone(v)),remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete state[k];}}},alarms:{create:()=>{},onAlarm:{addListener:()=>{}}},identity:{getRedirectURL:()=> 'https://test.chromiumapp.org/trakt'},runtime:{getURL:p=>'chrome-extension://test/'+p,getManifest:()=>({version:'1.3.1'}),onMessage:{addListener:fn=>{listener=fn;}}}};
  globalThis.fetch=async(url,opts)=>{
    const path=new URL(url).pathname,body=opts.body&&JSON.parse(opts.body);calls.push({path,body});
    if(path.startsWith('/oauth/')){assert.equal(new URL(url).origin,'https://auth.trakt.tv');assert.equal('client_secret' in body,false);}
    if(path==='/oauth/device/code')return Response.json({device_code:'private-device-code',user_code:'ABCD1234',expires_in:600,interval:5});
    if(path==='/oauth/device/token')return reply===200?Response.json({access_token:'access',refresh_token:'refresh',created_at:now/1000,expires_in:604800}):Response.json({},{status:reply});
    if(path==='/users/settings')return Response.json({user:{username:'test-user'}});
    if(path==='/sync/last_activities')return Response.json({all:'now'});
    return Response.json([],{headers:{'X-Pagination-Page-Count':'1'}});
  };
  await import(`../background.js?device-test=${++serial}`);
  return {state,calls,advance:ms=>{now+=ms;},setReply:value=>{reply=value;},invoke:(type,data={})=>new Promise(resolve=>listener({type,...data},{url:'chrome-extension://test/popup.html'},resolve))};
}
test('device login needs only public Client ID, respects interval/slowdown and saves approved tokens',async t=>{
  const h=await setup(t);
  assert.equal((await h.invoke('connect',{clientId:'a'.repeat(64)})).ok,true);
  assert.equal(h.state.device.user_code,'ABCD1234');
  await h.invoke('pollDevice');assert.equal(h.calls.filter(c=>c.path==='/oauth/device/token').length,0);
  h.advance(5000);await h.invoke('pollDevice');assert.ok(h.state.device);
  h.setReply(429);h.advance(5000);await h.invoke('pollDevice');assert.equal(h.state.device.interval,10);
  h.setReply(200);h.advance(5000);await h.invoke('pollDevice');assert.equal(h.state.tokens,undefined);
  h.advance(5000);await h.invoke('pollDevice');assert.equal(h.state.tokens.access_token,'access');assert.equal(h.state.device,undefined);
  assert.equal(h.state.credentials.clientId,'a'.repeat(64));assert.equal(h.state.username,'test-user');assert.ok(h.state.lastSync);
});
test('device login expiration, denial and cancellation clear pending codes',async t=>{
  const h=await setup(t);
  await h.invoke('connect',{clientId:'a'.repeat(64)});h.advance(600000);await h.invoke('pollDevice');
  assert.equal(h.state.device,undefined);assert.match(h.state.error,/expired/);
  await h.invoke('connect',{clientId:'a'.repeat(64)});h.setReply(418);h.advance(5000);await h.invoke('pollDevice');
  assert.equal(h.state.device,undefined);assert.match(h.state.error,/declined/);
  await h.invoke('connect',{clientId:'a'.repeat(64)});await h.invoke('cancelLogin');assert.equal(h.state.device,undefined);assert.equal(h.state.tokens,undefined);
});
