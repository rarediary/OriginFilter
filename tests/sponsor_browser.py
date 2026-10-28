"""Synthetic Chromium integration test for consented, labeled sponsored notices.
No real advertisers, network submissions, or logged-in feeds are involved.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
MOCK=r'''(() => {
 const hooks=[];
 window.mockConsent=true;
 window.mockSettings={enabled:true,englishOnly:false,allowedCountries:['US'],unknownCountry:'hide',unknownLanguage:'show',sponsorPlacements:true,showPlaceholders:true,keywords:[],blockedAccounts:[],youtubeLookups:false};
 window.totalCandidates=0;
 const orig=Element.prototype.attachShadow;
 Element.prototype.attachShadow=function(options){return orig.call(this,{...options,mode:'open'});};
 window.browser={storage:{local:{get:async()=>({settings:window.mockSettings})},onChanged:{addListener:fn=>hooks.push(fn)}},runtime:{onMessage:{addListener:()=>{}},sendMessage:async message=>{
   if(message.type==='of:classify')return {language:'en',country:null};
   if(message.type==='of:sponsor-candidate'){
     window.totalCandidates++;
     if(window.totalCandidates===12)return {ad:{id:'test',advertiser:'Example Test',title:'Testing only',description:'Demo (not a paid placement)',url:'https://example.com'}};
     return {ad:null};
   }
   return {ok:true};
 }}};
 window.changeConsent=enabled=>{const old=window.mockSettings;
   window.mockSettings={...old,sponsorPlacements:enabled};
   hooks.forEach(fn=>fn({settings:{oldValue:old,newValue:window.mockSettings}},'local'));
 };
})();'''

def card(n,promoted=False):
 return f'<article data-testid="tweet" id="post{n}"><div data-testid="User-Name"><a href="/example">account</a></div><div data-testid="tweetText">Example English-language post number {n} about home mechanics and weather.</div>'+('<span data-testid="placementTracking">Promoted</span>' if promoted else '')+'</article>'

async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=await browser.new_page()
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # Synthetic DOM + mocked location; no external navigation is performed.
  await page.set_content('<!doctype html><html><head></head><body><main>'+''.join(card(i) for i in range(1,13))+card(20,True)+'</main></body></html>')
  await page.add_style_tag(content=(ROOT/'extension/content.css').read_text())
  bundle=MOCK+'\n'+'\n'.join((ROOT/'extension'/name).read_text() for name in ('core.js','adapters.js','content.js'))
  await page.add_script_tag(content='(function(location){'+bundle+'\n})(new URL("https://x.com/home"));')
  await page.wait_for_function('window.totalCandidates===12')
  await page.wait_for_function('Array.from(document.querySelectorAll(".originfilter-notice")).some(el => el.shadowRoot?.textContent.includes("Example Test"))')
  assert await page.locator('[data-originfilter-blocked]').count()==12
  assert await page.locator('#post20').get_attribute('data-originfilter-blocked') is None
  assert await page.locator('.originfilter-notice').count()==12
  count=await page.evaluate('Array.from(document.querySelectorAll(".originfilter-notice")).filter(el=>el.shadowRoot?.querySelector("aside:not([hidden])")).length')
  assert count==1,count
  assert await page.evaluate('Array.from(document.querySelectorAll(".originfilter-notice")).every(el=>el.shadowRoot.textContent.includes("Show once"))')
  await page.evaluate('window.changeConsent(false)')
  await page.wait_for_function('Array.from(document.querySelectorAll(".originfilter-notice")).every(el=>!!el.shadowRoot?.querySelector("aside[hidden]"))')
  await page.wait_for_timeout(300)
  assert await page.evaluate('window.totalCandidates')==12
  assert not errors,errors
  await browser.close()
  print('PASS: 12 filtered items, exactly one clearly labeled mock sponsor, native ad untouched, disabling consent removes ads, no page errors')
if __name__=='__main__':asyncio.run(run())
