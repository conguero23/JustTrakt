(() => {
  let timer,running=false,again=false;
  function slugOf(value){
    try{
      const url=new URL(value,location.origin);
      if(!['app.trakt.tv','trakt.tv'].includes(url.hostname))return null;
      const match=url.pathname.match(/^\/movies\/([a-z0-9][a-z0-9-]*)\/?$/);
      if(!match || ['trending','popular','watched','anticipated','recommended','boxoffice'].includes(match[1]))return null;
      return match[1];
    }catch{return null;}
  }
  function schedule(){if(!timer)timer=setTimeout(()=>{timer=null;scan();},100);}
  function render(host,result,info=false){
    const selector=info?'.justtrakt-trakt-info':'.justtrakt-trakt-date';
    let node=host.querySelector(`:scope > ${selector}`);
    if(!result){node?.remove();return;}
    if(!node){node=document.createElement(info?'p':'span');node.className=selector.slice(1);host.append(node);}
    if(!info && !host.classList.contains('justtrakt-trakt-cover'))host.classList.add('justtrakt-trakt-cover');
    const text=`Last seen ${result.date}`;
    if(node.textContent!==text)node.textContent=text;
    node.title=`JustTrakt${result.username?` · @${result.username}`:''} · Last watched ${result.date}. From the account connected to this extension.`;
  }
  async function scan(){
    if(running){again=true;return;}running=true;
    try{
      const candidates=[],visited=new Set();
      for(const link of document.querySelectorAll('a[href*="/movies/"]')){
        const slug=slugOf(link.href);if(!slug)continue;
        const cover=link.querySelector('.trakt-card-cover') || (link.querySelector('img')?link:null);
        if(cover&&!visited.has(cover)){candidates.push({host:cover,slug});visited.add(cover);}
      }
      const detailSlug=slugOf(location.href);
      if(detailSlug){
        for(const host of document.querySelectorAll('.trakt-summary-poster'))if(!visited.has(host)){candidates.push({host,slug:detailSlug,detail:true});visited.add(host);}
        const sections=document.querySelectorAll('.trakt-summary-main-content, .trakt-media-summary-body, .trakt-summary-header');
        for(const host of sections)if(![...sections].some(other=>other!==host&&other.contains(host)))candidates.push({host,slug:detailSlug,info:true,detail:true});
        if(!sections.length){const heading=document.querySelector('main h1,h1');if(heading?.parentElement)candidates.push({host:heading.parentElement,slug:detailSlug,info:true,detail:true});}
      }else document.querySelectorAll('.justtrakt-trakt-info,.trakt-summary-poster > .justtrakt-trakt-date').forEach(n=>n.remove());
      const liveHosts=new Set(candidates.map(c=>c.host));
      document.querySelectorAll('.justtrakt-trakt-date,.justtrakt-trakt-info').forEach(node=>{if(!liveHosts.has(node.parentElement))node.remove();});
      for(let start=0;start<candidates.length;start+=500){
        const batch=candidates.slice(start,start+500);
        const response=await chrome.runtime.sendMessage({type:'traktMovieDates',slugs:batch.map(c=>c.slug)});
        if(!response?.ok)continue;
        batch.forEach((candidate,i)=>{
          if(!candidate.host.isConnected)return;
          if(candidate.detail&&slugOf(location.href)!==candidate.slug){schedule();return;}
          if(!candidate.detail){const link=candidate.host.closest('a[href]');if(link&&slugOf(link.href)!==candidate.slug){schedule();return;}}
          render(candidate.host,response.dates[i],candidate.info);
        });
      }
    }catch{/* The extension may be reloaded while a page is open. */}
    finally{running=false;if(again){again=false;schedule();}}
  }
  new MutationObserver(mutations=>{if(mutations.some(m=>m.type==='attributes'||m.removedNodes.length||[...m.addedNodes].some(n=>!n.parentElement?.closest('.justtrakt-trakt-date,.justtrakt-trakt-info')&&!(n.nodeType===1&&n.matches('.justtrakt-trakt-date,.justtrakt-trakt-info')))))schedule();}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['href','src']});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&(changes.cache||changes.tokens||changes.lastSync||changes.username||changes.settings))schedule();});
  window.addEventListener('popstate',schedule);document.addEventListener('DOMContentLoaded',schedule,{once:true});schedule();
})();
