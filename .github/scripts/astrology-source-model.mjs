export const sourceRoot='https://lim.com2us.com/0ff0ef099ecb754b08b36053f2a8327f0d5b470cc3656c9fd043b9d1a2d719f5';
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const numeric=value=>/^\d+(?:\.\d+)?(?:개)?$/.test(clean(value).replaceAll(',',''))?Number(clean(value).replaceAll(',','').replace(/개$/,'')):NaN;
const fields=new Map([
 ['중앙 별 개수','central'],['중앙 별 갯수','central'],['외곽 별 개수','outer'],['외곽 별 갯수','outer'],
 ['외곽 별 가중치','outerWeight'],['기본 비용','baseCost'],['잠금 비용','lockCost'],
]);

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
 if(!Number.isFinite(spec.outerWeight)||spec.outerWeight<=0||spec.outerWeight>10)errors.push('외곽 별 가중치');
 if(!Number.isInteger(spec.baseCost)||spec.baseCost<=0||spec.baseCost>1000||spec.baseCost%10)errors.push('기본 비용');
 if(!Number.isInteger(spec.lockCost)||spec.lockCost<0||spec.lockCost>100||spec.lockCost%10)errors.push('잠금 비용');
 const validEffect=e=>Array.isArray(e)&&e.length===2&&typeof e[0]==='string'&&e[0].length>0&&e[0].length<=50&&Number.isFinite(e[1])&&e[1]>0&&e[1]<=10000;
 if(!Array.isArray(spec.effects)||spec.effects.length!==central||Array.from({length:central},(_,i)=>spec.effects[i]).some(e=>!validEffect(e)))errors.push('단계별 효과');
 if(!Array.isArray(spec.completion)||!spec.completion.length||!spec.completion.every(validEffect))errors.push('완성 효과');
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
