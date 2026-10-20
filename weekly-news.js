import {officialBody} from './official-news-body.js?v=20261019-181';
const api='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/';
const gallery='https://gall.dcinside.com/mgallery/board/lists/?id=zeusthegodofpride&exception_mode=recommend';
const sources=[['notices','길드 공지',api+'notices'],['tips','팁 공유',api+'tips'],['official','공식 소식','official-news.json'],['community','개념글','community-news.json']];
let cached=null,pending=null,cachedAt=0;
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
export function newsItems(kind,data){
  const items=kind==='notices'?data.notices:kind==='tips'?data.tips:data.items;
  if(!Array.isArray(items))throw new Error('Invalid feed');
  return items.flatMap(post=>{
    if(!post||typeof post.title!=='string'||!post.title.trim())return [];
    const raw=post.publishedAt??post.created_at,time=typeof raw==='number'?raw:Date.parse(raw);
    if(!Number.isFinite(time)||time>Date.now())return [];
    let href;
    if(kind==='notices'||kind==='tips'){if(typeof post.id!=='string')return [];href='#'+kind+'/'+encodeURIComponent(post.id);}
    else{
      try{const url=new URL(post.url);if(url.protocol!=='https:')return [];
        if(kind==='official'&&(url.origin!=='https://zeus.com2us.com'||!/^\/p\/[a-f\d-]{36}$/i.test(url.pathname)))return [];
        if(kind==='community'&&(url.origin!=='https://gall.dcinside.com'||url.pathname!=='/mgallery/board/view/'||url.searchParams.get('id')!=='zeusthegodofpride'||!/^\d+$/.test(url.searchParams.get('no')||'')))return [];
        href=url.href;
      }catch{return [];}
    }
    return [{id:kind+':'+post.id,kind,title:post.title,time,href,post,date:new Date(time+9*3600000).toISOString().slice(0,10)}];
  });
}
async function load(){
  if(cached&&Date.now()-cachedAt<300000)return cached;
  if(pending)return pending;
  pending=Promise.all(sources.map(async([kind,label,url])=>{
    try{const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error();const data=await response.json();return {kind,label,items:newsItems(kind,data),collectedAt:data.collectedAt,coverageStart:data.coverageStart};}
    catch{return {kind,label,items:[],error:true};}
  })).then(result=>{cached=result;cachedAt=Date.now();return result;}).finally(()=>pending=null);
  return pending;
}
export function mountWeeklyNews(host,{start,end}){
  const tools=node('div',undefined,'weekly-news-tools'),status=node('p','소식을 불러오는 중입니다.','overview-note'),refresh=node('button',undefined,'icon-button'),icon=node('i');
  refresh.type='button';refresh.title='주간 글 새로고침';refresh.setAttribute('aria-label',refresh.title);icon.dataset.lucide='refresh-cw';refresh.append(icon);tools.append(status,refresh);host.append(tools);
  let records=[],feeds=[];status.role='status';
  const groups=[['guild','우리홈피글',['notices','tips']],['community','디시글',['community']],['official','공홈글',['official']]].map(([key,title,kinds])=>{
    const section=node('section',undefined,'weekly-news-group'),heading=node('div',undefined,'weekly-news-group-heading'),counter=node('span'),list=node('ul',undefined,'weekly-news-list'),more=node('button','더 보기','secondary-button'),message=node('p',undefined,'overview-note');
    section.dataset.newsGroup=key;heading.append(node('h3',title),counter);section.append(heading,message,list,more);host.append(section);counter.setAttribute('aria-live','polite');more.type='button';more.hidden=true;more.setAttribute('aria-label',title+' 더 보기');
    const group={key,kinds,counter,list,more,message,visible:7};more.addEventListener('click',()=>{group.visible+=7;render();});
    if(key==='community'){const original=node('a','갤러리 개념글 원문','overview-link');original.href=gallery;original.target='_blank';original.rel='noopener noreferrer';section.append(original);}
    return group;
  });
  const freshness=node('p',undefined,'overview-note');host.append(freshness);
  function render(){
    const opened=new Set([...host.querySelectorAll('.weekly-news-entry[open]')].map(entry=>entry.dataset.newsId));
    for(const group of groups){
      const {list,counter,more,message}=group,selected=records.filter(record=>group.kinds.includes(record.kind));list.replaceChildren();counter.textContent=selected.length+'건';
      for(const record of selected.slice(0,group.visible)){
      const item=node('li'),details=node('details',undefined,'weekly-news-entry'),summary=node('summary'),tag=node('span',sources.find(([kind])=>kind===record.kind)[1],'weekly-news-tag'),title=node('span',record.title,'weekly-news-title'),time=node('time',Number(record.date.slice(5,7))+'/'+Number(record.date.slice(8,10)));
      details.dataset.newsId=record.id;
      const chevron=node('i',undefined,'weekly-news-chevron');chevron.dataset.lucide='chevron-down';
      time.dateTime=new Date(record.time).toISOString();summary.append(tag,title,time,chevron);details.append(summary);item.append(details);list.append(item);
      let rendered=false;
      details.addEventListener('toggle',()=>{
        if(!details.open||rendered)return;rendered=true;
        const body=node('div',undefined,'entry-body official-news-content weekly-news-body'),post=record.post;
        if(record.kind==='community'){
          if(typeof post.contentText==='string'&&post.contentText.trim())body.append(node('p',post.contentText,'weekly-news-text'));
          else body.append(node('p',post.contentStatus==='no-text'?'텍스트 본문이 없는 글입니다. 디시글 이미지는 표시하지 않습니다.':'본문을 불러오지 못했습니다. 원문에서 확인해주세요.','overview-note'));
        }
        else if(record.kind==='official'&&typeof post.content==='string')body.append(officialBody(post.content));
        else if(record.kind==='notices'||record.kind==='tips'){
          const imageUrl=image=>api+record.kind+'/'+encodeURIComponent(post.id)+'/images/'+encodeURIComponent(image.id);
          const rich=window.GuildRich?.render(body,post.content||'',post.images||[],imageUrl);
          if(!rich){body.append(node('p',typeof post.content==='string'?post.content:'','weekly-news-text'));for(const image of post.images||[]){const photo=node('img');photo.src=imageUrl(image);photo.alt='첨부 이미지';photo.loading='lazy';body.append(photo);}}
        }
        if(!body.textContent.trim()&&!body.querySelector('img'))body.append(node('p',record.kind==='community'?'디시 개념글 본문은 원문에서 확인할 수 있습니다.':'본문을 표시할 수 없습니다. 원문에서 확인해주세요.','overview-note'));
        const anchor=node('a','원문 보기','overview-link');anchor.href=record.href;if(record.href.startsWith('https:')){anchor.target='_blank';anchor.rel='noopener noreferrer';}body.append(anchor);details.append(body);
      });
      if(opened.has(record.id))details.open=true;
      }
      const unavailable=feeds.filter(feed=>group.kinds.includes(feed.kind)&&feed.error).map(feed=>feed.label),community=feeds.find(feed=>feed.kind==='community');
      message.textContent=(selected.length?'':'해당 기간에 수집된 글이 없습니다.')+(unavailable.length?' '+unavailable.join(' · ')+'을 불러오지 못했습니다.':'')+(group.key==='community'&&community?.coverageStart&&start<community.coverageStart?' 개념글 수집 범위: '+community.coverageStart+'부터.':'');
      message.hidden=!message.textContent;more.hidden=selected.length<=group.visible;
    }
    status.textContent='';
    window.lucide?.createIcons({attrs:{'aria-hidden':'true','stroke-width':1.7}});
    const dateFormat=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
    freshness.textContent=feeds.filter(feed=>Number.isFinite(Date.parse(feed.collectedAt))).map(feed=>feed.label+' '+dateFormat.format(new Date(feed.collectedAt))+' 수집').join(' · ');
  }
  if(location.hash.split('/')[0]!=='#weekly'){status.textContent='';return;}
  function fetchNews(){refresh.disabled=true;status.textContent='소식을 불러오는 중입니다.';load().then(result=>{if(!host.isConnected)return;feeds=result;const seen=new Set();records=feeds.flatMap(feed=>feed.items).filter(record=>record.date>=start&&record.date<=end&&!seen.has(record.id)&&seen.add(record.id)).sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));render();}).finally(()=>refresh.disabled=false);}
  refresh.addEventListener('click',()=>{cachedAt=0;fetchNews();});fetchNews();
}
