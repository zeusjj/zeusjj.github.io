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
    return [{id:kind+':'+post.id,kind,title:post.title,time,href,date:new Date(time+9*3600000).toISOString().slice(0,10)}];
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
  const tools=node('div',undefined,'weekly-news-tools'),label=node('label','분류'),select=node('select'),counter=node('span'),status=node('p','소식을 불러오는 중입니다.','overview-note'),list=node('ul',undefined,'weekly-news-list'),more=node('button','더 보기','secondary-button'),refresh=node('button',undefined,'icon-button'),icon=node('i');
  refresh.type='button';refresh.title='주간 글 새로고침';refresh.setAttribute('aria-label',refresh.title);icon.dataset.lucide='refresh-cw';refresh.append(icon);
  label.append(select);tools.append(label,counter,refresh);host.append(tools,status,list,more);more.type='button';more.hidden=true;let visible=12,records=[],feeds=[];
  for(const [kind,text] of [['all','전체'],...sources.map(([kind,label])=>[kind,label])])select.add(new Option(text,kind));
  select.setAttribute('aria-label','주간 글 분류');counter.setAttribute('aria-live','polite');status.role='status';
  const original=node('a','갤러리 개념글 원문','overview-link');original.href=gallery;original.target='_blank';original.rel='noopener noreferrer';host.append(original);
  const freshness=node('p',undefined,'overview-note');host.append(freshness);
  function render(){
    const selected=records.filter(record=>select.value==='all'||record.kind===select.value);list.replaceChildren();counter.textContent=selected.length+'건';
    for(const record of selected.slice(0,visible)){
      const item=node('li'),anchor=node('a'),tag=node('span',sources.find(([kind])=>kind===record.kind)[1],'weekly-news-tag'),title=node('span',record.title,'weekly-news-title'),time=node('time',Number(record.date.slice(5,7))+'/'+Number(record.date.slice(8,10)));
      anchor.href=record.href;if(record.href.startsWith('https:')){anchor.target='_blank';anchor.rel='noopener noreferrer';}time.dateTime=new Date(record.time).toISOString();anchor.append(tag,title,time);item.append(anchor);list.append(item);
    }
    const unavailable=feeds.filter(feed=>feed.error).map(feed=>feed.label);
    const community=feeds.find(feed=>feed.kind==='community');
    status.textContent=(selected.length?'':'해당 기간에 수집된 글이 없습니다.')+(unavailable.length?' '+unavailable.join(' · ')+'을 불러오지 못했습니다.':'')+(community?.coverageStart&&start<community.coverageStart?' 개념글 수집 범위: '+community.coverageStart+'부터.':'');
    more.hidden=selected.length<=visible;
    const dateFormat=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
    freshness.textContent=feeds.filter(feed=>Number.isFinite(Date.parse(feed.collectedAt))).map(feed=>feed.label+' '+dateFormat.format(new Date(feed.collectedAt))+' 수집').join(' · ');
  }
  select.addEventListener('change',()=>{visible=12;render();});more.addEventListener('click',()=>{visible+=12;render();});
  if(location.hash.split('/')[0]!=='#weekly'){status.textContent='';return;}
  function fetchNews(){refresh.disabled=true;status.textContent='소식을 불러오는 중입니다.';load().then(result=>{if(!host.isConnected)return;feeds=result;const seen=new Set();records=feeds.flatMap(feed=>feed.items).filter(record=>record.date>=start&&record.date<=end&&!seen.has(record.id)&&seen.add(record.id)).sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));render();}).finally(()=>refresh.disabled=false);}
  refresh.addEventListener('click',()=>{cachedAt=0;fetchNews();});fetchNews();
}
