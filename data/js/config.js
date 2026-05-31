/* ============================================================
   CONFIG DO CLIENTE — sem credenciais!
   A API Key fica SÓ no servidor (variáveis de ambiente do Render).
   ============================================================ */
window.CONFIG = {
  proxyEndpoint: "/api/sheets",
  cacheTTL: 5 * 60 * 1000,        // 5 minutos
  cacheKey: "vc-sheets-cache",
  themeKey: "dashboard-theme",
  sheetName: "Diário Performance", // só exibição
  empreendimento: "Vila Campana",
  diasNoMes: 31
};
