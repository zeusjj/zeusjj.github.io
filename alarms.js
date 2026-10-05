import {MINUTE,LEAD,DURATION,remainingTime,nextWeekly,weeklyTime,fixedOccurrences,isDue,matchBoss} from './alarm-model.js?v=20261005-51';
import {detectBoardGrid} from './alarm-grid.js?v=20261005-51';
const endpoint='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/alarms';
const $=id=>document.getElementById(id);
const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const format=at=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(at);
let presets=[],records=[],offset=0,loaded=false,polling=false,enabled=true,audio,masterGain,ringTimer,lastPulse=0,worker,ocrBusy=false,submitting=false;
const soundPatterns={chime:{type:'sine',notes:[[660,0],[880,.2],[660,.4]],length:.2,peak:.08},bell:{type:'triangle',notes:[[880,0],[1175,.22],[1568,.44]],length:.4,peak:.065},electronic:{type:'square',notes:[[1000,0],[1000,.2],[1000,.4]],length:.12,peak:.045}};
const soundDefaults={tone:'chime',volume:70};let soundSettings={...soundDefaults};
try{const saved=JSON.parse(localStorage.getItem('guild-alarm-sound-v1'));if(saved && Object.hasOwn(soundPatterns,saved.tone))soundSettings.tone=saved.tone;if(Number.isFinite(saved?.volume))soundSettings.volume=Math.round(Math.min(100,Math.max(0,saved.volume)));}catch{}
const ringing=new Map(),oscillators=new Set();
const handled=new Set();let versions=new Map();
try{enabled=localStorage.getItem('guild-alarm-enabled')!=='false';$('alarm-author').value=localStorage.getItem('guild-alarm-author') || '';}catch{}
const now=()=>Date.now()+offset;
function icons(){window.lucide?.createIcons();}
function ringUI(){
  for(const row of document.querySelectorAll('[data-alarm-key]')){const active=ringing.has(row.dataset.alarmKey);row.classList.toggle('is-ringing',active);row.querySelector('.alarm-ring-status').textContent=active?'알림 중':'대기';row.querySelector('.alarm-stop').disabled=!active;}
  const testing=ringing.has('test');$('alarm-test').setAttribute('aria-pressed',String(testing));$('alarm-test').querySelector('span').textContent=testing?'테스트 중단':'테스트';
}
function stopSound(key){
  if(key===undefined)ringing.clear();else ringing.delete(key);
  for(const toast of document.querySelectorAll('.alarm-toast[data-ring-key]'))if(key===undefined || toast.dataset.ringKey===key)toast.remove();
  if(!ringing.size){clearInterval(ringTimer);ringTimer=null;for(const oscillator of oscillators){try{oscillator.stop();}catch{}}oscillators.clear();}
  if(key==='test' || key===undefined)document.querySelector('[data-alarm-key=test]')?.remove();ringUI();
}
function pulse(){
  if(!enabled || audio?.state!=='running')return;
  const start=audio.currentTime,pattern=soundPatterns[soundSettings.tone];
  for(const [frequency,delay] of pattern.notes){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=pattern.type;oscillator.connect(gain);gain.connect(masterGain);oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start+delay);gain.gain.linearRampToValueAtTime(pattern.peak,start+delay+.025);gain.gain.exponentialRampToValueAtTime(.001,start+delay+pattern.length-.02);oscillators.add(oscillator);oscillator.onended=()=>oscillators.delete(oscillator);oscillator.start(start+delay);oscillator.stop(start+delay+pattern.length);}
}
function sound(duration=0,key,boss){
  pulse();lastPulse=Date.now();if(!duration)return;ringing.set(key,{until:Date.now()+duration,boss});if(key==='test')render();ringUI();
  if(!ringTimer)ringTimer=setInterval(()=>{for(const [key,entry] of ringing)if(Date.now()>=entry.until)stopSound(key);if(!enabled)stopSound();else if(ringing.size && Date.now()-lastPulse>=3000){pulse();lastPulse=Date.now();}},1000);
}
async function activateAudio(){if(!audio){audio=new AudioContext();masterGain=audio.createGain();masterGain.connect(audio.destination);masterGain.gain.setValueAtTime(soundSettings.volume/100,audio.currentTime);}await audio.resume();audioStatus();}
function soundSettingsUI(){
  $('alarm-tone').value=soundSettings.tone;$('alarm-volume').value=soundSettings.volume;$('alarm-volume-value').textContent=soundSettings.volume+'%';
  if(masterGain)masterGain.gain.setValueAtTime(soundSettings.volume/100,audio.currentTime);
}
function saveSoundSettings(){soundSettingsUI();try{localStorage.setItem('guild-alarm-sound-v1',JSON.stringify(soundSettings));$('alarm-preferences-status').textContent='이 브라우저에 저장되었습니다.';}catch{$('alarm-preferences-status').textContent='브라우저 저장이 제한되어 이번 접속에만 적용됩니다.';}}
$('alarm-preferences').addEventListener('click',()=>{soundSettingsUI();$('alarm-preferences-status').textContent='';$('alarm-preferences-dialog').showModal();});
$('alarm-tone').addEventListener('change',event=>{soundSettings.tone=event.target.value;saveSoundSettings();});
$('alarm-volume').addEventListener('input',event=>{soundSettings.volume=Number(event.target.value);saveSoundSettings();});
$('alarm-sound-reset').addEventListener('click',()=>{soundSettings={...soundDefaults};saveSoundSettings();});
$('alarm-sound-preview').addEventListener('click',async()=>{if(!enabled){$('alarm-preferences-status').textContent='알람 수신이 Off입니다. On으로 켠 뒤 미리듣기를 눌러주세요.';return;}try{await activateAudio();pulse();}catch{$('alarm-preferences-status').textContent='브라우저에서 소리를 허용해주세요.';}});
function audioStatus(){
  $('alarm-audio-status').replaceChildren();
}
function toggleState(){const button=$('alarm-toggle');button.textContent=enabled?'On':'Off';button.setAttribute('aria-checked',String(enabled));button.title=enabled?'알람 수신 끄기':'알람 수신 켜기';audioStatus();}
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{if(enabled && audio?.state!=='running')activateAudio().catch(()=>{});});
$('alarm-toggle').addEventListener('click',async()=>{enabled=!enabled;try{localStorage.setItem('guild-alarm-enabled',String(enabled));}catch{}if(enabled)await activateAudio().catch(()=>{});else {stopSound();$('alarm-toasts').replaceChildren();}toggleState();});
function toast(title,message,duration=0,key,boss){
  if(!enabled)return;
  const node=make('div',undefined,'alarm-toast'),heading=make('strong',title),body=make('p',message),dismiss=make('button',undefined,'icon-button');dismiss.type='button';dismiss.title='알림 닫기';dismiss.setAttribute('aria-label','알림 닫기');dismiss.append(make('span','×'));node.append(heading,body,dismiss);
  const end=()=>{if(key!==undefined)stopSound(key);node.remove();};node.addEventListener('click',end);if(key!==undefined)node.dataset.ringKey=key;
  if(duration){node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-label',title+' 중단');node.addEventListener('keydown',event=>{if(event.target===node && ['Enter',' '].includes(event.key)){event.preventDefault();end();}});const mute=make('button','중단','secondary-button');node.append(mute);}
  $('alarm-toasts').append(node);while($('alarm-toasts').children.length>4)$('alarm-toasts').firstChild.remove();setTimeout(()=>node.remove(),Math.max(15000,duration));sound(duration,key,boss);
}
function claim(key){
  if(handled.has(key))return false;handled.add(key);
  try{const stored=JSON.parse(localStorage.getItem('guild-alarm-fired') || '{}');const at=now();for(const k of Object.keys(stored))if(stored[k]<at-86400000)delete stored[k];if(stored[key])return false;stored[key]=at;localStorage.setItem('guild-alarm-fired',JSON.stringify(stored));}catch{}
  return true;
}
function tick(){
  const at=now();for(const node of document.querySelectorAll('[data-spawn]')){const left=Math.max(0,Number(node.dataset.spawn)-at);node.textContent=left?`${Math.floor(left/3600000)}시간 ${Math.floor(left/MINUTE)%60}분 ${Math.floor(left/1000)%60}초`:'출현';}
  if(!enabled)return;
  for(const record of records)if(isDue(record.spawn_at,at) && claim(`shared:${record.id}:${record.updated_at}`))toast(record.boss+' 출현 3분 전',format(record.spawn_at),Math.max(0,record.spawn_at-LEAD+DURATION-at),record.id,record.boss);
  for(const spawn of fixedOccurrences(at))if(isDue(spawn,at) && claim('fixed:'+spawn))toast('심연의 틈 출현 3분 전',format(spawn),Math.max(0,spawn-LEAD+DURATION-at),'fixed','심연의 틈');
}
function render(){
  const list=$('alarm-list');list.replaceChildren();const at=now(),fixed=fixedOccurrences(at).filter(time=>time>at).sort((a,b)=>a-b)[0];
  const entries=[...records.filter(r=>r.spawn_at>at),{id:'fixed',boss:'심연의 틈',spawn_at:fixed,author:'매일 00:00 · 12:00 · 18:00',fixed:true}];if(ringing.has('test'))entries.unshift({id:'test',boss:ringing.get('test').boss,spawn_at:at,author:'테스트 · 서버 미등록',test:true});
  for(const record of entries.sort((a,b)=>a.spawn_at-b.spawn_at)){
    const row=make('div',undefined,'alarm-row'),name=make('strong',record.boss),time=make('div'),author=make('span',record.author,'alarm-author');row.dataset.alarmKey=record.id;
    if(record.test)time.append(make('span','테스트 알림'));else {time.append(make('time',format(record.spawn_at)));const countdown=make('small');countdown.dataset.spawn=record.spawn_at;time.append(countdown);}
    if(record.fixed)name.append(make('small','고정','alarm-fixed'));const controls=make('div',undefined,'alarm-ring-controls'),status=make('span','대기','alarm-ring-status'),stop=make('button',undefined,'secondary-button alarm-stop');stop.type='button';stop.title=record.boss+' 알림 중단';const icon=make('i');icon.dataset.lucide='volume-x';stop.append(icon,make('span','중단'));stop.addEventListener('click',()=>stopSound(record.id));controls.append(status,stop);row.append(name,time,author,controls);list.append(row);
  }tick();ringUI();icons();
}
async function refresh(){
  if(polling)return;polling=true;const start=Date.now();
  try{const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('공유 서버 연결 실패');const data=await response.json();if(!Array.isArray(data.alarms) || !Number.isFinite(data.serverNow))throw new Error('알람 응답 오류');offset=data.serverNow-(start+Date.now())/2;
    const next=new Map(data.alarms.map(record=>[record.id,record.updated_at]));
    if(loaded){
      const changes=[...new Map(data.alarms.filter(record=>versions.get(record.id)!==record.updated_at).map(record=>[record.boss,record])).values()];
      if(changes.length===1){const record=changes[0];toast(record.boss+' 알람 '+(versions.has(record.id)?'변경':'등록'),`${record.author} · ${format(record.spawn_at)}`);}
      else if(changes.length>1)toast('공유 알람 '+changes.length+'개 등록·변경',changes.map(record=>record.boss+' ('+record.author+')').join(', '));
    }
    records=data.alarms;versions=next;loaded=true;$('alarm-status').textContent='';render();
  }catch(error){$('alarm-status').textContent='공유 알람 연결을 확인하지 못했습니다. 자동으로 다시 연결합니다.';if(!loaded)render();}finally{polling=false;}
}
$('alarm-refresh').addEventListener('click',refresh);
let resolveConflict;
function timeLeft(at,reference){const minutes=Math.max(0,Math.ceil((at-reference)/MINUTE));return `${Math.floor(minutes/60)}시간 ${minutes%60}분 남음`;}
function confirmOverwrite(conflicts,alarms){
  const reference=now();
  $('alarm-conflict-list').replaceChildren(...conflicts.map(record=>{const item=make('li'),incoming=alarms.find(alarm=>alarm.boss===record.boss);item.append(make('strong',record.boss),make('div',`${Number.isFinite(record.spawn_at)?timeLeft(record.spawn_at,reference):'기존 시간 확인 불가'} → ${timeLeft(incoming.spawn_at,reference)}`));return item;}));
  $('alarm-conflicts').returnValue='';
  $('alarm-conflicts').showModal();return new Promise(resolve=>{resolveConflict=resolve;});
}
$('alarm-conflict-cancel').addEventListener('click',()=>$('alarm-conflicts').close('cancel'));
$('alarm-conflict-confirm').addEventListener('click',()=>$('alarm-conflicts').close('yes'));
$('alarm-conflicts').addEventListener('close',()=>{resolveConflict?.($('alarm-conflicts').returnValue==='yes');resolveConflict=null;});
async function register(alarms,status){
  if(submitting)return false;
  alarms=alarms.map(alarm=>({...alarm,boss:alarm.boss==='키니 레우리'?'키니 러우리':alarm.boss}));
  if(!alarms.length || new Set(alarms.map(a=>a.boss)).size!==alarms.length){status.textContent='알람을 선택하고, 같은 이름이 두 번 선택되지 않았는지 확인해주세요.';return false;}
  if(alarms.some(a=>!a.boss || a.spawn_at<=now())){status.textContent='이름과 남은 시간을 확인해주세요. 이미 지난 시간은 등록할 수 없습니다.';return false;}
  const invalid=alarms.find(a=>!presets.some(p=>p.name===a.boss && !p.hours) || !Number.isSafeInteger(a.spawn_at) || !Number.isSafeInteger(a.source_at) || a.source_at<now()-86400000 || a.source_at>now()+300000 || a.spawn_at>now()+32*86400000);
  if(invalid){status.textContent=`${invalid.boss || '이름 미선택'}: 프리셋 이름과 남은 시간을 확인해주세요. 사진은 24시간 이내, 출현은 32일 이내여야 합니다.`;return false;}
  submitting=true;document.querySelectorAll('#alarm-manual button,#alarm-review-register').forEach(b=>b.disabled=true);let overwrite={};
  try{for(let attempt=0;attempt<4;attempt++){
    status.textContent='등록 중입니다.';const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alarms,overwrite,author:$('alarm-author').value}),signal:AbortSignal.timeout(15000)});const data=await response.json();
    if(response.status===409 && data.conflicts?.length){
      const currentResponse=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!currentResponse.ok)throw new Error('기존 알람 시간을 확인하지 못했습니다. 다시 시도해주세요.');const current=await currentResponse.json();
      const conflicts=data.conflicts.map(record=>{const latest=current.alarms?.find(item=>item.boss===record.boss && item.updated_at===record.updated_at);return {...record,...latest};});
      const changed=conflicts.filter(record=>!Number.isFinite(record.spawn_at) || Math.abs(record.spawn_at-alarms.find(alarm=>alarm.boss===record.boss).spawn_at)>MINUTE);
      if(changed.length){status.textContent='기존 알람 덮어쓰기 확인이 필요합니다.';if(!await confirmOverwrite(changed,alarms)){status.textContent='등록을 취소했습니다.';return false;}}
      overwrite=Object.fromEntries(conflicts.map(record=>[record.boss,record.updated_at]));continue;
    }
    if(!response.ok)throw new Error(data.error || '등록 실패');status.textContent='알람이 등록되었습니다.';try{localStorage.setItem('guild-alarm-author',$('alarm-author').value);}catch{}await refresh();return true;
  }throw new Error('다른 길드원이 알람을 변경했습니다. 다시 등록해주세요.');
  }catch(error){status.textContent=error.name==='TimeoutError'?'응답이 지연되었습니다. 새로고침하여 등록 여부를 확인해주세요.':error.message;return false;}
  finally{submitting=false;document.querySelectorAll('#alarm-manual button,#alarm-review-register').forEach(b=>b.disabled=false);}
}
$('alarm-manual').addEventListener('submit',async event=>{event.preventDefault();const source_at=Math.round(now()),minutes=Number($('alarm-hours').value)*60+Number($('alarm-minutes').value);await register([{boss:$('alarm-boss').value,source_at,spawn_at:source_at+minutes*MINUTE}],$('alarm-status'));});
$('alarm-test').addEventListener('click',async()=>{if(ringing.has('test')){stopSound('test');return;}if(!enabled){$('alarm-status').textContent='알람 수신을 On으로 켠 뒤 테스트해주세요.';return;}try{await activateAudio();if(audio.state!=='running')throw new Error();toast('알람 테스트',$('alarm-boss').value+' · 테스트 알림 · 실제로 등록되지 않습니다.',DURATION,'test',$('alarm-boss').value);}catch{$('alarm-status').textContent='브라우저에서 소리를 허용한 뒤 다시 테스트해주세요.';}});
function optionList(select,blank=false){if(blank)select.append(new Option('이름 확인 필요',''));for(const preset of presets.filter(p=>!p.hours))select.append(new Option(preset.name,preset.name));}
let reviewRows=[];
function review(candidates,source_at){
  if($('alarm-preview').open)$('alarm-preview').close();
  reviewRows=[];$('alarm-review-rows').replaceChildren();$('alarm-review-time').textContent=`붙여넣은 시각: ${format(source_at)} · 남은 시간의 기준 시각`;
  $('alarm-review-status').textContent='인식된 이름과 시간을 확인해주세요. 심연의 틈은 자동으로 제외됩니다.';
  for(const candidate of candidates){
    const row=make('div',undefined,'alarm-review-row'),checkbox=make('input'),select=make('select'),hours=make('input'),minutes=make('input'),note=make('small',candidate.text+(candidate.similarity<1?` · 유사도 ${Math.round(candidate.similarity*100)}%`:'')),spawn=make('small');checkbox.type='checkbox';checkbox.checked=Boolean(candidate.boss && candidate.duration!==null);checkbox.setAttribute('aria-label','이 알람 등록');optionList(select,true);select.value=candidate.boss || '';select.setAttribute('aria-label','알람 이름');
    for(const [input,label,max,value] of [[hours,'남은 시간',744,Math.floor((candidate.duration || 0)/3600000)],[minutes,'남은 분',59,Math.floor((candidate.duration || 0)/MINUTE)%60]]){input.type='number';input.min=0;input.max=max;input.step=1;input.value=value;input.setAttribute('aria-label',label);}
    const hourLabel=make('label'),minuteLabel=make('label');hourLabel.append(hours,make('span','시간'));minuteLabel.append(minutes,make('span','분'));const item={checkbox,select,hours,minutes,source_at,initialHours:hours.value,initialMinutes:minutes.value,duration:candidate.duration};reviewRows.push(item);
    const update=()=>spawn.textContent='출현 '+format(reviewSpawn(item));hours.addEventListener('input',update);minutes.addEventListener('input',update);update();row.append(checkbox,select,hourLabel,minuteLabel,note,spawn);$('alarm-review-rows').append(row);
  }
  if(!candidates.length)$('alarm-review-status').textContent='등록할 알람을 인식하지 못했습니다. 더 선명한 사진을 붙여넣거나 수동으로 등록해주세요.';
  $('alarm-review-register').disabled=!candidates.length;$('alarm-review').showModal();
}
function reviewSpawn(row){return row.source_at+(Number.isFinite(row.duration) && row.hours.value===row.initialHours && row.minutes.value===row.initialMinutes?row.duration:(Number(row.hours.value)*60+Number(row.minutes.value))*MINUTE);}
$('alarm-review-register').addEventListener('click',async()=>{const selected=reviewRows.filter(row=>row.checkbox.checked);if(selected.some(row=>!row.hours.checkValidity() || !row.minutes.checkValidity())){$('alarm-review-status').textContent='시간과 분의 입력 범위를 확인해주세요.';return;}
  if(await register(selected.map(row=>({boss:row.select.value,source_at:row.source_at,spawn_at:reviewSpawn(row)})), $('alarm-review-status')))$('alarm-review').close();});
