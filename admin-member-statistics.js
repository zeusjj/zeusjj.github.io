(() => {
  const host=document.createElement('section');host.id='admin-member-statistics';host.hidden=true;
  host.innerHTML='<div class="admin-period-heading"><h2>길드원 계정 통계</h2></div><p id="admin-member-status" role="status"></p><div id="admin-member-metrics" class="admin-member-metrics"></div><div class="admin-member-filters"><label>닉네임<input id="admin-member-search" type="search" placeholder="닉네임 검색" autocomplete="off"></label><label>로그인<select id="admin-member-login-filter"><option value="">전체</option><option value="1">로그인 이력 있음</option><option value="0">로그인 이력 없음</option></select></label><label>비밀번호<select id="admin-member-password-filter"><option value="">전체</option><option value="1">변경 완료</option><option value="0">초기 비밀번호</option></select></label><label>정렬<select id="admin-member-sort"><option value="visit_count">방문 횟수순</option><option value="login_count">로그인 횟수순</option><option value="last_login_at">최근 로그인순</option><option value="nickname">닉네임순</option></select></label></div><p id="admin-member-count" class="admin-period-note"></p><div class="admin-statistics-table"><table class="admin-member-table"><thead><tr><th>닉네임</th><th>방문 횟수</th><th>로그인 횟수</th><th>로그인 여부</th><th>비밀번호</th><th>최근 로그인</th><th>최근 방문</th><th>기록</th></tr></thead><tbody id="admin-member-rows"></tbody></table></div><p id="admin-member-note" class="admin-period-note"></p><details id="admin-member-history"><summary>최근 활동 기록</summary><label class="admin-member-history-filter">닉네임<select id="admin-member-history-name"><option value="">전체</option></select></label><div class="admin-statistics-table"><table><thead><tr><th>시각</th><th>닉네임</th><th>기록</th></tr></thead><tbody id="admin-member-history-rows"></tbody></table></div><p class="admin-period-note">선택한 계정의 최근 100건 · 비밀번호 값은 기록하지 않습니다.</p></details>';
  document.getElementById('admin-statistics-content').before(host);
  const find=id=>host.querySelector('#'+id),rows=find('admin-member-rows'),historyRows=find('admin-member-history-rows'),status=find('admin-member-status'),metrics=find('admin-member-metrics'),historyName=find('admin-member-history-name');
  const integer=new Intl.NumberFormat('ko-KR'),date=value=>value?new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false}):'—';
  const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const active=()=>!document.getElementById('admin').hidden;
  let data=null,generation=0,controller,lastToken='';
  function clear(){generation++;controller?.abort();lastToken='';data=null;host.hidden=true;rows.replaceChildren();historyRows.replaceChildren();metrics.replaceChildren();status.textContent='';find('admin-member-note').textContent='';find('admin-member-count').textContent='';historyName.replaceChildren(new Option('전체',''));find('admin-member-history').open=false;}
  function renderRows(){
    if(!data)return;const query=find('admin-member-search').value,login=find('admin-member-login-filter').value,password=find('admin-member-password-filter').value,sort=find('admin-member-sort').value;
    const records=data.accounts.filter(account=>(!query||GuildNicknameSearch.matches(account.nickname,query))&&(login===''||Number(!!account.has_logged_in)===Number(login))&&(password===''||Number(!!account.password_changed)===Number(password))).sort((a,b)=>(sort==='nickname'?0:(b[sort]||0)-(a[sort]||0))||a.nickname.localeCompare(b.nickname,'ko'));
    rows.replaceChildren();
    for(const account of records){const row=element('tr');for(const [index,text]of [account.nickname,integer.format(account.visit_count),integer.format(account.login_count),account.has_logged_in?'있음':'없음',account.password_changed?'변경 완료':'초기 비밀번호',date(account.last_login_at),date(account.last_visit_at)].entries()){const cell=element(index===0?'th':'td',text);if(index===0)cell.scope='row';if(index===4){const badge=element('span',text);badge.className='admin-member-badge';badge.dataset.changed=String(!!account.password_changed);cell.replaceChildren(badge);}row.append(cell);}const cell=element('td'),button=element('button'),icon=element('i');button.type='button';button.className='icon-button';button.title=account.nickname+' 활동 기록';button.setAttribute('aria-label',button.title);icon.dataset.lucide='history';button.append(icon);button.addEventListener('click',()=>{historyName.value=account.username;find('admin-member-history').open=true;load();});cell.append(button);row.append(cell);rows.append(row);}
    if(!records.length){const row=element('tr'),cell=element('td','해당하는 길드원이 없습니다.');cell.colSpan=8;row.append(cell);rows.append(row);}
    find('admin-member-count').textContent=records.length+' / '+data.accounts.length+'명';window.lucide?.createIcons();
  }
  function render(){
    const totals=data.totals;metrics.replaceChildren();
    for(const [label,value,detail]of [['누적 방문',totals.visits,'로그인 계정 기준'],['방문한 계정',totals.visited,totals.accounts+'명 중'],['로그인 이력',totals.loggedIn,'총 '+integer.format(totals.logins)+'회'],['비밀번호 변경',totals.passwordChanged,totals.accounts+'명 중']]){const item=element('div');item.append(element('span',label),element('strong',integer.format(value)),element('small',detail));metrics.append(item);}
    const selected=historyName.value;historyName.replaceChildren(new Option('전체',''),...data.accounts.slice().sort((a,b)=>a.nickname.localeCompare(b.nickname,'ko')).map(account=>new Option(account.nickname,account.username)));historyName.value=selected;
    historyRows.replaceChildren();const labels={visit:'방문',login:'로그인','password-change':'비밀번호 변경'};
    for(const record of data.activity){const row=element('tr');row.append(element('td',date(record.occurred_at)),element('td',record.nickname),element('td',labels[record.kind]||'활동'));historyRows.append(row);}
    if(!data.activity.length){const row=element('tr'),cell=element('td','기록이 없습니다.');cell.colSpan=3;row.append(cell);historyRows.append(row);}
    find('admin-member-note').textContent='집계 시작: '+date(data.trackedSince)+'. 로그인된 계정의 활동 간격이 30분 이상이면 새 방문으로 계산합니다. 화면 이동·새로고침·동시 접속은 중복 가산하지 않습니다. 집계 이전 로그인은 기존 세션·변경 이력으로 확인 가능한 여부만 복원하며, 이전 횟수는 포함하지 않습니다.';
    renderRows();
  }
  async function load(){
    if(!active()||!noticeAdmin()){clear();return;}host.hidden=false;controller?.abort();controller=new AbortController();const id=++generation,token=noticeToken;lastToken=token;status.textContent='계정 통계를 불러오는 중입니다.';
    try{
      const response=await fetch(noticesApi.replace(/\/notices$/,'/member/stats')+'?username='+encodeURIComponent(historyName.value),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
      if(id!==generation||token!==noticeToken||!noticeAdmin())return;
      if(response.status===401){noticeToken='';noticeExpiry=0;renderNotices(noticeRecords);return;}
      const result=await response.json();if(id!==generation||token!==noticeToken||!noticeAdmin())return;if(!response.ok)throw new Error(result.error||'계정 통계를 불러오지 못했습니다.');if(!Array.isArray(result.accounts)||!Array.isArray(result.activity)||!result.totals)throw new Error('통계 응답을 확인해주세요.');
      data=result;render();status.textContent='';
    }catch(error){if(id===generation&&error.name!=='AbortError')status.textContent='통계를 불러오지 못했습니다. 새로고침해주세요.';}
  }
  for(const id of ['admin-member-search','admin-member-login-filter','admin-member-password-filter','admin-member-sort'])find(id).addEventListener(id.endsWith('search')?'input':'change',renderRows);
  historyName.addEventListener('change',load);document.getElementById('admin-refresh').addEventListener('click',load);
  window.addEventListener('guild-admin-open',load);window.addEventListener('guild-admin-auth',()=>{if(!noticeAdmin())clear();else if(active()&&lastToken!==noticeToken)load();});
  if(active()&&noticeAdmin())load();
})();
