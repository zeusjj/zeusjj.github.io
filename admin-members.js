(() => {
  const api='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/admin/members';
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  const admin=()=>window.GuildAuth?.user?.isAdmin&&window.GuildAuth.expiresAt>Date.now();
  const icons=()=>window.lucide?.createIcons();
  const iconButton=(name,icon,action)=>{const button=el('button',undefined,'icon-button');button.type='button';button.title=name;button.setAttribute('aria-label',name);const mark=el('i');mark.dataset.lucide=icon;button.append(mark);button.addEventListener('click',action);return button;};
  const host=el('section',undefined,'admin-members');host.id='admin-member-management';host.hidden=true;
  const heading=el('div',undefined,'admin-members-heading'),actions=el('div',undefined,'admin-members-actions'),add=el('button',undefined,'primary-button');add.type='button';const plus=el('i');plus.dataset.lucide='user-plus';add.append(plus,el('span','회원 등록'));
  const refresh=iconButton('회원 명단 새로고침','refresh-cw',()=>load());actions.append(refresh,add);heading.append(el('h2','회원 DB 관리'),actions);
  const toolbar=el('div',undefined,'admin-members-toolbar'),searchLabel=el('label',undefined,'search-field'),search=el('input');search.type='search';search.placeholder='닉네임 · 아이디 검색';search.setAttribute('aria-label',search.placeholder);searchLabel.append(search);
  const filter=el('select');filter.setAttribute('aria-label','회원 상태');for(const [value,text]of [['active','현재 길드원'],['departed','탈퇴 기록']])filter.add(new Option(text,value));
  const count=el('span',undefined,'count-label');toolbar.append(searchLabel,filter,count);
  const status=el('p');status.setAttribute('role','status');const scroll=el('div',undefined,'admin-statistics-table'),table=el('table',undefined,'admin-members-table'),head=el('thead'),headRow=el('tr'),body=el('tbody');
  for(const label of ['닉네임','클래스','Lv','성장도','가입일','아이디','상태','처리']){const th=el('th',label);th.scope='col';headRow.append(th);}head.append(headRow);table.append(head,body);scroll.append(table);host.append(heading,toolbar,status,scroll);document.getElementById('admin-login').after(host);
  let data=null,sequence=0,busy=false,creating=false,selected=null;
  const number=value=>Number.isFinite(value)?value.toLocaleString('ko-KR'):'-';
  async function request(path='',options={}){
    const response=await fetch(api+path,{...options,headers:{'Content-Type':'application/json',...window.GuildAuth.headers()},cache:'no-store',signal:AbortSignal.timeout(20000)}),result=await response.json();
    if(response.status===401){window.GuildAuth.invalidate();throw new Error('관리자 로그인이 만료되었습니다. 다시 로그인해주세요.');}
    if(!response.ok)throw new Error(result.error||'회원 정보를 처리하지 못했습니다.');return result;
  }
  function render(){
    body.replaceChildren();if(!data)return;const rows=(filter.value==='departed'?data.departed:data.members).filter(row=>(row.nickname+' '+row.username).normalize('NFKC').toLocaleLowerCase('ko-KR').includes(search.value.normalize('NFKC').toLocaleLowerCase('ko-KR').trim()));
    count.textContent=`${rows.length} / ${(filter.value==='departed'?data.departed:data.members).length}명`;
    for(const member of rows){const tr=el('tr');for(const value of [member.nickname,member.class,number(member.level),number(member.growth),member.joinedDay||'-',member.username,member.status==='active'?'활동':'탈퇴'])tr.append(el('td',value));
      const action=el('td');if(member.canDepart){const button=iconButton(member.nickname+' 탈퇴 처리','user-minus',()=>openDeparture(member));button.disabled=busy;action.append(button);}else action.textContent=member.status==='departed'?'로그인 차단':'관리자';tr.append(action);body.append(tr);
    }
    if(!rows.length){const row=el('tr'),cell=el('td','해당하는 회원이 없습니다.');cell.colSpan=8;row.append(cell);body.append(row);}icons();
  }
  async function load(){
    if(!admin())return;const current=++sequence;refresh.disabled=true;status.textContent='회원 명단을 불러오는 중입니다.';
    try{const result=await request();if(current!==sequence||!admin())return;if(!Array.isArray(result.members)||!Array.isArray(result.departed)||typeof result.version!=='string')throw new Error('회원 명단을 확인하지 못했습니다.');data=result;render();status.textContent='';}
    catch(error){if(current===sequence&&admin())status.textContent=error.message;}finally{if(current===sequence)refresh.disabled=false;}
  }
  search.addEventListener('input',render);filter.addEventListener('change',render);
  function dialog(id,title){const dialog=el('dialog',undefined,'admin-member-dialog');dialog.id=id;dialog.setAttribute('aria-labelledby',id+'-title');const heading=el('div',undefined,'admin-members-heading'),label=el('h2',title);label.id=id+'-title';heading.append(label,iconButton('닫기','x',()=>{if(!busy)dialog.close();}));dialog.append(heading);document.body.append(dialog);dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});return dialog;}
  function field(form,name,label,{type='text',required=true,min,max}={}){const wrapper=el('label',label),input=el('input');input.name=name;input.type=type;input.required=required;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;wrapper.append(input);form.append(wrapper);return input;}
  const registration=dialog('admin-member-create','신규 회원 등록'),form=el('form'),fields=el('div',undefined,'admin-member-fields');
  const nickname=field(fields,'nickname','닉네임');nickname.maxLength=30;nickname.autocomplete='off';
  const classLabel=el('label','클래스'),klass=el('select');klass.name='class';klass.required=true;klass.add(new Option('선택',''));for(const name of ['버서커','나이트','레인저','어쌔신','아티산','블레','오라클','엘리'])klass.add(new Option(name,name));classLabel.append(klass);fields.append(classLabel);
  const growth=field(fields,'growth','성장도',{type:'number',min:1,max:10000000});growth.step='1';
  const level=field(fields,'level','레벨 (선택)',{type:'number',required:false,min:1,max:200});level.step='1';
  const joined=field(fields,'joinedDay','가입일',{type:'date'}),username=field(fields,'username','로그인 아이디');username.readOnly=true;
  const passLabel=el('label','초기 비밀번호'),passRow=el('div',undefined,'admin-member-password'),password=el('input');password.type='password';password.name='password';password.required=true;password.minLength=8;password.maxLength=128;password.autocomplete='new-password';
  const toggle=iconButton('비밀번호 보기','eye',()=>{password.type=password.type==='password'?'text':'password';toggle.title=password.type==='password'?'비밀번호 보기':'비밀번호 숨기기';toggle.setAttribute('aria-label',toggle.title);});
  const regenerate=iconButton('초기 비밀번호 다시 생성','refresh-cw',()=>generatePassword());passRow.append(password,toggle,regenerate);passLabel.append(passRow);fields.append(passLabel);form.append(fields);
  const confirmation=el('label',undefined,'admin-member-confirm'),checked=el('input');checked.type='checkbox';checked.required=true;confirmation.append(checked,el('span','닉네임과 등록 정보를 확인했습니다.'));
  const formStatus=el('p');formStatus.setAttribute('role','status');const save=el('button','회원 등록','primary-button');save.type='submit';form.append(confirmation,formStatus,save);registration.append(form);
  function generatePassword(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789',bytes=crypto.getRandomValues(new Uint8Array(20));password.value=Array.from(bytes,byte=>alphabet[byte%alphabet.length]).join('');}
  nickname.addEventListener('input',()=>username.value=nickname.value.normalize('NFKC').trim().toLocaleLowerCase('ko-KR'));
  add.addEventListener('click',()=>{if(!admin()||busy)return;form.reset();password.type='password';generatePassword();const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());joined.value=today;joined.max=today;formStatus.textContent='';registration.showModal();nickname.focus();});
  const credentials=dialog('admin-member-credentials','회원 등록 완료'),credentialName=el('p'),credentialId=el('input'),credentialPassword=el('input');credentialId.readOnly=true;credentialPassword.readOnly=true;credentialPassword.type='password';credentialId.setAttribute('aria-label','새 회원 아이디');credentialPassword.setAttribute('aria-label','새 회원 초기 비밀번호');
  const idLabel=el('label','아이디'),pwLabel=el('label','초기 비밀번호');idLabel.append(credentialId);pwLabel.append(credentialPassword);const copyStatus=el('p');copyStatus.setAttribute('role','status');const copy=el('button',undefined,'secondary-button'),copyIcon=el('i');copyIcon.dataset.lucide='copy';copy.type='button';copy.append(copyIcon,el('span','계정 정보 복사'));credentials.append(credentialName,idLabel,pwLabel,copyStatus,copy);
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(`아이디: ${credentialId.value}\n초기 비밀번호: ${credentialPassword.value}`);copyStatus.textContent='계정 정보를 복사했습니다.';}catch{copyStatus.textContent='복사하지 못했습니다. 입력칸에서 직접 확인해주세요.';credentialPassword.type='text';credentialPassword.focus();credentialPassword.select();}});
  credentials.addEventListener('close',()=>{credentialId.value='';credentialPassword.value='';credentialPassword.type='password';credentialName.textContent='';copyStatus.textContent='';});
  function setBusy(value){busy=value;add.disabled=value;for(const dialog of [registration,departure])dialog.querySelectorAll('button,input,select').forEach(node=>node.disabled=value);render();}
  async function syncAfterChange(message){const results=await Promise.allSettled([load(),window.GuildData.refresh()]);if(admin())status.textContent=results.some(r=>r.status==='rejected')?message+' 현황을 불러오지 못했습니다. 새로고침해주세요.':message;window.dispatchEvent(new Event('guild-member-management-changed'));}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!admin())return;creating=true;const values={nickname:nickname.value,class:klass.value,growth:Number(growth.value),level:level.value?Number(level.value):null,joinedDay:joined.value,password:password.value},plain=password.value;setBusy(true);formStatus.textContent='등록 중입니다.';
    try{const result=await request('',{method:'POST',body:JSON.stringify(values)});if(!admin())return;registration.close();form.reset();credentialName.textContent=result.nickname;credentialId.value=result.username;credentialPassword.value=plain;credentials.showModal();copy.focus();await syncAfterChange('회원과 로그인 계정을 등록했습니다.');}
    catch(error){formStatus.textContent=['TimeoutError','AbortError'].includes(error.name)?'응답을 확인하지 못했습니다. 명단을 새로고침해 등록 여부를 먼저 확인해주세요.':error.message;}
    finally{creating=false;setBusy(false);}
  });
  registration.addEventListener('close',()=>{if(!creating)form.reset();});
  const departure=dialog('admin-member-departure','회원 탈퇴 처리'),leaveForm=el('form'),target=el('p',undefined,'admin-member-target'),warning=el('p','로그인이 차단되고 현재 명단에서 제외됩니다. 기존 성장·참여·기여 기록은 보관됩니다.');
  const verify=field(leaveForm,'nicknameConfirmation','탈퇴할 닉네임을 입력해주세요.');verify.autocomplete='off';const leaveStatus=el('p');leaveStatus.setAttribute('role','status');const leaveButton=el('button','탈퇴 처리','danger-button');leaveButton.type='submit';leaveForm.prepend(target,warning);leaveForm.append(leaveStatus,leaveButton);departure.append(leaveForm);
  function openDeparture(member){if(busy||!admin()||!member.canDepart)return;selected={...member,version:data.version};leaveForm.reset();target.textContent=`${member.nickname} · ${member.class} · 성장도 ${number(member.growth)}`;leaveStatus.textContent='';departure.showModal();verify.focus();}
  leaveForm.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!selected||!admin())return;if(verify.value!==selected.nickname){leaveStatus.textContent='닉네임이 일치하지 않습니다.';verify.focus();return;}
    const member=selected;setBusy(true);leaveStatus.textContent='탈퇴 처리 중입니다.';
    try{await request('/'+encodeURIComponent(member.username)+'/departure',{method:'POST',body:JSON.stringify({nicknameConfirmation:verify.value,revision:member.revision,version:member.version})});departure.close();selected=null;await syncAfterChange(member.nickname+' 님을 탈퇴 처리했습니다.');}
    catch(error){leaveStatus.textContent=['TimeoutError','AbortError'].includes(error.name)?'응답을 확인하지 못했습니다. 명단을 새로고침해 처리 결과를 확인해주세요.':error.message;}finally{setBusy(false);}
  });
  departure.addEventListener('close',()=>{leaveForm.reset();selected=null;});
  function access(){host.hidden=!admin();if(!admin()){sequence++;data=null;selected=null;body.replaceChildren();count.textContent='';status.textContent='';for(const dialog of [registration,departure,credentials])if(dialog.open)dialog.close();form.reset();credentialId.value='';credentialPassword.value='';}else if(location.hash.split('/')[0]==='#admin')load();}
  window.addEventListener('guild-auth-change',access);window.addEventListener('guild-admin-open',()=>{if(admin())load();});access();icons();
})();
