(() => {
 const rows=document.getElementById('admin-menu-rows'),status=document.getElementById('admin-menu-status'),note=document.getElementById('admin-menu-note'),days=document.getElementById('admin-menu-days');
 const labels={rules:'운영 방식',notices:'공지사항',members:'길드원 참여 현황',distribution:'분배 기록',tips:'팁 공유',tools:'편의 기능',alarms:'공유 알람',profile:'내 정보',weekly:'한 주 요약',community:'디시글 모아보기','tools/collection':'컬렉션 계산기','tools/skill':'스킬 강화 계산기','tools/fate':'운명의 흐름','tools/sinkwa':'신과 재료','tools/astrology':'점성술 계산기','tools/probabilities':'확률표'};
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
   for(const item of data.menus){const row=document.createElement('tr');for(const [index,value] of [labels[item.menu] || item.menu,item.clicks.toLocaleString('ko-KR'),item.unique_visitors.toLocaleString('ko-KR'),(data.total_clicks?item.clicks/data.total_clicks*100:0).toFixed(1)+'%'].entries()){const cell=document.createElement(index===0?'th':'td');if(index===0)cell.scope='row';cell.textContent=value;row.append(cell);}rows.append(row);}
   status.textContent=`총 ${data.total_clicks.toLocaleString('ko-KR')}회`;
   actors.replaceChildren();for(const item of data.actors||[]){const row=document.createElement('tr');for(const [index,value]of [item.nickname||'익명',labels[item.menu]||item.menu,String(item.views),new Date(item.last_clicked_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})].entries()){const cell=document.createElement(index===0?'th':'td');cell.textContent=value;if(index===0)cell.scope='row';row.append(cell);}actors.append(row);}
   note.textContent='항목별 같은 브라우저 또는 같은 로그인 계정은 조회수에 중복 가산하지 않습니다. 익명은 브라우저별로 구분합니다. 로그인 도입 이전 닉네임은 선택값이며 본인 인증 기록이 아닙니다. 날짜는 한국시간 05:00 기준입니다.';
  }catch(error){if(id===generation)status.textContent=['AbortError','TimeoutError'].includes(error.name)?'응답이 지연되고 있습니다. 새로고침해주세요.':error.message;}
 }
 days.addEventListener('change',load);document.getElementById('admin-refresh').addEventListener('click',load);
 window.addEventListener('guild-admin-open',load);
 window.addEventListener('guild-admin-auth',()=>{if(!noticeAdmin())clear();else if(active() && lastToken!==noticeToken)load();});
 if(active() && noticeAdmin())load();
})();
