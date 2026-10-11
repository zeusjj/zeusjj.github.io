(() => {
 const initials='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
 function pattern(query){
  return [...String(query).trim().normalize('NFC').toLowerCase()].map(char=>{
   const code=char.codePointAt(0),index=code>=0x1100&&code<=0x1112?code-0x1100:initials.indexOf(char);
   if(index<0)return char.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   const start=0xac00+index*588;
   return '['+initials[index]+String.fromCodePoint(0x1100+index)+String.fromCodePoint(start)+'-'+String.fromCodePoint(start+587)+']';
  }).join('');
 }
 function index(name,query){return String(name).normalize('NFC').toLowerCase().search(new RegExp(pattern(query),'u'));}
 globalThis.GuildNicknameSearch={matches:(name,query)=>index(name,query)>=0,rank:(name,query)=>!String(query).trim()?0:String(name).toLowerCase()===String(query).trim().toLowerCase()?0:index(name,query)===0?1:index(name,query)>0?2:3};
})();
