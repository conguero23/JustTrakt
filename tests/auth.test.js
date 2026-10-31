import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createLogin, tokenBody } from '../auth.js';
test('PKCE uses a fresh S256 verifier and state; token exchange contains no secret',async()=>{
  const redirect='https://example.chromiumapp.org/trakt',id='a'.repeat(64);
  const a=await createLogin(id,redirect),b=await createLogin(id,redirect),url=new URL(a.url);
  assert.notEqual(a.verifier,b.verifier);assert.notEqual(a.state,b.state);
  assert.equal(url.origin,'https://auth.trakt.tv');assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(a.verifier).digest('base64url'));
  const body=tokenBody(`${redirect}?code=ok&state=${a.state}`,a);
  assert.equal(body.code_verifier,a.verifier);assert.equal('client_secret' in body,false);
});
test('rejects wrong callback origin, path, state, missing code, and declined login',async()=>{
  const a=await createLogin('b'.repeat(64),'https://example.chromiumapp.org/trakt');
  for(const url of [`https://evil.test/trakt?code=a&state=${a.state}`,`https://example.chromiumapp.org/wrong?code=a&state=${a.state}`,`${a.redirectUri}?code=a&state=wrong`,`${a.redirectUri}?state=${a.state}`,`${a.redirectUri}?error=access_denied&state=${a.state}`])assert.throws(()=>tokenBody(url,a));
  await assert.rejects(createLogin('','https://example.chromiumapp.org/trakt'));
});
