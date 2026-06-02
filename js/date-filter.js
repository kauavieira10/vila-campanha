/* ============================================================
   DATE-FILTER — seletor de período com calendário (portal pattern)
   Popup vira filho do <body> (escapa dos stacking contexts do glass).
   ============================================================ */
window.DateFilter = (function () {
  const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const MESFULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let S = { min:null, max:null, from:null, to:null, view:null, pick:null, onApply:null, btn:null, pop:null };

  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const parse = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
  const same = (a,b) => fmt(a)===fmt(b);
  const clamp = d => d < S.min ? new Date(S.min) : (d > S.max ? new Date(S.max) : d);

  function labelText() {
    if (!S.from || !S.to) return 'Período';
    const f = parse(S.from), t = parse(S.to);
    if (S.from === S.to) return `${f.getDate()} ${MES[f.getMonth()]}`;
    return `${f.getDate()} ${MES[f.getMonth()]} – ${t.getDate()} ${MES[t.getMonth()]}`;
  }
  function syncBtn() { const el = S.btn && S.btn.querySelector('.df-label'); if (el) el.textContent = labelText(); }

  function setRange(from, to, fire) {
    S.from = from; S.to = to; syncBtn();
    if (fire && S.onApply) S.onApply({ from, to });
  }

  function preset(kind) {
    const max = new Date(S.max), min = new Date(S.min);
    const minus = n => clamp(new Date(max.getFullYear(), max.getMonth(), max.getDate()-n));
    let from, to = new Date(max);
    if (kind==='hoje')      from = new Date(max);
    else if (kind==='ontem'){ from = minus(1); to = minus(1); }
    else if (kind==='7')    from = minus(6);
    else if (kind==='14')   from = minus(13);
    else if (kind==='30')   from = minus(29);
    else                    { from = new Date(min); to = new Date(max); } // mês todo
    setRange(fmt(from), fmt(to), true);
    close();
  }

  function buildGrid() {
    const y = S.view.getFullYear(), m = S.view.getMonth();
    const first = new Date(y, m, 1), startDow = first.getDay(), days = new Date(y, m+1, 0).getDate();
    let html = '';
    ['D','S','T','Q','Q','S','S'].forEach(d => html += `<span class="df-dow">${d}</span>`);
    for (let i=0;i<startDow;i++) html += `<span></span>`;
    const f = S.from && parse(S.from), t = S.to && parse(S.to);
    for (let d=1; d<=days; d++) {
      const cur = new Date(y, m, d), iso = fmt(cur);
      const disabled = cur < S.min || cur > S.max;
      let cls = 'df-day';
      if (disabled) cls += ' df-off';
      if (f && t && cur >= f && cur <= t) cls += ' df-in';
      if ((f && same(cur,f)) || (t && same(cur,t))) cls += ' df-edge';
      html += `<button class="${cls}" data-iso="${iso}" ${disabled?'disabled':''}>${d}</button>`;
    }
    return html;
  }
  function header() {
    const canPrev = new Date(S.view.getFullYear(), S.view.getMonth(), 1) > S.min;
    const canNext = new Date(S.view.getFullYear(), S.view.getMonth()+1, 1) <= S.max;
    return `<button class="df-nav" data-nav="-1" ${canPrev?'':'disabled'}>‹</button>
      <span class="df-title">${MESFULL[S.view.getMonth()]} ${S.view.getFullYear()}</span>
      <button class="df-nav" data-nav="1" ${canNext?'':'disabled'}>›</button>`;
  }
  function render() {
    S.pop.innerHTML = `
      <div class="df-presets">
        <button data-preset="hoje">Hoje</button><button data-preset="ontem">Ontem</button>
        <button data-preset="7">7 dias</button><button data-preset="14">14 dias</button>
        <button data-preset="30">30 dias</button><button data-preset="all">Mês todo</button>
      </div>
      <div class="df-cal-head">${header()}</div>
      <div class="df-grid">${buildGrid()}</div>
      <div class="df-foot"><span class="df-hint">${S.pick ? 'Escolha a data final' : 'Clique para definir o período'}</span>
      <button class="df-apply">Aplicar</button></div>`;
  }

  function position() {
    const r = S.btn.getBoundingClientRect();
    const pw = 300, ph = S.pop.offsetHeight || 360;
    let top = r.bottom + 8, left = Math.min(r.left, window.innerWidth - pw - 12);
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
    S.pop.style.top = top + 'px'; S.pop.style.left = Math.max(8,left) + 'px';
  }

  function onDocClick(e){ if (S.pop && !S.pop.contains(e.target) && !S.btn.contains(e.target)) close(); }
  function onKey(e){ if (e.key === 'Escape') close(); }
  function onScroll(){ close(); }

  function open() {
    close();
    S.pick = null;
    S.view = parse(S.from || fmt(S.max));
    S.pop = document.createElement('div');
    S.pop.className = 'df-pop';
    document.body.appendChild(S.pop);
    render(); position();
    S.pop.addEventListener('click', (e) => {
      e.stopPropagation();
      const day = e.target.closest('.df-day');
      const nav = e.target.closest('[data-nav]');
      const pre = e.target.closest('[data-preset]');
      const apply = e.target.closest('.df-apply');
      if (nav) { S.view = new Date(S.view.getFullYear(), S.view.getMonth()+Number(nav.dataset.nav), 1); render(); return; }
      if (pre) { const p = pre.dataset.preset; preset(p==='all'?'all':p); return; }
      if (apply) { if (S.from && S.to) setRange(S.from, S.to, true); close(); return; }
      if (day && !day.disabled) {
        const iso = day.dataset.iso;
        if (!S.pick) { S.from = iso; S.to = iso; S.pick = true; }
        else {
          if (parse(iso) < parse(S.from)) { S.to = S.from; S.from = iso; } else { S.to = iso; }
          S.pick = false;
        }
        render();
      }
    });
    setTimeout(() => { document.addEventListener('click', onDocClick); document.addEventListener('keydown', onKey); window.addEventListener('scroll', onScroll, true); }, 0);
  }
  function close() {
    if (S.pop) { S.pop.remove(); S.pop = null; }
    document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, true);
  }

  function setBounds(min, max, from, to) {
    S.min = parse(min); S.max = parse(max);
    S.from = from || min; S.to = to || max; syncBtn();
  }

  function mount(btn, { min, max, from, to, onApply }) {
    S.btn = btn; S.onApply = onApply;
    setBounds(min, max, from, to);
    btn.addEventListener('click', (e) => { e.stopPropagation(); if (S.pop) close(); else open(); });
  }

  return { mount, setBounds, setRange, getRange: () => ({ from: S.from, to: S.to }) };
})();
