import {craftingMaterials,craftingRecipes} from './crafting-cost-model.js?v=20261019-175';

const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
for(const section of document.querySelectorAll('[data-craft-kind]')){
  const body=section.querySelector('tbody');
  for(const recipe of craftingRecipes.filter(row=>(row.material==='gem')===(section.dataset.craftKind==='fate'))){
    const limit=recipe.quantity*recipe.referenceUnit/recipe.required;
    const price=limit===1/3?'1/3다이아 이하 (약 0.333)':limit+'다이아 이하';
    const row=node('tr');row.dataset.recipe=recipe.id;
    const heading=node('th',craftingMaterials[recipe.material].name+' 1개');heading.scope='row';row.append(heading);
    for(const [label,value] of [
      ['재료 시세 기준',price],
      ['제작·분해할 장비',recipe.equipment+(recipe.id==='gem-일반'?' · 추천':'')+' ('+craftingMaterials[recipe.material].name+' '+recipe.required+'개 사용)'],
      ...(section.dataset.craftKind==='fate'?[['제작 1회 재료비 상한',recipe.quantity*recipe.referenceUnit+'다이아']]:[]),
      ['획득 재료',recipe.output+' '+recipe.quantity+'개'],
    ]){const cell=node('td',value);cell.dataset.label=label;row.append(cell);}
    body.append(row);
  }
}
