import {overview,weeklyOverview,weeks,weekStart,shiftDay,growthSeries,koreaDay} from './guild-overview-model.js?v=20261020-186';
import {nicknamePicker} from './nickname-picker.js?v=20261020-186';
import {mountWeeklyNews} from './weekly-news.js?v=20261020-186';

const number=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}),decimal=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
const format=value=>Number.isFinite(value)?number.format(value):'—';
const short=date=>date?Number(date.slice(5,7))+'/'+Number(date.slice(8,10)):'—';
const signed=value=>Number.isFinite(value)?(value>0?'+':'')+format(value):'—';
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const link=(text,hash)=>{const node=el('a',text,'overview-link');node.href=hash;return node;};
const icons=()=>window.lucide?.createIcons({attrs:{'aria-hidden':'true','stroke-width':1.7}});
let source,report,chartSeries=[],today=koreaDay();
const profile=document.getElementById('profile-content'),weekly=document.getElementById('weekly-content'),week=document.getElementById('overview-week');
const names=()=>source?source.members.map(row=>row[report.nameIndex]):[];
const choose=name=>{GuildNickname.set(name);};
const headerPicker=nicknamePicker(document.getElementById('header-nickname'),{names,get:()=>GuildNickname.get(),choose,label:'내 닉네임'});
const profilePicker=nicknamePicker(document.getElementById('profile-nickname'),{names,get:()=>GuildNickname.get(),choose:name=>{choose(name);requestAnimationFrame(()=>{document.getElementById('profile-heading').tabIndex=-1;document.getElementById('profile-heading').focus({preventScroll:true});});},label:'내 정보 닉네임'});
headerPicker.sync();profilePicker.sync();

