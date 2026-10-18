(() => {
  const scroll=document.querySelector('#members .table-scroll');
  const portrait=matchMedia('(max-width:700px) and (orientation:portrait)');
  let gesture=null,frame=0;
  function stop(){cancelAnimationFrame(frame);frame=0;gesture=null;}
  function move(axis,amount){
    const property=axis==='x'?'scrollLeft':'scrollTop',before=scroll[property];
    scroll[property]+=amount;
    return scroll[property]-before;
  }
  document.addEventListener('touchstart',stop,{capture:true,passive:true});
  scroll.addEventListener('touchstart',event=>{
    if(!portrait.matches||event.touches.length!==1||event.target.closest('.member-name'))return;
    const touch=event.touches[0];
    gesture={x:touch.clientX,y:touch.clientY,lastX:touch.clientX,lastY:touch.clientY,time:performance.now(),axis:null,velocity:0};
  },{passive:true});
  scroll.addEventListener('touchmove',event=>{
    if(!gesture)return;
    if(event.touches.length!==1){stop();return;}
    const touch=event.touches[0],dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
    if(!gesture.axis){if(Math.max(Math.abs(dx),Math.abs(dy))<6)return;gesture.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';}
    if(event.cancelable)event.preventDefault();
    const amount=gesture.axis==='x'?gesture.lastX-touch.clientX:gesture.lastY-touch.clientY;
    const applied=move(gesture.axis,amount),now=performance.now();
    gesture.velocity=applied/Math.max(8,now-gesture.time);
    if(gesture.axis==='y'&&Math.abs(amount-applied)>1)window.scrollBy(0,amount-applied);
    gesture.lastX=touch.clientX;gesture.lastY=touch.clientY;gesture.time=now;
  },{passive:false});
  scroll.addEventListener('touchend',()=>{
    const finished=gesture;gesture=null;
    if(!finished?.axis||performance.now()-finished.time>100)return;
    let speed=Math.max(-40,Math.min(40,finished.velocity*16)),time=performance.now();
    function glide(now){
      if(!portrait.matches||Math.abs(speed)<.4){frame=0;return;}
      const elapsed=Math.min(32,Math.max(1,now-time))/16;time=now;
      if(Math.abs(move(finished.axis,speed*elapsed))<.1){frame=0;return;}
      speed*=Math.pow(.9,elapsed);frame=requestAnimationFrame(glide);
    }
    frame=requestAnimationFrame(glide);
  },{passive:true});
  scroll.addEventListener('touchcancel',stop,{passive:true});
  portrait.addEventListener('change',stop);
  window.addEventListener('hashchange',stop);
})();
