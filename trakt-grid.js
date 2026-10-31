(() => {
  let enabled=false,timer,pending=false;
  const marked=new Set();
  const classes=['justtrakt-poster-grid','justtrakt-grid-slot','justtrakt-grid-card','justtrakt-grid-wrapper','justtrakt-grid-artwork','justtrakt-grid-art-layer','justtrakt-grid-floating-control'];
  function clear(){for(const node of marked)node.classList.remove(...classes);marked.clear();}
  function mark(node,name){node.classList.add(name);marked.add(node);}
  function mediaCard(card){
    return [...card.querySelectorAll('a[href]')].some(link=>{
      try{const url=new URL(link.href,location.href);return [location.hostname,'app.trakt.tv','trakt.tv'].includes(url.hostname)&&/^\/(movies|shows)\/[a-z0-9][a-z0-9-]*\/?$/.test(url.pathname);}catch{return false;}
    })&&!!card.querySelector('.trakt-card-cover img,.trakt-summary-poster img');
  }
  function controls(hasCards,count=0){
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
    let status=button.parentElement.querySelector('.justtrakt-grid-feedback');
    if(!status){status=document.createElement('span');status.className='justtrakt-grid-feedback';status.setAttribute('role','status');button.after(status);}
    const text=enabled?(count?`${count} posters`:'No supported posters found on this page.'):'';
    if(status.textContent!==text)status.textContent=text;
    button.dataset.posters=String(enabled?count:0);
  }
  function scan(){
    timer=null;clear();
    const root=document.querySelector('main,[role=main]')||document.body;
    const cards=[...root.querySelectorAll('.trakt-card')].filter(card=>!card.closest('aside')&&mediaCard(card));
    controls(cards.length>0||!!document.querySelector('.justtrakt-trakt-filterbar'),enabled?cards.length:0);if(!enabled)return;
    const candidates=new Set(cards);
    const grouped=new Set();
    const branches=new Map();
    // Cache every card's ancestry instead of assuming a fixed number of wrappers.
    for(const card of cards){
      mark(card,'justtrakt-grid-card');
      const image=card.querySelector('.trakt-card-cover picture img')||card.querySelector('.trakt-card-cover img')||card.querySelector('.trakt-summary-poster img');
      if(image){
        mark(image,'justtrakt-grid-artwork');
        for(let layer=image.parentElement;layer&&layer!==card&&!layer.matches('.trakt-card-cover,.trakt-summary-poster');layer=layer.parentElement)mark(layer,'justtrakt-grid-art-layer');
      }
      for(let child=card,parent=child.parentElement;parent&&root.contains(parent);child=parent,parent=parent.parentElement){
        if(!branches.has(parent))branches.set(parent,new Set());branches.get(parent).add(child);
        if(parent===root||parent.matches('section,aside'))break;
      }
    }
    for(const card of cards){
      if(grouped.has(card))continue;
      for(let parent=card.parentElement;parent&&root.contains(parent);parent=parent.parentElement){
        const slots=[...(branches.get(parent)||[])];
        if(slots.length>=2){
          mark(parent,'justtrakt-poster-grid');
          for(const slot of slots){
            mark(slot,'justtrakt-grid-slot');
            for(const media of candidates.has(slot)?[slot]:slot.querySelectorAll('.trakt-card')){
              if(!candidates.has(media))continue;
              grouped.add(media);
              for(let wrapper=media.parentElement;wrapper&&wrapper!==parent&&wrapper!==slot;wrapper=wrapper.parentElement)mark(wrapper,'justtrakt-grid-wrapper');
            }
          }
          break;
        }
        if(parent===root||parent.matches('section,aside'))break;
      }
    }
    // Native circular controls can sit halfway outside the old horizontal cover.
    // Bring only clipped controls inside the poster, preserving their handlers.
    for(const card of cards){
      const bounds=card.getBoundingClientRect();if(!bounds.width||!bounds.height)continue;
      for(const control of card.querySelectorAll('button,[role=button],a[aria-label],a[title]')){
        if(control.closest('.justtrakt-trakt-tools'))continue;
        const box=control.getBoundingClientRect();
        if(box.width>0&&box.width<=48&&box.height>0&&box.height<=48&&box.top<bounds.top&&box.bottom>bounds.top)mark(control,'justtrakt-grid-floating-control');
      }
    }
  }
  function schedule(){if(!timer)timer=setTimeout(scan,100);}
  chrome.storage.local.get('settings').then(value=>{enabled=value.settings?.traktPosterGrid===true;schedule();}).catch(()=>{});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.settings){enabled=changes.settings.newValue?.traktPosterGrid===true;schedule();}});
  new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.matches?.('.justtrakt-trakt-filterbar'))||m.type==='attributes'||[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&!n.matches?.('.justtrakt-trakt-dock,.justtrakt-trakt-date,.justtrakt-trakt-info,.justtrakt-trakt-tools,.justtrakt-trakt-filterbar,.justtrakt-grid-toolbar,.justtrakt-grid-toggle')&&!m.target.closest?.('.justtrakt-trakt-dock,.justtrakt-trakt-tools,.justtrakt-trakt-filterbar,.justtrakt-grid-toolbar'))))schedule();}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['href','src']});
  window.addEventListener('popstate',schedule);document.addEventListener('DOMContentLoaded',schedule,{once:true});
})();
