import {astrologyConstellations as stars} from './astrology-data.js?v=20261018-126';
const host=document.getElementById('astrology-rows'),section=document.createElement('section');
section.className='astrology-budget';
section.innerHTML='<h3>보유 별로 다음 선택</h3><div class="astrology-budget-controls"><div class="astrology-state"><div class="astrology-state-heading"><label for="astrology-budget">보유 별의 조각</label><output for="astrology-budget" id="astrology-budget-value">1,000개</output></div><input id="astrology-budget" type="range" min="0" max="10000" step="100" value="1000"><div class="astrology-budget-scale"><span>0개</span><span>10,000개</span></div></div><label class="astrology-priority">우선 스탯<select id="astrology-priority"></select></label></div><p id="astrology-recommendation" role="status" aria-live="polite"></p><p class="astrology-budget-note">추천은 다음 1회 대상입니다. 이후 성공 결과에 따라 대상을 바꾸는 전략의 기대 증가량을 비교합니다. 개수별 달성·완성 효과만 포함하며 다른 스탯은 점수에 합산하지 않습니다.</p><div class="astrology-comparison-wrap"><table class="astrology-comparison"><caption>현재 단계 · 예산별 비교</caption><thead><tr><th scope="col">별자리</th><th scope="col">다음 1회 추가 일치</th><th scope="col">예산 내 N+1 달성</th><th scope="col">예산 내 전체 완성</th><th scope="col">다음 달성 효과</th><th scope="col">완성 효과</th><th scope="col">예산 내 기대 스탯</th></tr></thead><tbody></tbody></table></div><p class="astrology-budget-note">표의 예산 내 확률·기대 스탯은 각 별자리 한 곳에 예산을 모두 사용할 때의 값입니다. 추천의 기대값은 여러 별자리를 오가는 전략으로 별도 계산합니다. 예산이 충분하지 않으면 멈추며, 확률은 보장이 아닙니다.</p>';
host.after(section);
const completionSummary=document.createElement('p'),completionValue=document.createElement('strong');
completionSummary.className='astrology-completion-summary';
completionSummary.append('모든 별자리 활성화까지 필요한 별의 조각 · 평균 ',completionValue,' (현재 단계 기준 · 추정치)');
section.append(completionSummary);
section.querySelector('h3').textContent='별의 조각 보유 개수별 우선순위 선택 도우미';
const select=section.querySelector('select'),slider=section.querySelector('input'),status=section.querySelector('[role=status]'),body=section.querySelector('tbody'),number=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
slider.max='30000';section.querySelector('.astrology-budget-scale span:last-child').textContent='30,000개';
const storageKey='guild-astrology-budget-v1';
try{
  const raw=localStorage.getItem(storageKey),value=raw===null?NaN:Number(raw);
  if(raw!==null&&raw.trim()!==''&&Number.isInteger(value)&&value>=Number(slider.min)&&value<=Number(slider.max)&&value%Number(slider.step)===0)slider.value=String(value);
}catch{}
const saveBudget=()=>{try{localStorage.setItem(storageKey,slider.value);}catch{}};
const stats=[...new Set(stars.flatMap(s=>[...s.effects,...s.completion].filter(Boolean).map(e=>e[0])))];
for(const stat of ['', '공격력',...stats.filter(s=>s!=='공격력')]){const option=document.createElement('option');option.value=stat;option.textContent=stat||'없음';select.append(option);}
section.querySelector('.astrology-budget-note').textContent='현재 단계와 보유량을 기준으로 먼저 점성술을 진행할 별자리입니다. 결과에 따라 추천 대상은 달라질 수 있습니다. 우선 스탯이 없으면 달성·완성 스탯 수치의 단순 합계를, 선택하면 해당 스탯만 비교합니다. 실제 전투력 환산은 아닙니다.';
let worker=null,sequence=0,timer;
const percent=value=>value>0&&value<.0005?'0.1% 미만':value<1&&value>.9995?'99.9% 초과':(value*100).toFixed(1)+'%';
const gain=value=>number.format(value);
function update(){
  clearTimeout(timer);worker?.terminate();worker=null;sequence++;
  const id=sequence,budget=Number(slider.value),counts=stars.map(s=>Number(document.getElementById('astrology-'+s.id).value)),stat=select.value,statLabel=stat||'스탯 총량';
  section.querySelector('output').textContent=number.format(budget)+'개';
  const completionMean=[...host.querySelectorAll('.astrology-row')].reduce((total,row)=>total+Number(row.dataset.completionMean),0);
  completionValue.textContent=new Intl.NumberFormat('ko-KR').format(Math.max(0,Math.ceil(completionMean-1e-9)))+'개';
  status.textContent='예산별 선택 계산 중…';
  timer=setTimeout(()=>{
    try{
      worker=new Worker(new URL('./astrology-budget-worker.js?v=20261018-130',import.meta.url),{type:'module'});
      worker.onerror=()=>{if(id===sequence)status.textContent='추천 계산을 불러오지 못했습니다. 잠시 후 다시 조절해 주세요.';worker?.terminate();worker=null;};
      worker.onmessage=({data})=>{
        if(data.id!==sequence)return;
        worker?.terminate();worker=null;
        if(data.error){status.textContent='추천 계산을 완료하지 못했습니다.';return;}
        const {choice,best,comparisons}=data.result;
        status.textContent=choice<0?(counts.every((k,i)=>k===stars[i].central)?'모든 별자리 활성화 완료':'이 예산으로 얻을 수 있는 '+statLabel+' 추가 기대값이 없습니다.'):'먼저 올릴 별자리: '+stars[choice].name+(best>=.1?' · 예산 전체 '+statLabel+' 기대 증가 +'+gain(best):'');
        const rows=document.createDocumentFragment();
        stars.forEach((s,i)=>{
          const k=counts[i],comparison=comparisons[i],row=document.createElement('tr');row.dataset.recommended=String(i===choice);
          const nextChance=k===s.central?'완료':document.querySelector('[aria-label="'+s.name+'"] .astrology-roll-cost').textContent.split('중앙 추가 등장 ')[1];
          const expected=Object.entries(comparison.effects).filter(([,v])=>v>=.1).map(([name,value])=>name+' +'+gain(value));
          const cells=[s.name+' '+k+'/'+s.central,nextChance,k===s.central?'완료':percent(comparison.next),k===s.central?'완료':percent(comparison.completion),k===s.central?'—':s.effects[k][0]+' +'+s.effects[k][1],s.completion.map(e=>e[0]+' +'+e[1]),expected.length?expected:['—']];
          const headers=section.querySelectorAll('thead th');
          cells.forEach((text,j)=>{
            const cell=document.createElement(j===0?'th':'td'),value=document.createElement('span');value.className='astrology-comparison-value';cell.dataset.label=headers[j].textContent;
            if(j===0){cell.scope='row';const name=document.createElement('strong'),stage=document.createElement('small');name.textContent=s.name;stage.textContent=k+' / '+s.central+'개';value.append(name,stage);}
            else if(Array.isArray(text))for(const line of text){const item=document.createElement('span');item.textContent=line;value.append(item);}else value.textContent=text;
            cell.append(value);row.append(cell);
          });rows.append(row);
        });
        body.replaceChildren(rows);
      };
      worker.postMessage({id,budget,counts,stat});
    }catch{status.textContent='추천 계산은 웹 주소에서 사용할 수 있습니다.';}
  },180);
}
slider.addEventListener('input',()=>{section.querySelector('output').textContent=number.format(Number(slider.value))+'개';saveBudget();});
slider.addEventListener('change',()=>{saveBudget();update();});select.addEventListener('change',update);host.addEventListener('input',update);
update();
