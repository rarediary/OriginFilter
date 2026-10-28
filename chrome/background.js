/* Local language detection and opt-in, rate-limited public YouTube About lookups. */
'use strict';
if(typeof importScripts==='function') importScripts('core.js','ads.js');
const C=globalThis.OriginCore, Ads=globalThis.OriginAds;
const api=globalThis.browser ?? globalThis.chrome;
const promiseAPI=typeof globalThis.browser!=='undefined';
function call(object,method,...args) {
  if(promiseAPI)return object[method](...args);
  return new Promise((resolve,reject)=>object[method](...args,value=>{const error=api.runtime.lastError;error?reject(new Error(error.message)):resolve(value);}));
}
let settings=C.config(), records={}, limits={}, write=Promise.resolve(), generation=0;
const ready=call(api.storage.local,'get',null).then(all=>{settings=C.config(all.settings||all);records=all.originCache||{};limits=all.lookupLimits||{};
  for(const [key,value] of Object.entries(all.accountCountries||{})){const [site,...parts]=key.split(':');const normalized=C.accountKey(site,parts.join(':'));const code=C.country(value);if(normalized && code && !records[normalized])records[normalized]={country:code,source:'personal-override',checkedAt:Date.now(),expiresAt:Date.now()+C.DAY};}}).catch(()=>{});
const languages=new Map(), queue=new Map(); let pumping=false, sponsorshipQueue=Promise.resolve();
const campaignsReady=fetch(api.runtime.getURL('sponsor-catalog.json'))
  .then(response=>response.ok ? response.json():{campaigns:[]})
  .then(data=>Array.isArray(data?.campaigns)?data.campaigns:[]).catch(()=>[]);
