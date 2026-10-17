import {astrologyConstellations as stars} from './astrology-data.js?v=20261018-126';
const host=document.getElementById('astrology-rows'),section=document.createElement('section');
section.className='astrology-budget';
section.innerHTML='<h3>보유 별로 다음 선택</h3><div class="astrology-budget-controls"><div class="astrology-state"><div class="astrology-state-heading"><label for="astrology-budget">보유 별의 조각</label><output for="astrology-budget" id="astrology-budget-value">1,000개</output></div><input id="astrology-budget" type="range" min="0" max="10000" step="100" value="1000"><div class="astrology-budget-scale"><span>0개</span><span>10,000개</span></div></div><label class="astrology-priority">우선 스탯<select id="astrology-priority"></select></label></div><p id="astrology-recommendation" role="status" aria-live="polite"></p><p class="astrology-budget-note">추천은 다음 1회 대상입니다. 이후 성공 결과에 따라 대상을 바꾸는 전략의 기대 증가량을 비교합니다. 개수별 달성·완성 효과만 포함하며 다른 스탯은 점수에 합산하지 않습니다.</p><div class="astrology-comparison-wrap"><table class="astrology-comparison"><caption>현재 단계 · 예산별 비교</caption><thead><tr><th scope="col">별자리</th><th scope="col">다음 1회 추가 일치</th><th scope="col">예산 내 N+1 달성</th><th scope="col">예산 내 전체 완성</th><th scope="col">다음 달성 효과</th><th scope="col">완성 효과</th><th scope="col">예산 내 기대 스탯</th></tr></thead><tbody></tbody></table></div><p class="astrology-budget-note">표의 예산 내 확률·기대 스탯은 각 별자리 한 곳에 예산을 모두 사용할 때의 값입니다. 추천의 기대값은 여러 별자리를 오가는 전략으로 별도 계산합니다. 예산이 충분하지 않으면 멈추며, 확률은 보장이 아닙니다.</p>';
host.after(section);
const select=section.querySelector('select'),slider=section.querySelector('input'),status=section.querySelector('[role=status]'),body=section.querySelector('tbody'),number=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2});
const stats=[...new Set(stars.flatMap(s=>[...s.effects,...s.completion].filter(Boolean).map(e=>e[0])))];
for(const stat of ['공격력',...stats.filter(s=>s!=='공격력')]){const option=document.createElement('option');option.value=option.textContent=stat;select.append(option);}
let worker=null,sequence=0,timer;
const percent=value=>value>0&&value<.0005?'0.1% 미만':value<1&&value>.9995?'99.9% 초과':(value*100).toFixed(1)+'%';
const gain=value=>value>0&&value<.005?'0.01 미만':number.format(value);
function update(){
  clearTimeout(timer);worker?.terminate();worker=null;sequence++;
  const id=sequence,budget=Number(slider.value),counts=stars.map(s=>Number(document.getElementById('astrology-'+s.id).value)),stat=select.value;
  section.querySelector('output').textContent=number.format(budget)+'개';
  status.textContent='예산별 선택 계산 중…';body.replaceChildren();
  timer=setTimeout(()=>{
    try{
      worker=new Worker(new URL('./astrology-budget-worker.js?v=20261018-126',import.meta.url),{type:'module'});
      worker.onerror=()=>{if(id===sequence)status.textContent='추천 계산을 불러오지 못했습니다. 잠시 후 다시 조절해 주세요.';worker?.terminate();worker=null;};
      worker.onmessage=({data})=>{
        if(data.id!==sequence)return;
        worker?.terminate();worker=null;
        if(data.error){status.textContent='추천 계산을 완료하지 못했습니다.';return;}
        const {choice,best,comparisons}=data.result;
        status.textContent=choice<0?(counts.every((k,i)=>k===stars[i].central)?'모든 별자리 활성화 완료':'이 예산으로 얻을 수 있는 '+stat+' 추가 기대값이 없습니다.'):'다음 1회 추천: '+stars[choice].name+' · 예산 전체 '+stat+' 기대 증가 +'+gain(best);
        stars.forEach((s,i)=>{
          const k=counts[i],comparison=comparisons[i],row=document.createElement('tr');row.dataset.recommended=String(i===choice);
          const nextChance=k===s.central?'완료':document.querySelector('[aria-label="'+s.name+'"] .astrology-roll-cost').textContent.split('중앙 추가 등장 ')[1];
          const expected=Object.entries(comparison.effects).filter(([,v])=>v>0).map(([name,value])=>name+' +'+gain(value)).join(' · ')||'—';
          const cells=[s.name+' '+k+'/'+s.central,nextChance,k===s.central?'완료':percent(comparison.next),k===s.central?'완료':percent(comparison.completion),k===s.central?'—':s.effects[k][0]+' +'+s.effects[k][1],s.completion.map(e=>e[0]+' +'+e[1]).join(' · '),expected];
          cells.forEach((text,j)=>{const cell=document.createElement(j===0?'th':'td');if(j===0)cell.scope='row';cell.textContent=text;row.append(cell);});body.append(row);
        });
      };
      worker.postMessage({id,budget,counts,stat});
    }catch{status.textContent='추천 계산은 웹 주소에서 사용할 수 있습니다.';}
  },180);
}
slider.addEventListener('input',update);select.addEventListener('change',update);host.addEventListener('input',update);
update();
