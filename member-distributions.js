import {memberDistribution} from './member-distribution-model.js?v=20261024-dynamic-levels';
const canvas=document.getElementById('member-class-chart'),frame=canvas.parentElement,legend=document.getElementById('member-class-legend'),growth=document.getElementById('member-growth-chart'),levels=document.getElementById('member-level-chart');
const palette={'버서커':'#b94b50','나이트':'#577d9a','레인저':'#30836a','어쌔신':'#785b93','아티산':'#9c7738','블레':'#c26338','오라클':'#a68a26','엘리':'#438d9d','미기록':'#929b9f'};
const number=new Intl.NumberFormat('ko-KR');let summary;
function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
const tooltip=node('div',undefined,'member-distribution-tooltip');tooltip.id='member-distribution-tooltip';tooltip.role='tooltip';tooltip.hidden=true;document.body.append(tooltip);
let tooltipRow=null;
function hideTooltip(){tooltip.hidden=true;tooltipRow?.removeAttribute('aria-describedby');tooltipRow=null;}
function bindTooltip(row,item,label){
 row.tabIndex=0;row.setAttribute('aria-label',label+' · '+item.count+'명');
 let touchFocus=false;
 function show(event){
  if(tooltipRow!==row){tooltipRow?.removeAttribute('aria-describedby');tooltipRow=row;tooltip.replaceChildren(node('strong',label+' · '+item.count+'명'),node('p',item.names.length?item.names.join(', '):'해당 길드원이 없습니다.'));}
  if(tooltip.hidden)tooltip.hidden=false;row.setAttribute('aria-describedby',tooltip.id);
  const rect=row.getBoundingClientRect(),box=tooltip.getBoundingClientRect(),x=event?.clientX??rect.left,y=event?.clientY??rect.bottom;
  tooltip.style.left=Math.max(8,Math.min(x+12,innerWidth-box.width-8))+'px';
  tooltip.style.top=Math.max(8,Math.min(y+12+box.height>innerHeight-8?y-box.height-12:y+12,innerHeight-box.height-8))+'px';
 }
 row.addEventListener('pointerdown',event=>{touchFocus=event.pointerType==='touch';});
 row.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')show(event);});
 row.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')show(event);});
 row.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch')hideTooltip();});
 row.addEventListener('pointercancel',hideTooltip);
 row.addEventListener('focus',()=>{if(!touchFocus)show();});row.addEventListener('blur',()=>{touchFocus=false;hideTooltip();});row.addEventListener('click',show);
 row.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();touchFocus=false;show();}});
}
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideTooltip();});
document.addEventListener('click',event=>{if(!event.target.closest('#member-growth-chart .member-growth-bin, #member-level-chart .member-growth-bin'))hideTooltip();});
window.addEventListener('scroll',hideTooltip,{passive:true,capture:true});window.addEventListener('resize',hideTooltip);window.addEventListener('hashchange',hideTooltip);
function draw(){
 if(!summary || !frame.clientWidth)return;
 const size=frame.clientWidth,ratio=devicePixelRatio || 1;canvas.width=Math.round(size*ratio);canvas.height=Math.round(size*ratio);
 const context=canvas.getContext('2d');context.scale(ratio,ratio);const center=size/2,radius=center-5,theme=getComputedStyle(document.documentElement);let angle=-Math.PI/2;
 if(!summary.total){context.strokeStyle='#d7e1dd';context.lineWidth=2;context.beginPath();context.arc(center,center,radius,0,Math.PI*2);context.stroke();return;}
 for(const item of summary.classes){if(!item.count)continue;const arc=item.count/summary.total*Math.PI*2;context.beginPath();context.moveTo(center,center);context.arc(center,center,radius,angle,angle+arc);context.closePath();context.fillStyle=palette[item.name];context.fill();context.strokeStyle=theme.getPropertyValue('--page').trim()||'#f5f6f8';context.lineWidth=2;context.stroke();
  if(item.count/summary.total>=.065){const middle=angle+arc/2;context.fillStyle='#fff';context.font='600 12px Arial';context.textAlign='center';context.textBaseline='middle';context.fillText(Math.round(item.count/summary.total*100)+'%',center+Math.cos(middle)*radius*.7,center+Math.sin(middle)*radius*.7);}
  angle+=arc;
 }
}
function render(data){
 hideTooltip();summary=memberDistribution(data);legend.replaceChildren();growth.replaceChildren();levels.replaceChildren();
 document.getElementById('member-level-total').textContent=summary.levelRecorded+'명 · 미기록 '+(summary.total-summary.levelRecorded)+'명';
 const levelMax=Math.max(5,Math.ceil(Math.max(...summary.levelBins.map(item=>item.count))/5)*5),levelAxis=node('div',undefined,'member-growth-axis');
 for(let count=0;count<=levelMax;count+=5)levelAxis.append(node('span',count+'명'));levels.append(levelAxis);
 for(const item of [...summary.levelBins].reverse()){const row=node('div',undefined,'member-growth-bin');row.append(node('span',item.label,'member-growth-label'));const track=node('div',undefined,'member-growth-track'),bar=node('span');bar.style.width=item.count/levelMax*100+'%';track.append(bar);track.setAttribute('aria-hidden','true');row.append(track,node('strong',item.count+'명'));bindTooltip(row,item,'레벨 '+item.label);levels.append(row);}
 document.getElementById('member-class-total').textContent=summary.total+'명';document.getElementById('member-growth-total').textContent=summary.recorded+'명 · 미기록 '+summary.missing+'명';
 for(const item of summary.classes){const row=node('li');const swatch=node('span',undefined,'member-class-swatch');swatch.style.backgroundColor=palette[item.name];const label=node('span',item.name),count=node('strong',item.count+'명'),percent=node('small',summary.total?(item.count/summary.total*100).toFixed(1)+'%':'0.0%');row.append(swatch,label,count,percent);legend.append(row);}
 canvas.setAttribute('aria-label','직업 분포: '+summary.classes.map(item=>item.name+' '+item.count+'명').join(', '));
 if(!summary.recorded){growth.append(node('p','성장도 기록이 없습니다.','member-chart-empty'));draw();return;}
 const maximum=Math.max(5,Math.ceil(Math.max(...summary.bins.map(item=>item.count))/5)*5);
 const axis=node('div',undefined,'member-growth-axis');for(let count=0;count<=maximum;count+=5)axis.append(node('span',count+'명'));growth.append(axis);
 for(const item of [...summary.bins].reverse()){const row=node('div',undefined,'member-growth-bin');const label=number.format(item.start)+'~'+number.format(item.end);row.append(node('span',label,'member-growth-label'));const track=node('div',undefined,'member-growth-track'),bar=node('span');bar.style.width=item.count/maximum*100+'%';track.append(bar);track.setAttribute('aria-hidden','true');row.append(track,node('strong',item.count+'명'));bindTooltip(row,item,'성장도 '+label);growth.append(row);}
 draw();
}
canvas.addEventListener('pointermove',event=>{if(!summary?.total)return;const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left-rect.width/2,y=event.clientY-rect.top-rect.height/2;if(Math.hypot(x,y)>rect.width/2-5){canvas.removeAttribute('title');return;}let angle=(Math.atan2(y,x)+Math.PI/2+Math.PI*2)%(Math.PI*2),end=0;for(const item of summary.classes){end+=item.count/summary.total*Math.PI*2;if(angle<end){canvas.title=`${item.name}: ${item.count}명 (${(item.count/summary.total*100).toFixed(1)}%)`;break;}}});
new ResizeObserver(draw).observe(frame);
window.addEventListener('guild-theme-change',draw);
window.addEventListener('guild-members-data',event=>render(event.detail));
if(typeof memberData!=='undefined' && memberData)render(memberData);
