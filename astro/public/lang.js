(() => {
  function setLangCookie(lang) {
    // 1 year, site-wide. Server can use this to skip geo-based redirects.
    document.cookie = `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('[data-lang-switch]');
    if (!link) return;
    const lang = link.getAttribute('data-lang-switch');
    if (!lang) return;
    try {
      setLangCookie(lang);
    } catch {}
  });
})();

