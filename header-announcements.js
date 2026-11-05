(() => {
 const endpoint='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/site-sections',key='상단 공지';
 const banner=document.getElementById('site-announcement'),viewport=banner.querySelector('.site-announcement-viewport'),message=document.getElementById('site-announcement-message'),pauseButton=document.getElementById('site-announcement-pause');
 const adminPanel=document.getElementById('header-announcements-admin'),list=document.getElementById('header-announcement-list'),status=document.getElementById('header-announcement-status');
 let messages=[],draft=[],version=0,animationTimer=null,index=0,manuallyPaused=false,saving=false;
 const isAdmin=()=>!!window.GuildAuth?.user?.isAdmin&&window.GuildAuth.expiresAt>Date.now();
 const icon=(name)=>{const node=document.createElement('i');node.dataset.lucide=name;return node;};
 const refreshIcons=()=>window.lucide?.createIcons({attrs:{'aria-hidden':'true','stroke-width':1.7}});
 async function load(){
  try{const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();const data=await response.json(),record=data.sections?.[key];version=record?.version??0;const parsed=record?.body?JSON.parse(record.body):{messages:[]};messages=Array.isArray(parsed.messages)?parsed.messages.filter(text=>typeof text==='string'&&text.trim()).map(text=>text.trim()):[];if(index>=messages.length)index=0;play();if(isAdmin()&&!list.dataset.dirty){draft=[...messages];renderEditor();}}
  catch{if(!animationTimer&&messages.length)play();}
 }
 function play(){clearTimeout(animationTimer);banner.hidden=!messages.length;if(!messages.length)return;index%=messages.length;message.textContent=messages[index];message.style.animation='none';message.getBoundingClientRect();const textWidth=message.scrollWidth,distance=viewport.clientWidth+textWidth,duration=Math.max(8,distance/58);message.style.setProperty('--ticker-start',`${viewport.clientWidth}px`);message.style.setProperty('--ticker-end',`${-textWidth}px`);message.style.animation=`ticker-flow ${duration}s linear forwards`;message.style.animationPlayState=manuallyPaused?'paused':'running';animationTimer=setTimeout(()=>{index=(index+1)%messages.length;play();},duration*1000+900);}
 pauseButton.addEventListener('click',()=>{manuallyPaused=!manuallyPaused;pauseButton.setAttribute('aria-pressed',String(manuallyPaused));pauseButton.setAttribute('aria-label',manuallyPaused?'공지 흐름 재개':'공지 흐름 멈추기');pauseButton.title=manuallyPaused?'공지 흐름 재개':'공지 흐름 멈추기';pauseButton.replaceChildren(icon(manuallyPaused?'play':'pause'));message.style.animationPlayState=manuallyPaused?'paused':'running';refreshIcons();});
 message.addEventListener('animationend',()=>{clearTimeout(animationTimer);animationTimer=setTimeout(()=>{index=(index+1)%messages.length;play();},850);});
 document.addEventListener('visibilitychange',()=>{message.style.animationPlayState=document.hidden||manuallyPaused?'paused':'running';});
 window.addEventListener('resize',()=>{if(!banner.hidden)play();});
 function markDirty(){list.dataset.dirty='true';status.textContent='저장되지 않은 변경 사항이 있습니다.';}
 function renderEditor(){
  if(!list)return;list.replaceChildren();draft.forEach((text,i)=>{
   const row=document.createElement('div');row.className='header-announcement-row';const input=document.createElement('input');input.type='text';input.maxLength=240;input.value=text;input.placeholder='공지 메시지';input.setAttribute('aria-label',`공지 메시지 ${i+1}`);input.addEventListener('input',()=>{draft[i]=input.value;markDirty();});
   const actions=document.createElement('div');actions.className='header-announcement-row-actions';
   for(const [name,glyph,delta] of [['위로','arrow-up',-1],['아래로','arrow-down',1]]){const button=document.createElement('button');button.type='button';button.className='icon-button';button.title=name;button.setAttribute('aria-label',`${name} 이동`);button.disabled=i+delta<0||i+delta>=draft.length;button.append(icon(glyph));button.addEventListener('click',()=>{[draft[i],draft[i+delta]]=[draft[i+delta],draft[i]];markDirty();renderEditor();});actions.append(button);}
   const remove=document.createElement('button');remove.type='button';remove.className='icon-button';remove.title='메시지 삭제';remove.setAttribute('aria-label',`메시지 ${i+1} 삭제`);remove.append(icon('trash-2'));remove.addEventListener('click',()=>{draft.splice(i,1);markDirty();renderEditor();});actions.append(remove);row.append(input,actions);list.append(row);
  });
  if(!draft.length){const empty=document.createElement('p');empty.className='header-announcement-empty';empty.textContent='등록된 메시지가 없습니다.';list.append(empty);}refreshIcons();
 }
 document.getElementById('header-announcement-add').addEventListener('click',()=>{if(draft.length>=50){status.textContent='메시지는 최대 50개까지 등록할 수 있습니다.';return;}draft.push('');markDirty();renderEditor();list.querySelector('input:last-of-type')?.focus();});
 document.getElementById('header-announcement-save').addEventListener('click',async()=>{
  if(!isAdmin()||saving)return;const clean=draft.map(text=>text.trim()).filter(Boolean);if(clean.length!==draft.filter(text=>text.trim()).length||clean.some(text=>text.length>240)){status.textContent='메시지는 1~240자로 입력해주세요.';return;}
  saving=true;status.textContent='저장 중입니다.';
  try{const response=await fetch(endpoint+'/'+encodeURIComponent(key),{method:'PUT',headers:{'Content-Type':'application/json',...window.GuildAuth.headers()},body:JSON.stringify({baseVersion:version,title:key,body:JSON.stringify({messages:clean}),reset:false}),cache:'no-store',signal:AbortSignal.timeout(10000)});const value=await response.json();if(!response.ok)throw Error(value.error||'저장하지 못했습니다.');version=value.section.version;messages=clean;draft=[...clean];list.dataset.dirty='';index=0;renderEditor();play();status.textContent=`${clean.length}개 메시지를 저장했습니다.`;}
  catch(error){status.textContent=error.message;}
  finally{saving=false;}
 });
 function syncAdmin(){const active=isAdmin();adminPanel.hidden=!active;if(active&&!list.dataset.dirty){draft=[...messages];renderEditor();}}
 window.addEventListener('guild-auth-change',()=>{syncAdmin();load();});
 window.addEventListener('pageshow',load);window.addEventListener('online',load);
 syncAdmin();load();setInterval(()=>{if(!document.hidden)load();},60000);
})();
