const STAT_OPTIONS = [
  '공격력', '방어력', '명중', '치명', '극대화', '막기 관통',
  '무기 증폭', '피해 증가', '피해 감소', '생명력 재생', '마나 재생', '막기'
];
const GRADE_OPTIONS = [
  { name: '일반', weight: 40, className: 'normal' },
  { name: '고급', weight: 30, className: 'advanced' },
  { name: '희귀', weight: 20, className: 'rare' },
  { name: '영웅', weight: 7, className: 'hero' },
  { name: '전설', weight: 3, className: 'legend' }
];
const MAX_STRINGS = 12;
const MAX_PERFORMANCES = 24;
const RESET_COST = 250;

const stringsList = document.getElementById('epic-strings');
const choicesBox = document.getElementById('epic-choices');
const playButton = document.getElementById('epic-play');
const rerollButton = document.getElementById('epic-reroll');
const newActButton = document.getElementById('epic-new-act');
const resetButton = document.getElementById('epic-reset');
const resetDialog = document.getElementById('epic-reset-dialog');
const resetDetail = document.getElementById('epic-reset-detail');
const resetCostLabel = document.getElementById('epic-reset-cost');
const advice = document.getElementById('epic-advice');
const feedback = document.getElementById('epic-feedback');

let notes = [];
let choices = null;
let performances = 0;
let rerollsUsed = 0;

function drawChoices() {
  return Array.from({ length: 3 }, () => {
    const roll = Math.random() * 100;
    let cumulative = 0;
    const grade = GRADE_OPTIONS.find((option) => {
      cumulative += option.weight;
      return roll < cumulative;
    }) ?? GRADE_OPTIONS[0];
    return {
      stat: STAT_OPTIONS[Math.floor(Math.random() * STAT_OPTIONS.length)],
      grade: grade.name,
      gradeClass: grade.className
    };
  });
}

function longestRun(values = notes) {
  let best = 0;
  let run = 0;
  let previous = null;
  for (const note of values) {
    run = note.stat === previous ? run + 1 : 1;
    previous = note.stat;
    best = Math.max(best, run);
  }
  return best;
}

function resetCost() {
  const remainingStrings = MAX_STRINGS - notes.length;
  const remainingPerformances = MAX_PERFORMANCES - performances;
  return notes.length === MAX_STRINGS || remainingStrings === remainingPerformances ? 0 : RESET_COST;
}

function availableRerolls() {
  const performancesLeft = MAX_PERFORMANCES - performances;
  const futureStrings = MAX_STRINGS - notes.length - (choices ? 1 : 0);
  const reservedPerformances = Math.max(0, futureStrings);
  return Math.max(0, Math.min(12 - rerollsUsed, performancesLeft - reservedPerformances));
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
      if (index > 0 && notes[index].stat === notes[index - 1].stat) item.classList.add('is-linked');
      item.classList.add(`grade-${notes[index].gradeClass}`);
      item.textContent = notes[index].stat;
      item.setAttribute('aria-label', `${index + 1}번 현, ${notes[index].grade} ${notes[index].stat}`);
    } else {
      item.textContent = String(index + 1);
      item.setAttribute('aria-label', `${index + 1}번 현, 비어 있음`);
      if (index === notes.length) item.classList.add('is-current');
    }
    stringsList.append(item);
  }

  document.getElementById('epic-attempts').textContent = String(performances);
  document.getElementById('epic-masthead-progress').textContent = `${notes.length} / ${MAX_STRINGS}`;
  document.getElementById('epic-longest').textContent = String(longestRun());
  const done = notes.length === MAX_STRINGS;
  const hasChoices = choices !== null;
  const next = Math.min(notes.length + 1, MAX_STRINGS);
  document.getElementById('epic-progress-label').textContent = done ? '악장 완성' : `${notes.length} / ${MAX_STRINGS}현 완성`;
  document.getElementById('epic-current-label').textContent = done ? '완성된 악장' : hasChoices ? '현재 연주 중' : '다음 현';
  document.getElementById('epic-current-value').textContent = done ? `${longestRun()}현 연속` : `${next}번 현`;
  playButton.hidden = hasChoices || done;
  playButton.disabled = performances >= MAX_PERFORMANCES || MAX_PERFORMANCES - performances < MAX_STRINGS - notes.length;
  rerollButton.hidden = !hasChoices || done;
  rerollButton.disabled = availableRerolls() <= 0;
  newActButton.hidden = !done;
  choicesBox.replaceChildren();
  if (hasChoices && !done) {
    choices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'epic-choice';
      button.classList.add(`grade-${choice.gradeClass}`);
      button.innerHTML = `<span class="epic-choice-grade">${choice.grade}</span><strong>${choice.stat}</strong><span class="epic-choice-probability" title="공식 능력치 확률이 아닌, 연습 모델의 12종 균등 추첨 확률입니다. 카드 1장 기준이며 등급은 제외합니다.">연습 확률 ${(100 / STAT_OPTIONS.length).toFixed(2)}%</span>`;
      button.setAttribute('aria-label', `${choice.grade} ${choice.stat} 선택`);
      button.addEventListener('click', () => applyChoice(choice));
      choicesBox.append(button);
    });
  }
  resetButton.disabled = !notes.length && !hasChoices;
  resetButton.querySelector('span').textContent = resetCost() ? `악장 초기화 · ${RESET_COST} 다이아` : '악장 초기화 · 무료';
  renderAdvice();
}

