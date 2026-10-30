import {growthHistory,levelHistory} from './member-growth-history.js?v=20261030-participation';
import {weeklyOverview,weekStart,koreaDay} from './guild-overview-model.js?v=20261030-defense';

export function growthAchievementSummary(data,today=koreaDay()){
 const weekly=weeklyOverview(data,weekStart(today),today),nameIndex=data.headers.indexOf('닉네임');
 const levelUps=data.members.flatMap(row=>{
  const history=levelHistory({...data,members:[row]}).filter(point=>point.date<=today),current=history.findLast(point=>point.date===today),previous=history.findLast(point=>point.date<today);
  return current&&previous&&current.value>previous.value?[{name:row[nameIndex],date:today,previousDate:previous.date,previousLevel:previous.value,level:current.value}]:[];
 }).sort((a,b)=>(b.level-b.previousLevel)-(a.level-a.previousLevel)||b.level-a.level||a.name.localeCompare(b.name,'ko'));
 return {weeklyGrowth:weekly.growth.filter(row=>row.rank<=7),weeklyRates:weekly.growthRates.filter(row=>row.rank<=7),levelUps,today,from:weekly.previous?.date??null,to:weekly.last?.date??null};
}

export function recentGrowthAchievements(data,today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())){
 const cutoff=new Date(Date.parse(today+'T00:00:00Z')-86400000).toISOString().slice(0,10),milestoneCutoff=new Date(Date.parse(today+'T00:00:00Z')-6*86400000).toISOString().slice(0,10),rankings=[],milestones=new Map(),nameIndex=data.headers.indexOf('닉네임');
 for(const row of data.members){
  const name=row[nameIndex],history=growthHistory({...data,members:[row]}).filter(point=>point.date<=today),increments=history.flatMap((point,index)=>index&&point.date>=cutoff?[{date:point.date,previousDate:history[index-1].date,value:point.value-history[index-1].value}]:[]);
  const increase=increments.reduce((sum,point)=>sum+point.value,0);if(increase>=1000)rankings.push({name,increase,from:increments[0].date,to:increments.at(-1).date});
  let highest=null;
  for(const point of history){
   if(highest!==null&&point.date>=milestoneCutoff){for(let threshold=Math.max(40000,(Math.floor(highest/10000)+1)*10000);threshold<=point.value;threshold+=10000){if(!milestones.has(threshold))milestones.set(threshold,[]);milestones.get(threshold).push({name,date:point.date,value:point.value});}}
   highest=Math.max(highest??point.value,point.value);
  }
 }
 rankings.sort((a,b)=>b.increase-a.increase||a.name.localeCompare(b.name,'ko'));
 return {rankings,milestones:[...milestones].sort(([a],[b])=>a-b).map(([threshold,members])=>({threshold,members:members.sort((a,b)=>b.date.localeCompare(a.date)||a.name.localeCompare(b.name,'ko'))}))};
}

if(typeof document!=='undefined'){
 const host=document.createElement('div');host.id='member-growth-achievements';host.className='member-growth-achievements';host.hidden=true;document.querySelector('.member-growth-history').before(host);
 const number=new Intl.NumberFormat('ko-KR'),decimal=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});let source;
 function render(){
  if(!source)return;const result=recentGrowthAchievements(source),summary=growthAchievementSummary(source);host.replaceChildren();
  function card(title,icon,records,{kind='milestone',period='최근 7일',empty='',range=''}={}){
   const ranked=kind==='increase'||kind==='rate';
   const article=document.createElement('section'),heading=document.createElement('h3'),symbol=document.createElement('i'),caption=document.createElement('span'),list=document.createElement('ol');article.className='member-achievement'+(ranked?' member-achievement-ranked':'');symbol.dataset.lucide=icon;caption.textContent=title;heading.append(symbol,caption);article.append(heading,list);
   if(period){const caption=document.createElement('span');caption.className='member-achievement-period';caption.textContent=period;heading.append(caption);}
   for(const [index,record] of records.entries()){
    const item=document.createElement('li'),name=document.createElement('span'),value=document.createElement('span');name.className='member-achievement-name';name.textContent=record.name;value.className='member-achievement-value';
    const amount=record.increase??record.value;
    value.textContent=kind==='level'?'Lv.'+record.previousLevel+' → '+record.level:ranked?(amount>0?'+':'')+(kind==='rate'?decimal.format(amount)+'%':number.format(amount)):record.date.slice(5).replace('-','/');
    if(ranked){const rank=document.createElement('span');rank.className='member-achievement-rank';rank.textContent=record.rank??index+1;item.append(rank);item.title=(record.joint?'공동 '+record.rank+'위 · ':'')+(range||(record.from+' ~ '+record.to));}
    else item.title=kind==='level'?record.previousDate+' → '+record.date:number.format(record.value);
    item.append(name,value);list.append(item);
   }
   if(!records.length&&empty){const note=document.createElement('p');note.className='member-achievement-empty';note.textContent=empty;article.append(note);}
   host.append(article);
  }
  const range=summary.from&&summary.to?summary.from+' → '+summary.to+' · 주 시작 전 마지막 기록 대비':'주간 비교 기록 없음';
  card('이번 주 성장률 상위','percent',summary.weeklyRates,{kind:'rate',period:'7위까지',range,empty:'이번 주 비교 기록이 없습니다.'});
  card('이번 주 성장도 상위','trending-up',summary.weeklyGrowth,{kind:'increase',period:'7위까지',range,empty:'이번 주 비교 기록이 없습니다.'});
  card('오늘 레벨업','chevrons-up',summary.levelUps,{kind:'level',period:summary.today.slice(5).replace('-','/'),empty:source.levels?.[summary.today]?'오늘 확인된 레벨업이 없습니다.':'오늘 레벨 기록이 없습니다.'});
  if(result.rankings.length)card('최근 2일 급상승','trending-up',result.rankings,{kind:'increase',period:''});
  for(const milestone of result.milestones)card(milestone.threshold/10000+'만 돌파','trophy',milestone.members);
  host.hidden=!host.children.length;globalThis.lucide?.createIcons();
 }
 window.addEventListener('guild-members-data',event=>{source=event.detail;render();});
 if(typeof memberData!=='undefined'&&memberData){source=memberData;render();}
 setInterval(render,60000);
}
