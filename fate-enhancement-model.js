import {fatePrices} from './fate-price-data.js';
import {ENHANCEMENT_PROBABILITIES} from './enhancement-model.js';
import * as poissonLibrary from './vendor/stdlib-poisson.js';
export const FATE_SAMPLE_COUNT=40000;
export const FATE_RETAIL_PRICE=0.5;
export function fateOutcomes(tier){
 const item=fatePrices.find(row=>row.grade==='희귀 T'+tier);if(!item)throw new RangeError('Invalid tier');
 const outcomes=[];let survival=1;
 ENHANCEMENT_PROBABILITIES.accessory.forEach((p,i)=>{const probability=survival*(1-p);if(probability)outcomes.push({stage:i,scrolls:i+1,flow:item.flows[Math.max(0,i-1)],probability});survival*=p;});
 outcomes.push({stage:12,scrolls:12,flow:item.flows[11],probability:survival});
 return {baseFlow:item.flows[0],outcomes};
}
export function fateExpectation({tier,quantity,itemPrice,scrollPrice}){
 if(!Number.isInteger(quantity)||quantity<1||quantity>1000||!Number.isFinite(itemPrice)||itemPrice<=0||!Number.isFinite(scrollPrice)||scrollPrice<0||scrollPrice>10)throw new RangeError('Invalid inputs');
 const {baseFlow,outcomes}=fateOutcomes(tier);
 const mean=key=>outcomes.reduce((s,o)=>s+o.probability*o[key],0),flow=mean('flow'),scrolls=mean('scrolls');
 const cost=quantity*(itemPrice+scrollPrice*scrolls),totalFlow=quantity*flow,baselineCost=quantity*itemPrice,baselineFlow=quantity*baseFlow;
 return {outcomes,baseFlow,flow:totalFlow,scrolls:quantity*scrolls,cost,baselineCost,baselineFlow,retailPrice:FATE_RETAIL_PRICE,retailCost:totalFlow*FATE_RETAIL_PRICE,efficiency:totalFlow*FATE_RETAIL_PRICE/cost,unitCost:cost/totalFlow,breakEvenScroll:(flow*FATE_RETAIL_PRICE-itemPrice)/scrolls,flowVariance:quantity*outcomes.reduce((s,o)=>s+o.probability*(o.flow-flow)**2,0)};
}
export function sampleFateBatches(tier,quantity,count=FATE_SAMPLE_COUNT,seed=1102){
 const {outcomes}=fateOutcomes(tier),cdf=[];let probability=0;
 for(const o of outcomes)cdf.push(probability+=o.probability);
 const uniform=(globalThis.poisson||poissonLibrary.default).factory({seed}).PRNG.normalized;
 const flow=new Float64Array(count),scrolls=new Float64Array(count);
 // Sample the joint stopping-stage law; reward and paid scrolls must stay paired.
 for(let run=0;run<count;run++)for(let n=0;n<quantity;n++){const u=uniform();let i=0;while(i<cdf.length-1&&u>cdf[i])i++;flow[run]+=outcomes[i].flow;scrolls[run]+=outcomes[i].scrolls;}
 return {flow,scrolls};
}
export function fateDistribution(values){
 const sorted=Float64Array.from(values).sort(),size=sorted.length;
 const at=q=>sorted[Math.max(0,Math.ceil(q*size)-1)],low=sorted[0],high=Math.max(low+1e-9,at(.999));
 const bins=Array.from({length:28},(_,i)=>({low:low+(high-low)*i/28,high:low+(high-low)*(i+1)/28,probability:0,tail:i===27}));
 for(const value of sorted)bins[Math.min(27,Math.floor((value-low)/(high-low)*28))].probability+=1/size;
 return {quantiles:[.05,.5,.95].map(at),bins,min:low,max:high};
}
export function summarizeFate(options,samples){
 const expected=fateExpectation(options),efficiencies=new Float64Array(samples.flow.length);let better=0;
 for(let i=0;i<efficiencies.length;i++){const cost=options.quantity*options.itemPrice+samples.scrolls[i]*options.scrollPrice;efficiencies[i]=samples.flow[i]*FATE_RETAIL_PRICE/cost;if(efficiencies[i]>1+1e-12)better++;}
 return {expected,efficiency:fateDistribution(efficiencies),flow:fateDistribution(samples.flow),betterProbability:better/efficiencies.length,samples:efficiencies.length};
}
