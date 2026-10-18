(() => {
  const titles={rules:'운영 방식',notices:'공지사항',members:'길드원 참여 현황',distribution:'분배 기록',tips:'팁 공유',tools:'편의 기능',probabilities:'확률표',alarms:'공유 알람'};
  const button=document.getElementById('main-menu-share'),status=document.getElementById('main-menu-share-status');
  let timer;
  function selected(){const id=location.hash.slice(1).split('/')[0]||'rules';return Object.hasOwn(titles,id)?id:null;}
  function update(){
    clearTimeout(timer);status.textContent='';
    const id=selected();button.hidden=!id;
    if(!id)return;
    button.title=titles[id]+' 링크 복사';button.setAttribute('aria-label',button.title);
  }
  button.addEventListener('click',async()=>{
    const id=selected();if(!id)return;
    const url='https://zeusjj.github.io/share/'+id+'/?v=1';
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
      else{
        const input=document.createElement('textarea');input.value=url;input.className='visually-hidden';document.body.append(input);input.select();
        const copied=document.execCommand('copy');input.remove();button.focus();if(!copied)throw new Error('copy');
      }
      if(selected()!==id)return;
      status.textContent=titles[id]+' 링크를 복사했습니다.';button.title='복사 완료';button.setAttribute('aria-label',status.textContent);
      clearTimeout(timer);timer=setTimeout(update,2500);
    }catch{window.prompt(titles[id]+' 공유 링크',url);}
  });
  window.addEventListener('hashchange',update);update();
})();
