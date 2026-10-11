export const memberClasses=['버서커','나이트','레인저','어쌔신','아티산','블레','오라클','엘리'];
export function memberDistribution(data){
 const classIndex=data.headers.indexOf('클래스');
 const classes=memberClasses.map(name=>({name,count:0}));const counts=new Map(classes.map(item=>[item.name,item]));
 const growthColumns=data.headers.map((name,index)=>({name,index,date:data.dates?.[index]?.start || ''})).filter(item=>item.name==='성장도 기록').sort((a,b)=>b.date.localeCompare(a.date) || b.index-a.index);
 const latest=growthColumns.find(({index})=>data.members.some(row=>typeof row[index]==='number'&&Number.isFinite(row[index])&&row[index]>=0));
 const values=[],levelBins=Array.from({length:12},(_,index)=>({label:index===0?'55 이하':index===11?'66 이상':String(55+index),count:0}));let missing=0,levelRecorded=0;
 for(const row of data.members){
  const name=counts.has(row[classIndex])?row[classIndex]:'미기록';if(!counts.has(name)){const item={name,count:0};classes.push(item);counts.set(name,item);}counts.get(name).count++;
  const column=growthColumns.find(({index})=>typeof row[index]==='number' && Number.isFinite(row[index]) && row[index]>=0);
  if(column)values.push(row[column.index]);else missing++;
  const level=latest&&typeof row[latest.index]==='number'&&Number.isFinite(row[latest.index])&&row[latest.index]>=0?data.levels?.[latest.date]?.[row[data.headers.indexOf('닉네임')]]:null;
  if(Number.isInteger(level)){levelBins[Math.max(0,Math.min(11,level-55))].count++;levelRecorded++;}
 }
 const bins=[];
 if(values.length){const first=Math.floor(Math.min(...values)/5000)*5000,last=Math.floor(Math.max(...values)/5000)*5000;for(let start=first;start<=last;start+=5000)bins.push({start,end:start+4999,count:0});for(const value of values)bins[(Math.floor(value/5000)*5000-first)/5000].count++;}
 return {classes,bins,levelBins,levelRecorded,total:data.members.length,recorded:values.length,missing};
}
