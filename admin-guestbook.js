(() => {
 const day=document.getElementById('guestbook-day'),rows=document.getElementById('admin-guestbook-rows'),status=document.getElementById('admin-guestbook-status'),more=document.getElementById('guestbook-more'),refresh=document.getElementById('guestbook-refresh');
 let generation=0,controller,cursor=null,records=[],lastToken='';
 const active=()=>!document.getElementById('admin').hidden;
 day.value=new Date(Date.now()+4*3600000).toISOString().slice(0,10);
 function clear(){generation++;controller?.abort();rows.replaceChildren();status.textContent='';more.hidden=true;refresh.disabled=false;lastToken='';records=[];cursor=null;}
 async function load(append=false){
  if(!noticeAdmin()){clear();return;}
  controller?.abort();controller=new AbortController();const id=++generation,token=noticeToken;lastToken=token;refresh.disabled=true;more.disabled=true;status.textContent='방명록을 불러오는 중입니다.';
  if(!append){records=[];cursor=null;rows.replaceChildren();more.hidden=true;}
  try{
   const query=new URLSearchParams({day:day.value});if(append && cursor){query.set('before',cursor.time);query.set('beforeId',cursor.id);}
   const response=await fetch(noticesApi.replace(/\/notices$/,'/guestbook')+'?'+query,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]),cache:'no-store'});
   if(id!==generation || token!==noticeToken || !noticeAdmin())return;
   if(response.status===401){noticeToken='';noticeExpiry=0;renderNotices(noticeRecords);return;}
   const data=await response.json();if(!response.ok)throw new Error(data.error || '방명록을 불러오지 못했습니다.');if(!Array.isArray(data.entries))throw new Error('방명록 응답을 확인하지 못했습니다.');
   if(id!==generation || token!==noticeToken || !noticeAdmin())return;
   records=append?[...records,...data.entries]:data.entries;rows.replaceChildren();
   for(const record of records){const row=document.createElement('tr');for(const value of [new Date(record.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false,month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),record.nickname,record.memo]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}rows.append(row);}
   cursor=data.hasMore?{time:data.nextBefore,id:data.nextBeforeId}:null;more.hidden=!data.hasMore;status.textContent=records.length?`${records.length}건${data.hasMore?' · 더 보기 가능':''}`:'이 날짜에 등록된 방명록이 없습니다.';
  }catch(error){if(id===generation)status.textContent=error.name==='AbortError' || error.name==='TimeoutError'?'응답이 지연되고 있습니다. 새로고침해주세요.':error.message;}
  finally{if(id===generation){refresh.disabled=false;more.disabled=false;}}
 }
 day.addEventListener('change',()=>load());refresh.addEventListener('click',()=>load());more.addEventListener('click',()=>load(true));document.getElementById('admin-refresh').addEventListener('click',()=>load());
 window.addEventListener('guild-admin-open',()=>{if(noticeAdmin())load();});
 window.addEventListener('guild-admin-auth',()=>{if(!noticeAdmin())clear();else if(active() && lastToken!==noticeToken)load();});
 window.addEventListener('guild-guestbook-saved',()=>{if(active() && noticeAdmin())load();});
 if(active() && noticeAdmin())load();
})();
