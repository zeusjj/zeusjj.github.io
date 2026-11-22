import {PROFIT_DEFAULTS,compareEnhancementProfit} from './enhancement-profit-model.js?v=20261123-midas';

const panel=document.getElementById('enhancement-profit-panel');
if(panel){
  panel.innerHTML=`<form class="profit-calculator" id="profit-settings" novalidate>
    <p class="profit-intro">시세를 조절해 8·9·10강 목표의 기대수익과 축강화석 사용 여부를 비교하세요.</p>
    <section class="profit-market" aria-labelledby="profit-market-heading">
      <div class="profit-section-heading"><h3 id="profit-market-heading">시세</h3><button type="reset" class="secondary-button">초기화</button></div>
      <div class="profit-price-grid">
        <div class="profit-price"><label for="profit-item-price">0강 아이템 가격</label><div class="profit-price-controls"><div class="profit-slider-control"><input id="profit-item-slider" type="range" min="0" max="200" step="0.01" value="40" aria-label="0강 아이템 가격 조절"><div class="profit-range"><span>0</span><span data-range-max="item">200</span></div></div><div class="profit-price-value"><input id="profit-item-price" name="itemPrice" type="number" min="0" max="1000000" step="0.01" value="40" inputmode="decimal" required><span>다이아</span></div></div></div>
        <div class="profit-price"><label for="profit-blessing-price">축강화석 가격</label><div class="profit-price-controls"><div class="profit-slider-control"><input id="profit-blessing-slider" type="range" min="0" max="500" step="0.01" value="200" aria-label="축강화석 가격 조절"><div class="profit-range"><span>0</span><span data-range-max="blessing">500</span></div></div><div class="profit-price-value"><input id="profit-blessing-price" name="blessingPrice" type="number" min="0" max="1000000" step="0.01" value="200" inputmode="decimal" required><span>다이아</span></div></div></div>
      </div>
      <p class="profit-market-note">축강화석은 7→8강 도전에만 사용해요. 성공률 35% 중 절반은 바로 9강이 됩니다.</p>
    </section>
    <p id="profit-error" class="profit-error" role="alert" hidden></p>
    <section aria-labelledby="profit-results-heading">
      <div class="profit-section-heading profit-results-heading"><h3 id="profit-results-heading">목표별 기대수익</h3><span>0강 아이템 1개당 · 다이아</span></div>
      <div class="profit-summary" id="profit-summary" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="profit-table-frame" role="region" aria-label="목표별 상금과 축강화석 사용·미사용 기대수익 비교. 좁은 화면에서는 좌우로 스크롤할 수 있습니다." tabindex="0">
        <table class="profit-table"><caption class="visually-hidden">상금은 직접 수정할 수 있으며, 가장 좋은 기대값을 강조합니다.</caption><colgroup><col class="profit-goal-col"><col class="profit-reward-col"><col span="2" class="profit-value-col"><col class="profit-choice-col"></colgroup>
          <thead><tr><th scope="col">목표</th><th scope="col">상금 <small>직접 수정</small></th><th scope="col">축강화석 미사용</th><th scope="col">축강화석 사용</th><th scope="col">유리한 선택</th></tr></thead>
          <tbody>${[8,9,10].map(target=>`<tr data-profit-target="${target}"><th scope="row">${target}강</th><td><label class="visually-hidden" for="profit-reward-${target}">${target}강 상금</label><input id="profit-reward-${target}" name="reward${target}" type="number" min="0" max="1000000000" step="0.01" value="${PROFIT_DEFAULTS.rewards[target]}" inputmode="decimal" required></td><td data-profit-mode="normal"></td><td data-profit-mode="blessed"></td><td class="profit-choice"></td></tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="profit-result-note">상금에서 아이템·축강화석 비용을 뺀 장기 평균입니다. 8강 목표에서 바로 9강이 되면 9강 상금을 적용해요.</p>
    </section>
    <details class="profit-method"><summary>계산 방식과 강화 확률</summary><p>5강까지 100% · 6강 65% · 7강 50% · 8강 35% · 9강 20% · 10강 5%</p><p>실패하면 아이템은 파괴되며 수령액은 0입니다. 일반 강화의 추가 비용은 없고, 축강화석은 7강까지 살아남은 경우에만 구매 비용에 포함합니다.</p><p>기대수익 = 결과별 확률 × 해당 강화 단계의 상금 합계 − 아이템 가격 − 평균 축강화석 비용</p></details>
  </form>`;
  const form=panel.querySelector('form'),error=panel.querySelector('#profit-error'),summary=panel.querySelector('#profit-summary');
  const decimalFormat=new Intl.NumberFormat('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const number={format:value=>decimalFormat.format(Math.round((value+Number.EPSILON*Math.max(1,Math.abs(value)))*100)/100)};
  const integer=new Intl.NumberFormat('ko-KR'),percent=new Intl.NumberFormat('ko-KR',{maximumFractionDigits:5});
  const signed=value=>(value>1e-9?'+':value< -1e-9?'−':'')+number.format(Math.abs(value)<1e-9?0:Math.abs(value));
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(className)node.className=className;return node;};
  const inputs=[...form.querySelectorAll('input[type=number]')];
  const pairs=[['item',form.elements.itemPrice,panel.querySelector('#profit-item-slider'),200],['blessing',form.elements.blessingPrice,panel.querySelector('#profit-blessing-slider'),500]];
  const storageKey='guild-enhancement-profit-v1';
  const settings=()=>({itemPrice:form.elements.itemPrice.valueAsNumber,blessingPrice:form.elements.blessingPrice.valueAsNumber,rewards:Object.fromEntries([8,9,10].map(target=>[target,form.elements['reward'+target].valueAsNumber]))});
  function syncSliders(){for(const [name,input,slider,minimumMax]of pairs){if(!input.validity.valid)continue;slider.max=Math.max(minimumMax,Math.ceil(input.valueAsNumber/100)*100);slider.value=input.value;slider.setAttribute('aria-valuetext',number.format(input.valueAsNumber)+' 다이아');panel.querySelector(`[data-range-max="${name}"]`).textContent=integer.format(Number(slider.max));}}
  function render(persist=true){
    const invalid=inputs.some(input=>!input.validity.valid);for(const input of inputs)input.setAttribute('aria-invalid',String(!input.validity.valid));
    error.hidden=!invalid;
    if(invalid){error.textContent='시세는 0~1,000,000, 상금은 0~1,000,000,000 사이의 숫자로 입력해주세요.';summary.hidden=true;for(const cell of panel.querySelectorAll('[data-profit-mode],.profit-choice')){cell.replaceChildren(el('span','입력 확인','profit-pending'));cell.classList.remove('profit-best','profit-row-better');}return;}
    summary.hidden=false;syncSliders();const values=settings(),rows=compareEnhancementProfit(values),choices=rows.flatMap(row=>[row.normal,row.blessed]),maximum=Math.max(...choices.map(choice=>choice.profit));
    const winners=choices.filter(choice=>Math.abs(choice.profit-maximum)<1e-9),best=winners[0];
    summary.replaceChildren();summary.dataset.result=maximum>1e-9?'gain':maximum< -1e-9?'loss':'even';
    const title=el('div',undefined,'profit-summary-title');title.append(el('span',maximum< -1e-9?'모든 선택지가 손실입니다':'가장 좋은 기대값','profit-summary-label'),el('strong',best.target+'강 목표 · '+(best.blessed?'축강화석 사용':'미사용')+(winners.length>1?' 외 '+(winners.length-1)+'개 선택지':'')));
    const amount=el('div',undefined,'profit-summary-amount');amount.append(el('strong',signed(maximum)),el('span',maximum< -1e-9?'다이아 · 손실이 가장 적은 선택':'다이아 / 아이템 1개'));summary.append(title,amount);
    for(const row of rows){const tr=panel.querySelector(`[data-profit-target="${row.target}"]`),difference=row.blessed.profit-row.normal.profit,localMax=Math.max(row.normal.profit,row.blessed.profit);
      for(const key of ['normal','blessed']){const result=row[key],cell=tr.querySelector(`[data-profit-mode="${key}"]`),isBest=Math.abs(result.profit-maximum)<1e-9,isBetter=Math.abs(result.profit-localMax)<1e-9&&Math.abs(difference)>1e-9;
        cell.classList.toggle('profit-best',isBest);cell.classList.toggle('profit-row-better',isBetter);cell.dataset.result=result.profit>1e-9?'gain':result.profit< -1e-9?'loss':'even';cell.replaceChildren();
        const status=result.profit>1e-9?'수익':result.profit< -1e-9?'손실':'손익분기';cell.append(el('strong',signed(result.profit),'profit-net'),el('span',isBest?(maximum< -1e-9?'손실 최소':'최고 기대값'):status,'profit-outcome'));
        const metrics=el('span',undefined,'profit-metrics');metrics.append(el('span','도달 '+percent.format(result.successProbability*100)+'%'),el('span','평균 비용 '+number.format(result.expectedCost)));cell.append(metrics);
      }
      const choice=tr.querySelector('.profit-choice');choice.replaceChildren();choice.append(el('strong',Math.abs(difference)<1e-9?'동일':difference>0?'축 사용':'미사용'),el('small',Math.abs(difference)<1e-9?'기대값 차이 없음':number.format(Math.abs(difference))+' 유리'));
      if(localMax< -1e-9)choice.append(el('small','둘 다 손실','profit-choice-loss'));
    }
    if(persist)try{localStorage.setItem(storageKey,JSON.stringify(values));}catch{}
  }
  try{const stored=JSON.parse(localStorage.getItem(storageKey));if(stored){compareEnhancementProfit(stored);form.elements.itemPrice.value=stored.itemPrice;form.elements.blessingPrice.value=stored.blessingPrice;for(const target of [8,9,10])form.elements['reward'+target].value=stored.rewards[target];}}catch{}
  for(const [,input,slider]of pairs){slider.addEventListener('input',()=>{input.value=slider.value;render();});input.addEventListener('input',()=>render());}
  for(const input of inputs.filter(input=>input.name.startsWith('reward')))input.addEventListener('input',()=>render());
  form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('reset',event=>{event.preventDefault();for(const input of inputs)input.value=input.defaultValue;render();});render(false);
}
