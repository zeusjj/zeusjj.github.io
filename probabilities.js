const menu=document.getElementById('probability-menu'),frame=document.getElementById('probability-frame'),status=document.getElementById('probability-status'),original=document.getElementById('probability-original');
let records=[],loadedUrl='',timeout;
const key=record=>new URL(record.url).pathname.split('/').at(-1);
function select(){
 if(location.hash.split('/')[0]!=='#probabilities')return;
 if(!records.length)return;
 const record=records.find(r=>key(r)===location.hash.split('/')[1]) || records[0];
 document.getElementById('probability-title').textContent=record.path.join(' › ');
 original.href=record.url;
 for(const link of menu.querySelectorAll('a')){
  const active=link.hash==='#probabilities/'+key(record);link.setAttribute('aria-current',active?'page':'false');
  if(active)link.closest('details').open=true;
 }
 if(loadedUrl===record.url)return;
 loadedUrl=record.url;clearTimeout(timeout);status.textContent='공식 확률표를 불러오는 중입니다.';frame.hidden=false;frame.title=record.path.join(' · ')+' 공식 확률표';frame.src=record.url;
 timeout=setTimeout(()=>{status.textContent='화면이 표시되지 않으면 공식 원문을 확인해주세요.';},20000);
}
frame.addEventListener('load',()=>{if(!loadedUrl)return;clearTimeout(timeout);status.textContent='';});
document.getElementById('probability-search').addEventListener('input',event=>{
 const query=event.target.value.trim().replace(/\s/g,'').toLowerCase();
 for(const group of menu.children){
  for(const item of group.querySelectorAll('li'))item.hidden=!item.dataset.search.includes(query);
  group.hidden=![...group.querySelectorAll('li')].some(item=>!item.hidden);if(query)group.open=true;
 }
});
window.addEventListener('hashchange',select);
try{
 const response=await fetch('probability-menu.json');if(!response.ok)throw new Error();
 const data=await response.json();records=data.records;
 original.href=data.source;
 const groups=new Map();
 for(const record of records){
  const url=new URL(record.url);if(url.origin!=='https://lim.com2us.com')throw new Error();
  const groupName=record.path[0];let group=groups.get(groupName);
  if(!group){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=groupName;group=document.createElement('ul');details.append(summary,group);menu.append(details);groups.set(groupName,group);}
  const item=document.createElement('li'),link=document.createElement('a');link.href='#probabilities/'+key(record);link.textContent=record.path.slice(1).join(' · ');item.dataset.search=record.path.join('').replace(/\s/g,'').toLowerCase();item.append(link);group.append(item);
 }
 select();status.textContent=loadedUrl?status.textContent:'';
}catch{status.textContent='확률표 목록을 불러오지 못했습니다. 새로고침해주세요.';original.href='https://lim.com2us.com/0ff0ef099ecb754b08b36053f2a8327f0d5b470cc3656c9fd043b9d1a2d719f5';}
