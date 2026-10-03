const tabs = ['rules', 'members', 'distribution', 'tools'];
function switchTab(tab) {
  if (!tabs.includes(tab)) tab = 'rules';
  for (const id of tabs) document.getElementById(id).hidden = id !== tab;
  for (const button of document.querySelectorAll('[data-tab]')) {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
}
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {location.hash = button.dataset.tab;}));
window.addEventListener('hashchange', () => switchTab(location.hash.slice(1)));
const element = (tag, text, className) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function renderRules(text) {
  const sections = text.split(/\r?\n(?=\[)/);
  const target=document.getElementById('rule-content');
  for(const section of sections) {
    const match=section.match(/^\[([^\]]+)\]\s*([\s\S]*)$/);
    if(!match) continue;
    const wrapper=element('section',undefined,'rule-section');
    wrapper.append(element('h2',match[1]),element('p',match[2].replace(/\n[ \t]+/g,'\n').trim()));
    target.append(wrapper);
  }
}
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
