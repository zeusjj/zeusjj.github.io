(() => {
  const key='guild-site-theme-v1',themes=['mono','blue','rose','graphite'];
  const root=document.documentElement;
  const day=86400000,kstOffset=9*3600000,firstDay=Date.UTC(2026,9,19)/day;
  const dailyTheme=()=>themes[((Math.floor((Date.now()+kstOffset)/day)-firstDay)%themes.length+themes.length)%themes.length];
  let manualTheme=null,midnightTimer;
  function apply(value){
    const theme=themes.includes(value)?value:'mono';
    if(root.dataset.theme===theme)return;
    root.dataset.theme=theme;
    const select=document.getElementById('site-theme');
    if(select)select.value=theme;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=theme==='graphite'?'#1c1f22':'#f5f6f7';
    window.dispatchEvent(new CustomEvent('guild-theme-change',{detail:{theme}}));
  }
  function readPreference(){
    try{const saved=localStorage.getItem(key);manualTheme=themes.includes(saved)?saved:null;}catch{}
  }
  function refresh(){
    apply(manualTheme||dailyTheme());
    clearTimeout(midnightTimer);
    if(!manualTheme)midnightTimer=setTimeout(refresh,day-((Date.now()+kstOffset)%day)+50);
  }
  readPreference();refresh();
  document.addEventListener('DOMContentLoaded',()=>{
    const select=document.getElementById('site-theme');
    select.setAttribute('aria-label','테마');
    select.value=root.dataset.theme;
    select.addEventListener('change',()=>{
      manualTheme=select.value;
      refresh();
      try{localStorage.setItem(key,manualTheme);}catch{}
    });
  });
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null){readPreference();refresh();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('focus',refresh);
})();
