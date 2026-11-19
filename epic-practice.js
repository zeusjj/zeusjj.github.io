import { parseOptions, drawOption, groupOptions } from './epic-probability-model.js?v=20261118-1';
let optionSets = [];
let activeOptions = [];
const songSelect = document.getElementById('epic-song');
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
const feedback = document.getElementById('epic-feedback');
const headerStats = document.getElementById('epic-header-stats');
const aiMode = document.getElementById('epic-ai-mode');
const aiTarget = document.getElementById('epic-ai-target');
const aiMessage = document.getElementById('epic-ai-message');
const aiCurrentChance = document.getElementById('epic-ai-current-chance');
const aiResetRow = document.getElementById('epic-ai-reset-row');
const aiResetChance = document.getElementById('epic-ai-reset-chance');
const aiState = document.getElementById('epic-ai-state');
const statsEndpoint = 'https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/epic-practice/stats';

let notes = [];
let choices = null;
let performances = 0;
let rerollsUsed = 0;
let globalStats = null;

function renderGlobalStats() {
  document.getElementById('epic-total-performances').textContent = globalStats?.performances.toLocaleString('ko-KR') ?? '불러오는 중';
  document.getElementById('epic-total-diamonds').textContent = globalStats?.resetDiamonds.toLocaleString('ko-KR') ?? '불러오는 중';
}

async function refreshGlobalStats() {
  try {
    const response = await fetch(statsEndpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error('Stats unavailable');
    const stats = await response.json();
    if (!Number.isSafeInteger(stats.performances) || !Number.isSafeInteger(stats.resetDiamonds)) throw new Error('Invalid stats');
    globalStats = { performances: stats.performances, resetDiamonds: stats.resetDiamonds };
    renderGlobalStats();
  } catch {
    if (!globalStats) {
      document.getElementById('epic-total-performances').textContent = '잠시 후';
      document.getElementById('epic-total-diamonds').textContent = '잠시 후';
    }
  }
}

async function recordGlobalAction(action, amount = 0) {
  try {
    const response = await fetch(statsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: crypto.randomUUID(), action, amount })
    });
    if (!response.ok) throw new Error('Stats update failed');
    const stats = await response.json();
    if (Number.isSafeInteger(stats.performances) && Number.isSafeInteger(stats.resetDiamonds)) {
      globalStats = { performances: stats.performances, resetDiamonds: stats.resetDiamonds };
      renderGlobalStats();
    }
  } catch {
    refreshGlobalStats();
  }
}

function syncHeaderStats() {
  headerStats.hidden = document.getElementById('epic-heading').getAttribute('aria-selected') !== 'true';
}

syncHeaderStats();
window.addEventListener('guild-calculator-change', syncHeaderStats);
refreshGlobalStats();
window.setInterval(refreshGlobalStats, 15000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshGlobalStats(); });

function drawChoices() {
  return Array.from({ length: 3 }, () => drawOption(activeOptions));
}

function renderProbabilities() {
  const body = document.getElementById('epic-probability-rows');
  body.replaceChildren();
  for (const [probability, options] of groupOptions(activeOptions)) {
    const row = document.createElement('tr');
    const chance = document.createElement('th');
    chance.scope = 'row';
    chance.textContent = probability;
    const labels = document.createElement('td');
    options.forEach((option, index) => {
      if (index) labels.append(', ');
      const label = document.createElement('span');
      label.className = `grade-${option.gradeClass}`;
      label.textContent = `${option.grade} ${option.label}`;
      labels.append(label);
    });
    row.append(chance, labels);
    body.append(row);
  }
}

songSelect.addEventListener('change', () => {
  if (notes.length || choices) return;
  activeOptions = optionSets[Number(songSelect.value)].options;
  renderProbabilities();
});

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

function statOdds() {
  const total = activeOptions.reduce((sum, option) => sum + option.weight, 0);
  const weights = new Map();
  for (const option of activeOptions) weights.set(option.stat, (weights.get(option.stat) || 0) + option.weight);
  return new Map([...weights].map(([stat, weight]) => [stat, weight / total]));
}

function maximumRun(values) {
  let best = 0;
  let run = 0;
  let previous = null;
  for (const value of values) {
    run = value === previous ? run + 1 : 1;
    previous = value;
    best = Math.max(best, run);
  }
  return best;
}

function trailingRun(values) {
  if (!values.length) return 0;
  let run = 1;
  for (let index = values.length - 1; index > 0 && values[index] === values[index - 1]; index -= 1) run += 1;
  return run;
}

