export const MINUTE=60000;
export const KST=9*60*MINUTE;
export const LEAD=3*MINUTE;
export const DURATION=MINUTE;
export function remainingTime(text){
  const compact=text.replace(/\s/g,'');
  const hours=compact.match(/(\d+)시간/),minutes=compact.match(/(\d+)분/),seconds=compact.match(/(\d+)초/);
  if((hours || minutes) && /\d/.test(compact.slice((minutes || hours).index+(minutes || hours)[0].length).split(/후|출/)[0].replace(/\d+초/,'')))return null;
  return hours || minutes || seconds?((Number(hours?.[1] || 0)*60+Number(minutes?.[1] || 0))*60+Number(seconds?.[1] || 0))*1000:null;
}
export function nextWeekly(preset,at){
  const local=new Date(at+KST),midnight=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-KST;
  return Math.min(...preset.days.map(day=>{let target=midnight+((day-local.getUTCDay()+7)%7)*86400000+preset.hour*60*MINUTE; if(target<=at)target+=7*86400000;return target;}));
}
export function fixedOccurrences(at){
  const local=new Date(at+KST),midnight=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-KST;
  return [-1,0,1].flatMap(day=>[0,12,18].map(hour=>midnight+day*86400000+hour*60*MINUTE));
}
export function isDue(spawn,at){return at>=spawn-LEAD && at<spawn-LEAD+DURATION;}
function normalized(text){return text.replace(/[^가-힣0-9]/g,'');}
function distance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]!==b[j-1]));row=next;}return row[b.length];}
export function matchBoss(text,presets){
  const title=normalized(text.replace(/Lv\.?\s*\d+/gi,'').replace(/^[^가-힣]*/,''));
  const exact=presets.filter(p=>title.includes(normalized(p.name))).sort((a,b)=>b.name.length-a.name.length);
  if(exact.length)return {...exact[0],ocrSimilarity:1};
  if(title.length<2)return null;
  const ranked=presets.map(p=>{const name=normalized(p.name),a=title.normalize('NFD'),b=name.normalize('NFD');return {preset:p,score:.65*distance(title,name)/Math.max(title.length,name.length)+.35*distance(a,b)/Math.max(a.length,b.length)};}).sort((a,b)=>a.score-b.score);
  return ranked[0]?.score<=.36 && ranked[1]?.score-ranked[0].score>.08?{...ranked[0].preset,ocrSimilarity:1-ranked[0].score}:null;
}
