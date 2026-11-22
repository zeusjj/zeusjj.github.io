(() => {
  const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  const main=document.getElementById('main-content'),menu=document.querySelector('#site-navigation nav');
  const home=document.querySelector('[data-tab="weekly"]');home.querySelector('span').textContent='이번 주';menu.prepend(home);
  const history=document.querySelector('[data-tab="history"]');history.querySelector('span').textContent='Guild History';menu.append(history);
  menu.append(document.querySelector('[data-tab="rules"]'),document.querySelector('[data-tab="tips"]'),document.querySelector('[data-tab="tools"]'));
  document.querySelector('.guild-brand').href='#weekly';document.getElementById('weekly-heading').textContent='이번 주';
  const nav=make('nav',undefined,'mobile-navigation');nav.setAttribute('aria-label','주요 메뉴');
  for(const [route,label,icon]of [['weekly','이번 주','calendar-days'],['members','참여 현황','users-round'],['tools','편의 기능','sliders-horizontal'],['profile','내 정보','user-round']]){const a=make('a');a.href='#'+route;a.dataset.route=route;const mark=make('i');mark.dataset.lucide=icon;a.append(mark,make('span',label));nav.append(a);}
  document.body.append(nav);
  const updateLocation=()=>{
    const route=location.hash.slice(1).split('/')[0]||(window.GuildAuth?.user&&window.GuildAuth.expiresAt>Date.now()?'weekly':'rules');
    nav.querySelectorAll('a').forEach(a=>{a.setAttribute('aria-current',a.dataset.route===route?'page':'false');});
  };
  window.addEventListener('hashchange',updateLocation);
  window.addEventListener('guild-auth-change',updateLocation);
  const updates=document.getElementById('site-updates');document.querySelector('#weekly>.page-heading').before(updates);
  const members=document.getElementById('members'),toolbar=members.querySelector('.member-toolbar'),modes=make('div',undefined,'member-view-tabs');modes.setAttribute('role','tablist');modes.setAttribute('aria-label','참여 기록 보기');
  const controls=members.querySelector('.member-visibility-controls'),options=make('details',undefined,'member-options'),summary=make('summary'),icon=make('i');icon.dataset.lucide='list-filter';summary.append(icon);summary.title='표 설정';summary.setAttribute('aria-label','표 설정');options.append(summary,controls);toolbar.append(options);
  for(const id of ['member-growth-toggle','member-contribution-toggle'])document.getElementById(id).closest('label').hidden=true;
  document.addEventListener('click',event=>{if(options.open&&!options.contains(event.target))options.open=false;});
  options.addEventListener('keydown',event=>{if(event.key==='Escape'&&options.open){event.preventDefault();options.open=false;summary.focus();}});
  const filter=document.getElementById('member-season-filter'),top=make('div',undefined,'member-view-bar');toolbar.before(top);top.append(modes,filter);
  const emptyRecords=make('p',undefined,'empty');emptyRecords.id='member-empty-records';emptyRecords.role='status';emptyRecords.hidden=true;toolbar.after(emptyRecords);
  function selectView(view,focus=false){
    members.dataset.view=view;
    modes.querySelectorAll('button').forEach(button=>{const active=button.dataset.view===view;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus();});
    document.getElementById('member-growth-toggle').checked=view==='growth';document.getElementById('member-contribution-toggle').checked=view==='contribution';
    window.dispatchEvent(new Event('guild-member-view-change'));
  }
  for(const [view,label]of [['participation','참여'],['contribution','기여'],['growth','성장']]){const button=make('button',label);button.type='button';button.dataset.view=view;button.setAttribute('role','tab');button.setAttribute('aria-controls','member-table');button.addEventListener('click',()=>selectView(view));button.addEventListener('keydown',event=>{const buttons=[...modes.children],i=buttons.indexOf(button);let next;if(event.key==='ArrowRight')next=(i+1)%3;if(event.key==='ArrowLeft')next=(i+2)%3;if(event.key==='Home')next=0;if(event.key==='End')next=2;if(next!==undefined){event.preventDefault();selectView(buttons[next].dataset.view,true);}});modes.append(button);}
  selectView('participation');
  window.addEventListener('guild-member-detail',event=>{
    if(window.GuildAuth?.user)window.dispatchEvent(new CustomEvent('guild-profile-view',{detail:{name:event.detail.name,popup:true}}));else location.hash='login';
  });
  function distributionSelector(){
    const host=document.getElementById('distribution-content');host.querySelector('.distribution-filter')?.remove();const groups=[...host.querySelectorAll(':scope>.distribution-group')];if(!groups.length)return;
    const label=make('label','회차 ', 'distribution-filter'),select=make('select');select.setAttribute('aria-label','분배 회차');select.append(new Option('전체 회차','all'));groups.forEach((group,i)=>select.append(new Option(group.querySelector('h2').textContent,String(i))));
    select.addEventListener('change',()=>groups.forEach((group,i)=>group.hidden=select.value!=='all'&&select.value!==String(i)));label.append(select);host.prepend(label);
  }
  window.addEventListener('guild-distribution-rendered',distributionSelector);distributionSelector();
  const ruleHost=document.getElementById('rule-content'),toc=make('details',undefined,'policy-quick-navigation');toc.append(make('summary','항목 바로가기'));ruleHost.before(toc);
  function ruleNavigation(){
    const summary=toc.firstElementChild;toc.replaceChildren(summary);const links=make('div');
    for(const [index,section]of [...ruleHost.querySelectorAll('.policy-section:not([hidden])')].entries()){
      const heading=section.querySelector(':scope>h2');if(!heading)continue;const copy=heading.cloneNode(true);copy.querySelectorAll('button').forEach(button=>button.remove());
      section.id='policy-item-'+index;const button=make('button',copy.textContent.trim());button.type='button';button.addEventListener('click',()=>section.scrollIntoView({block:'start',behavior:'instant'}));links.append(button);
    }
    toc.append(links);
  }
  for(const event of ['guild-members-data','guild-section-content-change','guild-auth-change'])window.addEventListener(event,ruleNavigation);ruleNavigation();
  const historyHost=document.getElementById('guild-history-weeks'),jump=make('select');jump.setAttribute('aria-label','Guild History 주차 이동');jump.className='history-week-jump';document.querySelector('#history .page-heading').append(jump);
  function historyOptions(){const sections=[...historyHost.querySelectorAll('.guild-history-week')];jump.replaceChildren(...sections.map((section,index)=>{section.id='history-week-'+index;return new Option(section.querySelector('h2').textContent+' · '+section.querySelector('header time').textContent,section.id);}));jump.hidden=!sections.length;}
  new MutationObserver(historyOptions).observe(historyHost,{childList:true});jump.addEventListener('change',()=>document.getElementById(jump.value)?.scrollIntoView({block:'start',behavior:'instant'}));historyOptions();
  updateLocation();window.lucide?.createIcons();
})();
