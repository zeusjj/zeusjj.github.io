(() => {
  const sidebar=document.querySelector('.sidebar'),toggle=document.getElementById('navigation-toggle'),navigation=document.getElementById('site-navigation'),mobile=matchMedia('(max-width:700px)');
  let open=false;
  function update(){
    const expanded=mobile.matches&&open;
    sidebar.dataset.menuOpen=String(expanded);toggle.setAttribute('aria-expanded',String(expanded));
    toggle.setAttribute('aria-label',expanded?'메뉴 접기':'메뉴 펼치기');toggle.title=toggle.getAttribute('aria-label');
    navigation.inert=mobile.matches&&!expanded;
  }
  toggle.addEventListener('click',()=>{open=!open;update();});
  navigation.addEventListener('click',event=>{if(event.target.closest('[data-tab],a[href^="#"]')){const returnToContent=mobile.matches&&open;open=false;update();if(returnToContent)requestAnimationFrame(()=>document.getElementById('main-content').focus({preventScroll:true}));}});
  window.addEventListener('hashchange',()=>{open=false;update();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mobile.matches&&open){open=false;update();toggle.focus({preventScroll:true});}});
  mobile.addEventListener('change',()=>{open=false;update();});update();
  const tools=document.getElementById('tools'),switcher=tools.querySelector('.calculator-switcher');
  tools.querySelector('.page-heading').after(switcher);
})();
