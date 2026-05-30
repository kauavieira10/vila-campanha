/* ============================================================
   CHARTS — Chart.js. Cores SEMPRE lidas das CSS variables.
   ============================================================ */
window.Charts = (function () {
  const inst = {};         // instâncias do Chart.js
  let current = null;      // últimos dados normalizados+filtrados

  function palette() {
    return {
      s1: Utils.cssVar('--series-1'),
      s2: Utils.cssVar('--series-2'),
      s3: Utils.cssVar('--series-3'),
      s4: Utils.cssVar('--series-4'),
      text: Utils.cssVar('--text'),
      bg: Utils.cssVar('--bg'),
      muted: Utils.cssVar('--muted'),
      grid: Utils.cssVar('--grid-line'),
      surface: Utils.cssVar('--surface')
    };
  }

  function baseOpts(p) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { usePointStyle: true, pointStyle: 'circle', color: p.muted, font: { size: 12, family: 'Inter' }, padding: 16 }
        },
        tooltip: {
          backgroundColor: p.text, titleColor: p.bg, bodyColor: p.bg,
          padding: 10, cornerRadius: 8, displayColors: true, boxPadding: 4,
          titleFont: { family: 'Plus Jakarta Sans', weight: '700' },
          bodyFont: { family: 'Inter' }
        }
      }
    };
  }

  function axis(p, opts = {}) {
    return {
      grid: { color: p.grid, drawBorder: false },
      ticks: { color: p.muted, font: { size: 11, family: 'Inter' }, ...opts.ticks },
      ...opts
    };
  }

  function destroyAll() { Object.values(inst).forEach(c => c && c.destroy()); }

  function render(data) {
    current = data;
    destroyAll();
    const p = palette();
    const rows = data.rows;
    const labels = rows.map(r => r.label);

    // 1) Linha — leads acumulados (real) x meta acumulada
    const metaTotal = data.meta.metaLeadTotal || 0;
    const realAcum = rows.map(r => r.leadsTotal);
    const metaAcum = rows.map(r => Math.round(metaTotal * (r.refPct / 100)));
    inst.line = new Chart(document.getElementById('chartLine'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Leads acumulados (real)', data: realAcum,
            borderColor: p.s1, backgroundColor: Utils.hexToRgba(p.s1, 0.12),
            fill: true, tension: 0.3, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4
          },
          {
            label: 'Meta acumulada', data: metaAcum,
            borderColor: p.muted, borderDash: [5, 5], borderWidth: 1.6,
            fill: false, tension: 0, pointRadius: 0, pointHoverRadius: 3
          }
        ]
      },
      options: { ...baseOpts(p), scales: { x: axis(p, { grid: { display: false } }), y: axis(p, { beginAtZero: true }) } }
    });

    // 2) Barras — leads por dia (Google x Facebook)
    inst.barsDaily = new Chart(document.getElementById('chartBarsDaily'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Google', data: rows.map(r => r.leadGoogle), backgroundColor: p.s1, borderRadius: 6, maxBarThickness: 22 },
          { label: 'Facebook', data: rows.map(r => r.leadFB), backgroundColor: p.s2, borderRadius: 6, maxBarThickness: 22 }
        ]
      },
      options: { ...baseOpts(p), scales: { x: axis(p, { grid: { display: false } }), y: axis(p, { beginAtZero: true }) } }
    });

    // 3) Rosca — distribuição de leads por plataforma
    const totG = rows.reduce((s, r) => s + r.leadGoogle, 0);
    const totF = rows.reduce((s, r) => s + r.leadFB, 0);
    inst.doughnut = new Chart(document.getElementById('chartDoughnut'), {
      type: 'doughnut',
      data: {
        labels: ['Google', 'Facebook'],
        datasets: [{ data: [totG, totF], backgroundColor: [p.s1, p.s2], borderColor: p.surface, borderWidth: 3, hoverOffset: 6 }]
      },
      options: { ...baseOpts(p), cutout: '62%', plugins: { ...baseOpts(p).plugins, legend: { ...baseOpts(p).plugins.legend, position: 'bottom' } } }
    });

    // 4) Barras — investimento realizado x orçamento por plataforma
    const gastoG = rows.reduce((s, r) => s + r.verbaGoogle, 0);
    const gastoF = rows.reduce((s, r) => s + r.verbaFB, 0);
    inst.invest = new Chart(document.getElementById('chartInvest'), {
      type: 'bar',
      data: {
        labels: ['Google', 'Facebook'],
        datasets: [
          { label: 'Realizado', data: [gastoG, gastoF], backgroundColor: p.s1, borderRadius: 6, maxBarThickness: 54 },
          { label: 'Orçamento', data: [data.meta.orcamentoGoogle, data.meta.orcamentoFB], backgroundColor: Utils.hexToRgba(p.s2, 0.55), borderRadius: 6, maxBarThickness: 54 }
        ]
      },
      options: {
        ...baseOpts(p),
        scales: {
          x: axis(p, { grid: { display: false } }),
          y: axis(p, { beginAtZero: true, ticks: { color: p.muted, font: { size: 11 }, callback: v => 'R$ ' + Utils.num(v) } })
        },
        plugins: {
          ...baseOpts(p).plugins,
          tooltip: { ...baseOpts(p).plugins.tooltip, callbacks: { label: ctx => `${ctx.dataset.label}: ${Utils.brl(ctx.parsed.y)}` } }
        }
      }
    });
  }

  function repaintAll() { if (current) render(current); }

  return { render, repaintAll };
})();
