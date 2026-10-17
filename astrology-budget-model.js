import {astrologyModel} from './astrology-model.js?v=20261018-126';

export function thresholdProbability(model,current,target,budget){
  if(current>=target)return 1;
  const limit=Math.floor(budget/10),rows=Array.from({length:target},()=>new Float64Array(limit+1));
  for(let b=0;b<=limit;b++)for(let k=target-1;k>=current;k--){
    const before=b-model.costs[k]/10;if(before<0)continue;
    const p=model.transitions[k];let sum=0;
    for(let hits=0;hits<p.length;hits++)sum+=p[hits]*(k+hits>=target?1:rows[k+hits][before]);
    rows[k][b]=sum;
  }
  return rows[current][limit];
}

export function recommendAstrology(stars,counts,budget,stat){
  if(!Number.isInteger(budget)||budget<0||budget>10000||budget%10||counts.length!==stars.length||counts.some((k,i)=>!Number.isInteger(k)||k<0||k>stars[i].central))throw new RangeError('Invalid astrology budget state');
  const models=stars.map(s=>astrologyModel(s)),dimensions=stars.map((s,i)=>s.central-counts[i]+1),strides=[];
  let size=1;for(const dimension of dimensions){strides.push(size);size*=dimension;}
  const gains=stars.map((s,i)=>Array.from({length:s.central+1},(_,k)=>{
    let value=0;
    for(let j=counts[i];j<k;j++)if(s.effects[j]?.[0]===stat)value+=s.effects[j][1];
    if(k===s.central&&counts[i]<s.central)for(const effect of s.completion)if(effect[0]===stat)value+=effect[1];
    return value;
  }));
  const utilities=new Float64Array(size),states=Array.from({length:size},()=>[]);
  for(let state=0;state<size;state++)for(let i=0;i<stars.length;i++){
    const k=counts[i]+Math.floor(state/strides[i])%dimensions[i];utilities[state]+=gains[i][k];
    if(k<stars[i].central)states[state].push({i,cost:models[i].costs[k]/10,p:models[i].transitions[k],stride:strides[i]});
  }
  // Bellman recurrence includes failures, multi-hit rolls, changing lock costs and switching after each observed roll.
  const limit=budget/10,values=new Float64Array((limit+1)*size);
  function actionValue(state,action,b){
    const before=b-action.cost;if(before<0)return null;
    let value=0;
    for(let hits=0;hits<action.p.length;hits++){
      const next=state+hits*action.stride;
      value+=action.p[hits]*(utilities[next]-utilities[state]+values[before*size+next]);
    }
    return value;
  }
  for(let b=1;b<=limit;b++)for(let state=0;state<size;state++){
    let best=0;
    for(const action of states[state]){const value=actionValue(state,action,b);if(value!==null&&value>best)best=value;}
    values[b*size+state]=best;
  }
  const actions=stars.map((s,i)=>{const action=states[0].find(a=>a.i===i);return action?actionValue(0,action,limit):null;});
  const best=values[limit*size],choice=best>1e-12?actions.findIndex(v=>v!==null&&Math.abs(v-best)<1e-10):-1;
  const comparisons=stars.map((s,i)=>{
    const k=counts[i],probabilities=s.effects.map((_,j)=>j<k?1:thresholdProbability(models[i],k,j+1,budget));
    const effects={};
    for(let j=k;j<s.central;j++){const effect=s.effects[j];if(effect)effects[effect[0]]=(effects[effect[0]]||0)+probabilities[j]*effect[1];}
    if(k<s.central)for(const effect of s.completion)effects[effect[0]]=(effects[effect[0]]||0)+probabilities[s.central-1]*effect[1];
    return {next:k<s.central?probabilities[k]:1,completion:probabilities[s.central-1],effects};
  });
  return {choice,best,actions,comparisons};
}
