(() => {
  const valid=route=>typeof route==='string'&&route.length<=120&&/^[a-z][a-z0-9-]{0,47}(?:\/[a-z][a-z0-9-]{0,47}){0,2}$/.test(route)&&!['admin','login'].includes(route.split('/')[0]);
  const title=element=>element?.textContent.trim().replace(/\s+/g,' ');
  function entries(){
    const menus=new Map();
    for(const section of document.querySelectorAll('#main-content > section[id]')){
      if(!valid(section.id)||section.dataset.track==='false')continue;
      const button=[...document.querySelectorAll('[data-tab]')].find(button=>button.dataset.tab===section.id);
      const label=title(section.querySelector('.page-heading h1'))||title(button?.querySelector('span'))||section.id;
      menus.set(section.id,label);
      for(const control of section.querySelectorAll('[data-calculator]')){
        const route=section.id+'/'+control.dataset.calculator;
        if(valid(route)&&control.dataset.track!=='false')menus.set(route,title(control.querySelector('span'))||title(control)||route);
      }
    }
    return menus;
  }
  window.GuildMenuRegistry={entries,has:route=>entries().has(route)};
})();
