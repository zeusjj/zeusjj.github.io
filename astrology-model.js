// Sequential weighted draws without replacement; all central hits are locked after each roll.
export function astrologyTransition(central,outer,outerWeight,locked){
  if(!Number.isInteger(central)||central<1||!Number.isInteger(outer)||outer<central||!Number.isFinite(outerWeight)||outerWeight<=0||!Number.isInteger(locked)||locked<0||locked>central)throw new RangeError('Invalid astrology state');
  const remaining=central-locked;
  let probabilities=new Float64Array(remaining+1);probabilities[0]=1;
  for(let draw=0;draw<remaining;draw++){
    const next=new Float64Array(remaining+1);
    for(let hits=0;hits<=draw;hits++){
      const centerLeft=remaining-hits,outerLeft=outer-(draw-hits),chance=centerLeft/(centerLeft+outerWeight*outerLeft),mass=probabilities[hits];
      next[hits]+=mass*(1-chance);next[hits+1]+=mass*chance;
    }
    probabilities=next;
  }
  return probabilities;
}

export function astrologyModel({central,outer,outerWeight,outerWeights,baseCost,lockCost:recordedLockCost=10},lockCost=recordedLockCost){
  if(!Number.isInteger(baseCost)||baseCost<=0||baseCost%10||!Number.isInteger(lockCost)||lockCost<0||lockCost%10)throw new RangeError('Invalid astrology cost');
  const transitions=Array.from({length:central},(_,locked)=>astrologyTransition(central,outer,outerWeights?.[locked]??outerWeight,locked)),costs=Array.from({length:central},(_,k)=>baseCost+lockCost*k),means=Array(central+1).fill(0),quantiles=Array.from({length:central+1},()=>[0,0,0]);
  for(let k=central-1;k>=0;k--){
    const p=transitions[k];let future=0;
    for(let hits=1;hits<p.length;hits++)future+=p[hits]*means[k+hits];
    means[k]=(costs[k]+future)/(1-p[0]);
  }
  // Budget-lattice CDF: F_k(b) = sum_j P_k(j) F_(k+j)(b-cost_k).
  const limit=Math.max(100,Math.ceil(means[0]*20/10)),cdf=Array.from({length:central},()=>new Float64Array(limit+1)),thresholds=[.5,.9,.95];
  for(let k=0;k<central;k++)quantiles[k]=[null,null,null];
  let unfinished=central*thresholds.length;
  for(let budget=1;budget<=limit&&unfinished;budget++){
    for(let k=central-1;k>=0;k--){
      const previous=budget-costs[k]/10;if(previous<0)continue;
      const p=transitions[k];let probability=0;
      for(let hits=0;hits<p.length;hits++)probability+=p[hits]*(k+hits===central?1:cdf[k+hits][previous]);
      cdf[k][budget]=Math.min(1,Math.max(cdf[k][budget-1],probability));
      for(let i=0;i<thresholds.length;i++)if(quantiles[k][i]===null&&cdf[k][budget]>=thresholds[i]){quantiles[k][i]=budget*10;unfinished--;}
    }
  }
  if(unfinished)throw new Error('Astrology quantile convergence failed');
  const nextMeans=Array(central+1).fill(0),nextQuantiles=Array.from({length:central+1},()=>[0,0,0]);
  for(let k=0;k<central;k++){
    const failure=transitions[k][0];
    nextMeans[k]=costs[k]/(1-failure);
    nextQuantiles[k]=thresholds.map(q=>Math.ceil(Math.log1p(-q)/Math.log(failure))*costs[k]);
  }
  return {central,transitions,costs,means,quantiles,nextMeans,nextQuantiles};
}

export function astrologyDistribution(model,current,target,limit){
  const units=Math.ceil(limit/10),cdf=new Float64Array(units+1);
  if(current>=target){cdf.fill(1);return cdf;}
  if(target===current+1){
    for(let b=0;b<=units;b++)cdf[b]=1-model.transitions[current][0]**Math.floor(b*10/model.costs[current]);
    return cdf;
  }
  const rows=Array.from({length:target},()=>new Float64Array(units+1));
  for(let b=0;b<=units;b++)for(let k=target-1;k>=current;k--){
    const before=b-model.costs[k]/10;if(before<0)continue;
    const p=model.transitions[k];let probability=0;
    for(let hits=0;hits<p.length;hits++)probability+=p[hits]*(k+hits>=target?1:rows[k+hits][before]);
    rows[k][b]=probability;
  }
  return rows[current];
}
