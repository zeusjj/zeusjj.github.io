(() => {
  const endpoint='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/guild-data';
  let pending,signature='';
  async function load(){
    if(pending)return pending;
    pending=(async()=>{
      const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('길드 정보를 불러오지 못했습니다.');
      const data=await response.json();if(!Array.isArray(data.headers)||!Array.isArray(data.members)||!Array.isArray(data.dates))throw new Error('길드 정보 응답을 확인하지 못했습니다.');
      const next=JSON.stringify(data);if(signature&&signature!==next)window.dispatchEvent(new CustomEvent('guild-roster-updated',{detail:data}));signature=next;return data;
    })().finally(()=>pending=null);return pending;
  }
  window.GuildData={load,refresh:load};
  setInterval(()=>{if(!document.hidden)load().catch(()=>{});},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load().catch(()=>{});});
  window.addEventListener('focus',()=>load().catch(()=>{}));
})();
