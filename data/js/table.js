/* ============================================================
   TABLE — tabela diária com total no rodapé
   ============================================================ */
window.Table = (function () {
  function render(data) {
    const rows = data.rows;
    const body = document.getElementById('tableBody');
    const foot = document.getElementById('tableFoot');

    body.innerHTML = rows.map(r => `
      <tr>
        <td>${r.label}</td>
        <td class="cell-muted">${r.dia}</td>
        <td>${Utils.brl(r.verbaGoogle)}</td>
        <td>${Utils.num(r.leadGoogle)}</td>
        <td>${Utils.brl(r.verbaFB)}</td>
        <td>${Utils.num(r.leadFB)}</td>
        <td>${Utils.brl(r.cplFB)}</td>
        <td><strong>${Utils.num(r.leadsDia)}</strong></td>
        <td class="cell-muted">${Utils.num(r.leadsTotal)}</td>
        <td><span class="pill ${r.metaPct >= r.refPct ? 'good' : 'up'}">${Utils.pct(r.metaPct, 0)}</span></td>
      </tr>`).join('');

    const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
    const totGastoG = sum('verbaGoogle'), totGastoF = sum('verbaFB');
    const totLeadG = sum('leadGoogle'), totLeadF = sum('leadFB');
    const totDia = sum('leadsDia');
    const cplFBmed = totLeadF > 0 ? totGastoF / totLeadF : 0;

    foot.innerHTML = `
      <tr>
        <td>TOTAL</td>
        <td></td>
        <td>${Utils.brl(totGastoG)}</td>
        <td>${Utils.num(totLeadG)}</td>
        <td>${Utils.brl(totGastoF)}</td>
        <td>${Utils.num(totLeadF)}</td>
        <td>${Utils.brl(cplFBmed)}</td>
        <td>${Utils.num(totDia)}</td>
        <td>${rows.length ? Utils.num(rows[rows.length - 1].leadsTotal) : 0}</td>
        <td></td>
      </tr>`;
  }
  return { render };
})();
