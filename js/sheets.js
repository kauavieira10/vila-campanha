/* ============================================================
   SHEETS (multi-cliente) — lista de clientes + dados por cliente
   Metas vêm da planilha de controle (_meta.metas). Realizados são
   calculados ao vivo das linhas diárias. Fallback gracioso.
   ============================================================ */
window.Sheets = (function () {
  let lastRaw = null;
  let lastNormalized = null;

  function normalizeRow(r) {
    const leadG = Number(r.leadGoogle) || 0;
    const verbaG = Number(r.verbaGoogle) || 0;
    return {
      date: r.date, label: Utils.isoToLabel(r.date), dia: r.dia || '',
      verbaGoogle: verbaG, leadGoogle: leadG,
      verbaFB: Number(r.verbaFB) || 0, leadFB: Number(r.leadFB) || 0,
      cplGoogle: leadG > 0 ? verbaG / leadG : 0, cplFB: Number(r.cplFB) || 0,
      leadsDia: leadG + (Number(r.leadFB) || 0),
      leadsTotal: Number(r.leadsTotal) || 0,
      metaPct: Number(r.metaPct) || 0, refPct: Number(r.refPct) || 0
    };
  }

  function diasNoMesDe(rows) {
    if (!rows.length) return 30;
    const [y, m] = rows[0].date.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  // Monta o objeto meta a partir das metas da planilha de controle (com defaults)
  function buildMeta(metas, mesRef) {
    metas = metas || {};
    const orc = metas.orcamento != null ? metas.orcamento : 2600;
    const metaLeads = metas.metaLeads != null ? metas.metaLeads : 410;
    const orcG = metas.orcamentoGoogle != null ? metas.orcamentoGoogle : orc / 2;
    const orcF = metas.orcamentoFB != null ? metas.orcamentoFB : orc / 2;
    const mlG = metas.metaLeadGoogle != null ? metas.metaLeadGoogle : Math.round(metaLeads / 2);
    const mlF = metas.metaLeadFB != null ? metas.metaLeadFB : metaLeads - mlG;
    const cpl = metas.metaCPL != null ? metas.metaCPL : (metaLeads > 0 ? orc / metaLeads : 0);
    return {
      mesRef: mesRef || '',
      orcamentoTotal: orc, orcamentoGoogle: orcG, orcamentoFB: orcF,
      metaLeadTotal: metaLeads, metaLeadGoogle: mlG, metaLeadFB: mlF,
      metaCPL: cpl, metaCPLGoogle: mlG > 0 ? orcG / mlG : 0, metaCPLFB: mlF > 0 ? orcF / mlF : 0
    };
  }

  function fromFallback(source) {
    const ds = window.FALLBACK_DATASET;
    const rows = ds.rows.map(x => normalizeRow({
      date: x.d, dia: x.dia, verbaGoogle: x.vG, leadGoogle: x.lG,
      verbaFB: x.vF, leadFB: x.lF, cplFB: x.cF, leadsTotal: x.tot, metaPct: x.m, refPct: x.r
    }));
    return { source: source || 'demo', nome: 'Vila Campana (exemplo)', meta: Utils.clone(ds.meta), rows, diasNoMes: diasNoMesDe(rows), fetchedAt: new Date() };
  }

  // Parser do array bruto do Sheets -> formato normalizado
  function parseSheet(values, m) {
    if (!Array.isArray(values) || !values.length) throw new Error('Sem valores');
    let headerRow = -1, baseCol = -1;
    for (let i = 0; i < values.length; i++) {
      const row = values[i] || [];
      for (let c = 0; c < row.length; c++) {
        if (String(row[c]).trim().toUpperCase() === 'DATA') { headerRow = i; baseCol = c; break; }
      }
      if (headerRow !== -1) break;
    }
    if (headerRow === -1) throw new Error('Cabeçalho "DATA" não encontrado');

    const COL = {
      date: baseCol, dia: baseCol + 1, verbaGoogle: baseCol + 2, leadGoogle: baseCol + 3,
      verbaFB: baseCol + 7, leadFB: baseCol + 8, cplFB: baseCol + 9,
      leadsTotal: baseCol + 10, refPct: baseCol + 11, metaPct: baseCol + 12
    };

    const rows = [];
    for (let i = headerRow + 1; i < values.length; i++) {
      const row = values[i] || [];
      const dt = Utils.parseBRDate(row[COL.date]);
      if (!dt) continue;
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      rows.push(normalizeRow({
        date: iso, dia: String(row[COL.dia] || '').trim(),
        verbaGoogle: Utils.parseNumber(row[COL.verbaGoogle]), leadGoogle: Utils.parseNumber(row[COL.leadGoogle]),
        verbaFB: Utils.parseNumber(row[COL.verbaFB]), leadFB: Utils.parseNumber(row[COL.leadFB]),
        cplFB: Utils.parseNumber(row[COL.cplFB]), leadsTotal: Utils.parseNumber(row[COL.leadsTotal]),
        refPct: Utils.parseNumber(row[COL.refPct]), metaPct: Utils.parseNumber(row[COL.metaPct])
      }));
    }
    if (!rows.length) throw new Error('Nenhuma linha de dados encontrada');

    return {
      source: 'live',
      nome: (m && m.nome) || '',
      meta: buildMeta(m && m.metas, m && m.mesRef),
      rows, diasNoMes: diasNoMesDe(rows),
      fetchedAt: m && m.fetchedAt ? new Date(m.fetchedAt) : new Date()
    };
  }

  /* ---------- lista de clientes ---------- */
  async function listClients() {
    try {
      const r = await fetch(CONFIG.clientsEndpoint, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || j.error) return { ok: false, error: j.error || ('HTTP ' + r.status), missing: j.missing, clients: [] };
      return { ok: true, clients: j.clients || [] };
    } catch (e) {
      return { ok: false, error: e.message, clients: [] };
    }
  }

  /* ---------- cache por cliente ---------- */
  function ck(slug) { return CONFIG.cachePrefix + slug; }
  function readCache(slug) {
    try { const raw = localStorage.getItem(ck(slug)); if (!raw) return null;
      const o = JSON.parse(raw); if (Date.now() - o.t > CONFIG.cacheTTL) return null; return o.data;
    } catch (e) { return null; }
  }
  function writeCache(slug, data) { try { localStorage.setItem(ck(slug), JSON.stringify({ t: Date.now(), data })); } catch (e) {} }
  function clearCache(slug) { try { slug ? localStorage.removeItem(ck(slug)) : Object.keys(localStorage).filter(k => k.startsWith(CONFIG.cachePrefix)).forEach(k => localStorage.removeItem(k)); } catch (e) {} }

  /* ---------- dados de um cliente ---------- */
  async function load(slug, { force = false } = {}) {
    if (!slug) { lastNormalized = fromFallback('demo'); return lastNormalized; }
    if (!force) {
      const cached = readCache(slug);
      if (cached) { try { lastRaw = cached; lastNormalized = parseSheet(cached.values, cached._meta); return lastNormalized; } catch (e) {} }
    }
    try {
      const resp = await fetch(`${CONFIG.proxyEndpoint}?cliente=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      const json = await resp.json();
      lastRaw = json;
      if (!resp.ok || json.error || !json.values) {
        const isSetup = json && Array.isArray(json.missing) && json.missing.length;
        lastNormalized = fromFallback(isSetup ? 'demo' : 'offline');
        lastNormalized._err = json && (json.error || null);
        return lastNormalized;
      }
      const norm = parseSheet(json.values, json._meta);
      writeCache(slug, json);
      lastNormalized = norm;
      return norm;
    } catch (err) {
      lastNormalized = fromFallback('offline');
      return lastNormalized;
    }
  }

  window.debugSheets = function () {
    console.log('%c== debugSheets ==', 'color:#4f93f5;font-weight:bold');
    console.log('Resposta bruta (raw):', lastRaw);
    if (lastRaw && lastRaw._meta) console.log('Metadata:', lastRaw._meta);
    console.log('Normalizado:', lastNormalized);
    if (lastNormalized) console.log(`Fonte: ${lastNormalized.source} | ${lastNormalized.rows.length} linhas via proxy`);
    return lastNormalized;
  };

  return { listClients, load, clearCache, fromFallback };
})();
