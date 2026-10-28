'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Ads=require('../extension/ads.js');
const stamp=Date.parse('2026-10-28T12:00:00Z');
const sponsors=[
  {id:'sponsor-one',advertiser:'Example Co.',title:'A real product offer',description:'Example campaign for tests.',url:'https://example.com/offer',active:true},
  {id:'sponsor-two',advertiser:'Example Two',title:'Another useful offer',description:'Second example campaign.',url:'https://example.org',active:true}
];
test('no campaigns means no ads and no impressions',()=>{
 const a=Ads.advance(null,stamp,true,[]);
 assert.deepEqual(a.state,{date:'2026-10-28',blocked:0,shown:0,nextAt:0});
 assert.equal(a.ad,null);
});
test('opt-in required: ad offers not displayed without consent',()=>{
 let state;
 for(let i=0;i<24;i++){const r=Ads.advance(state,stamp+i*30000,false,sponsors);state=r.state;assert.equal(r.ad,null);}
 assert.equal(state.shown,0);
});
test('12-block threshold and rate limit',()=>{
 let state;
 for(let i=0;i<11;i++){const r=Ads.advance(state,stamp+i*1000,true,sponsors);state=r.state;assert.equal(r.ad,null);}
 const r=Ads.advance(state,stamp+11000,true,sponsors);
 assert.equal(r.ad.advertiser,'Example Co.');assert.equal(r.state.shown,1);
 state=r.state;
 for(let i=0;i<12;i++)state=Ads.advance(state,stamp+12000+i*1000,true,sponsors).state;
 assert.equal(state.shown,1,'second sponsor cannot appear in the cooldown window');
});
test('daily maximum is 2; reset each UTC day',()=>{
 let state,ads=[];
 for(let i=0;i<48;i++){
  const r=Ads.advance(state,stamp+i*120000,true,sponsors);state=r.state;
  if(r.ad)ads.push(r.ad.id);
 }
 assert.deepEqual(ads,['sponsor-one','sponsor-two']);
 assert.equal(state.shown,2);
 const next=Ads.advance(state,Date.parse('2026-10-29T01:00:00Z'),true,sponsors);
 assert.equal(next.state.shown,0);
 assert.equal(next.state.blocked,1);
});
test('campaigns reject non-HTTPS destinations and non-approved inventory',()=>{
 assert.equal(Ads.validate({...sponsors[0],url:'javascript:alert(1)'}),null);
 assert.equal(Ads.validate({...sponsors[0],url:'http://example.com'}),null);
 assert.equal(Ads.validate({...sponsors[0],url:'https://localhost'}),null);
 assert.equal(Ads.validate({...sponsors[0],active:false}),null);
 assert.equal(Ads.validate({...sponsors[0],id:'../../escape'}),null);
 assert.equal(Ads.usable([{...sponsors[0],url:'data:text/html,bad'},sponsors[1]]).length,1);
});
test('only primitive data fields are returned to content pages',()=>{
 const value=Ads.validate({...sponsors[0],evil:'<script>alert(1)</script>'});
 assert.deepEqual(Object.keys(value).sort(),['advertiser','description','id','title','url']);
});
