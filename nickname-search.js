(() => {
 const initials='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
 const normalize=value=>String(value??'').normalize('NFC').replace(/\s/g,'').toLowerCase();
 function pattern(query){
  return [...String(query).trim().normalize('NFC').toLowerCase()].map(char=>{
   const code=char.codePointAt(0),index=code>=0x1100&&code<=0x1112?code-0x1100:initials.indexOf(char);
   if(index<0)return char.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const start=0xac00+index*588;
   return '['+initials[index]+String.fromCodePoint(0x1100+index)+String.fromCodePoint(start)+'-'+String.fromCodePoint(start+587)+']';
  }).join('');
 }
 function index(name,query){return normalize(name).search(new RegExp(pattern(normalize(query)),'u'));}
 function distance(a,b){let previous=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]+1,previous[j+1]+1,previous[j]+Number(a[i]!==b[j])));previous=next;}return previous[b.length];}
 function rank(name,query){const value=normalize(name),search=normalize(query);if(!search||value===search)return 0;const position=index(value,search);if(position>=0)return position===0?1:2;return distance(value,search)<=Math.min(2,Math.floor(search.length/2))?3:4;}
 const matches=(name,query)=>rank(name,query)<4;
 function suggest(names,query,limit=Infinity){return [...new Set(names)].filter(name=>typeof name==='string'&&matches(name,query)).sort((a,b)=>rank(a,query)-rank(b,query)||a.localeCompare(b,'ko')).slice(0,limit);}
 function bindOptions(input,list,{choose,hide}){
  let gesture=null,blockClickUntil=0;
  const optionAt=target=>target instanceof Element?target.closest('[role=option]'):null;
  list.addEventListener('pointerdown',event=>{
   const option=optionAt(event.target);if(!option||event.button!==0||!event.isPrimary)return;
   gesture={id:event.pointerId,name:option.textContent,x:event.clientX,y:event.clientY,moved:false};
   // Retain input focus; selecting on pointerup avoids relying on delayed mobile clicks.
   event.preventDefault();
  },{capture:true});
  list.addEventListener('pointermove',event=>{if(gesture?.id===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)gesture.moved=true;});
  list.addEventListener('pointerup',event=>{
   if(gesture?.id!==event.pointerId)return;
   const selection=gesture;gesture=null;blockClickUntil=performance.now()+700;
   if(!selection.moved&&!list.hidden&&optionAt(event.target)?.textContent===selection.name){event.preventDefault();choose(selection.name);}
  });
  list.addEventListener('pointercancel',()=>{gesture=null;blockClickUntil=performance.now()+700;});
  list.addEventListener('click',event=>{const option=optionAt(event.target);if(option&&!list.hidden&&(event.detail===0||performance.now()>blockClickUntil))choose(option.textContent);});
  input.addEventListener('blur',event=>{if(!gesture&&!list.parentElement.contains(event.relatedTarget))hide();});
  document.addEventListener('pointerdown',event=>{if(!list.parentElement.contains(event.target)){gesture=null;hide();}},{capture:true});
 }
 globalThis.GuildNicknameSearch={matches,rank,suggest,bindOptions};
})();
