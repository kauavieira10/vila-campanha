/* Função serverless (Netlify) — multi-cliente via planilha de controle.
   Rotas (via netlify.toml):
     /api/clients          -> ?route=clients
     /api/sheets?cliente=x -> resolve e devolve dados do cliente   */
const API_KEY       = () => process.env.GOOGLE_SHEETS_API_KEY;
const CONTROL_ID    = () => process.env.CONTROL_SHEET_ID;
const CONTROL_NAME  = () => process.env.CONTROL_SHEET_NAME  || "Clientes";
const CONTROL_RANGE = () => process.env.CONTROL_SHEET_RANGE || "A1:Z300";

let controlCache = { at: 0, clients: null };
const CONTROL_TTL = 60 * 1000;

async function fetchSheet(sheetId, sheetName, range) {
  const u = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`${sheetName}!${range}`)}?key=${API_KEY()}`;
  const r = await fetch(u);
  if (!r.ok) {
    const detail = (await r.text()).substring(0, 500);
    const e = new Error(`Google Sheets API ${r.status}`);
    e.status = r.status; e.detail = detail;
    e.hint = r.status === 403 ? "Planilha não pública OU API Key com restrição de site/referrer (deixe None)."
           : r.status === 404 ? "ID errado (cole sem /edit e sem espaços)."
           : r.status === 400 ? "Nome da ABA errado (use o nome do rodapé)." : null;
    throw e;
  }
  return r.json();
}

function numBR(s) {
  if (!s) return null;
  s = String(s).replace(/r\$/i, "").replace(/%/g, "").replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s); return isNaN(n) ? null : n;
}

async function getClients(force) {
  if (!force && controlCache.clients && Date.now() - controlCache.at < CONTROL_TTL) return controlCache.clients;
  const data = await fetchSheet(CONTROL_ID(), CONTROL_NAME(), CONTROL_RANGE());
  const values = data.values || [];
  if (!values.length) throw Object.assign(new Error("Planilha de controle vazia"), { status: 400 });
  const header = values[0].map(h => String(h).trim().toLowerCase());
  const idx = (n) => header.indexOf(n);
  const col = { slug: idx("slug"), nome: idx("nome"), sheet_id: idx("sheet_id"), aba: idx("aba"), range: idx("range"), mes_ref: idx("mes_ref"), orcamento: idx("orcamento"), meta_leads: idx("meta_leads"), meta_cpl: idx("meta_cpl"), orcamento_google: idx("orcamento_google"), orcamento_fb: idx("orcamento_fb"), meta_lead_google: idx("meta_lead_google"), meta_lead_fb: idx("meta_lead_fb") };
  if (col.slug === -1 || col.sheet_id === -1) throw Object.assign(new Error("Planilha de controle precisa das colunas 'slug' e 'sheet_id'"), { status: 400 });
  const g = (row, c) => (c > -1 && row[c] != null ? String(row[c]).trim() : "");
  const clients = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    const slug = g(row, col.slug).toLowerCase(); const sheetId = g(row, col.sheet_id);
    if (!slug || !sheetId) continue;
    clients.push({ slug, nome: g(row, col.nome) || slug, sheetId, aba: g(row, col.aba) || "Diário Performance", range: g(row, col.range) || "A1:Z200", mesRef: g(row, col.mes_ref) || "",
      metas: { orcamento: numBR(g(row, col.orcamento)), metaLeads: numBR(g(row, col.meta_leads)), metaCPL: numBR(g(row, col.meta_cpl)), orcamentoGoogle: numBR(g(row, col.orcamento_google)), orcamentoFB: numBR(g(row, col.orcamento_fb)), metaLeadGoogle: numBR(g(row, col.meta_lead_google)), metaLeadFB: numBR(g(row, col.meta_lead_fb)) } });
  }
  controlCache = { at: Date.now(), clients };
  return clients;
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": process.env.URL || "*" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  const miss = [!API_KEY() && "GOOGLE_SHEETS_API_KEY", !CONTROL_ID() && "CONTROL_SHEET_ID"].filter(Boolean);
  if (miss.length) return { statusCode: 500, headers, body: JSON.stringify({ error: "Configuração incompleta no Netlify", missing: miss }) };

  const q = event.queryStringParameters || {};
  try {
    if (q.route === "clients") {
      const clients = await getClients(q.force === "1");
      return { statusCode: 200, headers, body: JSON.stringify({ clients: clients.map(c => ({ slug: c.slug, nome: c.nome, mesRef: c.mesRef })) }) };
    }
    const slug = String(q.cliente || "").trim().toLowerCase();
    if (!slug) return { statusCode: 400, headers, body: JSON.stringify({ error: "Cliente não informado" }) };
    const clients = await getClients(false);
    const cli = clients.find(c => c.slug === slug);
    if (!cli) return { statusCode: 404, headers, body: JSON.stringify({ error: "Cliente não encontrado", slug }) };
    const range = q.range || cli.range;
    const data = await fetchSheet(cli.sheetId, cli.aba, range);
    return { statusCode: 200, headers: { ...headers, "Cache-Control": "public, max-age=300" },
      body: JSON.stringify({ ...data, _meta: { fetchedAt: new Date().toISOString(), cliente: cli.slug, nome: cli.nome, sheetName: cli.aba, range, mesRef: cli.mesRef, metas: cli.metas, rowsCount: (data.values || []).length } }) };
  } catch (e) {
    return { statusCode: e.status || 500, headers, body: JSON.stringify({ error: e.message, detail: e.detail, hint: e.hint }) };
  }
};
