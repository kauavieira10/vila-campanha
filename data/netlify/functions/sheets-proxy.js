exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.URL || "*" // no Netlify a URL pública vem em process.env.URL
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  const API_KEY    = process.env.GOOGLE_SHEETS_API_KEY;
  const SHEET_ID   = process.env.GOOGLE_SHEETS_ID;
  const SHEET_NAME = process.env.GOOGLE_SHEETS_NAME || "Diário Performance";
  const RANGE      = process.env.GOOGLE_SHEETS_RANGE || "A1:Z200";

  if (!API_KEY || !SHEET_ID) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({
        error: "Configuração incompleta no Netlify",
        missing: [!API_KEY && "GOOGLE_SHEETS_API_KEY", !SHEET_ID && "GOOGLE_SHEETS_ID"].filter(Boolean)
      })
    };
  }

  const range = (event.queryStringParameters && event.queryStringParameters.range) || RANGE;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(`${SHEET_NAME}!${range}`)}?key=${API_KEY}`;

  try {
    const r = await fetch(url);
    if (!r.ok) {
      const detail = (await r.text()).substring(0, 500);
      return {
        statusCode: r.status, headers,
        body: JSON.stringify({
          error: `Google Sheets API ${r.status}`, detail,
          hint: r.status === 403 ? "Planilha não pública OU API Key com restrição de site/referrer (deixe None)."
              : r.status === 404 ? "ID errado (cole sem /edit e sem espaços)."
              : r.status === 400 ? "GOOGLE_SHEETS_NAME deve ser o nome da ABA (rodapé), não do arquivo."
              : null
        })
      };
    }
    const data = await r.json();
    return {
      statusCode: 200,
      headers: { ...headers, "Cache-Control": "public, max-age=300" },
      body: JSON.stringify({ ...data, _meta: { fetchedAt: new Date().toISOString(), sheetName: SHEET_NAME, range, rowsCount: (data.values || []).length } })
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Falha", detail: e.message }) };
  }
};
