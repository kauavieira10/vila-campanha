/* ============================================================
   DATASET DE FALLBACK
   Dados reais de Maio/2026 (extraídos do PDF). Usado quando a API
   do Google Sheets não responde — para o painel nunca abrir vazio.
   ============================================================ */
window.FALLBACK_DATASET = {
  meta: {
    mesRef: "Maio de 2026",
    orcamentoTotal: 2600,
    orcamentoGoogle: 1300,
    orcamentoFB: 1300,
    metaLeadGoogle: 232,
    metaLeadFB: 178,
    metaLeadTotal: 410,
    metaCPL: 6.34,
    metaCPLGoogle: 5.60,
    metaCPLFB: 7.30
  },
  // vG=verba Google, lG=leads Google, vF=verba FB, lF=leads FB, cF=CPL FB, tot=leads acumulados, m=%meta, r=%mês
  rows: [
    { d: "2026-05-01", dia: "sexta-feira",    vG: 69.13, lG: 4,  vF: 0.23,  lF: 2, cF: 0.12,  tot: 6,   m: 1,  r: 3 },
    { d: "2026-05-02", dia: "sábado",         vG: 65.48, lG: 5,  vF: 0.03,  lF: 0, cF: 0.00,  tot: 11,  m: 3,  r: 6 },
    { d: "2026-05-03", dia: "domingo",        vG: 65.10, lG: 11, vF: 19.74, lF: 2, cF: 9.87,  tot: 24,  m: 6,  r: 10 },
    { d: "2026-05-04", dia: "segunda-feira",  vG: 60.65, lG: 4,  vF: 49.11, lF: 5, cF: 9.82,  tot: 33,  m: 8,  r: 13 },
    { d: "2026-05-05", dia: "terça-feira",    vG: 47.55, lG: 4,  vF: 43.61, lF: 8, cF: 5.45,  tot: 45,  m: 11, r: 16 },
    { d: "2026-05-06", dia: "quarta-feira",   vG: 50.49, lG: 3,  vF: 27.66, lF: 2, cF: 13.83, tot: 50,  m: 12, r: 19 },
    { d: "2026-05-07", dia: "quinta-feira",   vG: 54.94, lG: 3,  vF: 40.27, lF: 6, cF: 6.71,  tot: 59,  m: 14, r: 23 },
    { d: "2026-05-08", dia: "sexta-feira",    vG: 52.50, lG: 3,  vF: 40.62, lF: 2, cF: 20.31, tot: 64,  m: 16, r: 26 },
    { d: "2026-05-09", dia: "sábado",         vG: 75.16, lG: 5,  vF: 49.72, lF: 5, cF: 9.94,  tot: 74,  m: 18, r: 29 },
    { d: "2026-05-10", dia: "domingo",        vG: 64.21, lG: 5,  vF: 48.67, lF: 5, cF: 9.73,  tot: 83,  m: 20, r: 32 },
    { d: "2026-05-11", dia: "segunda-feira",  vG: 46.33, lG: 8,  vF: 64.54, lF: 5, cF: 12.91, tot: 96,  m: 24, r: 35 },
    { d: "2026-05-12", dia: "terça-feira",    vG: 52.50, lG: 3,  vF: 49.12, lF: 5, cF: 9.82,  tot: 104, m: 25, r: 39 },
    { d: "2026-05-13", dia: "quarta-feira",   vG: 75.16, lG: 5,  vF: 43.61, lF: 8, cF: 5.45,  tot: 118, m: 29, r: 42 },
    { d: "2026-05-14", dia: "quinta-feira",   vG: 64.21, lG: 5,  vF: 28.02, lF: 2, cF: 14.01, tot: 124, m: 30, r: 45 },
    { d: "2026-05-15", dia: "sexta-feira",    vG: 46.33, lG: 9,  vF: 40.44, lF: 6, cF: 6.74,  tot: 139, m: 34, r: 48 },
    { d: "2026-05-16", dia: "sábado",         vG: 54.80, lG: 6,  vF: 40.63, lF: 2, cF: 20.32, tot: 147, m: 36, r: 52 },
    { d: "2026-05-17", dia: "domingo",        vG: 40.45, lG: 7,  vF: 49.84, lF: 5, cF: 9.97,  tot: 159, m: 39, r: 55 },
    { d: "2026-05-18", dia: "segunda-feira",  vG: 92.03, lG: 6,  vF: 49.28, lF: 5, cF: 9.86,  tot: 170, m: 42, r: 58 },
    { d: "2026-05-19", dia: "terça-feira",    vG: 57.93, lG: 5,  vF: 64.54, lF: 5, cF: 12.91, tot: 180, m: 44, r: 61 },
    { d: "2026-05-20", dia: "quarta-feira",   vG: 59.15, lG: 5,  vF: 60.67, lF: 6, cF: 10.11, tot: 191, m: 47, r: 65 },
    { d: "2026-05-21", dia: "quinta-feira",   vG: 72.49, lG: 9,  vF: 45.82, lF: 8, cF: 5.73,  tot: 208, m: 51, r: 68 },
    { d: "2026-05-22", dia: "sexta-feira",    vG: 41.21, lG: 6,  vF: 37.84, lF: 7, cF: 5.41,  tot: 221, m: 54, r: 71 },
    { d: "2026-05-23", dia: "sábado",         vG: 45.06, lG: 3,  vF: 13.37, lF: 4, cF: 3.34,  tot: 228, m: 56, r: 74 },
    { d: "2026-05-24", dia: "domingo",        vG: 55.15, lG: 1,  vF: 38.07, lF: 1, cF: 38.07, tot: 230, m: 56, r: 77 },
    { d: "2026-05-25", dia: "segunda-feira",  vG: 84.59, lG: 4,  vF: 37.40, lF: 1, cF: 37.40, tot: 235, m: 57, r: 81 },
    { d: "2026-05-26", dia: "terça-feira",    vG: 66.46, lG: 7,  vF: 38.09, lF: 3, cF: 12.70, tot: 244, m: 60, r: 84 },
    { d: "2026-05-27", dia: "quarta-feira",   vG: 57.28, lG: 9,  vF: 35.03, lF: 7, cF: 5.00,  tot: 260, m: 64, r: 87 },
    { d: "2026-05-28", dia: "quinta-feira",   vG: 54.66, lG: 6,  vF: 33.36, lF: 1, cF: 33.36, tot: 267, m: 65, r: 90 },
    { d: "2026-05-29", dia: "sexta-feira",    vG: 50.20, lG: 7,  vF: 28.95, lF: 6, cF: 4.83,  tot: 280, m: 68, r: 94 },
    { d: "2026-05-30", dia: "sábado",         vG: 0,     lG: 0,  vF: 0,     lF: 0, cF: 0.00,  tot: 280, m: 68, r: 97 }
  ]
};
