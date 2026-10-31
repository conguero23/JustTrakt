const RELEASES='https://api.github.com/repos/conguero23/JustTrakt/releases?per_page=20';
export function selectUpdate(releases,current) {
  const parts=value=>/^v?\d+\.\d+\.\d+$/.test(value) ? value.replace(/^v/,'').split('.').map(Number):null;
  const installed=parts(current);if(!installed || !Array.isArray(releases))return null;
  const newer=version=>version.some((n,i)=>n>installed[i] && version.slice(0,i).every((p,j)=>p===installed[j]));
  return releases.filter(r=>!r.draft && parts(r.tag_name) && newer(parts(r.tag_name)))
    .sort((a,b)=>{const x=parts(a.tag_name),y=parts(b.tag_name);return y[0]-x[0] || y[1]-x[1] || y[2]-x[2];})
    .map(r=>({version:r.tag_name.replace(/^v/,''),prerelease:!!r.prerelease,url:`https://github.com/conguero23/JustTrakt/releases/tag/${r.tag_name}`}))[0] || null;
}
export function createUpdateChecker({read,save,version}) {
  let pending;
  return async function check(force=false) {
    const state=await read();if(state.settings?.checkUpdates===false)return null;
    if(!force && state.updateCheck && Date.now()-state.updateCheck.checkedAt<86400000)return state.updateCheck;
    if(pending)return pending;
    pending=(async()=>{
      let value;
      try {
        const response=await fetch(RELEASES,{headers:{Accept:'application/vnd.github+json'},credentials:'omit',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error(`GitHub update check failed (${response.status}).`);
        value={checkedAt:Date.now(),available:selectUpdate(await response.json(),version),error:null};
      }catch(error){value={...state.updateCheck,checkedAt:Date.now(),error:error.message};}
      await save({updateCheck:value});return value;
    })().finally(()=>{pending=null;});return pending;
  };
}
