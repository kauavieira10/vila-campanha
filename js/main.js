/* ============================================================
   MAIN (multi-cliente) — cliente por URL, abas, calendário,
   KPIs, criativos Meta, refresh, feedback.
   ============================================================ */
(function () {
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const State = { full:null, range:null, view:'overview', slug:null, metaStatus:'all', dfMounted:false, metaLoadedFor:null };
  const qs = new URLSearchParams(location.search);

  function toast(title, msg, isError) {
    const zone = document.getElementById('toastZone');
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' error' : '');
    el.innerHTML = `<div class="toast-title">${title}</div>${msg ? `<div class="toast-msg">${msg}</div>` : ''}`;
    zone.appendChild(el);
    setTimeout(() => { el.style.opacity='0'; el.style.transform='translateX(20px)'; el.style.transition='all .3s'; setTimeout(()=>el.remove(),300); }, 3000);
  }

  function rowsInRange(rows) {
    if (!State.range) return rows;
    return rows.filter(r => r.date >= State.range.from && r.date <= State.range.to);
  }
  function daysInRange() {
    if (!State.range) return State.full.diasNoMes;
    return Math.round((new Date(State.range.to) - new Date(State.range.from)) / 864e5) + 1;
  }
  function filtered() { const d = Utils.clone(State.full); d.rows = rowsInRange(d.rows); return d; }

  function periodLabel(rows) {
    if (!rows.length) return '—';
    const a = rows[0].date.split('-'), b = rows[rows.length-1].date.split('-');
    return `${a[2]} a ${b[2]} de ${MESES[Number(a[1])-1]}`;
  }
  function updateContext(view) {
    const src = State.full.source;
    const dot = document.getElementById('statusDot'), txt = document.getElementById('statusText');
    if (src==='live'){ dot.className='status-dot live'; txt.textContent='Ao vivo'; }
    else if (src==='demo'){ dot.className='status-dot demo'; txt.textContent='Demonstração'; }
    else { dot.className='status-dot offline'; txt.textContent='Offline'; }
    document.getElementById('ctxPeriod').textContent = periodLabel(view.rows);
    const lastRef = State.full.rows.length ? State.full.rows[State.full.rows.length-1].refPct : 0;
    document.getElementById('ctxMesPct').textContent = Utils.pct(lastRef, 0);
    document.getElementById('ctxMesBar').style.width = Math.min(100,lastRef)+'%';
    const t = State.full.fetchedAt instanceof Date ? State.full.fetchedAt : new Date(State.full.fetchedAt);
    document.getElementById('ctxUpdated').textContent = t.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const banner = document.getElementById('banner'); banner.className = 'banner';
    if (src==='demo'){ banner.className='banner demo show'; banner.innerHTML='🔵 Modo demonstração — dados de exemplo. Configure a API e a planilha de controle para dados ao vivo.'; }
    else if (src==='offline'){ banner.className='banner offline show'; banner.innerHTML='🟡 Modo offline — não consegui ler os dados agora. Mostrando dados de exemplo.'; }
    document.getElementById('footerDate').textContent = t.toLocaleDateString('pt-BR');
  }

  function renderOverview() {
    const view = filtered();
    Kpis.render(view, daysInRange(), State.full.meta, State.full.diasNoMes);
    Charts.render(view); Table.render(view); updateContext(view);
  }
  function renderPeriod() { Period.render(State.full); }
  function renderAll() { renderOverview(); renderPeriod(); }
  window.__repaint = function () { if (!State.full) return; Charts.repaintAll(); Period.render(State.full); };

  function setupDateFilter() {
    const rows = State.full.rows; if (!rows.length) return;
    const min = rows[0].date, max = rows[rows.length-1].date;
    const onApply = ({from,to}) => { State.range = {from,to}; renderOverview(); if (State.view==='creatives') loadCreatives(true); };
    if (!State.dfMounted) { DateFilter.mount(document.getElementById('dateFilterBtn'), {min,max,from:State.range.from,to:State.range.to,onApply}); State.dfMounted = true; }
    else DateFilter.setBounds(min, max, State.range.from, State.range.to);
  }

  function setView(v) {
    State.view = v;
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('is-active', b.dataset.view === v));
    document.getElementById('viewOverview').classList.toggle('is-active', v==='overview');
    document.getElementById('viewPeriod').classList.toggle('is-active', v==='period');
    document.getElementById('viewCreatives').classList.toggle('is-active', v==='creatives');
    if (v==='period') renderPeriod();
    if (v==='creatives') loadCreatives();
  }

  async function loadCreatives(force) {
    const key = State.slug + '|' + (State.range ? State.range.from+State.range.to : '');
    if (!force && State.metaLoadedFor === key) { Meta.render(Meta.getLast(), State.metaStatus); return; }
    if (State.slug === 'demo') { Meta.render({ configured:false, reason:'Modo demonstração — conecte o Meta para ver criativos reais.' }, State.metaStatus); return; }
    document.getElementById('metaState').className = 'meta-state show';
    document.getElementById('metaState').textContent = 'Carregando criativos…';
    const data = await Meta.load(State.slug, State.range);
    State.metaLoadedFor = key;
    Meta.render(data, State.metaStatus);
  }

  function setHeaderName(name) { document.getElementById('headerName').textContent = name || 'Dashboard'; }

  async function loadClient(slug, { force=false, silent=false } = {}) {
    const overlay = document.getElementById('loadingOverlay');
    if (!silent) overlay.classList.add('show');
    try {
      State.slug = slug;
      State.full = await Sheets.load(slug, { force });
      const rows = State.full.rows;
      State.range = rows.length ? { from: rows[0].date, to: rows[rows.length-1].date } : null;
      State.metaLoadedFor = null;
      if (State.full.nome) setHeaderName(State.full.nome);
      setupDateFilter();
      renderAll();
      if (State.view === 'creatives') loadCreatives(true);
      if (force) {
        if (State.full.source==='live') toast('Dados atualizados','Leitura ao vivo do Google Sheets');
        else toast('Atualizado', State.full.source==='demo'?'Usando dados de exemplo':'Sem conexão — dados de exemplo', State.full.source==='offline');
      }
    } catch (err) { toast('Erro ao carregar', err.message, true); }
    finally { overlay.classList.remove('show'); }
  }

  async function showPicker() {
    document.getElementById('dashboardRoot').style.display = 'none';
    const picker = document.getElementById('picker'); picker.style.display = 'block';
    const list = document.getElementById('pickerList');
    list.innerHTML = '<div class="picker-empty">Carregando clientes…</div>';
    const res = await Sheets.listClients();
    if (!res.ok) { list.innerHTML = `<div class="picker-empty">Não consegui ler a lista de clientes.${res.missing?' Faltam variáveis: '+res.missing.join(', ')+'.':''}<br><br>Você pode ver uma <a href="?cliente=demo">demonstração</a>.</div>`; return; }
    if (!res.clients.length) { list.innerHTML = '<div class="picker-empty">Nenhum cliente na planilha de controle ainda.</div>'; return; }
    const render = (items) => { list.innerHTML = items.map(c => `<a class="picker-item" href="?cliente=${encodeURIComponent(c.slug)}"><span class="picker-name">${c.nome}</span><span class="picker-meta">${c.mesRef||''} <span class="picker-arrow">→</span></span></a>`).join(''); };
    render(res.clients);
    const search = document.getElementById('pickerSearch');
    search.addEventListener('input', () => { const q = search.value.toLowerCase(); render(res.clients.filter(c => c.nome.toLowerCase().includes(q) || c.slug.includes(q))); });
    document.getElementById('pickerCount').textContent = `${res.clients.length} cliente${res.clients.length>1?'s':''}`;
  }

  function wireDashboard() {
    document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));
    document.querySelectorAll('[data-mstatus]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mstatus]').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active'); State.metaStatus = btn.dataset.mstatus;
      Meta.render(Meta.getLast(), State.metaStatus);
    }));
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', async () => {
      const ic = refreshBtn.querySelector('svg'); ic.classList.add('spin');
      Sheets.clearCache(State.slug);
      await loadClient(State.slug, { force:true, silent:true });
      ic.classList.remove('spin');
    });
    document.getElementById('reportBtn').addEventListener('click', () => { Report.fromData(filtered(), State.full.nome); toast('Relatório exportado','Arquivo CSV gerado'); });
    document.getElementById('tableCsvBtn').addEventListener('click', () => Report.fromData(filtered(), State.full.nome));
    const back = document.getElementById('backBtn');
    if (back) back.addEventListener('click', (e) => { e.preventDefault(); location.search=''; });
  }

  document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    const slug = (qs.get('cliente')||'').trim().toLowerCase();
    if (!slug) { showPicker(); return; }
    if (slug === 'demo') document.getElementById('backBtn').style.display = '';
    wireDashboard();
    loadClient(slug);
  });
})();
