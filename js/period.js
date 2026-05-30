/* ============================================================
   PERIOD (v3) — aba "Por período": blocos por plataforma
   ============================================================ */
window.Period = (function () {
  let chart = null;

  function windowsOf(rows) {
    return {
      'Mensal': rows,
      '15 dias': rows.slice(-15),
      '7 dias': rows.slice(-7)
    };
  }

  function agg(rows, plat) {
    const v = plat === 'google'
      ? rows.reduce((s, r) => s + r.verbaGoogle, 0)
      : rows.reduce((s, r) => s + r.verbaFB, 0);
    const l = plat === 'google'
      ? rows.reduce((s, r) => s + r.leadGoogle, 0)
      : rows.reduce((s, r) => s + r.leadFB, 0);
    return { invest: v, leads: l, cpl: l > 0 ? v / l : 0 };
  }

  function blockHTML(plat, label, wins, metaLead, orcamento) {
    const rowsHtml = Object.keys(wins).map(name => {
      const a = agg(wins[name], plat);
      return `<tr>
        <th>${name}</th>
        <td>${Utils.brl(a.invest)}</td>
        <td>${Utils.num(a.leads)}</td>
        <td>${a.cpl > 0 ? Utils.brl(a.cpl) : '—'}</td>
      </tr>`;
    }).join('');
    return `
      <div class="platform-block">
        <div class="platform-block__head ${plat}"><span class="dot"></span>${label}</div>
        <div class="platform-block__body">
          <table class="mini">
            <thead><tr><th style="text-align:left">Janela</th><th>Invest.</th><th>Leads</th><th>CPL</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="platform-block__foot">
            Meta mensal: <strong>${Utils.num(metaLead)} leads</strong> · orçamento <strong>${Utils.brl(orcamento)}</strong>
          </div>
        </div>
      </div>`;
  }

  function render(full) {
    const rows = full.rows;
    const wins = windowsOf(rows);
    const m = full.meta;

    document.getElementById('periodBlocks').innerHTML =
      blockHTML('google', 'Google', wins, m.metaLeadGoogle, m.orcamentoGoogle) +
      blockHTML('facebook', 'Facebook', wins, m.metaLeadFB, m.orcamentoFB);

    // gráfico: leads por janela (Google x Facebook)
    const labels = Object.keys(wins);
    const dataG = labels.map(n => agg(wins[n], 'google').leads);
    const dataF = labels.map(n => agg(wins[n], 'facebook').leads);
    const p = {
      s1: Utils.cssVar('--series-1'), s2: Utils.cssVar('--series-2'),
      text: Utils.cssVar('--text'), bg: Utils.cssVar('--bg'),
      muted: Utils.cssVar('--muted'), grid: Utils.cssVar('--grid-line')
    };
    if (chart) chart.destroy();
    chart = new Chart(document.getElementById('chartPeriod'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Google', data: dataG, backgroundColor: p.s1, borderRadius: 6, maxBarThickness: 46 },
          { label: 'Facebook', data: dataF, backgroundColor: p.s2, borderRadius: 6, maxBarThickness: 46 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, pointStyle: 'circle', color: p.muted, font: { size: 12, family: 'Inter' }, padding: 16 } },
          tooltip: { backgroundColor: p.text, titleColor: p.bg, bodyColor: p.bg, padding: 10, cornerRadius: 8 }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: p.muted, font: { size: 12 } } },
          y: { beginAtZero: true, grid: { color: p.grid }, ticks: { color: p.muted, font: { size: 11 } } }
        }
      }
    });
  }

  return { render };
})();
