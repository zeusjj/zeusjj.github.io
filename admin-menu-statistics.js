(() => {
 const rows=document.getElementById('admin-menu-rows'),status=document.getElementById('admin-menu-status'),note=document.getElementById('admin-menu-note'),days=document.getElementById('admin-menu-days');
 const labels={rules:'운영 방식',notices:'공지사항',members:'길드원 참여 현황',distribution:'분배 기록',tips:'팁 공유',tools:'편의 기능',alarms:'공유 알람'};
 let generation=0,controller,lastToken='';
 const active=()=>!document.getElementById('admin').hidden;
 function clear(){generation++;controller?.abort();lastToken='';rows.replaceChildren();status.textContent='';note.textContent='';}
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
   for(const item of data.menus){const row=document.createElement('tr');for(const [index,value] of [labels[item.menu] || item.menu,item.clicks.toLocaleString('ko-KR'),item.unique_visitors.toLocaleString('ko-KR'),(data.total_clicks?item.clicks/data.total_clicks*100:0).toFixed(1)+'%'].entries()){const cell=document.createElement(index===0?'th':'td');if(index===0)cell.scope='row';cell.textContent=value;row.append(cell);}rows.append(row);}
   status.textContent=`총 ${data.total_clicks.toLocaleString('ko-KR')}회`;
   note.textContent='왼쪽 메뉴 클릭 기준 · 같은 브라우저의 재클릭은 클릭 수에 포함됩니다. 날짜는 한국시간 05:00 기준입니다. '+(data.tracked_since?'첫 클릭 기록: '+new Date(data.tracked_since).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false}):'아직 기록된 메뉴 클릭이 없습니다.');
  }catch(error){if(id===generation)status.textContent=['AbortError','TimeoutError'].includes(error.name)?'응답이 지연되고 있습니다. 새로고침해주세요.':error.message;}
 }
 days.addEventListener('change',load);document.getElementById('admin-refresh').addEventListener('click',load);
 window.addEventListener('guild-admin-open',load);
 window.addEventListener('guild-admin-auth',()=>{if(!noticeAdmin())clear();else if(active() && lastToken!==noticeToken)load();});
 if(active() && noticeAdmin())load();
})();
