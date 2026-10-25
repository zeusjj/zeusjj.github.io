import {passwordKeys} from './password-keyboard.js?v=20261021-198';
(() => {
  const api='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/member',key='guild-member-session-v1';
  let user=null,token='',expiresAt=0,generation=0,timer;
  const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
  const icons=()=>window.lucide?.createIcons();
  const headers=()=>token?{Authorization:'Bearer '+token}:{};
  window.GuildAuth={get user(){return user;},get expiresAt(){return expiresAt;},headers,login:signIn,logout:signOut,invalidate:()=>apply(null)};
  const announce=text=>{document.getElementById('member-auth-status').textContent=text;};
  function saved(){try{const value=JSON.parse(localStorage.getItem(key));return /^member_[a-f0-9]{64}$/.test(value?.token)&&value.expiresAt>Date.now()?value:null;}catch{return null;}}
  async function request(path,{method='GET',body,auth=true}={}){
    const response=await fetch(api+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?headers():{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});
    const data=await response.json();if(!response.ok){const error=new Error(data.error||'요청을 처리하지 못했습니다.');error.status=response.status;throw error;}return data;
  }
  async function signIn(username,password){const data=await request('/login',{method:'POST',auth:false,body:{username,password:passwordKeys(password)}});apply(data);return data;}
  async function signOut(){await request('/session',{method:'DELETE'});apply(null);}
  function apply(data,persist=true){
    generation++;user=data?.user||null;token=user?data.token:'';expiresAt=user?data.expiresAt:0;clearTimeout(timer);
    if(persist)try{if(user)localStorage.setItem(key,JSON.stringify({token,expiresAt}));else localStorage.removeItem(key);}catch{}
    window.GuildNickname?.set(user?.nickname||'');
    if(user)timer=setTimeout(()=>expiresAt>Date.now()?restore():apply(null),Math.min(2147483647,Math.max(0,expiresAt-Date.now())));
    renderHeader();renderForms();window.dispatchEvent(new Event('guild-auth-change'));icons();if(user)trackVisit();
  }
  function button(label,icon,action){const element=node('button');element.type='button';element.className='icon-button';element.title=label;element.setAttribute('aria-label',label);const mark=node('i');mark.dataset.lucide=icon;element.append(mark);element.addEventListener('click',action);return element;}
  function renderHeader(){
    const host=document.getElementById('header-nickname');host.className='member-session-controls';host.replaceChildren();
    if(!user){const login=button('로그인','log-in',()=>{location.hash='login';});login.className='secondary-button member-login-button';login.append(node('span','로그인'));host.append(login);return;}
    const identity=node('div');identity.className='member-session-identity';identity.title=user.nickname+'으로 로그인되었습니다.';identity.append(node('strong',user.nickname),node('small',user.isAdmin?'관리자':'로그인됨'));
    const settings=button('비밀번호 변경','settings',()=>{const dialog=document.getElementById('member-password-dialog');dialog.querySelector('form').reset();document.getElementById('member-password-status').textContent='';dialog.showModal();dialog.querySelector('input').focus();});
    if(user.passwordChanged===false){settings.classList.add('password-change-required');settings.setAttribute('aria-description','초기 비밀번호를 변경해주세요.');const dot=node('span');dot.className='password-change-dot';dot.setAttribute('aria-hidden','true');settings.append(dot);}
    const logout=button('로그아웃','log-out',async()=>{logout.disabled=true;try{await signOut();announce('로그아웃했습니다.');}catch{logout.disabled=false;announce('로그아웃하지 못했습니다. 다시 시도해주세요.');}});
    host.append(identity);
    if(user.isAdmin)host.append(button('관리자 페이지','shield-check',()=>{location.hash='admin';}));
    host.append(settings,logout);
  }
  function normalizeInput(input){const value=passwordKeys(input.value);if(value!==input.value){const start=input.selectionStart,end=input.selectionEnd;const left=passwordKeys(input.value.slice(0,start)).length,right=passwordKeys(input.value.slice(0,end)).length;input.value=value;input.setSelectionRange(left,right);}}
  function bindPassword(input){input.lang='en';input.autocapitalize='none';input.spellcheck=false;input.addEventListener('input',event=>{if(!event.isComposing)normalizeInput(input);});input.addEventListener('compositionend',()=>normalizeInput(input));input.addEventListener('blur',()=>normalizeInput(input));}
  function field(form,id,name,label,autocomplete){const wrapper=node('label',label),input=node('input');input.id=id;input.name=name;input.type=name==='username'?'text':'password';input.autocomplete=autocomplete;input.required=true;input.maxLength=name==='username'?30:128;if(name!=='username')bindPassword(input);wrapper.htmlFor=id;wrapper.append(input);form.append(wrapper);return input;}
  function renderForms(){
    document.querySelectorAll('.member-login-mount').forEach(host=>{
      host.replaceChildren();
      if(user){host.append(node('p',user.nickname+'으로 로그인되었습니다.'));const link=node('a','내 정보');link.href='#profile';host.append(link);return;}
      const form=node('form');form.className='member-login-form';
      const username=field(form,host.id+'-username','username','아이디','username'),password=field(form,host.id+'-password','password','비밀번호','current-password');
      const help=node('p'),initial=node('strong'),underline=node('u','초기아이디와 비밀번호는 캐릭터 닉네임입니다.');initial.append(underline);help.append(initial,document.createTextNode(' 로그인 후 비밀번호를 변경해주세요.'));form.append(help);
      const status=node('p');status.setAttribute('role','status');const submit=node('button','로그인');submit.type='submit';form.append(status,submit);host.append(form);
      form.addEventListener('submit',async event=>{event.preventDefault();normalizeInput(password);submit.disabled=true;status.textContent='로그인 중입니다.';const returnRoute=location.hash.match(/^#login\/(distribution|notices\/[a-f0-9-]{36})$/i);try{const data=await signIn(username.value,password.value);password.value='';announce(data.user.nickname+'으로 로그인되었습니다.');if(returnRoute)location.hash=returnRoute[1];else if(location.hash==='#login')location.hash='profile';}catch(error){password.value='';status.textContent=error.status?error.message:'연결하지 못했습니다. 잠시 후 다시 시도해주세요.';password.focus();}finally{submit.disabled=false;}});
    });
  }
  const dialog=document.getElementById('member-password-dialog'),form=document.getElementById('member-password-form');
  form.querySelectorAll('input[type=password]').forEach(bindPassword);
  document.getElementById('member-password-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>form.reset());
  form.addEventListener('submit',async event=>{
    event.preventDefault();form.querySelectorAll('input[type=password]').forEach(normalizeInput);const status=document.getElementById('member-password-status'),submit=form.querySelector('[type=submit]');
    if(form.elements.password.value!==form.elements.confirmPassword.value){status.textContent='비밀번호가 일치하지 않습니다.';return;}
    submit.disabled=true;status.textContent='변경 중입니다.';
    try{const data=await request('/password',{method:'POST',body:{password:form.elements.password.value,confirmPassword:form.elements.confirmPassword.value}});apply(data);dialog.close();announce('비밀번호를 변경했습니다. 다른 기기의 기존 로그인은 해제됩니다.');}
    catch(error){status.textContent=error.status?error.message:'연결하지 못했습니다. 다시 시도해주세요.';if(error.status===401){dialog.close();apply(null);location.hash='login';}}
    finally{submit.disabled=false;}
  });
  async function restore(){
    const value=saved(),version=++generation;if(!value){apply(null,false);return;}token=value.token;
    try{const data=await request('/session');if(generation===version)apply({...data,token:value.token},false);}
    catch(error){if(generation===version){apply(null,error.status===401);if(!error.status)announce('로그인 상태를 확인하지 못했습니다. 새로고침 후 다시 확인해주세요.');}}
  }
  let visitBusy=false;
  async function trackVisit(){
    if(!user||visitBusy||document.hidden)return;visitBusy=true;const current=token;
    try{await request('/visit',{method:'POST'});}catch(error){if(error.status===401&&current===token)apply(null);}finally{visitBusy=false;}
  }
  setInterval(trackVisit,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)trackVisit();});
  window.addEventListener('pageshow',trackVisit);
  window.addEventListener('storage',event=>{if(event.key===key)restore();});
  window.GuildNickname?.set('');renderHeader();renderForms();restore();
})();
