const section=document.getElementById('site-updates'),list=document.getElementById('site-updates-list');
async function loadUpdates(){
  try{
    const response=await fetch('site-updates.json',{cache:'no-store'});
    if(!response.ok)throw new Error('Update log unavailable');
    const entries=await response.json();
    if(!Array.isArray(entries))throw new Error('Invalid update log');
    const valid=entries.filter(entry=>entry&&/^\d{4}-\d{2}-\d{2}$/.test(entry.date)&&typeof entry.text==='string'&&entry.text.trim()).sort((a,b)=>b.date.localeCompare(a.date));
    const fragment=document.createDocumentFragment();
    for(const entry of valid){
      const item=document.createElement('li'),date=document.createElement('time'),text=document.createElement('span');
      date.dateTime=entry.date;date.textContent=entry.date.slice(5).replace('-','/');date.title=entry.date;text.textContent=entry.text;item.append(date,text);fragment.append(item);
    }
    list.replaceChildren(fragment);section.hidden=!valid.length;
  }catch{section.hidden=true;}
}
loadUpdates();
