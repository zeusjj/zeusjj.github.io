(() => {
 const dialog=document.getElementById('suggestion-dialog'),form=document.getElementById('suggestion-form'),status=document.getElementById('suggestion-status'),submit=form.querySelector('[type=submit]'),toast=document.getElementById('suggestion-toast');let pending=null,timer;
 document.getElementById('suggest-tool').addEventListener('click',()=>{status.textContent='';dialog.showModal();form.elements.content.focus();});document.getElementById('suggestion-close').addEventListener('click',()=>dialog.close());
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled)return;const content=form.elements.content.value.trim(),nickname=form.elements.nickname.value.trim();if(!content){status.textContent='건의 내용을 입력해주세요.';return;}
  if(!pending||pending.content!==content||pending.nickname!==nickname)pending={id:crypto.randomUUID(),content,nickname};submit.disabled=true;status.textContent='전달 중입니다.';
  try{const response=await fetch(noticesApi.replace(/\/notices$/,'/suggestions'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending),signal:AbortSignal.timeout(15000)}),data=await response.json();if(!response.ok)throw new Error(data.error||'건의를 전달하지 못했습니다.');pending=null;form.reset();status.textContent='';dialog.close();toast.textContent='건의를 관리자에게 전달했습니다.';toast.hidden=false;clearTimeout(timer);timer=setTimeout(()=>toast.hidden=true,5000);window.dispatchEvent(new Event('guild-suggestion-saved'));}
  catch(error){status.textContent=['TimeoutError','AbortError'].includes(error.name)?'응답을 확인하지 못했습니다. 다시 확인을 눌러주세요.':error.message;}finally{submit.disabled=false;}
 });
})();
