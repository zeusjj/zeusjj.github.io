const tabs = ['rules', 'notices', 'members', 'distribution', 'tips', 'tools'];
let tipsLoaded=false;
const refreshIcons=()=>window.lucide?.createIcons({attrs:{'aria-hidden':'true','stroke-width':1.7}});
function updateChapterNavigation(){
  let current='guild-operations';
  for(const id of ['guild-operations','guild-distribution','guild-allocation'])if(document.getElementById(id)?.getBoundingClientRect().top<170)current=id;
  document.querySelectorAll('[data-scroll]').forEach(button=>{const active=button.dataset.scroll===current;button.classList.toggle('active',active);button.setAttribute('aria-current',active?'location':'false');});
}
window.addEventListener('scroll',updateChapterNavigation,{passive:true});
function switchTab(tab) {
  if (!tabs.includes(tab)) tab = 'rules';
  for (const id of tabs) document.getElementById(id).hidden = id !== tab;
  for (const button of document.querySelectorAll('[data-tab]')) {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
  const label=document.querySelector(`[data-tab="${tab}"]`).textContent.trim();
  document.getElementById('current-view').textContent=label;
  document.title=`${label} | 절대중립`;
  window.scrollTo({top:0,behavior:'instant'});
  updateChapterNavigation();
  if(tab==='tips' && !tipsLoaded) loadTips();
}
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {location.hash = button.dataset.tab;}));
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.getElementById('main-content').focus();});
document.querySelectorAll('[data-scroll]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.scroll)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})));
window.addEventListener('hashchange', () => switchTab(location.hash.slice(1)));
const element = (tag, text, className) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function renderRules(text) {
  const target=document.getElementById('rule-content');
  target.replaceChildren();
  const sections=new Map();
  function bodyContent(text, parent) {
    const lines=text.replace(/\r/g,'').split('\n');
    let list=null;
    for(let i=0;i<lines.length;i++) {
      let line=lines[i].trim();
      if(!line) {list=null;continue;}
      while(i+1<lines.length && lines[i+1].trim() && !/^\s*(?:[-▶※]|[ABC]\.\s)/.test(lines[i+1])) line+=' '+lines[++i].trim();
      if(line.startsWith('-')) {
        if(!list){list=element('ul');parent.append(list);}
        list.append(element('li',line.replace(/^-\s*/,'')));
      } else {
        list=null;
        parent.append(element(line.startsWith('▶')?'h3':'p',line.replace(/^▶\s*/,''),line.startsWith('※')?'policy-note':undefined));
      }
    }
  }
  const layouts={'길드 운영 방향성':'direction','시간':'schedule','인터':'relations','길드원 활동 기준':'growth','분배 기조':'principles','분배 시스템':'system','1. 분배 아이템 유형':'types','2. 공통 분배 및 입찰 조건':'conditions','3. 최소 입찰가':'prices','4. 클래스 전용 아이템 분배':'class-items','5. 방어구 분배':'armor','6. 방어구 분배 로테이션':'rotation','입찰 규칙':'bidding','분배 시간':'timing','분배 관련 안내':'updates'};
  for(const section of text.split(/\r?\n(?=\[)/)) {
    const match=section.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
    if(!match) continue;
    const kind=layouts[match[1]] || 'updates';
    const wrapper=element('section',undefined,'policy-section policy-'+kind);
    wrapper.append(element('h2',match[1].replace(/^\d+\.\s*/,'')));
    const body=element('div',undefined,'policy-body');
    const content=match[2].trim();
    if(kind==='schedule') {
      const schedule=content.match(/^-\s*(\S+)\s+(\d+:\d+)/m);
      if(schedule){const time=element('div',undefined,'schedule-time');time.append(element('span',schedule[1]),element('strong',schedule[2]));body.append(time);}
      bodyContent(content.replace(/^-\s*\S+\s+\d+:\d+\s*$/m,''),body);
    } else if(kind==='types') {
      for(const group of content.split('▶').filter(part=>part.trim())) {
        const parts=group.trim().split(/\s+-\s+/);body.append(element('h3',parts.shift()));
        const chips=element('ul',undefined,'item-chips');for(const part of parts)chips.append(element('li',part));body.append(chips);
      }
    } else if(kind==='armor') {
      const chunks=content.split(/\n(?=[ABC]\. )/);
      bodyContent(chunks.shift(),body);
      const steps=element('div',undefined,'armor-steps');
      for(const chunk of chunks){
        const split=chunk.indexOf('\n');const step=element('section',undefined,'armor-step');
        const heading=chunk.slice(0,split);step.append(element('span',heading[0],'allocation-letter'),element('h3',heading.slice(3)));
        const facts=element('dl',undefined,'allocation-facts');
        for(const fact of chunk.slice(split+1).split('▶').filter(value=>value.trim())){
          const divider=fact.indexOf(' - ');if(divider<0)continue;
          const row=element('div');row.append(element('dt',fact.slice(0,divider).trim()),element('dd',fact.slice(divider+3).replace(/\s+/g,' ').trim()));facts.append(row);
        }
        step.append(facts);steps.append(step);
      }
      body.append(steps);
    } else if(kind==='prices') {
      const explanation=element('div',undefined,'price-explanation');
      const rates=element('dl',undefined,'price-rates');
      const remaining=[];
      for(const line of content.split(/\r?\n/)) {
        const rate=line.match(/^\s*-\s*(스킬북|T5):\s*([\d,]+)\s*$/);
        if(rate){const item=element('div');item.append(element('dt',rate[1]),element('dd',rate[2]));rates.append(item);}
        else remaining.push(line);
      }
      bodyContent(remaining.join('\n'),explanation);
      body.append(explanation,rates);
    } else if(kind==='conditions') {
      const chunks=content.split(/(?=▶)/);
      const columns=element('div',undefined,'condition-columns');
      for(const chunk of chunks){if(!chunk.trim())continue;const column=element('div');bodyContent(chunk,column);columns.append(column);}
      body.append(columns);
    } else if(kind==='class-items') {
      const chunks=content.split(/\n/).map(line=>line.trim()).filter(Boolean);
      const priorities=element('ol',undefined,'priority-list');
      let method='';
      for(const line of chunks){if(/^\d순위/.test(line))priorities.append(element('li',line.replace(/^\d순위\s*-\s*/,'')));else if(line.startsWith('▶ 입찰 방식'))method=line;else bodyContent(line,body);}
      body.append(priorities);bodyContent(method,body);
    } else bodyContent(content,body);
    wrapper.append(body);
    sections.set(kind,wrapper);
  }
  const group=(className,kinds)=>{const node=element('div',undefined,className);for(const kind of kinds){const section=sections.get(kind);if(section){node.append(section);sections.delete(kind);}}return node;};
  const overview=element('div',undefined,'operations-layout');overview.id='guild-operations';
  overview.append(group('operation-copy',['direction','growth','relations']),group('schedule-rail',['schedule','timing']));target.append(overview);
  const chapter=(id,title,icon)=>{const node=element('section',undefined,'policy-chapter');node.id=id;const heading=element('div',undefined,'chapter-heading');const symbol=element('i');symbol.dataset.lucide=icon;heading.append(symbol,element('h2',title));node.append(heading);return node;};
  const distribution=chapter('guild-distribution','분배 기준','scale');
  distribution.append(group('distribution-intro',['principles','system']),group('eligibility-layout',['types','conditions']),group('price-band',['prices']));target.append(distribution);
  const allocation=chapter('guild-allocation','아이템 분배','swords');
  allocation.append(group('allocation-layout',['class-items','armor']),group('allocation-notes',['rotation','bidding','updates']));target.append(allocation);
  for(const section of sections.values())target.append(section);
  updateChapterNavigation();
  refreshIcons();
}
const tipsApi='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/tips';
const tipForm=document.getElementById('tip-form');
function showTipForm(show){tipForm.hidden=!show;document.getElementById('new-tip').setAttribute('aria-expanded',String(show));if(show)tipForm.elements.title.focus();}
document.getElementById('new-tip').addEventListener('click',()=>showTipForm(tipForm.hidden));
document.getElementById('cancel-tip').addEventListener('click',()=>showTipForm(false));
function renderTips(tips){
  const list=document.getElementById('tips-list');list.replaceChildren();
  document.getElementById('tip-count').textContent=`${tips.length}개의 팁`;
  for(const tip of tips){
    const item=element('details',undefined,'board-entry');const summary=element('summary');
    const disclosure=element('i',undefined,'disclosure-icon');disclosure.dataset.lucide='chevron-down';
    summary.append(element('span',tip.title,'entry-title'),element('span',tip.author,'entry-author'),element('time',new Date(tip.created_at).toLocaleDateString('ko-KR')),disclosure);
    const body=element('div',undefined,'entry-body');body.append(element('p',tip.content,'tip-text'));
    if(tip.url){try{const parsed=new URL(tip.url);if(['http:','https:'].includes(parsed.protocol)){const link=element('a',tip.url,'inline-link');link.href=parsed.href;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}}catch{}}
    item.append(summary,body);list.append(item);
  }
  document.getElementById('tips-status').textContent=tips.length?'':'아직 등록된 팁이 없습니다.';
  refreshIcons();
}
async function loadTips(){
  const status=document.getElementById('tips-status');status.textContent='팁을 불러오는 중입니다.';
  const refresh=document.getElementById('refresh-tips');refresh.disabled=true;
  try{const response=await fetch(tipsApi,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('load');const data=await response.json();if(!Array.isArray(data.tips))throw new Error('format');renderTips(data.tips);tipsLoaded=true;}
  catch{status.textContent='팁을 불러오지 못했습니다. 잠시 후 새로고침해주세요.';}
  finally{refresh.disabled=false;}
}
document.getElementById('refresh-tips').addEventListener('click',loadTips);
tipForm.addEventListener('submit',async event=>{
  event.preventDefault();const status=document.getElementById('tip-form-status');const submit=tipForm.querySelector('[type="submit"]');submit.disabled=true;status.textContent='등록 중입니다.';
  const values=Object.fromEntries(new FormData(tipForm));
  try{const response=await fetch(tipsApi,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw new Error(result.error || '등록하지 못했습니다.');tipForm.reset();status.textContent='';showTipForm(false);await loadTips();}
  catch(error){status.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 새로고침하여 등록 여부를 확인해주세요.':error.message;}
  finally{submit.disabled=false;}
});
function renderMembers(data, query='') {
  const rows=data.members.filter(row=>String(row[1]).toLowerCase().includes(query.toLowerCase()));
  const table=document.getElementById('member-table');table.replaceChildren();
  const head=element('thead');const group=element('tr',undefined,'group-header');
  const general=element('th','길드원 및 단톡방');general.colSpan=3;
  const content=element('th','길드 컨텐츠');content.colSpan=data.headers.length-3;group.append(general,content);head.append(group);
  const titles=element('tr');data.headers.forEach((title,index)=>titles.append(element('th',title,index===1?'member-name':undefined)));head.append(titles);table.append(head);
  const body=element('tbody');
  for(const row of rows) {const tr=element('tr');row.forEach((value,index)=>{const td=element('td',undefined,index===1?'name member-name':undefined);if(index>=2){const status=element('span',value??'-','status '+(value==='O'||value==='ㅇ'?'yes':value==='X'||value==='x'?'no':value==='-'||value===null?'pending':''));td.append(status);}else td.textContent=value;tr.append(td);});body.append(tr);}
  table.append(body);document.getElementById('member-count').textContent=`${rows.length} / ${data.members.length}명`;
  document.getElementById('empty-search').hidden=rows.length>0;
}
function renderDistribution(groups) {
  const target=document.getElementById('distribution-content');
  for(const group of groups){const section=element('section',undefined,'distribution-group');const heading=element('div',undefined,'distribution-heading');heading.append(element('h2',group.title),element('span',`${group.records.length}건`,'record-count'));section.append(heading);
    if(!group.records.length){section.append(element('p','등록된 분배 기록이 없습니다.','empty'));}
    else{const table=element('table');const head=element('thead');const headings=element('tr');['닉네임','아이템','낙찰 금액'].forEach(label=>headings.append(element('th',label)));head.append(headings);table.append(head);const body=element('tbody');for(const record of group.records){const row=element('tr');[record.name,record.item,record.amount===null?'-':record.amount.toLocaleString('ko-KR')].forEach(value=>row.append(element('td',value)));body.append(row);}table.append(body);section.append(table);}target.append(section);
  }
}
function updateTools(){const count=Number(document.getElementById('bid-count').value);const type=document.getElementById('item-type').value;document.getElementById('bid-result').textContent=!Number.isInteger(count)||count<1?'입찰 인원을 확인해주세요':count===1||type==='t4'?'최소 입찰가 없음':(type==='book'?1000:1500).toLocaleString('ko-KR')+' 다이아';const previous=document.getElementById('last-rotation').value;const next={start:'A',A:'B',B:'C',C:'A'}[previous];document.getElementById('rotation-result').textContent=next+' · '+{A:'참여자 자유 입찰',B:'성장도 상위 30%',C:'3회 연속 참여자'}[next];}
document.querySelectorAll('.tool').forEach(form=>{form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('input',updateTools);});updateTools();
fetch('data.json').then(response=>{if(!response.ok)throw new Error('load');return response.json();}).then(data=>{renderRules(data.rules);renderMembers(data);renderDistribution(data.distribution);document.getElementById('search').addEventListener('input',event=>renderMembers(data,event.target.value));document.getElementById('loading').hidden=true;switchTab(location.hash.slice(1));}).catch(()=>{document.getElementById('loading').textContent='길드 정보를 불러오지 못했습니다. 잠시 후 새로고침해주세요.';});
