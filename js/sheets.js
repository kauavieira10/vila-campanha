/* ============================================================
   SHEETS — busca no proxy, parser, cache e fallback gracioso
   ============================================================ */
window.Sheets = (function () {
  let lastRaw = null;
  let lastNormalized = null;

  function normalizeRow(r) {
    const leadG = Number(r.leadGoogle) || 0;
    const verbaG = Number(r.verbaGoogle) || 0;
    return {
      date: r.date,
      label: Utils.isoToLabel(r.date),
      dia: r.dia || '',
      verbaGoogle: verbaG,
      leadGoogle: leadG,
      verbaFB: Number(r.verbaFB) || 0,
      leadFB: Number(r.leadFB) || 0,
      cplGoogle: leadG > 0 ? verbaG / leadG : 0,
      cplFB: Number(r.cplFB) || 0,
      leadsDia: leadG + (Number(r.leadFB) || 0),
      leadsTotal: Number(r.leadsTotal) || 0,
      metaPct: Number(r.metaPct) || 0,
      refPct: Number(r.refPct) || 0
    };
  }

  // Transforma o FALLBACK_DATASET (chaves curtas) no formato normalizado
  function fromFallback(source) {
    const ds = window.FALLBACK_DATASET;
    return {
      source: source || 'demo',
      meta: Utils.clone(ds.meta),
      rows: ds.rows.map(x => normalizeRow({
        date: x.d, dia: x.dia, verbaGoogle: x.vG, leadGoogle: x.lG,
        verbaFB: x.vF, leadFB: x.lF, cplFB: x.cF, leadsTotal: x.tot,
        metaPct: x.m, refPct: x.r
      })),
      fetchedAt: new Date()
    };
  }

  // Parser do array bruto do Google Sheets -> formato normalizado
  function parseSheet(values, fetchedAt) {
    if (!Array.isArray(values) || !values.length) throw new Error('Sem valores');

    // 1. localizar a linha de cabeçalho da tabela diária (célula == "DATA")
    let headerRow = -1, baseCol = -1;
    for (let i = 0; i < values.length; i++) {
      const row = values[i] || [];
      for (let c = 0; c < row.length; c++) {
        if (String(row[c]).trim().toUpperCase() === 'DATA') {
          headerRow = i; baseCol = c; break;
        }
      }
      if (headerRow !== -1) break;
    }
    if (headerRow === -1) throw new Error('Cabeçalho "DATA" não encontrado');

    // 2. offsets fixos a partir da coluna DATA (ordem conhecida da planilha)
    const COL = {
      date: baseCol + 0, dia: baseCol + 1, verbaGoogle: baseCol + 2,
      leadGoogle: baseCol + 3, /* +4 expad, +5 quebra, +6 cpl google expad */
      verbaFB: baseCol + 7, leadFB: baseCol + 8, cplFB: baseCol + 9,
      leadsTotal: baseCol + 10, refPct: baseCol + 11, metaPct: baseCol + 12
    };

    // 3. ler linhas com data válida
    const rows = [];
    for (let i = headerRow + 1; i < values.length; i++) {
      const row = values[i] || [];
      const dt = Utils.parseBRDate(row[COL.date]);
      if (!dt) continue;
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      rows.push(normalizeRow({
        date: iso,
        dia: String(row[COL.dia] || '').trim(),
        verbaGoogle: Utils.parseNumber(row[COL.verbaGoogle]),
        leadGoogle: Utils.parseNumber(row[COL.leadGoogle]),
        verbaFB: Utils.parseNumber(row[COL.verbaFB]),
        leadFB: Utils.parseNumber(row[COL.leadFB]),
        cplFB: Utils.parseNumber(row[COL.cplFB]),
        leadsTotal: Utils.parseNumber(row[COL.leadsTotal]),
        refPct: Utils.parseNumber(row[COL.refPct]),
        metaPct: Utils.parseNumber(row[COL.metaPct])
      }));
    }
    if (!rows.length) throw new Error('Nenhuma linha de dados encontrada');

    return {
      source: 'live',
      meta: Utils.clone(window.FALLBACK_DATASET.meta), // metas: editáveis em data/dataset.js
      rows,
      fetchedAt: fetchedAt ? new Date(fetchedAt) : new Date()
    };
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CONFIG.cacheKey);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.t > CONFIG.cacheTTL) return null;
      return obj.data;
    } catch (e) { return null; }
  }
  function writeCache(data) {
    try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ t: Date.now(), data })); }
    catch (e) {}
  }

  async function load({ force = false } = {}) {
    if (!force) {
      const cached = readCache();
      if (cached) {
        try {
          lastRaw = cached;
          lastNormalized = parseSheet(cached.values, cached._meta && cached._meta.fetchedAt);
          return lastNormalized;
        } catch (e) { /* cache ruim -> segue para fetch */ }
      }
    }
    try {
      const resp = await fetch(CONFIG.proxyEndpoint, { cache: 'no-store' });
      const json = await resp.json();
      lastRaw = json;
      if (!resp.ok || json.error || !json.values) {
        console.warn('[Sheets] resposta sem dados utilizáveis:', json);
        // configuração ainda não feita (setup) = demo calmo; erro real = offline
        const isSetup = json && Array.isArray(json.missing) && json.missing.length;
        lastNormalized = fromFallback(isSetup ? 'demo' : 'offline');
        return lastNormalized;
      }
      const norm = parseSheet(json.values, json._meta && json._meta.fetchedAt);
      writeCache(json);
      lastNormalized = norm;
      return norm;
    } catch (err) {
      console.warn('[Sheets] falha de rede, usando fallback:', err.message);
      lastNormalized = fromFallback('offline');
      return lastNormalized;
    }
  }

  function clearCache() { try { localStorage.removeItem(CONFIG.cacheKey); } catch (e) {} }

  // debug global
  window.debugSheets = function () {
    console.log('%c== debugSheets ==', 'color:#4f93f5;font-weight:bold');
    console.log('Endpoint:', CONFIG.proxyEndpoint);
    console.log('Resposta bruta (raw):', lastRaw);
    if (lastRaw && lastRaw._meta) console.log('Metadata:', lastRaw._meta);
    console.log('Normalizado:', lastNormalized);
    if (lastNormalized) {
      console.log(`Fonte: ${lastNormalized.source} | ${lastNormalized.rows.length} linhas via proxy`);
    }
    return lastNormalized;
  };

  return { load, clearCache, fromFallback };
})();
