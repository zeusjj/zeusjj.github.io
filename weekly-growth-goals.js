import {weekStart,shiftDay} from './guild-overview-model.js?v=20261115-siege';

function goals(rules,today){
  const block=rules?.match(/\[성장 목표\]([\s\S]*?)(?:\n\[|$)/)?.[1]??'';
  return block.split(/(?=Lv\.\s*\d+)/).flatMap(text=>{
    const level=Number(text.match(/Lv\.\s*(\d+)/)?.[1]),growth=Number(text.match(/성장도\s*([\d,]+)/)?.[1]?.replaceAll(',',''));
    if(!level||!growth)return [];
    const deadline=text.match(/\(\s*~\s*(?:(\d{4})[./-])?(\d{1,2})[./-](\d{1,2})\s*\)/);
    if(!deadline)return [{level,growth,deadline:'',date:null}];
    const year=Number(today.slice(0,4)),month=deadline[2].padStart(2,'0'),day=deadline[3].padStart(2,'0');
    const candidates=(deadline[1]?[Number(deadline[1])]:[year-1,year,year+1]).map(y=>`${y}-${month}-${day}`).filter(date=>{
      const time=Date.parse(date+'T00:00:00Z');return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===date;
    });
    candidates.sort((a,b)=>Math.abs(Date.parse(a)-Date.parse(today))-Math.abs(Date.parse(b)-Date.parse(today)));
    return candidates.length?[{level,growth,deadline:Number(month)+'/'+Number(day),date:candidates[0]}]:[];
  });
}

export function weeklyGrowthGoal(sourceRules,effectiveRules,start,today){
  const end=shiftDay(start,6),matches=goal=>goal.date?goal.date>=start&&goal.date<=end:start===weekStart(today);
  return goals(effectiveRules,today).find(matches)??goals(sourceRules,today).find(matches)??{level:null,growth:null,deadline:''};
}

export function rulesWithWeeklyGoal(rules,goal){
  const body=goal.level&&goal.growth?`Lv.${goal.level} · 성장도 ${goal.growth}${goal.deadline?' (~'+goal.deadline+')':''}`:'';
  const block='[성장 목표]\n\n'+body+'\n';
  return /\[성장 목표\]/.test(rules)?rules.replace(/\[성장 목표\][\s\S]*?(?=\n\[|$)/,block):rules+'\n'+block;
}
