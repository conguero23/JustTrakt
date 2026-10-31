(() => {
  let timer,running=false,again=false;
  let currentFilters=null,filterSaving=false;
  const watchlists=new Map();
  const filterDefaults={hideWatched:false,seenBefore:'',minPlays:0,maxPlays:null};
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
  async function send(type,data={}){const response=await chrome.runtime.sendMessage({type,...data});if(!response?.ok)throw new Error(response?.error || 'JustTrakt is unavailable.');return response;}
  function controls(){
    let bar=document.querySelector('.justtrakt-trakt-filterbar');if(bar)return bar;
    bar=document.createElement('div');bar.className='justtrakt-trakt-filterbar';
    const heading=document.createElement('strong');heading.textContent='JustTrakt movie filters';bar.append(heading);
    for(const [name,label,type] of [['hideWatched','Unwatched only','checkbox'],['seenBefore','Last seen before','date'],['minPlays','Min watches','number'],['maxPlays','Max watches','number']]){
      const field=document.createElement('label');field.textContent=label;
      const input=document.createElement('input');input.type=type;input.dataset.filter=name;if(type==='number'){input.min='0';input.step='1';}field.append(input);bar.append(field);
    }
    const reset=document.createElement('button');reset.type='button';reset.dataset.action='reset-filters';reset.textContent='Show all / Reset';bar.append(reset);
    const status=document.createElement('span');status.className='justtrakt-trakt-filter-status';status.setAttribute('role','status');bar.append(status);
    const save=async(resetAll=false)=>{
      const next={...filterDefaults};
      if(!resetAll)for(const input of bar.querySelectorAll('input'))next[input.dataset.filter]=input.type==='checkbox'?input.checked:input.type==='number'?(input.value===''?(input.dataset.filter==='minPlays'?0:null):Number(input.value)):input.value;
      if(next.maxPlays!==null&&next.maxPlays<next.minPlays){status.textContent='Maximum watches must be at least minimum.';return;}
      filterSaving=true;
      try{await send('traktFilters',{filters:next});currentFilters=next;status.textContent='Filters saved.';if(resetAll)for(const input of bar.querySelectorAll('input')){if(input.type==='checkbox')input.checked=false;else input.value=input.dataset.filter==='minPlays'?'0':'';}}
      catch(error){status.textContent=error.message;}
      finally{filterSaving=false;schedule();}
    };
    bar.addEventListener('change',()=>save());reset.onclick=()=>save(true);
    (document.querySelector('main') || document.body)?.prepend(bar);return bar;
  }
  function applyControls(bar,config){
    if(!currentFilters || !filterSaving)currentFilters={...filterDefaults,...config};
    if(!bar.contains(document.activeElement))for(const input of bar.querySelectorAll('input')){const value=currentFilters[input.dataset.filter];if(input.type==='checkbox')input.checked=value;else input.value=value??'';}
  }
  function isFiltered(movie){
    if(!movie || movie.watched===null)return false;
    const f=currentFilters || filterDefaults;
    return (f.hideWatched&&movie.watched)||(f.seenBefore&&(!movie.date || movie.date>=f.seenBefore))||movie.plays<f.minPlays||(f.maxPlays!==null&&movie.plays>f.maxPlays);
  }
  function cardHost(cover){
    const details=cover.closest('.trakt-summary-card')?.querySelector('.trakt-summary-card-details');
    if(!details)return cover;
    let dock=details.querySelector(':scope > .justtrakt-trakt-dock');
    if(!dock){dock=document.createElement('div');dock.className='justtrakt-trakt-dock';const titles=details.querySelector(':scope > .trakt-summary-card-titles');if(titles)titles.after(dock);else details.append(dock);}
    if(!details.classList.contains('justtrakt-details-layout'))details.classList.add('justtrakt-details-layout');
    return dock;
  }
  function paintWatchlist(button,entry){
    const busy=!!entry.pending,saved=entry.saved===true;
    button.disabled=busy;button.setAttribute('aria-busy',String(busy));button.setAttribute('aria-live','polite');button.setAttribute('aria-pressed',String(saved));
    button.textContent=busy?(entry.operation==='write'?(entry.next?'Adding…':'Removing…'):'Checking…'):entry.error?'Retry':saved?'Saved ✓':'Watchlist +';
    button.title=entry.error || (saved?'Remove movie from the connected Trakt account’s watchlist':'Add movie to the connected Trakt account’s watchlist');button.setAttribute('aria-label',button.title);
  }
  function paintMovie(slug){const entry=watchlists.get(slug);if(entry)for(const button of document.querySelectorAll('[data-action="watchlist"]'))if(button.dataset.slug===slug)paintWatchlist(button,entry);}
  function loadWatchlist(button,slug){
    let entry=watchlists.get(slug);
    if(entry&&(entry.pending||Date.now()-entry.checkedAt<60000)){paintWatchlist(button,entry);return;}
    entry={pending:true,operation:'check',saved:null,checkedAt:Date.now()};watchlists.set(slug,entry);paintMovie(slug);
    send('traktWatchlistStatus',{slug}).then(result=>{if(watchlists.get(slug)===entry)Object.assign(entry,{saved:result.inWatchlist===true,error:null});}).catch(error=>{if(watchlists.get(slug)===entry)entry.error=error.message;}).finally(()=>{if(watchlists.get(slug)===entry){entry.pending=false;entry.checkedAt=Date.now();paintMovie(slug);}});
  }
  async function changeWatchlist(button){
    const slug=button.dataset.slug,entry=watchlists.get(slug);
    if(!entry||entry.saved===null){watchlists.delete(slug);loadWatchlist(button,slug);return;}
    if(entry.pending)return;
    const next=!entry.saved;Object.assign(entry,{pending:true,operation:'write',next,error:null});paintMovie(slug);
    button.parentElement.querySelector('.justtrakt-trakt-action-status')?.remove();
    try{const result=await send(next?'traktAddWatchlist':'traktRemoveWatchlist',{slug});if(watchlists.get(slug)===entry)Object.assign(entry,{saved:typeof result.inWatchlist==='boolean'?result.inWatchlist:next,error:null});}
    catch(error){if(watchlists.get(slug)===entry)entry.error=error.message;let status=button.parentElement.querySelector('.justtrakt-trakt-action-status');if(!status){status=document.createElement('span');status.className='justtrakt-trakt-action-status';status.setAttribute('role','status');button.parentElement.append(status);}status.textContent=error.message;}
    finally{if(watchlists.get(slug)===entry){entry.pending=false;entry.checkedAt=Date.now();paintMovie(slug);}}
  }
  function extra(host,movie,candidate,preferences={}){
    let panel=host.querySelector(':scope > .justtrakt-trakt-tools');
    const title=movie?.title || candidate.title || candidate.slug.replace(/-\d{4}$/,'').replace(/-/g,' ');
    const docked=host.classList.contains('justtrakt-trakt-dock');
    const dateVisible=!!host.querySelector(':scope > .justtrakt-trakt-date,:scope > .justtrakt-trakt-info');
    const signature=JSON.stringify([candidate.slug,movie,preferences.traktWatchCounts,preferences.traktRewatch,title,docked,dateVisible]);
    if(panel?.dataset.signature===signature&&panel.querySelector('[data-action="jw"]')&&panel.querySelector('[data-action="watchlist"]')&&!panel.querySelector('[data-action="note"]')){loadWatchlist(panel.querySelector('[data-action="watchlist"]'),candidate.slug);return;}
    panel?.remove();panel=document.createElement('div');panel.className=`justtrakt-trakt-tools${candidate.info?' justtrakt-trakt-detail-tools':''}`;panel.dataset.signature=signature;
    if(!candidate.info&&!docked&&!host.classList.contains('justtrakt-trakt-cover'))host.classList.add('justtrakt-trakt-cover');
    if(!dateVisible && movie?.plays>0 && preferences.traktWatchCounts!==false){const count=document.createElement('span');count.className='justtrakt-trakt-count';count.textContent=`(${movie.plays})`;count.title=`Watched ${movie.plays} time${movie.plays===1?'':'s'}`;count.setAttribute('aria-label',count.title);panel.append(count);}
    if(movie?.rewatch && preferences.traktRewatch!==false){const flag=document.createElement('span');flag.className='justtrakt-trakt-rewatch';flag.textContent=docked?'3+ yr rewatch':'Rewatch · 3+ years';flag.title='Last watched more than three calendar years ago.';panel.append(flag);}
    const actions=document.createElement('div');actions.className='justtrakt-trakt-actions';
    const watchlist=document.createElement('button');watchlist.type='button';watchlist.dataset.action='watchlist';watchlist.dataset.slug=candidate.slug;watchlist.textContent='Checking…';actions.append(watchlist);
    const button=document.createElement('button');button.type='button';button.dataset.action='jw';button.dataset.slug=candidate.slug;button.dataset.title=title;button.textContent=docked?'JustWatch':'Find on JustWatch';button.setAttribute('aria-label','Find streaming options on JustWatch');button.title='Find streaming options on JustWatch';
    const arrow=document.createElement('span');arrow.className='justtrakt-external';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';button.append(arrow);actions.append(button);
    panel.append(actions);host.append(panel);
    loadWatchlist(watchlist,candidate.slug);
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('.justtrakt-trakt-actions button');if(!button)return;
    if(button.dataset.action==='watchlist'){event.preventDefault();event.stopImmediatePropagation();if(!button.disabled)await changeWatchlist(button);return;}
    event.preventDefault();event.stopImmediatePropagation();if(button.disabled)return;button.disabled=true;
    try{await send(button.dataset.action==='jw'?'openJustWatch':'openNotes',{title:button.dataset.title,slug:button.dataset.slug});}
    catch(error){let status=button.parentElement.querySelector('.justtrakt-trakt-action-status');if(!status){status=document.createElement('span');status.className='justtrakt-trakt-action-status';status.setAttribute('role','status');button.parentElement.append(status);}status.textContent=error.message;}
    finally{button.disabled=false;}
  },true);
  function render(host,result,info=false,movie=null,preferences={}){
    const selector=info?'.justtrakt-trakt-info':'.justtrakt-trakt-date';
    let node=host.querySelector(`:scope > ${selector}`);
    if(!result){node?.remove();return;}
    if(!node){node=document.createElement(info?'p':'span');node.className=selector.slice(1);host.append(node);}
    if(!info && !host.classList.contains('justtrakt-trakt-dock') && !host.classList.contains('justtrakt-trakt-cover'))host.classList.add('justtrakt-trakt-cover');
    const count=movie?.plays>0 && preferences.traktWatchCounts!==false?` (${movie.plays})`:'';
    if(info || host.classList.contains('justtrakt-trakt-dock')){
      if(node.dataset.date!==result.date || node.dataset.count!==count || !node.querySelector('time')){
        const label=document.createElement('span');label.className='justtrakt-date-label';label.textContent=`Last seen${count}`;
        const date=document.createElement('time');date.dateTime=result.date;date.textContent=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${result.date}T00:00:00Z`));
        node.replaceChildren(label,date);node.dataset.date=result.date;node.dataset.count=count;
      }
    }else{const text=`Last seen${count} ${result.date}`;if(node.textContent!==text)node.textContent=text;}
    node.title=`JustTrakt${result.username?` · @${result.username}`:''} · Last watched ${result.date}. From the account connected to this extension.`;
  }
  async function scan(){
    if(running){again=true;return;}running=true;
    try{
      const candidates=[],visited=new Set();
      for(const link of document.querySelectorAll('a[href*="/movies/"]')){
        const slug=slugOf(link.href);if(!slug)continue;
        const cover=link.querySelector('.trakt-card-cover') || (link.querySelector('img')?link:null);
        if(cover&&!visited.has(cover)){candidates.push({host:cardHost(cover),slug,title:link.closest('.trakt-card-content')?.querySelector('.trakt-card-title')?.textContent?.trim() || link.querySelector('img')?.alt?.replace(/^poster (?:for|of)\s+/i,'').trim()});visited.add(cover);}
      }
      const detailSlug=slugOf(location.href);
      if(detailSlug){
        for(const host of document.querySelectorAll('.trakt-summary-poster'))if(!host.closest('.trakt-card')&&!visited.has(host)){candidates.push({host,slug:detailSlug,detail:true});visited.add(host);}
        const sections=document.querySelectorAll('.trakt-summary-main-content, .trakt-media-summary-body, .trakt-summary-header');
        for(const host of sections)if(![...sections].some(other=>other!==host&&other.contains(host)))candidates.push({host,slug:detailSlug,info:true,detail:true,title:document.querySelector('h1')?.textContent?.trim()});
        if(!sections.length){const heading=document.querySelector('main h1,h1');if(heading?.parentElement)candidates.push({host:heading.parentElement,slug:detailSlug,info:true,detail:true,title:heading.textContent?.trim()});}
      }else document.querySelectorAll('.justtrakt-trakt-info,.trakt-summary-poster > .justtrakt-trakt-date').forEach(n=>n.remove());
      const liveHosts=new Set(candidates.map(c=>c.host));
      document.querySelectorAll('.justtrakt-trakt-date,.justtrakt-trakt-info,.justtrakt-trakt-tools').forEach(node=>{if(!liveHosts.has(node.parentElement))node.remove();});
      const cards=new Set(candidates.filter(c=>!c.detail).map(c=>c.host.closest('.trakt-card') || c.host.closest('.trakt-card-content') || c.host.closest('a') || c.host));
      document.querySelectorAll('.justtrakt-trakt-filtered').forEach(node=>{if(!cards.has(node))node.classList.remove('justtrakt-trakt-filtered');});
      const bar=cards.size?controls():null;if(!bar)document.querySelector('.justtrakt-trakt-filterbar')?.remove();
      let loaded=0,hidden=0,unknown=0;
      for(let start=0;start<candidates.length;start+=500){
        const batch=candidates.slice(start,start+500);
        const response=await chrome.runtime.sendMessage({type:'traktMovieDates',slugs:batch.map(c=>c.slug)});
        if(!response?.ok)continue;
        if(bar)applyControls(bar,response.filters);
        batch.forEach((candidate,i)=>{
          if(!candidate.host.isConnected)return;
          if(candidate.detail&&slugOf(location.href)!==candidate.slug){schedule();return;}
          if(!candidate.detail){const link=candidate.host.closest('a[href]');if(link&&slugOf(link.href)!==candidate.slug){schedule();return;}}
          const movie=response.movies?.[i] || (response.dates[i]?{...response.dates[i],plays:1,watched:true}:null);
          render(candidate.host,response.dates[i],candidate.info,movie,response.settings);
          if(!candidate.detail||candidate.info)extra(candidate.host,movie,candidate,response.settings);
          else candidate.host.querySelector(':scope > .justtrakt-trakt-tools')?.remove();
          if(!candidate.detail){const card=candidate.host.closest('.trakt-card') || candidate.host.closest('.trakt-card-content') || candidate.host.closest('a') || candidate.host;const hide=isFiltered(movie);card.classList.toggle('justtrakt-trakt-filtered',!!hide);loaded++;if(hide)hidden++;if(!movie||movie.watched===null)unknown++;}
        });
      }
      if(bar&&!bar.contains(document.activeElement)){const text=`${loaded-hidden}/${loaded} loaded movies shown${unknown?' · Connect and sync for unknown history':''}. Filters apply to loaded cards.`;const status=bar.querySelector('.justtrakt-trakt-filter-status');if(status.textContent!==text)status.textContent=text;}
    }catch{/* The extension may be reloaded while a page is open. */}
    finally{running=false;if(again){again=false;schedule();}}
  }
  new MutationObserver(mutations=>{if(mutations.some(m=>m.type==='attributes'||[...m.removedNodes].some(n=>!m.target.closest?.('.justtrakt-trakt-tools,.justtrakt-trakt-filterbar'))||[...m.addedNodes].some(n=>!n.parentElement?.closest('.justtrakt-trakt-date,.justtrakt-trakt-info,.justtrakt-trakt-tools,.justtrakt-trakt-filterbar')&&!(n.nodeType===1&&n.matches('.justtrakt-trakt-date,.justtrakt-trakt-info,.justtrakt-trakt-tools,.justtrakt-trakt-filterbar')))))schedule();}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['href','src']});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes.tokens)watchlists.clear();
    else if(changes.watchlistCache)for(const [slug,entry] of watchlists)if(!(entry.pending&&entry.operation==='write'))watchlists.delete(slug);
    if(changes.cache||changes.tokens||changes.lastSync||changes.username||changes.settings||changes.traktFilters||changes.watchlistCache)schedule();
  });
  window.addEventListener('popstate',schedule);document.addEventListener('DOMContentLoaded',schedule,{once:true});schedule();
})();
