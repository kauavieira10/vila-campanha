/* ============================================================
   UTILS — formatadores pt-BR e helpers
   ============================================================ */
window.Utils = {
  brl: v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0),
  num: v => new Intl.NumberFormat('pt-BR').format(Number(v) || 0),
  pct: (v, dec = 1) => `${(Number(v) || 0).toFixed(dec).replace('.', ',')}%`,

  // "R$ 1.234,56" -> 1234.56 ; "87%" -> 87 ; "1.234" -> 1234
  parseNumber(raw) {
    if (raw === null || raw === undefined) return 0;
    if (typeof raw === 'number') return raw;
    let s = String(raw).trim();
    if (!s) return 0;
    s = s.replace(/r\$/i, '').replace(/%/g, '').replace(/\s/g, '');
    if (s.includes(',')) {
      // vírgula = decimal (pt-BR): pontos viram milhar
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      // só pontos, em grupos de 3 (ex: 2.600, 1.234.567) = separador de milhar
      s = s.replace(/\./g, '');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  },

  // "01/05/2026" -> Date | null
  parseBRDate(raw) {
    if (!raw) return null;
    const m = String(raw).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!m) return null;
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d));
    return isNaN(dt.getTime()) ? null : dt;
  },

  isoToLabel(iso) {
    const [, mo, d] = iso.split('-');
    return `${d}/${mo}`;
  },

  // cor lida das CSS variables (nunca hardcoded)
  cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  },

  hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  },

  clone(obj) { return JSON.parse(JSON.stringify(obj)); }
};
