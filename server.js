/* ============================================================
   SERVIDOR (multi-cliente via planilha de controle)
   - Lê UMA planilha-mãe (CONTROL_SHEET_ID) que mapeia cada cliente
     para o ID da planilha do mês atual.
   - /api/clients          → lista de clientes (para o seletor)
   - /api/sheets?cliente=x  → resolve o cliente e devolve os dados do mês
   Virar o mês = editar a planilha de controle. Sem redeploy.
   ============================================================ */
const http = require("http");
const fs   = require("fs");
const path = require("path");
const url  = require("url");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml", ".png": "image/png",
  ".jpg":  "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon"
};

const API_KEY       = () => process.env.GOOGLE_SHEETS_API_KEY;
const CONTROL_ID    = () => process.env.CONTROL_SHEET_ID;
const CONTROL_NAME  = () => process.env.CONTROL_SHEET_NAME  || "Clientes";
const CONTROL_RANGE = () => process.env.CONTROL_SHEET_RANGE || "A1:Z300";

/* -------- cache simples em memória da planilha de controle -------- */
let controlCache = { at: 0, clients: null };
const CONTROL_TTL = 60 * 1000; // 60s

async function fetchSheet(sheetId, sheetName, range) {
  const fullRange = encodeURIComponent(`${sheetName}!${range}`);
  const u = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${fullRange}?key=${API_KEY()}`;
  const r = await fetch(u);
  if (!r.ok) {
    const detail = (await r.text()).substring(0, 500);
    const err = new Error(`Google Sheets API ${r.status}`);
    err.status = r.status; err.detail = detail;
    err.hint = r.status === 403 ? "Planilha não pública OU API Key com restrição de site/referrer (deixe None)."
             : r.status === 404 ? "ID errado (cole sem /edit e sem espaços)."
             : r.status === 400 ? "Nome da ABA errado (use o nome do rodapé, não do arquivo)."
             : null;
    throw err;
  }
  return r.json();
}

/* Lê a planilha de controle e devolve a lista de clientes.
   Colunas esperadas (linha 1 = cabeçalho, em qualquer ordem):
   slug | nome | sheet_id | aba | range | mes_ref |
   orcamento | meta_leads | meta_cpl |
   orcamento_google | orcamento_fb | meta_lead_google | meta_lead_fb   */
async function getClients(force) {
  if (!force && controlCache.clients && Date.now() - controlCache.at < CONTROL_TTL) {
    return controlCache.clients;
  }
  const data = await fetchSheet(CONTROL_ID(), CONTROL_NAME(), CONTROL_RANGE());
  const values = data.values || [];
  if (!values.length) throw Object.assign(new Error("Planilha de controle vazia"), { status: 400 });

  const header = values[0].map(h => String(h).trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const col = {
    slug: idx("slug"), nome: idx("nome"), sheet_id: idx("sheet_id"),
    aba: idx("aba"), range: idx("range"), mes_ref: idx("mes_ref"),
    orcamento: idx("orcamento"), meta_leads: idx("meta_leads"), meta_cpl: idx("meta_cpl"),
    orcamento_google: idx("orcamento_google"), orcamento_fb: idx("orcamento_fb"),
    meta_lead_google: idx("meta_lead_google"), meta_lead_fb: idx("meta_lead_fb")
  };
  if (col.slug === -1 || col.sheet_id === -1) {
    throw Object.assign(new Error("Planilha de controle precisa ter ao menos as colunas 'slug' e 'sheet_id'"), { status: 400 });
  }

  const get = (row, c) => (c > -1 && row[c] != null ? String(row[c]).trim() : "");
  const numBR = (s) => {
    if (!s) return null;
    s = s.replace(/r\$/i, "").replace(/%/g, "").replace(/\s/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    const n = parseFloat(s); return isNaN(n) ? null : n;
  };

  const clients = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    const slug = get(row, col.slug).toLowerCase();
    const sheetId = get(row, col.sheet_id);
    if (!slug || !sheetId) continue;
    clients.push({
      slug,
      nome: get(row, col.nome) || slug,
      sheetId,
      aba: get(row, col.aba) || "Diário Performance",
      range: get(row, col.range) || "A1:Z200",
      mesRef: get(row, col.mes_ref) || "",
      metas: {
        orcamento: numBR(get(row, col.orcamento)),
        metaLeads: numBR(get(row, col.meta_leads)),
        metaCPL: numBR(get(row, col.meta_cpl)),
        orcamentoGoogle: numBR(get(row, col.orcamento_google)),
        orcamentoFB: numBR(get(row, col.orcamento_fb)),
        metaLeadGoogle: numBR(get(row, col.meta_lead_google)),
        metaLeadFB: numBR(get(row, col.meta_lead_fb))
      }
    });
  }
  controlCache = { at: Date.now(), clients };
  return clients;
}

function missingConfig() {
  return [!API_KEY() && "GOOGLE_SHEETS_API_KEY", !CONTROL_ID() && "CONTROL_SHEET_ID"].filter(Boolean);
}

async function handleClients(req, res) {
  const miss = missingConfig();
  if (miss.length) return sendJSON(res, 500, { error: "Configuração incompleta", missing: miss });
  try {
    const force = /[?&]force=1/.test(req.url);
    const clients = await getClients(force);
    // não expõe os IDs na listagem (só o necessário pro seletor)
    sendJSON(res, 200, { clients: clients.map(c => ({ slug: c.slug, nome: c.nome, mesRef: c.mesRef })) });
  } catch (e) {
    sendJSON(res, e.status || 500, { error: e.message, detail: e.detail, hint: e.hint });
  }
}

async function handleSheets(req, res) {
  const miss = missingConfig();
  if (miss.length) return sendJSON(res, 500, { error: "Configuração incompleta", missing: miss });

  const q = url.parse(req.url, true).query || {};
  const slug = String(q.cliente || "").trim().toLowerCase();
  if (!slug) return sendJSON(res, 400, { error: "Cliente não informado", hint: "Use /api/sheets?cliente=slug" });

  try {
    const clients = await getClients(false);
    const cli = clients.find(c => c.slug === slug);
    if (!cli) return sendJSON(res, 404, { error: "Cliente não encontrado na planilha de controle", slug });

    const range = q.range || cli.range;
    const data = await fetchSheet(cli.sheetId, cli.aba, range);
    res.setHeader("Cache-Control", "public, max-age=300");
    sendJSON(res, 200, {
      ...data,
      _meta: {
        fetchedAt: new Date().toISOString(),
        cliente: cli.slug, nome: cli.nome, sheetName: cli.aba, range,
        mesRef: cli.mesRef, metas: cli.metas,
        rowsCount: (data.values || []).length
      }
    });
  } catch (e) {
    sendJSON(res, e.status || 500, { error: e.message, detail: e.detail, hint: e.hint });
  }
}

function sendJSON(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", process.env.RENDER_EXTERNAL_URL || "*");
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  let pathname = parsed.pathname === "/" ? "/index.html" : parsed.pathname;
  if (pathname.includes("..")) { res.statusCode = 403; return res.end("Forbidden"); }
  const filePath = path.join(__dirname, pathname);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.statusCode = 404; return res.end("Not Found"); }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.statusCode = 204; return res.end();
  }
  const pathname = url.parse(req.url).pathname;
  if (pathname === "/api/clients") return handleClients(req, res);
  if (pathname === "/api/sheets")  return handleSheets(req, res);
  if (pathname === "/health") { res.statusCode = 200; return res.end("OK"); }
  serveStatic(req, res);
});

server.listen(PORT, () => console.log(`\u2713 Dashboard (multi-cliente) em http://localhost:${PORT}`));
