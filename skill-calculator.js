import {skillDistribution, skillRates} from './skill-model.js';

const form = document.getElementById('skill-settings');
const input = document.getElementById('skill-stock');
const slider = document.getElementById('skill-stock-slider');
const body = document.querySelector('#skill-results tbody');
const error = document.getElementById('skill-error');
const cache = new Map();
const integer = new Intl.NumberFormat('ko-KR');
const decimal = new Intl.NumberFormat('ko-KR', {maximumFractionDigits: 2, minimumFractionDigits: 2});
const percent = value => decimal.format(value * 100) + '%';

function update() {
  const valid = input.validity.valid;
  input.setAttribute('aria-invalid', String(!valid));
  error.hidden = valid;
  if (!valid) {error.textContent = '보유 주문서는 0~10,000 사이의 정수로 입력해주세요.';body.replaceChildren();return;}
  const grade = form.elements.grade.value;
  const rates=skillRates(grade);
  if (!cache.has(grade)) cache.set(grade, rates.filter(rate=>rate.down>0&&rate.up<1).map(rate=>({...skillDistribution(grade,rate.target-1,rate.target),successProbability:rate.up})));
  body.replaceChildren();
  for (const result of cache.get(grade)) {
    const row = document.createElement('tr');
    const values = [`${result.start} → ${result.target}강`, integer.format(result.successProbability*100)+'%', decimal.format(result.mean) + '개', ...result.quantiles.map(value => integer.format(value) + '개'), percent(result.probability(input.valueAsNumber)), percent(result.overMean), percent(result.overDoubleMean)];
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.scope = 'row';
      if (index === 2) cell.className = 'collection-mean';
      if (index === 6) cell.className = 'skill-budget-chance';
      cell.textContent = value;
      row.append(cell);
    });
    body.append(row);
  }
  document.getElementById('skill-stock-caption').textContent = `보유 ${integer.format(input.valueAsNumber)}개 기준`;
  const ratesBody = document.querySelector('#skill-rates tbody');
  ratesBody.replaceChildren();
  for (const rate of rates.filter(rate=>rate.up<1)) {
    const row = document.createElement('tr');
    [rate.target + '강 도전', rate.up, rate.stay, rate.down].forEach((value, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.scope = 'row';
      cell.textContent = index === 0 ? value : Math.round(value * 100) + '%';
      row.append(cell);
    });
    ratesBody.append(row);
  }
}
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('change', update);
input.addEventListener('input', () => {if (input.validity.valid) slider.value = Math.min(Number(slider.max), input.valueAsNumber);update();});
slider.addEventListener('input', () => {input.value = slider.value;update();});
form.addEventListener('reset', () => queueMicrotask(update));
update();

const toolTabs = [...document.querySelectorAll('[data-calculator]')];
const toolTabStorageKey = 'guild-tool-tab-v1';
const shareButton = document.getElementById('calculator-share');
const shareStatus = document.getElementById('calculator-share-status');
let shareTimer;
function linkedCalculator() {
  const parts = location.hash.slice(1).split('/');
  return parts.length === 2 && parts[0] === 'tools' ? toolTabs.find(tab => tab.dataset.calculator === parts[1]) : null;
}
function selectCalculator(button, persist = true) {
  for (const tab of toolTabs) {
    const active = tab === button;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  }
  document.getElementById('calculator-heading').textContent = button.querySelector('span').textContent;
  clearTimeout(shareTimer);shareStatus.textContent='';shareButton.title='링크 복사';shareButton.setAttribute('aria-label',button.querySelector('span').textContent+' 링크 복사');
  if (persist) {try {localStorage.setItem(toolTabStorageKey, button.dataset.calculator);} catch {}}
  if (persist && location.hash.split('/')[0] === '#tools') history.replaceState(null, '', '#tools/' + button.dataset.calculator);
}
let savedTab;
try {savedTab = toolTabs.find(tab => tab.dataset.calculator === localStorage.getItem(toolTabStorageKey));} catch {}
const initialTab=linkedCalculator()||savedTab;
if(initialTab)selectCalculator(initialTab);
window.addEventListener('hashchange',()=>{const linked=linkedCalculator();if(linked)selectCalculator(linked);});
shareButton.addEventListener('click',async()=>{
  const selected=toolTabs.find(tab=>tab.getAttribute('aria-selected')==='true');
  const url=new URL('/share/tools/'+selected.dataset.calculator,noticesApi);url.searchParams.set('v','1');
  try{
    try{await navigator.clipboard.writeText(url.href);}catch{
      const input=document.createElement('textarea');input.value=url.href;input.readOnly=true;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();
      let copied=false;try{copied=document.execCommand('copy');}finally{input.remove();shareButton.focus({preventScroll:true});}if(!copied)throw new Error('clipboard');
    }
    if(selected.getAttribute('aria-selected')!=='true')return;
    shareStatus.textContent='링크를 복사했습니다.';shareButton.title='복사 완료';
    shareTimer=setTimeout(()=>{shareStatus.textContent='';shareButton.title='링크 복사';},2500);
  }catch{window.prompt('편의 기능 공유 링크',url.href);}
});
for (const [index, tab] of toolTabs.entries()) {
  tab.addEventListener('click', () => selectCalculator(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % toolTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + toolTabs.length - 1) % toolTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = toolTabs.length - 1;
    else return;
    event.preventDefault();selectCalculator(toolTabs[next]);toolTabs[next].focus();
  });
}
