import {craftingMaterials,craftingComparison} from './crafting-cost-model.js?v=20261019-175';

const storageKey='guild-crafting-material-prices-v1',prices={};
const number=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:4});
const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');for(const key of Object.keys(craftingMaterials))if(typeof saved?.[key]==='number'&&Number.isFinite(saved[key])&&saved[key]>=0)prices[key]=saved[key];}catch{}
const sections=[];
const format=value=>number.format(value);
const threshold=value=>Number.isInteger(value*10000)?format(value):format(Math.floor(value*1000)/1000)+'…';
function render(section){
  const result=craftingComparison(prices,section.dataset.craftKind),body=section.querySelector('tbody'),summary=section.querySelector('.crafting-recommendation');
  const fragment=document.createDocumentFragment();
  for(const row of result.rows){
    const tr=node('tr');tr.dataset.recipe=row.id;tr.dataset.status=row.status;
    if(result.recommendations.some(item=>item.status==='cheaper'&&item.best.some(best=>best.id===row.id)))tr.dataset.best='true';
    const heading=node('th');heading.scope='row';heading.append(node('strong',row.equipment),node('small',craftingMaterials[row.material].name+' '+row.required+'개 → '+row.output+' '+row.quantity+'개'));tr.append(heading);
    for(const [label,value]of [
      ['제작 재료비',row.cost===null?'—':format(row.cost)+' 다이아'],
      ['획득 1개당 비용',row.unitCost===null?'—':format(row.unitCost)+' 다이아'],
      ['재료 1개 손익분기',threshold(row.threshold)+' 다이아'],
    ]){const td=node('td',value);td.dataset.label=label;tr.append(td);}
    const comparison=node('td');comparison.dataset.label='기준 시세와 비교';
    const labels={empty:'시세 입력 전',equal:'같은 비용',cheaper:'제작이 저렴',expensive:'제작이 비쌈'};
    comparison.append(node('strong',labels[row.status]));
    if(row.saving!==null)comparison.append(node('small',row.status==='equal'?'손익분기 가격':format(Math.abs(row.saving))+' 다이아 '+(row.saving>0?'절약':'추가')+' / 제작 1회'));
    tr.append(comparison);fragment.append(tr);
  }
  body.replaceChildren(fragment);summary.replaceChildren();
  for(const item of result.recommendations){
    const line=node('p');line.append(node('strong',item.output+' '));
    if(item.status==='empty')line.append('재료 시세를 입력해주세요.');
    else if(item.status==='cheaper')line.append(item.best.map(row=>row.equipment).join(' 또는 ')+' 제작·분해가 유리합니다. 획득 1개당 '+format(item.best[0].unitCost)+' 다이아');
    else line.append('입력한 시세에서는 기준 시세보다 저렴한 제작 경로가 없습니다.');
    summary.append(line);
  }
}
for(const kind of ['sinkwa','fate']){
  const section=document.querySelector('[data-craft-kind="'+kind+'"]');
  const materials=kind==='fate'?['gem']:['iron','leather'];
  const inputs=node('div',undefined,'crafting-inputs');
  for(const material of materials){
    const label=node('label',craftingMaterials[material].name+' 1개 시세'),field=node('span',undefined,'crafting-price-field');
    const input=node('input');input.type='number';input.min='0';input.step='any';input.inputMode='decimal';input.id='crafting-price-'+material;input.placeholder='시세 입력';
    if(Object.hasOwn(prices,material))input.value=String(prices[material]);
    label.htmlFor=input.id;field.append(input,node('span','다이아'));label.append(field);inputs.append(label);
    input.addEventListener('input',()=>{
      const value=input.valueAsNumber,valid=input.value!==''&&input.validity.valid&&Number.isFinite(value)&&value>=0;
      input.setAttribute('aria-invalid',String(input.value!==''&&!valid));
      if(valid)prices[material]=value;else delete prices[material];
      try{localStorage.setItem(storageKey,JSON.stringify(prices));}catch{}
      for(const target of sections)render(target);
    });
  }
  section.querySelector('.crafting-controls').append(inputs);sections.push(section);render(section);
}
