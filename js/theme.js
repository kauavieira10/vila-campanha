/* ============================================================
   TEMA — toggle claro/escuro (escuro é padrão)
   O script anti-flash já roda no <head>. Aqui ficam toggle e ícone.
   ============================================================ */
window.Theme = {
  get() {
    try { return localStorage.getItem(CONFIG.themeKey) || 'dark'; }
    catch (e) { return document.documentElement.getAttribute('data-theme') || 'dark'; }
  },
  set(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(CONFIG.themeKey, t); } catch (e) {}
    this.syncIcon();
  },
  toggle() {
    this.set(this.get() === 'dark' ? 'light' : 'dark');
    if (window.__repaint) window.__repaint();
    else if (window.Charts && Charts.repaintAll) Charts.repaintAll();
  },
  syncIcon() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.innerHTML = this.get() === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>';
  },
  init() {
    this.syncIcon();
    const btn = document.getElementById('themeBtn');
    if (btn) btn.addEventListener('click', () => this.toggle());
  }
};
