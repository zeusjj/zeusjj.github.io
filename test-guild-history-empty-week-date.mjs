import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const guildData=JSON.parse(await readFile(new URL('../../docs/data.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.route('**/api/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/api/site-sections'))return route.fulfill({json:{sections:{}}});
    if(url.pathname.endsWith('/api/guild-data'))return route.fulfill({json:guildData});
    if(url.pathname.endsWith('/api/guild-history'))return route.fulfill({json:{entries:[]}});
    return route.fulfill({json:{tips:[],notices:[],alarms:[],user:null,count:0}});
  });
  await page.goto((process.env.EPIC_TEST_URL||'http://127.0.0.1:4178/').replace(/#.*$/,'')+'#history',{waitUntil:'load'});
  await page.evaluate(()=>{window.GuildAuth={user:{username:'tester',nickname:'테스터'},expiresAt:Date.now()+3600000,headers:()=>({Authorization:'Bearer test-only'})};window.dispatchEvent(new Event('guild-auth-change'));});
  const week=page.locator('.guild-history-week').filter({has:page.locator('h2', {hasText:'4주차'})});
  await week.locator('[aria-label="첫 기록 추가"]').click();
  assert.equal(await week.locator('input[name="eventDate"]').inputValue(),'2026-09-16','first entry in week 4 defaults to that week start');
  console.log('PASS: empty week first-entry date defaults to the week start.');
}finally{await browser.close();}
