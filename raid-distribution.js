(() => {
  const api='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/site-sections/';
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  const icon=name=>{const node=el('i');node.dataset.lucide=name;return node;};
  const admin=()=>!!window.GuildAuth?.user?.isAdmin&&window.GuildAuth.expiresAt>Date.now();
  let sourceData=null,dialog=null,form=null,status=null,activeIndex=-1,activeVersion=0;
  const fields=[['title','카드 제목'],['label','상단 구분 문구'],['method','경매 방식'],['price','가격'],['priceLabel','가격 설명'],['audience','입찰 대상'],['exclusions','제외 대상'],['distribution','분배 대상']];
  function editor(){
    if(dialog)return;
    dialog=el('dialog',undefined,'section-editor-dialog raid-card-editor');dialog.setAttribute('aria-labelledby','raid-card-editor-title');
    const head=el('div',undefined,'section-editor-heading'),heading=el('h2','분배 가격표 편집');heading.id='raid-card-editor-title';
    const close=el('button',undefined,'icon-button');close.type='button';close.title='닫기';close.setAttribute('aria-label','닫기');close.append(icon('x'));close.addEventListener('click',()=>dialog.close());head.append(heading,close);
    form=el('form');const grid=el('div',undefined,'raid-card-editor-fields');
    for(const [key,label] of fields){const wrapper=el('label',label);const input=key==='audience'||key==='exclusions'?el('textarea'):el('input');input.name=key;if(input.tagName==='TEXTAREA')input.rows=2;wrapper.append(input);grid.append(wrapper);}
    const eventFields=[['eventNote','이벤트 안내'],['eventExplanation','이벤트 설명'],['steps','진행 단계 (한 줄에 하나씩)']];
    for(const [key,label] of eventFields){const wrapper=el('label',label),input=el('textarea');input.name=key;input.rows=key==='steps'?3:2;wrapper.append(input);grid.append(wrapper);}
    status=el('p',undefined,'section-editor-status');status.setAttribute('role','status');
    const actions=el('div',undefined,'form-actions'),cancel=el('button','취소','secondary-button'),save=el('button','저장','primary-button');cancel.type='button';save.type='submit';cancel.addEventListener('click',()=>dialog.close());actions.append(cancel,save);form.append(grid,status,actions);dialog.append(head,form);document.body.append(dialog);
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    form.addEventListener('submit',saveCard);
    window.lucide?.createIcons();
  }
  function openEditor(index,data){
    if(!admin())return;editor();activeIndex=index;activeVersion=window.GuildSectionEditor?.getVersion('분배 가격표')??0;
    const rule=data.rules[index];for(const [key] of fields)form.elements[key].value=rule[key]??'';
    form.elements.eventNote.value=data.eventNote??'';form.elements.eventExplanation.value=data.eventExplanation??'';form.elements.steps.value=(data.steps??[]).join('\n');
    form.querySelectorAll('[name="eventNote"],[name="eventExplanation"],[name="steps"]').forEach(input=>input.closest('label').hidden=!rule.event);
    status.textContent='';dialog.showModal();form.elements.title.focus();
  }
  async function saveCard(event){
    event.preventDefault();if(!admin()||activeIndex<0)return;
    const save=form.querySelector('[type="submit"]');save.disabled=true;status.textContent='저장 중입니다.';
    try{
      const current=sourceData;
      const next=structuredClone(current),rule=next.rules[activeIndex];
      for(const [key] of fields){const value=form.elements[key].value.trim();if(['title','label','method','audience','exclusions'].includes(key)&&!value)throw Error('필수 항목을 입력해주세요.');rule[key]=value;}
      rule.priceLabel=rule.priceLabel||undefined;
      if(rule.event){next.eventNote=form.elements.eventNote.value.trim();next.eventExplanation=form.elements.eventExplanation.value.trim();next.steps=form.elements.steps.value.split(/\r?\n/).map(value=>value.trim()).filter(Boolean);if(!next.steps.length)throw Error('이벤트 진행 단계를 입력해주세요.');}
      const response=await fetch(api+encodeURIComponent('분배 가격표'),{method:'PUT',headers:{'Content-Type':'application/json',...window.GuildAuth?.headers()},cache:'no-store',signal:AbortSignal.timeout(10000),body:JSON.stringify({baseVersion:activeVersion,title:'분배 가격표',body:JSON.stringify(next),reset:false})});
      const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'저장하지 못했습니다.'),{status:response.status});
      await window.GuildSectionEditor?.refresh?.();dialog.close();for(const host of document.querySelectorAll('#raid-distribution-cards'))if(host.isConnected)mount(host);
    }catch(error){status.textContent=error.message;if(error.status===401)window.GuildAuth?.invalidate();}
    finally{save.disabled=false;}
  }
  function effectiveData(data){
    const raw=window.GuildSectionEditor?.getBody('분배 가격표','');if(!raw)return data;
    try{const saved=JSON.parse(raw);if(Array.isArray(saved.rules)&&saved.rules.length===data.rules.length)return saved;}catch{}
    return data;
  }
  function create(input){
    const data=effectiveData(input);sourceData=data;
    const restrictions=window.GuildSectionEditor?.getBody('입찰 제한 조건',data.bidRestrictions?.join('\n')??'')??(data.bidRestrictions??[]).join('\n');
    const grid=el('div',undefined,'proposal-options');
    data.rules.forEach((rule,index)=>{
      const card=el('article',undefined,'proposal-option'+(rule.event?' proposal-event':''));
      const top=el('div',undefined,'proposal-option-top');top.append(icon(rule.icon),el('span',rule.event?'이벤트 경매':rule.label));
      if(admin()){const edit=el('button',undefined,'icon-button raid-card-edit');edit.type='button';edit.title='이 카드 편집';edit.setAttribute('aria-label',rule.title+' 편집');edit.append(icon('pencil'));edit.addEventListener('click',()=>openEditor(index,data));top.append(edit);}
      card.append(top);if(rule.event)card.append(el('p',rule.label,'proposal-event-condition'));card.append(el('h3',rule.title));
      const method=el('p',undefined,'proposal-method');method.append(el('span','경매 방식'),el('strong',rule.method));card.append(method);
      if(rule.event)card.append(el('p',data.eventExplanation,'proposal-event-explanation'));
      if(rule.price||rule.priceLabel){const price=el('p',undefined,'proposal-price');if(rule.price)price.append(el('strong',rule.price));if(rule.priceLabel)price.append(el('span',rule.priceLabel));card.append(price);}
      const list=el('dl'),pair=(label,value)=>{const row=el('div');row.append(el('dt',label),el('dd',value));list.append(row);};
      pair('입찰 대상',rule.audience);
      if(rule.event){const note=el('p',undefined,'proposal-participation-link'),link=el('a','[내정보]');link.href='#profile';note.append(document.createTextNode('참여 현황 확인 방법 : 홈페이지 좌측 하단 '),link);list.lastElementChild.querySelector('dd').append(note);}
      pair('제외 대상',rule.exclusions);if(rule.distribution)pair('분배 대상',rule.distribution);card.append(list);
      if(rule.event){const details=el('div',undefined,'proposal-event-details');details.append(el('p',data.eventNote));const steps=el('ol',undefined,'proposal-flow');data.steps.forEach((text,stepIndex)=>{const step=el('li');step.append(el('span',String(stepIndex+1),'proposal-step-number'),el('strong',text));steps.append(step);});details.append(steps);card.append(details);}
      grid.append(card);
    });
    if(restrictions.trim()){
      grid.classList.add('raid-allocation-options');const section=el('section',undefined,'raid-bid-restrictions'),heading=el('h2','입찰 제한 조건'),list=el('ul');
      section.append(heading,list);restrictions.split(/\r?\n/).map(text=>text.trim()).filter(Boolean).forEach(text=>list.append(el('li',text)));grid.append(section);window.GuildSectionEditor?.decorateStandalone(section,'입찰 제한 조건',data.bidRestrictions?.join('\n')??'');
    }
    return grid;
  }
  const refreshCards=()=>{for(const host of document.querySelectorAll('#raid-distribution-cards'))if(host.isConnected)mount(host);};
  window.addEventListener('guild-section-content-change',refreshCards);window.addEventListener('guild-auth-change',refreshCards);
  let pending;
  async function mount(host){
    host.replaceChildren(el('p','분배 규칙을 불러오는 중입니다.','overview-note'));
    try{
      pending??=fetch('raid-distribution.json',{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(response=>{if(!response.ok)throw Error('load');return response.json();}).catch(error=>{pending=null;throw error;});
      const source=await pending;await window.GuildSectionEditor?.ready;const data=effectiveData(source);sourceData=data;if(!host.isConnected)return;host.replaceChildren(create(data));window.lucide?.createIcons();
    }catch{if(!host.isConnected)return;const retry=el('button','다시 불러오기','secondary-button');retry.type='button';retry.addEventListener('click',()=>mount(host));host.replaceChildren(el('p','분배 규칙을 불러오지 못했습니다.'),retry);}
  }
  window.GuildDistributionCards={create,mount};
})();
