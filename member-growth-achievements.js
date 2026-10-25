import {growthHistory} from './member-growth-history.js?v=20261025-departed-label';

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
 const number=new Intl.NumberFormat('ko-KR');let source;
 function render(){
  if(!source)return;const result=recentGrowthAchievements(source);host.replaceChildren();
  function card(title,icon,records,ranked){
   const article=document.createElement('section'),heading=document.createElement('h3'),symbol=document.createElement('i'),caption=document.createElement('span'),list=document.createElement('ol');article.className='member-achievement'+(ranked?' member-achievement-ranked':'');symbol.dataset.lucide=icon;caption.textContent=title;heading.append(symbol,caption);article.append(heading,list);
   if(!ranked){const period=document.createElement('span');period.className='member-achievement-period';period.textContent='최근 7일';heading.append(period);}
   for(const [index,record] of records.entries()){const item=document.createElement('li'),name=document.createElement('span'),value=document.createElement('span');name.className='member-achievement-name';name.textContent=record.name;value.className='member-achievement-value';value.textContent=ranked?'+'+number.format(record.increase):record.date.slice(5).replace('-','/');if(ranked){const rank=document.createElement('span');rank.className='member-achievement-rank';rank.textContent=index+1;item.append(rank);item.title=record.from+' ~ '+record.to;}else item.title=number.format(record.value);item.append(name,value);list.append(item);}host.append(article);
  }
  if(result.rankings.length)card('최근 2일 급상승','trending-up',result.rankings,true);
  for(const milestone of result.milestones)card(milestone.threshold/10000+'만 돌파','trophy',milestone.members,false);
  host.hidden=!host.children.length;globalThis.lucide?.createIcons();
 }
 window.addEventListener('guild-members-data',event=>{source=event.detail;render();});
 if(typeof memberData!=='undefined'&&memberData){source=memberData;render();}
 setInterval(render,60000);
}
