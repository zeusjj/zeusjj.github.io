(() => {
  const titles={rules:'운영 방식',notices:'공지사항',members:'길드원 참여 현황',distribution:'분배 기록',tips:'팁 공유',tools:'편의 기능',probabilities:'확률표',alarms:'공유 알람',profile:'내 정보',weekly:'한 주 요약',community:'디시글 모아보기',login:'로그인',admin:'관리자','november-plan':'11월 길드레이드 아이템 분배 룰 제안'};
  const previews=new Set(['rules','notices','members','distribution','tips','tools','probabilities','alarms','profile','weekly','community','login','november-plan']);
  const button=document.getElementById('main-menu-share'),status=document.getElementById('main-menu-share-status');
  let timer;
  function selected(){
    const hash=location.hash.slice(1),root=hash.split('/')[0]||'rules',section=document.getElementById(root);
    const id=section?.parentElement?.id==='main-content'?root:'rules';
    const menu=[...document.querySelectorAll('[data-tab]')].find(node=>node.dataset.tab===id);
    return {id,route:id===root?(hash||'rules'):id,title:titles[id]||menu?.querySelector('span')?.textContent.trim()||document.getElementById('current-view').textContent.trim()||'절대중립'};
  }
  function update(){
    clearTimeout(timer);status.textContent='';
    const {title}=selected();button.hidden=false;
    button.title=title+' 링크 복사';button.setAttribute('aria-label',button.title);
  }
  button.addEventListener('click',async()=>{
    const {id,route,title}=selected();
    const url=route===id&&previews.has(id)?'https://zeusjj.github.io/share/'+id+'/?v=1':'https://zeusjj.github.io/#'+route;
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
      else{
        const input=document.createElement('textarea');input.value=url;input.className='visually-hidden';document.body.append(input);input.select();
        const copied=document.execCommand('copy');input.remove();button.focus();if(!copied)throw new Error('copy');
      }
      if(selected().route!==route)return;
      status.textContent=title+' 링크를 복사했습니다.';button.title='복사 완료';button.setAttribute('aria-label',status.textContent);
      clearTimeout(timer);timer=setTimeout(update,2500);
    }catch{window.prompt(title+' 공유 링크',url);}
  });
  window.addEventListener('hashchange',update);update();
})();
