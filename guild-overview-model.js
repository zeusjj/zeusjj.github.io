const dayMs=86400000;
export const koreaDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const shiftDay=(day,offset)=>new Date(Date.parse(day+'T00:00:00Z')+offset*dayMs).toISOString().slice(0,10);
export function weekStart(day){const date=new Date(day+'T00:00:00Z');return shiftDay(day,-date.getUTCDay());}
const numeric=value=>typeof value==='number'&&Number.isFinite(value);
const status=value=>{const text=String(value??'').toUpperCase();return ['O','ㅇ'].includes(text)?'yes':text==='X'?'no':null;};
export function columns(data,match,through=koreaDay()){
  return data.headers.flatMap((header,index)=>{const date=data.dates?.[index]?.start;return match(header)&&/^\d{4}-\d{2}-\d{2}$/.test(date||'')&&date<=through&&data.members.some(row=>numeric(row[index]))?[{header,index,date,end:data.dates[index].end}]:[];}).sort((a,b)=>a.date.localeCompare(b.date)||a.index-b.index);
}
export function ranked(entries){
  const sorted=entries.filter(entry=>numeric(entry.value)).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,'ko'));
  let rank=0;
  return sorted.map((entry,index)=>{if(index===0||Math.abs(sorted[index-1].value-entry.value)>1e-9)rank=index+1;const joint=(index>0&&Math.abs(sorted[index-1].value-entry.value)<=1e-9)||(index+1<sorted.length&&Math.abs(sorted[index+1].value-entry.value)<=1e-9);return {...entry,rank,joint,total:sorted.length};});
}
export function events(data,through=koreaDay()){
  return data.headers.flatMap((header,index)=>{
    const date=data.dates?.[index]?.start;
    if(!/레이드|제전$|점령전/.test(header)||/기여/.test(header)||!date||date>through)return [];
    const eligible=data.members.flatMap(row=>{const value=status(row[index]);return value?[{name:row[data.headers.indexOf('닉네임')],status:value}]:[];});
    return eligible.length?[{header,index,date,eligible,attended:eligible.filter(row=>row.status==='yes').length}]:[];
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.index-a.index);
}
export function growthSeries(data,row,through=koreaDay()){
  return columns(data,h=>h==='성장도 기록',through).filter(c=>numeric(row[c.index])).map(c=>({date:c.date,value:row[c.index]}));
}
export function weightedParticipation(data,through=koreaDay()){
  const activities=events(data,through),nameIndex=data.headers.indexOf('닉네임');
  if(!activities.length)return {lastDate:null,periods:[],rows:[]};
  const anchor=weekStart(activities[0].date);
  const periods=Array.from({length:4},(_,i)=>{
    const start=shiftDay(anchor,(i-3)*7),end=shiftDay(start,6),held=activities.filter(event=>event.date>=start&&event.date<=end);
    return {start,end,events:held,ambiguous:new Set(held.map(event=>event.date)).size>1};
  });
  const rows=data.members.map(row=>{
    const breakdown=periods.map(period=>{
      const values=period.events.map(event=>status(row[event.index])),attended=values.filter(value=>value==='yes').length,missing=values.filter(value=>value===null).length;
      return {...period,attended,missing,total:values.length,points:period.ambiguous?null:values.length?25*attended/values.length:0};
    });
    const needsReview=breakdown.some(period=>period.ambiguous);
    return {name:row[nameIndex],score:needsReview?null:breakdown.reduce((sum,period)=>sum+period.points,0),breakdown,incomplete:breakdown.some(period=>period.missing||!period.total),needsReview};
  });
  return {lastDate:activities[0].date,periods,rows};
}
export const growthTopPercent=record=>record&&record.total>0?record.rank/record.total*100:null;
export function target(data){
  const block=data.rules?.match(/\[성장 목표\]([\s\S]*?)(?:\n\[|$)/)?.[1]||'';
  return {growth:Number(block.match(/성장도\s*([\d,]+)/)?.[1]?.replaceAll(',',''))||null,level:Number(block.match(/Lv\.\s*(\d+)/)?.[1])||null,deadline:block.match(/\(~\s*([^)]*)\)/)?.[1]||''};
}
export function overview(data,through=koreaDay()){
  const nameIndex=data.headers.indexOf('닉네임'),classIndex=data.headers.indexOf('클래스');
  const latest=columns(data,h=>h==='성장도 기록',through).at(-1);
  const baseline=latest?columns(data,h=>h==='성장도 기록',shiftDay(latest.date,-7)).at(-1):null;
  const contribution=columns(data,h=>/공헌/.test(h),through).at(-1);
  const festival=columns(data,h=>/제전 기여$/.test(h),through).sort((a,b)=>Number(a.header.match(/^\d+/)?.[0])-Number(b.header.match(/^\d+/)?.[0])).at(-1);
  const metric=column=>column?ranked(data.members.filter(row=>numeric(row[column.index])).map(row=>({name:row[nameIndex],value:row[column.index]}))):[];
  const matched=latest&&baseline?data.members.filter(row=>numeric(row[latest.index])&&numeric(row[baseline.index])&&row[baseline.index]>0):[];
  const changes=matched.map(row=>({name:row[nameIndex],value:row[latest.index]-row[baseline.index],previous:row[baseline.index],current:row[latest.index]}));
  const activities=events(data,through);
  const weighted=weightedParticipation(data,through);
  const participation=ranked(data.members.flatMap(row=>{const eligible=activities.flatMap(event=>{const value=status(row[event.index]);return value?[value]:[];});const attended=eligible.filter(s=>s==='yes').length;return eligible.length?[{name:row[nameIndex],value:attended/eligible.length*100,attended,eligible:eligible.length}]:[];}));
  return {nameIndex,classIndex,latest,baseline,contribution,festival,activities,weighted,target:target(data),rankings:{growth:metric(latest),contribution:metric(contribution),festival:metric(festival),increase:ranked(changes),rate:ranked(changes.map(row=>({...row,value:row.value/row.previous*100}))),participation,weighted:ranked(weighted.rows.map(row=>({name:row.name,value:row.score})))}};
}
export function weeklyOverview(data,start,through=koreaDay()){
  const end=shiftDay(start,6),until=end<through?end:through,base=shiftDay(start,-1);
  const report=overview(data,until),nameIndex=report.nameIndex;
  const last=columns(data,h=>h==='성장도 기록',until).at(-1),previous=columns(data,h=>h==='성장도 기록',base).at(-1);
  const growth=last&&last.date>=start&&previous?ranked(data.members.filter(row=>numeric(row[last.index])&&numeric(row[previous.index])).map(row=>({name:row[nameIndex],value:row[last.index]-row[previous.index]}))):[];
  const contribution=columns(data,h=>/공헌/.test(h),until).filter(c=>c.date>=start).at(-1);
  const contributionRanks=contribution?ranked(data.members.filter(row=>numeric(row[contribution.index])).map(row=>({name:row[nameIndex],value:row[contribution.index]}))):[];
  const activities=report.activities.filter(event=>event.date>=start&&event.date<=until);
  const eligible=activities.reduce((n,event)=>n+event.eligible.length,0),attended=activities.reduce((n,event)=>n+event.attended,0);
  const goal=report.target,goalRows=last?data.members.filter(row=>numeric(row[last.index])&&Number.isInteger(data.levels?.[last.date]?.[row[nameIndex]])):[];
  const achieved=goalRows.filter(row=>(!goal.growth||row[last.index]>=goal.growth)&&(!goal.level||data.levels[last.date][row[nameIndex]]>=goal.level)).length;
  const allEvents=data.headers.flatMap((header,index)=>{const date=data.dates?.[index]?.start;return /레이드|제전$|점령전/.test(header)&&!/기여/.test(header)&&date>=start&&date<=end&&date>through?[{header,date}]:[];});
  const distributions=(data.distribution||[]).filter(group=>{const number=group.title.match(/(\d+)차/)?.[1],index=data.headers.indexOf(number+'차 레이드'),date=data.dates?.[index]?.start;return date>=start&&date<=end;});
  return {start,end,until,last,previous,growth,contribution,contributionRanks,activities,eligible,attended,goal,goalRows:goalRows.length,achieved,upcoming:allEvents,distributions,report};
}
export function weeks(data,through=koreaDay()){
  const dates=data.headers.flatMap((h,i)=>{const date=data.dates?.[i]?.start;return date&&date<=through&&data.members.some(row=>numeric(row[i])||status(row[i]))?[weekStart(date)]:[];});
  return [...new Set([weekStart(through),...dates])].sort().reverse();
}
