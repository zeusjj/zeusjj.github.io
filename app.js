const tabs = ['rules', 'notices', 'members', 'distribution', 'tips', 'tools'];
let tipsLoaded=false;
function switchTab(tab) {
  if (!tabs.includes(tab)) tab = 'rules';
  for (const id of tabs) document.getElementById(id).hidden = id !== tab;
  for (const button of document.querySelectorAll('[data-tab]')) {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
  if(tab==='tips' && !tipsLoaded) loadTips();
}
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {location.hash = button.dataset.tab;}));
window.addEventListener('hashchange', () => switchTab(location.hash.slice(1)));
const element = (tag, text, className) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function renderRules(text) {
  const target=document.getElementById('rule-content');
  target.replaceChildren();
  function bodyContent(text, parent) {
    const lines=text.replace(/\r/g,'').split('\n');
    let list=null;
    for(let i=0;i<lines.length;i++) {
      let line=lines[i].trim();
      if(!line) {list=null;continue;}
      while(i+1<lines.length && /^\s+\S/.test(lines[i+1]) && !/^\s*[-▶※]/.test(lines[i+1])) line+=' '+lines[++i].trim();
      if(line.startsWith('-')) {
        if(!list){list=element('ul');parent.append(list);}
        list.append(element('li',line.replace(/^-\s*/,'')));
      } else {
        list=null;
        parent.append(element(line.startsWith('▶')?'h3':'p',line.replace(/^▶\s*/,''),line.startsWith('※')?'policy-note':undefined));
      }
    }
  }
  const layouts=['direction','schedule','relations','growth','principles','system','types','conditions','prices','class-items','armor','rotation','bidding','timing','updates'];
  let index=0;
  for(const section of text.split(/\r?\n(?=\[)/)) {
    const match=section.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
    if(!match) continue;
    const kind=layouts[index++] || 'updates';
    const wrapper=element('section',undefined,'policy-section policy-'+kind);
    wrapper.append(element('h2',match[1]));
    const body=element('div',undefined,'policy-body');
    const content=match[2].trim();
    if(kind==='armor') {
      const chunks=content.split(/\n(?=[ABC]\. )/);
      bodyContent(chunks.shift(),body);
      const steps=element('div',undefined,'armor-steps');
      for(const chunk of chunks){const split=chunk.indexOf('\n');const step=element('section',undefined,'armor-step');step.append(element('h3',chunk.slice(0,split)));bodyContent(chunk.slice(split+1),step);steps.append(step);}
      body.append(steps);
    } else if(kind==='conditions') {
      const chunks=content.split(/(?=▶)/);
      const columns=element('div',undefined,'condition-columns');
      for(const chunk of chunks){if(!chunk.trim())continue;const column=element('div');bodyContent(chunk,column);columns.append(column);}
      body.append(columns);
    } else if(kind==='class-items') {
      const chunks=content.split(/\n/).map(line=>line.trim()).filter(Boolean);
      const priorities=element('ol',undefined,'priority-list');
      for(const line of chunks){if(/^\d순위/.test(line))priorities.append(element('li',line.replace(/^\d순위\s*-\s*/,'')));else bodyContent(line,body);}
      body.append(priorities);
    } else bodyContent(content,body);
    wrapper.append(body);
    target.append(wrapper);
  }
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
    summary.append(element('span',tip.title,'entry-title'),element('span',tip.author,'entry-author'),element('time',new Date(tip.created_at).toLocaleDateString('ko-KR')));
    const body=element('div',undefined,'entry-body');body.append(element('p',tip.content,'tip-text'));
    if(tip.url){try{const parsed=new URL(tip.url);if(['http:','https:'].includes(parsed.protocol)){const link=element('a',tip.url,'inline-link');link.href=parsed.href;link.target='_blank';link.rel='noopener noreferrer';body.append(link);}}catch{}}
    item.append(summary,body);list.append(item);
  }
  document.getElementById('tips-status').textContent=tips.length?'':'아직 등록된 팁이 없습니다.';
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
  for(const group of groups){const section=element('section',undefined,'distribution-group');section.append(element('h2',group.title));
    if(!group.records.length){section.append(element('p','등록된 분배 기록이 없습니다.','empty'));}
    else{const table=element('table');const head=element('thead');const headings=element('tr');['닉네임','아이템','낙찰 금액'].forEach(label=>headings.append(element('th',label)));head.append(headings);table.append(head);const body=element('tbody');for(const record of group.records){const row=element('tr');[record.name,record.item,record.amount===null?'-':record.amount.toLocaleString('ko-KR')].forEach(value=>row.append(element('td',value)));body.append(row);}table.append(body);section.append(table);}target.append(section);
  }
}
function updateTools(){const count=Number(document.getElementById('bid-count').value);const type=document.getElementById('item-type').value;document.getElementById('bid-result').textContent=!Number.isInteger(count)||count<1?'입찰 인원을 확인해주세요':count===1||type==='t4'?'최소 입찰가 없음':(type==='book'?1000:1500).toLocaleString('ko-KR')+' 다이아';const previous=document.getElementById('last-rotation').value;const next={start:'A',A:'B',B:'C',C:'A'}[previous];document.getElementById('rotation-result').textContent=next+' · '+{A:'참여자 자유 입찰',B:'성장도 상위 30%',C:'3회 연속 참여자'}[next];}
document.querySelectorAll('.tool').forEach(form=>{form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('input',updateTools);});updateTools();
fetch('data.json').then(response=>{if(!response.ok)throw new Error('load');return response.json();}).then(data=>{renderRules(data.rules);renderMembers(data);renderDistribution(data.distribution);document.getElementById('search').addEventListener('input',event=>renderMembers(data,event.target.value));document.getElementById('loading').hidden=true;switchTab(location.hash.slice(1));}).catch(()=>{document.getElementById('loading').textContent='길드 정보를 불러오지 못했습니다. 잠시 후 새로고침해주세요.';});
