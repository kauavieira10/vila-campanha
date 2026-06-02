/* ============================================================
   CONFIG DO CLIENTE — sem credenciais!
   A API Key e a planilha de controle ficam SÓ no servidor.
   ============================================================ */
window.CONFIG = {
  clientsEndpoint: "/api/clients",
  proxyEndpoint: "/api/sheets",      // usar com ?cliente=slug
  cacheTTL: 5 * 60 * 1000,           // 5 minutos
  cachePrefix: "vc-sheets-cache:",   // + slug
  themeKey: "dashboard-theme"
};
