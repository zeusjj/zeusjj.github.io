export function nicknamePicker(host,{names,get,choose,label}){
  const input=document.createElement('input'),toggle=document.createElement('button'),list=document.createElement('ul'),caption=document.createElement('label'),symbol=document.createElement('i');
  input.id=host.id+'-input';input.type='search';input.autocomplete='off';input.maxLength=30;input.placeholder='닉네임 선택';input.role='combobox';input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls',host.id+'-list');
  caption.htmlFor=input.id;caption.textContent=label;caption.className='visually-hidden';
  toggle.type='button';toggle.setAttribute('aria-label',label+' 목록 열기');toggle.title='닉네임 변경';symbol.dataset.lucide='chevron-down';toggle.append(symbol);
  list.id=host.id+'-list';list.role='listbox';list.setAttribute('aria-label','닉네임 추천');list.hidden=true;
  host.append(caption,input,toggle,list);let matches=[],selected=-1;
  const hide=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');selected=-1;};
  const pick=name=>{if(!matches.includes(name))return;choose(name);input.value=name;hide();input.focus({preventScroll:true});};
  function highlight(){[...list.children].forEach((option,index)=>option.setAttribute('aria-selected',String(index===selected)));if(selected>=0){input.setAttribute('aria-activedescendant',list.children[selected].id);list.children[selected].scrollIntoView({block:'nearest'});}}
  function show(all=false){
    matches=GuildNicknameSearch.suggest(names(),all?'':input.value);selected=-1;list.replaceChildren();
    for(const [index,name] of matches.entries()){const option=document.createElement('li');option.role='option';option.id=host.id+'-option-'+index;option.textContent=name;option.setAttribute('aria-selected','false');list.append(option);}
    if(!matches.length){const empty=document.createElement('li');empty.textContent='검색 결과 없음';empty.className='nickname-empty';list.append(empty);}
    list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant');
  }
  GuildNicknameSearch.bindOptions(input,list,{choose:pick,hide});
  input.addEventListener('input',()=>{if(!input.isComposing)show();});input.addEventListener('compositionend',()=>show());input.addEventListener('focus',()=>show(input.value===get()));
  toggle.addEventListener('pointerdown',event=>event.preventDefault());toggle.addEventListener('click',()=>{if(list.hidden){input.focus({preventScroll:true});show(true);}else hide();});
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(list.hidden)show(true);if(matches.length){selected=event.key==='ArrowDown'?(selected+1)%matches.length:(selected<=0?matches.length-1:selected-1);highlight();}}
    else if(event.key==='Enter'){event.preventDefault();if(selected>=0)pick(matches[selected]);else if(matches.length===1)pick(matches[0]);else if(names().includes(input.value))choose(input.value);}
    else if(event.key==='Escape'){event.preventDefault();event.stopPropagation();hide();input.value=get();}
  });
  input.addEventListener('blur',()=>{if(list.hidden)input.value=get();});
  return {input,hide,refresh(){if(document.activeElement===input&&!list.hidden)show();},sync(){input.value=get();hide();}};
}
