import {recommendAstrology} from './astrology-budget-model.js?v=20261027-six-stars';
self.onmessage=({data})=>{
  try{self.postMessage({id:data.id,result:recommendAstrology(data.stars,data.counts,data.budget,data.stat)});}
  catch{self.postMessage({id:data.id,error:true});}
};
