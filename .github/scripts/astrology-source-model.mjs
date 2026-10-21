import {astrologyTransition} from '../../astrology-model.js';
export const sourceRoot='https://lim.com2us.com/0ff0ef099ecb754b08b36053f2a8327f0d5b470cc3656c9fd043b9d1a2d719f5';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const numeric=value=>/^\d+(?:\.\d+)?(?:개)?$/.test(clean(value).replaceAll(',',''))?Number(clean(value).replaceAll(',','').replace(/개$/,'')):NaN;
const fields=new Map([
 ['중앙 별 개수','central'],['중앙 별 갯수','central'],['외곽 별 개수','outer'],['외곽 별 갯수','outer'],
 ['외곽 별 가중치','outerWeight'],['기본 비용','baseCost'],['잠금 비용','lockCost'],
]);
const localized=value=>{try{return JSON.parse(value).ko;}catch{return String(value);}};
export function parseOfficialPayload(name,payload){
 if(payload.code!==0||!Array.isArray(payload.result?.items))throw Error('Invalid official response');
 const items=payload.result.items;
 for(const item of items)if(item.item?.rows?.length!==item.totalCount)throw Error('Official table pagination incomplete');
 const category=items.find(i=>i.item.id==='AstrologyZodiac_1');
 if(!category)throw Error('Missing classification table');
 const tables=[[['점성술 분류','별자리 갯수'],...category.item.rows.map(r=>[localized(r.Category),r.Quantity])]];
 const known=classification(tables),central=known.get(name);
 const detail=items.find(i=>localized(i.title.ko??i.title)===name+' 옵션');
 const rates=items.find(i=>localized(i.title.ko??i.title)===name+' 옵션 확률');
 if(!detail||!rates||!central)throw Error('Missing official options/rates');
 const centers=detail.item.rows.filter(r=>localized(r.Category)==='별자리 옵션');
 const outside=detail.item.rows.filter(r=>localized(r.Category)==='별자리 외 옵션');
 if(centers.length!==central||centers.length+outside.length!==detail.totalCount||rates.item.rows.length!==central)throw Error('Official counts do not reconcile');
 const outer=outside.length,weights=[];
 const percent=s=>{if(typeof s!=='string'||!/^\d+(?:\.\d+)?%$/.test(s))throw Error('Invalid official percentage');return Number(s.slice(0,-1));};
 for(let k=0;k<central;k++){
  const r=rates.item.rows[k],label=localized(r.AstrologyOption);
  if(label!==(k===0?'잠금 없음':k+'개 잠금 시'))throw Error('Unexpected lock ordering');
  const a=percent(r.ZodiacSingleRate),b=percent(r.ExternalSingleRate),total=percent(r.ZodiacTotalRate),external=percent(r.ExternalTotalRate);
  let weight;
  // Recover the simplest rational consistent with all four rounded official percentages.
  for(let d=1;d<=1000;d++){
   const w=Math.round(b/a*d)/d,denominator=central-k+w*outer;
   if(w>0&&[100/denominator-a,100*w/denominator-b,100*(central-k)/denominator-total,100*w*outer/denominator-external].every(delta=>Math.abs(delta)<=0.000051)){weight=w;break;}
  }
  if(weight===undefined)throw Error('Official probabilities do not fit supported weighted draws');
  weights.push(weight);
 }
 return {known,spec:{name,central,outer,outerWeight:weights[0],outerWeights:weights}};
}

export function classification(tables){
 const result=new Map();
 for(const rows of tables){
  if(!rows[0]?.some(v=>clean(v)==='점성술 분류')||!rows[0]?.some(v=>/별자리 (개수|갯수)/.test(clean(v))))continue;
  for(const row of rows.slice(1)){
   const name=clean(row[0]),central=numeric(row[1]);
   if(!name.endsWith('자리')||!Number.isInteger(central)||central<1||central>30)throw Error('Invalid official constellation list');
   if(result.has(name)&&result.get(name)!==central)throw Error('Conflicting official counts');
   result.set(name,central);
  }
 }
 if(result.size<4)throw Error('Official constellation list is incomplete');
 return result;
}

