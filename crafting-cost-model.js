import {sinkwaPrices} from './sinkwa-prices.js?v=20261019-185';
import {fatePrices} from './fate-prices.js?v=20261017-122';

export const craftingMaterials={iron:{name:'철',equipment:'무기'},leather:{name:'가죽',equipment:'방어구'},gem:{name:'보석',equipment:'장신구'}};
const grades=[{grade:'일반',required:10},{grade:'고급',required:30}];
const flowUnitPrice=fatePrices.find(row=>row.kind==='advanced').prices[0]/fatePrices.find(row=>row.kind==='advanced').flows[0];
export const craftingRecipes=Object.entries(craftingMaterials).flatMap(([material,item])=>grades.map(({grade,required})=>{
  const source=material==='gem'?fatePrices.find(row=>row.grade===grade):sinkwaPrices.find(row=>row.grade===grade);
  const output=material==='gem'?'운명의 흐름':source.material;
  const quantity=material==='gem'?source.flows[0]:source.amounts[0];
  return {id:material+'-'+grade,material,equipment:grade+' '+item.equipment,required,output,quantity,referenceUnit:material==='gem'?flowUnitPrice:source.unitPrice};
}));

export function craftingComparison(prices,kind){
  const rows=craftingRecipes.filter(recipe=>(recipe.material==='gem')===(kind==='fate')).map(recipe=>{
    const price=prices[recipe.material],valid=typeof price==='number'&&Number.isFinite(price)&&price>=0&&Number.isFinite(price*recipe.required);
    const benchmark=recipe.quantity*recipe.referenceUnit,cost=valid?price*recipe.required:null;
    const difference=valid?benchmark-cost:null;
    const epsilon=1e-9*Math.max(1,benchmark,cost||0);
    return {...recipe,cost,unitCost:valid?cost/recipe.quantity:null,threshold:benchmark/recipe.required,saving:difference,status:!valid?'empty':Math.abs(difference)<=epsilon?'equal':difference>0?'cheaper':'expensive'};
  });
  const recommendations=[...new Set(rows.map(row=>row.output))].map(output=>{
    const options=rows.filter(row=>row.output===output&&row.unitCost!==null);
    if(!options.length)return {output,best:[],status:'empty'};
    const minimum=Math.min(...options.map(row=>row.unitCost));
    const best=options.filter(row=>Math.abs(row.unitCost-minimum)<1e-9);
    return {output,best,status:best[0].status};
  });
  return {rows,recommendations};
}
