/* ============================================================
   SERVIDOR (multi-cliente) — Google Sheets + Meta Ads
   - planilha de controle mapeia cada cliente -> planilha do mês + conta Meta
   - /api/clients            lista de clientes
   - /api/sheets?cliente=x   dados do Sheets do cliente
   - /api/meta?cliente=x      criativos do Meta Ads do cliente
   ============================================================ */
const http = require("http");
const fs   = require("fs");
const path = require("path");
const url  = require("url");
const PORT = process.env.PORT || 3000;

const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".webp":"image/webp", ".ico":"image/x-icon" };

const API_KEY       = () => process.env.GOOGLE_SHEETS_API_KEY;
const CONTROL_ID    = () => process.env.CONTROL_SHEET_ID;
const CONTROL_NAME  = () => process.env.CONTROL_SHEET_NAME  || "Clientes";
const CONTROL_RANGE = () => process.env.CONTROL_SHEET_RANGE || "A1:Z300";
const META_TOKEN    = () => process.env.META_ACCESS_TOKEN;
const META_VER      = () => process.env.META_API_VERSION || "v24.0";

let controlCache = { at: 0, clients: null };
const CONTROL_TTL = 60 * 1000;

async function fetchSheet(sheetId, sheetName, range) {
  const fullRange = encodeURIComponent(`${sheetName}!${range}`);
  const u = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${fullRange}?key=${API_KEY()}`;
  const r = await fetch(u);
  if (!r.ok) {
    const detail = (await r.text()).substring(0, 500);
    const err = new Error(`Google Sheets API ${r.status}`); err.status = r.status; err.detail = detail;
    err.hint = r.status === 403 ? "Planilha não pública OU API Key com restrição de site/referrer (deixe None)."
             : r.status === 404 ? "ID errado (cole sem /edit e sem espaços)."
             : r.status === 400 ? "Nome da ABA errado (use o nome do rodapé)." : null;
    throw err;
  }
  return r.json();
}

async function getClients(force) {
  if (!force && controlCache.clients && Date.now() - controlCache.at < CONTROL_TTL) return controlCache.clients;
  const data = await fetchSheet(CONTROL_ID(), CONTROL_NAME(), CONTROL_RANGE());
  const values = data.values || [];
  if (!values.length) throw Object.assign(new Error("Planilha de controle vazia"), { status: 400 });
  const header = values[0].map(h => String(h).trim().toLowerCase());
  const idx = (n) => header.indexOf(n);
  const col = { slug:idx("slug"), nome:idx("nome"), sheet_id:idx("sheet_id"), aba:idx("aba"), range:idx("range"), mes_ref:idx("mes_ref"),
    orcamento:idx("orcamento"), meta_leads:idx("meta_leads"), meta_cpl:idx("meta_cpl"),
    orcamento_google:idx("orcamento_google"), orcamento_fb:idx("orcamento_fb"), meta_lead_google:idx("meta_lead_google"), meta_lead_fb:idx("meta_lead_fb"),
    meta_ad_account:idx("meta_ad_account") };
  if (col.slug === -1 || col.sheet_id === -1) throw Object.assign(new Error("Planilha de controle precisa das colunas 'slug' e 'sheet_id'"), { status: 400 });
  const g = (row, c) => (c > -1 && row[c] != null ? String(row[c]).trim() : "");
  const numBR = (s) => { if (!s) return null; s = s.replace(/r\$/i,"").replace(/%/g,"").replace(/\s/g,""); if (s.includes(",")) s = s.replace(/\./g,"").replace(",","."); else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,""); const n = parseFloat(s); return isNaN(n)?null:n; };
  const clients = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    const slug = g(row, col.slug).toLowerCase(); const sheetId = g(row, col.sheet_id);
    if (!slug || !sheetId) continue;
    clients.push({ slug, nome: g(row,col.nome)||slug, sheetId, aba: g(row,col.aba)||"Diário Performance", range: g(row,col.range)||"A1:Z200", mesRef: g(row,col.mes_ref)||"",
      metaAdAccount: g(row, col.meta_ad_account),
      metas: { orcamento:numBR(g(row,col.orcamento)), metaLeads:numBR(g(row,col.meta_leads)), metaCPL:numBR(g(row,col.meta_cpl)), orcamentoGoogle:numBR(g(row,col.orcamento_google)), orcamentoFB:numBR(g(row,col.orcamento_fb)), metaLeadGoogle:numBR(g(row,col.meta_lead_google)), metaLeadFB:numBR(g(row,col.meta_lead_fb)) } });
  }
  controlCache = { at: Date.now(), clients };
  return clients;
}

function missingConfig() { return [!API_KEY() && "GOOGLE_SHEETS_API_KEY", !CONTROL_ID() && "CONTROL_SHEET_ID"].filter(Boolean); }

async function handleClients(req, res) {
  const miss = missingConfig(); if (miss.length) return sendJSON(res, 500, { error:"Configuração incompleta", missing: miss });
  try {
    const clients = await getClients(/[?&]force=1/.test(req.url));
    sendJSON(res, 200, { clients: clients.map(c => ({ slug:c.slug, nome:c.nome, mesRef:c.mesRef, hasMeta: !!c.metaAdAccount })) });
  } catch (e) { sendJSON(res, e.status||500, { error:e.message, detail:e.detail, hint:e.hint }); }
}

async function handleSheets(req, res) {
  const miss = missingConfig(); if (miss.length) return sendJSON(res, 500, { error:"Configuração incompleta", missing: miss });
  const q = url.parse(req.url, true).query || {};
  const slug = String(q.cliente||"").trim().toLowerCase();
  if (!slug) return sendJSON(res, 400, { error:"Cliente não informado", hint:"Use /api/sheets?cliente=slug" });
  try {
    const cli = (await getClients(false)).find(c => c.slug === slug);
    if (!cli) return sendJSON(res, 404, { error:"Cliente não encontrado na planilha de controle", slug });
    const range = q.range || cli.range;
    const data = await fetchSheet(cli.sheetId, cli.aba, range);
    res.setHeader("Cache-Control", "public, max-age=300");
    sendJSON(res, 200, { ...data, _meta: { fetchedAt:new Date().toISOString(), cliente:cli.slug, nome:cli.nome, sheetName:cli.aba, range, mesRef:cli.mesRef, metas:cli.metas, hasMeta:!!cli.metaAdAccount, rowsCount:(data.values||[]).length } });
  } catch (e) { sendJSON(res, e.status||500, { error:e.message, detail:e.detail, hint:e.hint }); }
}

/* ---------------- META ADS ---------------- */
async function metaGet(pathPart, params) {
  const usp = new URLSearchParams({ ...params, access_token: META_TOKEN() });
  const u = `https://graph.facebook.com/${META_VER()}/${pathPart}?${usp.toString()}`;
  const r = await fetch(u);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j && j.error)) { const e = new Error((j.error && j.error.message) || `Meta API ${r.status}`); e.status = r.status; e.detail = j.error || null; throw e; }
  return j;
}

