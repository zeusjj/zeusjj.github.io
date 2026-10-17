export function isNewPeriod(start,end,now=Date.now()){
  return now>=Date.parse(start)&&now<Date.parse(end);
}

if(typeof document!=='undefined'){
  let timer;
  function refreshMenuBadges(){
    clearTimeout(timer);
    const now=Date.now(),groups=new Set();let next=Infinity;
    for(const badge of document.querySelectorAll('[data-new-start][data-new-until]')){
      const active=isNewPeriod(badge.dataset.newStart,badge.dataset.newUntil,now);
      badge.hidden=!active;
      if(active&&badge.dataset.newGroup)groups.add(badge.dataset.newGroup);
      for(const date of [badge.dataset.newStart,badge.dataset.newUntil]){
        const boundary=Date.parse(date);if(boundary>now)next=Math.min(next,boundary);
      }
    }
    for(const parent of document.querySelectorAll('[data-new-parent]'))parent.hidden=!groups.has(parent.dataset.newParent);
    if(Number.isFinite(next))timer=setTimeout(refreshMenuBadges,Math.min(next-now+50,2147483647));
  }
  refreshMenuBadges();
  document.addEventListener('visibilitychange',refreshMenuBadges);
  window.addEventListener('pageshow',refreshMenuBadges);
}
