// OriginFilter prototype: local keyword filtering for supported social feeds.
const browserApi = globalThis.browser ?? globalThis.chrome;
let rules = {enabled:true, keywords:[]};
const selector = location.hostname.endsWith("instagram.com") ? "article" :
  location.hostname.endsWith("facebook.com") ? '[role="article"]' :
  (location.hostname.endsWith("x.com") || location.hostname.endsWith("twitter.com")) ? '[data-testid="tweet"]' : null;
if (selector) {
  const hidden = new Set();
  function scan() {
    document.querySelectorAll(selector).forEach(post => {
      const text = (post.innerText || "").toLocaleLowerCase();
      const block = rules.enabled && rules.keywords.some(word => word && text.includes(word.toLocaleLowerCase()));
      if (block) {
        post.style.setProperty("display","none","important");
        hidden.add(post);
      } else if (hidden.has(post)) {
        post.style.removeProperty("display");
        hidden.delete(post);
      }
    });
  }
  let pending;
  const schedule = () => { clearTimeout(pending); pending = setTimeout(scan,200); };
  browserApi.storage.local.get(rules, stored => { rules = {...rules,...stored}; scan(); });
  browserApi.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const [key,value] of Object.entries(changes)) if (key in rules) rules[key]=value.newValue;
    schedule();
  });
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
}