const CONV_KEYS = ["lead", "purchase", "complete_registration", "offsite_conversion", "submit_application"];
function countConversions(actions) {
  if (!Array.isArray(actions)) return 0;
  let total = 0;
  for (const a of actions) {
    const t = String(a.action_type || "").toLowerCase();
    if (CONV_KEYS.some(k => t.includes(k))) total += Number(a.value) || 0;
  }
  return total;
}
function pickThumb(creative, imagesByHash) {
  if (!creative) return { thumb: "", isVideo: false };
  let isVideo = false, thumb = "";
  const afs = creative.asset_feed_spec;
  if (afs) {
    if (Array.isArray(afs.videos) && afs.videos.length) isVideo = true;
    if (Array.isArray(afs.images) && afs.images[0]) thumb = afs.images[0].url || (afs.images[0].hash && imagesByHash[afs.images[0].hash]) || thumb;
  }
  const oss = creative.object_story_spec;
  if (oss) {
    if (oss.video_data) { isVideo = true; thumb = thumb || oss.video_data.image_url || ""; }
    if (oss.link_data) {
      if (oss.link_data.picture) thumb = thumb || oss.link_data.picture;
      if (oss.link_data.image_hash && imagesByHash[oss.link_data.image_hash]) thumb = thumb || imagesByHash[oss.link_data.image_hash];
    }
  }
  if (!thumb && creative.image_url) thumb = creative.image_url;
  if (!thumb && creative.image_hash && imagesByHash[creative.image_hash]) thumb = imagesByHash[creative.image_hash];
  if (!thumb && creative.thumbnail_url) thumb = creative.thumbnail_url;
  return { thumb, isVideo };
}

