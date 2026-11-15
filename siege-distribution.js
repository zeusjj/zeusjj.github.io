(() => {
  'use strict';
  const route='siege-distribution';
  const api='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/member/siege-distribution';
  const page=document.getElementById(route),content=document.getElementById('siege-distribution-content'),status=document.getElementById('siege-distribution-status');
  if(!page||!content||!status)return;
  const nf=new Intl.NumberFormat('ko-KR'),number=n=>nf.format(n),el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  let data=null,controller=null,generation=0,rank='second',query='',renderResults=null;
  const active=()=>location.hash.split('/')[0]==='#'+route;
  const signedIn=()=>!!window.GuildAuth?.user&&window.GuildAuth.expiresAt>Date.now();
  const normalize=text=>String(text??'').normalize('NFKC').trim().toLocaleLowerCase('ko-KR');
  const rankLabel=()=>rank==='second'?'2등':'3등';
  const metric=(member,category)=>number(member.metrics[category.key])+category.unit;
  function clear(){generation++;controller?.abort();controller=null;data=null;renderResults=null;query='';content.replaceChildren();status.replaceChildren();page.removeAttribute('data-siege-rank');}
  async function load(){
    if(!active())return;
    if(!signedIn()){clear();location.hash='login/'+route;return;}
    if(data){renderResults?.();return;}if(controller)return;
    const version=++generation,current=new AbortController();controller=current;status.textContent='분배표를 불러오는 중입니다.';
    try{
      const response=await fetch(api,{headers:window.GuildAuth.headers(),cache:'no-store',signal:AbortSignal.any([current.signal,AbortSignal.timeout(15000)])});
      if(response.status===401){if(version===generation){clear();window.GuildAuth.invalidate();location.hash='login/'+route;}return;}
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
  function mount(){
    content.replaceChildren();
    const controls=el('div',undefined,'siege-controls'),fieldset=el('fieldset',undefined,'siege-rank-choice');fieldset.append(el('legend','분배표 선택','visually-hidden'));
    for(const [value,label] of [['second','2등 분배표'],['third','3등 분배표']]){
      const choice=el('label',undefined,'siege-rank-option'),input=el('input');input.type='radio';input.name='siege-distribution-rank';input.value=value;input.checked=rank===value;
      input.addEventListener('change',()=>{if(input.checked){rank=value;renderResults();}});choice.append(input,el('span',label));fieldset.append(choice);
    }
    const searchGroup=el('div',undefined,'siege-search-controls'),searchLabel=el('label','닉네임 검색','siege-search-label'),input=el('input');input.type='search';input.placeholder='닉네임으로 찾기';input.id='siege-nickname-search';input.autocomplete='off';searchLabel.htmlFor=input.id;searchLabel.append(input);input.addEventListener('input',()=>{query=input.value;renderResults();});searchGroup.append(searchLabel);
    const mine=el('button','내 분배금 보기','secondary-button');mine.type='button';mine.hidden=!data.members.some(m=>normalize(m.name)===normalize(window.GuildAuth.user?.nickname));mine.addEventListener('click',()=>{query=window.GuildAuth.user.nickname;input.value=query;renderResults();});searchGroup.append(mine);controls.append(fieldset,searchGroup);
    const summary=el('section',undefined,'siege-summary');summary.setAttribute('aria-label','선택한 등수 분배 요약');
    const selection=el('p',undefined,'siege-selection');selection.setAttribute('aria-live','polite');
    const hint=el('p','금액 아래 괄호는 성장도·참여점수·실제 입찰 주화 수입니다.','siege-explanation');
    const results=el('div');
    content.append(controls,summary,selection,hint,results);
    renderResults=()=>{
      if(!data||!signedIn())return;
      page.dataset.siegeRank=rank;
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
    labels.forEach((label,i)=>{const th=el('th',label);th.scope='col';if(i===0)th.className='siege-sticky-number';if(i===1)th.className='siege-sticky-name';if(i===2)th.className='siege-bid';if(i===labels.length-1)th.className='siege-final';header.append(th);});head.append(header);table.append(head);
    const body=el('tbody');
    for(const member of members){
      const tr=el('tr');if(normalize(member.name)===normalize(window.GuildAuth.user?.nickname))tr.className='siege-my-row';
      tr.append(payoutCell(String(data.members.indexOf(member)+1),'siege-sticky-number'));const name=el('th',member.name,'siege-sticky-name');name.scope='row';tr.append(name);
      const bidCell=payoutWithMetric('td',member[rank].bid,number(member.coins)+'주화');bidCell.className='siege-bid';tr.append(bidCell);
      for(const category of data.categories)tr.append(payoutWithMetric('td',member[rank].components[category.key],metric(member,category)));
      tr.append(payoutCell(number(member[rank].general)),payoutCell(number(member[rank].total),'siege-final'));body.append(tr);
    }
    table.append(body);
    const foot=el('tfoot'),tr=el('tr');const label=el('th',`표시 ${members.length}명 합계`,'siege-sticky-total');label.colSpan=2;label.scope='row';tr.append(label);
    const sum=key=>members.reduce((s,m)=>s+m[rank][key],0),coins=members.reduce((s,m)=>s+m.coins,0);
    const bidTotal=payoutWithMetric('td',sum('bid'),number(coins)+'주화');bidTotal.className='siege-bid';tr.append(bidTotal);
    for(const category of data.categories){const amountSum=members.reduce((s,m)=>s+m[rank].components[category.key],0),metricSum=members.reduce((s,m)=>s+m.metrics[category.key],0);tr.append(payoutWithMetric('td',amountSum,number(metricSum)+category.unit));}
    tr.append(payoutCell(number(sum('general'))),payoutCell(number(sum('total')),'siege-final'));foot.append(tr);table.append(foot);frame.append(table);return frame;
  }
  function buildCards(members){
    const list=el('div',undefined,'siege-mobile-list');
    for(const member of members){
      const isMine=normalize(member.name)===normalize(window.GuildAuth.user?.nickname);
      const card=el('article',undefined,'siege-mobile-card'),heading=el('div',undefined,'siege-mobile-heading');heading.append(el('h2',member.name));if(isMine){card.classList.add('siege-my-card');heading.append(el('span','내 분배금'));}card.append(heading);
      const total=el('div',undefined,'siege-mobile-total');total.append(el('span',`${rankLabel()} 최종 분배금`),el('strong',number(member[rank].total)+' 다이아'));card.append(total);
      const split=el('dl',undefined,'siege-mobile-split');for(const [label,value,isBid] of [['입찰기여금',number(member[rank].bid),true],['종합분배금',number(member[rank].general),false]]){const pair=el('div'),term=el('dt',label);if(isBid){pair.className='siege-mobile-bid';term.append(el('span',`(${number(member.coins)}주화 입찰)`,'siege-bid-coins'));}pair.append(term,el('dd',value));split.append(pair);}card.append(split);
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
