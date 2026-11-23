(() => {
  const api='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/push';
  const ownerKey='guild-push-owner-v1',defaults={notices:true,participation:true,tips:true};
  const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
  const button=node('button');button.id='push-settings-open';button.type='button';button.title='알림 설정';button.setAttribute('aria-haspopup','dialog');button.innerHTML='<i data-lucide="bell" aria-hidden="true"></i><span>알림 설정</span>';
  document.querySelector('.sidebar-quick-links').after(button);
  let dialog,registration,config,subscription,active=false,busy=false,sequence=0,lastUser;
  const user=()=>window.GuildAuth?.user?.username;
  const remember=value=>{try{if(value)localStorage.setItem(ownerKey,value);else localStorage.removeItem(ownerKey);}catch{}};
  const owner=()=>{try{return localStorage.getItem(ownerKey);}catch{return null;}};
  async function request(path,{method='GET',body,anonymous=false,keepalive=false}={}){
    const response=await fetch(api+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(!anonymous?window.GuildAuth?.headers():{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000),keepalive});
    const value=await response.json();if(!response.ok)throw new Error(value.error||'알림 서버에 연결하지 못했습니다.');return value;
  }
  const supported=()=>isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  const ios=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function status(text,error=false){if(!dialog?.open)return;const target=dialog.querySelector('[role=status]');target.textContent=text;target.dataset.error=String(error);}
  function update(){
    if(!dialog?.open)return;
    const capable=supported()&&(!ios()||standalone()),logged=!!user(),denied='Notification' in window&&Notification.permission==='denied';
    dialog.querySelector('#push-enable').disabled=busy||!capable||!logged||denied||!config?.ready||!registration;
    dialog.querySelector('#push-enable').textContent=active?'선택 저장':'알림 받기';
    dialog.querySelector('#push-test').disabled=busy||!active||!logged;
    dialog.querySelector('#push-disable').hidden=!subscription;
    dialog.querySelector('#push-disable').disabled=busy;
    dialog.querySelector('#push-login').hidden=logged;
    for(const input of dialog.querySelectorAll('input'))input.disabled=busy;
  }
  async function cleanup(){
    const current=await navigator.serviceWorker?.getRegistration('./');
    const previous=await current?.pushManager.getSubscription();
    if(previous){
      const value=previous.toJSON();
      const deletion=request('/subscription',{method:'DELETE',body:{subscription:value},anonymous:true,keepalive:true}).catch(()=>{});
      await previous.unsubscribe();await deletion;
    }
    remember(null);subscription=null;active=false;
  }
  async function prepare(){
    const generation=++sequence;config=null;registration=null;subscription=null;active=false;busy=true;update();
    if(ios()&&!standalone()){status('홈 화면에 홈페이지를 추가하고, 추가한 아이콘으로 실행한 뒤 알림을 켜주세요.');busy=false;update();return;}
    if(!supported()){status('이 브라우저에서는 알림을 지원하지 않습니다. Safari, Chrome 또는 Edge에서 열어주세요.');busy=false;update();return;}
    if(Notification.permission==='denied'){status('알림이 차단되어 있습니다. 브라우저 또는 기기 설정에서 이 홈페이지의 알림을 허용해주세요.');busy=false;update();return;}
    try{
      status('알림 연결을 확인하고 있습니다.');
      const result=await request('/config',{anonymous:true});
      const worker=await navigator.serviceWorker.register('./guild-push-sw.js',{scope:'./',updateViaCache:'none'});
      await navigator.serviceWorker.ready;
      const current=await worker.pushManager.getSubscription();
      if(generation!==sequence)return;
      config=result;registration=worker;subscription=current;
      if(user()&&current){
        const saved=await request('/status',{method:'POST',body:{subscription:current.toJSON()}});
        if(generation!==sequence)return;
        active=saved.subscribed;
        if(active){remember(user());for(const [key,value]of Object.entries(saved.preferences))dialog.querySelector(`[name="${key}"]`).checked=value;}
      }
      status(!result.ready?'알림 서버를 준비 중입니다.':!user()?'로그인 후 받을 알림을 선택해주세요.':active?'이 기기에서 알림을 받고 있습니다.':Notification.permission==='granted'?'알림 받기를 누르면 선택한 소식이 이 기기에 전송됩니다.':'알림 받기를 누른 뒤 브라우저의 알림 허용을 선택해주세요.');
    }catch(error){status(error.message,true);}finally{if(generation===sequence){busy=false;update();}}
  }
  async function enable(){
    if(!user()||busy||!registration||!config?.ready)return;
    const identity=user(),generation=sequence;
    // Request permission directly from the click, before any asynchronous network work.
    const permission=Notification.requestPermission();busy=true;update();
    try{
      if(await permission!=='granted')throw new Error('알림을 받으려면 브라우저에서 알림을 허용해주세요.');
      if(user()!==identity||generation!==sequence)return;
      const selected=Object.fromEntries([...dialog.querySelectorAll('input')].map(input=>[input.name,input.checked]));
      if(!Object.values(selected).some(Boolean))throw new Error('받을 알림을 하나 이상 선택해주세요. 모두 끄려면 알림 해제를 눌러주세요.');
      const bytes=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
      subscription=await registration.pushManager.getSubscription()??await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
      if(user()!==identity||generation!==sequence){await cleanup();return;}
      await request('/subscription',{method:'POST',body:{subscription:subscription.toJSON(),preferences:selected}});
      if(user()!==identity||generation!==sequence){await cleanup();return;}
      active=true;remember(identity);status('알림을 켰습니다. 테스트 알림 보내기로 수신을 확인해주세요.');
    }catch(error){status(error.message,true);}finally{busy=false;update();}
  }
  async function test(){
    if(!active||!subscription||busy)return;busy=true;update();status('이 기기로 테스트 알림을 보내고 있습니다.');
    try{await request('/test',{method:'POST',body:{subscription:subscription.toJSON()}});status('테스트 알림을 전송했습니다. 기기의 알림함을 확인해주세요.');}catch(error){status(error.message,true);}finally{busy=false;update();}
  }
  function open(){
    dialog?.remove();dialog=node('dialog');dialog.className='push-dialog';dialog.setAttribute('aria-labelledby','push-heading');
    const header=node('header'),title=node('h2','알림 설정'),close=node('button');title.id='push-heading';close.type='button';close.className='icon-button';close.title='닫기';close.setAttribute('aria-label','닫기');close.innerHTML='<i data-lucide="x" aria-hidden="true"></i>';close.addEventListener('click',()=>dialog.close());header.append(title,close);dialog.append(header);
    const fieldset=node('fieldset');fieldset.append(node('legend','받을 소식'));
    for(const [key,label]of [['notices','새 공지사항'],['participation','길드 참여 현황 업데이트'],['tips','팁 게시판 새 글']]){const row=node('label'),input=node('input');input.type='checkbox';input.name=key;input.checked=defaults[key];row.append(input,node('span',label));fieldset.append(row);}
    const message=node('p');message.role='status';message.setAttribute('aria-live','polite');
    const login=node('a','로그인');login.id='push-login';login.href='#login';login.addEventListener('click',()=>dialog.close());
    const actions=node('div');actions.className='push-actions';
    const enableButton=node('button','알림 받기');enableButton.id='push-enable';enableButton.type='button';enableButton.className='primary-button';enableButton.disabled=true;enableButton.addEventListener('click',enable);
    const testButton=node('button','테스트 알림 보내기');testButton.id='push-test';testButton.type='button';testButton.className='secondary-button';testButton.disabled=true;testButton.addEventListener('click',test);actions.append(enableButton,testButton);
    const disable=node('button','이 기기 알림 해제');disable.id='push-disable';disable.type='button';disable.hidden=true;disable.addEventListener('click',async()=>{busy=true;update();try{await cleanup();status('이 기기의 알림을 해제했습니다.');}catch(error){status(error.message,true);}finally{busy=false;update();if(dialog.open)enableButton.focus();}});
    dialog.append(fieldset,message,login,actions,disable);
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
    const currentDialog=dialog;dialog.addEventListener('close',()=>{sequence++;currentDialog.remove();button.focus();},{once:true});
    document.body.append(dialog);window.lucide?.createIcons();dialog.showModal();prepare();
  }
  button.addEventListener('click',open);
  window.addEventListener('guild-auth-change',async()=>{
    const current=user(),previous=lastUser??owner();lastUser=current;sequence++;
    if(previous&&previous!==current){try{await cleanup();}catch{}finally{remember(null);}}
    if(dialog?.open)prepare();
  });
})();
