import {enhancementCosts} from './enhancement-model.js';

const form = document.getElementById('collection-settings');
const body = document.querySelector('#collection-results tbody');
const error = document.getElementById('collection-error');
const pricePairs = [
  [document.getElementById('collection-item-price'), document.getElementById('collection-item-slider')],
  [document.getElementById('collection-scroll-price'), document.getElementById('collection-scroll-slider')],
];
const numberFormat = new Intl.NumberFormat('ko-KR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const probabilityFormat = new Intl.NumberFormat('ko-KR', {maximumSignificantDigits: 6});
const compactFormat = new Intl.NumberFormat('ko-KR', {notation:'compact', maximumFractionDigits:2});
const distributionStatus = document.getElementById('collection-distribution-status');
const worker = new Worker(new URL('./collection-worker.js?v=20261004-22', import.meta.url), {type:'module'});
let requestId=0,timer;
const formatCost=value=>value>=1e9?compactFormat.format(value):numberFormat.format(value);
worker.addEventListener('message', ({data})=>{
  if(data.id!==requestId)return;
  if(data.error){distributionStatus.textContent='분포 계산에 실패했습니다.';return;}
  if(data.done){distributionStatus.textContent='';return;}
  const row=body.querySelector(`[data-target="${data.target}"]`);
  if(!row)return;
  row.dataset.distribution=data.method;
  const prefix=data.method==='sampled'?'≈ ':'';
  const values=[...data.quantiles.map(value=>prefix+formatCost(value)),
    prefix+numberFormat.format(data.overMean*100)+'%',prefix+numberFormat.format(data.overDoubleMean*100)+'%'];
  [...row.querySelectorAll('.collection-risk')].forEach((cell,index)=>{
    cell.textContent=values[index];
    cell.title=(data.method==='sampled'?'100,000회 시뮬레이션 추정: ':'정확 계산: ')+(index<3?numberFormat.format(data.quantiles[index])+' 다이아':values[index]);
  });
});
worker.addEventListener('error',()=>{distributionStatus.textContent='분포 계산에 실패했습니다.';});

function updateResults() {
  const id=++requestId;
  clearTimeout(timer);
  const invalid = pricePairs.find(([input]) => !input.validity.valid);
  pricePairs.forEach(([input]) => input.setAttribute('aria-invalid', String(!input.validity.valid)));
  error.hidden = !invalid;
  if (invalid) {
    error.textContent = invalid[0].id === 'collection-item-price'
      ? '아이템 습득 비용은 0.01~300 사이의 값을 입력해주세요.'
      : '주문서 비용은 0.01~10 사이의 값을 입력해주세요.';
    body.replaceChildren();
    distributionStatus.textContent='';
    return;
  }
  const kind = form.elements.equipment.value;
  const results = enhancementCosts(kind, pricePairs[0][0].valueAsNumber, pricePairs[1][0].valueAsNumber);
  const rows = results.filter(result => result.successProbability < 1).map(result => {
    const row = document.createElement('tr');
    row.dataset.target = result.target;
    if (result.successProbability === 1) row.className = 'collection-safe';
    const values = [result.target + '강', formatCost(result.mean),'…','…','…','…','…'];
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.scope = 'row';
      if (index === 1) {cell.className = 'collection-mean';cell.title='평균 '+numberFormat.format(result.mean)+' 다이아 · 표준편차 '+numberFormat.format(result.standardDeviation);}
      if (index >= 2) cell.className = 'collection-risk';
      cell.textContent = value;
      if(index===0){const chance=document.createElement('small');chance.textContent=result.successProbability<1e-6?(result.successProbability*100).toExponential(2)+'%':probabilityFormat.format(result.successProbability*100)+'%';chance.title='한 아이템으로 목표 강화에 도달할 확률';cell.append(chance);}
      row.append(cell);
    });
    return row;
  });
  body.replaceChildren(...rows);
  distributionStatus.textContent='분포 계산 중';
  timer=setTimeout(()=>worker.postMessage({id,kind,itemPrice:pricePairs[0][0].valueAsNumber,scrollPrice:pricePairs[1][0].valueAsNumber}),80);
}

pricePairs.forEach(([input, slider]) => {
  input.addEventListener('input', () => {
    if (input.validity.valid) slider.value = input.value;
    updateResults();
  });
  slider.addEventListener('input', () => {
    input.value = slider.value;
    updateResults();
  });
});
form.addEventListener('change', updateResults);
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', event => {
  event.preventDefault();
  form.querySelectorAll('input[type=radio]').forEach(input => {input.checked = input.defaultChecked;});
  pricePairs.forEach(pair => pair.forEach(input => {input.value = input.defaultValue;}));
  updateResults();
});
updateResults();
