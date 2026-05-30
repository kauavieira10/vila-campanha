/* ============================================================
   MAIN (v3) — bootstrap, abas, filtros, KPIs, refresh, feedback
   ============================================================ */
(function () {
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const State = { full: null, period: 'mes', view: 'overview' };

  // ---------- Toast ----------
  function toast(title, msg, isError) {
    const zone = document.getElementById('toastZone');
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' error' : '');
    el.innerHTML = `<div class="toast-title">${title}</div>${msg ? `<div class="toast-msg">${msg}</div>` : ''}`;
    zone.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; el.style.transition = 'all .3s'; setTimeout(() => el.remove(), 300); }, 3000);
  }

  // ---------- Filtro de período (sem mutar o full!) ----------
  function filtered() {
    const data = Utils.clone(State.full);
    if (State.period === '7d')  data.rows = data.rows.slice(-7);
    if (State.period === '14d') data.rows = data.rows.slice(-14);
    return data;
  }

  // ---------- Barra de contexto ----------
  function periodLabel(rows) {
    if (!rows.length) return '—';
    const a = rows[0].date.split('-'), b = rows[rows.length - 1].date.split('-');
    return `${a[2]} a ${b[2]} de ${MESES[Number(a[1]) - 1]}`;
  }

  function updateContext(view) {
    const src = State.full.source;
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (src === 'live')      { dot.className = 'status-dot live';    txt.textContent = 'Ao vivo'; }
    else if (src === 'demo') { dot.className = 'status-dot demo';    txt.textContent = 'Demonstração'; }
    else                     { dot.className = 'status-dot offline'; txt.textContent = 'Offline'; }

    document.getElementById('ctxPeriod').textContent = periodLabel(view.rows);

    const lastRef = State.full.rows.length ? State.full.rows[State.full.rows.length - 1].refPct : 0;
    document.getElementById('ctxMesPct').textContent = Utils.pct(lastRef, 0);
    document.getElementById('ctxMesBar').style.width = Math.min(100, lastRef) + '%';

    const t = State.full.fetchedAt instanceof Date ? State.full.fetchedAt : new Date(State.full.fetchedAt);
    document.getElementById('ctxUpdated').textContent = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const banner = document.getElementById('banner');
    banner.className = 'banner';
    if (src === 'demo')   { banner.className = 'banner demo show';   banner.innerHTML = '🔵 Modo demonstração — exibindo dados de exemplo de Maio. Conecte a API (Render/Netlify) para dados ao vivo.'; }
    else if (src === 'offline') { banner.className = 'banner offline show'; banner.innerHTML = '🟡 Modo offline — não consegui falar com o Google Sheets agora. Mostrando os últimos dados de exemplo.'; }

    document.getElementById('footerDate').textContent = t.toLocaleDateString('pt-BR');

    if (State.full.meta && State.full.meta.mesRef) document.getElementById('headerMonth').textContent = State.full.meta.mesRef;
  }

  // ---------- Render geral ----------
  function renderOverview() {
    const view = filtered();
    Kpis.render(view, State.period, State.full.meta, CONFIG.diasNoMes);
    Charts.render(view);
    Table.render(view);
    updateContext(view);
  }
  function renderPeriod() { Period.render(State.full); }

  function renderAll() {
    renderOverview();
    renderPeriod();
  }

  // repaint global (tema) — gráficos da visão geral + por período
  window.__repaint = function () {
    if (!State.full) return;
    Charts.repaintAll();
    Period.render(State.full);
  };

  // ---------- Abas ----------
  function setView(v) {
    State.view = v;
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('is-active', b.dataset.view === v));
    document.getElementById('viewOverview').classList.toggle('is-active', v === 'overview');
    document.getElementById('viewPeriod').classList.toggle('is-active', v === 'period');
    // filtro de período só faz sentido na visão geral
    document.querySelector('.segmented').style.visibility = (v === 'overview') ? 'visible' : 'hidden';
    if (v === 'period') renderPeriod();
  }

  // ---------- Carregar dados ----------
  async function loadData({ force = false, silent = false } = {}) {
    const overlay = document.getElementById('loadingOverlay');
    if (!silent) overlay.classList.add('show');
    try {
      State.full = await Sheets.load({ force });
      renderAll();
      if (force) {
        if (State.full.source === 'live') toast('Dados atualizados', 'Leitura ao vivo do Google Sheets');
        else toast('Atualizado', State.full.source === 'demo' ? 'Usando dados de exemplo' : 'Sem conexão — dados de exemplo', State.full.source === 'offline');
      }
    } catch (err) {
      toast('Erro ao carregar', err.message, true);
    } finally {
      overlay.classList.remove('show');
    }
  }

  // ---------- Eventos ----------
  function wire() {
    document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => setView(btn.dataset.view)));

    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        State.period = btn.dataset.period;
        renderOverview();
      });
    });

    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', async () => {
      const ic = refreshBtn.querySelector('svg');
      ic.classList.add('spin');
      Sheets.clearCache();
      await loadData({ force: true, silent: true });
      ic.classList.remove('spin');
    });

    document.getElementById('reportBtn').addEventListener('click', () => { Report.fromData(filtered()); toast('Relatório exportado', 'Arquivo CSV gerado'); });
    document.getElementById('tableCsvBtn').addEventListener('click', () => { Report.fromData(filtered()); });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('headerName').textContent = CONFIG.empreendimento;
    Theme.init();
    wire();
    loadData();
  });
})();
