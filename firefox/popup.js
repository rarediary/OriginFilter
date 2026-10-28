const api=globalThis.browser??globalThis.chrome;
const defaults={enabled:true,keywords:[],blockedAccounts:[],languages:[]};
const $=id=>document.getElementById(id);
api.storage.local.get(defaults,s=>{
 $('enabled').checked=s.enabled;
 for(const key of ['keywords','blockedAccounts']) $(key).value=(s[key]||[]).join('\n');
 document.querySelectorAll('[name="lang"]').forEach(el=>el.checked=(s.languages||[]).includes(el.value));
});
$('save').addEventListener('click',()=>{
 const lines=id=>$(id).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 api.storage.local.set({enabled:$('enabled').checked,keywords:lines('keywords'),blockedAccounts:lines('blockedAccounts'),languages:[...document.querySelectorAll('[name="lang"]:checked')].map(el=>el.value)},()=>{$('status').textContent='Saved';});
});