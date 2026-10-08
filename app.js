const tabs = ['rules', 'notices', 'members', 'distribution', 'tips', 'tools', 'alarms', 'admin'];
let tipsLoaded=false;
let tipsRequest=null,pendingTips=null;
let noticesLoaded=false;
let noticesLoading=false;
let memberData=null,memberCentered=false;
let memberSort=null;
const refreshIcons=()=>window.lucide?.createIcons({attrs:{'aria-hidden':'true','stroke-width':1.7}});
function updateChapterNavigation(){
  let current='guild-operations';
  for(const id of ['guild-operations','guild-distribution','guild-allocation'])if(document.getElementById(id)?.getBoundingClientRect().top<170)current=id;
  document.querySelectorAll('[data-scroll]').forEach(button=>{const active=button.dataset.scroll===current;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'location':'false');});
}
window.addEventListener('scroll',updateChapterNavigation,{passive:true});
function switchTab(tab) {
  tab=tab.split('/')[0];
  if (!tabs.includes(tab)) tab = 'rules';
  for (const id of tabs) document.getElementById(id).hidden = id !== tab;
  for (const button of document.querySelectorAll('[data-tab]')) {
    const active = button.dataset.tab === tab || (tab==='admin' && button.dataset.tab==='notices');
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
  const label=tab==='admin'?'관리자':document.querySelector(`[data-tab="${tab}"]`).textContent.trim();
  document.getElementById('current-view').textContent=label;
  document.title=`${label} | 절대중립`;
  window.scrollTo({top:0,behavior:'instant'});
  updateChapterNavigation();
  if(tab==='tips' && !tipsLoaded) loadTips();
  else if(tab==='tips')openSharedTip();
  if(tab==='notices' && !noticesLoaded) loadNotices();
  else if(tab==='notices')openSharedNotice();
  if(tab==='members')requestAnimationFrame(centerMemberToday);
  if(tab==='admin')window.dispatchEvent(new Event('guild-admin-open'));
  document.querySelectorAll(`#${tab} .board-entry[open]`).forEach(entry=>entry.dispatchEvent(new Event('guild-view')));
}
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {location.hash = button.dataset.tab;}));
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.getElementById('main-content').focus();});
document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.scroll)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})));
window.addEventListener('hashchange', () => switchTab(location.hash.slice(1)));
const element = (tag, text, className) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function renderRules(text) {
  const target=document.getElementById('rule-content');
  target.replaceChildren();
  const sections=new Map();
  function bodyContent(text, parent) {
    const lines=text.replace(/\r/g,'').split('\n');
    let list=null,lastItem=null,nestedList=null;
    for(let i=0;i<lines.length;i++) {
      const indented=/^\s+-/.test(lines[i]);
      let line=lines[i].trim();
      if(!line) {list=null;lastItem=null;nestedList=null;continue;}
      while(i+1<lines.length && lines[i+1].trim() && !/^\s*(?:[-▶※]|[ABC]\.\s)/.test(lines[i+1])) line+=' '+lines[++i].trim();
      if(line.startsWith('-')) {
        if(!list){list=element('ul');parent.append(list);}
        const item=element('li',line.replace(/^-\s*/,''));
        if(indented && lastItem){if(!nestedList){nestedList=element('ul');lastItem.append(nestedList);}nestedList.append(item);}
        else {list.append(item);lastItem=item;nestedList=null;}
      } else {
        list=null;lastItem=null;nestedList=null;
        parent.append(element(line.startsWith('▶')?'h3':'p',line.replace(/^▶\s*/,''),line.startsWith('※')?'policy-note':undefined));
      }
    }
  }
  const layouts={'길드 운영 방향성':'direction','시간':'schedule','인터':'relations','길드원 활동 기준':'growth','분배 기조':'principles','분배 시스템':'system','1. 분배 아이템 유형':'types','2. 공통 분배 및 입찰 조건':'conditions','3. 최소 입찰가':'prices','4. 클래스 전용 아이템 분배':'class-items','5. 방어구 분배':'armor','6. 방어구 분배 로테이션':'rotation','입찰 규칙':'bidding','분배 시간':'timing','분배 관련 안내':'updates'};
  for(const section of text.split(/\r?\n(?=\[)/)) {
    const match=section.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
    if(!match) continue;
    const kind=match[1]==='성장 목표'?'target':layouts[match[1]] || 'updates';
    const wrapper=element('section',undefined,'policy-section policy-'+kind);
    wrapper.append(element('h2',match[1].replace(/^\d+\.\s*/,'')));
    const body=element('div',undefined,'policy-body');
    const content=match[2].trim();
    if(kind==='target') {
      const match=content.match(/^(.*?)\s*(\([^)]*\))$/);
      if(match){const line=element('p');line.append(document.createTextNode(match[1]+' '),element('small',match[2]));body.append(line);}
      else bodyContent(content,body);
    } else if(kind==='schedule') {
      const schedule=content.match(/^-\s*(\S+)\s+(\d+:\d+)/m);
      if(schedule){const time=element('div',undefined,'schedule-time');time.append(element('span',schedule[1]),element('strong',schedule[2]));body.append(time);}
      bodyContent(content.replace(/^-\s*\S+\s+\d+:\d+\s*$/m,''),body);
    } else if(kind==='types') {
      for(const group of content.split('▶').filter(part=>part.trim())) {
        const parts=group.trim().split(/\s+-\s+/);body.append(element('h3',parts.shift()));
        const chips=element('ul',undefined,'item-chips');for(const part of parts)chips.append(element('li',part));body.append(chips);
      }
    } else if(kind==='armor') {
      const chunks=content.split(/\n(?=[ABC]\. )/);
      bodyContent(chunks.shift(),body);
      const steps=element('div',undefined,'armor-steps');
      for(const chunk of chunks){
        const split=chunk.indexOf('\n');const step=element('section',undefined,'armor-step');
        const heading=chunk.slice(0,split);step.append(element('span',heading[0],'allocation-letter'),element('h3',heading.slice(3)));
        const facts=element('dl',undefined,'allocation-facts');
        for(const fact of chunk.slice(split+1).split('▶').filter(value=>value.trim())){
          const divider=fact.indexOf(' - ');if(divider<0)continue;
          const row=element('div');row.append(element('dt',fact.slice(0,divider).trim()),element('dd',fact.slice(divider+3).replace(/\s+/g,' ').trim()));facts.append(row);
        }
        step.append(facts);steps.append(step);
      }
      body.append(steps);
    } else if(kind==='prices') {
      const explanation=element('div',undefined,'price-explanation');
      const rates=element('dl',undefined,'price-rates');
      const remaining=[];
      for(const line of content.split(/\r?\n/)) {
        const rate=line.match(/^\s*-\s*(스킬북|T5):\s*([\d,]+)\s*$/);
        if(rate){const item=element('div');item.append(element('dt',rate[1]),element('dd',rate[2]));rates.append(item);}
        else remaining.push(line);
      }
      bodyContent(remaining.join('\n'),explanation);
      body.append(explanation,rates);
    } else if(kind==='conditions') {
      const chunks=content.split(/(?=▶)/);
      const columns=element('div',undefined,'condition-columns');
      for(const chunk of chunks){if(!chunk.trim())continue;const column=element('div');bodyContent(chunk,column);columns.append(column);}
      body.append(columns);
    } else if(kind==='class-items') {
      const chunks=content.split(/\n/).map(line=>line.trim()).filter(Boolean);
      const priorities=element('ol',undefined,'priority-list');
      let method='';
      for(const line of chunks){if(/^\d순위/.test(line))priorities.append(element('li',line.replace(/^\d순위\s*-\s*/,'')));else if(line.startsWith('▶ 입찰 방식'))method=line;else bodyContent(line,body);}
      body.append(priorities);bodyContent(method,body);
    } else bodyContent(content,body);
    wrapper.append(body);
    sections.set(kind,wrapper);
  }
  const group=(className,kinds)=>{const node=element('div',undefined,className);for(const kind of kinds){const section=sections.get(kind);if(section){node.append(section);sections.delete(kind);}}return node;};
  const overview=element('div',undefined,'operations-layout');overview.id='guild-operations';
  overview.append(group('operation-copy',['direction','growth','relations']),group('schedule-rail',['target','schedule','timing']));target.append(overview);
  const chapter=(id,title,icon)=>{const node=element('section',undefined,'policy-chapter');node.id=id;const heading=element('div',undefined,'chapter-heading');const symbol=element('i');symbol.dataset.lucide=icon;heading.append(symbol,element('h2',title));node.append(heading);return node;};
  const distribution=chapter('guild-distribution','분배 기준','scale');
  distribution.append(group('distribution-intro',['principles','system']),group('eligibility-layout',['types','conditions']),group('price-band',['prices']));target.append(distribution);
  const allocation=chapter('guild-allocation','아이템 분배','swords');
  allocation.append(group('allocation-layout',['class-items','armor']),group('allocation-notes',['rotation','bidding','updates']));target.append(allocation);
  for(const section of sections.values())target.append(section);
  updateChapterNavigation();
  refreshIcons();
}
const noticesApi='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/notices';
const noticeLogin=document.getElementById('notice-login'),noticeForm=document.getElementById('notice-form');
let noticeToken='',noticeExpiry=0,noticeRecords=[],editingNotice=null;
let noticeSaving=false;
const noticeImageUrl=(postId,imageId)=>noticesApi+'/'+encodeURIComponent(postId)+'/images/'+encodeURIComponent(imageId);
async function encodeNoticeImage(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('PNG, JPG, WebP 사진을 첨부해주세요.');
  if(file.size>20971520)throw new Error('원본 사진은 20MB 이하여야 합니다.');
  const bitmap=await createImageBitmap(file);
  try{
    const canvas=document.createElement('canvas'),scale=Math.min(1,3200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [.92,.8,.65]){
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
      if(blob && blob.size<=2097152){const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('사진을 읽지 못했습니다.'));reader.readAsDataURL(blob);});return {mime:blob.type,data};}
    }throw new Error('사진 용량이 큽니다. 더 작은 사진을 첨부해주세요.');
  }finally{bitmap.close();}
}
noticeForm.querySelector('.notice-attachments').remove();
const noticeRich=GuildRich.editor(noticeForm,{status:document.getElementById('notice-form-status'),url:image=>noticeImageUrl(editingNotice,image.id),encode:encodeNoticeImage});
function noticeAdmin(){return !!noticeToken && Date.now()<noticeExpiry;}
function showNoticeEditor(record=null){
  editingNotice=record?.id || null;noticeForm.reset();noticeForm.elements.title.value=record?.title || '';noticeForm.elements.content.value=record?.content || '';noticeForm.elements.category.value=record?.category || '공지';
  noticeRich.reset(record?.content || '',record?.images || []);
  document.getElementById('notice-form-heading').textContent=record?'공지 수정':'새 공지';noticeForm.querySelector('[type="submit"]').textContent=record?'저장':'등록';
  document.getElementById('notice-form-status').textContent='';noticeLogin.hidden=true;noticeForm.hidden=false;document.getElementById('new-notice').setAttribute('aria-expanded','true');noticeForm.elements.title.focus();
}
function closeNoticeForms(){if(noticeSaving)return;noticeRich.reset();noticeForm.hidden=true;noticeLogin.hidden=true;noticeLogin.reset();document.getElementById('new-notice').setAttribute('aria-expanded','false');}
const boardViews=new Map(),viewRequests=new Map();
function bindBoardViews(entry,summary,record,board){
  const key='guild-post-view-v1:'+board+':'+record.id;
  const sharedKey='guild-post-view-v2:'+board+':'+record.id;
  const recentView=()=>{try{const saved=JSON.parse(localStorage.getItem(sharedKey));if(Number.isSafeInteger(saved?.views)&&saved.views>0&&Number.isFinite(saved.viewedAt)&&Date.now()-saved.viewedAt<86400000)return saved.views;}catch{}return 0;};
  let stored;try{stored=Number(sessionStorage.getItem(key));}catch{}
  if(stored>0)boardViews.set(key,stored);
  const badge=element('span',undefined,'entry-views'),icon=element('i'),number=element('span');icon.dataset.lucide='eye';badge.append(icon,number);summary.append(badge);
  const display=()=>{const views=Math.max(Number(record.views)||0,boardViews.get(key)||0);number.textContent=views.toLocaleString('ko-KR');badge.setAttribute('aria-label',`조회수 ${views}`);badge.title='조회수';};display();
  const track=async()=>{
    if(!entry.open || entry.closest('section')?.hidden)return;
    if(boardViews.has(key)){display();return;}
    if(!viewRequests.has(key)){
      const register=async()=>{
        const recent=recentView();if(recent){boardViews.set(key,recent);return;}
        const response=await fetch((board==='tips'?tipsApi:noticesApi)+'/'+encodeURIComponent(record.id)+'/view',{method:'POST',signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw new Error('View unavailable');const data=await response.json();
        if(!Number.isSafeInteger(data.views) || data.views<1)throw new Error('Invalid view count');
        boardViews.set(key,data.views);try{sessionStorage.setItem(key,String(data.views));}catch{}
        try{localStorage.setItem(sharedKey,JSON.stringify({views:data.views,viewedAt:Date.now()}));}catch{}
      };
      // Serialize registrations across tabs before checking the shared cooldown.
      const request=navigator.locks?.request?navigator.locks.request(sharedKey,register):register();viewRequests.set(key,request);
    }
    const request=viewRequests.get(key);
    try{await request;display();}catch{}finally{if(viewRequests.get(key)===request)viewRequests.delete(key);}
  };
  entry.addEventListener('toggle',track);entry.addEventListener('guild-view',track);
}
function renderNotices(records){
  noticeRecords=records;const target=document.getElementById('notices-list');target.replaceChildren();
  const filter=document.getElementById('notice-filter').value;
  const visible=records.filter(record=>filter==='all' || (record.category || '공지')===filter);
  document.getElementById('notice-count').textContent=filter==='all'?`전체 ${records.length}건`:`${filter} ${visible.length}건 / 전체 ${records.length}건`;document.getElementById('notices-status').textContent=visible.length?'':records.length?'해당 태그의 글이 없습니다.':'등록된 공지가 없습니다.';
  document.getElementById('notice-logout').hidden=!noticeAdmin();
  for(const record of visible){
    const entry=element('details',undefined,'board-entry'),summary=element('summary');entry.dataset.noticeId=record.id;
    const date=new Date(record.created_at),time=element('time',date.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}));time.dateTime=date.toISOString();
    const category=record.category || '공지',categoryClass={'공지':'announcement','운영':'operations','한마디':'chat'}[category] || 'announcement';
    const title=element('span',undefined,'entry-title');title.append(element('span',record.title,'notice-title-text'));
    const age=Date.now()-date.getTime();if(age>=0 && age<86400000){const badge=element('span','New','notice-new');badge.title='작성 후 24시간 이내';title.append(badge);}
    const icon=element('i',undefined,'disclosure-icon');icon.dataset.lucide='chevron-down';summary.append(element('span',category,'notice-tag notice-tag-'+categoryClass),title,time);bindBoardViews(entry,summary,record,'notices');summary.append(icon);
    const share=element('button',undefined,'icon-button notice-share');share.type='button';share.title='링크 복사';share.setAttribute('aria-label','공지 링크 복사');const shareIcon=element('i');shareIcon.dataset.lucide='link';share.append(shareIcon);share.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();copyTipLink(record.id,share,'notices');});summary.append(share);
    const body=element('div',undefined,'entry-body'),rich=GuildRich.render(body,record.content,record.images || [],image=>noticeImageUrl(record.id,image.id));if(!rich)body.append(element('p',record.content,'notice-content'));
    for(const [index,image] of (rich?[]:record.images || []).entries()){
      const link=element('a',undefined,'notice-photo');link.href=noticeImageUrl(record.id,image.id);link.target='_blank';link.rel='noopener noreferrer';const photo=element('img');photo.src=link.href;photo.alt=`공지 첨부 사진 ${index+1}`;photo.loading='lazy';photo.decoding='async';link.append(photo);body.append(link);
    }
    if(noticeAdmin()){
      const actions=element('div',undefined,'notice-actions');
      const edit=element('button','수정','secondary-button');edit.type='button';edit.addEventListener('click',()=>showNoticeEditor(record));
      const remove=element('button','삭제','secondary-button');remove.type='button';remove.addEventListener('click',async()=>{
        if(!confirm('이 공지를 삭제할까요?'))return;remove.disabled=true;
        try{await noticeWrite('/'+record.id,'DELETE');await loadNotices();}catch(error){document.getElementById('notices-status').textContent=error.message;}finally{remove.disabled=false;}
      });actions.append(edit,remove);body.append(actions);
    }
    entry.append(summary,body);target.append(entry);
  }refreshIcons();window.dispatchEvent(new Event('guild-admin-auth'));openSharedNotice();
}
function openSharedNotice(){let id;try{id=location.hash.startsWith('#notices/')?decodeURIComponent(location.hash.slice(9)):'';}catch{return;}if(!id)return;
  if(document.getElementById('notice-filter').value!=='all'){document.getElementById('notice-filter').value='all';renderNotices(noticeRecords);return;}
  const entry=[...document.querySelectorAll('#notices-list details')].find(entry=>entry.dataset.noticeId===id);if(!entry){document.getElementById('notices-status').textContent='공유된 공지를 찾을 수 없습니다.';return;}
  entry.open=true;requestAnimationFrame(()=>{if(location.hash==='#notices/'+encodeURIComponent(id)){entry.scrollIntoView({block:'start'});entry.querySelector('summary').focus({preventScroll:true});}});
}
async function loadNotices(){
  if(noticesLoading)return;noticesLoading=true;
  const status=document.getElementById('notices-status'),refresh=document.getElementById('refresh-notices');status.textContent='공지를 불러오는 중입니다.';refresh.disabled=true;
  try{const response=await fetch(noticesApi,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.notices))throw new Error();renderNotices(data.notices);noticesLoaded=true;}
  catch{status.textContent='공지를 불러오지 못했습니다. 잠시 후 새로고침해주세요.';}finally{refresh.disabled=false;noticesLoading=false;}
}
async function noticeWrite(path,method,values){
  const response=await fetch(noticesApi+path,{method,headers:{'Content-Type':'application/json','Authorization':'Bearer '+noticeToken},...(values?{body:JSON.stringify(values)}:{}),signal:AbortSignal.timeout(60000)});
  const data=await response.json();if(response.status===401){noticeToken='';noticeExpiry=0;renderNotices(noticeRecords);}if(!response.ok)throw new Error(data.error || '요청을 처리하지 못했습니다.');return data;
}
document.getElementById('new-notice').addEventListener('click',()=>{
  if(!noticeForm.hidden || !noticeLogin.hidden){closeNoticeForms();return;}
  if(noticeAdmin())showNoticeEditor();else {noticeLogin.hidden=false;document.getElementById('notice-login-status').textContent='';document.getElementById('new-notice').setAttribute('aria-expanded','true');noticeLogin.elements.password.focus();}
});
document.getElementById('cancel-notice-login').addEventListener('click',closeNoticeForms);
document.getElementById('cancel-notice').addEventListener('click',closeNoticeForms);
document.getElementById('refresh-notices').addEventListener('click',loadNotices);
document.getElementById('notice-filter').addEventListener('change',()=>renderNotices(noticeRecords));
setInterval(()=>{if(noticesLoaded && !document.getElementById('notices').hidden){const now=Date.now();document.querySelectorAll('#notices-list .notice-new').forEach(badge=>{if(now-new Date(badge.closest('summary').querySelector('time').dateTime).getTime()>=86400000)badge.remove();});}},60000);
document.getElementById('notice-logout').addEventListener('click',async()=>{
  try{await noticeWrite('/session','DELETE');}catch{}noticeToken='';noticeExpiry=0;closeNoticeForms();renderNotices(noticeRecords);
});
noticeLogin.addEventListener('submit',async event=>{
  event.preventDefault();const submit=noticeLogin.querySelector('[type="submit"]'),status=document.getElementById('notice-login-status');submit.disabled=true;status.textContent='확인 중입니다.';
  try{const response=await fetch(noticesApi+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:noticeLogin.elements.password.value}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error || '로그인하지 못했습니다.');noticeToken=data.token;noticeExpiry=data.expires_at;noticeLogin.reset();renderNotices(noticeRecords);showNoticeEditor();}
  catch(error){status.textContent=error.name==='TimeoutError'?'응답이 지연되고 있습니다. 다시 시도해주세요.':error.message;}finally{submit.disabled=false;}
});
noticeForm.addEventListener('submit',async event=>{
  event.preventDefault();if(noticeSaving)return;noticeSaving=true;const submit=noticeForm.querySelector('[type="submit"]'),status=document.getElementById('notice-form-status');submit.disabled=true;document.getElementById('cancel-notice').disabled=true;
  try{const rich=await noticeRich.values();status.textContent='저장 중입니다.';const values={...Object.fromEntries(new FormData(noticeForm)),...rich};if(editingNotice)values.updated_at=noticeRecords.find(record=>record.id===editingNotice)?.updated_at;await noticeWrite(editingNotice?'/'+editingNotice:'',editingNotice?'PUT':'POST',values);noticeForm.reset();noticeSaving=false;closeNoticeForms();await loadNotices();}
  catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 새로고침하여 등록 여부를 확인해주세요.':error.message;}finally{noticeSaving=false;submit.disabled=false;document.getElementById('cancel-notice').disabled=false;noticeRich.unlock();}
});
const tipsApi='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/tips';
const tipForm=document.getElementById('tip-form');
tipForm.elements.content.required=false;
function tipImageUrl(id,imageId){return tipsApi+'/'+encodeURIComponent(id)+'/images/'+encodeURIComponent(imageId);}
const tipAttachments=GuildRich.editor(tipForm,{status:document.getElementById('tip-form-status'),url:image=>tipImageUrl('',image.id),encode:encodeNoticeImage});
document.getElementById('suggest-tool').addEventListener('click',()=>{location.hash='tips';showTipForm(true);if(!tipForm.elements.title.value)tipForm.elements.title.value='[편의 기능 건의] ';requestAnimationFrame(()=>{tipForm.scrollIntoView({block:'start'});tipForm.elements.title.focus();});});
const tipSearch=document.getElementById('tip-search');
const normalizeTipSearch=value=>String(value).normalize('NFKC').toLocaleLowerCase('ko-KR');
function filterTips(){
  const terms=normalizeTipSearch(tipSearch.value).trim().split(/\s+/).filter(Boolean);
  const entries=[...document.querySelectorAll('#tips-list details')];let matches=0;
  for(const entry of entries){entry.hidden=!terms.every(term=>entry.dataset.searchText.includes(term));if(!entry.hidden)matches++;}
  document.getElementById('tip-count').textContent=terms.length?`${matches} / ${entries.length}개의 팁`:`${entries.length}개의 팁`;
  document.getElementById('tips-empty-search').hidden=!terms.length || !entries.length || matches>0;
}
tipSearch.addEventListener('input',filterTips);
tipSearch.addEventListener('search',filterTips);
function applyPendingTips(){if(pendingTips && tipForm.hidden && !document.querySelector('.tip-manage-form')){const tips=pendingTips;pendingTips=null;renderTips(tips);}}
function showTipForm(show){tipForm.hidden=!show;document.getElementById('new-tip').setAttribute('aria-expanded',String(show));if(show)tipForm.elements.title.focus();else applyPendingTips();}
document.getElementById('new-tip').addEventListener('click',()=>showTipForm(tipForm.hidden));
document.getElementById('cancel-tip').addEventListener('click',()=>showTipForm(false));
function sharedTipId(){try{return location.hash.startsWith('#tips/')?decodeURIComponent(location.hash.slice(6)):'';}catch{return '';}}
function openSharedTip(){
  const id=sharedTipId();if(!id)return;
  const item=[...document.querySelectorAll('#tips-list details')].find(entry=>entry.dataset.tipId===id);
  if(!item){document.getElementById('tips-status').textContent='공유된 팁을 찾을 수 없습니다.';return;}
  if(item.hidden){tipSearch.value='';filterTips();}
  item.open=true;requestAnimationFrame(()=>{if(sharedTipId()!==id)return;item.scrollIntoView({block:'start'});item.querySelector('summary').focus({preventScroll:true});});
}
async function copyTipLink(id,button,board='tips'){
  const url=new URL(location.href);url.search='';url.hash=board+'/'+encodeURIComponent(id);
  const status=document.getElementById(board==='tips'?'tips-status':'notices-status');
  try {
    try{await navigator.clipboard.writeText(url.href);}catch{
      const input=element('textarea');input.value=url.href;input.readOnly=true;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
      let copied=false;try{copied=document.execCommand('copy');}finally{input.remove();button.focus({preventScroll:true});}if(!copied)throw new Error('clipboard');
    }
    status.textContent='링크를 복사했습니다.';button.title='복사 완료';button.setAttribute('aria-label','링크 복사 완료');
    setTimeout(()=>{button.title='링크 복사';button.setAttribute('aria-label',board==='tips'?'팁 링크 복사':'공지 링크 복사');},2000);
  } catch{status.textContent='링크를 직접 복사해주세요.';window.prompt('게시글 공유 링크',url.href);}
}
function tipUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol) && !url.username && !url.password?url:null;}catch{return null;}}
function tipMedia(url){
  if(url.protocol!=='https:')return null;
  const host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);
  let videoId='';
  if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host))videoId=url.searchParams.get('v') || (['embed','shorts','live'].includes(parts[0])?parts[1]:'');
  else if(host==='youtu.be')videoId=parts[0];
  if(/^[\w-]{11}$/.test(videoId || '')){
    const src=new URL('https://www.youtube-nocookie.com/embed/'+videoId);src.searchParams.set('playsinline','1');
    const time=url.searchParams.get('t') || url.searchParams.get('start') || '';
    const match=time.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    const start=/^\d+$/.test(time)?Number(time):match?Number(match[1] || 0)*3600+Number(match[2] || 0)*60+Number(match[3] || 0):0;
    if(start>0 && start<=86400)src.searchParams.set('start',String(start));
    return {kind:'frame',src:src.href,video:true,title:'YouTube 동영상'};
  }
  if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host) && /^[\w-]{10,100}$/.test(url.searchParams.get('list') || ''))return {kind:'frame',src:'https://www.youtube-nocookie.com/embed/videoseries?list='+encodeURIComponent(url.searchParams.get('list')),video:true,title:'YouTube 재생목록'};
  if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(host)){
    const id=parts.find(part=>/^\d+$/.test(part));if(id)return {kind:'frame',src:'https://player.vimeo.com/video/'+id,video:true,title:'Vimeo 동영상'};
  }
  const path=url.pathname.toLowerCase();
  if(/\.(?:png|jpe?g|gif|webp|avif|svg|bmp)$/.test(path) || /^(?:png|jpe?g|gif|webp|avif)$/i.test(url.searchParams.get('format') || ''))return {kind:'image',src:url.href};
  if(/\.(?:mp4|webm|ogv|mov)$/.test(path))return {kind:'video',src:url.href};
  if(/\.(?:mp3|wav|ogg|m4a|flac)$/.test(path))return {kind:'audio',src:url.href};
  if(url.protocol!=='https:' || url.origin===location.origin)return null;
  if(host==='drive.google.com' && /^\/file\/d\/[\w-]+/.test(url.pathname))return {kind:'frame',src:'https://drive.google.com'+url.pathname.match(/^\/file\/d\/[\w-]+/)[0]+'/preview',title:'Google Drive 파일'};
  return {kind:'frame',src:url.href,title:url.hostname,video:false};
}
function tipLink(url,text){const link=element('a',text || url.href,'inline-link');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';return link;}
function appendTipContent(body,content,urls){
  const paragraph=element('p',undefined,'tip-text');let previous=0;
  for(const match of content.matchAll(/https?:\/\/[^\s<>"']+/g)){
    const value=match[0].replace(/[.,!?;\)\]\}]+$/,'');const url=tipUrl(value);if(!url)continue;
    paragraph.append(document.createTextNode(content.slice(previous,match.index)),tipLink(url,value));previous=match.index+value.length;urls.set(url.href,url);
  }
  paragraph.append(document.createTextNode(content.slice(previous)));body.append(paragraph);
}
function appendTipEmbed(body,url){
  const media=tipMedia(url),figure=element('figure',undefined,'tip-embed');
  const automatic=media?.kind==='frame' && ['www.youtube-nocookie.com','player.vimeo.com'].includes(new URL(media.src).hostname);
  let mounted=null,preview=null;
  const load=()=>{
    if(!media || mounted)return;
    let node;
    if(media.kind==='image'){
      node=element('img');node.alt='팁 첨부 이미지';node.loading='lazy';node.decoding='async';node.referrerPolicy='no-referrer';node.src=media.src;
    } else if(['video','audio'].includes(media.kind)){
      node=element(media.kind);node.controls=true;node.preload='none';node.src=media.src;if(media.kind==='video')node.playsInline=true;
    } else {
      node=element('iframe');node.title=media.title;node.loading='lazy';node.referrerPolicy=new URL(media.src).hostname==='www.youtube-nocookie.com'?'strict-origin-when-cross-origin':'no-referrer';node.setAttribute('sandbox',automatic?'allow-scripts allow-same-origin allow-presentation':'allow-scripts allow-presentation');node.allow='encrypted-media; picture-in-picture; fullscreen';node.allowFullscreen=true;node.dataset.embedSrc=media.src;node.src=media.src;
      figure.classList.add(media.video?'tip-video-embed':'tip-page-embed');
    }
    node.addEventListener('error',()=>{node.hidden=true;figure.prepend(element('p','미디어를 불러오지 못했습니다. 원본 링크를 확인해주세요.','media-error'));},{once:true});mounted=node;figure.prepend(node);if(preview)preview.hidden=true;
  };
  if(media && !automatic){
    preview=element('button',undefined,'secondary-button tip-preview');preview.type='button';preview.title=url.hostname+' 미리보기 열기';
    const icon=element('i');icon.dataset.lucide='eye';preview.append(icon,document.createTextNode('미리보기 열기'));
    preview.addEventListener('click',load);figure.append(preview);
    figure.addEventListener('tip-preview-reset',()=>{if(mounted){if(mounted.tagName==='IFRAME')mounted.src='about:blank';else if(['VIDEO','AUDIO'].includes(mounted.tagName)){mounted.pause();mounted.removeAttribute('src');mounted.load();}mounted.remove();mounted=null;}figure.querySelectorAll('.media-error').forEach(node=>node.remove());preview.hidden=false;});
  }else if(automatic)load();
  const caption=element('figcaption');caption.append(tipLink(url,url.hostname+' · 원본 열기'));figure.append(caption);body.append(figure);
  refreshIcons();
}
function tipManageForm(tip,mode,item,body){
  body.querySelector('.tip-manage-form')?.remove();
  const form=element('form',undefined,'tip-form tip-manage-form');form.append(element('h3',mode==='edit'?'팁 수정':'팁 삭제'));
  const fields=element('div',undefined,'form-fields');
  if(mode==='edit'){
    for(const [name,label,max] of [['title','제목',100],['author','닉네임',30],['url','링크',2000],['content','내용',5000]]){
      const field=element('label',label,'full-field'),input=element(name==='content'?'textarea':'input');input.name=name;input.value=tip[name] || '';input.maxLength=max;input.required=name==='title';if(name==='content')input.rows=5;else input.type=name==='url'?'url':'text';field.append(input);fields.append(field);
    }
  }
  const label=element('label','작성 비밀번호 또는 관리자 비밀번호','full-field'),password=element('input');password.name='password';password.type='password';password.maxLength=128;password.required=true;password.autocomplete='off';label.append(password);fields.append(label);form.append(fields);
  const actions=element('div',undefined,'form-actions'),status=element('span');status.setAttribute('role','status');
  const cancel=element('button','취소','secondary-button');cancel.type='button';cancel.addEventListener('click',()=>{form.remove();applyPendingTips();});
  const submit=element('button',mode==='edit'?'저장':'삭제',mode==='edit'?'primary-button':'danger-button');submit.type='submit';actions.append(status,cancel,submit);form.append(actions);
  const attachments=mode==='edit'?GuildRich.editor(form,{status,content:tip.content,images:tip.images || [],url:image=>tipImageUrl(tip.id,image.id),encode:encodeNoticeImage}):null;
  form.addEventListener('submit',async event=>{
    event.preventDefault();submit.disabled=true;cancel.disabled=true;status.textContent='처리 중입니다.';
    try{
      const values=Object.fromEntries(new FormData(form));if(attachments)Object.assign(values,await attachments.values());
      const response=await fetch(tipsApi+'/'+encodeURIComponent(tip.id),{method:mode==='edit'?'PUT':'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(values),signal:AbortSignal.timeout(60000)});
      const result=await response.json();if(!response.ok)throw new Error(result.error || '처리하지 못했습니다.');
      const id=tip.id;if(mode==='delete' && sharedTipId()===id)history.replaceState(null,'','#tips');
      form.remove();await loadTips({force:true});if(mode==='edit'){const entry=[...document.querySelectorAll('#tips-list details')].find(node=>node.dataset.tipId===id);if(entry)entry.open=true;}
    }catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 새로고침하여 결과를 확인해주세요.':error.message;}
    finally{submit.disabled=false;cancel.disabled=false;attachments?.unlock();}
  });body.append(form);item.open=true;password.focus({preventScroll:true});form.scrollIntoView({block:'nearest'});
}
function bindTipLikes(item,summary,body,tip){
  const views=summary.querySelector('.entry-views'),engagement=element('span',undefined,'entry-engagement');views.replaceWith(engagement);engagement.append(views);
  const badge=element('span',undefined,'entry-likes'),badgeIcon=element('i'),badgeNumber=element('span');badgeIcon.dataset.lucide='heart';badge.append(badgeIcon,badgeNumber);engagement.append(badge);
  const footer=element('div',undefined,'tip-like-footer'),button=element('button',undefined,'tip-like-button'),icon=element('i'),count=element('span'),status=element('p',undefined,'tip-like-status');
  icon.dataset.lucide='heart';button.type='button';button.append(icon,count);status.setAttribute('role','status');footer.append(button,status);body.append(footer);
  let likes=Math.max(0,Number(tip.likes)||0),liked=false,busy=false,initialized=false;
  function display(){badgeNumber.textContent=likes.toLocaleString('ko-KR');badge.title='좋아요';badge.setAttribute('aria-label',`좋아요 ${likes}`);count.textContent=likes.toLocaleString('ko-KR');button.disabled=busy || liked;button.classList.toggle('is-liked',liked);button.setAttribute('aria-pressed',String(liked));button.setAttribute('aria-label',liked?'좋아요 완료':'좋아요');button.title=liked?'좋아요 완료':'좋아요';button.setAttribute('aria-busy',String(busy));}
  async function request(method){const visitorId=await window.guildVisitorIdentity();const response=await fetch(tipsApi+'/'+encodeURIComponent(tip.id)+'/like'+(method==='GET'?'?visitorId='+encodeURIComponent(visitorId):''),{method,cache:'no-store',signal:AbortSignal.timeout(10000),...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error || '좋아요를 확인하지 못했습니다.');if(!Number.isSafeInteger(data.likes) || data.likes<0 || typeof data.liked!=='boolean')throw new Error('좋아요 응답을 확인하지 못했습니다.');likes=Math.max(likes,data.likes);liked ||= data.liked;initialized=true;}
  async function synchronize(){if(!item.open || initialized || busy)return;busy=true;display();try{await request('GET');status.textContent='';}catch{status.textContent='좋아요 상태를 확인하지 못했습니다. 다시 시도해주세요.';}finally{busy=false;display();}}
  button.addEventListener('click',async()=>{if(busy || liked)return;busy=true;display();status.textContent='';try{await request('POST');}catch(error){status.textContent=['TimeoutError','AbortError'].includes(error.name)?'응답을 확인하지 못했습니다. 다시 눌러 확인해주세요.':error.message;}finally{busy=false;display();}});
  item.addEventListener('toggle',synchronize);display();
}
function renderTips(tips){
  const opened=new Set([...document.querySelectorAll('#tips-list details[open]')].map(item=>item.dataset.tipId));
  const list=document.getElementById('tips-list');list.replaceChildren();
  for(const tip of tips){
    const item=element('details',undefined,'board-entry');item.dataset.tipId=tip.id;const summary=element('summary');
    item.dataset.searchText=normalizeTipSearch([tip.title,GuildRich.text(tip.content),tip.author,tip.url].join(' '));
    const disclosure=element('i',undefined,'disclosure-icon');disclosure.dataset.lucide='chevron-down';
    const share=element('button',undefined,'icon-button tip-share');share.type='button';share.title='링크 복사';share.setAttribute('aria-label','팁 링크 복사');
    const shareIcon=element('i');shareIcon.dataset.lucide='link';share.append(shareIcon);
    share.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();copyTipLink(tip.id,share);});
    summary.append(element('span',tip.title,'entry-title'),element('span',tip.author,'entry-author'),element('time',new Date(tip.created_at).toLocaleDateString('ko-KR')));bindBoardViews(item,summary,tip,'tips');summary.append(disclosure,share);
    const body=element('div',undefined,'entry-body'),urls=new Map(),rich=GuildRich.render(body,tip.content,tip.images || [],image=>tipImageUrl(tip.id,image.id));if(!rich)appendTipContent(body,tip.content,urls);else for(const match of GuildRich.text(tip.content).matchAll(/https?:\/\/[^\s]+/g)){const url=tipUrl(match[0]);if(url)urls.set(url.href,url);}
    for(const [index,image] of (rich?[]:tip.images || []).entries()){const link=element('a',undefined,'notice-photo');link.href=tipImageUrl(tip.id,image.id);link.target='_blank';link.rel='noopener noreferrer';const photo=element('img');photo.src=link.href;photo.alt=`팁 첨부 사진 ${index+1}`;photo.loading='lazy';photo.decoding='async';link.append(photo);body.append(link);}
    const url=tipUrl(tip.url);if(url)urls.set(url.href,url);
    let embedded=false;
    const mediaBody=element('div',undefined,'tip-media');body.append(mediaBody);
    item.addEventListener('toggle',()=>{
      if(item.open){if(!embedded){embedded=true;for(const url of [...urls.values()].slice(0,10))appendTipEmbed(mediaBody,url);}else body.querySelectorAll('iframe').forEach(frame=>{frame.src=frame.dataset.embedSrc;});}
      else {body.querySelectorAll('video,audio').forEach(media=>media.pause());body.querySelectorAll('iframe').forEach(frame=>{frame.src='about:blank';});body.querySelectorAll('.tip-embed').forEach(figure=>figure.dispatchEvent(new Event('tip-preview-reset')));}
    });
    bindTipLikes(item,summary,body,tip);
    const actions=element('div',undefined,'tip-entry-actions');
    for(const [mode,title,icon] of [['edit','수정','square-pen'],['delete','삭제','trash-2']]){
      const button=element('button',undefined,'secondary-button');button.type='button';const symbol=element('i');symbol.dataset.lucide=icon;button.append(symbol,document.createTextNode(title));button.addEventListener('click',()=>tipManageForm(tip,mode,item,body));actions.append(button);
    }body.append(actions);
    item.append(summary,body);list.append(item);if(opened.has(tip.id))item.open=true;
  }
  document.getElementById('tips-status').textContent=tips.length?'':'아직 등록된 팁이 없습니다.';
  filterTips();
  refreshIcons();
  openSharedTip();
}
function validTips(tips){return Array.isArray(tips) && tips.length<=200 && tips.every(tip=>tip && ['id','title','content','author','url'].every(key=>typeof tip[key]==='string') && Number.isFinite(tip.created_at));}
function loadTips({force=false}={}){
  if(tipsRequest)return force?tipsRequest.then(()=>loadTips({force:true})):tipsRequest;
  const status=document.getElementById('tips-status');if(!tipsLoaded)status.textContent='팁을 불러오는 중입니다.';
  const refresh=document.getElementById('refresh-tips');refresh.disabled=true;
  tipsRequest=(async()=>{
    try{
      const response=await fetch(tipsApi,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('load');const data=await response.json();if(!validTips(data.tips))throw new Error('format');
      try{const saved=JSON.stringify({savedAt:Date.now(),tips:data.tips.map(({id,title,content,url,author,created_at,views,likes,images})=>({id,title,content,url,author,created_at,views,likes,images}))});if(saved.length<=2000000)localStorage.setItem('guild-tips-cache-v1',saved);}catch{}
      if(!force && (!tipForm.hidden || document.querySelector('.tip-manage-form')))pendingTips=data.tips;
      else {pendingTips=null;renderTips(data.tips);}tipsLoaded=true;
    }catch{status.textContent=tipsLoaded?'최신 팁을 불러오지 못했습니다. 잠시 후 새로고침해주세요.':'팁을 불러오지 못했습니다. 잠시 후 새로고침해주세요.';}
    finally{refresh.disabled=false;tipsRequest=null;}
  })();return tipsRequest;
}
document.getElementById('refresh-tips').addEventListener('click',()=>loadTips());
tipForm.addEventListener('submit',async event=>{
  event.preventDefault();const status=document.getElementById('tip-form-status');const submit=tipForm.querySelector('[type="submit"]');submit.disabled=true;status.textContent='등록 중입니다.';
  const values=Object.fromEntries(new FormData(tipForm));
  try{Object.assign(values,await tipAttachments.values());const response=await fetch(tipsApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values),signal:AbortSignal.timeout(60000)});const result=await response.json();if(!response.ok)throw new Error(result.error || '등록하지 못했습니다.');tipForm.reset();tipAttachments.reset();status.textContent='';showTipForm(false);await loadTips({force:true});}
  catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 새로고침하여 등록 여부를 확인해주세요.':error.message;}
  finally{submit.disabled=false;tipAttachments.unlock();}
});
const classSymbols={
  '버서커':['greatsword','#b94b50'], '나이트':['shield','#577d9a'],
  '레인저':['bow','#30836a'], '어쌔신':['swords','#785b93'],
  '아티산':['warhammer','#9c7738'], '블레':['mace','#c26338'],
  '오라클':['sun','#a68a26'], '엘리':['wand-sparkles','#438d9d']
};
const classWeaponPaths={
  greatsword:['M12 2 8 7v8h8V7z','M6 15h12M10.5 15v6h3v-6M9 22h6','M12 7v8'],
  bow:['M5 2c16 4 16 16 0 20','M5 2l7 10-7 10','M3 12h18m-3-3 3 3-3 3'],
  warhammer:['M5 3h14v7H5z','M10.5 10v11h3V10','M8 3v7m8-7v7'],
  mace:['M2.5 3.5l2.5-1 6 18-2.5 1z','M5 4c2-4 7-3 8 0s-1 5 2 6 4 1 3 3','M18 12l1.5 2 2.5-.5-.5 2.5 2 1.5-2 1.5.5 2.5-2.5-.5-1.5 2-1.5-2-2.5.5.5-2.5-2-1.5 2-1.5-.5-2.5 2.5.5z']
};
function classIcon(name){
  const symbol=classSymbols[name];if(!symbol)return element('span',name);
  const icon=element('span',undefined,'class-icon');icon.setAttribute('role','img');icon.setAttribute('aria-label',name);icon.title=name;
  icon.style.color=symbol[1];
  const paths=classWeaponPaths[symbol[0]];
  if(paths){
    const ns='http://www.w3.org/2000/svg',glyph=document.createElementNS(ns,'svg');
    for(const [attribute,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))glyph.setAttribute(attribute,value);
    for(const d of paths){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);glyph.append(path);}icon.append(glyph);
  }else{const glyph=element('i');glyph.dataset.lucide=symbol[0];icon.append(glyph);}
  return icon;
}
function centerMemberToday(){
  if(memberCentered || !memberData || document.getElementById('members').hidden)return;
  const scroll=document.querySelector('.member-grid .table-scroll');if(!scroll.clientWidth)return;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=type=>parts.find(part=>part.type===type).value,today=`${part('year')}-${part('month')}-${part('day')}`,day=Date.parse(today+'T00:00:00Z');
  const candidates=(memberData.dates || []).flatMap((dates,index)=>{
    if(!dates?.start || document.querySelectorAll('#member-table th')[index]?.hidden)return [];
    const start=Date.parse(dates.start+'T00:00:00Z'),end=Date.parse((dates.end || dates.start)+'T00:00:00Z');if(!Number.isFinite(start) || !Number.isFinite(end))return [];
    return [{index,distance:day<start?start-day:day>end?day-end:0,exact:dates.start===today && !dates.end}];
  }).sort((a,b)=>a.distance-b.distance || Number(b.exact)-Number(a.exact) || a.index-b.index);
  if(!candidates.length)return;
  const target=document.querySelectorAll('#member-table th')[candidates[0].index],box=scroll.getBoundingClientRect();
  const fixed=[...document.querySelectorAll('#member-table col')].slice(0,memberData.headers.indexOf('단톡')+1).reduce((sum,col)=>sum+col.getBoundingClientRect().width,0);
  const rect=target.getBoundingClientRect();scroll.scrollLeft+=rect.left+rect.width/2-(box.left+fixed+(scroll.clientWidth-fixed)/2);memberCentered=true;
}
function renderMembers(data, query='') {
  const source=data;
  const order=[0,data.headers.indexOf('클래스'),1,...data.headers.map((_,index)=>index).filter(index=>index>2)];
  data={...data,headers:order.map(index=>data.headers[index]),dates:order.map(index=>data.dates?.[index]),members:data.members.map(row=>order.map(index=>row[index]))};
  memberData=data;
  const nameIndex=data.headers.indexOf('닉네임');
  const rows=data.members.filter(row=>String(row[nameIndex]).toLowerCase().includes(query.toLowerCase()));
  if(memberSort){
    const index=memberSort.index,direction=memberSort.direction==='descending'?-1:1;
    const rank=value=>{const text=String(value??'').trim().toUpperCase();return text==='O'||text==='ㅇ'?2:text==='X'?1:0;};
    const isStatus=index===data.headers.indexOf('단톡') || (index>=4 && data.members.every(row=>['O','ㅇ','X','-',''].includes(String(row[index]??'').trim().toUpperCase())));
    const isNumeric=index===0 || (index>=4 && !isStatus);
    rows.sort((a,b)=>{
      let compared;
      if(isStatus)compared=rank(a[index])-rank(b[index]);
      else if(isNumeric){const number=value=>value===null || String(value).trim()==='' || value==='-'?-Infinity:Number(String(value).replaceAll(',',''));const left=number(a[index]),right=number(b[index]);compared=left===right?0:left<right?-1:1;}
      else compared=String(a[index]??'').localeCompare(String(b[index]??''),'ko',{numeric:true});
      return compared*direction || Number(a[0])-Number(b[0]);
    });
  }
  const table=document.getElementById('member-table');table.replaceChildren();
  const showGrowth=document.getElementById('member-growth-toggle').checked;
  const hiddenGrowth=index=>!showGrowth && data.headers[index]==='성장도 기록';
  const classIndex=data.headers.indexOf('클래스'),chatIndex=data.headers.indexOf('단톡'),identityCount=chatIndex+1;
  const identityClass=index=>index===0?'member-number':index===nameIndex?'member-name':index===classIndex?'member-class':index===chatIndex?'member-chat':undefined;
  const columns=element('colgroup');data.headers.forEach((_,index)=>{const col=element('col',undefined,index===0?'number-column':index===nameIndex?'name-column':index===classIndex?'class-column':index===chatIndex?'chat-column':'content-column');col.hidden=hiddenGrowth(index);columns.append(col);});table.append(columns);
  table.style.setProperty('--content-count',data.headers.filter((_,index)=>index>=identityCount && !hiddenGrowth(index)).length);
  const head=element('thead'),titles=element('tr');
  const shortDate=value=>{const match=String(value || '').match(/^\d{4}-(\d{2})-(\d{2})$/);return match?Number(match[1])+'/'+Number(match[2]):value;};
  data.headers.forEach((title,index)=>{
    const cell=element('th',undefined,identityClass(index));cell.scope='col';
    cell.hidden=hiddenGrowth(index);
    const active=memberSort?.index===index,next=active && memberSort.direction==='descending'?'ascending':'descending';
    cell.setAttribute('aria-sort',active?memberSort.direction:'none');
    const button=element('button',undefined,'member-sort');button.type='button';button.dataset.column=title;button.setAttribute('aria-label',`${title}, ${next==='descending'?'내림차순':'오름차순'} 정렬`);button.title=button.getAttribute('aria-label');button.append(element('span',title,'column-title'));
    const indicator=element('i');indicator.dataset.lucide=active?(memberSort.direction==='descending'?'chevron-down':'chevron-up'):'chevrons-up-down';button.append(indicator);
    button.addEventListener('click',()=>{memberSort={index,direction:next};renderMembers(source,query);table.querySelectorAll('.member-sort')[index]?.focus({preventScroll:true});});
    const dates=data.dates?.[index];if(dates?.start || dates?.end){const label=element('small',undefined,'content-date');if(dates.start)label.append(element('span',shortDate(dates.start)));if(dates.end)label.append(element('span','~ '+shortDate(dates.end)));button.append(label);}
    cell.append(button);
    titles.append(cell);
  });head.append(titles);table.append(head);
  const body=element('tbody');
  for(const [line,row] of rows.entries()) {const tr=element('tr');row.forEach((value,index)=>{const td=element('td',undefined,index===nameIndex?'name member-name':identityClass(index));if(index===0)td.textContent=line+1;else if(index===classIndex)td.append(classIcon(value));else if(index===chatIndex || index>=identityCount){const status=element('span',typeof value==='number'?value.toLocaleString('ko-KR'):value??'-','status '+(value==='O'||value==='ㅇ'?'yes':value==='X'||value==='x'?'no':value==='-'||value===null?'pending':''));td.append(status);}else td.textContent=value;tr.append(td);});body.append(tr);}
  body.querySelectorAll('tr').forEach(row=>[...row.children].forEach((cell,index)=>cell.hidden=hiddenGrowth(index)));
  table.append(body);document.getElementById('member-count').textContent=`${data.members.length} / 60 명`;
  document.getElementById('empty-search').hidden=rows.length>0;
  window.dispatchEvent(new CustomEvent('guild-members-data',{detail:source}));
  refreshIcons();
  requestAnimationFrame(centerMemberToday);
}
function renderDistribution(groups) {
  const target=document.getElementById('distribution-content');
  for(const group of groups){const section=element('section',undefined,'distribution-group');const heading=element('div',undefined,'distribution-heading');heading.append(element('h2',group.title),element('span',`${group.records.length}건`,'record-count'));section.append(heading);
    if(!group.records.length){section.append(element('p','등록된 분배 기록이 없습니다.','empty'));}
    else{const table=element('table');const head=element('thead');const headings=element('tr');['닉네임','아이템','낙찰 금액','입찰방식'].forEach(label=>headings.append(element('th',label)));head.append(headings);table.append(head);const body=element('tbody');for(const record of group.records){const row=element('tr');[record.name,record.item,record.amount===null?'-':record.amount.toLocaleString('ko-KR'),record.bidding || '-'].forEach(value=>row.append(element('td',value)));body.append(row);}table.append(body);section.append(table);}target.append(section);
  }
}
fetch('data.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('load');return response.json();}).then(data=>{renderRules(data.rules);renderMembers(data);renderDistribution(data.distribution);document.getElementById('search').addEventListener('input',event=>renderMembers(data,event.target.value));document.getElementById('member-growth-toggle').addEventListener('change',()=>{if(!document.getElementById('member-growth-toggle').checked && memberSort && memberData.headers[memberSort.index]==='성장도 기록')memberSort=null;memberCentered=false;renderMembers(data,document.getElementById('search').value);});document.getElementById('loading').hidden=true;switchTab(location.hash.slice(1));}).catch(()=>{document.getElementById('loading').textContent='길드 정보를 불러오지 못했습니다. 잠시 후 새로고침해주세요.';});
loadNotices();
try{const cache=JSON.parse(localStorage.getItem('guild-tips-cache-v1'));if(cache && Date.now()-cache.savedAt<86400000 && validTips(cache.tips)){renderTips(cache.tips);tipsLoaded=true;}}catch{}
loadTips();
