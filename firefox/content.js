(() => {
  "use strict";
  const api = globalThis.browser ?? globalThis.chrome;
  const defaults = {enabled:true, keywords:[], blockedAccounts:[], languages:[]};
  let settings = {...defaults};
  const hidden = new Set();
  const selectors = {
    instagram: 'article',
    facebook: '[role="article"]',
    x: '[data-testid="tweet"]'
  };
  const host = location.hostname;
  const selector = host.endsWith('instagram.com') ? selectors.instagram :
    host.endsWith('facebook.com') ? selectors.facebook :
    (host.endsWith('x.com') || host.endsWith('twitter.com')) ? selectors.x : null;
  if (!selector) return;

  // Unicode script detection is deliberately conservative: it does not infer nationality.
  const scripts = {
    arabic: /[\u0600-\u06ff]/u,
    devanagari: /[\u0900-\u097f]/u,
    cyrillic: /[\u0400-\u04ff]/u,
    han: /[\u3400-\u9fff]/u
  };
  function blocked(el) {
    const text = (el.innerText || '').slice(0, 20000);
    const lower = text.toLocaleLowerCase();
    if (settings.keywords.some(k => k && lower.includes(k.toLocaleLowerCase()))) return true;
    const links = [...el.querySelectorAll('a[href]')].map(a => {
      try { return new URL(a.href).pathname.toLowerCase(); } catch { return ''; }
    });
    if (settings.blockedAccounts.some(account => {
      const name = account.replace(/^@/, '').toLowerCase().trim();
      return name && links.some(path => path === '/' + name || path.startsWith('/' + name + '/'));
    })) return true;
    return settings.languages.some(lang => scripts[lang]?.test(text));
  }
  function scan() {
    if (!settings.enabled) {
      for (const el of hidden) { el.style.removeProperty('display'); el.removeAttribute('data-originfilter-hidden'); }
      hidden.clear();
      return;
    }
    document.querySelectorAll(selector).forEach(el => {
      const shouldHide = blocked(el);
      if (shouldHide) {
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute('data-originfilter-hidden', 'true');
        hidden.add(el);
      } else if (hidden.has(el)) {
        el.style.removeProperty('display');
        el.removeAttribute('data-originfilter-hidden');
        hidden.delete(el);
      }
    });
  }
  let timer;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(scan, 180); };
  api.storage.local.get(defaults, value => { settings = {...defaults, ...value}; scan(); });
  api.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const [key, change] of Object.entries(changes)) if (key in defaults) settings[key] = change.newValue ?? defaults[key];
    schedule();
  });
  new MutationObserver(schedule).observe(document.documentElement, {childList:true,subtree:true,characterData:true});
})();