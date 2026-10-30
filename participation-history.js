import {events,participationPeriods,weightedParticipation,koreaDay,isRelicDefense} from './guild-overview-model.js?v=20261030-defense';
const known=value=>['O','ㅇ','X'].includes(String(value??'').trim().toUpperCase());

export function personalParticipationHistory(data,whole=data,through=koreaDay()){
 const activities=events(whole,through),dates=[...new Set(activities.map(event=>event.date))].sort();
 return dates.flatMap(date=>{
  const held=activities.filter(event=>event.date<=date),members=data.members.filter(row=>held.some(event=>known(row[event.index])));
  if(!members.length)return [];
  const report=weightedParticipation({...data,members},date,held),rows=report.rows.filter(row=>Number.isFinite(row.score));
  return rows.length?[{date,value:rows.reduce((sum,row)=>sum+row.score,0)/rows.length,count:rows.length,incomplete:rows.some(row=>row.incomplete)}]:[];
 });
}

export function guildParticipationHistory(data,{klass='',band=''}={},through=koreaDay()){
 const activities=(data.guildParticipation??[]).flatMap(event=>{
  const date=isRelicDefense(event.header)?event.end||event.start:event.start;
  if(date>through)return [];
  const index=data.headers.findIndex((header,index)=>header===event.header&&data.dates?.[index]?.start===event.start);
  if(index<0)return [];
  const groups=event.groups.filter(group=>(!klass||group.class===klass)&&(band===''||group.band===Number(band)));
  return [{...event,index,date,attended:groups.reduce((sum,g)=>sum+g.attended,0),eligible:groups.reduce((sum,g)=>sum+g.eligible,0)}];
 }).sort((a,b)=>b.date.localeCompare(a.date)||b.index-a.index);
 const dates=[...new Set(activities.map(event=>event.date))].sort();
 return dates.flatMap(date=>{
  const held=activities.filter(event=>event.date<=date),latest=held.filter(event=>event.date===date),count=Math.max(0,...latest.map(event=>event.eligible));
  if(!count)return [];
  const periods=participationPeriods(data,date,held);if(periods.some(period=>period.ambiguous))return [];
  let value=0,incomplete=false;
  for(const period of periods){if(!period.events.length)incomplete=true;for(const event of period.events){const counts=held.find(item=>item.index===event.index);if(!counts?.eligible||event.pending){incomplete=true;continue;}value+=event.weight*counts.attended/counts.eligible;}}
  return [{date,value,count,incomplete,attended:latest.reduce((sum,event)=>sum+event.attended,0),eligible:latest.reduce((sum,event)=>sum+event.eligible,0)}];
 });
}
