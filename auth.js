export const AUTH = 'https://auth.trakt.tv';
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function createLogin(clientId, redirectUri) {
  if (!/^[a-zA-Z0-9_-]{16,256}$/.test(clientId)) throw new Error('Enter a valid Trakt Client ID.');
  const verifier=base64url(crypto.getRandomValues(new Uint8Array(48)));
  const state=base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const url=new URL('/oauth/authorize',AUTH);
  url.search=new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:redirectUri,state,code_challenge:challenge,code_challenge_method:'S256'});
  return {url:url.href,state,verifier,redirectUri,clientId};
}
export function tokenBody(callback, login) {
  const url=new URL(callback), expected=new URL(login.redirectUri);
  if (url.origin!==expected.origin || url.pathname!==expected.pathname || url.searchParams.get('state')!==login.state) throw new Error('Sign-in callback validation failed. Please try again.');
  if (url.searchParams.has('error')) throw new Error('Trakt sign-in was declined.');
  const code=url.searchParams.get('code');
  if (!code) throw new Error('Trakt did not return an authorization code.');
  return {code,client_id:login.clientId,redirect_uri:login.redirectUri,code_verifier:login.verifier,grant_type:'authorization_code'};
}
