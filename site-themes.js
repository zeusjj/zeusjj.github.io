// Retire legacy theme preferences before the first paint.
(() => {
  document.documentElement.removeAttribute('data-theme');
  try { localStorage.removeItem('guild-site-theme-v1'); } catch {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = '#f6f8f9';
})();
