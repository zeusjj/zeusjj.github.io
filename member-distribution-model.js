export const memberClasses=['버서커','나이트','레인저','어쌔신','아티산','블레','오라클','엘리'];
export function populatedLevelBins(members,limit=12){
 const counts=new Map();for(const member of members)counts.set(member.level,(counts.get(member.level)||0)+1);
 const observed=[...counts.keys()].sort((a,b)=>a-b);
 if(!observed.length)return [];
 let from=0,to=observed.length;
 if(observed.length>limit){
  const width=limit-2;let best=-1;
  // Reserve populated tails; spend the individual rows on the most members.
  for(let start=1;start+width<observed.length;start++){
   const score=observed.slice(start,start+width).reduce((sum,level)=>sum+counts.get(level),0);
   if(score>best){best=score;from=start;to=start+width;}
  }
 }
 const bins=[];
 if(from>0)bins.push({label:observed[from-1]+' 이하',max:observed[from-1],count:0,names:[]});
 for(const level of observed.slice(from,to))bins.push({label:String(level),max:level,count:0,names:[]});
 if(to<observed.length)bins.push({label:observed[to]+' 이상',max:Infinity,count:0,names:[]});
 for(const member of members){const bin=bins.find(bin=>member.level<=bin.max);bin.count++;bin.names.push(member.name);}
 return bins;
}
export function memberDistribution(data){
 const classIndex=data.headers.indexOf('클래스');
 const classes=memberClasses.map(name=>({name,count:0}));const counts=new Map(classes.map(item=>[item.name,item]));
 const growthColumns=data.headers.map((name,index)=>({name,index,date:data.dates?.[index]?.start || ''})).filter(item=>item.name==='성장도 기록').sort((a,b)=>b.date.localeCompare(a.date) || b.index-a.index);
 const latest=growthColumns.find(({index})=>data.members.some(row=>typeof row[index]==='number'&&Number.isFinite(row[index])&&row[index]>=0));
 const values=[],growthMembers=[],levelMembers=[];let missing=0,levelRecorded=0;
 for(const row of data.members){
  const name=counts.has(row[classIndex])?row[classIndex]:'미기록';if(!counts.has(name)){const item={name,count:0};classes.push(item);counts.set(name,item);}counts.get(name).count++;
  const column=growthColumns.find(({index})=>typeof row[index]==='number' && Number.isFinite(row[index]) && row[index]>=0);
  const nickname=row[data.headers.indexOf('닉네임')];
  if(column){values.push(row[column.index]);growthMembers.push({name:nickname,value:row[column.index]});}else missing++;
  const level=latest&&typeof row[latest.index]==='number'&&Number.isFinite(row[latest.index])&&row[latest.index]>=0?data.levels?.[latest.date]?.[row[data.headers.indexOf('닉네임')]]:null;
  if(Number.isInteger(level)){levelMembers.push({name:nickname,level});levelRecorded++;}
 }
 const levelBins=populatedLevelBins(levelMembers);
 const bins=[];
 if(values.length){const first=Math.floor(Math.min(...values)/5000)*5000,last=Math.floor(Math.max(...values)/5000)*5000;for(let start=first;start<=last;start+=5000)bins.push({start,end:start+4999,count:0,names:[]});for(const member of growthMembers){const bin=bins[(Math.floor(member.value/5000)*5000-first)/5000];bin.count++;bin.names.push(member.name);}}
 for(const bin of [...bins,...levelBins])bin.names.sort((a,b)=>a.localeCompare(b,'ko'));
 return {classes,bins,levelBins,levelRecorded,total:data.members.length,recorded:values.length,missing};
}
