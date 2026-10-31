import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectUpdate,createUpdateChecker} from '../updates.js';
test('updates compare versions numerically, support betas and ignore drafts/malformed tags',()=>{
  const r=selectUpdate([{tag_name:'v1.9.0'},{tag_name:'v1.10.0',prerelease:true},{tag_name:'v99.0.0',draft:true},{tag_name:'malformed'}],'1.3.0');
  assert.equal(r.version,'1.10.0');assert.equal(r.prerelease,true);assert.equal(r.url,'https://github.com/conguero23/JustTrakt/releases/tag/v1.10.0');
  assert.equal(selectUpdate([{tag_name:'v1.3.0'}],'1.3.0'),null);
});
test('GitHub checks are deduplicated, cached and disabled without transmitting account data',async t=>{
  const previous=globalThis.fetch;t.after(()=>{globalThis.fetch=previous;});let state={tokens:{access_token:'must-not-be-sent'}},calls=0;
  globalThis.fetch=async(url,options)=>{calls++;assert.match(url,/api.github.com\/repos\/conguero23\/JustTrakt/);assert.equal(options.headers.Authorization,undefined);assert.equal(options.body,undefined);return Response.json([{tag_name:'v1.4.0'}]);};
  const check=createUpdateChecker({read:async()=>state,save:async v=>Object.assign(state,v),version:'1.3.0'});
  await Promise.all([check(),check()]);assert.equal(calls,1);await check();assert.equal(calls,1);
  state.settings={checkUpdates:false};await check(true);assert.equal(calls,1);
});
