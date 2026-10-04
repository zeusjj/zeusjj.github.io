import {enhancementCosts} from './enhancement-model.js';
import {exactCostDistribution,sampleRetryCounts,sampledCostDistribution} from './enhancement-distribution.js';

const countsCache=new Map();
let latest=0;
self.onmessage=async ({data})=>{
  latest=data.id;
  const {id,kind,itemPrice,scrollPrice}=data;
  try {
    for(const row of enhancementCosts(kind,itemPrice,scrollPrice).filter(row=>row.successProbability<1 && row.target<=8)) {
      if(id!==latest)return;
      let distribution=exactCostDistribution(kind,row.target,itemPrice,scrollPrice,row.mean);
      if(!distribution) {
        const key=kind+':'+row.target;
        if(!countsCache.has(key))countsCache.set(key,sampleRetryCounts(kind,row.target));
        distribution=sampledCostDistribution(countsCache.get(key),itemPrice,scrollPrice,row.mean);
      }
      self.postMessage({id,target:row.target,...distribution});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(id===latest)self.postMessage({id,done:true});
  } catch {self.postMessage({id,error:true});}
};