async function sponsorOffer(sender,site) {
  if(!settings.enabled || !settings.sponsorPlacements || !validSender(sender,site))return {ad:null};
  const all=await call(api.storage.local,'get',{sponsorDaily:null});
  const campaigns=await campaignsReady;
  if(!Ads.usable(campaigns).length)return {ad:null};
  const result=Ads.advance(all.sponsorDaily,Date.now(),true,campaigns);
  await persist({sponsorDaily:result.state});
  return {ad:result.ad};
}
function persist(values){write=write.catch(()=>{}).then(()=>call(api.storage.local,'set',values));return write;}
async function put(key,value){
  records[key]=value;
  const entries=Object.entries(records).filter(([,r])=>C.fresh(r)).sort((a,b)=>b[1].checkedAt-a[1].checkedAt).slice(0,5000);
  records=Object.fromEntries(entries); await persist({originCache:records});
}
async function detect(text){
  const clean=C.cleanText(text); if(!clean)return null;
  if(languages.has(clean))return languages.get(clean);
  const request=Promise.race([call(api.i18n,'detectLanguage',clean),new Promise(resolve=>setTimeout(()=>resolve(null),2500))]).then(r=>C.language(r,clean)).catch(()=>null);
  languages.set(clean,request); if(languages.size>1000)languages.delete(languages.keys().next().value);
  return request;
}
async function mayLookup(){
  if(!settings.enabled || !settings.youtubeLookups) return false;
  if(promiseAPI && api.runtime.getManifest().browser_specific_settings?.gecko) {
    const p=await call(api.permissions,'getAll'); if(!p.data_collection?.includes('websiteContent'))return false;
  }
  return true;
}
async function readLimited(response,max=4000000){
  if(Number(response.headers.get('content-length'))>max)throw new Error('oversize');
  const reader=response.body.getReader();const decoder=new TextDecoder();let total=0,text='';
  try{while(true){const r=await reader.read();if(r.done)break;total+=r.value.byteLength;if(total>max)throw new Error('oversize');text+=decoder.decode(r.value,{stream:true});}return text+decoder.decode();}
  finally{await reader.cancel().catch(()=>{});}
}
function enqueue(id){
  const key=C.accountKey('youtube',id);if(!key || C.fresh(records[key]) || queue.has(key) || queue.size>=100)return;
  queue.set(key,id);void pump();
}
async function pump(){
  if(pumping)return;pumping=true;
  try {
    while(queue.size && await mayLookup()) {
      const now=Date.now(),date=new Date(now).toISOString().slice(0,10);
      if(limits.date!==date)limits={date,count:0,nextAt:limits.nextAt||0,cooldown:limits.cooldown||0};
      if(limits.count>=120 || limits.cooldown>now){queue.clear();break;}
      if(limits.nextAt>now){await new Promise(r=>setTimeout(r,Math.min(limits.nextAt-now,10000)));continue;}
      const [key,id]=queue.entries().next().value;queue.delete(key);
      if(C.fresh(records[key]))continue;
      const runGeneration=generation;
      limits={...limits,count:limits.count+1,nextAt:now+10000};await persist({lookupLimits:limits});
      const path=id.startsWith('UC') ? '/channel/'+encodeURIComponent(id) : '/'+encodeURIComponent(id);
      let value=null,reason='no-country-disclosed',ttl=12*60*60*1000;
      try {
        const response=await fetch('https://www.youtube.com'+path+'/about?hl=en',{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
        if([401,403,429].includes(response.status)){limits.cooldown=Date.now()+C.DAY;await persist({lookupLimits:limits});throw new Error('access-restricted');}
        if(!response.ok)throw new Error('http-error');
        value=C.youtubeCountry(await readLimited(response),id);
      } catch {reason='lookup-unavailable';ttl=60*60*1000;}
      // Consent revocation or a disabled extension invalidates outstanding results.
      if(runGeneration!==generation || !await mayLookup())continue;
      const stamp=Date.now();
      const record={country:value?.country||null,source:value?.source||reason,checkedAt:stamp,expiresAt:stamp+(value?7*C.DAY:ttl)};
      await put(key,record);
      if(value?.channelId && value.channelId!==id)await put(C.accountKey('youtube',value.channelId),record);
    }
  } catch {queue.clear();} finally{pumping=false;}
}
function validSender(sender,site){try{return sender.id===api.runtime.id && sender.tab && C.platform(new URL(sender.url).hostname)===site;}catch{return false;}}
async function handle(message,sender){
  await ready;
  if(message?.type==='of:classify') {
    const item=message.item;
    if(!item || !validSender(sender,item.site) || typeof item.text!=='string' || item.text.length>4000)return {error:'invalid-request'};
    const key=C.accountKey(item.site,item.author),record=key?C.fresh(records[key]):null;
    if(!record && item.site==='youtube' && settings.allowedCountries.length && settings.youtubeLookups && C.validId('youtube',item.author))enqueue(item.author);
    return {language:settings.englishOnly ? await detect(item.text) : null,country:record?.country||null,source:record?.source||'unknown',key};
  }
  if(message?.type==='of:sponsor-candidate') {
    if(!['x','facebook','youtube'].includes(message.site) || !validSender(sender,message.site))return {ad:null};
    const next=sponsorshipQueue.catch(()=>{}).then(()=>sponsorOffer(sender,message.site));
    sponsorshipQueue=next.catch(()=>{});return next;
  }
  if(message?.type==='of:x-disclosure') {
    if(!settings.enabled || !validSender(sender,'x') || !C.validId('x',message.author) || !C.country(message.country))return {error:'invalid-evidence'};
    const path=new URL(sender.url).pathname;
    if(path.toLowerCase()!=='/'+message.author.toLowerCase()+'/about')return {error:'wrong-page'};
    const now=Date.now();await put(C.accountKey('x',message.author),{country:C.country(message.country),source:'x-account-disclosure',checkedAt:now,expiresAt:now+C.DAY});return {ok:true};
  }
  if(message?.type==='of:clear-cache' && sender.id===api.runtime.id && sender.url?.startsWith(api.runtime.getURL(''))) {
    generation++;queue.clear();records={};languages.clear();await persist({originCache:{}});return {ok:true};
  }
  return {error:'unsupported-request'};
}
api.runtime.onMessage.addListener((message,sender,respond)=>{handle(message,sender).then(respond).catch(()=>respond({error:'unavailable'}));return true;});
api.storage.onChanged.addListener((changes,area)=>{
  if(area!=='local')return;
  if(changes.settings){settings=C.config(changes.settings.newValue);generation++;if(!settings.enabled||!settings.youtubeLookups)queue.clear();}
});
api.permissions?.onRemoved?.addListener(()=>{generation++;queue.clear();});