function applyChoice(choice) {
  if (!choices || !choice || !choices.includes(choice)) return;
  const originalIndex = GRADE_OPTIONS.findIndex((grade) => grade.name === choice.grade);
  const upgraded = originalIndex < GRADE_OPTIONS.length - 1 && Math.random() < 0.03;
  const finalGrade = GRADE_OPTIONS[originalIndex + Number(upgraded)];
  notes.push({ stat: choice.stat, grade: finalGrade.name, gradeClass: finalGrade.className });
  feedback.textContent = upgraded ? `등급 상승 · ${choice.grade} → ${finalGrade.name}` : '';
  feedback.classList.toggle('is-upgraded', upgraded);
  choices = null;
  render();
}

function startPerformance(isReroll = false) {
  if (performances >= MAX_PERFORMANCES || notes.length >= MAX_STRINGS) return;
  if (isReroll && availableRerolls() <= 0) return;
  if (!isReroll && MAX_PERFORMANCES - performances < MAX_STRINGS - notes.length) return;
  performances += 1;
  if (isReroll) rerollsUsed += 1;
  choices = drawChoices();
  feedback.textContent = '';
  feedback.classList.remove('is-upgraded');
  document.getElementById('epic-current-label').textContent = isReroll ? '새 선택지' : '선택지를 고르세요';
  render();
  if (window.lucide) window.lucide.createIcons();
}

playButton.addEventListener('click', () => startPerformance());
rerollButton.addEventListener('click', () => startPerformance(true));

resetButton.addEventListener('click', () => {
  const cost = resetCost();
  resetDetail.textContent = notes.length || choices
    ? `${notes.length}개 현에 확정한 능력치와 현재 연주 상태, 사용 횟수가 모두 사라집니다.`
    : '새 악장을 시작합니다.';
  resetCostLabel.textContent = cost ? `${cost} 다이아` : '무료';
  resetDialog.showModal();
});

document.getElementById('epic-reset-cancel').addEventListener('click', () => resetDialog.close());
document.getElementById('epic-reset-confirm').addEventListener('click', () => {
  resetDialog.close();
  notes = [];
  choices = null;
  feedback.textContent = '';
  feedback.classList.remove('is-upgraded');
  performances = 0;
  rerollsUsed = 0;
  render();
});

newActButton.addEventListener('click', () => {
  notes = [];
  choices = null;
  feedback.textContent = '';
  feedback.classList.remove('is-upgraded');
  performances = 0;
  rerollsUsed = 0;
  render();
});

render();
