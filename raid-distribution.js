(() => {
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  const icon=name=>{const node=el('i');node.dataset.lucide=name;return node;};
  function create(data){
    const grid=el('div',null,'proposal-options');
    data.rules.forEach(rule=>{
      const card=el('article',null,'proposal-option'+(rule.event?' proposal-event':''));
      const top=el('div',null,'proposal-option-top');top.append(icon(rule.icon),el('span',rule.event?'이벤트 경매':rule.label));card.append(top);if(rule.event)card.append(el('p',rule.label,'proposal-event-condition'));card.append(el('h3',rule.title));
      const method=el('p',null,'proposal-method');method.append(el('span','경매 방식'),el('strong',rule.method));card.append(method);
      if(rule.event)card.append(el('p',data.eventExplanation,'proposal-event-explanation'));
      const price=el('p',null,'proposal-price');price.append(el('strong',rule.price),el('span',rule.priceLabel));card.append(price);
      const list=el('dl'),pair=(label,value)=>{const row=el('div');row.append(el('dt',label),el('dd',value));list.append(row);};
      pair('입찰 대상',rule.audience);
      if(rule.event){const note=el('p',null,'proposal-participation-link'),link=el('a','[내정보]');link.href='#profile';note.append(document.createTextNode('참여 현황 확인 방법 : 홈페이지 좌측 하단 '),link);list.lastElementChild.querySelector('dd').append(note);}
      pair('제외 대상',rule.exclusions);if(rule.distribution)pair('분배 대상',rule.distribution);card.append(list);
      if(rule.event){
        const details=el('div',null,'proposal-event-details');details.append(el('p',data.eventNote));
        const steps=el('ol',null,'proposal-flow');data.steps.forEach((text,index)=>{const step=el('li');step.append(el('span',String(index+1),'proposal-step-number'),el('strong',text));steps.append(step);});details.append(steps);card.append(details);
      }
      grid.append(card);
    });
    if(data.bidRestrictions?.length){
      grid.classList.add('raid-allocation-options');
      const section=el('section',null,'raid-bid-restrictions'),heading=el('h3','입찰 제한 조건'),list=el('ul');
      section.append(heading,list);data.bidRestrictions.forEach(text=>list.append(el('li',text)));grid.append(section);
    }
    return grid;
  }
  let pending;
  async function mount(host){
    host.replaceChildren(el('p','분배 규칙을 불러오는 중입니다.','overview-note'));
    try{
      pending??=fetch('raid-distribution.json',{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(response=>{if(!response.ok)throw Error('load');return response.json();}).catch(error=>{pending=null;throw error;});
      const data=await pending;if(!host.isConnected)return;
      host.replaceChildren(create(data));window.lucide?.createIcons();
    }catch{
      if(!host.isConnected)return;
      const retry=el('button','다시 불러오기','secondary-button');retry.type='button';retry.addEventListener('click',()=>mount(host));host.replaceChildren(el('p','분배 규칙을 불러오지 못했습니다.'),retry);
    }
  }
  window.GuildDistributionCards={create,mount};
})();
