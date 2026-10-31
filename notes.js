const $=id=>document.getElementById(id),slug=new URLSearchParams(location.search).get('slug');
let updatedAt=null,dirty=false;
async function send(type,data={}){const result=await chrome.runtime.sendMessage({type,slug,...data});if(!result?.ok)throw new Error(result?.error || 'Unable to access local notes.');return result;}
function count(){$('count').textContent=`${$('note').value.length} / 4000 characters`;}
async function save(clear=false){
  $('save').disabled=true;$('delete').disabled=true;$('status').textContent='Saving locally…';
  try{const text=clear?'':$('note').value;const result=await send('saveNote',{text,expectedUpdatedAt:updatedAt});updatedAt=result.updatedAt || null;if(clear)$('note').value='';dirty=false;count();$('status').textContent=clear?'Note deleted.':'Note saved in this browser.';}
  catch(error){$('status').textContent=error.message;}
  finally{$('save').disabled=false;$('delete').disabled=false;}
}
$('note').addEventListener('input',()=>{dirty=true;count();$('status').textContent='Unsaved changes';});
$('noteForm').addEventListener('submit',event=>{event.preventDefault();save();});$('delete').onclick=()=>save(true);
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
$('movie').textContent=slug?`Movie: ${slug}`:'No movie selected';
$('save').disabled=true;$('delete').disabled=true;$('note').disabled=true;
send('noteState').then(result=>{$('note').value=result.text;updatedAt=result.updatedAt;count();$('note').disabled=false;$('save').disabled=false;$('delete').disabled=false;}).catch(error=>{$('status').textContent=error.message;});