function seedFrom(value) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function seededRandom(seed, iteration) {
  let value = (seed ^ Math.imul(iteration + 1, 0x9e3779b9)) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function simulateSuccess(state, target, seed, iterations = 1200) {
  const odds = statOdds();
  const total = [...odds.values()].reduce((sum, value) => sum + value, 0);
  const drawStat = random => {
    let roll = random() * total;
    for (const [stat, chance] of odds) {
      roll -= chance;
      if (roll < 0) return stat;
    }
    return odds.keys().next().value;
  };
  const drawHand = random => Array.from({ length: 3 }, () => drawStat(random));
  const canReroll = (usedPerformances, usedRerolls, filled, hasHand) => {
    const futureStrings = MAX_STRINGS - filled - (hasHand ? 1 : 0);
    return Math.min(12 - usedRerolls, MAX_PERFORMANCES - usedPerformances - futureStrings) > 0;
  };
  let wins = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const random = seededRandom(seed, iteration);
    const filled = [...state.notes];
    let usedPerformances = state.performances;
    let usedRerolls = state.rerollsUsed;
    let hand = state.choices ? [...state.choices] : null;
    if (state.preselectedStat) {
      filled.push(state.preselectedStat);
      if (maximumRun(filled) >= target) { wins += 1; continue; }
      hand = null;
    }
    if (state.rerollFirst) {
      if (!hand || !canReroll(usedPerformances, usedRerolls, filled.length, true)) continue;
      usedPerformances += 1;
      usedRerolls += 1;
      hand = drawHand(random);
    }

    for (let guard = 0; filled.length < MAX_STRINGS && guard < 60; guard += 1) {
      if (!hand) {
        if (usedPerformances >= MAX_PERFORMANCES || MAX_PERFORMANCES - usedPerformances < MAX_STRINGS - filled.length) break;
        usedPerformances += 1;
        hand = drawHand(random);
      }
      const previous = filled.at(-1);
      const matching = previous && hand.includes(previous);
      if (!matching && trailingRun(filled) >= 2 && canReroll(usedPerformances, usedRerolls, filled.length, true)) {
        usedPerformances += 1;
        usedRerolls += 1;
        hand = drawHand(random);
        continue;
      }
      const selected = matching ? previous : hand.reduce((best, stat) => (odds.get(stat) || 0) > (odds.get(best) || 0) ? stat : best);
      filled.push(selected);
      hand = null;
      if (maximumRun(filled) >= target) { wins += 1; break; }
    }
  }
  return wins / iterations;
}

function estimatedChance(state, target, label) {
  const fingerprint = `${target}|${state.notes.join(',')}|${state.performances}|${state.rerollsUsed}|${state.choices?.join(',') || ''}|${state.preselectedStat || ''}|${label}`;
  return simulateSuccess(state, target, seedFrom(fingerprint));
}

