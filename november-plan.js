(() => {
  const host=document.getElementById('november-plan');let sequence=0,loaded=false;
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  const icon=name=>{const node=el('i');node.dataset.lucide=name;return node;};
  const allowed=()=>window.GuildAuth?.user?.username==='케이론'&&window.GuildAuth.user.isAdmin&&window.GuildAuth.expiresAt>Date.now();
  function render(data){
    host.replaceChildren();
    const heading=el('div',null,'page-heading'),title=el('div');title.append(el('h1','11월 길드레이드 아이템 분배 룰 제안'));title.firstChild.id='november-plan-heading';title.append(el('p','비공개 초안 · 검토 중'));heading.append(title);host.append(heading);
    const reflection=el('div',null,'proposal-reflection');data.reflection.forEach((part,index)=>{reflection.append(el(index===0?'h2':'h3',part.title),el('p',part.text));});host.append(reflection);
    const intro=el('div',null,'proposal-intro');intro.append(el('h2',data.intro),el('p',data.summary));host.append(intro);
    const grid=el('div',null,'proposal-options');
    data.rules.forEach(rule=>{
      const card=el('article',null,'proposal-option'+(rule.event?' proposal-event':''));
      const top=el('div',null,'proposal-option-top');top.append(icon(rule.icon),el('span',rule.label));card.append(top,el('h3',rule.title),el('p',rule.method,'proposal-method'));
      const price=el('p',null,'proposal-price');price.append(el('strong',rule.price),el('span',rule.priceLabel));card.append(price);
      const list=el('dl'),pair=(label,value)=>{const row=el('div');row.append(el('dt',label),el('dd',value));list.append(row);};
      pair('입찰 대상',rule.audience);pair('제외 대상',rule.exclusions);if(rule.distribution)pair('분배 대상',rule.distribution);if(rule.event)pair('입찰 시간','시작 후 5분');card.append(list);grid.append(card);
    });host.append(grid);
    const event=el('div',null,'proposal-flow-section');const eventTitle=el('h2');eventTitle.append(icon('shuffle'),document.createTextNode('특별 추첨은 이렇게 진행합니다'));event.append(eventTitle,el('p',data.eventNote));
    const steps=el('ol',null,'proposal-flow');data.steps.forEach((text,index)=>{const step=el('li');step.append(el('span',String(index+1),'proposal-step-number'),el('strong',text));if(index<2)step.append(icon('arrow-right'));steps.append(step);});event.append(steps,el('p','더 높은 금액으로 경쟁하지 않고, 같은 금액에 입찰한 사람 중 추첨합니다.','proposal-flow-note'));host.append(event);
    window.lucide?.createIcons();
  }
  async function sync(){
    const current=++sequence;if(!allowed()){loaded=false;host.replaceChildren();return;}
    if(loaded||location.hash.split('/')[0]!=='#november-plan')return;
    host.replaceChildren(el('p','분배안을 불러오는 중입니다.','overview-note'));
    try{
      const response=await fetch('https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/member/november-plan',{headers:window.GuildAuth.headers(),cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('load');const data=await response.json();if(current!==sequence||!allowed())return;render(data);loaded=true;
    }catch{if(current!==sequence||!allowed())return;const retry=el('button','다시 불러오기','secondary-button');retry.type='button';retry.addEventListener('click',sync);host.replaceChildren(el('p','분배안을 불러오지 못했습니다.'),retry);}
  }
  window.addEventListener('guild-auth-change',sync);window.addEventListener('hashchange',sync);sync();
})();
