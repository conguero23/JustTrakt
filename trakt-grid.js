(() => {
  let enabled=false,timer,pending=false;
  const marked=new Set();
  const classes=['justtrakt-poster-grid','justtrakt-grid-slot','justtrakt-grid-card'];
  function clear(){for(const node of marked)node.classList.remove(...classes);marked.clear();}
  function mark(node,name){node.classList.add(name);marked.add(node);}
  function mediaCard(card){
    return [...card.querySelectorAll('a[href]')].some(link=>{
      try{const url=new URL(link.href,location.href);return url.origin===location.origin&&/^\/(movies|shows)\/[a-z0-9][a-z0-9-]*\/?$/.test(url.pathname);}catch{return false;}
    })&&!!card.querySelector('.trakt-card-cover img,.trakt-summary-poster img');
  }
  function controls(hasCards){
    let button=document.querySelector('.justtrakt-grid-toggle');
    const filters=document.querySelector('.justtrakt-trakt-filterbar');
    let toolbar=document.querySelector('.justtrakt-grid-toolbar');
    if(!hasCards){button?.remove();toolbar?.remove();return;}
    if(!button){
      button=document.createElement('button');button.type='button';button.className='justtrakt-grid-toggle';button.textContent='JustWatchIt';
      button.title='Switch between Trakt cards and a JustWatch-style poster grid';
      button.onclick=async event=>{
        event.preventDefault();event.stopPropagation();if(pending)return;pending=true;button.disabled=true;button.setAttribute('aria-busy','true');
        try{const result=await chrome.runtime.sendMessage({type:'traktGrid',enabled:!enabled});if(!result?.ok)throw new Error(result?.error||'Unable to change layout.');enabled=result.enabled;button.title='Switch between Trakt cards and a JustWatch-style poster grid';}
        catch(error){button.title=error.message;}
        finally{pending=false;button.disabled=false;button.setAttribute('aria-busy','false');schedule();}
      };
    }
    if(filters){
      const date=filters.querySelector('[data-filter=seenBefore]')?.closest('label');
      if(button.parentElement!==filters || (date&&date.nextElementSibling!==button)){if(date)date.after(button);else filters.append(button);}
      toolbar?.remove();
    }else{
      if(!toolbar){toolbar=document.createElement('div');toolbar.className='justtrakt-grid-toolbar';(document.querySelector('main')||document.body).prepend(toolbar);}
      if(button.parentElement!==toolbar)toolbar.append(button);
    }
    button.setAttribute('aria-pressed',String(enabled));
  }
  function scan(){
    timer=null;clear();
    const cards=[...document.querySelectorAll('main .trakt-card')].filter(mediaCard);
    controls(cards.length>0);if(!enabled)return;
    const candidates=new Set(cards);
    for(const card of cards){
      if(marked.has(card))continue;
      let slot=card,parent=slot.parentElement;
      for(let depth=0;parent&&parent.tagName!=='MAIN'&&depth<4;depth++,slot=parent,parent=parent.parentElement){
        const slots=[...parent.children].filter(child=>candidates.has(child)||[...child.querySelectorAll('.trakt-card')].some(c=>candidates.has(c)));
        if(slots.length<2)continue;
        // Only flatten one-card slots: never turn whole sections or carousels into posters.
        if(slots.some(child=>[child,...child.querySelectorAll('.trakt-card')].filter(c=>candidates.has(c)).length!==1))break;
        if(slots.some(child=>child.style.transform||child.style.position==='absolute'))break;
        mark(parent,'justtrakt-poster-grid');
        for(const child of slots){mark(child,'justtrakt-grid-slot');const media=candidates.has(child)?child:child.querySelector('.trakt-card');mark(media,'justtrakt-grid-card');}
        break;
      }
    }
  }
  function schedule(){if(!timer)timer=setTimeout(scan,100);}
  chrome.storage.local.get('settings').then(value=>{enabled=value.settings?.traktPosterGrid===true;schedule();}).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.settings){enabled=changes.settings.newValue?.traktPosterGrid===true;schedule();}});
  new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.matches?.('.justtrakt-trakt-filterbar'))||m.type==='attributes'||[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&!n.matches?.('.justtrakt-trakt-dock,.justtrakt-trakt-date,.justtrakt-trakt-info,.justtrakt-trakt-tools,.justtrakt-trakt-filterbar,.justtrakt-grid-toolbar,.justtrakt-grid-toggle')&&!m.target.closest?.('.justtrakt-trakt-dock,.justtrakt-trakt-tools,.justtrakt-trakt-filterbar,.justtrakt-grid-toolbar'))))schedule();}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['href','src']});
  window.addEventListener('popstate',schedule);document.addEventListener('DOMContentLoaded',schedule,{once:true});
})();
