const STAT_OPTIONS = [
  '공격력', '방어력', '명중', '치명', '극대화', '막기 관통',
  '무기 증폭', '피해 증가', '피해 감소', '생명력 재생', '마나 재생', '막기'
];
const MAX_STRINGS = 12;
const MAX_PERFORMANCES = 24;
const RESET_COST = 250;

const stringsList = document.getElementById('epic-strings');
const choicesBox = document.getElementById('epic-choices');
const playButton = document.getElementById('epic-play');
const rerollButton = document.getElementById('epic-reroll');
const applyButton = document.getElementById('epic-apply');
const newActButton = document.getElementById('epic-new-act');
const resetButton = document.getElementById('epic-reset');
const advice = document.getElementById('epic-advice');

let notes = [];
let choices = null;
let selected = -1;
let performances = 0;
let rerollsUsed = 0;

function drawChoices() {
  const result = [];
  while (result.length < 3) result.push(STAT_OPTIONS[Math.floor(Math.random() * STAT_OPTIONS.length)]);
  return result;
}

function longestRun(values = notes) {
  let best = 0;
  let run = 0;
  let previous = null;
  for (const note of values) {
    run = note === previous ? run + 1 : 1;
    previous = note;
    best = Math.max(best, run);
  }
  return best;
}

function resetCost() {
  const remainingStrings = MAX_STRINGS - notes.length;
  const remainingPerformances = MAX_PERFORMANCES - performances;
  return notes.length === MAX_STRINGS || remainingStrings === remainingPerformances ? 0 : RESET_COST;
}

function renderAdvice() {
  const chain = longestRun();
  const remaining = MAX_PERFORMANCES - performances;
  if (notes.length >= 6 && chain < 2) {
    advice.textContent = '6현까지 연속 배치가 없어요. 세운 전략대로 이 악장을 초기화할지 판단하세요.';
  } else if (chain >= 5) {
    advice.textContent = `목표인 ${chain}현 연속을 달성했어요. 남은 횟수는 추가 연속 배치를 노리는 데 사용할 수 있습니다.`;
  } else if (chain >= 4 && remaining <= 6) {
    advice.textContent = `현재 ${chain}현 연속 · 남은 연주 횟수 ${remaining}회. 5현 연속을 노린 뒤 750다이아 상품이나 이음표 사용을 판단하세요.`;
  } else if (chain >= 4) {
    advice.textContent = `현재 ${chain}현 연속. 다음 현에서 5현 연속을 노려보세요.`;
  } else if (chain >= 2) {
    advice.textContent = `현재 최고 ${chain}현 연속. 다음 현에서 같은 능력치를 고르면 연속 배치가 이어집니다.`;
  } else if (notes.length < 6) {
    advice.textContent = '1~6번 현을 채우는 동안 같은 능력치가 이어지기 전에는 다시 연주를 아껴보세요.';
  } else {
    advice.textContent = '연속 능력치가 생길 때까지 다음 현을 채워보세요.';
  }
}

function render() {
  stringsList.replaceChildren();
  for (let index = 0; index < MAX_STRINGS; index += 1) {
    const item = document.createElement('li');
    item.className = 'epic-string';
    if (notes[index]) {
      item.classList.add('is-filled');
      if (index > 0 && notes[index] === notes[index - 1]) item.classList.add('is-linked');
      item.textContent = notes[index];
      item.setAttribute('aria-label', `${index + 1}번 현, ${notes[index]}`);
    } else {
      item.textContent = String(index + 1);
      item.setAttribute('aria-label', `${index + 1}번 현, 비어 있음`);
      if (index === notes.length) item.classList.add('is-current');
    }
    stringsList.append(item);
  }

  document.getElementById('epic-attempts').textContent = String(performances);
  document.getElementById('epic-rerolls-used').textContent = String(rerollsUsed);
  document.getElementById('epic-longest').textContent = String(longestRun());
  const done = notes.length === MAX_STRINGS;
  const hasChoices = choices !== null;
  const next = Math.min(notes.length + 1, MAX_STRINGS);
  document.getElementById('epic-progress-label').textContent = done ? '악장 완성' : `${notes.length} / ${MAX_STRINGS}현 완성`;
  document.getElementById('epic-current-label').textContent = done ? '완성된 악장' : hasChoices ? '현재 연주 중' : '다음 현';
  document.getElementById('epic-current-value').textContent = done ? `${longestRun()}현 연속` : `${next}번 현`;
  playButton.hidden = hasChoices || done;
  playButton.disabled = performances >= MAX_PERFORMANCES;
  rerollButton.hidden = !hasChoices || done;
  rerollButton.disabled = performances >= MAX_PERFORMANCES || rerollsUsed >= 12;
  applyButton.hidden = !hasChoices || done;
  applyButton.disabled = selected < 0;
  newActButton.hidden = !done;
  choicesBox.replaceChildren();
  if (hasChoices && !done) {
    choices.forEach((stat, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'epic-choice';
      button.setAttribute('aria-pressed', String(selected === index));
      button.textContent = stat;
      button.addEventListener('click', () => { selected = index; render(); });
      choicesBox.append(button);
    });
  }
  resetButton.disabled = !notes.length && !hasChoices;
  resetButton.querySelector('span').textContent = resetCost() ? `악장 초기화 · ${RESET_COST} 다이아` : '악장 초기화 · 무료';
  renderAdvice();
}

function startPerformance(isReroll = false) {
  if (performances >= MAX_PERFORMANCES || notes.length >= MAX_STRINGS || (isReroll && rerollsUsed >= 12)) return;
  performances += 1;
  if (isReroll) rerollsUsed += 1;
  choices = drawChoices();
  selected = -1;
  document.getElementById('epic-current-label').textContent = isReroll ? '새 선택지' : '선택지를 고르세요';
  render();
  if (window.lucide) window.lucide.createIcons();
}

playButton.addEventListener('click', () => startPerformance());
rerollButton.addEventListener('click', () => startPerformance(true));
applyButton.addEventListener('click', () => {
  if (!choices || selected < 0) return;
  notes.push(choices[selected]);
  choices = null;
  selected = -1;
  render();
});

resetButton.addEventListener('click', () => {
  const cost = resetCost();
  const prompt = cost
    ? `현재 악장을 초기화할까요? ${cost}다이아를 사용하고, 선택한 능력치와 연주 횟수가 초기화됩니다.`
    : '현재 악장을 무료로 초기화할까요? 선택한 능력치와 연주 횟수가 초기화됩니다.';
  if (!window.confirm(prompt)) return;
  notes = [];
  choices = null;
  selected = -1;
  performances = 0;
  rerollsUsed = 0;
  render();
});

newActButton.addEventListener('click', () => {
  notes = [];
  choices = null;
  selected = -1;
  performances = 0;
  rerollsUsed = 0;
  render();
});

render();
