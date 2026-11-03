const endpoint='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/tips';
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
let mounted;
export function mountMyTips(host){
  const user=window.GuildAuth?.user;if(!user)return;
  const section=node('section',undefined,'overview-section profile-tips');section.id='profile-my-tips';
  const heading=node('div',undefined,'profile-tips-heading'),title=node('h2','내가 쓴 팁'),refresh=node('button',undefined,'icon-button');
  refresh.type='button';refresh.title='내 팁 새로고침';refresh.setAttribute('aria-label',refresh.title);const icon=node('i');icon.dataset.lucide='refresh-cw';refresh.append(icon);heading.append(title,refresh);
  const status=node('p',undefined,'overview-note');status.setAttribute('role','status');
  const list=node('ul',undefined,'profile-tips-list'),more=node('button','더 보기','secondary-button');more.type='button';more.hidden=true;
  section.append(heading,status,list,more);host.append(section);let cursor=null,busy=false,generation=0;
  const current=()=>section.isConnected&&window.GuildAuth?.user?.username===user.username;
  async function load(reset=false){
    if(!current())return;if(busy&&!reset)return;
    const request=++generation;busy=true;refresh.disabled=true;more.disabled=true;status.textContent='내 팁을 불러오는 중입니다.';
    if(reset){cursor=null;list.replaceChildren();more.hidden=true;}
    const url=new URL(endpoint);url.searchParams.set('mine','1');if(cursor){url.searchParams.set('before',cursor.date);url.searchParams.set('beforeId',cursor.id);}
    try{
      const response=await fetch(url,{headers:window.GuildAuth.headers(),cache:'no-store',signal:AbortSignal.timeout(15000)});
      const data=await response.json();if(!current()||request!==generation)return;
      if(response.status===401){window.GuildAuth.invalidate();return;}
      if(!response.ok)throw new Error(data.error||'내 팁을 불러오지 못했습니다.');
      if(!Array.isArray(data.tips)||!data.tips.every(tip=>typeof tip.title==='string'&&/^[a-f0-9-]{36}$/.test(tip.id)&&Number.isSafeInteger(tip.created_at)))throw new Error('내 팁 목록을 확인하지 못했습니다.');
      for(const tip of data.tips){
        const item=node('li'),link=node('a',tip.title);link.href='#tips/'+tip.id;const time=node('time',new Date(tip.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}));time.dateTime=new Date(tip.created_at).toISOString();item.append(link,time);list.append(item);
      }
      status.textContent=list.children.length?'':'작성한 팁이 없습니다.';
      more.hidden=!data.hasMore;cursor=data.hasMore?{date:data.nextBefore,id:data.nextBeforeId}:null;
    }catch(error){if(current()&&request===generation)status.textContent=error.name==='TimeoutError'?'응답이 늦습니다. 다시 시도해주세요.':error.message;}
    finally{if(request===generation){busy=false;refresh.disabled=false;more.disabled=false;}}
  }
  refresh.addEventListener('click',()=>load(true));more.addEventListener('click',()=>load());
  mounted={section,reload:()=>load(true)};load(true);window.lucide?.createIcons();
}
window.addEventListener('guild-tips-changed',()=>{if(mounted?.section.isConnected)mounted.reload();});
