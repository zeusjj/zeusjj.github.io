(() => {
  const key='guild-nickname-v1';
  let current='';
  const valid=value=>typeof value==='string'&&value.trim().length<=30;
  try{
    const saved=localStorage.getItem(key);
    if(saved!==null&&valid(saved))current=saved.trim();
    else {
      for(const legacy of ['guild-guestbook-nickname-v1','guild-alarm-author']){
        const value=localStorage.getItem(legacy);
        if(value?.trim()&&valid(value)){current=value.trim();break;}
      }
      localStorage.setItem(key,current);
    }
  }catch{}
  const get=()=>{try{const saved=localStorage.getItem(key);if(saved!==null&&valid(saved))current=saved.trim();}catch{}return current;};
  const set=value=>{if(!valid(value))return;current=value.trim();try{localStorage.setItem(key,current);}catch{}};
  const fill=input=>{if(input)input.value=get();};
  window.GuildNickname={get,set,fill};
  const selector='#tip-form input[name="author"],#guestbook-nickname,#suggestion-form input[name="nickname"],#alarm-author,.tip-manage-form input[name="author"]';
  for(const event of ['input','change','compositionend'])document.addEventListener(event,event=>{if(event.target.matches(selector)&&!event.isComposing)set(event.target.value);});
  document.addEventListener('submit',event=>{if(event.target.classList.contains('tip-manage-form'))return;const input=event.target.querySelector(selector);if(input)set(input.value);},true);
  for(const input of document.querySelectorAll(selector))fill(input);
})();
