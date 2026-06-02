/* ============================================================
   KPIS (v3) — scorecards que respondem ao filtro de período.
   Valor = soma da janela atual. Meta = proporcional à janela.
   ============================================================ */
window.Kpis = (function () {
  const ICON = {
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    leads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    cpl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
  };

  function periodDays(period, diasNoMes) {
    if (period === '7d') return 7;
    if (period === '14d') return 14;
    return diasNoMes;
  }

  function card({ accent, icon, label, value, sub, badge, badgeClass, progress }) {
    return `
      <div class="kpi-card${accent ? ' accent' : ''}">
        <div class="kpi-card__top">
          <div class="kpi-chip">${icon}</div>
          ${badge ? `<span class="kpi-badge ${badgeClass}">${badge}</span>` : ''}
        </div>
        <div class="kpi-label">${label}</div>
        <div class="kpi-value">${value}</div>
        <div class="kpi-sub">${sub}</div>
        ${progress != null ? `<div class="kpi-progress"><span style="width:${Math.max(0, Math.min(100, progress))}%"></span></div>` : ''}
      </div>`;
  }

  function render(view, daysInRange, meta, diasNoMes) {
    const rows = view.rows;
    const days = Math.max(1, daysInRange || diasNoMes);
    const isFull = days >= diasNoMes;
    const factor = isFull ? 1 : days / diasNoMes;
    const suffix = isFull ? '' : ` · ${days} dias`;
    const metaLabel = isFull ? 'Meta' : 'Meta prop.';

    const invest = rows.reduce((s, r) => s + r.verbaGoogle + r.verbaFB, 0);
    const leads  = rows.reduce((s, r) => s + r.leadsDia, 0);
    const cpl    = leads > 0 ? invest / leads : 0;

    const orcamentoView = meta.orcamentoTotal * factor;
    const metaLeadsView = meta.metaLeadTotal * factor;
    const metaCPL = meta.metaCPL;
    const atingimento = metaLeadsView > 0 ? (leads / metaLeadsView) * 100 : 0;

    const html = [
      card({
        icon: ICON.money, label: 'Investimento' + suffix,
        value: Utils.brl(invest),
        sub: `${metaLabel}: ${Utils.brl(orcamentoView)}`,
        badge: invest <= orcamentoView ? 'No orçamento' : 'Acima',
        badgeClass: invest <= orcamentoView ? 'good' : 'warn',
        progress: orcamentoView > 0 ? (invest / orcamentoView) * 100 : 0
      }),
      card({
        accent: true, icon: ICON.leads, label: 'Leads gerados' + suffix,
        value: Utils.num(leads),
        sub: `${metaLabel}: ${Utils.num(Math.round(metaLeadsView))}`,
        badge: atingimento >= 100 ? 'Meta batida' : Utils.pct(atingimento, 0),
        badgeClass: atingimento >= 100 ? 'good' : (atingimento >= 80 ? 'warn' : 'bad'),
        progress: atingimento
      }),
      card({
        icon: ICON.cpl, label: 'CPL médio' + suffix,
        value: Utils.brl(cpl),
        sub: `Meta: ${Utils.brl(metaCPL)} por lead`,
        badge: cpl > 0 && cpl <= metaCPL ? 'Abaixo da meta' : 'Acima da meta',
        badgeClass: cpl > 0 && cpl <= metaCPL ? 'good' : 'warn',
        progress: cpl > 0 ? Math.min(100, (metaCPL / cpl) * 100) : 0
      }),
      card({
        icon: ICON.target, label: 'Atingimento da meta' + suffix,
        value: Utils.pct(atingimento, 0),
        sub: `${Utils.num(leads)} de ${Utils.num(Math.round(metaLeadsView))} leads`,
        badge: atingimento >= 100 ? 'Completo' : 'Em curso',
        badgeClass: atingimento >= 100 ? 'good' : 'warn',
        progress: atingimento
      })
    ].join('');

    document.getElementById('kpiGrid').innerHTML = html;
  }

  return { render };
})();
