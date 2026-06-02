/* ============================================================
   META — aba de Criativos (Meta Ads). Busca no proxy /api/meta.
   ============================================================ */
window.Meta = (function () {
  let last = null;

  async function load(slug, range) {
    try {
      const r = range || {};
      const u = `/api/meta?cliente=${encodeURIComponent(slug)}${r.from?`&from=${r.from}`:''}${r.to?`&to=${r.to}`:''}`;
      const resp = await fetch(u, { cache: 'no-store' });
      last = await resp.json();
      return last;
    } catch (e) { last = { configured: false, reason: e.message }; return last; }
  }

  const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  const isActive = s => String(s).toUpperCase() === 'ACTIVE';

  function summaryCard(label, value, accent) {
    return `<div class="kpi-card${accent?' accent':''}"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div></div>`;
  }

  function card(c) {
    const metric = (lb, val, cls) => `<div class="cr-metric"><span class="cr-mlabel">${lb}</span><span class="cr-mval ${cls||''}">${val}</span></div>`;
    return `<div class="creative-card">
      <div class="cr-thumb">
        ${c.thumb ? `<img src="${c.thumb}" alt="" loading="lazy" onerror="this.style.display='none';this.parentNode.classList.add('cr-noimg')">` : ''}
        ${c.isVideo ? `<span class="cr-play">${PLAY}</span>` : ''}
        <span class="cr-status ${isActive(c.status)?'on':'off'}">${isActive(c.status)?'Ativo':'Pausado'}</span>
      </div>
      <div class="cr-body">
        <div class="cr-name" title="${c.name}">${c.name}</div>
        <div class="cr-metrics">
          ${metric('Investimento', Utils.brl(c.spend))}
          ${metric('Conversões', Utils.num(c.conversions), 'accent')}
          ${metric('CPL', c.conversions>0?Utils.brl(c.cpl):'—')}
          ${metric('Cliques', Utils.num(c.clicks))}
          ${metric('CTR', Utils.pct(c.ctr))}
          ${metric('Impressões', Utils.num(c.impressions))}
        </div>
      </div>
    </div>`;
  }

  function render(data, statusFilter) {
    const stateEl = document.getElementById('metaState');
    const sumEl = document.getElementById('metaSummary');
    const filtersEl = document.getElementById('metaFilters');
    const gridEl = document.getElementById('creativeGrid');

    if (!data || data.configured === false) {
      stateEl.className = 'meta-state show';
      stateEl.innerHTML = `🔵 Aba de criativos ainda não configurada para este cliente.<br><span class="meta-state-sub">${(data&&data.reason)||''}</span>`;
      sumEl.innerHTML = ''; filtersEl.style.display = 'none'; gridEl.innerHTML = ''; return;
    }
    if (data.error) {
      stateEl.className = 'meta-state show err';
      stateEl.innerHTML = `🟡 Não consegui buscar os criativos.<br><span class="meta-state-sub">${data.error}${data.hint?' — '+data.hint:''}</span>`;
      sumEl.innerHTML = ''; filtersEl.style.display = 'none'; gridEl.innerHTML = ''; return;
    }
    stateEl.className = 'meta-state'; filtersEl.style.display = 'flex';

    const s = data.summary || { count:0, spend:0, conversions:0, cpl:0 };
    sumEl.innerHTML = summaryCard('Criativos', Utils.num(s.count)) + summaryCard('Investimento', Utils.brl(s.spend))
      + summaryCard('Conversões', Utils.num(s.conversions), true) + summaryCard('CPL médio', s.conversions>0?Utils.brl(s.cpl):'—');

    const all = data.creatives || [];
    const actives = all.filter(c => isActive(c.status)).length;
    document.getElementById('cntAll').textContent = all.length;
    document.getElementById('cntActive').textContent = actives;
    document.getElementById('cntPaused').textContent = all.length - actives;

    let list = all;
    if (statusFilter === 'active') list = all.filter(c => isActive(c.status));
    else if (statusFilter === 'paused') list = all.filter(c => !isActive(c.status));

    gridEl.innerHTML = list.length ? list.map(card).join('') : '<div class="meta-state show">Nenhum criativo neste filtro.</div>';
  }

  return { load, render, getLast: () => last };
})();
