import {fateExpectation,sampleFateBatches,summarizeFate} from './fate-enhancement-model.js?v=20261102-retail';
let key='',samples;
self.onmessage=({data:{id,options}})=>{
 try{fateExpectation(options);const next=options.tier+':'+options.quantity;if(next!==key){samples=sampleFateBatches(options.tier,options.quantity);key=next;}self.postMessage({id,result:summarizeFate(options,samples)});}
 catch{self.postMessage({id,error:true});}
};
