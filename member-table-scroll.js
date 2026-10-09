(() => {
 const scroll=document.querySelector('.member-grid .table-scroll'),table=document.getElementById('member-table');
 const frame=document.createElement('div');frame.className='member-scroll-frame';scroll.before(frame);frame.append(scroll);
 function scrollbar(axis,label){
  const bar=document.createElement('div'),content=document.createElement('div');
  bar.className='member-scrollbar member-scrollbar-'+axis;bar.tabIndex=0;bar.setAttribute('role','region');bar.setAttribute('aria-label',label);bar.append(content);frame.append(bar);return {bar,content};
 }
 const horizontal=scrollbar('horizontal','길드 콘텐츠 가로 스크롤'),vertical=scrollbar('vertical','길드원 목록 세로 스크롤');
 scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','길드원 참여 현황 표');
 function sync(){horizontal.bar.scrollLeft=scroll.scrollLeft;vertical.bar.scrollTop=scroll.scrollTop;}
 function layout(){
  if(!scroll.clientWidth)return;
  const header=table.tHead?.getBoundingClientRect().height||0,row=table.tBodies[0]?.rows[0]?.getBoundingClientRect().height;
  if(row)scroll.style.setProperty('--member-ten-row-height',header+row*10+'px');
  const fixed=[...table.querySelectorAll('col')].filter(col=>!col.classList.contains('content-column')).reduce((sum,col)=>sum+col.getBoundingClientRect().width,0);
  horizontal.bar.style.left=Math.min(fixed,scroll.clientWidth)+'px';
  vertical.bar.style.top=header+'px';
  horizontal.bar.hidden=scroll.scrollWidth<=scroll.clientWidth;
  vertical.bar.hidden=scroll.scrollHeight<=scroll.clientHeight;
  horizontal.content.style.width=horizontal.bar.clientWidth+scroll.scrollWidth-scroll.clientWidth+'px';
  vertical.content.style.height=vertical.bar.clientHeight+scroll.scrollHeight-scroll.clientHeight+'px';
  sync();
 }
 scroll.addEventListener('scroll',sync,{passive:true});
 horizontal.bar.addEventListener('scroll',()=>{if(Math.abs(scroll.scrollLeft-horizontal.bar.scrollLeft)>1)scroll.scrollLeft=horizontal.bar.scrollLeft;},{passive:true});
 vertical.bar.addEventListener('scroll',()=>{if(Math.abs(scroll.scrollTop-vertical.bar.scrollTop)>1)scroll.scrollTop=vertical.bar.scrollTop;},{passive:true});
 const observer=new ResizeObserver(layout);observer.observe(scroll);observer.observe(table);
 window.addEventListener('guild-members-data',()=>requestAnimationFrame(layout));
 layout();
})();
