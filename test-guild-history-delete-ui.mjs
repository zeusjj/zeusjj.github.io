import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const guildData=JSON.parse(await readFile(new URL('../../docs/data.json',import.meta.url),'utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/api/site-sections'))return route.fulfill({json:{sections:{}}});
    if(url.pathname.endsWith('/api/guild-data'))return route.fulfill({json:guildData});
    if(url.pathname.endsWith('/api/guild-history'))return route.fulfill({json:{entries:[
      {id:'d9000000-0000-4000-8000-000000000101',event_date:'2026-11-20',content:'작성자가 마지막 수정',created_by:'tester',created_nickname:'테스터',created_at:1795132800000,version:1,sort_order:1,can_delete:true,history:[{version:1,event_date:'2026-11-20',content:'작성자가 마지막 수정',editor_nickname:'테스터',changed_at:1795132800000}]},
      {id:'d9000000-0000-4000-8000-000000000102',event_date:'2026-11-20',content:'다른 회원이 마지막 수정',created_by:'tester',created_nickname:'테스터',created_at:1795132800001,version:2,sort_order:0,can_delete:false,history:[{version:2,event_date:'2026-11-20',content:'다른 회원이 마지막 수정',editor_nickname:'다른 회원',changed_at:1795132800002}]}
    ]}});
    return route.fulfill({json:{tips:[],notices:[],alarms:[],user:null,count:0}});
  });
  await page.goto((process.env.EPIC_TEST_URL||'http://127.0.0.1:4175/').replace(/#.*$/,'')+'#history',{waitUntil:'load'});
  await page.evaluate(()=>{window.GuildAuth={user:{username:'tester',nickname:'테스터',isAdmin:true},expiresAt:Date.now()+3600000,headers:()=>({Authorization:'Bearer test-only'})};window.dispatchEvent(new Event('guild-auth-change'));});
  await page.locator('.guild-history-entry').first().waitFor();
  assert.equal(await page.locator('.guild-history-entry [aria-label="연혁 제거"]').count(),1,'only the creator who made the latest edit sees delete');
  assert.equal(await page.locator('#history-heading').innerText(),'Guild History');
  assert.doesNotMatch(await page.locator('#guild-history-status').innerText(),/관리자도 삭제/);
  assert.deepEqual(errors,[]);
  console.log('PASS: Guild History heading and creator/latest-editor-only delete control rendering.');
}finally{await browser.close();}
