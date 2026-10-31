(() => {
  const metadata = new Map(), ratings = new Map(), memberships = new Map();
  const ratingNodes = new WeakMap();
  let timer, activePath;
  const pathOf = value => { try { const p = new URL(value, location.origin).pathname.replace(/\/$/,''); return /\/(movie|tv-show)\/[^/]+$/.test(p) ? p : null; } catch { return null; } };
  const schedule = () => { if (!timer) timer = setTimeout(() => { timer = null; scan(); }, 100); };
  window.addEventListener('message', e => {
    if (e.source !== window || e.origin !== location.origin || e.data?.source !== 'justtrakt:metadata' || !Array.isArray(e.data.items)) return;
    for (const item of e.data.items) if (pathOf(item.path)) metadata.set(pathOf(item.path), item);
    schedule();
  });
  document.addEventListener('pointerover', e => {
    const card = e.target.closest?.('.title-list-grid__item, [data-testid="titleItem"]');
    const link = e.target.closest?.('a[href]') || card?.querySelector('a[href*="/movie/"],a[href*="/tv-show/"]');
    if (link && pathOf(link.href)) activePath = pathOf(link.href);
    schedule();
  }, true);
  function context(node) {
    const detailPath=pathOf(location.href);
    if (detailPath && node.closest('.title-detail-hero,.title-sidebar,.poster-detail-infos') && !node.closest('.title-list-grid__item,[data-testid="titleItem"],.popover,[class*="hover-card"]')) {
      return descriptor(detailPath,document.querySelector('.title-detail-hero__details') || document.body);
    }
    for (let el = node; el && !el.matches('main,body,html'); el = el.parentElement) {
      const paths = new Set([...el.querySelectorAll('a[href*="/movie/"],a[href*="/tv-show/"]')].map(a=>pathOf(a.href)).filter(Boolean));
      if (el.matches('a[href]') && pathOf(el.href)) paths.add(pathOf(el.href));
      if (paths.size === 1) return descriptor([...paths][0], el);
      if (paths.size > 1) return null;
    }
    if (node.closest('[role="tooltip"],.popover,[class*="hover-card"], [class*="title-preview"]') && activePath) return descriptor(activePath, node.parentElement);
    const path = pathOf(location.href);
    return path ? descriptor(path, document.querySelector('main') || document.body) : null;
  }
  function descriptor(path, root) {
    const item = metadata.get(path);
    if (item?.imdb || item?.tmdb || (item?.title && item?.year)) return {...item,path};
    const title = item?.title || root.getAttribute('data-title') || root.querySelector('h1')?.textContent.replace(/\s*\(\d{4}\)\s*$/,'').trim() || root.querySelector('img[alt]')?.alt || root.querySelector('h2,h3')?.textContent;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), parts = [];
    while (walker.nextNode()) parts.push(walker.currentNode.textContent);
    const year = item?.year || parts.join(' ').match(/\b(19\d{2}|20\d{2})\b/)?.[0];
    return title && year ? {path, type:path.includes('/tv-show/')?'show':'movie', title,year:Number(year)} : null;
  }
  async function send(type, item) {
    const result = await chrome.runtime.sendMessage({type,item});
    if (!result?.ok) throw new Error(result?.error || 'Trakt is unavailable.');
    return result;
  }
  function keyOf(item) { return JSON.stringify([item.path,item.imdb,item.tmdb,item.title,item.year]); }
  function rating(item) {
    const key = keyOf(item), cached = ratings.get(key);
    if (cached && cached.until > Date.now()) return cached.promise;
    const promise = send('titleDetail',item).then(r=>r.detail);
    ratings.set(key,{promise,until:Date.now()+86400000});
    promise.catch(()=>{ ratings.set(key,{promise,until:Date.now()+60000}); });
    return promise;
  }
  function showError(button, error) {
    button.title=error.message;
    let node=button.parentElement.querySelector('.justtrakt-action-error');
    if (!node) { node=document.createElement('span'); node.className='justtrakt-action-error'; node.setAttribute('role','status'); button.after(node); }
    node.textContent=error.message;
  }
  async function checkMembership(button, item, key) {
    button.disabled=true; button.textContent='Checking Trakt watchlist…';
    try {
      let cached=memberships.get(key);
      if (!cached || cached.until<Date.now()) {
        cached={promise:send('watchlistStatus',item),until:Date.now()+60000}; memberships.set(key,cached);
        cached.promise.catch(()=>memberships.delete(key));
      }
      const result=await cached.promise;
      if (!button.isConnected || button.dataset.key!==key || button.justtraktAdding) return;
      const saved=result.inWatchlist;
      button.justtraktNeedsCheck=false; button.disabled=false;button.justtraktSaved=saved;
      button.textContent=saved?'✓ In Trakt watchlist':'+ Add to Trakt watchlist';
      button.title=saved?'Remove this title from your Trakt watchlist':'Save this title to your Trakt watchlist';
      button.setAttribute('aria-label',button.title);
      button.parentElement.querySelector('.justtrakt-action-error')?.remove();
    } catch(error) {
      if (button.dataset.key!==key) return;
      button.justtraktNeedsCheck=true; button.disabled=false;button.textContent='Retry watchlist check';showError(button,error);
    }
  }
  // Handle our action before JustWatch's card navigation handlers see the click.
  document.addEventListener('click', e=> {
    const button=e.target.closest?.('.justtrakt-watchlist');
    if (!button) return;
    e.preventDefault();e.stopImmediatePropagation();
    if (!button.disabled) button.justtraktRun?.();
  },true);
  function watchlist(original, item) {
    let button = original.nextElementSibling;
    const key = keyOf(item);
    if (!button?.classList.contains('justtrakt-watchlist')) {
      button = document.createElement('button'); button.type='button'; button.className='justtrakt-watchlist';
      original.after(button);
      button.justtraktRun = async () => {
        if (button.disabled) return;
        const selected = button.justtraktItem, selectedKey=keyOf(selected);
        if (button.justtraktNeedsCheck) { await checkMembership(button,selected,selectedKey);return; }
        button.justtraktAdding=true;
        const removing=button.justtraktSaved;
        button.disabled=true; button.textContent=removing?'Removing from Trakt…':'Adding to Trakt…';
        try {
          await send(removing?'removeWatchlist':'addWatchlist',selected);
          memberships.set(selectedKey,{promise:Promise.resolve({inWatchlist:!removing}),until:Date.now()+60000});
          if (keyOf(button.justtraktItem) === selectedKey) { button.justtraktSaved=!removing;button.disabled=false;button.textContent=removing?'+ Add to Trakt watchlist':'✓ In Trakt watchlist';button.title=removing?'Save this title to your Trakt watchlist':'Remove this title from your Trakt watchlist';button.setAttribute('aria-label',button.title);button.parentElement.querySelector('.justtrakt-action-error')?.remove(); }
        } catch(error) {
          if (keyOf(button.justtraktItem) === selectedKey) { button.textContent='Retry Trakt watchlist'; button.title=error.message; button.disabled=false;
            showError(button,error);
          }
        }
        finally { button.justtraktAdding=false; }
      };
    }
    if (button.dataset.key !== key) {
      button.dataset.key=key; button.justtraktItem=item;
      button.justtraktNeedsCheck=true;
      checkMembership(button,item,key);
      button.parentElement.querySelector('.justtrakt-action-error')?.remove();
    }
    if (!original.classList.contains('justtrakt-replaced')) original.classList.add('justtrakt-replaced');
  }
  function titleInfo(actions,item) {
    const key=keyOf(item);
    let panel=actions.querySelector('.justtrakt-title-info');
    if(panel?.dataset.key===key)return;
    panel?.remove();panel=document.createElement('div');panel.className='justtrakt-title-info';panel.dataset.key=key;panel.textContent='Checking Trakt details…';actions.append(panel);
    send('titleInfo',item).then(({info})=>{
      if(!info || !panel.isConnected || panel.dataset.key!==key)return;
      panel.replaceChildren();
      const addLine=(text,cls)=>{const line=document.createElement('p');line.className=cls;line.textContent=text;panel.append(line);};
      if(info.lastWatched)addLine(info.lastWatched,'justtrakt-info-date');
      if(info.progress){
        const {next,remaining}=info.progress;
        const code=next ? `S${String(next.season).padStart(2,'0')}E${String(next.number).padStart(2,'0')}`:null;
        addLine(remaining===0?'Up to date with aired episodes':`${code ? `Next: ${code} · `:''}${remaining} aired episode${remaining===1?'':'s'} remaining`,'justtrakt-next-episode');
      }
      if(info.progressError)addLine(`Episode progress unavailable: ${info.progressError}`,'justtrakt-info-diagnostic');
      const diagnostic=document.createElement('details');diagnostic.className='justtrakt-info-diagnostic';const summary=document.createElement('summary');summary.textContent='Trakt matching details';diagnostic.append(summary);
      const text=document.createElement('p');text.textContent=info.diagnostic;diagnostic.append(text);panel.append(diagnostic);
    }).catch(error=>{if(panel.isConnected)panel.textContent=`Trakt matching: ${error.message}`;});
  }
  function scan() {
    const detailPath=pathOf(location.href), hero=document.querySelector('.title-detail-hero__details');
    if (detailPath && hero) {
      const item=descriptor(detailPath,hero);
      if (item) {
        let actions=hero.querySelector(':scope > .justtrakt-detail-actions');
        if (!actions) {
          actions=document.createElement('div');actions.className='justtrakt-detail-actions';
          const anchor=document.createElement('span');anchor.className='justtrakt-detail-anchor';anchor.hidden=true;
          actions.append(anchor);hero.append(actions);
        }
        watchlist(actions.querySelector('.justtrakt-detail-anchor'),item);
        titleInfo(actions,item);
      }
    } else document.querySelectorAll('.justtrakt-detail-actions').forEach(n=>n.remove());
    for (const original of document.querySelectorAll('.watch-now-button')) {
      if (original.closest('.offer-container')) continue;
      const item=context(original); if (item) watchlist(original,item);
      else { original.classList.remove('justtrakt-replaced'); if (original.nextElementSibling?.classList.contains('justtrakt-watchlist')) original.nextElementSibling.remove(); }
    }
    for (const row of document.querySelectorAll('.jw-scoring-listing,.title-detail-hero-details .hidden-horizontal-scrollbar__items')) {
      const item=context(row); if (!item) { row.querySelector('.justtrakt-rating')?.remove(); continue; }
      const key=keyOf(item);
      if (ratingNodes.get(row) === key && row.querySelector('.justtrakt-rating')) continue;
      ratingNodes.set(row,key); row.querySelector('.justtrakt-rating')?.remove();
      const label=document.createElement('a'); label.className='justtrakt-rating';label.target='_blank';label.rel='noopener noreferrer';label.setAttribute('aria-label','Open this title on Trakt');label.addEventListener('click',e=>e.stopPropagation());
      const logo=document.createElement('img'); logo.src=chrome.runtime.getURL('assets/trakt.svg');logo.alt='Trakt';logo.className='justtrakt-rating-logo';
      const score=document.createElement('span');score.textContent='…';label.append(logo,score);row.append(label);
      rating(item).then(detail=> {
        if (!label.isConnected || ratingNodes.get(row)!==key) return;
        if(detail.trakt)label.href=`https://trakt.tv/${item.type==='movie'?'movies':'shows'}/${detail.trakt}`;
        score.textContent=detail.votes>0 && detail.rating!==null ? `${Math.round(detail.rating*10)}%` : '—';
        label.title=`Trakt community rating · ${Number(detail.votes).toLocaleString()} votes`;
      }).catch(error=> { if(label.isConnected) {score.textContent='—';label.title=error.message;} });
    }
  }
  new MutationObserver(mutations=> {
    if (mutations.some(m=>m.type==='attributes' || m.removedNodes.length || [...m.addedNodes].some(n=>!(n.parentElement?.closest('[class^="justtrakt-"]') || n.nodeType===1 && n.className?.startsWith?.('justtrakt-'))))) schedule();
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['href']});
  chrome.storage.onChanged.addListener((changes,area)=>{
    if(area==='local' && changes.lastFullSync){document.querySelectorAll('.justtrakt-title-info').forEach(n=>n.remove());schedule();}
    if (area==='local' && (changes.tokens || changes.watchlistCache?.oldValue)) {
      memberships.clear();document.querySelectorAll('.justtrakt-watchlist').forEach(n=>{if(!n.justtraktAdding)n.dataset.key='';});
      if(changes.tokens) {ratings.clear();document.querySelectorAll('.justtrakt-rating').forEach(n=>n.remove());document.querySelectorAll('.justtrakt-title-info').forEach(n=>n.remove());}
      schedule();
    }
  });
  window.postMessage({source:'justtrakt:request'},location.origin);
  window.addEventListener('popstate',schedule);
  document.addEventListener('DOMContentLoaded',schedule,{once:true}); schedule();
})();