async function getWorker(){
  if(worker)return worker;
  if(!window.Tesseract)await new Promise((resolve,reject)=>{const script=make('script');script.src='vendor/ocr/tesseract.min.js';script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('OCR 도구를 불러오지 못했습니다.'));};document.head.append(script);});
  const directory=new URL('vendor/ocr/',location.href).href;
  worker=await window.Tesseract.createWorker('kor+eng',1,{workerPath:directory+'worker.min.js',corePath:directory,langPath:directory,logger:progress=>{const message=progress.status==='recognizing text'?`OCR 읽는 중… ${Math.round((progress.progress || 0)*100)}%`:'OCR 로딩 중…';$('alarm-ocr-status').textContent=message;$('alarm-preview-status').textContent=message;}});
  await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});return worker;
}
async function scan(file,source_at){
  if(ocrBusy || submitting){$('alarm-ocr-status').textContent='진행 중인 인식이나 등록을 먼저 완료해주세요.';return;}
  if(!file || file.size>15*1024*1024){$('alarm-ocr-status').textContent='15MB 이하 사진을 선택해주세요.';return;}
  ocrBusy=true;$('alarm-paste').disabled=true;$('alarm-file').disabled=true;$('alarm-preview-confirm').disabled=true;$('alarm-preview-refresh').disabled=true;$('alarm-preview-status').textContent='OCR 읽는 중…';$('alarm-preview').setAttribute('aria-busy','true');
  let bitmap;
  try{bitmap=await createImageBitmap(file);if(bitmap.width<200 || bitmap.width*bitmap.height>20000000)throw new Error('사진 크기를 확인해주세요.');
    const original=make('canvas');original.width=bitmap.width;original.height=bitmap.height;const originalContext=original.getContext('2d',{willReadFrequently:true});originalContext.drawImage(bitmap,0,0);
    const grid=detectBoardGrid(bitmap.width,bitmap.height,originalContext.getImageData(0,0,bitmap.width,bitmap.height).data),areas=grid.cells,scale=Math.min(2,3000/Math.max(bitmap.width,bitmap.height));
    if(areas.length>100)throw new Error('사진을 나누어 붙여넣어주세요. 한 번에 최대 100칸까지 인식합니다.');
    const canvas=make('canvas');canvas.width=bitmap.width*scale;canvas.height=bitmap.height*scale;const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    for(const area of areas)for(const y of [area.top,area.top+area.height*.77])context.drawImage(bitmap,area.left,y,area.width,area.height*.23,area.left*scale,y*scale,area.width*scale,area.height*.23*scale);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);for(const area of areas)for(const y of [area.top,area.top+area.height*.77])for(let yy=Math.floor(y*scale);yy<Math.min(canvas.height,(y+area.height*.23)*scale);yy++)for(let x=Math.floor(area.left*scale);x<Math.min(canvas.width,(area.left+area.width)*scale);x++){const i=(yy*canvas.width+x)*4,luminance=pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=luminance>55?0:255;}context.putImageData(pixels,0,0);
    const engine=await getWorker(),result=await engine.recognize(canvas,{}, {text:true,blocks:true}),cells=areas.map(()=>[]);
    for(const block of result.data.blocks || [])for(const paragraph of block.paragraphs || [])for(const line of paragraph.lines || []){
      // OCR occasionally merges adjacent card headings into one line; words retain coordinates.
      const grouped=new Map();for(const word of line.words || []){const x=(word.bbox.x0+word.bbox.x1)/2/scale,y=(word.bbox.y0+word.bbox.y1)/2/scale,index=areas.findIndex(area=>x>=area.left && x<area.left+area.width && y>=area.top && y<area.top+area.height);if(index<0)continue;const group=grouped.get(index) || [];group.push(word.text);grouped.set(index,group);}
      for(const [index,words] of grouped)cells[index].push(words.join(' '));
    }
    async function retryTitle(index,threshold){
      const area=areas[index],left=area.left+area.width*.09,top=area.top+area.height*.04,width=area.width*.8,height=area.height*.18;
      const crop=make('canvas');crop.width=Math.ceil(width*3)+20;crop.height=Math.ceil(height*3)+20;const ctx=crop.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,crop.width,crop.height);ctx.drawImage(bitmap,left,top,width,height,10,10,width*3,height*3);
      const pixels=ctx.getImageData(10,10,crop.width-20,crop.height-20);for(let i=0;i<pixels.data.length;i+=4){const luminance=pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=luminance>threshold?0:255;}ctx.putImageData(pixels,10,10);
      await engine.setParameters({tessedit_pageseg_mode:'7'});try{return (await engine.recognize(crop)).data.text.trim();}finally{await engine.setParameters({tessedit_pageseg_mode:'11'});}
    }
    const candidates=[];for(const [index,lines] of cells.entries()){if(!lines.length)continue;const area=areas[index],cardWidth=area.width,cardHeight=area.height;let preset=lines.map(text=>matchBoss(text,presets)).find(Boolean);
      if(!preset)for(const threshold of [35,70]){const title=await retryTitle(index,threshold);lines.push('이름 재인식: '+title);preset=matchBoss(title,presets);if(preset)break;}
      if(preset?.hours)continue;let timer=lines.map(remainingTime).find(value=>value!==null);
      if(timer===undefined && !preset?.days){const crop=make('canvas'),left=area.left,top=area.top+cardHeight*.81;crop.width=Math.ceil(cardWidth*.65*3)+20;crop.height=Math.ceil(cardHeight*.18*3)+20;const ctx=crop.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,crop.width,crop.height);ctx.drawImage(bitmap,left+4,top,cardWidth*.65,cardHeight*.18,10,10,cardWidth*.65*3,cardHeight*.18*3);const image=ctx.getImageData(10,10,crop.width-20,crop.height-20);for(let i=0;i<image.data.length;i+=4){const l=image.data[i]*.299+image.data[i+1]*.587+image.data[i+2]*.114;image.data[i]=image.data[i+1]=image.data[i+2]=l>55?0:255;}ctx.putImageData(image,10,10);await engine.setParameters({tessedit_pageseg_mode:'7'});const retry=await engine.recognize(crop);lines.push('시간 재인식: '+retry.data.text.trim());timer=remainingTime(retry.data.text);await engine.setParameters({tessedit_pageseg_mode:'11'});}
      const text=lines.join(' / '),scheduled=weeklyTime(text,source_at),duration=timer ?? (scheduled!==null?scheduled-source_at:preset?.days?nextWeekly(preset,source_at)-source_at:null);candidates.push({boss:preset?.name,text,duration,similarity:preset?.ocrSimilarity});}
    $('alarm-ocr-status').textContent=`${candidates.length}개 인식 · 확인 후 등록`;review(candidates,source_at);
  }catch(error){$('alarm-ocr-status').textContent=error.message || '사진 인식에 실패했습니다.';$('alarm-preview-status').textContent=$('alarm-ocr-status').textContent;if(worker){await worker.terminate().catch(()=>{});worker=null;}}
  finally{bitmap?.close();ocrBusy=false;$('alarm-paste').disabled=false;$('alarm-file').disabled=false;$('alarm-preview-refresh').disabled=false;$('alarm-preview-confirm').disabled=!previewFile;$('alarm-preview').removeAttribute('aria-busy');}
}
let previewFile=null,previewSource=0,previewURL='',previewGeneration=0;
function preview(file,source){
  if(ocrBusy || submitting || $('alarm-review').open)return;
  if(!file || !file.type.startsWith('image/') || file.size>15*1024*1024){$('alarm-preview-status').textContent='15MB 이하 사진을 선택해주세요.';return;}
  if(previewURL)URL.revokeObjectURL(previewURL);previewFile=file;previewSource=source;previewURL=URL.createObjectURL(file);$('alarm-preview-image').src=previewURL;$('alarm-preview-image').hidden=false;$('alarm-preview-confirm').disabled=false;$('alarm-preview-refresh').disabled=false;$('alarm-preview-time').textContent='사진 기준 시각: '+format(source);$('alarm-preview-status').textContent='';if(!$('alarm-preview').open)$('alarm-preview').showModal();
}
async function readClipboard(){
  const source=Math.round(now()),generation=++previewGeneration;$('alarm-preview-refresh').disabled=true;$('alarm-preview-status').textContent='클립보드 사진 불러오는 중…';
  try{const items=await navigator.clipboard.read();for(const item of items){const type=item.types.find(type=>type.startsWith('image/'));if(type){const file=await item.getType(type);if(generation===previewGeneration && $('alarm-preview').open)preview(file,source);return;}}throw new Error('클립보드에 사진이 없습니다.');}
  catch{$('alarm-preview-status').textContent='사진을 복사한 뒤 이 팝업에서 Ctrl+V로 붙여넣어주세요.';}
  finally{if(generation===previewGeneration)$('alarm-preview-refresh').disabled=false;}
}
$('alarm-preview').addEventListener('cancel',event=>{if(ocrBusy)event.preventDefault();});
$('alarm-preview').addEventListener('close',()=>{previewGeneration++;if(previewURL)URL.revokeObjectURL(previewURL);previewURL='';previewFile=null;$('alarm-preview-image').removeAttribute('src');$('alarm-preview-image').hidden=true;});
$('alarm-preview-close').addEventListener('click',()=>{if(!ocrBusy)$('alarm-preview').close();});
$('alarm-preview-refresh').addEventListener('click',readClipboard);
$('alarm-preview-confirm').addEventListener('click',()=>{if(previewFile)scan(previewFile,previewSource);});
$('alarm-file').addEventListener('change',event=>{preview(event.target.files[0],Math.round(now()));event.target.value='';});
document.addEventListener('paste',event=>{if($('alarms').hidden || ocrBusy || submitting)return;const file=[...event.clipboardData.items].find(item=>item.type.startsWith('image/'))?.getAsFile();if(file){event.preventDefault();previewGeneration++;preview(file,Math.round(now()));}});
$('alarm-paste').addEventListener('click',()=>{if(ocrBusy || submitting)return;$('alarm-preview-confirm').disabled=true;$('alarm-preview-time').textContent='';$('alarm-preview').showModal();readClipboard();});
try{const response=await fetch('boss-presets.json?v=20261005-51',{cache:'no-store'});if(!response.ok)throw new Error();presets=await response.json();optionList($('alarm-boss'));}catch{$('alarm-status').textContent='알람 이름 목록을 불러오지 못했습니다. 새로고침해주세요.';$('alarm-manual').querySelector('button').disabled=true;}
toggleState();render();refresh();setInterval(refresh,15000);setInterval(()=>{tick();if(records.some(record=>record.spawn_at<=now()))render();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();render();audioStatus();}});
window.addEventListener('pagehide',()=>stopSound());
