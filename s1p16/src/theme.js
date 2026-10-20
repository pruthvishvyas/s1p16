(function () {
  try {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    var preferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', saved || preferred);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