function renderAi() {
  const target = Number(aiTarget.value);
  const stats = notes.map(note => note.stat);
  const chain = maximumRun(stats);
  const remaining = MAX_PERFORMANCES - performances;
  aiState.textContent = `현재 악장 · ${notes.length}/12현 · 최고 ${chain}연속 · 남은 연주 ${remaining}회`;
  choicesBox.classList.toggle('epic-ai-mode-off', !aiMode.checked);
  if (!aiMode.checked) {
    aiCurrentChance.textContent = '-';
    aiResetRow.hidden = true;
    aiMessage.textContent = 'AI 모드를 껐어요. 연주판은 그대로 직접 진행할 수 있어요.';
    return null;
  }
  if (!activeOptions.length) {
    aiCurrentChance.textContent = '-';
    aiResetRow.hidden = true;
    aiMessage.textContent = '공식 옵션 확률을 불러오지 못해 추천을 잠시 멈췄어요.';
    return null;
  }

  const targetMet = chain >= target;
  const currentState = { notes: stats, performances, rerollsUsed, choices: choices?.map(choice => choice.stat) ?? null };
  const currentChance = estimatedChance(currentState, target, 'current');
  const freshChance = estimatedChance({ notes: [], performances: 0, rerollsUsed: 0, choices: null }, target, 'fresh');
  aiCurrentChance.textContent = `${(currentChance * 100).toFixed(1)}%`;
  aiResetRow.hidden = !(notes.length >= 6 && chain < 2 && !targetMet);
  aiResetChance.textContent = `${(freshChance * 100).toFixed(1)}% · ${resetCost() ? '250 다이아' : '무료'}`;

  if (targetMet) {
    aiMessage.textContent = `목표 ${target}연속을 이미 만들었어요. 더 이어가고 싶다면 현재 연결 능력치가 있는 카드를 골라요.`;
    return { action: 'select', stat: choices?.find(choice => choice.stat === notes.at(-1)?.stat)?.stat };
  }

  if (notes.length >= 6 && chain < 2) {
    const benefit = freshChance - currentChance;
    if (resetCost() === 0 || benefit >= 0.04) {
      aiMessage.textContent = `6현까지 연결이 없어요. 지금 이어갈 예상은 ${(currentChance * 100).toFixed(1)}%, 새 악장은 ${(freshChance * 100).toFixed(1)}%예요. ${resetCost() ? '250 다이아를 쓰고' : '무료로'} 초기화하는 편이 나아요.`;
      return { action: 'reset' };
    }
    aiMessage.textContent = `아직 초기화할 정도로 차이가 크지 않아요. 계속하면 ${(currentChance * 100).toFixed(1)}%, 새 악장은 ${(freshChance * 100).toFixed(1)}%예요. 다이아를 아끼며 이어가는 쪽을 권해요.`;
    return null;
  }

  if (!choices) {
    aiMessage.textContent = notes.length
      ? `다음 현은 ${notes.length + 1}번 현이에요. 연주를 눌러 세 장을 펼쳐봐요. 현재 ${chain}연속은 연결되기 전까지 리롤을 아껴둘게요.`
      : `먼저 연주를 눌러 세 장을 펼쳐봐요. 6현까지 같은 능력치가 붙기 전에는 리롤을 아껴 연주권을 남길게요.`;
    return { action: 'play' };
  }

  const odds = statOdds();
  const matching = notes.length ? choices.find(choice => choice.stat === notes.at(-1).stat) : null;
  if (matching) {
    const nextLinkChance = (1 - (1 - (odds.get(matching.stat) || 0)) ** 3) * 100;
    const nextRun = trailingRun(stats) + 1;
    aiMessage.textContent = `여기 ${matching.stat} 카드가 있어요. 고르면 ${nextRun}연속이 확정돼요. 다음 세 장에 같은 능력치가 뜰 확률은 약 ${nextLinkChance.toFixed(1)}%예요. 다시 연주하지 말고 이 카드를 골라요.`;
    return { action: 'select', stat: matching.stat };
  }

  const optionStats = [...new Set(choices.map(choice => choice.stat))];
  const scored = optionStats.map(stat => ({
    stat,
    chance: estimatedChance({ ...currentState, choices: choices.map(choice => choice.stat), preselectedStat: stat }, target, `choose-${stat}`)
  })).sort((a, b) => b.chance - a.chance);
  let best = scored[0];

  if (trailingRun(stats) >= 2 && availableRerolls() > 0) {
    const rerollChance = estimatedChance({ ...currentState, rerollFirst: true }, target, 'reroll');
    const matchProbability = (1 - (1 - (odds.get(notes.at(-1).stat) || 0)) ** 3) * 100;
    if (rerollChance > best.chance) {
      aiMessage.textContent = `현재 연결은 ${trailingRun(stats)}연속인데 이어줄 카드가 없어요. 다시 연주하면 같은 능력치가 새 세 장에 나올 확률은 약 ${matchProbability.toFixed(1)}%, 목표 달성 예상은 ${(rerollChance * 100).toFixed(1)}%예요. 연주권을 남길 수 있으니 다시 연주를 권해요.`;
      return { action: 'reroll' };
    }
    best = { ...best, rerollChance };
  }

  const chance = best?.chance ?? currentChance;
  aiMessage.textContent = best
    ? `${best.stat}을 고르는 편이 가장 유리해요. 이 선택을 기준으로 목표 달성 예상은 ${(chance * 100).toFixed(1)}%예요.${best.rerollChance !== undefined ? ` 다시 연주 예상 ${(best.rerollChance * 100).toFixed(1)}%보다 높아요.` : ' 아직 6현 전이라면 리롤은 아껴요.'}`
    : '현재 선택지를 확인하고 있어요.';
  return { action: 'select', stat: best?.stat };
}

