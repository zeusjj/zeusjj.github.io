import {astrologyConstellations} from './astrology-data.js?v=20261018-125';
import {astrologyModel} from './astrology-model.js?v=20261018-125';
const host=document.getElementById('astrology-rows'),number=new Intl.NumberFormat('ko-KR');
const storageKey='guild-astrology-central-v1';let saved={};
try{const value=JSON.parse(localStorage.getItem(storageKey));if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const effectText=effect=>effect?effect[0]+' +'+effect[1]:'효과 확인 중';
for(const star of astrologyConstellations){
  const model=astrologyModel(star),row=make('section',undefined,'astrology-row'),main=make('div',undefined,'astrology-row-main'),state=make('div',undefined,'astrology-state'),heading=make('div',undefined,'astrology-state-heading'),label=make('label',star.name),output=make('output'),slider=make('input');
  const rollCost=make('div',undefined,'astrology-roll-cost');
  row.setAttribute('aria-label',star.name);label.htmlFor='astrology-'+star.id;slider.id=label.htmlFor;slider.type='range';slider.min='0';slider.max=String(star.central);slider.step='1';slider.value=String(Number.isInteger(saved[star.id])&&saved[star.id]>=0&&saved[star.id]<=star.central?saved[star.id]:0);slider.setAttribute('aria-label',star.name+' 현재 중앙 별 개수');output.htmlFor=slider.id;heading.append(label,output);state.append(heading,slider,rollCost);main.append(state);
  const values=[];
  for(const [index,title] of ['평균 소모량','50% 완료 예산','90% 완료 예산','95% 완료 예산'].entries()){
    const metric=make('dl',undefined,'astrology-metric'+(index===0?' astrology-metric-mean':index===3?' astrology-metric-tail':'')),value=make('dd');metric.append(make('dt',title),value);values.push(value);main.append(metric);
  }
  const effects=make('div',undefined,'astrology-effects'),next=make('span'),completion=make('span');completion.append(make('strong','완성 효과'),document.createTextNode(star.completion.map(effectText).join(' · ')));effects.append(next,completion);
  const details=make('details',undefined,'astrology-effect-details'),list=make('ol'),items=[];details.append(make('summary','중앙 개수별 달성 효과'),list);
  star.effects.forEach((effect,index)=>{const item=make('li');item.append(make('span',(index+1)+'개 일치'),make('span',effectText(effect)));items.push(item);list.append(item);});
  row.append(main,effects,details);host.append(row);
  function update(){
    const current=Number(slider.value);output.textContent=current+' / '+star.central;slider.setAttribute('aria-valuetext','중앙 '+current+'개, 전체 '+star.central+'개');
    rollCost.textContent=current===star.central?'추가 점성술 없음':'현재 1회 '+number.format(model.costs[current])+'개 · 중앙 추가 등장 '+((1-model.transitions[current][0])*100).toFixed(1)+'%';
    const amounts=[model.means[current],...model.quantiles[current]];
    values.forEach((cell,index)=>cell.replaceChildren(document.createTextNode(number.format(Math.max(0,Math.ceil(amounts[index]-1e-9)))),make('small','개')));
    next.replaceChildren(make('strong',current===star.central?'완성':'다음 '+(current+1)+'개 일치'),document.createTextNode(current===star.central?'추가 소모 없음':effectText(star.effects[current])));
    items.forEach((item,index)=>item.dataset.achieved=String(index<current));
    row.dataset.current=String(current);
  }
  slider.addEventListener('input',()=>{update();saved[star.id]=Number(slider.value);try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}});update();
}