function section(host,title){const section=el('section',undefined,'overview-section');section.append(el('h2',title));host.append(section);return section;}
function note(host,text){host.append(el('p',text,'overview-note'));}
function metrics(host,items){
  const strip=el('dl',undefined,'overview-metrics');
  for(const [label,value,detail]of items){const group=el('div');group.append(el('dt',label),el('dd',value));if(detail)group.append(el('small',detail));strip.append(group);}host.append(strip);
}
function table(host,headers,records){
  if(!records.length){note(host,'기록이 없습니다.');return;}
  const scroll=el('div',undefined,'overview-table-scroll'),table=el('table',undefined,'overview-table'),head=el('thead'),row=el('tr'),body=el('tbody');
  for(const header of headers){const cell=el('th',header);cell.scope='col';row.append(cell);}head.append(row);
  for(const record of records){const tr=el('tr');record.forEach((value,index)=>{const td=el(index===0?'th':'td');if(index===0)td.scope='row';if(value instanceof Node)td.append(value);else td.textContent=value;tr.append(td);});body.append(tr);}
  table.append(head,body);scroll.append(table);host.append(scroll);
}
function badge(text,kind){const node=el('span',text,'overview-badge');node.dataset.kind=kind;return node;}
function rankingCell(row){return row?(row.joint?'공동 ':'')+row.rank+'위 / '+row.total+'명':'집계 제외';}
function renderProfile(){
  if(!source)return;
  const name=GuildNickname.get(),row=source.members.find(row=>row[report.nameIndex]===name);
  document.getElementById('profile-login').hidden=!!row;profile.hidden=!row;profile.replaceChildren();chartSeries=[];
  document.getElementById('profile-selection-status').textContent=name&&!row?'선택한 닉네임의 현재 길드 기록이 없습니다.':'';
  document.getElementById('profile-caption').textContent=row?name+' · '+row[report.classIndex]:'닉네임 선택';
  if(!row)return;
  const history=growthSeries(source,row,today),latest=history.at(-1),previous=history.at(-2),level=latest?source.levels?.[latest.date]?.[name]:null;
  const heading=el('div',undefined,'profile-identity');
  const emblem=el('img');emblem.src='assets/guild-emblem.png';emblem.alt='';emblem.width=48;emblem.height=48;
  const identity=el('div');identity.append(el('h2',name),el('p',row[report.classIndex]+(Number.isInteger(level)?' · Lv.'+level:'')));
  heading.append(emblem,identity);profile.append(heading);
  const goal=report.target,remaining=latest&&goal.growth?Math.max(0,goal.growth-latest.value):null,remainingLevel=Number.isInteger(level)&&goal.level?Math.max(0,goal.level-level):null;
  metrics(profile,[['현재 성장도',format(latest?.value),latest?short(latest.date)+' 기록':'기록 없음'],['직전 기록 대비',latest&&previous?signed(latest.value-previous.value):'—',previous?short(previous.date)+' → '+short(latest.date):'비교 기록 없음'],['목표까지',remaining===null?'—':remaining===0?'성장도 달성':format(remaining)+' 남음',goal.growth?'성장도 '+format(goal.growth)+(goal.deadline?' · ~'+goal.deadline:''):'목표 미설정'],['목표 레벨',remainingLevel===null?'—':remainingLevel===0?'달성':'Lv.'+goal.level,remainingLevel===null?'레벨 기록 없음':remainingLevel?'현재보다 '+remainingLevel+'레벨':'Lv.'+goal.level+' 이상']]);
  const rankings=section(profile,'길드 내 순위');
  const personal=key=>report.rankings[key].find(record=>record.name===name);
  const period=report.baseline&&report.latest?short(report.baseline.date)+' → '+short(report.latest.date):'비교 기록 없음';
  const rankRows=[
    ['성장도','growth',value=>format(value),report.latest?short(report.latest.date):'기록 없음'],
    ['주간 공헌도','contribution',value=>format(value),report.contribution?short(report.contribution.date)+(/중간/.test(report.contribution.header)?' · 중간 기록':''):'기록 없음'],
    ['최근 7일 성장률','rate',value=>(value>0?'+':'')+decimal.format(value)+'%',period],
    ['최근 7일 성장량','increase',signed,period],
    ['제전 포인트 기여','festival',value=>format(value),report.festival?report.festival.header+' · '+short(report.festival.date)+(report.festival.end?' ~ '+short(report.festival.end):''):'기록 없음'],
    ['누적 콘텐츠 참여율','participation',value=>decimal.format(value)+'%','참여·미참여 기록 기준'],
  ];
  table(rankings,['지표','내 기록','길드 순위','집계 기준'],rankRows.map(([title,key,formatValue,period])=>{const record=personal(key);return [title,record?formatValue(record.value):'—',rankingCell(record),period];}));
  note(rankings,'동점은 공동 순위 · 값이 없는 인원은 해당 순위에서 제외 · 최근 7일은 최신 성장 기록일의 7일 전 또는 그 이전 최신 기록과 비교');
  const growthRanking=personal('growth');
  if(growthRanking){const sameClass=report.rankings.growth.filter(record=>source.members.find(member=>member[report.nameIndex]===record.name)?.[report.classIndex]===row[report.classIndex]);note(rankings,row[report.classIndex]+' 성장도 순위 '+(sameClass.filter(record=>record.value>growthRanking.value).length+1)+'위 / '+sameClass.length+'명');}
  const trend=section(profile,'성장 추이');
  if(history.length){
    const canvas=el('canvas');canvas.id='profile-growth-chart';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',name+' 성장도 '+short(history[0].date)+' '+format(history[0].value)+'에서 '+short(latest.date)+' '+format(latest.value));trend.append(canvas);
    const details=el('details',undefined,'overview-history');details.append(el('summary','날짜별 기록'));trend.append(details);table(details,['날짜','성장도','레벨'],[...history].reverse().map(point=>[short(point.date),format(point.value),Number.isInteger(source.levels?.[point.date]?.[name])?'Lv.'+source.levels[point.date][name]:'—']));chartSeries=history;
  }else note(trend,'성장도 기록이 없습니다.');
  const participation=section(profile,'콘텐츠 참여 기록');
  const ownEvents=report.activities.flatMap(event=>{const own=event.eligible.find(member=>member.name===name);return own?[[event.header,short(event.date),badge(own.status==='yes'?'참여':'미참여',own.status)]]:[];});
  table(participation,['콘텐츠','날짜','참여'],ownEvents);participation.append(link('전체 참여 현황','#members'));
  const auctions=section(profile,'내 낙찰 기록');
  const ownRecords=(source.distribution||[]).flatMap(group=>group.records.filter(record=>record.name===name).map(record=>[group.title,record.item,record.amount===null?'미정':format(record.amount)+' 다이아']));
  table(auctions,['분배 회차','아이템','낙찰 금액'],ownRecords);auctions.append(link('전체 분배 기록','#distribution'));
  requestAnimationFrame(drawChart);
}
function drawChart(){
  const canvas=document.getElementById('profile-growth-chart');if(!canvas||!chartSeries.length||document.getElementById('profile').hidden)return;
  const width=canvas.clientWidth;if(!width)return;const height=190,dpr=window.devicePixelRatio||1;canvas.width=Math.round(width*dpr);canvas.height=height*dpr;
  const context=canvas.getContext('2d');context.scale(dpr,dpr);
  const style=getComputedStyle(document.documentElement),color=key=>style.getPropertyValue(key).trim();
  context.fillStyle=color('--page');context.fillRect(0,0,width,height);
  const min=Math.floor((Math.min(...chartSeries.map(p=>p.value))-300)/100)*100,max=Math.max(min+100,Math.ceil((Math.max(...chartSeries.map(p=>p.value))+300)/100)*100);
  const first=Date.parse(chartSeries[0].date),span=Math.max(86400000,Date.parse(chartSeries.at(-1).date)-first),x=p=>58+(Date.parse(p.date)-first)/span*(width-76),y=value=>height-34-(value-min)/(max-min)*(height-55);
  context.font='11px sans-serif';context.textAlign='right';
  for(let i=0;i<3;i++){const value=min+(max-min)*i/2;context.strokeStyle=color('--line');context.beginPath();context.moveTo(54,y(value));context.lineTo(width-14,y(value));context.stroke();context.fillStyle=color('--muted');context.fillText(format(value),48,y(value)+4);}
  context.strokeStyle=color('--accent');context.lineWidth=2.5;context.beginPath();chartSeries.forEach((p,i)=>i?context.lineTo(x(p),y(p.value)):context.moveTo(x(p),y(p.value)));context.stroke();
  context.fillStyle=color('--accent');for(const point of chartSeries){context.beginPath();context.arc(x(point),y(point.value),3,0,Math.PI*2);context.fill();}
  context.fillStyle=color('--muted');context.textAlign='left';context.fillText(short(chartSeries[0].date),54,height-9);context.textAlign='right';context.fillText(short(chartSeries.at(-1).date),width-14,height-9);
}
function topList(host,title,records,formatter){
  const area=section(host,title);
  table(area,['순위','닉네임','기록'],records.slice(0,5).map(record=>[(record.joint?'공동 ':'')+record.rank+'위',record.name,formatter(record.value)]));
  return area;
}
function renderWeekly(){
  if(!source)return;weekly.replaceChildren();
  const summary=weeklyOverview(source,week.value||weekStart(today),today),growth=summary.growth;
  const latestRows=summary.last?source.members.filter(row=>Number.isFinite(row[summary.last.index])):[],mean=latestRows.length?latestRows.reduce((sum,row)=>sum+row[summary.last.index],0)/latestRows.length:null;
  const average=growth.length?growth.reduce((sum,row)=>sum+row.value,0)/growth.length:null;
  document.getElementById('weekly-caption').textContent=short(summary.start)+' ~ '+short(summary.end)+' · '+short(summary.until)+' 기준 · 현재 길드원 '+source.members.length+'명';
  metrics(weekly,[['평균 성장도',format(mean),summary.last?short(summary.last.date)+' · '+latestRows.length+'명':'기록 없음'],['이번 주 평균 성장량',signed(average),growth.length?short(summary.previous.date)+' → '+short(summary.last.date)+' · 비교 가능 '+growth.length+'명':'비교 기록 없음'],['콘텐츠 참여율',summary.eligible?decimal.format(summary.attended/summary.eligible*100)+'%':'—',summary.eligible?summary.attended+' / '+summary.eligible+'건':'집계된 콘텐츠 없음'],['현재 목표 달성',summary.goalRows?summary.achieved+' / '+summary.goalRows+'명':'—','Lv.'+(summary.goal.level||'—')+' · 성장도 '+format(summary.goal.growth)+(summary.goal.deadline?' · ~'+summary.goal.deadline:'')]]);
  note(weekly,'현재 길드원 기준 · 참여율은 O/X가 기록된 대상만 집계하며, 미기록(-)은 제외');
  const activities=section(weekly,'콘텐츠별 참여');
  table(activities,['콘텐츠','날짜','참여 인원','참여율'],summary.activities.map(event=>[event.header,short(event.date),event.attended+' / '+event.eligible.length+'명',decimal.format(event.attended/event.eligible.length*100)+'%']));
  for(const event of summary.activities){const absent=event.eligible.filter(row=>row.status==='no');if(!absent.length)continue;const details=el('details',undefined,'overview-absences');details.append(el('summary',event.header+' 미참여 '+absent.length+'명'),el('p',absent.map(row=>row.name).join(' · ')));activities.append(details);}
  const columns=el('div',undefined,'overview-columns');weekly.append(columns);
  topList(columns,'이번 주 성장량 상위',growth,signed);
  const contribution=topList(columns,'공헌도 상위',summary.contributionRanks,format);
  if(summary.contribution)note(contribution,short(summary.contribution.date)+(/중간/.test(summary.contribution.header)?' · 중간 기록':''));
  const scheduled=section(weekly,'일정 · 분배');
  for(const event of summary.upcoming){const item=el('p',undefined,'overview-schedule');item.append(badge(short(event.date),'date'),el('strong',event.header));scheduled.append(item);}
  for(const group of summary.distributions){const item=el('p',undefined,'overview-schedule');item.append(el('strong',group.title),el('span',group.records.length?group.records.length+'건 기록':group.schedule||'분배 예정'));scheduled.append(item);}
  if(!summary.upcoming.length&&!summary.distributions.length)note(scheduled,'등록된 일정·분배가 없습니다.');scheduled.append(link('분배 기록','#distribution'));
  mountWeeklyNews(section(weekly,'이번 주 올라온 글'),{start:summary.start,end:summary.end});
}
function accept(data){
  if(source===data)return;source=data;report=overview(source,today);
  headerPicker.refresh();profilePicker.refresh();
  const previous=week.value;week.replaceChildren(...weeks(source,today).map(start=>new Option(short(start)+' ~ '+short(shiftDay(start,6)),start)));
  if([...week.options].some(option=>option.value===previous))week.value=previous;
  renderProfile();renderWeekly();icons();
}
week.addEventListener('change',()=>{renderWeekly();icons();});
window.addEventListener('guild-members-data',event=>accept(event.detail));
window.addEventListener('guild-nickname-change',()=>{headerPicker.sync();profilePicker.sync();renderProfile();icons();});
window.addEventListener('hashchange',()=>{headerPicker.hide();profilePicker.hide();if(location.hash==='#weekly')renderWeekly();if(location.hash==='#profile'){requestAnimationFrame(drawChart);if(!GuildNickname.get())setTimeout(()=>profilePicker.input.focus(),0);}});
window.addEventListener('guild-theme-change',()=>requestAnimationFrame(drawChart));
new ResizeObserver(()=>requestAnimationFrame(drawChart)).observe(profile);
document.addEventListener('visibilitychange',()=>{const day=koreaDay();if(!document.hidden&&day!==today){today=day;if(source){const data=source;source=null;accept(data);}}});
if(typeof memberData!=='undefined'&&memberData)accept(memberData);