function render() {
  renderGlobalStats();
  const recommendation = renderAi();
  stringsList.replaceChildren();
  for (let index = 0; index < MAX_STRINGS; index += 1) {
    const item = document.createElement('li');
    item.className = 'epic-string';
    if (notes[index]) {
      item.classList.add('is-filled');
      if (index > 0 && notes[index].stat === notes[index - 1].stat) item.classList.add('is-linked');
      item.classList.add(`grade-${notes[index].gradeClass}`);
      item.textContent = notes[index].label;
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
  playButton.disabled = !activeOptions.length || performances >= MAX_PERFORMANCES || MAX_PERFORMANCES - performances < MAX_STRINGS - notes.length;
  songSelect.disabled = !activeOptions.length || notes.length > 0 || hasChoices;
  rerollButton.hidden = !hasChoices || done;
  rerollButton.disabled = availableRerolls() <= 0;
  newActButton.hidden = !done;
  playButton.classList.toggle('is-recommended', aiMode.checked && recommendation?.action === 'play');
  rerollButton.classList.toggle('is-recommended', aiMode.checked && recommendation?.action === 'reroll');
  resetButton.classList.toggle('is-recommended', aiMode.checked && recommendation?.action === 'reset');
  choicesBox.replaceChildren();
  if (hasChoices && !done) {
    choices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'epic-choice';
      button.classList.add(`grade-${choice.gradeClass}`);
      if (aiMode.checked && recommendation?.action === 'select' && recommendation.stat === choice.stat) button.classList.add('is-recommended');
      button.innerHTML = `<span class="epic-choice-grade">${choice.grade}</span><strong>${choice.label}</strong><span class="epic-choice-probability" title="공식 등급별 옵션 노출 확률 · 선택 시 등급 상승 전">${choice.probability}</span>`;
      button.setAttribute('aria-label', `${choice.grade} ${choice.stat} 선택`);
      button.addEventListener('click', () => applyChoice(choice));
      choicesBox.append(button);
    });
  } else if (!done) {
    for (let index = 0; index < 3; index += 1) {
      const placeholder = document.createElement('div');
      placeholder.className = 'epic-choice-placeholder';
      placeholder.textContent = '연주 준비';
      placeholder.setAttribute('aria-hidden', 'true');
      choicesBox.append(placeholder);
    }
  }
  resetButton.disabled = !notes.length && !hasChoices;
  resetButton.querySelector('span').textContent = resetCost() ? `악장 초기화 · ${RESET_COST} 다이아` : '악장 초기화 · 무료';
}

function applyChoice(choice) {
  if (!choices || !choice || !choices.includes(choice)) return;
  const originalIndex = GRADE_OPTIONS.findIndex((grade) => grade.name === choice.grade);
  const upgraded = originalIndex < GRADE_OPTIONS.length - 1 && Math.random() < 0.03;
  const finalGrade = GRADE_OPTIONS[originalIndex + Number(upgraded)];
  const finalOption = activeOptions.find(option => option.grade === finalGrade.name && option.stat === choice.stat);
  notes.push({ ...finalOption });
  feedback.textContent = upgraded ? `등급 상승 · ${choice.grade} → ${finalGrade.name}` : '';
  feedback.classList.toggle('is-upgraded', upgraded);
  choices = null;
  render();
}

function startPerformance(isReroll = false) {
  if (!activeOptions.length || (!isReroll && choices) || (isReroll && !choices)) return;
  if (performances >= MAX_PERFORMANCES || notes.length >= MAX_STRINGS) return;
  if (isReroll && availableRerolls() <= 0) return;
  if (!isReroll && MAX_PERFORMANCES - performances < MAX_STRINGS - notes.length) return;
  performances += 1;
  recordGlobalAction('performance');
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
aiMode.addEventListener('change', render);
aiTarget.addEventListener('change', render);

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
  if (!resetDialog.open) return;
  recordGlobalAction('reset', resetCost());
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
fetch(new URL('./epic-probabilities.json?v=20261118-1', import.meta.url))
  .then(response => {
    if (!response.ok) throw new Error('Probability data unavailable');
    return response.json();
  })
  .then(data => {
    optionSets = data.tables.slice(2).map(table => ({ title: table.title.replace(' 등급 별 옵션 확률', ''), options: parseOptions(table.rows) }));
    if (optionSets.length !== 2 || optionSets.some(set => set.options.length !== 80)) throw new Error('Incomplete probability data');
    songSelect.replaceChildren(...optionSets.map((set, index) => new Option(set.title, String(index))));
    activeOptions = optionSets[0].options;
    renderProbabilities();
    render();
  })
  .catch(() => {
    activeOptions = [];
    render();
    feedback.textContent = '공식 확률 데이터를 불러오지 못했습니다. 새로고침해 주세요.';
  });
