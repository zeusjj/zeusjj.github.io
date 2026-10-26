import {overview,weeklyOverview,weeks,weekStart,shiftDay,growthSeries,guildGrowthSeries,koreaDay,growthTopPercent} from './guild-overview-model.js?v=20261026-weekly';
import {nicknamePicker} from './nickname-picker.js?v=20261020-195';
import {mountWeeklyNews} from './weekly-news.js?v=20261021-196';

const number=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}),decimal=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
const format=value=>Number.isFinite(value)?number.format(value):'—';
const short=date=>date?Number(date.slice(5,7))+'/'+Number(date.slice(8,10)):'—';
const signed=value=>Number.isFinite(value)?(value>0?'+':'')+format(value):'—';
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const link=(text,hash)=>{const node=el('a',text,'overview-link');node.href=hash;return node;};
const icons=()=>window.lucide?.createIcons({attrs:{'aria-hidden':'true','stroke-width':1.7}});
let source,report,chartSeries=[],guildSeries=[],neighborSeries=[],viewingName='',today=koreaDay();
const profile=document.getElementById('profile-content'),weekly=document.getElementById('weekly-content'),week=document.getElementById('overview-week');
const names=()=>source?window.GuildMemberArchive.all(source).map(row=>row[report.nameIndex]):[];
const viewerPicker=nicknamePicker(document.getElementById('profile-viewer'),{names,get:()=>viewingName,choose:name=>{viewingName=name;viewerPicker.sync();renderProfile();},label:'다른 사람 정보 보기'});
viewerPicker.input.placeholder='다른 사람 정보 보기';viewerPicker.sync();
document.getElementById('profile-viewer-reset').addEventListener('click',()=>{viewingName='';viewerPicker.sync();renderProfile();viewerPicker.input.focus({preventScroll:true});});

