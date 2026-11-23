(() => {
  const button=document.getElementById('shortcut-install');
  if(!button)return;
  const display=matchMedia('(display-mode: standalone)');
  let installPrompt=null,installedHere=false,dialog;
  const standalone=()=>display.matches||navigator.standalone===true;
  function update(){
    const installed=standalone()||installedHere;
    button.querySelector('span').innerHTML=installed?'바로가기<br>등록됨':'바로가기<br>등록';
    button.setAttribute('aria-label',installed?'바로가기 등록 상태':'바로가기 등록');
    button.title=installed?'바로가기가 등록되어 있습니다':'바로가기 등록';
  }
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
  window.addEventListener('appinstalled',()=>{installedHere=true;installPrompt=null;update();});
  display.addEventListener('change',update);
  function guidance(){
    dialog?.remove();
    dialog=document.createElement('dialog');dialog.className='shortcut-dialog';dialog.setAttribute('aria-labelledby','shortcut-heading');
    const header=document.createElement('header'),title=document.createElement('h2'),close=document.createElement('button');
    title.id='shortcut-heading';title.textContent=standalone()||installedHere?'바로가기 등록됨':'바로가기 등록';
    close.type='button';close.className='icon-button';close.title='닫기';close.setAttribute('aria-label','닫기');close.innerHTML='<i data-lucide="x" aria-hidden="true"></i>';close.addEventListener('click',()=>dialog.close());header.append(title,close);dialog.append(header);
    if(standalone()||installedHere){const message=document.createElement('p');message.textContent='바로가기로 실행할 수 있는 상태입니다.';dialog.append(message);}
    else{
      const ua=navigator.userAgent,ios=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1),android=/Android/i.test(ua),inApp=/KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(/i.test(ua);
      const steps=inApp?['브라우저 메뉴에서 외부 브라우저로 열기를 선택해 주세요.','Safari 또는 Chrome에서 이 홈페이지를 연 뒤 바로가기 등록을 눌러 주세요.']:ios?['Safari에서 공유 버튼을 눌러 주세요.','홈 화면에 추가를 선택한 뒤 추가를 눌러 주세요.']:android?['브라우저 메뉴를 열어 주세요.','홈 화면에 추가 또는 앱 설치를 선택해 주세요.']:['Chrome 또는 Edge의 브라우저 메뉴를 열어 주세요.','앱 설치 또는 이 페이지를 앱으로 설치를 선택해 주세요.'];
      const list=document.createElement('ol');for(const step of steps){const li=document.createElement('li');li.textContent=step;list.append(li);}dialog.append(list);
    }
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
    dialog.addEventListener('close',()=>{dialog.remove();button.focus();},{once:true});
    document.body.append(dialog);window.lucide?.createIcons();dialog.showModal();
  }
  button.addEventListener('click',async()=>{
    if(!installPrompt||standalone()||installedHere){guidance();return;}
    const prompt=installPrompt;installPrompt=null;button.disabled=true;
    try{await prompt.prompt();await prompt.userChoice;}catch{guidance();}finally{button.disabled=false;update();}
  });
  update();
})();
