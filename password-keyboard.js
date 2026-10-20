const initials=['r','R','s','e','E','f','a','q','Q','t','T','d','w','W','c','z','x','v','g'];
const vowels=['k','o','i','O','j','p','u','P','h','hk','ho','hl','y','n','nj','np','nl','b','m','ml','l'];
const finals=['','r','R','rt','s','sw','sg','e','f','fr','fa','fq','ft','fx','fv','fg','a','q','qt','t','T','d','w','c','z','x','v','g'];
const jamo=['r','R','rt','s','sw','sg','e','E','f','fr','fa','fq','ft','fx','fv','fg','a','q','Q','qt','t','T','d','w','W','c','z','x','v','g',...vowels];
export function passwordKeys(value){
  return Array.from(value.normalize('NFC'),character=>{
    const code=character.codePointAt(0),syllable=code-0xac00;
    if(syllable>=0&&syllable<11172)return initials[Math.floor(syllable/588)]+vowels[Math.floor(syllable/28)%21]+finals[syllable%28];
    if(code>=0x3131&&code<=0x3163)return jamo[code-0x3131];
    if(code>=0x1100&&code<=0x1112)return initials[code-0x1100];
    if(code>=0x1161&&code<=0x1175)return vowels[code-0x1161];
    if(code>=0x11a8&&code<=0x11c2)return finals[code-0x11a7];
    return character;
  }).join('');
}
