/* Incremental feed filtering. Only changed cards are reclassified; no scrolling crawler. */
(() => {
  'use strict';
  if(globalThis.__originFilter06)return;globalThis.__originFilter06=true;
  const C=OriginCore,A=OriginAdapters,api=globalThis.browser??globalThis.chrome;
  const site=C.platform(location.hostname);if(!site)return;
  const selector=A.selectors[site],states=new Map(),dirty=new Set();
  let cfg=C.config(),epoch=0,scheduled=false,running=0,href=location.href,initialized=false,lastDisclosure='';
  function call(object,method,...args){
    if(typeof globalThis.browser!=='undefined')return object[method](...args);
    return new Promise((resolve,reject)=>object[method](...args,value=>{const e=api.runtime.lastError;e?reject(new Error(e.message)):resolve(value);}));
  }
  function routeAllowed(){return !/^\/(messages|i\/chat|direct|notifications|settings|login)(\/|$)/.test(location.pathname);}
  function notice(st,label){
    if(!cfg.showPlaceholders){st.notice?.remove();st.notice=null;return;}
    if(!st.notice){
      const host=document.createElement('div');host.className='originfilter-notice';
      host.setAttribute('data-originfilter-ui','true');
      const shadow=host.attachShadow({mode:'closed'});
      const style=document.createElement('style');style.textContent=':host{display:block!important;margin:6px 0!important}div{font:12px system-ui;color:#cbd5e1;background:#151e2c;border:1px solid #344155;border-radius:8px;padding:10px;display:flex;align-items:center;gap:12px;justify-content:space-between}button{font:inherit;color:#b7d5ff;background:transparent;border:1px solid #65758c;border-radius:5px;padding:4px 8px;cursor:pointer}';
      const box=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');
      button.type='button';button.textContent='Show once';
      button.addEventListener('click',()=>{st.showOnce=st.fingerprint;render(st,'');});
      box.append(text,button);shadow.append(style,box);st.notice=host;st.label=text;
    }
    st.label.textContent='OriginFilter · '+label;
    if(st.el.previousSibling!==st.notice)st.el.before(st.notice);
  }
  const labels={'keyword':'Blocked keyword','account':'Blocked account','language':'Not English','unknown-language':'Language unknown','country':'Outside selected countries','unknown-country':'Country unknown'};
  function render(st,reason){
    st.reason=reason;
    if(!reason){st.el.removeAttribute('data-originfilter-blocked');st.notice?.remove();st.notice=null;return;}
    st.el.setAttribute('data-originfilter-blocked',reason);notice(st,labels[reason]||reason);
  }
  function cleanup(){
    for(const [el,st] of states)if(!el.isConnected || !A.isCard(el,site)){render(st,'');states.delete(el);dirty.delete(el);}
  }
  function add(el){if(el?.nodeType!==1 || el.closest?.('[data-originfilter-ui]'))return;
    const closest=el.closest(selector);if(closest && A.isCard(closest,site))dirty.add(closest);
    if(A.isCard(el,site))dirty.add(el);
    for(const card of el.querySelectorAll(selector))if(A.isCard(card,site))dirty.add(card);
  }
  function all(){if(routeAllowed())add(document.documentElement);schedule();}
  function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;drain();},60);}
  function disclosure(){
    if(site!=='x' || !cfg.enabled)return;
    const value=A.xDisclosure(document,location.href);if(!value)return;
    const signature=value.author+':'+value.country;if(signature===lastDisclosure)return;lastDisclosure=signature;
    call(api.runtime,'sendMessage',{type:'of:x-disclosure',...value}).catch(()=>{});
  }
  function drain(){
    cleanup();
    if(href!==location.href){href=location.href;epoch++;lastDisclosure='';for(const st of states.values())render(st,'');if(routeAllowed())add(document.documentElement);}
    if(!initialized)return;
    if(!cfg.enabled || !routeAllowed()){for(const st of states.values())render(st,'');dirty.clear();return;}
    disclosure();
    let count=0;
    while(dirty.size && running<4 && count++<20){
      const el=dirty.values().next().value;dirty.delete(el);if(!el.isConnected || !A.isCard(el,site))continue;
      const item=A.extract(el,site,location.href),fingerprint=JSON.stringify(item);
      let st=states.get(el);
      if(!st){st={el,token:0,reason:'',fingerprint:'',epoch:-1,notice:null};states.set(el,st);}
      if(st.fingerprint===fingerprint && st.epoch===epoch)continue;
      if(st.fingerprint!==fingerprint)st.showOnce=null;
      st.fingerprint=fingerprint;st.epoch=epoch;st.author=item.author;st.key=C.accountKey(site,item.author);
      const token=++st.token,requestEpoch=epoch;
      if(st.showOnce===fingerprint){render(st,'');continue;}
      // Strict mode masks unknown cards while classification is pending.
      render(st,C.decide(item,{language:null,country:null},cfg));running++;
      call(api.runtime,'sendMessage',{type:'of:classify',item}).then(result=>{
        if(st.token!==token || requestEpoch!==epoch || !el.isConnected || st.showOnce===fingerprint)return;
        st.result=result||{};render(st,C.decide(item,st.result,cfg));
      }).catch(()=>{if(st.token===token && requestEpoch===epoch)render(st,C.decide(item,{},cfg));})
        .finally(()=>{running--;schedule();});
    }
    if(dirty.size && running<4)schedule();
  }
  call(api.storage.local,'get',null).then(all=>{cfg=C.config(all.settings||all);initialized=true;allCards();}).catch(()=>{initialized=true;allCards();});
  function allCards(){all();}
  api.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if(changes.settings){cfg=C.config(changes.settings.newValue);epoch++;for(const st of states.values())st.showOnce=null;all();}
    else if(changes.originCache){
      const old=changes.originCache.oldValue||{},next=changes.originCache.newValue||{};
      for(const st of states.values())if(st.key && JSON.stringify(old[st.key])!==JSON.stringify(next[st.key])){st.epoch=-1;dirty.add(st.el);}
      schedule();
    }
  });
  api.runtime.onMessage.addListener((message,sender,respond)=>{
    if(message?.type!=='of:stats')return false;
    cleanup();const counts={};for(const st of states.values())if(st.reason)counts[st.reason]=(counts[st.reason]||0)+1;
    respond({site,cards:states.size,hidden:Object.values(counts).reduce((a,b)=>a+b,0),counts});return false;
  });
  const observer=new MutationObserver(changes=>{
    for(const change of changes){
      if(change.target.parentElement?.closest('[data-originfilter-ui]'))continue;
      const target=change.target.nodeType===1?change.target:change.target.parentElement;
      const card=target?.closest?.(selector);if(card && A.isCard(card,site))dirty.add(card);
      for(const node of change.addedNodes)add(node);
    }
    if(dirty.size || href!==location.href || states.size || (site==='x' && /\/about\/?$/.test(location.pathname)))schedule();
  });
  observer.observe(document,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','lang']});
  addEventListener('popstate',all);addEventListener('yt-navigate-finish',all);
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',all,{once:true});else all();
})();