async function handleMeta(req, res) {
  const miss = missingConfig(); if (miss.length) return sendJSON(res, 500, { error:"Configuração incompleta", missing: miss });
  const q = url.parse(req.url, true).query || {};
  const slug = String(q.cliente||"").trim().toLowerCase();
  if (!slug) return sendJSON(res, 400, { error:"Cliente não informado" });
  try {
    const cli = (await getClients(false)).find(c => c.slug === slug);
    if (!cli) return sendJSON(res, 404, { error:"Cliente não encontrado", slug });
    if (!META_TOKEN()) return sendJSON(res, 200, { configured:false, reason:"META_ACCESS_TOKEN não definido no servidor." });
    if (!cli.metaAdAccount) return sendJSON(res, 200, { configured:false, reason:"Cliente sem 'meta_ad_account' na planilha de controle." });

    let act = cli.metaAdAccount.replace(/\s/g, "");
    if (!act.startsWith("act_")) act = "act_" + act.replace(/^act_/, "");

    const today = new Date();
    const since = q.from || new Date(today.getTime() - 30*864e5).toISOString().slice(0,10);
    const until = q.to   || today.toISOString().slice(0,10);

    // 2 chamadas em paralelo (NÃO usar field expansion de insights — dá erro 400)
    const [adsResp, insResp] = await Promise.all([
      metaGet(`${act}/ads`, { fields: "id,name,status,creative{id,thumbnail_url,image_url,image_hash,object_story_spec,asset_feed_spec}", limit: "200" }),
      metaGet(`${act}/insights`, { level: "ad", time_range: JSON.stringify({ since, until }), fields: "ad_id,spend,actions,clicks,impressions,ctr", limit: "500" })
    ]);

    const insByAd = {};
    (insResp.data || []).forEach(i => { insByAd[i.ad_id] = i; });

    // resolver image_hash -> URL original
    const hashes = [];
    (adsResp.data || []).forEach(ad => {
      const c = ad.creative || {};
      if (c.image_hash) hashes.push(c.image_hash);
      if (c.object_story_spec && c.object_story_spec.link_data && c.object_story_spec.link_data.image_hash) hashes.push(c.object_story_spec.link_data.image_hash);
    });
    let imagesByHash = {};
    if (hashes.length) {
      try {
        const imgs = await metaGet(`${act}/adimages`, { hashes: JSON.stringify([...new Set(hashes)]), fields: "hash,url,permalink_url" });
        (imgs.data || []).forEach(im => { imagesByHash[im.hash] = im.url || im.permalink_url; });
      } catch (e) { /* segue sem original */ }
    }

    const creatives = (adsResp.data || []).map(ad => {
      const ins = insByAd[ad.id] || {};
      const conv = countConversions(ins.actions);
      const spend = Number(ins.spend) || 0;
      const { thumb, isVideo } = pickThumb(ad.creative, imagesByHash);
      return { id: ad.id, name: ad.name || "(sem nome)", status: ad.status || "UNKNOWN", thumb, isVideo,
        spend, conversions: conv, cpl: conv > 0 ? spend/conv : 0,
        clicks: Number(ins.clicks)||0, impressions: Number(ins.impressions)||0, ctr: Number(ins.ctr)||0 };
    });

    const totSpend = creatives.reduce((s,c)=>s+c.spend,0);
    const totConv  = creatives.reduce((s,c)=>s+c.conversions,0);
    res.setHeader("Cache-Control", "public, max-age=300");
    sendJSON(res, 200, { configured:true, cliente:cli.slug, nome:cli.nome, range:{since,until}, creatives,
      summary: { count: creatives.length, spend: totSpend, conversions: totConv, cpl: totConv>0 ? totSpend/totConv : 0 } });
  } catch (e) {
    sendJSON(res, e.status||500, { configured:true, error:e.message, detail:e.detail, hint:"Confira META_ACCESS_TOKEN (System User, permissões ads_read) e o meta_ad_account do cliente." });
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
    res.setHeader("Content-Type", MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    res.end(content);
  });
}
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") { res.setHeader("Access-Control-Allow-Origin","*"); res.statusCode = 204; return res.end(); }
  const pathname = url.parse(req.url).pathname;
  if (pathname === "/api/clients") return handleClients(req, res);
  if (pathname === "/api/sheets")  return handleSheets(req, res);
  if (pathname === "/api/meta")    return handleMeta(req, res);
  if (pathname === "/health") { res.statusCode = 200; return res.end("OK"); }
  serveStatic(req, res);
});
server.listen(PORT, () => console.log(`\u2713 Dashboard (multi-cliente + Meta) em http://localhost:${PORT}`));
