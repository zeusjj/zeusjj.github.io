(() => {
  'use strict';
  const route='siege-distribution';
  const api='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/member/siege-distribution';
  const page=document.getElementById(route),content=document.getElementById('siege-distribution-content'),status=document.getElementById('siege-distribution-status');
  if(!page||!content||!status)return;
  const nf=new Intl.NumberFormat('ko-KR'),number=n=>nf.format(n),el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  let data=null,controller=null,generation=0,rank='second',query='',renderResults=null;
  const active=()=>location.hash.split('/')[0]==='#'+route;
  const pageRoute=()=>route+'/'+(rank==='third'?'third':'second');
  const signedIn=()=>!!window.GuildAuth?.user&&window.GuildAuth.expiresAt>Date.now();
  const normalize=text=>String(text??'').normalize('NFKC').trim().toLocaleLowerCase('ko-KR');
  const rankLabel=()=>rank==='second'?'2등':'3등';
  const metric=(member,category)=>number(member.metrics[category.key])+category.unit;
  function clear(){generation++;controller?.abort();controller=null;data=null;renderResults=null;query='';content.replaceChildren();status.replaceChildren();page.removeAttribute('data-siege-rank');}
  async function load(){
    if(!active())return;
    rank=location.hash.split('/')[1]==='third'?'third':'second';
    document.getElementById('siege-distribution-heading').textContent=`공성전 ${rankLabel()} 분배표`;
    if(!signedIn()){clear();location.hash='login/'+pageRoute();return;}
    if(data){renderResults?.();return;}if(controller)return;
    const version=++generation,current=new AbortController();controller=current;status.textContent='분배표를 불러오는 중입니다.';
    try{
      const response=await fetch(api,{headers:window.GuildAuth.headers(),cache:'no-store',signal:AbortSignal.any([current.signal,AbortSignal.timeout(15000)])});
      if(response.status===401){if(version===generation){clear();window.GuildAuth.invalidate();location.hash='login/'+pageRoute();}return;}
      if(!response.ok)throw new Error('분배표를 불러오지 못했습니다.');
      const result=await response.json();
      if(!Array.isArray(result.members)||result.members.length!==31||!Array.isArray(result.categories)||result.categories.length!==7)throw new Error('분배표 형식을 확인하지 못했습니다.');
      if(version!==generation||!signedIn())return;
      data=result;status.replaceChildren();mount();
    }catch(error){
      if(version!==generation||current.signal.aborted)return;
      status.replaceChildren(el('p',error.name==='TimeoutError'?'응답 시간이 초과됐습니다. 다시 시도해주세요.':error.message));
      const retry=el('button','다시 불러오기','secondary-button');retry.type='button';retry.addEventListener('click',load);status.append(retry);
    }finally{if(controller===current)controller=null;}
  }
  function payoutCell(text,className){const td=el('td',text,className);return td;}
  function payoutWithMetric(tag,value,metricText){const cell=el(tag);cell.append(el('span',number(value),'siege-value'),el('span',`(${metricText})`,'siege-metric'));return cell;}
  function buildNotice(){
    const prize=rank==='second'?1966256:786502,bidPercent=rank==='second'?60:90,fortressPrize=235950;
    const bidPool=Math.floor((prize-fortressPrize)*bidPercent/100),generalPool=prize-bidPool;
    const outsideCoins=data.totalCoins-data.displayedCoins,outsideAmount=bidPool-data.members.reduce((sum,member)=>sum+member[rank].bid,0);
    const notice=el('section',undefined,'siege-notice');notice.setAttribute('aria-labelledby','siege-notice-heading');
    const heading=el('h2','분배 안내');heading.id='siege-notice-heading';notice.append(heading);
    notice.append(el('p','공성전 입찰에 성공해 참가가 확정되어, 사전 공지한 분배안을 실제 산정 기준에 맞춰 안내드립니다. 길드의 성장을 위한 노력과 콘텐츠 참여, 점령·공성 참여, 길드 공헌을 함께 반영했습니다.'));
    if(rank==='second')notice.append(el('p','별도로 두었던 2등 기여분배는 종합분배에 통합하였습니다. 공성 참여는 아래 종합분배의 공성 참여 항목에 반영합니다.'));
    const correction=el('div',undefined,'siege-notice-correction');correction.append(el('strong','사전 공지와 대조한 내용'));
    const corrections=el('ul');
    if(rank==='second')corrections.append(el('li','입찰기여 산식은 공성 2등 상금을 기준으로 차액의 60%를 적용했습니다. 공지의 80% 표기를 실제 적용값으로 바로잡았으며, 안내했던 배분 총액은 같습니다.'));
    corrections.append(el('li','점령·공성 참여 30%의 세부 비율은 점령1 5%·점령2 10%·공성 15%입니다. 공지에 남아 있던 10%·10%·20% 표기를 실제 산정 기준으로 정리했습니다.'));
    correction.append(corrections);notice.append(correction);
    notice.append(el('h3',`공성 ${rankLabel()} 상금 배분`));
    const pools=el('dl',undefined,'siege-pool-grid');for(const [label,value] of [['입찰기여 분배금',bidPool],['종합분배금',generalPool],['전체 상금',prize]]){const item=el('div');item.append(el('dt',label),el('dd',number(value)+' 다이아'));pools.append(item);}notice.append(pools);
    notice.append(el('h3','입찰기여 분배식'));
    notice.append(el('p',`입찰기여 총액 = (${number(prize)} − ${number(fortressPrize)}) × ${bidPercent}% → ${number(bidPool)} 다이아`,'siege-notice-formula'));
    notice.append(el('p','요새전 승리 상금 235,950다이아를 기준으로 추가 상금의 배분율을 적용합니다. 1다이아 미만은 버리고, 공성 상금에서 입찰기여 총액을 뺀 나머지를 종합분배금으로 배정합니다.'));
    notice.append(el('p','개인 입찰기여금 = 입찰기여 총액 × 개인 합산 입찰 주화 수 ÷ 전체 입찰 주화 수','siege-notice-formula'));
    notice.append(el('p',`입찰 비중의 분모는 실제 전체 입찰 ${number(data.totalCoins)}주화입니다. 입찰 주화 수에 비례해 지급하며, 원금을 별도로 더해 지급하지 않습니다.`));
    notice.append(el('h3','종합분배 비율과 개인 산정식'));
    notice.append(el('p',`아래 비율은 전체 상금이 아닌 종합분배금 ${number(generalPool)}다이아(G)를 기준으로 합니다. 합계는 100%이며, 종합분배 대상자는 ${data.memberCount}명입니다.`));
    const table=el('table',undefined,'siege-notice-ratios'),caption=el('caption','종합분배 항목별 비율과 개인 산정식','visually-hidden');table.append(caption);
    const thead=el('thead'),header=el('tr');for(const title of ['항목','비율','개인 산정식']){const th=el('th',title);th.scope='col';header.append(th);}thead.append(header);table.append(thead);
    const rows=[
      ['균등분배','20%','G × 20% ÷ 대상자 수'],
      ['시즌2 점령1 참여','5%','G × 5% × 개인 참여 여부 ÷ 점령1 참여자 수'],
      ['시즌2 점령2 참여','10%','G × 10% × 개인 참여 여부 ÷ 점령2 참여자 수'],
      ['시즌2 공성 참여','15%','G × 15% × 개인 참여 여부 ÷ 공성 참여자 수'],
      ['전체 콘텐츠 참여','20%','G × 20% × 개인 참여점수 ÷ 대상자 참여점수 합계'],
      ['성장도','20%','G × 20% × 개인 성장도 ÷ 대상자 성장도 합계'],
      ['길드 공헌도','10%','G × 10% × 개인 시즌1·2 공헌도 합계 ÷ 대상자 시즌1·2 공헌도 합계'],
    ];
    const tbody=el('tbody');for(const [label,percent,formula] of rows){const row=el('tr'),term=el('th',label);term.scope='row';row.append(term,el('td',percent),el('td',formula));tbody.append(row);}table.append(tbody);notice.append(table);
    notice.append(el('p','점령1·점령2·공성의 세 배정분은 각각 해당 참여자에게 균등 지급한 뒤 합산합니다. 참여 여부는 참여 1, 미참여 0입니다. 미기록(-)은 불참으로 확정하지 않고 현재 확인된 참여만 반영합니다. 현재 분배표는 대상자 전원의 공성 참여를 가정했습니다.'));
    notice.append(el('h3','분배용 누적 참여점수와 공헌도'));
    notice.append(el('p','개인 참여점수 = Σ(3 × 해당 일요일 개인 참여 콘텐츠 수 ÷ 해당 일요일 전체 콘텐츠 수) + 성물 방어전 참여 주 수','siege-notice-formula'));
    notice.append(el('p','같은 일요일의 콘텐츠들이 총 3점을 나눠 가지므로, 콘텐츠가 많은 날은 개별 콘텐츠의 배점이 작아집니다. 성물 방어전은 월·화 중 한 번만 참여해도 그 주 1점이며, 두 번 참여해도 중복 가산하지 않습니다.'));
    notice.append(el('p','참여점수는 9/13~11/10의 누적 참여기록을 반영합니다. 공헌도는 시즌1·2 중 10/7·10/14·10/21·10/28·11/4·11/11 주차의 확인된 기록을 합산했으며, 11/18 주차 중간값은 제외했습니다.'));
    const notes=el('div',undefined,'siege-notice-footnote');notes.append(el('p',`위 금액은 전체 상금 기준입니다. 아래 ${data.memberCount}명의 분배 합계는 대상 외 ${number(outsideCoins)}주화에 해당하는 입찰기여금 ${number(outsideAmount)}다이아를 제외한 금액입니다.`));
    notes.append(el('p','개인 지급액은 배정 총액에 맞춰 1다이아 단위로 정산합니다. 항목별 금액의 반올림으로 개인 합계와 소액 차이가 있을 수 있습니다.'));notice.append(notes);
    return notice;
  }
  function mount(){
    content.replaceChildren();
    const notice=el('div');let noticeRank=null;
    const controls=el('div',undefined,'siege-controls');
    const searchGroup=el('div',undefined,'siege-search-controls'),searchLabel=el('label','닉네임 검색','siege-search-label'),input=el('input');input.type='search';input.placeholder='닉네임으로 찾기';input.id='siege-nickname-search';input.autocomplete='off';searchLabel.htmlFor=input.id;searchLabel.append(input);input.addEventListener('input',()=>{query=input.value;renderResults();});searchGroup.append(searchLabel);
    const mine=el('button','내 분배금 보기','secondary-button');mine.type='button';mine.hidden=!data.members.some(m=>normalize(m.name)===normalize(window.GuildAuth.user?.nickname));mine.addEventListener('click',()=>{query=window.GuildAuth.user.nickname;input.value=query;renderResults();});searchGroup.append(mine);controls.append(searchGroup);
    const summary=el('section',undefined,'siege-summary');summary.setAttribute('aria-label','분배 요약');
    const selection=el('p',undefined,'siege-selection');selection.setAttribute('aria-live','polite');
    const hint=el('p','금액 아래 괄호는 성장도·참여점수·실제 입찰 주화 수입니다.','siege-explanation');
    const results=el('div');
    content.append(notice,controls,summary,selection,hint,results);
    renderResults=()=>{
      if(!data||!signedIn())return;
      page.dataset.siegeRank=rank;
      if(noticeRank!==rank){notice.replaceChildren(buildNotice());noticeRank=rank;}
      const myName=normalize(window.GuildAuth.user?.nickname);
      const members=data.members.filter(member=>normalize(member.name).includes(normalize(query))).sort((a,b)=>Number(normalize(b.name)===myName)-Number(normalize(a.name)===myName));
      const total=data.members.reduce((sum,member)=>sum+member[rank].total,0);
      summary.replaceChildren();const overview=el('div');overview.append(el('span',`${rankLabel()} 시 · 31명 분배 합계`,'siege-summary-label'),el('strong',number(total)+' 다이아','siege-summary-amount'));
      const context=el('div',undefined,'siege-context');context.append(el('span','길드공헌도 시즌1·2 합계'),el('span','공성 전원 참여 가정'));summary.append(overview,context);
      selection.textContent=`${rankLabel()} 분배표 · 전체 31명 중 ${members.length}명 표시`;
      results.replaceChildren();
      if(!members.length){results.append(el('p','검색한 닉네임이 대상자 31명에 없습니다.','siege-empty'));return;}
      results.append(buildTable(members),buildCards(members));
    };
    renderResults();
  }
  function buildTable(members){
    const frame=el('div',undefined,'siege-table-frame');frame.tabIndex=0;frame.setAttribute('role','region');frame.setAttribute('aria-label',`${rankLabel()} 항목별 분배표. 좌우로 스크롤할 수 있습니다.`);
    const table=el('table',undefined,'siege-table'),caption=el('caption',`${rankLabel()} 분배표. 금액 단위는 다이아입니다.`,'visually-hidden');table.append(caption);
    const columns=el('colgroup');for(const [className,span] of [['siege-column-number',1],['siege-column-name',1],['siege-column-amount',data.categories.length+3]]){const column=el('col',undefined,className);column.span=span;columns.append(column);}table.append(columns);
    const head=el('thead'),header=el('tr');
    const labels=['번호','닉네임','입찰기여 분배금',...data.categories.map(c=>`${c.label} ${c.percent}%`),'종합분배금',`${rankLabel()} 최종 분배금`];
    labels.forEach((label,i)=>{const th=el('th',label);th.scope='col';if(i===0)th.className='siege-sticky-number';if(i===1)th.className='siege-sticky-name';if(i===2)th.className='siege-bid';if(i===labels.length-2)th.className='siege-general';if(i===labels.length-1)th.className='siege-final';header.append(th);});head.append(header);table.append(head);
    const body=el('tbody');
    for(const member of members){
      const tr=el('tr');if(normalize(member.name)===normalize(window.GuildAuth.user?.nickname))tr.className='siege-my-row';
      tr.append(payoutCell(String(data.members.indexOf(member)+1),'siege-sticky-number'));const name=el('th',member.name,'siege-sticky-name');name.scope='row';tr.append(name);
      const bidCell=payoutWithMetric('td',member[rank].bid,number(member.coins)+'주화');bidCell.className='siege-bid';tr.append(bidCell);
      for(const category of data.categories)tr.append(payoutWithMetric('td',member[rank].components[category.key],metric(member,category)));
      tr.append(payoutCell(number(member[rank].general),'siege-general'),payoutCell(number(member[rank].total),'siege-final'));body.append(tr);
    }
    table.append(body);
    const foot=el('tfoot'),tr=el('tr');const label=el('th',`표시 ${members.length}명 합계`,'siege-sticky-total');label.colSpan=2;label.scope='row';tr.append(label);
    const sum=key=>members.reduce((s,m)=>s+m[rank][key],0),coins=members.reduce((s,m)=>s+m.coins,0);
    const bidTotal=payoutWithMetric('td',sum('bid'),number(coins)+'주화');bidTotal.className='siege-bid';tr.append(bidTotal);
    for(const category of data.categories){const amountSum=members.reduce((s,m)=>s+m[rank].components[category.key],0),metricSum=members.reduce((s,m)=>s+m.metrics[category.key],0);tr.append(payoutWithMetric('td',amountSum,number(metricSum)+category.unit));}
    tr.append(payoutCell(number(sum('general')),'siege-general'),payoutCell(number(sum('total')),'siege-final'));foot.append(tr);table.append(foot);frame.append(table);return frame;
  }
  function buildCards(members){
    const list=el('div',undefined,'siege-mobile-list');
    for(const member of members){
      const isMine=normalize(member.name)===normalize(window.GuildAuth.user?.nickname);
      const card=el('article',undefined,'siege-mobile-card'),heading=el('div',undefined,'siege-mobile-heading');heading.append(el('h2',member.name));if(isMine){card.classList.add('siege-my-card');heading.append(el('span','내 분배금'));}card.append(heading);
      const total=el('div',undefined,'siege-mobile-total');total.append(el('span',`${rankLabel()} 최종 분배금`),el('strong',number(member[rank].total)+' 다이아'));card.append(total);
      const split=el('dl',undefined,'siege-mobile-split');for(const [label,value,isBid] of [['입찰기여금',number(member[rank].bid),true],['종합분배금',number(member[rank].general),false]]){const pair=el('div'),term=el('dt',label);pair.className=isBid?'siege-mobile-bid':'siege-mobile-general';if(isBid)term.append(el('span',`(${number(member.coins)}주화 입찰)`,'siege-bid-coins'));pair.append(term,el('dd',value));split.append(pair);}card.append(split);
      const details=el('details');details.open=isMine;details.append(el('summary','종합분배금 - 항목별 분배 보기'));const metrics=el('dl',undefined,'siege-mobile-breakdown');
      for(const category of data.categories){const pair=el('div');pair.append(el('dt',`${category.label} ${category.percent}%`),payoutWithMetric('dd',member[rank].components[category.key],metric(member,category)));metrics.append(pair);}
      details.append(metrics);card.append(details);list.append(card);
    }
    return list;
  }
  window.addEventListener('guild-siege-distribution-open',load);
  window.addEventListener('hashchange',()=>{if(active())load();});
  window.addEventListener('guild-auth-change',()=>{clear();if(active())load();});
  if(active())load();
})();
