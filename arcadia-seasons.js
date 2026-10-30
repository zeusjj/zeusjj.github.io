(()=>{
 const day=86400000,epoch=Date.parse('2026-10-04T00:00:00Z');
 const iso=time=>new Date(time).toISOString().slice(0,10);
 function seasonFor(date){
  const time=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(time)||time<epoch)return null;
  const number=Math.floor((time-epoch)/(28*day))+1,start=epoch+(number-1)*28*day;
  return {number,start:iso(start),end:iso(start+27*day)};
 }
 function groups(data,identityCount,isHidden){
  const result=[];
  for(let index=identityCount;index<data.headers.length;index++){
   if(isHidden(index))continue;
   const festival=data.headers[index].match(/^(\d+차 제전) 기여$/),event=festival?data.headers.indexOf(festival[1]):-1;
   const season=seasonFor(data.dates?.[event>=0?event:index]?.start),key=season?.number??0,last=result.at(-1);
   if(last?.key===key)last.count++;else result.push({key,season,count:1});
  }
  return result;
 }
 globalThis.GuildArcadiaSeasons={seasonFor,groups};
})();
