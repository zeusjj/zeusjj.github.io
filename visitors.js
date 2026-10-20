(() => {
  const endpoint='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/visitors';
  const count=document.getElementById('visitor-count');
  const storageKey='guild-visitor-id-v1';
  let visitorId,currentDay='',currentCount=0,busy=false,resetTimer;
  async function identity() {
    const readOrCreate=()=>{
      let saved;try{saved=localStorage.getItem(storageKey);}catch{}
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved || '')){saved=crypto.randomUUID();try{localStorage.setItem(storageKey,saved);}catch{}}
      return saved;
    };
    return navigator.locks?navigator.locks.request(storageKey,readOrCreate):readOrCreate();
  }
  async function request(register) {
    const response=await fetch(endpoint,{method:register?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(10000),...(register?{headers:{'Content-Type':'application/json'},body:JSON.stringify({visitorId})}:{})});
    if(!response.ok)throw new Error('Visitors unavailable');
    const data=await response.json();
    if(!Number.isSafeInteger(data.count) || data.count<0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.day) || !Number.isFinite(data.serverNow) || !Number.isFinite(data.nextResetAt))throw new Error('Invalid visitor data');
    return data;
  }
  window.guildVisitorIdentity=async()=>visitorId ||= await identity();
  async function refresh() {
    if(busy)return;busy=true;
    try{
      visitorId ||= await identity();
      let data=await request(!currentDay);
      if(currentDay && data.day>currentDay)data=await request(true);
      if(data.day<currentDay)return;
      currentCount=data.day===currentDay?Math.max(currentCount,data.count):data.count;
      currentDay=data.day;count.textContent=currentCount.toLocaleString('ko-KR');
      count.removeAttribute('title');
      clearTimeout(resetTimer);
      resetTimer=setTimeout(refresh,Math.max(1000,Math.min(86400000,data.nextResetAt-data.serverNow+100)));
    }catch{count.title='방문자 수를 불러오지 못했습니다. 잠시 후 다시 확인합니다.';}
    finally{busy=false;}
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button[data-tab],button[data-calculator]');
    const menu=button?.dataset.calculator?'tools/'+button.dataset.calculator:button?.dataset.tab;
    recordMenu(menu);
  });
  async function recordMenu(menu){
    if(!['rules','notices','members','distribution','tips','tools','alarms','profile','weekly','community','tools/collection','tools/skill','tools/fate','tools/sinkwa','tools/astrology','tools/probabilities'].includes(menu))return;
    const nickname=window.GuildAuth?.user?.nickname||'익명';
    const id=crypto.randomUUID();
    try{
      visitorId ||= await identity();
      const options={method:'POST',headers:{'Content-Type':'application/json',...window.GuildAuth?.headers()},body:JSON.stringify({id,menu,visitorId,nickname}),keepalive:true};
      try{await fetch(endpoint.replace(/\/visitors$/,'/menu-clicks'),{...options,signal:AbortSignal.timeout(10000)});}
      catch{await fetch(endpoint.replace(/\/visitors$/,'/menu-clicks'),{...options,signal:AbortSignal.timeout(10000)});}
    }catch{}
  }
  function recordRoute(){const menu=location.hash.slice(1).split('/')[0]||'rules';recordMenu(menu);if(menu==='tools'){const tool=document.querySelector('#tools [data-calculator][aria-selected=true]')?.dataset.calculator;if(tool)recordMenu('tools/'+tool);}}
  window.addEventListener('hashchange',recordRoute);
  window.addEventListener('guild-calculator-change',()=>{if(location.hash.startsWith('#tools'))recordRoute();});
  window.addEventListener('guild-nickname-change',recordRoute);
  recordRoute();
  setInterval(()=>{if(!document.hidden)refresh();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  window.addEventListener('pageshow',refresh);
  refresh();
})();