// Only explicitly labelled values are accepted. Missing values are never inferred from adjacent stars.
export function parseSpecification(name,tables){
 const spec={name,effects:[],completion:[]};
 for(const rows of tables){
  for(const row of rows){
   const field=fields.get(clean(row[0]));
   if(field){const value=numeric(row[1]);if(field in spec&&spec[field]!==value)throw Error('Conflicting '+field);spec[field]=value;}
  }
  const headers=rows[0]?.map(clean)??[];
  if(headers.join('|')==='일치 개수|능력치|수치'){
   for(const row of rows.slice(1)){
    const stage=numeric(row[0]);
    if(!Number.isInteger(stage)||stage<1||stage>30||spec.effects[stage-1])throw Error('Invalid effect stage');
    spec.effects[stage-1]=[clean(row[1]),numeric(row[2])];
   }
  }
  if(headers.join('|')==='완성 효과|수치')for(const row of rows.slice(1))spec.completion.push([clean(row[0]),numeric(row[1])]);
 }
 return spec;
}

export function validateSpecification(spec,central){
 const errors=[];
 if(spec.central!==central)errors.push('중앙 별 개수');
 if(!Number.isInteger(spec.outer)||spec.outer<central||spec.outer>200)errors.push('외곽 별 개수');
 if(!Number.isFinite(spec.outerWeight)||spec.outerWeight<=0||spec.outerWeight>100)errors.push('외곽 별 가중치');
 if(spec.outerWeights!==undefined&&(!Array.isArray(spec.outerWeights)||spec.outerWeights.length!==central||spec.outerWeights.some(w=>!Number.isFinite(w)||w<=0||w>100)))errors.push('잠금별 확률');
 if(!Number.isInteger(spec.baseCost)||spec.baseCost<=0||spec.baseCost>1000||spec.baseCost%10)errors.push('기본 비용');
 if(!Number.isInteger(spec.lockCost)||spec.lockCost<0||spec.lockCost>100||spec.lockCost%10)errors.push('잠금 비용');
 const validEffect=e=>Array.isArray(e)&&e.length===2&&typeof e[0]==='string'&&e[0].length>0&&e[0].length<=50&&Number.isFinite(e[1])&&e[1]>0&&e[1]<=10000;
 if(!Array.isArray(spec.effects)||spec.effects.length!==central||Array.from({length:central},(_,i)=>spec.effects[i]).some(e=>!validEffect(e)))errors.push('단계별 효과');
 if(!Array.isArray(spec.completion)||!spec.completion.length||!spec.completion.every(validEffect))errors.push('완성 효과');
 if(!errors.length){
  const means=Array(central+1).fill(0);
  for(let k=central-1;k>=0;k--){
   const probabilities=astrologyTransition(central,spec.outer,spec.outerWeights?.[k]??spec.outerWeight,k);
   let future=0;for(let j=1;j<probabilities.length;j++)future+=probabilities[j]*means[k+j];
   means[k]=(spec.baseCost+spec.lockCost*k+future)/(1-probabilities[0]);
  }
  if(!Number.isFinite(means[0])||means[0]>600000)errors.push('확률·예산 계산 범위');
 }
 return errors;
}

export function mergeSpecifications(previous,discovered){
 const accepted=structuredClone(previous),pending=[];
 for(const item of discovered){
  const index=accepted.findIndex(s=>s.name===item.name),errors=validateSpecification(item.spec,item.central);
  if(errors.length){pending.push({name:item.name,central:item.central,url:item.url,missing:errors});continue;}
  const id=index>=0?accepted[index].id:'star-'+Array.from(item.name,c=>c.codePointAt(0).toString(16)).join('-');
  const candidate={id,...item.spec};
  const next=accepted.filter((_,i)=>i!==index).concat(candidate);
  // The exact multi-star budget solver has a finite memory/time budget.
  if(next.reduce((n,s)=>n*(s.central+1),1)>60000){pending.push({name:item.name,central:item.central,url:item.url,missing:['계산 규모 검증']});continue;}
  if(index>=0)accepted[index]=candidate;else accepted.push(candidate);
 }
 return {accepted,pending};
}
