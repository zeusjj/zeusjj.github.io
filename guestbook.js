(() => {
 const dialog=document.getElementById('guestbook-dialog'),form=document.getElementById('guestbook-form'),input=document.getElementById('guestbook-nickname'),list=document.getElementById('guestbook-suggestions'),status=document.getElementById('guestbook-status'),close=document.getElementById('guestbook-close');
 const endpoint='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/guestbook';
 let names=[],namesRequest,selected=-1,matches=[],saving=false,id,toastTimer;
 const normalize=value=>value.replace(/\s/g,'').toLocaleLowerCase('ko-KR');
 function hide(){list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');selected=-1;}
 function choose(index){if(matches[index]){input.value=matches[index];id=crypto.randomUUID();hide();input.focus();}}
 function highlight(){[...list.children].forEach((item,index)=>item.setAttribute('aria-selected',String(index===selected)));if(selected>=0){input.setAttribute('aria-activedescendant',list.children[selected].id);list.children[selected].scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
 function suggest(){
  const query=normalize(input.value);matches=names.filter(name=>!query || normalize(name).includes(query)).sort((a,b)=>Number(normalize(b).startsWith(query))-Number(normalize(a).startsWith(query))).slice(0,8);list.replaceChildren();selected=-1;
  if(!matches.length){hide();return;}
  for(const [index,name] of matches.entries()){const option=document.createElement('li');option.role='option';option.id='guestbook-option-'+index;option.textContent=name;option.setAttribute('aria-selected','false');option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>choose(index));list.append(option);}
  list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');
 }
 async function loadNames(){
  if(!namesRequest)namesRequest=fetch('data.json',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json();names=[...new Set(data.members.map(row=>row[1]).filter(name=>typeof name==='string'))];}).catch(()=>{namesRequest=null;});
  await namesRequest;if(dialog.open && document.activeElement===input)suggest();
 }
 document.getElementById('guestbook-open').addEventListener('click',()=>{form.reset();try{input.value=localStorage.getItem('guild-guestbook-nickname-v1') || '';}catch{}id=crypto.randomUUID();status.textContent='';hide();dialog.showModal();input.focus();loadNames();});
 close.addEventListener('click',()=>{if(!saving)dialog.close();});dialog.addEventListener('cancel',event=>{if(saving)event.preventDefault();});dialog.addEventListener('close',hide);
 input.addEventListener('input',()=>{id=crypto.randomUUID();suggest();});form.elements.memo.addEventListener('input',()=>{id=crypto.randomUUID();});input.addEventListener('focus',()=>{if(names.length)suggest();});input.addEventListener('blur',hide);
 input.addEventListener('keydown',event=>{
  if(list.hidden)return;
  if(event.key==='ArrowDown' || event.key==='ArrowUp'){event.preventDefault();selected=event.key==='ArrowDown'?(selected+1)%matches.length:(selected<=0?matches.length-1:selected-1);highlight();}
  else if(event.key==='Enter' && selected>=0){event.preventDefault();choose(selected);}
  else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(saving)return;saving=true;hide();status.textContent='등록 중입니다.';const controls=[...form.querySelectorAll('input,textarea,button'),close];controls.forEach(node=>node.disabled=true);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,nickname:input.value.trim(),memo:form.elements.memo.value.trim()}),signal:AbortSignal.timeout(15000)}),data=await response.json();if(!response.ok)throw new Error(data.error || '방명록을 등록하지 못했습니다.');
   try{localStorage.setItem('guild-guestbook-nickname-v1',input.value.trim());}catch{}
   dialog.close();const toast=document.getElementById('guestbook-toast');toast.textContent='방명록이 등록되었습니다.';toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,3500);window.dispatchEvent(new Event('guild-guestbook-saved'));
  }catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 확인을 다시 눌러 등록 여부를 확인해주세요.':error.message;}
  finally{saving=false;controls.forEach(node=>node.disabled=false);}
 });
})();
