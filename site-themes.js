(() => {
  const key='guild-site-theme-v1',themes=['mono','blue','rose','graphite'];
  const root=document.documentElement;
  function apply(value){
    const theme=themes.includes(value)?value:'mono';
    root.dataset.theme=theme;
    const select=document.getElementById('site-theme');
    if(select)select.value=theme;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=theme==='graphite'?'#1c1f22':'#f5f6f7';
    window.dispatchEvent(new CustomEvent('guild-theme-change',{detail:{theme}}));
  }
  let saved;
  try{saved=localStorage.getItem(key);}catch{}
  apply(saved);
  if(saved&&!themes.includes(saved)){try{localStorage.setItem(key,'mono');}catch{}}
  document.addEventListener('DOMContentLoaded',()=>{
    const select=document.getElementById('site-theme');
    select.setAttribute('aria-label','테마');
    select.value=root.dataset.theme;
    select.addEventListener('change',()=>{
      apply(select.value);
      try{localStorage.setItem(key,root.dataset.theme);}catch{}
    });
  });
  window.addEventListener('storage',event=>{if(event.key===key||event.key===null)apply(event.newValue);});
})();
