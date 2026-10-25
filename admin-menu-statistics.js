(() => {
 const rows=document.getElementById('admin-menu-rows'),status=document.getElementById('admin-menu-status'),note=document.getElementById('admin-menu-note'),days=document.getElementById('admin-menu-days');
 let generation=0,controller,lastToken='';
 const active=()=>!document.getElementById('admin').hidden;
 const actors=document.getElementById('admin-menu-actors');
 function clear(){generation++;controller?.abort();lastToken='';rows.replaceChildren();actors.replaceChildren();status.textContent='';note.textContent='';}
 async function load(){
  if(!active() || !noticeAdmin()){clear();return;}
  controller?.abort();controller=new AbortController();const id=++generation,token=noticeToken;lastToken=token;status.textContent='메뉴 통계를 불러오는 중입니다.';rows.replaceChildren();note.textContent='';
  try{
   const response=await fetch(noticesApi.replace(/\/notices$/,'/menu-clicks/stats')+'?days='+days.value,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
   if(id!==generation || token!==noticeToken || !noticeAdmin())return;
   if(response.status===401){noticeToken='';noticeExpiry=0;renderNotices(noticeRecords);return;}
   const data=await response.json();if(!response.ok)throw new Error(data.error || '메뉴 통계를 불러오지 못했습니다.');
   if(id!==generation || token!==noticeToken || !noticeAdmin())return;
   if(!Array.isArray(data.menus) || !Number.isSafeInteger(data.total_clicks))throw new Error('통계 응답을 확인하지 못했습니다.');
   const labels=Object.fromEntries(window.GuildMenuRegistry.entries()),menus=new Map(Object.keys(labels).map(menu=>[menu,{menu,clicks:0,unique_visitors:0}]));
   for(const item of data.menus)menus.set(item.menu,item);
   for(const item of [...menus.values()].sort((a,b)=>b.clicks-a.clicks)){const row=document.createElement('tr');for(const [index,value] of [labels[item.menu] || item.menu,item.clicks.toLocaleString('ko-KR'),item.unique_visitors.toLocaleString('ko-KR'),(data.total_clicks?item.clicks/data.total_clicks*100:0).toFixed(1)+'%'].entries()){const cell=document.createElement(index===0?'th':'td');if(index===0)cell.scope='row';cell.textContent=value;row.append(cell);}rows.append(row);}
   status.textContent=`총 ${data.total_clicks.toLocaleString('ko-KR')}회`;
   actors.replaceChildren();for(const item of data.actors||[]){const row=document.createElement('tr');for(const [index,value]of [item.nickname||'익명',labels[item.menu]||item.menu,String(item.views),new Date(item.last_clicked_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})].entries()){const cell=document.createElement(index===0?'th':'td');cell.textContent=value;if(index===0)cell.scope='row';row.append(cell);}actors.append(row);}
   note.textContent='메뉴 조회수는 한국시간 매일 05:00에 새로 집계하며, 같은 날 같은 브라우저 또는 같은 로그인 계정은 항목별 1회만 가산합니다. 고유 브라우저는 선택 기간 전체의 중복을 제외한 브라우저 수입니다. 게시글 조회수는 일일 초기화하지 않습니다. 로그인 도입 이전 닉네임은 선택값이며 본인 인증 기록이 아닙니다.';
  }catch(error){if(id===generation)status.textContent=['AbortError','TimeoutError'].includes(error.name)?'응답이 지연되고 있습니다. 새로고침해주세요.':error.message;}
 }
 days.addEventListener('change',load);document.getElementById('admin-refresh').addEventListener('click',load);
 window.addEventListener('guild-admin-open',load);
 window.addEventListener('guild-admin-auth',()=>{if(!noticeAdmin())clear();else if(active() && lastToken!==noticeToken)load();});
 if(active() && noticeAdmin())load();
})();