function section(host,title){const section=el('section',undefined,'overview-section');section.append(el('h2',title));host.append(section);return section;}
function note(host,text){host.append(el('p',text,'overview-note'));}
function information(host,text){
  host.classList.add('has-information');const details=el('details',undefined,'overview-information'),summary=el('summary'),icon=el('i');icon.dataset.lucide='info';summary.title='집계 기준';summary.setAttribute('aria-label','집계 기준');summary.append(icon);details.append(summary,el('p',text));host.append(details);
}
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
  const user=window.GuildAuth?.user,name=user?(viewingName||user.nickname):'',row=window.GuildMemberArchive.all(source).find(row=>row[report.nameIndex]===name);
  document.getElementById('profile-login').hidden=!!user;profile.hidden=!user;profile.replaceChildren();chartSeries=[];guildSeries=[];neighborSeries=[];
  document.getElementById('profile-viewer-controls').hidden=!user;
  document.getElementById('profile-viewer-reset').style.visibility=viewingName?'visible':'hidden';
  document.getElementById('profile-caption').textContent=row?name+' · '+row[report.classIndex]+(window.GuildMemberArchive.has(source,name)?' · 탈퇴':''):user?'현재 길드 기록이 없습니다.':'로그인 후 내 정보를 확인하세요.';
  if(!row)return;
  const history=growthSeries(source,row,today),latest=history.at(-1),previous=history.at(-2),level=latest?source.levels?.[latest.date]?.[name]:null;
  const heading=el('div',undefined,'profile-identity');
  const emblem=el('img');emblem.src='assets/guild-emblem.png';emblem.alt='';emblem.width=48;emblem.height=48;
  const identity=el('div');identity.append(el('h2',name),el('p',row[report.classIndex]+(Number.isInteger(level)?' · Lv.'+level:'')));
  heading.append(emblem,identity);profile.append(heading);
  const goal=report.target,remaining=latest&&goal.growth?Math.max(0,goal.growth-latest.value):null,remainingLevel=Number.isInteger(level)&&goal.level?Math.max(0,goal.level-level):null;
  const growthRank=report.rankings.growth.find(record=>record.name===name),top=growthTopPercent(growthRank);
  const weighted=report.weighted.rows.find(record=>record.name===name),increase=report.rankings.increase.find(record=>record.name===name),rate=report.rankings.rate.find(record=>record.name===name);
  metrics(profile,[['현재 성장도',format(latest?.value),latest?short(latest.date)+' 기록':'기록 없음'],['길드 성장도 순위',growthRank?(growthRank.joint?'공동 ':'')+growthRank.rank+'위':'—',top!==null?'상위 '+decimal.format(top)+'% · '+growthRank.total+'명 기준':'기록 없음'],['최근 7일 성장량',increase?signed(increase.value):'—',rate?(rate.value>0?'+':'')+decimal.format(rate.value)+'% · '+short(report.baseline.date)+' → '+short(report.latest.date):'비교 기록 없음'],['공식 참여율',weighted?.score!==null&&weighted?decimal.format(weighted.score)+'%':'—','최근 4주 · 주당 25%']]);
  const goals=el('div',undefined,'profile-goal-line');goals.append(badge(remaining===0?'성장도 목표 달성':remaining===null?'성장도 목표 미설정':format(remaining)+' 성장도 남음',remaining===0?'yes':'pending'),badge(remainingLevel===0?'레벨 목표 달성':remainingLevel===null?'레벨 기록 없음':remainingLevel+'레벨 남음',remainingLevel===0?'yes':'pending'));
  if(goal.growth)goals.append(el('small','목표 Lv.'+goal.level+' · '+format(goal.growth)+(goal.deadline?' · ~'+goal.deadline:'')));
  profile.append(goals);
  const panels=el('div',undefined,'profile-detail-columns');profile.append(panels);
  const rankings=section(profile,'길드 내 순위');
  const personal=key=>report.rankings[key].find(record=>record.name===name);
  const period=report.baseline&&report.latest?short(report.baseline.date)+' → '+short(report.latest.date):'비교 기록 없음';
  const rankRows=[
    ['성장도','growth',value=>format(value),report.latest?short(report.latest.date):'기록 없음'],
    ['주간 공헌도','contribution',value=>format(value),report.contribution?short(report.contribution.date)+(/중간/.test(report.contribution.header)?' · 중간 기록':''):'기록 없음'],
    ['최근 7일 성장률','rate',value=>(value>0?'+':'')+decimal.format(value)+'%',period],
    ['최근 7일 성장량','increase',signed,period],
    ['제전 포인트 기여','festival',value=>format(value),report.festivalColumns.length?report.festivalColumns.map(column=>column.header.replace(' 제전 기여','')).join(' + ')+' 제전 합산':'기록 없음'],
    ['공식 콘텐츠 참여율','weighted',value=>decimal.format(value)+'%',report.weighted.periods.length?'최근 4주 · 주당 25%':'기록 없음'],
    ['단순 누적 참여비율','participation',value=>decimal.format(value)+'%','참여·미참여 기록 건수 기준'],
  ];
  const rankGroups=el('div',undefined,'profile-rank-groups');rankings.append(rankGroups);
  for(const [label,keys]of [['성장',['growth','rate','increase']],['공헌',['contribution','festival']],['참여',['weighted','participation']]]){
    const group=el('div',undefined,'profile-rank-group');group.append(el('h3',label));const list=el('dl');
    for(const [title,key,formatValue,period]of rankRows.filter(row=>keys.includes(row[1]))){const record=personal(key),item=el('div',undefined,'profile-rank-item'),value=el('dd');value.append(el('strong',record?formatValue(record.value):'—'),el('span',rankingCell(record)));item.append(el('dt',title),value,el('small',period));list.append(item);}group.append(list);rankGroups.append(group);
  }
  information(rankings,'동점은 공동 순위이며 값이 없는 인원은 해당 순위에서 제외합니다. 최근 7일은 최신 성장 기록일의 7일 전 또는 그 이전 최신 기록과 비교합니다. 성장도 상위 비율 = 공동 순위 ÷ 성장도 집계 인원 × 100.');
  const growthRanking=personal('growth');
  if(growthRanking){const sameClass=report.rankings.growth.filter(record=>source.members.find(member=>member[report.nameIndex]===record.name)?.[report.classIndex]===row[report.classIndex]);note(rankings,row[report.classIndex]+' 성장도 순위 '+(sameClass.filter(record=>record.value>growthRanking.value).length+1)+'위 / '+sameClass.length+'명');}
  const participationScore=section(panels,'최근 4주 공식 참여율');participationScore.classList.add('profile-participation');
  if(weighted){
    const headline=el('div',undefined,'overview-participation-score');
    headline.append(el('strong',weighted.score===null?'산정 확인 필요':decimal.format(weighted.score)+'%'));
    if(weighted.score!==null){const qualifies=weighted.score>=75-1e-9;headline.append(badge(qualifies?'75% 참여율 조건 충족':'75% 참여율 조건 미달',qualifies?'yes':'no'));}
    participationScore.append(headline);
    const meter=el('div',undefined,'participation-meter');meter.setAttribute('role','img');meter.setAttribute('aria-label','최근 4주 참여율 '+(weighted.score===null?'산정 확인 필요':decimal.format(weighted.score)+'%')+' · 기준 75%');
    for(const period of weighted.breakdown){const track=el('span',undefined,'participation-meter-week'),fill=el('span');fill.style.width=Math.max(0,Math.min(100,(period.points??0)*4))+'%';track.title=short(period.start)+' '+(period.points===null?'산정 확인 필요':decimal.format(period.points)+'% / 25%');track.append(fill);meter.append(track);}const threshold=el('span','75%','participation-meter-threshold');meter.append(threshold);participationScore.append(meter);
    note(participationScore,short(report.weighted.lastDate)+' 최근 콘텐츠 기록 기준 · 입찰의 다른 조건은 별도 확인');
    table(participationScore,['집계 주간','콘텐츠 수','내 참여','반영 점수'],weighted.breakdown.map(period=>[short(period.start)+' ~ '+short(period.end),period.total?period.total+'개':'기록 없음',period.total?period.attended+' / '+period.total+'회'+(period.missing?' · 미기록 '+period.missing+'개':''):'—',period.points===null?'산정 확인 필요':decimal.format(period.points)+'% / 25%']));
    information(participationScore,'최근 4주 각 25%. 같은 날 콘텐츠를 N개 진행하면 1개당 25/N%로 계산하고 반올림 전 원수치로 합산합니다.');
    if(weighted.incomplete)note(participationScore,'미기록(-) 또는 기록이 없는 주는 점수를 가산하지 않았습니다. 가입 전 기록 등은 별도 확인이 필요합니다.');
    if(weighted.needsReview)note(participationScore,'같은 주에 여러 날짜의 콘텐츠가 있어 주간 25% 배분 기준 확인이 필요합니다.');
  }else note(participationScore,'참여 기록이 없습니다.');
  const trend=section(panels,'성장 추이');trend.classList.add('profile-trend');
  if(latest&&previous)note(trend,'직전 기록 대비 '+signed(latest.value-previous.value)+' · '+short(previous.date)+' → '+short(latest.date));
  if(history.length){
    guildSeries=guildGrowthSeries(source,today).filter(point=>point.date>=history[0].date&&point.date<=latest.date);
    const position=report.rankings.growth.findIndex(record=>record.name===name);
    if(position>=0)for(const [offset,kind]of [[-1,'above'],[1,'below']]){
      const neighbor=report.rankings.growth[position+offset];if(!neighbor)continue;
      const member=source.members.find(record=>record[report.nameIndex]===neighbor.name);
      neighborSeries.push({name:neighbor.name,kind,points:growthSeries(source,member,today).filter(point=>point.date>=history[0].date&&point.date<=latest.date)});
    }
    const ownLabel=name===user.nickname?'내 성장도':name+' 성장도';
    const legend=el('div',undefined,'growth-chart-legend');legend.append(el('span',ownLabel,'growth-chart-personal'),el('span','길드평균','growth-chart-guild'));for(const neighbor of neighborSeries){const label=el('span',neighbor.name,'growth-chart-'+neighbor.kind);label.title='최신 성장도 순위 바로 '+(neighbor.kind==='above'?'위':'아래');legend.append(label);}trend.append(legend);
    const canvas=el('canvas');canvas.id='profile-growth-chart';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',ownLabel+' '+short(history[0].date)+' '+format(history[0].value)+'에서 '+short(latest.date)+' '+format(latest.value)+' · 길드평균 및 인접 순위 '+neighborSeries.map(record=>record.name).join(', ')+' 비교');trend.append(canvas);
    const details=el('details',undefined,'overview-history');details.append(el('summary','날짜별 기록'));trend.append(details);table(details,['날짜',ownLabel,'길드평균',...neighborSeries.map(record=>record.name),'레벨'],[...history].reverse().map(point=>[short(point.date),format(point.value),format(guildSeries.find(record=>record.date===point.date)?.value),...neighborSeries.map(record=>format(record.points.find(item=>item.date===point.date)?.value)),Number.isInteger(source.levels?.[point.date]?.[name])?'Lv.'+source.levels[point.date][name]:'—']));chartSeries=history;
    note(trend,'길드평균은 현재 길드원의 날짜별 기록 기준 · 비교 길드원은 최신 성장도 순위의 바로 위·아래 한 명입니다.');
  }else note(trend,'성장도 기록이 없습니다.');
  const participation=section(profile,'콘텐츠 참여 기록');
  const ownEvents=report.activities.flatMap(event=>{const own=event.eligible.find(member=>member.name===name);return own?[[event.header,short(event.date),badge(own.status==='yes'?'참여':'미참여',own.status)]]:[];});
  table(participation,['콘텐츠','날짜','참여'],ownEvents);participation.append(link('전체 참여 현황','#members'));
  const auctions=section(profile,'내 낙찰 기록');
  const ownRecords=(source.distribution||[]).flatMap(group=>group.records.filter(record=>record.name===name).map(record=>[group.title,record.item,record.amount===null?'미정':format(record.amount)+' 다이아']));
  table(auctions,['분배 회차','아이템','낙찰 금액'],ownRecords);auctions.append(link('전체 분배 기록','#distribution'));
  requestAnimationFrame(drawChart);icons();
}
function drawChart(){
  const canvas=document.getElementById('profile-growth-chart');if(!canvas||!chartSeries.length||document.getElementById('profile').hidden)return;
  const width=canvas.clientWidth;if(!width)return;const height=190,dpr=window.devicePixelRatio||1;canvas.width=Math.round(width*dpr);canvas.height=height*dpr;
  const context=canvas.getContext('2d');context.scale(dpr,dpr);
  const style=getComputedStyle(document.documentElement),color=key=>style.getPropertyValue(key).trim();
  context.fillStyle=color('--page');context.fillRect(0,0,width,height);
  const values=[...chartSeries,...guildSeries,...neighborSeries.flatMap(record=>record.points)].map(point=>point.value);
  const min=Math.floor((Math.min(...values)-300)/100)*100,max=Math.max(min+100,Math.ceil((Math.max(...values)+300)/100)*100);
  const first=Date.parse(chartSeries[0].date),span=Math.max(86400000,Date.parse(chartSeries.at(-1).date)-first),x=p=>58+(Date.parse(p.date)-first)/span*(width-76),y=value=>height-34-(value-min)/(max-min)*(height-55);
  context.font='11px sans-serif';context.textAlign='right';
  for(let i=0;i<3;i++){const value=min+(max-min)*i/2;context.strokeStyle=color('--line');context.beginPath();context.moveTo(54,y(value));context.lineTo(width-14,y(value));context.stroke();context.fillStyle=color('--muted');context.fillText(format(value),48,y(value)+4);}
  context.strokeStyle=color('--growth-guild');context.lineWidth=2;context.beginPath();guildSeries.forEach((p,i)=>i?context.lineTo(x(p),y(p.value)):context.moveTo(x(p),y(p.value)));context.stroke();
  if(guildSeries.length===1){context.beginPath();context.arc(x(guildSeries[0]),y(guildSeries[0].value),2,0,Math.PI*2);context.fillStyle=color('--growth-guild');context.fill();}
  for(const neighbor of neighborSeries){context.strokeStyle=color('--growth-'+neighbor.kind);context.lineWidth=1;context.setLineDash(neighbor.kind==='below'?[7,3]:[]);context.beginPath();neighbor.points.forEach((point,index)=>index?context.lineTo(x(point),y(point.value)):context.moveTo(x(point),y(point.value)));context.stroke();context.setLineDash([]);if(neighbor.points.length===1){context.fillStyle=context.strokeStyle;context.beginPath();context.arc(x(neighbor.points[0]),y(neighbor.points[0].value),2,0,Math.PI*2);context.fill();}}
  context.save();context.shadowColor=color('--accent');context.shadowBlur=8;context.strokeStyle=color('--accent');context.lineWidth=3.5;context.beginPath();chartSeries.forEach((p,i)=>i?context.lineTo(x(p),y(p.value)):context.moveTo(x(p),y(p.value)));context.stroke();context.restore();
  context.fillStyle=color('--accent');for(const point of chartSeries){context.beginPath();context.arc(x(point),y(point.value),3,0,Math.PI*2);context.fill();}
  context.fillStyle=color('--muted');context.textAlign='left';context.fillText(short(chartSeries[0].date),54,height-9);context.textAlign='right';context.fillText(short(chartSeries.at(-1).date),width-14,height-9);
}
function topList(host,title,records,formatter){
  const area=section(host,title);area.classList.add('overview-top-list');
  table(area,['순위','닉네임','기록'],records.slice(0,5).map(record=>[(record.joint?'공동 ':'')+record.rank+'위',record.name,formatter(record.value)]));
  const own=records.find(record=>record.name===window.GuildAuth?.user?.nickname);
  if(own&&!records.slice(0,5).includes(own)){const mine=el('p',undefined,'overview-my-rank');mine.append(el('span','내 순위'),el('strong',(own.joint?'공동 ':'')+own.rank+'위'),el('span',own.name),el('strong',formatter(own.value)));area.append(mine);}
  if(records.length>5){const details=el('details',undefined,'overview-absences');details.append(el('summary','전체 순위 보기 · '+records.length+'명'));table(details,['순위','닉네임','기록'],records.map(record=>[(record.joint?'공동 ':'')+record.rank+'위',record.name,formatter(record.value)]));area.append(details);}
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
  const activityRows=el('div',undefined,'weekly-activity-list');activities.append(activityRows);
  for(const event of summary.activities){const item=el('div',undefined,'weekly-activity-row'),identity=el('div'),value=el('div',undefined,'weekly-activity-value'),progress=el('progress'),percent=event.attended/event.eligible.length*100;
    identity.append(el('strong',event.header),el('small',short(event.date)));value.append(el('strong',event.attended+' / '+event.eligible.length+'명'),el('span',decimal.format(percent)+'%'));progress.max=100;progress.value=percent;progress.setAttribute('aria-label',event.header+' 참여율 '+decimal.format(percent)+'%');item.append(identity,value,progress);activityRows.append(item);
  }
  if(!summary.activities.length)note(activities,'기록이 없습니다.');
  for(const event of summary.activities){const absent=event.eligible.filter(row=>row.status==='no');if(!absent.length)continue;const details=el('details',undefined,'overview-absences');details.append(el('summary',event.header+' 미참여 '+absent.length+'명'),el('p',absent.map(row=>row.name).join(' · ')));activities.append(details);}
  const columns=el('div',undefined,'overview-columns');weekly.append(columns);
  const weeklyGrowth=topList(columns,'이번 주 성장량 상위',growth,signed);
  const weeklyRate=topList(columns,'이번 주 성장률 상위',summary.growthRates,value=>(value>0?'+':'')+decimal.format(value)+'%');
  if(summary.previous&&summary.last){const caption=el('p',short(summary.previous.date)+' → '+short(summary.last.date)+' · 주 시작 전 마지막 기록 대비','overview-note overview-period');weeklyGrowth.querySelector('h2').after(caption);}
  if(summary.previous&&summary.last){const caption=el('p',short(summary.previous.date)+' → '+short(summary.last.date)+' · 주 시작 전 마지막 기록 대비','overview-note overview-period');weeklyRate.querySelector('h2').after(caption);}
  const contribution=topList(columns,'공헌도 상위',summary.contributionRanks,format);
  if(summary.contribution){const caption=el('p',short(summary.contribution.date)+(/중간/.test(summary.contribution.header)?' · 중간 기록':''),'overview-note overview-period');contribution.querySelector('h2').after(caption);}
  const participation=section(columns,'참여율 하위순');
  note(participation,short(summary.start)+' ~ '+short(summary.until)+' · 목표 Lv.'+(summary.goal.level||'—')+' · 성장도 '+format(summary.goal.growth));
  const participationHeaders=['닉네임','참여율','목표 달성'],participationRecords=summary.participationRows.map(record=>[record.name,decimal.format(record.value)+'%',record.goalAchieved===null?'—':record.goalAchieved?'O':'X']);
  table(participation,participationHeaders,participationRecords.slice(0,5));
  if(participationRecords.length>5){const details=el('details',undefined,'overview-absences');details.append(el('summary','전체 참여율 보기 · '+participationRecords.length+'명'));table(details,participationHeaders,participationRecords);participation.append(details);}
  const scheduled=section(weekly,'일정 · 분배');
  for(const event of summary.upcoming){const item=el('p',undefined,'overview-schedule');item.append(badge(short(event.date),'date'),el('strong',event.header));scheduled.append(item);}
  for(const group of summary.distributions){const item=el('p',undefined,'overview-schedule');item.append(el('strong',group.title),el('span',group.records.length?group.records.length+'건 기록':group.schedule||'분배 예정'));scheduled.append(item);}
  if(!summary.upcoming.length&&!summary.distributions.length)note(scheduled,'등록된 일정·분배가 없습니다.');scheduled.append(link('분배 기록','#distribution'));
  mountWeeklyNews(section(weekly,'이번 주 올라온 글 (디시, 공홈, 팁게)'),{start:summary.start,end:summary.end});
}
function accept(data){
  if(source===data)return;source=data;report=overview(source,today);
  viewerPicker.refresh();
  const previous=week.value;week.replaceChildren(...weeks(source,today).map(start=>new Option(short(start)+' ~ '+short(shiftDay(start,6)),start)));
  if([...week.options].some(option=>option.value===previous))week.value=previous;
  renderProfile();renderWeekly();syncWeekButtons();icons();
}
function syncWeekButtons(){document.getElementById('overview-week-previous').disabled=week.selectedIndex>=week.options.length-1;document.getElementById('overview-week-next').disabled=week.selectedIndex<=0;}
for(const [id,offset]of [['overview-week-previous',1],['overview-week-next',-1]])document.getElementById(id).addEventListener('click',()=>{const index=week.selectedIndex+offset;if(index<0||index>=week.options.length)return;week.selectedIndex=index;week.dispatchEvent(new Event('change'));});
week.addEventListener('change',()=>{renderWeekly();syncWeekButtons();icons();});
window.addEventListener('guild-members-data',event=>accept(event.detail));
window.addEventListener('guild-auth-change',()=>{viewingName='';viewerPicker.sync();renderProfile();if(location.hash==='#weekly')renderWeekly();icons();});
window.addEventListener('hashchange',()=>{viewerPicker.hide();if(location.hash==='#weekly')renderWeekly();if(location.hash==='#profile')requestAnimationFrame(drawChart);});
window.addEventListener('guild-theme-change',()=>requestAnimationFrame(drawChart));
new ResizeObserver(()=>requestAnimationFrame(drawChart)).observe(profile);
document.addEventListener('visibilitychange',()=>{const day=koreaDay();if(!document.hidden&&day!==today){today=day;if(source){const data=source;source=null;accept(data);}}});
document.addEventListener('click',event=>document.querySelectorAll('.overview-information[open]').forEach(details=>{if(!details.contains(event.target))details.open=false;}));
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.overview-information[open]').forEach(details=>{details.open=false;details.querySelector('summary').focus();});});
if(typeof memberData!=='undefined'&&memberData)accept(memberData);
