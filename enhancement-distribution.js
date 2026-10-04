import * as poissonLibrary from './vendor/stdlib-poisson.js';
import {ENHANCEMENT_PROBABILITIES} from './enhancement-model.js';

export const SAMPLE_COUNT = 100000;
const MAX_STATES = 120000;
const gcd = (a,b) => b ? gcd(b,a%b) : a;

function cycleOutcomes(kind,target) {
  let survival=1;
  const failures=[];
  ENHANCEMENT_PROBABILITIES[kind].slice(0,target).forEach((p,index)=>{
    const probability=survival*(1-p);
    if(probability>0)failures.push({stage:index+1,probability});
    survival*=p;
  });
  return {survival,failures};
}

export function exactCostDistribution(kind,target,itemPrice,scrollPrice,mean) {
  const {survival,failures}=cycleOutcomes(kind,target);
  const item=Math.round(itemPrice*100),scroll=Math.round(scrollPrice*100);
  const successCost=item+target*scroll;
  const thresholds=[.25,.5,.75];
  if(!failures.length)return {quantiles:thresholds.map(()=>successCost/100),overMean:0,overDoubleMean:0,method:'exact'};
  if(failures.length===1) {
    const failureCost=item+failures[0].stage*scroll;
    const logFailure=Math.log1p(-survival);
    const quantiles=thresholds.map(q=>(successCost+Math.max(0,Math.ceil(Math.log1p(-q)/logFailure)-1)*failureCost)/100);
    const tail=budget=>budget*100<successCost?1:Math.exp((Math.floor((budget*100-successCost+1e-7)/failureCost)+1)*logFailure);
    return {quantiles,overMean:tail(mean),overDoubleMean:tail(2*mean),method:'exact'};
  }
  const costs=failures.map(outcome=>item+outcome.stage*scroll);
  const unit=costs.reduce(gcd);
  const required=Math.max(0,Math.floor((2*mean*100-successCost+1e-7)/unit));
  // Large expected costs need too many lattice states; use the exact-law sampler.
  if(Math.max(required,(4*mean*100-successCost)/unit)>MAX_STATES)return null;
  const weights=costs.map((cost,index)=>({cost:cost/unit,probability:failures[index].probability}));
  const masses=new Float64Array(MAX_STATES+1);masses[0]=survival;
  let cdf=0,next=0,atMean=0,atDouble=0;
  const quantiles=[];
  for(let n=0;n<=MAX_STATES;n++) {
    if(n)for(const outcome of weights)if(n>=outcome.cost)masses[n]+=outcome.probability*masses[n-outcome.cost];
    cdf+=masses[n];
    const cost=successCost+n*unit;
    if(cost<=mean*100+1e-7)atMean=cdf;
    if(cost<=2*mean*100+1e-7)atDouble=cdf;
    while(next<thresholds.length && cdf+1e-12>=thresholds[next]){quantiles.push(cost/100);next++;}
    if(next===thresholds.length && n>=required)return {quantiles,overMean:Math.max(0,1-atMean),overDoubleMean:Math.max(0,1-atDouble),method:'exact'};
  }
  return null;
}

export function sampleRetryCounts(kind,target,count=SAMPLE_COUNT,seed=7193+target) {
  const {survival,failures}=cycleOutcomes(kind,target);
  const poisson=(globalThis.poisson || poissonLibrary.default).factory({seed});
  const uniform=poisson.PRNG.normalized;
  const items=new Float64Array(count),scrolls=new Float64Array(count);
  // Negative multinomial failure counts before the first successful cycle:
  // E~Exp(1); conditional on E, each count is independently Poisson(E*r_j/P).
  // This samples the retry law without looping through billions of failures.
  for(let i=0;i<count;i++) {
    const exposure=-Math.log1p(-uniform())/survival;
    let purchased=1,used=target;
    for(const outcome of failures) {
      const lambda=exposure*outcome.probability;
      const failuresAtStage=lambda>0?poisson(lambda):0;
      purchased+=failuresAtStage;used+=outcome.stage*failuresAtStage;
    }
    items[i]=purchased;scrolls[i]=used;
  }
  return {items,scrolls};
}

export function sampledCostDistribution(counts,itemPrice,scrollPrice,mean) {
  const values=new Float64Array(counts.items.length);
  let overMean=0,overDoubleMean=0;
  for(let i=0;i<values.length;i++) {
    const cost=(counts.items[i]*Math.round(itemPrice*100)+counts.scrolls[i]*Math.round(scrollPrice*100))/100;
    values[i]=cost;
    if(cost>mean+1e-9)overMean++;
    if(cost>2*mean+1e-9)overDoubleMean++;
  }
  values.sort();
  return {quantiles:[.25,.5,.75].map(q=>values[Math.ceil(q*values.length)-1]),
    overMean:overMean/values.length,overDoubleMean:overDoubleMean/values.length,method:'sampled',samples:values.length};
}
