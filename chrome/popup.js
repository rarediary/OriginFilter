const api=globalThis.browser??globalThis.chrome;
const defaults={enabled:true,keywords:[],blockedAccounts:[],languages:[],allowedCountries:["US"],accountCountries:{},strictUnknown:false};
const $=id=>document.getElementById(id);
api.storage.local.get(defaults,s=>{
 $("enabled").checked=s.enabled;$("strictUnknown").checked=s.strictUnknown;
 for(const k of ["keywords","blockedAccounts"])$(k).value=(s[k]||[]).join("\n");
 $("allowedCountries").value=(s.allowedCountries||[]).join(",");
 $("accountCountries").value=Object.entries(s.accountCountries||{}).map(([k,v])=>k+"="+v).join("\n");
 document.querySelectorAll('[name="lang"]').forEach(el=>el.checked=(s.languages||[]).includes(el.value));
});
$("save").onclick=()=>{
 const lines=k=>$(k).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const countries={};
 for(const line of lines("accountCountries")){
  const match=line.match(/^(instagram|facebook|x):([a-zA-Z0-9._]+)\s*=\s*([a-zA-Z]{2})$/);
  if(!match){$("status").textContent="Invalid account mapping: "+line;return;}
  countries[match[1]+":"+match[2].toLowerCase()]=match[3].toUpperCase();
 }
 const allowed=$("allowedCountries").value.split(",").map(s=>s.trim().toUpperCase()).filter(Boolean);
 if(allowed.some(s=>!/^[A-Z]{2}$/.test(s))){$("status").textContent="Use two-letter country codes, e.g. US";return;}
 api.storage.local.set({enabled:$("enabled").checked,strictUnknown:$("strictUnknown").checked,keywords:lines("keywords"),blockedAccounts:lines("blockedAccounts"),languages:[...document.querySelectorAll('[name="lang"]:checked')].map(e=>e.value),allowedCountries:allowed,accountCountries:countries},()=>{$("status").textContent="Saved";});
};