'use strict';
const api=globalThis.browser??globalThis.chrome,C=OriginCore,$=id=>document.getElementById(id);
function call(o,m,...args){if(typeof globalThis.browser!=='undefined')return o[m](...args);return new Promise((res,rej)=>o[m](...args,v=>{const e=api.runtime.lastError;e?rej(new Error(e.message)):res(v);}));}
let loaded=false;
function fill(cfg){for(const key of ['enabled','englishOnly','youtubeLookups','showPlaceholders'])$(key).checked=cfg[key];for(const key of ['unknownCountry','unknownLanguage'])$(key).value=cfg[key];$('allowedCountries').value=cfg.allowedCountries.join(', ');for(const key of ['keywords','blockedAccounts'])$(key).value=cfg[key].join('\n');}
async function refresh(){const saved=await call(api.storage.local,'get',null);fill(C.config(saved.settings||saved));$('cache').textContent=Object.keys(saved.originCache||{}).length+' cached account records';loaded=true;}
refresh().catch(()=>{$('status').textContent='Could not read settings. Reload the extension.';});
call(api.tabs,'query',{active:true,currentWindow:true}).then(tabs=>tabs[0]?.id ? call(api.tabs,'sendMessage',tabs[0].id,{type:'of:stats'}) : null).then(s=>{if(s)$('stats').textContent=`${s.site}: ${s.hidden} of ${s.cards} detected cards hidden on this page.`;}).catch(()=>{});
$('settings').addEventListener('submit',async event=>{
  event.preventDefault();if(!loaded)return;
  const countries=$('allowedCountries').value.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
  if(countries.some(x=>!C.CODES.has(x))){$('status').textContent='Use valid country codes such as US, CA, GB.';return;}
  const consent=$('youtubeLookups').checked;
  // Must be invoked during the user's click, before other awaited operations.
  const permission=consent && api.runtime.getManifest().browser_specific_settings?.gecko ? call(api.permissions,'request',{data_collection:['websiteContent']}) : Promise.resolve(true);
  $('save').disabled=true;
  try{
    if(!await permission){$('youtubeLookups').checked=false;$('status').textContent='YouTube lookups were not enabled. Consent is required.';return;}
    const lines=id=>$(id).value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const settings=C.config({enabled:$('enabled').checked,englishOnly:$('englishOnly').checked,youtubeLookups:consent,showPlaceholders:$('showPlaceholders').checked,allowedCountries:countries,unknownCountry:$('unknownCountry').value,unknownLanguage:$('unknownLanguage').value,keywords:lines('keywords'),blockedAccounts:lines('blockedAccounts')});
    await call(api.storage.local,'set',{settings});$('status').textContent='Saved. Open feeds update automatically.';
  }catch{$('status').textContent='Could not save. Check the extension permissions.';}finally{$('save').disabled=false;}
});
$('enabled').addEventListener('change',async()=>{if(!loaded)return;try{const saved=await call(api.storage.local,'get',null);await call(api.storage.local,'set',{settings:{...C.config(saved.settings||saved),enabled:$('enabled').checked}});}catch{$('status').textContent='Could not change filtering.';}});
$('clear').addEventListener('click',async()=>{try{await call(api.runtime,'sendMessage',{type:'of:clear-cache'});$('cache').textContent='Country cache cleared.';}catch{$('status').textContent='Could not clear cache.';}});
