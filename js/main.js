/* ============================================================
   MAIN — bootstrap, filtros, refresh, feedback
   ============================================================ */
(function () {
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const State = { full: null, period: 'mes' };

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
    const mesA = MESES[Number(a[1]) - 1];
    return `${a[2]} a ${b[2]} de ${mesA}`;
  }

  function updateContext(view) {
    const src = State.full.source;
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (src === 'live')   { dot.className = 'status-dot live';    txt.textContent = 'Ao vivo'; }
    else if (src === 'demo') { dot.className = 'status-dot demo';  txt.textContent = 'Demonstração'; }
    else { dot.className = 'status-dot offline'; txt.textContent = 'Offline'; }

    document.getElementById('ctxPeriod').textContent = periodLabel(view.rows);

    const lastRef = State.full.rows.length ? State.full.rows[State.full.rows.length - 1].refPct : 0;
    document.getElementById('ctxMesPct').textContent = Utils.pct(lastRef, 0);
    document.getElementById('ctxMesBar').style.width = Math.min(100, lastRef) + '%';

    const t = State.full.fetchedAt instanceof Date ? State.full.fetchedAt : new Date(State.full.fetchedAt);
    document.getElementById('ctxUpdated').textContent = t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // banner
    const banner = document.getElementById('banner');
    banner.className = 'banner';
    if (src === 'demo') { banner.className = 'banner demo show'; banner.innerHTML = '🔵 Modo demonstração — exibindo dados de exemplo de Maio. Conecte a API no Render para dados ao vivo.'; }
    else if (src === 'offline') { banner.className = 'banner offline show'; banner.innerHTML = '🟡 Modo offline — não consegui falar com o Google Sheets agora. Mostrando os últimos dados de exemplo.'; }

    document.getElementById('footerDate').textContent = t.toLocaleDateString('pt-BR');
  }

  // ---------- Render geral ----------
  function renderAll() {
    const view = filtered();
    Charts.render(view);
    Table.render(view);
    updateContext(view);
    document.querySelectorAll('.chart-card, .table-card').forEach((c, i) => {
      c.classList.remove('reveal'); void c.offsetWidth; c.classList.add('reveal');
    });
  }

  // ---------- Carregar dados ----------
  async function loadData({ force = false, silent = false } = {}) {
    const overlay = document.getElementById('loadingOverlay');
    if (!silent) overlay.classList.add('show');
    try {
      const data = await Sheets.load({ force });
      State.full = data;
      renderAll();
      if (force) {
        if (data.source === 'live') toast('Dados atualizados', 'Leitura ao vivo do Google Sheets');
        else toast('Atualizado', data.source === 'demo' ? 'Usando dados de exemplo' : 'Sem conexão — dados de exemplo', data.source === 'offline');
      }
    } catch (err) {
      toast('Erro ao carregar', err.message, true);
    } finally {
      overlay.classList.remove('show');
    }
  }

  // ---------- Eventos ----------
  function wire() {
    // período segmentado
    document.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        State.period = btn.dataset.period;
        renderAll();
      });
    });

    // refresh
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', async () => {
      const ic = refreshBtn.querySelector('svg');
      ic.classList.add('spin');
      Sheets.clearCache();
      await loadData({ force: true, silent: true });
      ic.classList.remove('spin');
    });

    // relatório CSV
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
