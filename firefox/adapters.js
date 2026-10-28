/* Site-specific DOM extraction. No private messages, profile crawls, or image analysis. */
(function(root){
  'use strict';
  const C=root.OriginCore || (typeof require==='function' ? require('./core.js') : null);
  const selectors={x:'article[data-testid="tweet"], [data-testid="tweet"]', facebook:'[role="article"]', youtube:'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model'};
  const blockedContext='[contenteditable="true"], [role="textbox"], ytd-ad-slot-renderer, ytd-promoted-video-renderer, ytd-display-ad-renderer, [data-testid="placementTracking"]';
  function isCard(el,site) {
    if(!el?.matches?.(selectors[site]) || el.closest(blockedContext)) return false;
    if(el.parentElement?.closest(selectors[site])) return false;
    if(site==='facebook' && el.closest('[role="dialog"], [role="complementary"]')) return false;
    if(site==='youtube' && !el.querySelector('a[href*="/watch?"], a[href^="/shorts/"]')) return false;
    return true;
  }
  function ownNodes(card,selector,site) {return [...card.querySelectorAll(selector)].filter(n=>n.closest(selectors[site])===card || (site==='youtube' && card.contains(n)));}
  function extract(card,site,base) {
    let text='',links=[],postId='';
    if(site==='x') {
      text=ownNodes(card,'[data-testid="tweetText"]',site).map(n=>n.textContent).join(' ');
      links=ownNodes(card,'[data-testid="User-Name"] a[href]',site);
      const status=links.find(a=>/\/status\/\d+/.test(a.getAttribute('href')||'')); postId=status?.getAttribute('href')||'';
    } else if(site==='facebook') {
      text=ownNodes(card,'[data-ad-preview="message"], [data-ad-comet-preview="message"]',site).map(n=>n.textContent).join(' ');
      links=ownNodes(card,'h2 a[href], h3 a[href], strong a[href]',site);
      postId=card.getAttribute('data-ft')||card.id||'';
    } else {
      text=(card.querySelector('#video-title, #video-title-link, h3 a, .yt-lockup-metadata-view-model__title')?.textContent||'').trim();
      links=[...card.querySelectorAll('ytd-channel-name a[href], #channel-name a[href], .yt-content-metadata-view-model__metadata-text a[href], a[href^="/@"], a[href^="/channel/"]')];
      postId=card.querySelector('a[href*="/watch?"], a[href^="/shorts/"]')?.getAttribute('href')||'';
    }
    let author=null;
    for(const a of links) {author=C.accountFromUrl(a.getAttribute('href'),site,base); if(author) break;}
    return {site,author,text:C.cleanText(text),postId};
  }
  function xDisclosure(doc,url) {
    let u;try{u=new URL(url);}catch{return null;}
    if(C.platform(u.hostname)!=='x') return null;
    const route=u.pathname.match(/^\/([a-zA-Z0-9_]{1,15})\/about\/?$/);
    if(!route)return null;
    const main=doc.querySelector('main'); if(!main)return null;
    // Read disclosure rows only, never a tweet, biography, or arbitrary country mention.
    const text=main.textContent||'';
    if(!/About this account/i.test(text) || /may (?:not be|be in)accurate|proxy|VPN/i.test(text))return null;
    for(const label of main.querySelectorAll('span,div')) {
      if(label.children.length || label.textContent.trim()!=='Account based in' || label.closest('[data-testid="tweet"]'))continue;
      let row=label.parentElement;
      for(let level=0;row && level<3;level++,row=row.parentElement) {
        const leaves=[...row.querySelectorAll('span,div')].filter(n=>!n.children.length).map(n=>n.textContent.trim());
        const i=leaves.indexOf('Account based in');
        const found=i>=0 ? C.country(leaves[i+1]) : null;
        if(found)return {author:route[1],country:found,source:'x-account-disclosure'};
      }
    }
    return null;
  }
  const api={selectors,isCard,extract,xDisclosure}; root.OriginAdapters=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(globalThis);
