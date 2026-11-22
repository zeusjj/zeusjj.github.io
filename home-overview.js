import {shiftDay,isGuildActivity} from './guild-overview-model.js?v=20261115-siege';
import {mountRecentNews} from './weekly-news.js?v=20261122-home-news';

const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
const link=(text,href,className)=>{const el=node('a',text,className);el.href=href;return el;};
const short=day=>day.slice(5).split('-').map(Number).join('/');
export function homeSchedule(data,start,today){
  const end=shiftDay(start,6),rules=window.GuildSectionEditor?.rules(data.rules)??data.rules;
  const timing=rules.match(/\[시간\]([\s\S]*?)(?=\n\[|$)/)?.[1]??'';
  const sundayTime=timing.match(/일요일\s*(\d{1,2}:\d{2})/)?.[1]??null;
  const events=data.headers.flatMap((header,index)=>{
    const period=data.dates?.[index];
    if(!period?.start||period.start<start||period.start>end||!isGuildActivity(header))return [];
    const recorded=data.members.some(row=>['O','X','ㅇ'].includes(String(row[index]).toUpperCase())||typeof row[index]==='number');
    const date=period.start;
    return [{date,end:/성물 방어전/.test(header)&&date>=today?null:period.end,header,time:new Date(date+'T00:00:00Z').getUTCDay()===0?sundayTime:null,status:recorded?(date>today?'중간 기록':'기록 반영'):date>=today?'예정':'미기록',recorded}];
  });
  // Recurring events come from the saved weekday notice, never from a sample mockup.
  for(const [weekday,label]of [[1,'월요일'],[4,'목요일']]){
    const date=shiftDay(start,weekday),block=timing.match(new RegExp(label+'\\s*\\n([\\s\\S]*?)(?=\\n[월화수목금토일]요일|$)'))?.[1];
    if(!block)continue;
    const time=block.match(/\b(\d{1,2}:\d{2})\b/)?.[1]??null;
    for(const title of ['침공','성물 방어전','항아리 모임'])if(block.includes(title)&&!events.some(event=>event.date===date&&event.header.includes(title)))events.push({date,header:title,time:title==='침공'?'21:00':time,status:date>=today?'예정':'기록 없음',recorded:false});
  }
  const order=header=>['침공','점령전','레이드','제전','성물 방어전','항아리 모임','주간공헌도'].findIndex(keyword=>header.includes(keyword));
  return events.sort((a,b)=>a.date.localeCompare(b.date)||order(a.header)-order(b.header));
}
export function renderHome(host,{source,report,start,today}){
  const schedule=node('section',undefined,'home-section home-schedule');schedule.append(node('h2','이번 주 일정'));
  const list=node('div',undefined,'home-event-list');schedule.append(list);
  const events=[];
  for(const item of homeSchedule(source,start,today)){
    const previous=events.at(-1);
    if(previous?.date===item.date){previous.header+=' → '+item.header;if(previous.status!==item.status)previous.status='일부 기록';previous.recorded=previous.recorded&&item.recorded;previous.time??=item.time;}
    else events.push({...item});
  }
  for(const event of events){
    const row=node('div',undefined,'home-event'),day=node('time',short(event.date)),title=node('strong',event.header),time=node('span',event.time??'시간 미등록','home-event-time'),status=node('span',event.status,'home-event-status');
    day.dateTime=event.date;day.append(node('small',['일','월','화','수','목','금','토'][new Date(event.date+'T00:00:00Z').getUTCDay()]));
    if(event.end)title.append(node('small',short(event.date)+' ~ '+short(event.end)));
    status.dataset.recorded=String(event.recorded);row.append(day,title,time,status);list.append(row);
  }
  if(!events.length)list.append(node('p','등록된 일정이 없습니다.','empty'));
  host.append(schedule);
  const split=node('div',undefined,'home-columns'),news=node('section',undefined,'home-section home-news'),personal=node('section',undefined,'home-section home-personal');
  news.append(node('h2','최근 소식'));mountRecentNews(news);personal.append(node('h2','내 활동'));
  const user=window.GuildAuth?.user,valid=user&&window.GuildAuth.expiresAt>Date.now();
  if(valid){
    const record=report.weighted.rows.find(row=>row.name===user.nickname);
    personal.append(node('strong',user.nickname,'home-person-name'));
    const own=source.members.find(row=>row[report.nameIndex]===user.nickname);
    if(own){const score=record?.score;personal.append(node('p','최근 4주 참여율','home-person-label'),node('strong',typeof score==='number'?new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(score)+'%':'산정 확인 필요','home-person-score'));}
    else personal.append(node('p','현재 연결된 길드 기록이 없습니다.'));
    personal.append(link('내 정보','#profile','home-command'));
  }else{const mark=node('i');mark.dataset.lucide='lock-keyhole';personal.append(mark,node('p','로그인 후 내 기록을 확인하세요.'),link('로그인','#login','home-command'));}
  split.append(news,personal);host.append(split);
  const tools=node('section',undefined,'home-section home-tools');tools.append(node('h2','자주 사용하는 도구'));
  const toolsList=node('div',undefined,'home-tool-list');
  for(const [label,route,icon]of [['서사시 연습','epic','music-2'],['점성술 계산기','astrology','star'],['스킬 강화 기대값','skill','swords'],['확률표','probabilities','chart-no-axes-column']]){const item=link(label,'#tools/'+route),mark=node('i');mark.dataset.lucide=icon;item.prepend(mark);toolsList.append(item);}
  tools.append(toolsList);host.append(tools);
}
