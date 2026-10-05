import {MINUTE,LEAD,DURATION,remainingTime,nextWeekly,fixedOccurrences,isDue,matchBoss} from './alarm-model.js';
const endpoint='https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/alarms';
const $=id=>document.getElementById(id);
const make=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const format=at=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(at);
let presets=[],records=[],offset=0,loaded=false,polling=false,enabled=false,audio,ringTimer,ringUntil=0,worker,ocrBusy=false,submitting=false;
const handled=new Set();let versions=new Map();
try{enabled=localStorage.getItem('guild-alarm-enabled')==='true';$('alarm-author').value=localStorage.getItem('guild-alarm-author') || '';}catch{}
const now=()=>Date.now()+offset;
function icons(){window.lucide?.createIcons();}
function stopSound(){clearInterval(ringTimer);ringTimer=null;ringUntil=0;}
function pulse(){
  if(!enabled || audio?.state!=='running')return;
  const start=audio.currentTime;
  for(const [frequency,delay] of [[660,0],[880,.2],[660,.4]]){const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.connect(gain);gain.connect(audio.destination);oscillator.frequency.value=frequency;gain.gain.setValueAtTime(0,start+delay);gain.gain.linearRampToValueAtTime(.08,start+delay+.025);gain.gain.exponentialRampToValueAtTime(.001,start+delay+.18);oscillator.start(start+delay);oscillator.stop(start+delay+.2);}
}
function sound(duration=0){pulse();if(!duration || audio?.state!=='running')return;ringUntil=Math.max(ringUntil,Date.now()+duration);if(!ringTimer)ringTimer=setInterval(()=>{if(Date.now()>=ringUntil || !enabled)stopSound();else pulse();},3000);}
async function activateAudio(){audio ||= new AudioContext();await audio.resume();audioStatus();}
function audioStatus(){
  const status=$('alarm-audio-status');status.replaceChildren();
  if(enabled && audio?.state!=='running'){const button=make('button','소리 활성화','secondary-button');button.type='button';button.addEventListener('click',()=>activateAudio().catch(()=>status.textContent='브라우저에서 소리를 허용해주세요.'));status.append(button);}
}
function toggleState(){const button=$('alarm-toggle');button.textContent=enabled?'On':'Off';button.setAttribute('aria-checked',String(enabled));button.title=enabled?'알람 수신 끄기':'알람 수신 켜기';audioStatus();}
$('alarm-toggle').addEventListener('click',async()=>{enabled=!enabled;try{localStorage.setItem('guild-alarm-enabled',String(enabled));}catch{}if(enabled)await activateAudio().catch(()=>{});else {stopSound();$('alarm-toasts').replaceChildren();}toggleState();});
function toast(title,message,duration=0){
  if(!enabled)return;
  const node=make('div',undefined,'alarm-toast'),heading=make('strong',title),body=make('p',message),dismiss=make('button',undefined,'icon-button');dismiss.type='button';dismiss.title='알림 닫기';dismiss.setAttribute('aria-label','알림 닫기');dismiss.append(make('span','×'));dismiss.addEventListener('click',()=>node.remove());node.append(heading,body,dismiss);
  if(duration){const mute=make('button','소리 끄기','secondary-button');mute.addEventListener('click',stopSound);node.append(mute);}
  $('alarm-toasts').append(node);while($('alarm-toasts').children.length>4)$('alarm-toasts').firstChild.remove();setTimeout(()=>node.remove(),Math.max(15000,duration));sound(duration);
}
function claim(key){
  if(handled.has(key))return false;handled.add(key);
  try{const stored=JSON.parse(localStorage.getItem('guild-alarm-fired') || '{}');const at=now();for(const k of Object.keys(stored))if(stored[k]<at-86400000)delete stored[k];if(stored[key])return false;stored[key]=at;localStorage.setItem('guild-alarm-fired',JSON.stringify(stored));}catch{}
  return true;
}
function tick(){
  const at=now();for(const node of document.querySelectorAll('[data-spawn]')){const left=Math.max(0,Number(node.dataset.spawn)-at);node.textContent=left?`${Math.floor(left/3600000)}시간 ${Math.floor(left/MINUTE)%60}분 ${Math.floor(left/1000)%60}초`:'출현';}
  if(!enabled)return;
  for(const record of records)if(isDue(record.spawn_at,at) && claim(`shared:${record.id}:${record.updated_at}`))toast(record.boss+' 출현 3분 전',format(record.spawn_at),Math.max(0,record.spawn_at-LEAD+DURATION-at));
  for(const spawn of fixedOccurrences(at))if(isDue(spawn,at) && claim('fixed:'+spawn))toast('심연의 틈 출현 3분 전',format(spawn),Math.max(0,spawn-LEAD+DURATION-at));
}
function render(){
  const list=$('alarm-list');list.replaceChildren();const at=now(),fixed=fixedOccurrences(at).filter(time=>time>at).sort((a,b)=>a-b)[0];
  for(const record of [...records.filter(r=>r.spawn_at>at),{boss:'심연의 틈',spawn_at:fixed,author:'매일 00:00 · 12:00 · 18:00',fixed:true}].sort((a,b)=>a.spawn_at-b.spawn_at)){
    const row=make('div',undefined,'alarm-row'),name=make('strong',record.boss),time=make('div'),author=make('span',record.author,'alarm-author');time.append(make('time',format(record.spawn_at)));const countdown=make('small');countdown.dataset.spawn=record.spawn_at;time.append(countdown);if(record.fixed)name.append(make('small','고정','alarm-fixed'));row.append(name,time,author);list.append(row);
  }tick();
}
async function refresh(){
  if(polling)return;polling=true;const start=Date.now();
  try{const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('공유 서버 연결 실패');const data=await response.json();if(!Array.isArray(data.alarms) || !Number.isFinite(data.serverNow))throw new Error('알람 응답 오류');offset=data.serverNow-(start+Date.now())/2;
    const next=new Map(data.alarms.map(record=>[record.id,record.updated_at]));if(loaded)for(const record of data.alarms)if(versions.get(record.id)!==record.updated_at)toast(record.boss+' 알람 '+(versions.has(record.id)?'변경':'등록'),`${record.author} · ${format(record.spawn_at)}`);
    records=data.alarms;versions=next;loaded=true;$('alarm-status').textContent='';render();
  }catch(error){$('alarm-status').textContent='공유 알람 연결을 확인하지 못했습니다. 자동으로 다시 연결합니다.';if(!loaded)render();}finally{polling=false;}
}
$('alarm-refresh').addEventListener('click',refresh);
let resolveConflict;
function confirmOverwrite(conflicts){
  $('alarm-conflict-list').replaceChildren(...conflicts.map(record=>make('li',record.boss)));
  $('alarm-conflicts').returnValue='';
  $('alarm-conflicts').showModal();return new Promise(resolve=>{resolveConflict=resolve;});
}
$('alarm-conflict-cancel').addEventListener('click',()=>$('alarm-conflicts').close('cancel'));
$('alarm-conflict-confirm').addEventListener('click',()=>$('alarm-conflicts').close('yes'));
$('alarm-conflicts').addEventListener('close',()=>{resolveConflict?.($('alarm-conflicts').returnValue==='yes');resolveConflict=null;});
async function register(alarms,status){
  if(submitting)return false;
  if(!alarms.length || new Set(alarms.map(a=>a.boss)).size!==alarms.length){status.textContent='알람을 선택하고, 같은 이름이 두 번 선택되지 않았는지 확인해주세요.';return false;}
  if(alarms.some(a=>!a.boss || a.spawn_at<=now())){status.textContent='이름과 남은 시간을 확인해주세요. 이미 지난 시간은 등록할 수 없습니다.';return false;}
  submitting=true;document.querySelectorAll('#alarm-manual button,#alarm-review-register').forEach(b=>b.disabled=true);let overwrite={};
  try{for(let attempt=0;attempt<4;attempt++){
    status.textContent='등록 중입니다.';const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alarms,overwrite,author:$('alarm-author').value}),signal:AbortSignal.timeout(15000)});const data=await response.json();
    if(response.status===409 && data.conflicts?.length){status.textContent='기존 알람 덮어쓰기 확인이 필요합니다.';if(!await confirmOverwrite(data.conflicts)){status.textContent='등록을 취소했습니다.';return false;}overwrite=Object.fromEntries(data.conflicts.map(record=>[record.boss,record.updated_at]));continue;}
    if(!response.ok)throw new Error(data.error || '등록 실패');status.textContent='알람이 등록되었습니다.';try{localStorage.setItem('guild-alarm-author',$('alarm-author').value);}catch{}await refresh();return true;
  }throw new Error('다른 길드원이 알람을 변경했습니다. 다시 등록해주세요.');
  }catch(error){status.textContent=error.name==='TimeoutError'?'응답이 지연되었습니다. 새로고침하여 등록 여부를 확인해주세요.':error.message;return false;}
  finally{submitting=false;document.querySelectorAll('#alarm-manual button,#alarm-review-register').forEach(b=>b.disabled=false);}
}
$('alarm-manual').addEventListener('submit',async event=>{event.preventDefault();const source_at=Math.round(now()),minutes=Number($('alarm-hours').value)*60+Number($('alarm-minutes').value);await register([{boss:$('alarm-boss').value,source_at,spawn_at:source_at+minutes*MINUTE}],$('alarm-status'));});
function optionList(select,blank=false){if(blank)select.append(new Option('이름 확인 필요',''));for(const preset of presets.filter(p=>!p.hours))select.append(new Option(preset.name,preset.name));}
let reviewRows=[];
function review(candidates,source_at){
  reviewRows=[];$('alarm-review-rows').replaceChildren();$('alarm-review-time').textContent=`붙여넣은 시각: ${format(source_at)} · 남은 시간의 기준 시각`;
  $('alarm-review-status').textContent='인식된 이름과 시간을 확인해주세요. 심연의 틈은 자동으로 제외됩니다.';
  for(const candidate of candidates){
    const row=make('div',undefined,'alarm-review-row'),checkbox=make('input'),select=make('select'),hours=make('input'),minutes=make('input'),note=make('small',candidate.text),spawn=make('small');checkbox.type='checkbox';checkbox.checked=Boolean(candidate.boss && candidate.duration!==null);checkbox.setAttribute('aria-label','이 알람 등록');optionList(select,true);select.value=candidate.boss || '';select.setAttribute('aria-label','알람 이름');
    for(const [input,label,max,value] of [[hours,'남은 시간',744,Math.floor((candidate.duration || 0)/3600000)],[minutes,'남은 분',59,Math.floor((candidate.duration || 0)/MINUTE)%60]]){input.type='number';input.min=0;input.max=max;input.step=1;input.value=value;input.setAttribute('aria-label',label);}
    const hourLabel=make('label'),minuteLabel=make('label');hourLabel.append(hours,make('span','시간'));minuteLabel.append(minutes,make('span','분'));const item={checkbox,select,hours,minutes,source_at};reviewRows.push(item);
    const update=()=>spawn.textContent='출현 '+format(source_at+(Number(hours.value)*60+Number(minutes.value))*MINUTE);hours.addEventListener('input',update);minutes.addEventListener('input',update);update();row.append(checkbox,select,hourLabel,minuteLabel,note,spawn);$('alarm-review-rows').append(row);
  }
  if(!candidates.length)$('alarm-review-status').textContent='등록할 알람을 인식하지 못했습니다. 더 선명한 사진을 붙여넣거나 수동으로 등록해주세요.';
  $('alarm-review-register').disabled=!candidates.length;$('alarm-review').showModal();
}
$('alarm-review-register').addEventListener('click',async()=>{const selected=reviewRows.filter(row=>row.checkbox.checked);if(selected.some(row=>!row.hours.checkValidity() || !row.minutes.checkValidity())){$('alarm-review-status').textContent='시간과 분의 입력 범위를 확인해주세요.';return;}
  if(await register(selected.map(row=>({boss:row.select.value,source_at:row.source_at,spawn_at:row.source_at+(Number(row.hours.value)*60+Number(row.minutes.value))*MINUTE})), $('alarm-review-status')))$('alarm-review').close();});
