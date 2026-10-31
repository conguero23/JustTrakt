import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
test('private editor loads, saves and deletes through extension messages without network requests',async t=>{
  const dom=new JSDOM(readFileSync(new URL('../notes.html',import.meta.url),'utf8'),{url:'chrome-extension://test/notes.html?slug=inception-2010',runScripts:'outside-only'});t.after(()=>dom.window.close());
  const calls=[];let text='Original note',updatedAt=1;
  dom.window.fetch=()=>{assert.fail('Private notes must not use network requests.');};
  dom.window.chrome={runtime:{sendMessage:async m=>{calls.push(m);if(m.type==='noteState')return {ok:true,text,updatedAt};text=m.text;updatedAt=text?updatedAt+1:null;return {ok:true,updatedAt};}}};
  dom.window.eval(readFileSync(new URL('../notes.js',import.meta.url),'utf8'));await new Promise(r=>setTimeout(r,20));
  const d=dom.window.document;assert.equal(d.querySelector('textarea').value,'Original note');
  d.querySelector('textarea').value='Watch again with family';d.querySelector('textarea').dispatchEvent(new dom.window.Event('input'));
  d.querySelector('form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));await new Promise(r=>setTimeout(r,20));
  assert.equal(text,'Watch again with family');assert.equal(calls[1].expectedUpdatedAt,1);assert.match(d.querySelector('#status').textContent,/saved/);
  d.querySelector('#delete').click();await new Promise(r=>setTimeout(r,20));assert.equal(text,'');assert.equal(d.querySelector('textarea').value,'');
});
