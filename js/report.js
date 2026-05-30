/* ============================================================
   REPORT — exportação CSV (BOM UTF-8 para o Excel BR)
   ============================================================ */
window.Report = (function () {
  function exportCSV(rows, filename) {
    // Excel em pt-BR usa ';' como separador. Com ',' tudo cai numa coluna só.
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  function fromData(data) {
    const header = ['Data', 'Dia', 'Verba Google', 'Leads Google', 'Verba Facebook', 'Leads Facebook', 'CPL Facebook', 'Leads no dia', 'Leads acumulados', '% da meta'];
    const body = data.rows.map(r => [
      r.label, r.dia,
      Utils.brl(r.verbaGoogle), r.leadGoogle,
      Utils.brl(r.verbaFB), r.leadFB, Utils.brl(r.cplFB),
      r.leadsDia, r.leadsTotal, Utils.pct(r.metaPct, 0)
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    exportCSV([header, ...body], `relatorio-vila-campanha-${stamp}.csv`);
  }

  return { exportCSV, fromData };
})();