async function getWorker(){
  if(worker)return worker;
  if(!window.Tesseract)await new Promise((resolve,reject)=>{const script=make('script');script.src='vendor/ocr/tesseract.min.js';script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('OCR 도구를 불러오지 못했습니다.'));};document.head.append(script);});
  const directory=new URL('vendor/ocr/',location.href).href;
  worker=await window.Tesseract.createWorker('kor+eng',1,{workerPath:directory+'worker.min.js',corePath:directory,langPath:directory,logger:progress=>{$('alarm-ocr-status').textContent=progress.status==='recognizing text'?`문자 인식 ${Math.round((progress.progress || 0)*100)}%`:'OCR 준비 중…';}});
  await worker.setParameters({tessedit_pageseg_mode:'11',preserve_interword_spaces:'1'});return worker;
}
async function scan(file,source_at){
  if(ocrBusy || submitting){$('alarm-ocr-status').textContent='진행 중인 인식이나 등록을 먼저 완료해주세요.';return;}
  if(!file || file.size>15*1024*1024){$('alarm-ocr-status').textContent='15MB 이하 사진을 선택해주세요.';return;}
  ocrBusy=true;$('alarm-paste').disabled=true;$('alarm-file').disabled=true;
  let bitmap;
  try{bitmap=await createImageBitmap(file);if(bitmap.width<200 || bitmap.width*bitmap.height>20000000)throw new Error('사진 크기를 확인해주세요.');const columns=bitmap.width/bitmap.height>2.7?2:3,cardWidth=bitmap.width/columns,rows=Math.max(1,Math.round(bitmap.height/(cardWidth*.57))),cardHeight=bitmap.height/rows,scale=Math.min(2,3000/Math.max(bitmap.width,bitmap.height));
    const canvas=make('canvas');canvas.width=bitmap.width*scale;canvas.height=bitmap.height*scale;const context=canvas.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    for(let row=0;row<rows;row++)for(const [y,height] of [[row*cardHeight,cardHeight*.23],[(row+1)*cardHeight-cardHeight*.23,cardHeight*.23]])context.drawImage(bitmap,0,y,bitmap.width,height,0,y*scale,bitmap.width*scale,height*scale);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);for(let row=0;row<rows;row++)for(const [y,height] of [[row*cardHeight,cardHeight*.23],[(row+1)*cardHeight-cardHeight*.23,cardHeight*.23]])for(let yy=Math.floor(y*scale);yy<Math.min(canvas.height,(y+height)*scale);yy++)for(let x=0;x<canvas.width;x++){const i=(yy*canvas.width+x)*4,luminance=pixels.data[i]*.299+pixels.data[i+1]*.587+pixels.data[i+2]*.114;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=luminance>55?0:255;}context.putImageData(pixels,0,0);
    const engine=await getWorker(),result=await engine.recognize(canvas,{}, {text:true,blocks:true}),cells=Array.from({length:rows*columns},()=>[]);
    for(const block of result.data.blocks || [])for(const paragraph of block.paragraphs || [])for(const line of paragraph.lines || []){
      // OCR occasionally merges adjacent card headings into one line; words retain coordinates.
      const grouped=new Map();for(const word of line.words || []){const col=Math.min(columns-1,Math.floor((word.bbox.x0+word.bbox.x1)/2/(cardWidth*scale))),row=Math.min(rows-1,Math.floor((word.bbox.y0+word.bbox.y1)/2/(cardHeight*scale))),index=row*columns+col;const group=grouped.get(index) || [];group.push(word.text);grouped.set(index,group);}
      for(const [index,words] of grouped)cells[index].push(words.join(' '));
    }
    const candidates=[];for(const [index,lines] of cells.entries()){if(!lines.length)continue;const preset=lines.map(text=>matchBoss(text,presets)).find(Boolean);if(preset?.hours)continue;let timer=lines.map(remainingTime).find(value=>value!==null);
      if(timer===undefined && !preset?.days){const crop=make('canvas'),left=(index%columns)*cardWidth,top=Math.floor(index/columns)*cardHeight+cardHeight*.81;crop.width=Math.ceil(cardWidth*.65*3)+20;crop.height=Math.ceil(cardHeight*.18*3)+20;const ctx=crop.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,crop.width,crop.height);ctx.drawImage(bitmap,left+4,top,cardWidth*.65,cardHeight*.18,10,10,cardWidth*.65*3,cardHeight*.18*3);const image=ctx.getImageData(10,10,crop.width-20,crop.height-20);for(let i=0;i<image.data.length;i+=4){const l=image.data[i]*.299+image.data[i+1]*.587+image.data[i+2]*.114;image.data[i]=image.data[i+1]=image.data[i+2]=l>55?0:255;}ctx.putImageData(image,10,10);await engine.setParameters({tessedit_pageseg_mode:'7'});const retry=await engine.recognize(crop);lines.push('시간 재인식: '+retry.data.text.trim());timer=remainingTime(retry.data.text);await engine.setParameters({tessedit_pageseg_mode:'11'});}
      const text=lines.join(' / '),duration=timer ?? (preset?.days?nextWeekly(preset,source_at)-source_at:null);candidates.push({boss:preset?.name,text,duration});}
    $('alarm-ocr-status').textContent=`${candidates.length}개 인식 · 확인 후 등록`;review(candidates,source_at);
  }catch(error){$('alarm-ocr-status').textContent=error.message || '사진 인식에 실패했습니다.';if(worker){await worker.terminate().catch(()=>{});worker=null;}}
  finally{bitmap?.close();ocrBusy=false;$('alarm-paste').disabled=false;$('alarm-file').disabled=false;}
}
$('alarm-file').addEventListener('change',event=>{const source=Math.round(now());scan(event.target.files[0],source);event.target.value='';});
document.addEventListener('paste',event=>{if($('alarms').hidden)return;const file=[...event.clipboardData.items].find(item=>item.type.startsWith('image/'))?.getAsFile();if(file){event.preventDefault();scan(file,Math.round(now()));}});
$('alarm-paste').addEventListener('click',async()=>{const source=Math.round(now());try{const items=await navigator.clipboard.read();for(const item of items){const type=item.types.find(type=>type.startsWith('image/'));if(type){await scan(await item.getType(type),source);return;}}throw new Error('클립보드에 사진이 없습니다.');}catch(error){$('alarm-ocr-status').textContent='사진을 복사한 뒤 이 화면에서 Ctrl+V로 붙여넣거나 사진 선택을 이용해주세요.';}});
try{const response=await fetch('boss-presets.json');if(!response.ok)throw new Error();presets=await response.json();optionList($('alarm-boss'));}catch{$('alarm-status').textContent='알람 이름 목록을 불러오지 못했습니다. 새로고침해주세요.';$('alarm-manual').querySelector('button').disabled=true;}
toggleState();render();refresh();setInterval(refresh,15000);setInterval(()=>{tick();if(records.some(record=>record.spawn_at<=now()))render();},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();render();audioStatus();}});
window.addEventListener('pagehide',stopSound);
