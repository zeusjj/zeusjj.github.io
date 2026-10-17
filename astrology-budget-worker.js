import {astrologyConstellations} from './astrology-data.js?v=20261018-126';
import {recommendAstrology} from './astrology-budget-model.js?v=20261018-126';
self.onmessage=({data})=>{
  try{self.postMessage({id:data.id,result:recommendAstrology(astrologyConstellations,data.counts,data.budget,data.stat)});}
  catch{self.postMessage({id:data.id,error:true});}
};
