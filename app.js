const tabs = ['rules', 'notices', 'members', 'distribution', 'tips', 'tools'];
let tipsLoaded=false;
let tipsRequest=null,pendingTips=null;
let noticesLoaded=false;
let noticesLoading=false;
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
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
  const label=document.querySelector(`[data-tab="${tab}"]`).textContent.trim();
  document.getElementById('current-view').textContent=label;
  document.title=`${label} | 절대중립`;
  window.scrollTo({top:0,behavior:'instant'});
  updateChapterNavigation();
  if(tab==='tips' && !tipsLoaded) loadTips();
  else if(tab==='tips')openSharedTip();
  if(tab==='notices' && !noticesLoaded) loadNotices();
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
    const kind=layouts[match[1]] || 'updates';
    const wrapper=element('section',undefined,'policy-section policy-'+kind);
    wrapper.append(element('h2',match[1].replace(/^\d+\.\s*/,'')));
    const body=element('div',undefined,'policy-body');
    const content=match[2].trim();
    if(kind==='schedule') {
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
  overview.append(group('operation-copy',['direction','growth','relations']),group('schedule-rail',['schedule','timing']));target.append(overview);
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
let noticeImages=[],noticeImageGeneration=0,noticeImageWork=Promise.resolve(),noticeSaving=false;
const noticeImageUrl=(postId,imageId)=>noticesApi+'/'+encodeURIComponent(postId)+'/images/'+encodeURIComponent(imageId);
function renderNoticeImagePreviews(){
  const target=document.getElementById('notice-image-previews');target.replaceChildren();
  noticeImages.forEach((image,index)=>{
    const figure=element('figure'),preview=element('img');preview.src=image.id?noticeImageUrl(editingNotice,image.id):`data:${image.mime};base64,${image.data}`;preview.alt=`첨부 사진 ${index+1}`;
    const remove=element('button',undefined,'icon-button');remove.type='button';remove.title='사진 삭제';remove.setAttribute('aria-label',`첨부 사진 ${index+1} 삭제`);const icon=element('i');icon.dataset.lucide='x';remove.append(icon);remove.disabled=noticeSaving;
    remove.addEventListener('click',()=>{if(noticeSaving)return;noticeImages.splice(index,1);renderNoticeImagePreviews();});figure.append(preview,remove);target.append(figure);
  });refreshIcons();
}
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
function queueNoticeImages(files){
  if(noticeSaving)return;
  const generation=noticeImageGeneration;
  noticeImageWork=noticeImageWork.then(async()=>{
    const status=document.getElementById('notice-form-status');
    for(const file of files){
      if(generation!==noticeImageGeneration || noticeForm.hidden)return;
      if(noticeImages.length>=5){status.textContent='사진은 최대 5장까지 첨부할 수 있습니다.';return;}
      try{status.textContent='사진을 준비 중입니다.';const image=await encodeNoticeImage(file);if(generation!==noticeImageGeneration)return;noticeImages.push(image);renderNoticeImagePreviews();status.textContent='';}
      catch(error){if(generation===noticeImageGeneration)status.textContent=error.message;}
    }
  });
}
noticeForm.addEventListener('paste',event=>{
  const files=[...event.clipboardData.items].filter(item=>item.kind==='file' && item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);
  if(files.length){event.preventDefault();queueNoticeImages(files);}
});
document.getElementById('add-notice-image').addEventListener('click',()=>document.getElementById('notice-image-input').click());
document.getElementById('notice-image-input').addEventListener('change',event=>{queueNoticeImages([...event.target.files]);event.target.value='';});
function noticeAdmin(){return !!noticeToken && Date.now()<noticeExpiry;}
function showNoticeEditor(record=null){
  editingNotice=record?.id || null;noticeForm.reset();noticeForm.elements.title.value=record?.title || '';noticeForm.elements.content.value=record?.content || '';
  noticeImageGeneration++;noticeImages=(record?.images || []).map(({id,mime})=>({id,mime}));renderNoticeImagePreviews();
  document.getElementById('notice-form-heading').textContent=record?'공지 수정':'새 공지';noticeForm.querySelector('[type="submit"]').textContent=record?'저장':'등록';
  document.getElementById('notice-form-status').textContent='';noticeLogin.hidden=true;noticeForm.hidden=false;document.getElementById('new-notice').setAttribute('aria-expanded','true');noticeForm.elements.title.focus();
}
function closeNoticeForms(){if(noticeSaving)return;noticeImageGeneration++;noticeImages=[];renderNoticeImagePreviews();noticeForm.hidden=true;noticeLogin.hidden=true;noticeLogin.reset();document.getElementById('new-notice').setAttribute('aria-expanded','false');}
const boardViews=new Map(),viewRequests=new Map();
function bindBoardViews(entry,summary,record,board){
  const key='guild-post-view-v1:'+board+':'+record.id;
  let stored;try{stored=Number(sessionStorage.getItem(key));}catch{}
  if(stored>0)boardViews.set(key,stored);
  const badge=element('span',undefined,'entry-views'),icon=element('i'),number=element('span');icon.dataset.lucide='eye';badge.append(icon,number);summary.append(badge);
  const display=()=>{const views=Math.max(Number(record.views)||0,boardViews.get(key)||0);number.textContent=views.toLocaleString('ko-KR');badge.setAttribute('aria-label',`조회수 ${views}`);badge.title='조회수';};display();
  const track=async()=>{
    if(!entry.open || entry.closest('section')?.hidden)return;
    if(boardViews.has(key)){display();return;}
    if(!viewRequests.has(key)){
      const request=(async()=>{
        const response=await fetch((board==='tips'?tipsApi:noticesApi)+'/'+encodeURIComponent(record.id)+'/view',{method:'POST',signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw new Error('View unavailable');const data=await response.json();
        if(!Number.isSafeInteger(data.views) || data.views<1)throw new Error('Invalid view count');
        boardViews.set(key,data.views);try{sessionStorage.setItem(key,String(data.views));}catch{}
      })();viewRequests.set(key,request);
    }
    const request=viewRequests.get(key);
    try{await request;display();}catch{}finally{if(viewRequests.get(key)===request)viewRequests.delete(key);}
  };
  entry.addEventListener('toggle',track);entry.addEventListener('guild-view',track);
}
function renderNotices(records){
  noticeRecords=records;const target=document.getElementById('notices-list');target.replaceChildren();
  document.getElementById('notice-count').textContent=`공지 ${records.length}건`;document.getElementById('notices-status').textContent=records.length?'':'등록된 공지가 없습니다.';
  document.getElementById('notice-logout').hidden=!noticeAdmin();
  for(const record of records){
    const entry=element('details',undefined,'board-entry'),summary=element('summary');
    const date=new Date(record.created_at),time=element('time',date.toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}));time.dateTime=date.toISOString();
    const icon=element('i',undefined,'disclosure-icon');icon.dataset.lucide='chevron-down';summary.append(element('span','공지','notice-tag'),element('span',record.title,'entry-title'),time);bindBoardViews(entry,summary,record,'notices');summary.append(icon);
    const body=element('div',undefined,'entry-body');body.append(element('p',record.content,'notice-content'));
    for(const [index,image] of (record.images || []).entries()){
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
  }refreshIcons();
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
document.getElementById('notice-logout').addEventListener('click',async()=>{
  try{await noticeWrite('/session','DELETE');}catch{}noticeToken='';noticeExpiry=0;closeNoticeForms();renderNotices(noticeRecords);
});
noticeLogin.addEventListener('submit',async event=>{
  event.preventDefault();const submit=noticeLogin.querySelector('[type="submit"]'),status=document.getElementById('notice-login-status');submit.disabled=true;status.textContent='확인 중입니다.';
  try{const response=await fetch(noticesApi+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:noticeLogin.elements.password.value}),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw new Error(data.error || '로그인하지 못했습니다.');noticeToken=data.token;noticeExpiry=data.expires_at;noticeLogin.reset();renderNotices(noticeRecords);showNoticeEditor();}
  catch(error){status.textContent=error.name==='TimeoutError'?'응답이 지연되고 있습니다. 다시 시도해주세요.':error.message;}finally{submit.disabled=false;}
});
noticeForm.addEventListener('submit',async event=>{
  event.preventDefault();if(noticeSaving)return;noticeSaving=true;const submit=noticeForm.querySelector('[type="submit"]'),status=document.getElementById('notice-form-status');submit.disabled=true;document.getElementById('cancel-notice').disabled=true;document.getElementById('add-notice-image').disabled=true;renderNoticeImagePreviews();
  try{await noticeImageWork;if(!noticeForm.elements.content.value.trim() && !noticeImages.length)throw new Error('내용이나 사진을 추가해주세요.');status.textContent='저장 중입니다.';const values=Object.fromEntries(new FormData(noticeForm));values.images=noticeImages.map(({id,mime,data})=>id?{id}:{mime,data});if(editingNotice)values.updated_at=noticeRecords.find(record=>record.id===editingNotice)?.updated_at;await noticeWrite(editingNotice?'/'+editingNotice:'',editingNotice?'PUT':'POST',values);noticeForm.reset();noticeSaving=false;closeNoticeForms();await loadNotices();}
  catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 새로고침하여 등록 여부를 확인해주세요.':error.message;}finally{noticeSaving=false;submit.disabled=false;document.getElementById('cancel-notice').disabled=false;document.getElementById('add-notice-image').disabled=false;renderNoticeImagePreviews();}
});
const tipsApi='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/tips';
const tipForm=document.getElementById('tip-form');
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
  item.open=true;requestAnimationFrame(()=>{if(sharedTipId()!==id)return;item.scrollIntoView({block:'center'});item.querySelector('summary').focus({preventScroll:true});});
}
async function copyTipLink(id,button){
  const url=new URL(location.href);url.search='';url.hash='tips/'+encodeURIComponent(id);
  const status=document.getElementById('tips-status');
  try {
    try{await navigator.clipboard.writeText(url.href);}catch{
      const input=element('textarea');input.value=url.href;input.readOnly=true;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
      let copied=false;try{copied=document.execCommand('copy');}finally{input.remove();button.focus({preventScroll:true});}if(!copied)throw new Error('clipboard');
    }
    status.textContent='링크를 복사했습니다.';button.title='복사 완료';button.setAttribute('aria-label','링크 복사 완료');
    setTimeout(()=>{button.title='링크 복사';button.setAttribute('aria-label','팁 링크 복사');},2000);
  } catch{status.textContent='링크를 직접 복사해주세요.';window.prompt('이 팁의 공유 링크',url.href);}
}
function tipUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol) && !url.username && !url.password?url:null;}catch{return null;}}
function tipMedia(url){
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
  if(media){
    let node;
    if(media.kind==='image'){
      node=element('img');node.alt='팁 첨부 이미지';node.loading='lazy';node.decoding='async';node.src=media.src;
    } else if(['video','audio'].includes(media.kind)){
      node=element(media.kind);node.controls=true;node.preload='none';node.src=media.src;if(media.kind==='video')node.playsInline=true;
    } else {
      node=element('iframe');node.title=media.title;node.loading='lazy';node.referrerPolicy='strict-origin-when-cross-origin';node.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-presentation');node.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';node.allowFullscreen=true;node.dataset.embedSrc=media.src;node.src=media.src;
      figure.classList.add(media.video?'tip-video-embed':'tip-page-embed');
    }
    node.addEventListener('error',()=>{node.hidden=true;figure.prepend(element('p','미디어를 불러오지 못했습니다. 원본 링크를 확인해주세요.','media-error'));},{once:true});figure.append(node);
  }
  const caption=element('figcaption');caption.append(tipLink(url,url.hostname+' · 원본 열기'));figure.append(caption);body.append(figure);
}
function tipManageForm(tip,mode,item,body){
  body.querySelector('.tip-manage-form')?.remove();
  const form=element('form',undefined,'tip-form tip-manage-form');form.append(element('h3',mode==='edit'?'팁 수정':'팁 삭제'));
  const fields=element('div',undefined,'form-fields');
  if(mode==='edit'){
    for(const [name,label,max] of [['title','제목',100],['author','닉네임',30],['url','링크',2000],['content','내용',5000]]){
      const field=element('label',label,'full-field'),input=element(name==='content'?'textarea':'input');input.name=name;input.value=tip[name] || '';input.maxLength=max;input.required=['title','content'].includes(name);if(name==='content')input.rows=5;else input.type=name==='url'?'url':'text';field.append(input);fields.append(field);
    }
  }
  const label=element('label','작성 비밀번호 또는 관리자 비밀번호','full-field'),password=element('input');password.name='password';password.type='password';password.maxLength=128;password.required=true;password.autocomplete='off';label.append(password);fields.append(label);form.append(fields);
  const actions=element('div',undefined,'form-actions'),status=element('span');status.setAttribute('role','status');
  const cancel=element('button','취소','secondary-button');cancel.type='button';cancel.addEventListener('click',()=>{form.remove();applyPendingTips();});
  const submit=element('button',mode==='edit'?'저장':'삭제',mode==='edit'?'primary-button':'danger-button');submit.type='submit';actions.append(status,cancel,submit);form.append(actions);
  form.addEventListener('submit',async event=>{
    event.preventDefault();submit.disabled=true;cancel.disabled=true;status.textContent='처리 중입니다.';
    try{
      const response=await fetch(tipsApi+'/'+encodeURIComponent(tip.id),{method:mode==='edit'?'PUT':'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form))),signal:AbortSignal.timeout(15000)});
      const result=await response.json();if(!response.ok)throw new Error(result.error || '처리하지 못했습니다.');
      const id=tip.id;if(mode==='delete' && sharedTipId()===id)history.replaceState(null,'','#tips');
      form.remove();await loadTips({force:true});if(mode==='edit'){const entry=[...document.querySelectorAll('#tips-list details')].find(node=>node.dataset.tipId===id);if(entry)entry.open=true;}
    }catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 새로고침하여 결과를 확인해주세요.':error.message;}
    finally{submit.disabled=false;cancel.disabled=false;}
  });body.append(form);item.open=true;password.focus({preventScroll:true});form.scrollIntoView({block:'nearest'});
}
function renderTips(tips){
  const opened=new Set([...document.querySelectorAll('#tips-list details[open]')].map(item=>item.dataset.tipId));
  const list=document.getElementById('tips-list');list.replaceChildren();
  for(const tip of tips){
    const item=element('details',undefined,'board-entry');item.dataset.tipId=tip.id;const summary=element('summary');
    item.dataset.searchText=normalizeTipSearch([tip.title,tip.content,tip.author,tip.url].join(' '));
    const disclosure=element('i',undefined,'disclosure-icon');disclosure.dataset.lucide='chevron-down';
    const share=element('button',undefined,'icon-button tip-share');share.type='button';share.title='링크 복사';share.setAttribute('aria-label','팁 링크 복사');
    const shareIcon=element('i');shareIcon.dataset.lucide='link';share.append(shareIcon);
    share.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();copyTipLink(tip.id,share);});
    summary.append(element('span',tip.title,'entry-title'),element('span',tip.author,'entry-author'),element('time',new Date(tip.created_at).toLocaleDateString('ko-KR')));bindBoardViews(item,summary,tip,'tips');summary.append(disclosure,share);
    const body=element('div',undefined,'entry-body'),urls=new Map();appendTipContent(body,tip.content,urls);
    const url=tipUrl(tip.url);if(url)urls.set(url.href,url);
    let embedded=false;
    const mediaBody=element('div',undefined,'tip-media');body.append(mediaBody);
    item.addEventListener('toggle',()=>{
      if(item.open){if(!embedded){embedded=true;for(const url of [...urls.values()].slice(0,10))appendTipEmbed(mediaBody,url);}else body.querySelectorAll('iframe').forEach(frame=>{frame.src=frame.dataset.embedSrc;});}
      else {body.querySelectorAll('video,audio').forEach(media=>media.pause());body.querySelectorAll('iframe').forEach(frame=>{frame.src='about:blank';});}
    });
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
      try{const saved=JSON.stringify({savedAt:Date.now(),tips:data.tips.map(({id,title,content,url,author,created_at,views})=>({id,title,content,url,author,created_at,views}))});if(saved.length<=2000000)localStorage.setItem('guild-tips-cache-v1',saved);}catch{}
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
  try{const response=await fetch(tipsApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw new Error(result.error || '등록하지 못했습니다.');tipForm.reset();status.textContent='';showTipForm(false);await loadTips({force:true});}
  catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 새로고침하여 등록 여부를 확인해주세요.':error.message;}
  finally{submit.disabled=false;}
});
function renderMembers(data, query='') {
  const rows=data.members.filter(row=>String(row[1]).toLowerCase().includes(query.toLowerCase()));
  const table=document.getElementById('member-table');table.replaceChildren();
  const columns=element('colgroup');data.headers.forEach((_,index)=>columns.append(element('col',undefined,index===0?'number-column':index===1?'name-column':index===2?'chat-column':'content-column')));table.append(columns);
  table.style.setProperty('--content-count',data.headers.length-3);
  const head=element('thead'),titles=element('tr');
  const shortDate=value=>{const match=String(value || '').match(/^\d{4}-(\d{2})-(\d{2})$/);return match?Number(match[1])+'/'+Number(match[2]):value;};
  data.headers.forEach((title,index)=>{
    const cell=element('th',undefined,index===0?'member-number':index===1?'member-name':index===2?'member-chat':undefined);cell.scope='col';cell.append(element('span',title,'column-title'));
    const dates=data.dates?.[index];if(dates?.start || dates?.end){const label=element('small',undefined,'content-date');if(dates.start)label.append(element('span',shortDate(dates.start)));if(dates.end)label.append(element('span','~ '+shortDate(dates.end)));cell.append(label);}
    titles.append(cell);
  });head.append(titles);table.append(head);
  const body=element('tbody');
  for(const row of rows) {const tr=element('tr');row.forEach((value,index)=>{const td=element('td',undefined,index===0?'member-number':index===1?'name member-name':index===2?'member-chat':undefined);if(index>=2){const status=element('span',typeof value==='number'?value.toLocaleString('ko-KR'):value??'-','status '+(value==='O'||value==='ㅇ'?'yes':value==='X'||value==='x'?'no':value==='-'||value===null?'pending':''));td.append(status);}else td.textContent=value;tr.append(td);});body.append(tr);}
  table.append(body);document.getElementById('member-count').textContent=`${rows.length} / ${data.members.length}명`;
  document.getElementById('empty-search').hidden=rows.length>0;
}
function renderDistribution(groups) {
  const target=document.getElementById('distribution-content');
  for(const group of groups){const section=element('section',undefined,'distribution-group');const heading=element('div',undefined,'distribution-heading');heading.append(element('h2',group.title),element('span',`${group.records.length}건`,'record-count'));section.append(heading);
    if(!group.records.length){section.append(element('p','등록된 분배 기록이 없습니다.','empty'));}
    else{const table=element('table');const head=element('thead');const headings=element('tr');['닉네임','아이템','낙찰 금액'].forEach(label=>headings.append(element('th',label)));head.append(headings);table.append(head);const body=element('tbody');for(const record of group.records){const row=element('tr');[record.name,record.item,record.amount===null?'-':record.amount.toLocaleString('ko-KR')].forEach(value=>row.append(element('td',value)));body.append(row);}table.append(body);section.append(table);}target.append(section);
  }
}
fetch('data.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('load');return response.json();}).then(data=>{renderRules(data.rules);renderMembers(data);renderDistribution(data.distribution);document.getElementById('search').addEventListener('input',event=>renderMembers(data,event.target.value));document.getElementById('loading').hidden=true;switchTab(location.hash.slice(1));}).catch(()=>{document.getElementById('loading').textContent='길드 정보를 불러오지 못했습니다. 잠시 후 새로고침해주세요.';});
loadNotices();
try{const cache=JSON.parse(localStorage.getItem('guild-tips-cache-v1'));if(cache && Date.now()-cache.savedAt<86400000 && validTips(cache.tips)){renderTips(cache.tips);tipsLoaded=true;}}catch{}
loadTips();
