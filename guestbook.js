(() => {
 const dialog=document.getElementById('guestbook-dialog'),form=document.getElementById('guestbook-form'),input=document.getElementById('guestbook-nickname'),list=document.getElementById('guestbook-suggestions'),status=document.getElementById('guestbook-status'),close=document.getElementById('guestbook-close');
 const endpoint='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/guestbook';
 const nameLabel=form.querySelector('label[for="guestbook-nickname"]'),nameField=input.closest('.guestbook-name-field');
 const login=document.createElement('button');login.id='guestbook-login';login.type='button';login.className='secondary-button guestbook-login';
 const loginIcon=document.createElement('i');loginIcon.dataset.lucide='log-in';const loginText=document.createElement('span');loginText.textContent='로그인 하기';login.append(loginIcon,loginText);form.before(login);
 let names=[],namesRequest,selected=-1,matches=[],saving=false,id,toastTimer,loginReturn=null;
 const identity=()=>window.GuildAuth?.user&&window.GuildAuth.expiresAt>Date.now()?window.GuildAuth.user:null;
 function syncIdentity(){const user=identity(),moveFocus=user&&nameField.contains(document.activeElement);login.hidden=!!user;nameLabel.hidden=!!user;nameField.hidden=!!user;input.disabled=saving||!!user;if(user){input.value=user.nickname;hide();if(moveFocus&&dialog.open)form.elements.memo.focus();}}
 function hide(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');selected=-1;}
 function choose(name){if(!identity()&&matches.includes(name)){input.value=name;GuildNickname.set(name);id=crypto.randomUUID();input.focus({preventScroll:true});hide();}}
 function highlight(){[...list.children].forEach((item,index)=>item.setAttribute('aria-selected',String(index===selected)));if(selected>=0){input.setAttribute('aria-activedescendant',list.children[selected].id);list.children[selected].scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
 function suggest(){
  if(identity()){hide();return;}
  matches=GuildNicknameSearch.suggest(names,input.value,8);list.replaceChildren();selected=-1;
  if(!matches.length){hide();return;}
  for(const [index,name] of matches.entries()){const option=document.createElement('li');option.role='option';option.id='guestbook-option-'+index;option.textContent=name;option.setAttribute('aria-selected','false');list.append(option);}
  list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');
 }
 async function loadNames(){
  if(!namesRequest)namesRequest=fetch('data.json',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json();names=[...new Set(data.members.map(row=>row[1]).filter(name=>typeof name==='string'))];}).catch(()=>{namesRequest=null;});
  await namesRequest;if(dialog.open && document.activeElement===input)suggest();
 }
 function open(reset=true){if(reset){form.reset();GuildNickname.fill(input);id=crypto.randomUUID();status.textContent='';}hide();syncIdentity();if(!dialog.open)dialog.showModal();(identity()?form.elements.memo:input).focus();if(!identity())loadNames();}
 document.getElementById('guestbook-open').addEventListener('click',()=>open());
 login.addEventListener('click',()=>{if(saving)return;loginReturn=location.hash||'#rules';dialog.close();location.hash='login';});
 window.addEventListener('hashchange',()=>{if(location.hash!=='#login')loginReturn=null;});
 window.addEventListener('guild-auth-change',()=>{if(dialog.open||loginReturn)id=crypto.randomUUID();syncIdentity();if(loginReturn&&identity()&&location.hash==='#login'){const route=loginReturn;loginReturn=null;location.hash=route;open(false);}else if(dialog.open&&!identity())loadNames();});
 syncIdentity();
 close.addEventListener('click',()=>{if(!saving)dialog.close();});dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});dialog.addEventListener('close',hide);
 input.addEventListener('input',()=>{id=crypto.randomUUID();suggest();});form.elements.memo.addEventListener('input',()=>{id=crypto.randomUUID();});input.addEventListener('focus',()=>{if(names.length)suggest();});
 GuildNicknameSearch.bindOptions(input,list,{choose,hide});
 input.addEventListener('keydown',event=>{
  if(list.hidden)return;
  if(event.key==='ArrowDown' || event.key==='ArrowUp'){event.preventDefault();selected=event.key==='ArrowDown'?(selected+1)%matches.length:(selected<=0?matches.length-1:selected-1);highlight();}
  else if(event.key==='Enter' && selected>=0){event.preventDefault();choose(matches[selected]);}
  else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(saving)return;saving=true;hide();status.textContent='등록 중입니다.';const controls=[...form.querySelectorAll('input,textarea,button'),close,login];controls.forEach(node=>node.disabled=true);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nickname:identity()?.nickname??input.value.trim(),memo:form.elements.memo.value.trim()}),signal:AbortSignal.timeout(15000)}),data=await response.json();if(!response.ok)throw new Error(data.error || '방명록을 등록하지 못했습니다.');
   dialog.close();const toast=document.getElementById('guestbook-toast');toast.textContent='방명록이 등록되었습니다.';toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,3500);window.dispatchEvent(new Event('guild-guestbook-saved'));
  }catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 확인을 다시 눌러 등록 여부를 확인해주세요.':error.message;}
  finally{saving=false;controls.forEach(node=>node.disabled=false);syncIdentity();}
 });
})();
