
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../extension/core.js');

test('new installs use a balanced unknown-country policy',()=>{assert.equal(C.config().unknownCountry,'show');assert.deepEqual(C.config().allowedCountries,['US']);});
test('strict country selection still hides unknown',()=>{assert.equal(C.decide({site:'x',author:'author',text:'Hello world'},{language:'en',country:null},{...C.config(),unknownCountry:'hide'}),'unknown-country');});
test('country decision respects explicit known foreign evidence',()=>{assert.equal(C.decide({site:'x',author:'author',text:'Hello world'},{language:'en',country:'GB'},C.config()),'country');});
test('obviously non-Latin script is caught without remote classification',()=>{assert.equal(C.language(null,'नमस्ते दुनिया'), 'non-en');assert.equal(C.language(null,'Привет мир'), 'non-en');assert.equal(C.language(null,'你好'), 'non-en');});
test('English with a foreign quoted word is not blanket blocked',()=>{assert.equal(C.obviousNonEnglish('I really enjoyed this movie 你好'),false);});
test('non-English Latin text still uses CLD',()=>{assert.equal(C.language({isReliable:true,languages:[{language:'es',percentage:95}]},'Esta es una publicación bastante larga en español.'),'es');});
test('language profile only learns after repeated distinct posts',()=>{let p=null,now=Date.now();for(let i=0;i<3;i++)p=C.learnProfile(p,'p'+i,'es',now);assert.equal(C.accountLanguage(p,now),'non-en');assert.equal(p.other,3);});
test('same post does not teach twice',()=>{let p=C.learnProfile(null,'p1','es');let again=C.learnProfile(p,'p1','es');assert.deepEqual(again,p);assert.equal(again.other,1);});
test('mixed posting history does not trigger auto-hide',()=>{let p=null;for(let i=0;i<3;i++)p=C.learnProfile(p,'f'+i,'es');for(let i=0;i<2;i++)p=C.learnProfile(p,'e'+i,'en');assert.equal(C.accountLanguage(p),null);});
test('only UNKNOWN-language posts use account language history',()=>{const cfg=C.config(), item={site:'x',author:'author',text:'OK'};assert.equal(C.decide(item,{language:null,country:null,accountLanguage:'non-en'},cfg),'account-language');assert.equal(C.decide(item,{language:'en',country:null,accountLanguage:'non-en'},cfg),'');});
test('learning can be disabled by user',()=>{const cfg={...C.config(),learnLanguageAccounts:false};assert.equal(C.decide({site:'x',author:'author',text:'OK'},{language:null,accountLanguage:'non-en'},cfg),'');});
test('post hashes never store the raw content',()=>{const v=C.fingerprint('This is a private post message');assert.match(v,/^[a-z0-9]+$/);assert.ok(!v.includes('private'));});
test('expired profile loses status',()=>{const p=C.learnProfile(null,'p','es',1000);assert.equal(C.accountLanguage({...p,other:3},1000+31*C.DAY),null);});
