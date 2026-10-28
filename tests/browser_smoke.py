"""Synthetic DOM integration, with a mocked extension API and detector.
This runs the shipped core/adapters/content scripts in Chromium. It is NOT an
installed-extension, native-detector, or logged-in live-social-feed test.
Run: python tests/browser_smoke.py (requires playwright and Chromium).
"""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
EN='This is a detailed English post about rebuilding an engine and making useful tools in the workshop.'
ES='Esta es una publicación en español sobre la reparación de motores y la fabricación de herramientas.'
MOCK='''(() => {
 const listeners=[],messages=[];
 window.mockSettings={enabled:true,englishOnly:true,allowedCountries:[],unknownCountry:'show',unknownLanguage:'show',youtubeLookups:false,showPlaceholders:true,keywords:[],blockedAccounts:[]};
 window.mockCountries={};window.mockCalls=0;
 const manifest={version:'0.6.0'};
 window.browser={
  storage:{local:{get:async()=>({settings:window.mockSettings})},onChanged:{addListener:fn=>listeners.push(fn)}},
  runtime:{sendMessage:async m=>{window.mockCalls++;if(m.type==='of:classify')return {language:m.item.text.includes('publicación')?'es':m.item.text?'en':null,country:window.mockCountries[m.item.site+':'+m.item.author]?.country||null};return {ok:true}},onMessage:{addListener:fn=>messages.push(fn)}}
 };
 window.setMockSettings=async next=>{const old=window.mockSettings;window.mockSettings=next;listeners.forEach(fn=>fn({settings:{oldValue:old,newValue:next}},'local'))};
 window.setMockCountries=async next=>{const old=window.mockCountries;window.mockCountries=next;listeners.forEach(fn=>fn({originCache:{oldValue:old,newValue:next}},'local'))};
})();'''
def xcard(name,text,n):return f'<article data-testid="tweet" id="card{n}" style="display:block"><div data-testid="User-Name"><a href="/{name}">{name}</a><a href="/{name}/status/{n}">date</a></div><div data-testid="tweetText">{text}</div></article>'
def fbcard(name,text,n):return f'<div role="article" id="card{n}"><h3><a href="/{name}">{name}</a></h3><div data-ad-preview="message">{text}</div></div>'
def ytcard(name,text,n):return f'<ytd-rich-item-renderer id="card{n}"><a id="video-title" href="/watch?v=test{n}">{text}</a><ytd-channel-name><a href="/@{name}">{name}</a></ytd-channel-name></ytd-rich-item-renderer>'
async def run():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'],timeout=10000)
  context=await browser.new_context();context.set_default_timeout(5000)
  bundle=MOCK+'\n'+'\n'.join((ROOT/'extension'/f).read_text() for f in ('core.js','adapters.js','content.js'))
  page=None;errors=[]
  async def fixture(body,url):
   nonlocal page
   if page:await page.close()
   page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   await page.set_content('<!doctype html><html><head><style>'+ (ROOT/'extension'/'content.css').read_text()+'</style></head><body><main>'+body+'</main></body></html>')
   await page.add_script_tag(content='(function(location){'+bundle+'\n})(new URL('+json.dumps(url)+'));')
  results=[]
  for site,url,card in [('x','https://x.com/home',xcard),('facebook','https://www.facebook.com/',fbcard),('youtube','https://www.youtube.com/',ytcard)]:
   await fixture(card('english',EN,1)+card('spanish',ES,2),url)
   await page.wait_for_selector('#card2[data-originfilter-blocked="language"]',state='attached')
   assert await page.locator('#card1').get_attribute('data-originfilter-blocked') is None
   # Shadow-root notice button is closed, so verify the host rather than accessing internals.
   assert await page.locator('.originfilter-notice').count()==1
   calls=await page.evaluate('window.mockCalls');await page.wait_for_timeout(300);assert await page.evaluate('window.mockCalls')==calls
   await page.locator('main').evaluate('(el,html)=>el.insertAdjacentHTML("beforeend",html)',card('later',ES,3))
   await page.wait_for_selector('#card3[data-originfilter-blocked="language"]',state='attached')
   textselector='[data-testid="tweetText"]' if site=='x' else '[data-ad-preview="message"]' if site=='facebook' else '#video-title'
   await page.locator('#card2 '+textselector).evaluate('(el,text)=>el.textContent=text',EN)
   await page.wait_for_function('!document.querySelector("#card2").hasAttribute("data-originfilter-blocked")')
   await page.evaluate('setMockSettings({...mockSettings,allowedCountries:["US"],unknownCountry:"hide"})')
   await page.wait_for_selector('#card1[data-originfilter-blocked="unknown-country"]',state='attached')
   key=site+(':@english' if site=='youtube' else ':english')
   await page.evaluate('(key)=>setMockCountries({[key]:{country:"US"}})',key)
   await page.wait_for_function('!document.querySelector("#card1").hasAttribute("data-originfilter-blocked")')
   await page.evaluate('setMockSettings({...mockSettings,enabled:false})')
   await page.wait_for_function('document.querySelectorAll("[data-originfilter-blocked]").length===0')
   if site=='x':assert await page.locator('#card1').get_attribute('style')=='display:block'
   results.append({'site':site,'passed':['English shown','Spanish hidden','new cards','recycled text','strict unknown','cache update','pause restoration','no repeated idle classification']})
  # Do not accidentally bind X About evidence to text in a tweet.
  await fixture('<h1>About this account</h1><div><span>Account based in</span><span>United States</span></div>', 'https://x.com/example/about');await page.wait_for_timeout(250)
  assert (await page.evaluate("OriginAdapters.xDisclosure(document,'https://x.com/example/about')"))['country']=='US'
  assert not errors,errors
  await browser.close()
  report={'browser':'Chromium 144','mode':'synthetic DOM with mocked extension API/language results','results':results,'extra':['X disclosure bound to About route'],'page_errors':errors,'not_verified':['extension installation blocked by environment policy','native i18n model','logged-in live feeds','live public country lookup coverage']}
  (ROOT/'tests'/'browser-results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if __name__=='__main__':asyncio.run(run())
