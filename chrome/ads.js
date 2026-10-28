/* OriginFilter's opt-in, local-only sponsorship scheduler.
   Campaigns are packaged as static data; no remote executable code or user tracking. */
(function(root){
  'use strict';
  const INTERVAL = 12;
  const DAILY_CAP = 2;
  const COOLDOWN_MS = 30*60*1000;
  const STORAGE_LIMIT = 365;
  // Only add real campaigns after accepting payment and verifying the advertiser.
  // The public build deliberately contains no fake paid advertisements.
  const campaigns = [];
  function validate(c) {
    if(!c || typeof c!=='object')return null;
    const {id,advertiser,title,description,url}=c;
    if(![id,advertiser,title,description,url].every(v=>typeof v==='string'))return null;
    if(!/^[A-Za-z0-9_-]{2,50}$/.test(id) || advertiser.length>60 || !advertiser.trim() || !title.trim() || title.length>90 || description.length>180)return null;
    let parsed;try{parsed=new URL(url);}catch{return null;}
    if(parsed.protocol!=='https:' || parsed.username || parsed.password || !parsed.hostname || parsed.hostname==='localhost')return null;
    if(c.active!==true)return null;
    if(c.expires && (!Number.isFinite(Date.parse(c.expires)) || Date.parse(c.expires)<=Date.now()))return null;
    return {id,advertiser,title,description,url:parsed.href};
  }
  function usable(items=campaigns) {return Array.isArray(items)?items.map(validate).filter(Boolean):[];}
  function dateKey(now) {return new Date(now).toISOString().slice(0,10);}
  function advance(previous,now=Date.now(),optIn=false,items=campaigns){
    const ads=usable(items),date=dateKey(now);
    const prev=previous?.date===date ? previous : {date,blocked:0,shown:0,nextAt:0};
    const s={date,blocked:Math.max(0,Number(prev.blocked)||0),shown:Math.max(0,Number(prev.shown)||0),nextAt:Math.max(0,Number(prev.nextAt)||0)};
    if(!optIn || !ads.length)return {state:s,ad:null};
    s.blocked=Math.min(STORAGE_LIMIT*DAILY_CAP*INTERVAL,s.blocked+1);
    if(s.shown>=DAILY_CAP || s.blocked%INTERVAL!==0 || now<s.nextAt)return {state:s,ad:null};
    const ad=ads[(s.shown + Math.floor(s.blocked/INTERVAL)-1)%ads.length];
    s.shown++;s.nextAt=now+COOLDOWN_MS;
    return {state:s,ad};
  }
  function sample(){return {id:'example',advertiser:'Example business (demo)',title:'This is a sample sponsored placement',description:'The real release will only show verified, paying sponsors. No sponsor is active yet.',url:'https://example.com',active:true};}
  const exported={INTERVAL,DAILY_CAP,COOLDOWN_MS,validate,usable,dateKey,advance,sample,campaigns};
  root.OriginAds=exported;
  if(typeof module!=='undefined' && module.exports)module.exports=exported;
})(globalThis);
