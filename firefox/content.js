(() => {
"use strict";
const api=globalThis.browser??globalThis.chrome;
const defaults={enabled:true,keywords:[],blockedAccounts:[],languages:[],allowedCountries:["US"],accountCountries:{},strictUnknown:false};
let settings={...defaults};
const host=location.hostname.toLowerCase();
const site=host.endsWith("instagram.com")?"instagram":host.endsWith("facebook.com")?"facebook":(host.endsWith("x.com")||host.endsWith("twitter.com"))?"x":null;
if(!site)return;
const selector={instagram:"article",facebook:'[role="article"]',x:'[data-testid="tweet"]'}[site];
const scripts={arabic:/[\u0600-\u06ff]/u,devanagari:/[\u0900-\u097f]/u,cyrillic:/[\u0400-\u04ff]/u,han:/[\u3400-\u9fff]/u};
const hidden=new Map();
const clean=s=>String(s||"").replace(/^@/,"").trim().toLowerCase();
function author(el){
 if(site==="x"){const a=el.querySelector('[data-testid="User-Name"] a[href^="/"]');if(a)return clean(a.getAttribute("href").split("/")[1]);}
 for(const a of el.querySelectorAll("a[href]")){
  let u;try{u=new URL(a.href,location.href);}catch{continue;}
  if(!u.hostname.endsWith(host))continue;
  const p=u.pathname.split("/").filter(Boolean);
  if(site==="instagram"&&p.length===1&&!["p","reel","reels","explore","stories","direct","accounts"].includes(p[0]))return clean(p[0]);
  if(site==="facebook"&&p[0]==="profile.php"&&u.searchParams.has("id"))return clean(u.searchParams.get("id"));
  if(site==="x"&&p[1]==="status")return clean(p[0]);
 }
 return "";
}
function shouldHide(el){
 const text=(el.innerText||"").slice(0,12000),lower=text.toLowerCase();
 if((settings.keywords||[]).some(k=>k&&lower.includes(k.toLowerCase())))return true;
 const name=author(el);
 if(name&&(settings.blockedAccounts||[]).some(k=>clean(k)===name))return true;
 if((settings.languages||[]).some(k=>scripts[k]?.test(text)))return true;
 if((settings.allowedCountries||[]).length){
  const country=name&&settings.accountCountries?.[site+":"+name];
  if(country&&!settings.allowedCountries.includes(country.toUpperCase()))return true;
  if(!country&&settings.strictUnknown)return true;
 }
 return false;
}
function restore(el){
 const old=hidden.get(el);if(!old)return;
 if(old.value)el.style.setProperty("display",old.value,old.priority);else el.style.removeProperty("display");
 el.removeAttribute("data-originfilter-hidden");hidden.delete(el);
}
function scan(){
 if(!settings.enabled){for(const el of [...hidden.keys()])restore(el);return;}
 for(const el of document.querySelectorAll(selector)){
  if(shouldHide(el)){
   if(!hidden.has(el))hidden.set(el,{value:el.style.getPropertyValue("display"),priority:el.style.getPropertyPriority("display")});
   el.style.setProperty("display","none","important");el.setAttribute("data-originfilter-hidden","true");
  }else restore(el);
 }
 for(const el of [...hidden.keys()])if(!el.isConnected)hidden.delete(el);
}
let pending;const schedule=()=>{clearTimeout(pending);pending=setTimeout(scan,200);};
api.storage.local.get(defaults,s=>{settings={...defaults,...s};scan();});
api.storage.onChanged.addListener((changes,area)=>{if(area!=="local")return;for(const [key,value]of Object.entries(changes))if(key in defaults)settings[key]=value.newValue??defaults[key];schedule();});
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
})();