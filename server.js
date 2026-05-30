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
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".webp": "image/webp",
  ".ico":  "image/x-icon"
};

async function handleSheetsProxy(req, res) {
  const API_KEY    = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID   = process.env.GOOGLE_SHEETS_ID;
  const SHEET_NAME = process.env.GOOGLE_SHEETS_NAME || "Diário Performance";
  const RANGE      = process.env.GOOGLE_SHEETS_RANGE || "A1:Z200";

  if (!API_KEY || !SHEET_ID) {
    return sendJSON(res, 500, {
      error: "Configuração incompleta",
      missing: [
        !API_KEY && "GOOGLE_SHEETS_API_KEY",
        !SHEET_ID && "GOOGLE_SHEETS_ID"
      ].filter(Boolean),
      hint: "Defina as variáveis de ambiente no Render (Environment)."
    });
  }

  const parsed = url.parse(req.url, true);
  const range = (parsed.query && parsed.query.range) || RANGE;
  const fullRange = encodeURIComponent(`${SHEET_NAME}!${range}`);
  const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${fullRange}?key=${API_KEY}`;

  try {
    const response = await fetch(sheetsUrl);
    if (!response.ok) {
      const errorText = await response.text();
      return sendJSON(res, response.status, {
        error: `Google Sheets API ${response.status}`,
        detail: errorText.substring(0, 500),
        hint: response.status === 403 ? "Planilha não está pública ou a API Key não tem acesso à Sheets API."
            : response.status === 404 ? "Planilha ou aba não encontrada (confira ID e nome da aba)."
            : response.status === 400 ? "Range inválido OU GOOGLE_SHEETS_NAME está com o nome do ARQUIVO (deve ser o nome da ABA!)."
            : null
      });
    }
    const data = await response.json();
    res.setHeader("Cache-Control", "public, max-age=300");
    sendJSON(res, 200, {
      ...data,
      _meta: {
        fetchedAt: new Date().toISOString(),
        sheetName: SHEET_NAME,
        range,
        rowsCount: (data.values || []).length
      }
    });
  } catch (err) {
    sendJSON(res, 500, { error: "Falha ao consultar o Google Sheets", detail: err.message });
  }
}

function sendJSON(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", process.env.URL || "*");
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
    res.statusCode = 204;
    return res.end();
  }
  const parsed = url.parse(req.url);
  if (parsed.pathname === "/api/sheets") return handleSheetsProxy(req, res);
  if (parsed.pathname === "/health") { res.statusCode = 200; return res.end("OK"); }
  serveStatic(req, res);
});

server.listen(PORT, () => console.log(`\u2713 Dashboard Vila Campanha em http://localhost:${PORT}`));
