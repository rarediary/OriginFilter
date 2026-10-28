/* OriginFilter — local decisions. No network, tracking, or country guesses. */
(function (root) {
  'use strict';
  const CODES = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));
  const DAY = 86400000;
  const DEFAULTS = Object.freeze({enabled:true, englishOnly:true, unknownLanguage:'show', allowedCountries:['US'], unknownCountry:'hide', keywords:[], blockedAccounts:[], youtubeLookups:false, showPlaceholders:true});
  const own = (o,k) => o != null && Object.prototype.hasOwnProperty.call(o,k);
  const list = v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean))].slice(0,500) : [];
  function config(v={}) {
    return {enabled:v.enabled !== false, englishOnly:v.englishOnly !== false,
      unknownLanguage:v.unknownLanguage === 'hide' ? 'hide' : 'show',
      allowedCountries: own(v,'allowedCountries') ? list(v.allowedCountries).map(x=>x.toUpperCase()).filter(x=>CODES.has(x)) : ['US'],
      unknownCountry: ['show','hide'].includes(v.unknownCountry) ? v.unknownCountry : own(v,'strictUnknown') ? (v.strictUnknown ? 'hide' : 'show') : v.unknownCountryPolicy === 'allow' ? 'show' : 'hide',
      keywords:list(v.keywords).map(x=>x.toLocaleLowerCase()), blockedAccounts:list(v.blockedAccounts),
      youtubeLookups:v.youtubeLookups === true, showPlaceholders:v.showPlaceholders !== false};
  }
  function platform(host) {
    host = String(host).toLowerCase();
    if (/(^|\.)(x|twitter)\.com$/.test(host)) return 'x';
    if (/(^|\.)facebook\.com$/.test(host)) return 'facebook';
    if (/(^|\.)youtube\.com$/.test(host)) return 'youtube';
    return null;
  }
  function validId(site,id) {
    if (typeof id !== 'string') return false;
    if (site === 'x') return /^[A-Za-z0-9_]{1,15}$/.test(id);
    if (site === 'facebook') return /^[A-Za-z0-9.]{1,100}$/.test(id);
    if (site === 'youtube') return /^UC[A-Za-z0-9_-]{22}$/.test(id) || /^@[\p{L}\p{N}_.\-·]{1,100}$/u.test(id);
    return false;
  }
  function accountKey(site,id) {
    if (!validId(site,id)) return null;
    return site + ':' + (site === 'youtube' && id.startsWith('UC') ? id : id.toLowerCase());
  }
  function accountFromUrl(href,site,base) {
    let u; try {u=new URL(href,base);} catch {return null;}
    if (u.protocol !== 'https:' || platform(u.hostname) !== site) return null;
    let p; try {p=u.pathname.split('/').filter(Boolean).map(decodeURIComponent);} catch {return null;}
    let id = null;
    if (site === 'x' && p.length && !['home','explore','search','notifications','messages','i','settings','compose','login','signup'].includes(p[0])) id=p[0];
    if (site === 'youtube') id=p[0]?.startsWith('@') ? p[0] : p[0] === 'channel' ? p[1] : null;
    if (site === 'facebook') {
      if(p[0]==='profile.php') id=u.searchParams.get('id');
      else if(p[0]==='groups' && p[2]==='user') id=p[3];
      else if(p.length===1 && !['watch','reel','reels','groups','events','marketplace','photo','photo.php','permalink.php','story.php','share','login','settings','gaming','friends','notifications','messages'].includes(p[0])) id=p[0];
    }
    return validId(site,id) ? id : null;
  }
  let countryNames;
  function country(value) {
    if (typeof value !== 'string') return null;
    const text=value.trim();
    if(CODES.has(text.toUpperCase())) return text.toUpperCase();
    if(!countryNames) {
      countryNames=new Map([['united states of america','US'],['usa','US'],['uk','GB'],['south korea','KR'],['north korea','KP'],['russia','RU'],['turkey','TR']]);
      try {const names=new Intl.DisplayNames(['en'],{type:'region'}); for(const code of CODES) countryNames.set(names.of(code).toLowerCase(),code);} catch {}
    }
    return countryNames.get(text.toLowerCase()) || null;
  }
  function cleanText(text) {return String(text||'').slice(0,8000).replace(/https?:\/\/\S+|www\.\S+|@[\p{L}\p{N}_.]+/gu,' ').replace(/\s+/g,' ').trim().slice(0,4000);}
  function language(result,text) {
    if((cleanText(text).match(/\p{L}/gu)||[]).length<16 || result?.isReliable !== true) return null;
    const items=(result.languages||[]).filter(x=>typeof x.language==='string' && Number.isFinite(x.percentage)).sort((a,b)=>b.percentage-a.percentage);
    const top=items[0];
    return top && top.percentage>=80 && !['und','unknown','un'].includes(top.language) ? top.language.toLowerCase().split('-')[0] : null;
  }
  function fresh(record,now=Date.now()) {
    return record && Number.isFinite(record.expiresAt) && record.expiresAt>now && record.expiresAt<=now+32*DAY ? record : null;
  }
  function decide(item,result,cfg) {
    if(!cfg.enabled) return '';
    const lower=String(item.text||'').toLowerCase();
    if(cfg.keywords.some(x=>lower.includes(x))) return 'keyword';
    const key=accountKey(item.site,item.author);
    if(cfg.blockedAccounts.some(x=> x === key || x.replace(/^@/,'').toLowerCase() === String(item.author||'').replace(/^@/,'').toLowerCase())) return 'account';
    if(cfg.englishOnly) {
      if(result.language && result.language !== 'en') return 'language';
      if(!result.language && cfg.unknownLanguage === 'hide') return 'unknown-language';
    }
    if(cfg.allowedCountries.length) {
      if(result.country && !cfg.allowedCountries.includes(result.country)) return 'country';
      if(!result.country && cfg.unknownCountry==='hide') return 'unknown-country';
    }
    return '';
  }
  function textValue(v) {return typeof v === 'string' ? v : v?.simpleText || v?.content || (Array.isArray(v?.runs) ? v.runs.map(x=>x.text||'').join('') : '');}
  // Extract only a literal JSON assignment. Never execute remotely supplied JS.
  function initialData(html) {
    if(typeof html!=='string' || html.length>4000000) return null;
    const re=/(?:var\s+ytInitialData|window\s*\[\s*["']ytInitialData["']\s*\]|\bytInitialData)\s*=\s*/g;
    let m; while((m=re.exec(html))) {
      let i=re.lastIndex; if(html[i]!=='{') continue;
      const start=i; let depth=0, quoted=false, escape=false;
      for(;i<html.length;i++) {
        const ch=html[i];
        if(quoted) {if(escape) escape=false; else if(ch==='\\') escape=true; else if(ch==='"') quoted=false; continue;}
        if(ch==='"') quoted=true; else if(ch==='{') depth++; else if(ch==='}' && --depth===0) {try{return JSON.parse(html.slice(start,i+1));}catch{break;}}
      }
    }
    return null;
  }
  function youtubeCountry(html,requested) {
    const root=initialData(html); if(!root) return null;
    const pending=[root], countries=new Set(), ids=new Set(); let visited=0;
    while(pending.length && visited++<60000) {
      const obj=pending.pop(); if(!obj || typeof obj!=='object') continue;
      const meta=obj.channelMetadataRenderer;
      if(meta && validId('youtube',meta.externalId) && meta.externalId.startsWith('UC')) ids.add(meta.externalId);
      for(const key of ['aboutChannelViewModel','channelAboutFullMetadataRenderer']) {
        if(obj[key]) {const c=country(textValue(obj[key].country)); if(c)countries.add(c);}
      }
      for(const value of Object.values(obj)) if(value && typeof value==='object') pending.push(value);
    }
    // A channel identity plus an explicit About field is required; do not use visitor-region settings.
    if(ids.size!==1 || countries.size!==1) return null;
    const id=[...ids][0]; if(requested?.startsWith('UC') && requested!==id) return null;
    return {country:[...countries][0], channelId:id, source:'youtube-declared-country'};
  }
  const api={DAY,CODES,DEFAULTS,own,config,platform,validId,accountKey,accountFromUrl,country,cleanText,language,fresh,decide,initialData,youtubeCountry};
  root.OriginCore=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(globalThis);
