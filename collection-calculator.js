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

function updateResults() {
  const invalid = pricePairs.find(([input]) => !input.validity.valid);
  pricePairs.forEach(([input]) => input.setAttribute('aria-invalid', String(!input.validity.valid)));
  error.hidden = !invalid;
  if (invalid) {
    error.textContent = invalid[0].id === 'collection-item-price'
      ? '아이템 시세는 0.01~300 사이의 값을 입력해주세요.'
      : '강화 주문서 시세는 0.01~10 사이의 값을 입력해주세요.';
    body.replaceChildren();
    return;
  }
  const kind = form.elements.equipment.value;
  const results = enhancementCosts(kind, pricePairs[0][0].valueAsNumber, pricePairs[1][0].valueAsNumber);
  const rows = results.map(result => {
    const row = document.createElement('tr');
    row.dataset.target = result.target;
    if (result.successProbability === 1) row.className = 'collection-safe';
    const values = [result.target + '강', probabilityFormat.format(result.successProbability * 100) + '%',
      ...[result.mean, result.standardDeviation, result.lower, result.upper].map(value => numberFormat.format(value))];
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? 'th' : 'td');
      if (index === 0) cell.scope = 'row';
      if (index === 2) cell.className = 'collection-mean';
      cell.textContent = value;
      row.append(cell);
    });
    return row;
  });
  body.replaceChildren(...rows);
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
updateResults();
