import {astrologyConstellations} from './astrology-data.js?v=20261018-127';
import {astrologyModel} from './astrology-model.js?v=20261018-127';
import {distributionChart} from './astrology-distribution.js?v=20261018-136';
const host=document.getElementById('astrology-rows'),number=new Intl.NumberFormat('ko-KR');
const storageKey='guild-astrology-central-v1';let saved={};
try{const value=JSON.parse(localStorage.getItem(storageKey));if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const effectText=effect=>effect?effect[0]+' +'+effect[1]:'효과 확인 중';
for(const star of astrologyConstellations){
  const model=astrologyModel(star),row=make('section',undefined,'astrology-row'),main=make('div',undefined,'astrology-row-main'),state=make('div',undefined,'astrology-state'),heading=make('div',undefined,'astrology-state-heading'),label=make('label',star.name),output=make('output'),slider=make('input');
  const rollCost=make('div',undefined,'astrology-roll-cost'),sectionHeader=make('header',undefined,'astrology-section-header'),sectionTitle=make('h2',star.name),sectionProgress=make('p',undefined,'astrology-section-progress'),effectHeading=make('h3','현재 단계 · 효과','astrology-column-title');
  sectionHeader.append(sectionTitle,sectionProgress);label.textContent='현재 중앙 별';state.append(effectHeading);
  row.setAttribute('aria-label',star.name);label.htmlFor='astrology-'+star.id;slider.id=label.htmlFor;slider.type='range';slider.min='0';slider.max=String(star.central);slider.step='1';slider.value=String(Number.isInteger(saved[star.id])&&saved[star.id]>=0&&saved[star.id]<=star.central?saved[star.id]:0);slider.setAttribute('aria-label',star.name+' 현재 중앙 별 개수');output.htmlFor=slider.id;heading.append(label,output);state.append(heading,slider,rollCost);main.append(state);
  const values=[],budgetRows=[],charts=[];
  for(let target=0;target<2;target++){
    const budgetRow=make('div',undefined,'astrology-budget-row'),title=make('h4'),cells=[];
    budgetRows.push(title);budgetRow.append(title);
    for(const [index,label] of ['평균 예상 비용','운 보통','운 나쁨','운 매우 나쁨'].entries()){
      const metric=make('dl',undefined,'astrology-metric'+(index===0?' astrology-metric-mean':index===3?' astrology-metric-tail':'')),value=make('dd'),term=make('dt',label);
      if(index>0)term.append(make('small','('+[50,90,95][index-1]+'%가 이 예산 안에 달성)'));
      metric.append(term,value);cells.push(value);budgetRow.append(metric);
    }
    const chart=distributionChart();charts.push(chart);budgetRow.append(chart.element);
    values.push(cells);main.append(budgetRow);
  }
  const next=make('p',undefined,'astrology-next-effect'),completionBox=make('div',undefined,'astrology-completion'),completion=make('table',undefined,'astrology-stat-table astrology-completion-table'),completionBody=make('tbody'),completionStatus=make('p',undefined,'astrology-completion-status');
  completion.append(make('caption','완성 효과'),completionBody);
  for(const [stat,value]of star.completion){const tr=make('tr'),th=make('th',stat);th.scope='row';tr.append(th,make('td','+'+value));completionBody.append(tr);}
  const details=make('table',undefined,'astrology-stat-table astrology-effect-details'),list=make('tbody'),items=[],statuses=[],effectCaption=make('caption','개수별 달성 효과'),effectCount=make('small');effectCaption.append(effectCount);details.append(effectCaption,list);
  star.effects.forEach((effect,index)=>{const item=make('tr'),th=make('th'),status=make('small',undefined,'astrology-effect-status');th.scope='row';th.append(make('span',(index+1)+'개 일치'),status);item.append(th,make('td',effectText(effect)));items.push(item);statuses.push(status);list.append(item);});
  const effectScroll=make('div',undefined,'astrology-effect-scroll');effectScroll.tabIndex=0;effectScroll.setAttribute('aria-label',star.name+' 개수별 달성 효과');effectScroll.append(details);
  completionBox.append(completion,completionStatus);state.append(completionBox,next,effectScroll);row.append(sectionHeader,main);host.append(row);
  function update(){
    const current=Number(slider.value);output.textContent=current+' / '+star.central;slider.setAttribute('aria-valuetext','중앙 '+current+'개, 전체 '+star.central+'개');
    sectionProgress.textContent=current===star.central?'중앙 '+star.central+'개 모두 완성':current+'개 달성 · '+(star.central-current)+'개 남음';
    rollCost.textContent=current===star.central?'추가 점성술 없음':'현재 1회 '+number.format(model.costs[current])+'개 · 중앙 추가 등장 '+((1-model.transitions[current][0])*100).toFixed(1)+'%';
    budgetRows[0].textContent=current===star.central?'다음 단계 없음':(current+1)+'개 완성 예산';
    budgetRows[1].textContent='활성화 완료 예산';
    budgetRows[1].title='중앙 '+star.central+'개 전체 일치';
    const amounts=[[model.nextMeans[current],...model.nextQuantiles[current]],[model.means[current],...model.quantiles[current]]];
    values.forEach((cells,target)=>cells.forEach((cell,index)=>cell.replaceChildren(document.createTextNode(number.format(Math.max(0,Math.ceil(amounts[target][index]-1e-9)))),make('small','개'))));
    charts[0].update(model,current,Math.min(current+1,star.central),budgetRows[0].textContent);
    charts[1].update(model,current,star.central,budgetRows[1].textContent);
    next.replaceChildren(make('strong',current===star.central?'완성':'다음 '+(current+1)+'개 일치'),document.createTextNode(current===star.central?'추가 소모 없음':effectText(star.effects[current])));
    completion.dataset.achieved=String(current===star.central);
    completionBox.dataset.achieved=String(current===star.central);completionBox.dataset.next=String(current===star.central-1);
    completionStatus.textContent=current===star.central?'완성 효과 활성화':current===star.central-1?'다음 1개 달성 시 활성화':star.central+'개 모두 일치하면 활성화';
    effectCount.textContent=current+' / '+star.central+' 달성';
    items.forEach((item,index)=>{item.dataset.achieved=String(index<current);item.dataset.next=String(index===current);statuses[index].textContent=index<current?'획득':index===current?'다음':'';if(index===current)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
    row.dataset.current=String(current);
  }
  slider.addEventListener('input',()=>{update();saved[star.id]=Number(slider.value);try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}});update();
}
import('./astrology-budget.js?v=20261018-136');
