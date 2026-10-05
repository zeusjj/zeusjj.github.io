(() => {
  const login=document.getElementById('admin-login'),statistics=document.getElementById('admin-statistics');
  const content=document.getElementById('admin-statistics-content'),status=document.getElementById('admin-statistics-status');
  const logout=document.getElementById('admin-logout'),refresh=document.getElementById('admin-refresh');
  const integer=new Intl.NumberFormat('ko-KR');
  let requestId=0,controller,expiryTimer,lastToken='';
  const active=()=>!document.getElementById('admin').hidden;
  function access(){
    const authorized=noticeAdmin();login.hidden=authorized;statistics.hidden=!authorized;logout.hidden=!authorized;
    clearTimeout(expiryTimer);
    if(authorized)expiryTimer=setTimeout(()=>{noticeToken='';noticeExpiry=0;renderNotices(noticeRecords);access();},Math.max(1,noticeExpiry-Date.now()));
    else{
      requestId++;controller?.abort();lastToken='';content.hidden=true;status.textContent='';refresh.disabled=false;
      for(const id of ['admin-metrics','admin-daily','admin-weekly'])document.getElementById(id).replaceChildren();
      document.getElementById('admin-tracking-note').textContent='';document.getElementById('admin-statistics-updated').textContent='';
    }
    return authorized;
  }
  function text(tag,value,className){const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node;}
  const date=value=>value.replaceAll('-','.');
  function render(data){
    if(!Array.isArray(data.daily) || !Array.isArray(data.weekly) || !data.last_seven_days || !Number.isSafeInteger(data.total_unique_visitors))throw new Error('통계 응답을 확인하지 못했습니다.');
    const today=data.daily.find(row=>row.day===data.day),week=data.weekly[0],recent=data.last_seven_days;
    const since=data.tracked_since?new Date(data.tracked_since).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false}):'집계 시작 시점 미확인';
    const trackedDay=data.tracked_since?new Date(data.tracked_since+4*3600000).toISOString().slice(0,10):'';
    const unique=record=>record?.legacy_unlinked && !record.unique_visitors?'—':integer.format(record?.unique_visitors || 0);
    const metrics=document.getElementById('admin-metrics');metrics.replaceChildren();
    for(const [label,value,note] of [
      ['전체 고유 방문자',integer.format(data.total_unique_visitors),'추적 시작 이후 누적'],
      ['오늘 방문자',integer.format(today?.count || 0),date(data.day)+' · 05:00 기준'],
      ['이번 주 고유 방문자',unique(week),week?.legacy_unlinked?'이전 기록 일부는 중복 확인 불가':'월요일부터 현재까지'],
      ['최근 7일 고유 방문자',unique(recent),recent.legacy_unlinked?'이전 기록 일부는 중복 확인 불가':'오늘 포함 최근 7일'],
    ]){const item=document.createElement('div');item.append(text('span',label),text('strong',value),text('small',note));metrics.append(item);}
    document.getElementById('admin-tracking-note').textContent=`브라우저 기준 · 고유 방문자 추적 시작: ${since}. 이전 일별 기록은 보존하지만, 날짜 간 중복은 복원할 수 없습니다.`;
    const daily=document.getElementById('admin-daily');daily.replaceChildren();
    const maximum=Math.max(1,...data.daily.map(row=>row.count));
    for(const record of data.daily){
      const row=document.createElement('tr'),unavailable=!record.count && trackedDay && record.day<trackedDay;
      const heading=text('th',date(record.day)+(record.day===data.day?' · 오늘':''));heading.scope='row';
      const count=text('td',unavailable?'기록 없음':integer.format(record.count));
      const plot=document.createElement('td'),track=document.createElement('div'),bar=document.createElement('span');track.className='admin-visit-track';track.setAttribute('aria-hidden','true');bar.style.width=(record.count/maximum*100)+'%';track.append(bar);plot.append(track);row.append(heading,count,plot);daily.append(row);
    }
    const weekly=document.getElementById('admin-weekly');weekly.replaceChildren();
    for(const record of data.weekly){
      const row=document.createElement('tr'),heading=text('th',`${date(record.week_start)} ~ ${date(record.week_end)}`);heading.scope='row';
      if(record.partial)heading.append(text('small','이번 주 · 진행 중'));
      const unavailable=!record.visitor_days && trackedDay && record.week_end<trackedDay;
      const count=text('td',unavailable?'기록 없음':unique(record));
      if(record.legacy_unlinked)count.append(text('small',`이전 ${integer.format(record.legacy_unlinked)}명·일 제외`));
      row.append(heading,count,text('td',unavailable?'—':integer.format(record.visitor_days)));weekly.append(row);
    }
    document.getElementById('admin-statistics-updated').textContent=new Date().toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})+' 갱신';
    content.hidden=false;
  }
  async function load(){
    if(!access())return;
    controller?.abort();controller=new AbortController();const currentController=controller,id=++requestId,token=noticeToken;lastToken=token;
    const timeout=setTimeout(()=>currentController.abort(),15000);
    refresh.disabled=true;status.textContent='통계를 불러오는 중입니다.';
    try{
      const query=new URLSearchParams({days:document.getElementById('admin-days').value,weeks:document.getElementById('admin-weeks').value});
      const response=await fetch(noticesApi.replace(/\/notices$/,'/visitors/stats')+'?'+query,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});
      if(id!==requestId || token!==noticeToken)return;
      if(response.status===401){noticeToken='';noticeExpiry=0;renderNotices(noticeRecords);document.getElementById('admin-login-status').textContent='로그인이 만료되었습니다. 다시 로그인해주세요.';return;}
      const data=await response.json();if(!response.ok)throw new Error(data.error || '통계를 불러오지 못했습니다.');
      if(id!==requestId || !noticeAdmin())return;
      render(data);status.textContent='';
    }catch(error){if(id===requestId)status.textContent=error.name==='AbortError'?'응답이 지연되고 있습니다. 새로고침해주세요.':error.message;}
    finally{clearTimeout(timeout);if(id===requestId)refresh.disabled=false;}
  }
  login.addEventListener('submit',async event=>{
    event.preventDefault();const button=login.querySelector('[type=submit]'),message=document.getElementById('admin-login-status');button.disabled=true;message.textContent='확인 중입니다.';
    try{
      const response=await fetch(noticesApi+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:login.elements.password.value}),signal:AbortSignal.timeout(15000)});
      const data=await response.json();if(!response.ok)throw new Error(data.error || '로그인하지 못했습니다.');
      noticeToken=data.token;noticeExpiry=data.expires_at;login.reset();message.textContent='';renderNotices(noticeRecords);
    }catch(error){message.textContent=error.name==='TimeoutError'?'응답이 지연되고 있습니다. 다시 시도해주세요.':error.message;}
    finally{button.disabled=false;}
  });
  logout.addEventListener('click',async()=>{
    logout.disabled=true;try{await noticeWrite('/session','DELETE');}catch{}
    noticeToken='';noticeExpiry=0;closeNoticeForms();renderNotices(noticeRecords);logout.disabled=false;
  });
  refresh.addEventListener('click',load);
  for(const id of ['admin-days','admin-weeks'])document.getElementById(id).addEventListener('change',load);
  window.addEventListener('guild-admin-auth',()=>{const previous=lastToken;if(access() && active() && previous!==noticeToken)load();});
  window.addEventListener('guild-admin-open',()=>{if(access())load();});
  if(active() && access())load();
})();
