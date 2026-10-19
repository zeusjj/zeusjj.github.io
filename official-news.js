import {officialBody} from './official-news-body.js?v=20261019-181';
export function recentOfficialPosts(data,now=Date.now()){const seen=new Set();return (Array.isArray(data?.items)?data.items:[]).filter(post=>{if(!post||typeof post!=='object')return false;const time=Date.parse(post.publishedAt);if(!Number.isFinite(time)||time<now-14*86400000||time>now||typeof post.title!=='string'||typeof post.tag!=='string'||seen.has(post.id))return false;try{const url=new URL(post.url);if(url.origin!=='https://zeus.com2us.com'||!/^\/p\/[a-f\d-]{36}$/.test(url.pathname))return false;}catch{return false;}seen.add(post.id);return true;}).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||String(a.id).localeCompare(String(b.id)));}
if(typeof document!=='undefined'){
  const list=document.getElementById('official-news-list'),status=document.getElementById('official-news-status'),updated=document.getElementById('official-news-updated');
  let cached,loading=false;const entries=new Map();
  const format=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  const icons=()=>window.lucide?.createIcons({attrs:{'aria-hidden':'true','stroke-width':1.7}});
  function entry(post,open=false){
    const li=node('li'),details=node('details',undefined,'official-news-entry'),summary=node('summary',undefined,'official-news-row');
    const tag=node('span',post.tag,'official-news-tag'),title=node('span',post.title,'official-news-title'),time=node('time',format.format(new Date(post.publishedAt))),icon=node('i',undefined,'official-news-chevron');
    tag.dataset.tag=post.tag;title.title=post.title;time.dateTime=post.publishedAt;icon.dataset.lucide='chevron-down';
    summary.append(tag,title,time,icon);details.append(summary);li.append(details);
    let ready=false;
    function body(){
      if(ready)return;ready=true;
      const container=node('div',undefined,'official-news-body'),source=node('div',undefined,'official-news-source'),link=node('a','원문 보기'),external=node('i');
      link.href=post.url;link.target='_blank';link.rel='noopener noreferrer';external.dataset.lucide='external-link';link.append(external);source.append(link);container.append(source);
      const content=node('div',undefined,'official-news-content');
      if(typeof post.content==='string'&&post.content.trim())content.append(officialBody(post.content));
      if(!content.textContent.trim()&&!content.querySelector('img'))content.append(node('p','본문을 표시할 수 없습니다. 원문에서 확인해주세요.','official-news-empty'));
      container.append(content);details.append(container);icons();
    }
    details.addEventListener('toggle',()=>{if(details.open)body();});
    if(open){details.open=true;body();}
    return {li,details,signature:JSON.stringify(post)};
  }
  function render(data){
    const posts=recentOfficialPosts(data),retained=new Set(posts.map(post=>post.id));
    for(const [id,item]of entries)if(!retained.has(id)){item.li.remove();entries.delete(id);}
    posts.forEach((post,index)=>{
      let item=entries.get(post.id);
      if(!item||item.signature!==JSON.stringify(post)){
        const focused=item?.li.contains(document.activeElement);const next=entry(post,item?.details.open);
        if(item)item.li.replaceWith(next.li);item=next;entries.set(post.id,item);
        if(focused)item.details.querySelector('summary').focus({preventScroll:true});
      }
      if(list.children[index]!==item.li)list.insertBefore(item.li,list.children[index]||null);
    });
    status.textContent=posts.length?'':'최근 2주 이내 공식 소식이 없습니다.';
    const when=Date.parse(data.collectedAt);updated.textContent=Number.isFinite(when)?format.format(new Date(when))+' 갱신':'';icons();
  }
  async function load(){
    if(loading)return;loading=true;
    try{
      const response=await fetch('official-news.json',{cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('News unavailable');const data=await response.json();
      if(!Array.isArray(data.items)||!Number.isFinite(Date.parse(data.collectedAt)))throw new Error('Invalid news');
      cached=data;render(data);
    }catch{
      if(cached){render(cached);status.textContent='최신 소식을 갱신하지 못했습니다. 마지막 수집 목록을 표시합니다.';}
      else status.textContent='공식 소식을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.';
    }finally{loading=false;}
  }
  load();setInterval(()=>{if(!document.hidden)load();},300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
}
