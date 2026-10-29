(() => {
 const api='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/site-sections';
 let overrides={},base='',loaded=false,pending,active=null,busy=false,dirty=false,restoredFrom=null,reset=false,revisionPage=null;
 const original=new Map(),node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const admin=()=>!!window.GuildAuth?.user?.isAdmin&&window.GuildAuth.expiresAt>Date.now();
 const iconButton=(name,icon,action)=>{const button=node('button',undefined,'icon-button'),symbol=node('i');button.type='button';button.title=name;button.setAttribute('aria-label',name);symbol.dataset.lucide=icon;button.append(symbol);button.addEventListener('click',action);return button;};
 const icons=()=>window.lucide?.createIcons();
 const dialog=node('dialog',undefined,'section-editor-dialog');dialog.id='section-editor-dialog';dialog.setAttribute('aria-labelledby','section-editor-title');
 const heading=node('div',undefined,'section-editor-heading'),headingText=node('h2','섹션 편집');headingText.id='section-editor-title';
 const close=iconButton('닫기','x',()=>cancel());heading.append(headingText,close);
 const form=node('form'),titleLabel=node('label','제목'),title=node('input'),bodyLabel=node('label','본문'),body=node('textarea');title.maxLength=100;title.required=true;titleLabel.append(title);body.maxLength=20000;body.rows=13;bodyLabel.append(body);
 const tabs=node('div',undefined,'section-editor-tabs'),edit=iconButton('편집','pencil',()=>mode('edit')),preview=iconButton('미리보기','eye',()=>mode('preview')),history=iconButton('변경 이력','history',()=>showHistory());tabs.append(edit,preview,history);
 const fields=node('div',undefined,'section-editor-fields');fields.append(titleLabel,bodyLabel);
 const previewPane=node('div',undefined,'section-editor-preview'),historyPane=node('div',undefined,'section-editor-history');previewPane.hidden=true;historyPane.hidden=true;
 const historySelect=node('select'),historyMore=iconButton('이전 이력 더 보기','chevrons-down',()=>showHistory(true)),restore=iconButton('선택 내용 불러오기','rotate-ccw',()=>restoreSelection());historySelect.setAttribute('aria-label','변경 버전');historyPane.append(historySelect,historyMore,restore);
 const status=node('p',undefined,'section-editor-status');status.setAttribute('role','status');
 const actions=node('div',undefined,'form-actions'),reload=iconButton('최신 내용 불러오기','refresh-cw',()=>reloadDraft()),source=iconButton('기본 원문 불러오기','file-text',()=>useSource()),cancelButton=node('button','취소','secondary-button'),save=node('button',undefined,'primary-button'),saveIcon=node('i');saveIcon.dataset.lucide='save';save.append(saveIcon,node('span','저장'));save.type='submit';cancelButton.type='button';cancelButton.addEventListener('click',cancel);actions.append(source,reload,cancelButton,save);
 form.append(tabs,fields,previewPane,historyPane,status,actions);dialog.append(heading,form);document.body.append(dialog);
 let revisions=[];
 function setBusy(value){busy=value;for(const button of dialog.querySelectorAll('button'))button.disabled=value;title.disabled=value;body.disabled=value;historySelect.disabled=value;}
 function mode(value){fields.hidden=value!=='edit';previewPane.hidden=value!=='preview';historyPane.hidden=value!=='history';for(const [button,name]of [[edit,'edit'],[preview,'preview'],[history,'history']])button.setAttribute('aria-pressed',String(value===name));if(value==='preview'){previewPane.replaceChildren(node('h3',title.value),node('p',body.value));}}
 async function request(suffix='',options={}){
  const response=await fetch(api+suffix,{...options,headers:{...(options.method?{'Content-Type':'application/json'}:{}),...(options.auth?window.GuildAuth?.headers():{}),...options.headers},cache:'no-store',signal:AbortSignal.timeout(options.auth?10000:3000)});
  const value=await response.json();if(!response.ok){const error=new Error(value.error||'요청을 처리하지 못했습니다.');error.status=response.status;throw error;}return value;
 }
 async function load(){
  if(pending)return pending;
  pending=(async()=>{try{const value=await request();if(!value.sections||Array.isArray(value.sections)||typeof value.sections!=='object')throw Error('Invalid section data');const next={...value.sections};for(const [key,record]of Object.entries(overrides))if(record.version>(next[key]?.version??0))next[key]=record;const changed=JSON.stringify(next)!==JSON.stringify(overrides);overrides=next;loaded=true;if(changed&&base)announce();return true;}catch{loaded=false;return false;}finally{pending=null;}})();return pending;
 }
 function setSource(text){base=text;original.clear();for(const part of text.split(/\r?\n(?=\[)/)){const m=part.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);if(m)original.set(m[1],{title:m[1]==='시간'?'콘텐츠 시간':m[1].replace(/^\d+\.\s*/,''),body:m[2].trim()});}}
 function rules(text=base){return text.split(/\r?\n(?=\[)/).map(part=>{const m=part.match(/^\[([^\]]+)\]\s*([\s\S]*)$/),saved=m&&overrides[m[1]];return m&&typeof saved?.body==='string'?'['+m[1]+']\n\n'+saved.body+'\n':part;}).join('\n');}
 function announce(){window.dispatchEvent(new CustomEvent('guild-section-content-change',{detail:{rules:rules()}}));}
 function decorate(section,key){
  section.dataset.sectionKey=key;const h=section.querySelector(':scope>h2');if(!h)return;
  if(typeof overrides[key]?.title==='string')h.textContent=overrides[key].title;
  if(admin()){h.classList.add('section-editable-heading');h.append(iconButton('섹션 편집: '+key,'pencil',()=>open(key)));icons();}
 }
 function sync(){for(const section of document.querySelectorAll('[data-section-key]')){const heading=section.querySelector(':scope>h2');heading?.querySelector('.section-edit-trigger')?.remove();heading?.classList.remove('section-editable-heading');if(admin()&&heading){const button=iconButton('섹션 편집: '+section.dataset.sectionKey,'pencil',()=>open(section.dataset.sectionKey));button.classList.add('section-edit-trigger');heading.classList.add('section-editable-heading');heading.append(button);}}icons();}
 async function open(key){
  if(!admin()||!original.has(key))return;
  if(!loaded&&!await load()){alert('편집 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');return;}
  if(!admin())return;active={key,version:overrides[key]?.version??0};fill();dialog.showModal();title.focus();
 }
 function fill(){const saved=overrides[active.key],fallback=original.get(active.key);title.value=saved?.title??fallback.title;body.value=saved?.body??fallback.body;restoredFrom=null;reset=false;dirty=false;status.textContent='';mode('edit');icons();}
 function cancel(){if(busy)return;if(dirty&&!confirm('수정한 내용을 저장하지 않고 닫을까요?'))return;dialog.close();}
 dialog.addEventListener('cancel',event=>{event.preventDefault();cancel();});dialog.addEventListener('close',()=>{active=null;dirty=false;body.value='';title.value='';revisions=[];historySelect.replaceChildren();});
 for(const input of [title,body])input.addEventListener('input',()=>{dirty=true;reset=false;restoredFrom=null;});
 function useSource(){const value=original.get(active.key);title.value=value.title;body.value=value.body;reset=true;restoredFrom=0;dirty=true;status.textContent='기본 원문을 불러왔습니다. 저장하면 반영됩니다.';mode('edit');}
 async function reloadDraft(){if(dirty&&!confirm('입력 내용을 버리고 최신 내용을 불러올까요?'))return;setBusy(true);try{if(!await load())throw Error('최신 내용을 불러오지 못했습니다.');active.version=overrides[active.key]?.version??0;fill();}catch(error){status.textContent=error.message;}finally{setBusy(false);}}
 async function showHistory(more=false){
  if(!active||!admin())return;mode('history');setBusy(true);const key=active.key;
  try{const value=await request('/'+encodeURIComponent(key)+'/history'+(more&&revisionPage?'?before='+revisionPage:''),{auth:true});if(!active||active.key!==key||!admin())return;
   revisions=more?[...revisions,...value.revisions]:value.revisions;revisionPage=value.nextBefore;historySelect.replaceChildren(...revisions.map(row=>{const option=node('option',row.version+'판 · '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(new Date(row.createdAt))+' · '+(row.reset?'기본 원문':row.title));option.value=row.version;return option;}));historyMore.hidden=!revisionPage;restore.hidden=!revisions.length;status.textContent=revisions.length?'선택한 버전은 불러온 뒤 저장해야 반영됩니다.':'저장된 변경 이력이 없습니다.';
  }catch(error){status.textContent=error.message;}finally{setBusy(false);}
 }
 function restoreSelection(){const revision=revisions.find(row=>row.version===Number(historySelect.value));if(!revision)return;const fallback=original.get(active.key);title.value=revision.reset?fallback.title:revision.title;body.value=revision.reset?fallback.body:revision.body;reset=!!revision.reset;restoredFrom=revision.version;dirty=true;mode('preview');status.textContent=revision.version+'판을 불러왔습니다. 저장하면 새 버전으로 반영됩니다.';}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!active||!admin()||busy)return;if(!title.value.trim()){title.reportValidity();return;}
  const key=active.key;setBusy(true);status.textContent='저장 중입니다.';
  try{const value=await request('/'+encodeURIComponent(key),{auth:true,method:'PUT',body:JSON.stringify({baseVersion:active.version,title:title.value,body:body.value,reset,restoredFrom})});overrides[key]=value.section;dirty=false;announce();dialog.close();}
  catch(error){status.textContent=error.message;if(error.status===401){dialog.close();window.GuildAuth?.invalidate();}}
  finally{setBusy(false);}
 });
 window.addEventListener('guild-auth-change',()=>{if(!admin()&&dialog.open)dialog.close();sync();});
 window.addEventListener('pageshow',()=>{if(base)load();});
 window.GuildSectionEditor={ready:load(),setSource,rules,decorate:(section,key)=>{decorate(section,key);section.querySelector(':scope>h2 button')?.classList.add('section-edit-trigger');},get loaded(){return loaded;}};
 setInterval(()=>{if(!document.hidden&&base)load();},60000);
})();
