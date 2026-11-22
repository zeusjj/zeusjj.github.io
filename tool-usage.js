const key='guild-frequent-tools-v1';
export const tools=[
  {route:'epic',label:'서사시 연습',icon:'music-2'},
  {route:'skill',label:'스킬 강화 기대값 계산기',icon:'swords'},
  {route:'collection',label:'컬렉션 기대값 계산기',icon:'layers'},
  {route:'astrology',label:'점성술 계산기',icon:'sparkles'},
  {route:'fate',label:'운명의 흐름 가격표',icon:'table-2'},
  {route:'sinkwa',label:'신과 재료 가격표',icon:'gem'},
  {route:'probabilities',label:'확률표',icon:'list-ordered'}
];
const validRoutes=new Set(tools.map(tool=>tool.route));
let fallback={};
function read(){
  try{const value=JSON.parse(localStorage.getItem(key)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))return value;}catch{}
  return fallback;
}
export function frequentTools(usage=read()){
  const ranked=tools.filter(tool=>Number.isSafeInteger(usage?.[tool.route]?.count)&&usage[tool.route].count>0)
    .sort((a,b)=>usage[b.route].count-usage[a.route].count||(Number(usage[b.route].last)||0)-(Number(usage[a.route].last)||0));
  return (ranked.length?ranked:tools.slice(0,3)).slice(0,3);
}
export function startToolUsageTracking(){
  let current='';
  function capture(){
    const parts=location.hash.slice(1).split('/');
    if(parts[0]!=='tools'){current='';return;}
    const route=parts[1]||document.querySelector('[data-calculator][aria-selected="true"]')?.dataset.calculator;
    if(!validRoutes.has(route)||route===current)return;
    current=route;
    const usage=read(),previous=usage[route];
    usage[route]={count:(Number.isSafeInteger(previous?.count)&&previous.count>0?Math.min(previous.count,999999):0)+1,last:Date.now()};
    fallback=usage;try{localStorage.setItem(key,JSON.stringify(usage));}catch{}
  }
  window.addEventListener('hashchange',capture);
  window.addEventListener('guild-calculator-change',capture);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',capture,{once:true});else capture();
}
