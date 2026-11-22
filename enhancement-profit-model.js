import {ENHANCEMENT_PROBABILITIES} from './enhancement-model.js';

export const PROFIT_DEFAULTS=Object.freeze({itemPrice:40,blessingPrice:200,rewards:Object.freeze({8:400,9:1500,10:4000})});

export function compareEnhancementProfit({itemPrice,blessingPrice,rewards}){
  if(![itemPrice,blessingPrice,...[8,9,10].map(level=>rewards?.[level])].every(value=>Number.isFinite(value)&&value>=0))throw new RangeError('Prices and rewards must be finite and nonnegative.');
  const rates=ENHANCEMENT_PROBABILITIES.equipment;
  function strategy(target,blessed){
    let successProbability=0,expectedPayout=0,expectedCost=itemPrice;
    const outcomes={};
    function visit(level,probability){
      if(probability===0)return;
      if(level>=target){
        // An 8-level target may overshoot to 9; pay the reward for the actual result.
        outcomes[level]=(outcomes[level]??0)+probability;
        successProbability+=probability;expectedPayout+=probability*rewards[level];return;
      }
      const success=probability*rates[level];
      if(blessed&&level===7){expectedCost+=probability*blessingPrice;visit(8,success/2);visit(9,success/2);}
      else visit(level+1,success);
    }
    visit(0,1);
    return {target,blessed,successProbability,expectedPayout,expectedCost,profit:expectedPayout-expectedCost,outcomes};
  }
  return [8,9,10].map(target=>({target,normal:strategy(target,false),blessed:strategy(target,true)}));
}
