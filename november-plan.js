(() => {
  const host=document.getElementById('november-plan');let sequence=0,loaded=false;
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  const allowed=()=>window.canViewNovemberPlan?.()??false;
  function render(data){
    host.replaceChildren();
    const heading=el('div',null,'page-heading'),title=el('div');title.append(el('h1','11월 길드레이드 아이템 분배 룰 제안'));title.firstChild.id='november-plan-heading';title.append(el('p','검토 중인 제안'));heading.append(title);host.append(heading);
    const reflection=el('div',null,'proposal-reflection');data.reflection.forEach((part,index)=>{reflection.append(el(index===0?'h2':'h3',part.title),el('p',part.text));if(part.conclusion)reflection.append(el('p',part.conclusion,'proposal-conclusion'));});host.append(reflection);
    if(data.transition)host.append(el('p',data.transition,'proposal-transition'));
    const intro=el('div',null,'proposal-intro');intro.append(el('h2',data.intro));host.append(intro);
    host.append(window.GuildDistributionCards.create(data));
    (data.discussions??[]).forEach((discussion,index)=>{
      const section=el('section',null,'proposal-discussion'),heading=el('h2',discussion.title);heading.id='november-discussion-'+(index+1);section.setAttribute('aria-labelledby',heading.id);section.append(heading);
      if(discussion.lead)section.append(el('p',discussion.lead));
      if(discussion.groups)discussion.groups.forEach(group=>{section.append(el('h3',group.title));const list=el('ul');group.items.forEach(item=>list.append(el('li',item)));section.append(list);});
      else if(discussion.items){const list=el('ul');discussion.items.forEach(item=>list.append(el('li',item)));section.append(list);}
      discussion.paragraphs.forEach(text=>section.append(el('p',text)));host.append(section);
    });
    window.lucide?.createIcons();
  }
  async function sync(){
    const current=++sequence;if(!allowed()){loaded=false;host.replaceChildren();return;}
    if(loaded||location.hash.split('/')[0]!=='#november-plan')return;
    host.replaceChildren(el('p','분배안을 불러오는 중입니다.','overview-note'));
    try{
      const response=await fetch('https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/member/november-plan',{headers:window.GuildAuth?.headers()??{},cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('load');const data=await response.json();if(current!==sequence||!allowed())return;render(data);loaded=true;
    }catch{if(current!==sequence||!allowed())return;const retry=el('button','다시 불러오기','secondary-button');retry.type='button';retry.addEventListener('click',sync);host.replaceChildren(el('p','분배안을 불러오지 못했습니다.'),retry);}
  }
  window.addEventListener('guild-auth-change',sync);window.addEventListener('hashchange',()=>{loaded=false;sync();});sync();
})();
