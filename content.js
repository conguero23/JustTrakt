(() => {
  const metadata = new Map();
  let timer, running = false, again = false;
  const pathOf = url => { try { return new URL(url, location.origin).pathname.replace(/\/$/, ''); } catch { return ''; } };
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'justtrakt:metadata' || !Array.isArray(event.data.items)) return;
    for (const item of event.data.items.slice(0, 20000)) if (typeof item.path === 'string') metadata.set(pathOf(item.path), item);
    schedule();
  });
  // A bounded delay prevents continuous page updates from postponing badges forever.
  function schedule() { if (!timer) timer = setTimeout(() => { timer = null; scan(); }, 80); }
  async function scan() {
    if (running) { again = true; return; } running = true;
    try {
      const candidates = [];
      for (const anchor of document.querySelectorAll('a[href*="/movie/"],a[href*="/tv-show/"]')) {
        const path = pathOf(anchor.href);
        if (!/\/(movie|tv-show)\/[^/]+$/.test(path) || !anchor.querySelector('img')) continue;
        candidates.push({ host: anchor, path });
      }
      // Detail page hero posters have no title link.
      const detail = document.querySelector('.title-sidebar .title-poster, .title-detail-hero .picture-comp, .title-block .picture-comp');
      if (detail && /\/(movie|tv-show)\/[^/]+$/.test(location.pathname)) candidates.push({ host: detail, path: pathOf(location.href) });
      for (let start = 0; start < candidates.length; start += 500) {
        const batch = candidates.slice(start, start + 500);
        const items = batch.map(({ host, path }) => {
          const known = metadata.get(path);
          if (known) return known;
          const img = host.querySelector('img'), text = host.textContent || '';
          const year = text.match(/\b(19\d{2}|20\d{2})\b/)?.[1];
          return { type: path.includes('/tv-show/') ? 'show' : 'movie', title: (img?.alt || '').replace(/\s*\(\d{4}\)$/, ''), year: year ? Number(year) : undefined };
        });
        const response = await chrome.runtime.sendMessage({ type: 'match', items });
        if (!response?.ok) continue;
        batch.forEach(({ host, path }, i) => {
          if (!host.isConnected) return;
          if (host.tagName === 'A' && pathOf(host.href) !== path) { schedule(); return; }
          let status = response.statuses[i];
          const card=host.closest('.title-list-grid__item,[data-testid="titleItem"]') || (!/\/(movie|tv-show)\/[^/]+$/.test(location.pathname) ? host:null);
          if(card)card.classList.toggle('justtrakt-filtered',!!status && status.kind==='watched' && response.settings.hideWatched===true);
          let diagnostic=host.querySelector(':scope > .justtrakt-diagnostic');
          if(response.settings.showDiagnostics && !status) {
            if(!diagnostic){diagnostic=document.createElement('span');diagnostic.className='justtrakt-diagnostic';diagnostic.textContent='?';host.append(diagnostic);}
            diagnostic.title=response.diagnostics?.[i] || 'Open the title page to check matching.';
            if(!host.classList.contains('justtrakt-host'))host.classList.add('justtrakt-host');
          }else diagnostic?.remove();
          if (status?.kind === 'progress' && !response.settings.showProgress) status = null;
          const signature = JSON.stringify([status, response.settings.dimWatched]);
          const existing = host.querySelector(':scope > .justtrakt-badge');
          const dimmed = !!status && status.kind === 'watched' && response.settings.dimWatched;
          // Vue may remove our child or reset classes while retaining the dataset.
          if (host.dataset.justtrakt === signature && !!existing === !!status && !!host.querySelector(':scope > .justtrakt-last-watched')===!!status?.dateLabel && host.classList.contains('justtrakt-dim') === dimmed && (!status || host.classList.contains('justtrakt-host'))) return;
          host.dataset.justtrakt = signature;
          host.querySelector(':scope > .justtrakt-badge')?.remove();
          host.querySelector(':scope > .justtrakt-last-watched')?.remove();
          host.classList.toggle('justtrakt-dim', dimmed);
          if (!status) return;
          host.classList.add('justtrakt-host');
          const badge = document.createElement('span'); badge.className = `justtrakt-badge justtrakt-${status.kind}`;
          badge.textContent = status.label; badge.title = `Trakt · ${status.tooltip}`; badge.setAttribute('aria-label', badge.title);
          if (status.kind === 'progress') { const bar = document.createElement('i'); bar.style.width = `${Math.max(0, Math.min(100, status.percent))}%`; badge.append(bar); }
          host.append(badge);
          if(status.dateLabel){const date=document.createElement('span');date.className='justtrakt-last-watched';date.textContent=status.dateLabel;host.append(date);}
        });
      }
      const hidden=document.querySelectorAll('.justtrakt-filtered').length;
      let filter=document.querySelector('.justtrakt-filter-note');
      if(hidden) {
        if(!filter){filter=document.createElement('button');filter.type='button';filter.className='justtrakt-filter-note';filter.onclick=async()=>{try{await chrome.runtime.sendMessage({type:'showAll'});}catch{}};document.body?.append(filter);}
        const text=`${hidden} watched title${hidden===1?'':'s'} hidden · Show all`;
        if(filter.textContent!==text)filter.textContent=text;
      }else filter?.remove();
    } catch { /* Extension reloads invalidate old content-script contexts. */ }
    finally { running = false; if (again) { again = false; schedule(); } }
  }
  const observer = new MutationObserver(mutations => {
    // Ignore our badge insertions, but repair badges removed by page hydration.
    if (mutations.some(m => m.type === 'attributes' || m.removedNodes.length || [...m.addedNodes].some(n => !(n instanceof Element && n.classList.contains('justtrakt-badge'))))) schedule();
  });
  observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['href','src','alt','class'] });
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.index || changes.settings)) schedule(); });
  window.postMessage({ source: 'justtrakt:request' }, location.origin);
  document.addEventListener('DOMContentLoaded', schedule, { once: true }); schedule();
})();
