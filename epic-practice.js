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
const aiRecommendedAction = document.getElementById('epic-ai-recommended-action');
const aiResetRow = document.getElementById('epic-ai-reset-row');
const aiResetChance = document.getElementById('epic-ai-reset-chance');
const aiState = document.getElementById('epic-ai-state');
const manualOpen = document.getElementById('epic-manual-open');
const manualReturn = document.getElementById('epic-manual-return');
const manualDialog = document.getElementById('epic-manual-dialog');
const manualForm = document.getElementById('epic-manual-form');
const manualStep = document.getElementById('epic-manual-step');
const manualChain = document.getElementById('epic-manual-chain');
const statsEndpoint = 'https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/epic-practice/stats';

let notes = [];
let choices = null;
let performances = 0;
let rerollsUsed = 0;
let globalStats = null;
let manualSession = null;

for (let step = 1; step <= MAX_STRINGS; step += 1) {
  const option = document.createElement('option');
  option.value = String(step);
  option.textContent = `${step}번째 현`;
  manualStep.append(option);
}

function refreshManualChainOptions() {
  const maxChain = Number(manualStep.value) - 1;
  const previous = Math.min(Number(manualChain.value) || 0, maxChain);
  manualChain.replaceChildren();
  for (let count = 0; count <= maxChain; count += 1) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = `${count}현 연속`;
    manualChain.append(option);
  }
  manualChain.value = String(previous);
}

refreshManualChainOptions();
manualStep.addEventListener('change', refreshManualChainOptions);

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
  return notes.length === MAX_STRINGS || availableRerolls() === 0 ? 0 : RESET_COST;
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

function simulateSuccess(state, target, seed, iterations = 12000) {
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
    if (state.chooseFirst && hand) {
      const matching = filled.length ? hand.find(stat => stat === filled.at(-1)) : null;
      filled.push(matching ?? hand[Math.floor(random() * hand.length)]);
      hand = null;
      if (maximumRun(filled) >= target) { wins += 1; continue; }
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
      const run = trailingRun(filled);
      const canStillReachTarget = run < target && run + (MAX_STRINGS - filled.length) >= target;
      if (previous && !matching && canStillReachTarget && canReroll(usedPerformances, usedRerolls, filled.length, true)) {
        usedPerformances += 1;
        usedRerolls += 1;
        hand = drawHand(random);
        continue;
      }
      const selected = matching ? previous : hand[Math.floor(random() * hand.length)];
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

function estimateSelectionChance(state, target) {
  const candidateStats = [...new Set(state.choices || [])];
  if (!candidateStats.length) return null;
  return candidateStats.reduce((best, stat, index) => {
    const chance = estimatedChance({ ...state, choices: null, preselectedStat: stat }, target, `select-card-${index}-${stat}`);
    return !best || chance > best.chance ? { chance, stat } : best;
  }, null);
}

function formatChance(chance) {
  return chance > 0 && chance < 0.0005 ? '<0.1%' : `${(chance * 100).toFixed(1)}%`;
}

function renderAiMessage(beforeAction, action, afterAction) {
  aiMessage.replaceChildren(document.createTextNode(beforeAction));
  const strong = document.createElement('strong');
  strong.textContent = action;
  aiMessage.append(strong, document.createTextNode(afterAction));
}

const freshChanceCache = new Map();

function renderAi() {
  const target = Number(aiTarget.value);
  const stats = notes.map(note => note.stat);
  const chain = maximumRun(stats);
  const remaining = MAX_PERFORMANCES - performances;
  aiState.textContent = manualSession
    ? `수동 예시 · ${manualSession.step}번째 현 진행 전 · ${manualSession.chain}현 연속 · 남은 연주 ${remaining}회`
    : `현재 악장 · ${notes.length}/12현 · 최고 ${chain}연속 · 남은 연주 ${remaining}회`;
  choicesBox.classList.toggle('epic-ai-mode-off', !aiMode.checked);
  if (!aiMode.checked) {
    aiRecommendedAction.textContent = '-';
    aiCurrentChance.textContent = '-';
    aiResetRow.hidden = true;
    aiMessage.textContent = 'AI 모드를 껐어요. 연주판은 그대로 직접 진행할 수 있어요.';
    return null;
  }
  if (!activeOptions.length) {
    aiRecommendedAction.textContent = '-';
    aiCurrentChance.textContent = '-';
    aiResetRow.hidden = true;
    aiMessage.textContent = '공식 옵션 확률을 불러오지 못해 추천을 잠시 멈췄어요.';
    return null;
  }

  const targetMet = chain >= target;
  const currentState = { notes: stats, performances, rerollsUsed, choices: choices?.map(choice => choice.stat) ?? null };
  const selectionEstimate = choices ? estimateSelectionChance(currentState, target) : null;
  const currentChance = choices
    ? selectionEstimate?.chance ?? 0
    : estimatedChance(currentState, target, 'continue');
  const freshKey = `${songSelect.value}|${target}`;
  if (!freshChanceCache.has(freshKey)) {
    freshChanceCache.set(freshKey, estimatedChance({ notes: [], performances: 0, rerollsUsed: 0, choices: null }, target, 'fresh'));
  }
  const freshChance = freshChanceCache.get(freshKey);
  aiCurrentChance.textContent = formatChance(currentChance);
  aiResetRow.hidden = !notes.length && !choices;
  aiResetChance.textContent = `${(freshChance * 100).toFixed(1)}% · ${resetCost() ? '250 다이아' : '무료'}`;

  if (targetMet) {
    const matching = choices?.find(choice => choice.stat === notes.at(-1)?.stat);
    aiRecommendedAction.textContent = matching ? '카드 선택' : '목표 달성';
    aiCurrentChance.textContent = '100%';
    renderAiMessage(
      matching ? `목표 ${target}연속을 달성했어요. 더 이어가려면 연결된 ${matching.stat} ` : `목표 ${target}연속을 달성했어요. 더 연주하려면 `,
      matching ? '선택' : '원하는 스탯을 선택',
      '하세요.'
    );
    return matching ? { action: 'select', stat: matching.stat } : null;
  }

  const actions = [];
  if (choices) {
    const matching = notes.length ? choices.find(choice => choice.stat === notes.at(-1).stat) : null;
    actions.push({ action: 'select', stat: selectionEstimate?.stat ?? matching?.stat, chance: selectionEstimate?.chance ?? 0 });
    if (availableRerolls() > 0) actions.push({ action: 'reroll', chance: estimatedChance({ ...currentState, rerollFirst: true }, target, 'reroll') });
  } else if (notes.length < MAX_STRINGS && MAX_PERFORMANCES - performances >= MAX_STRINGS - notes.length) {
    actions.push({ action: 'play', chance: currentChance });
  }
  if (notes.length) actions.push({ action: 'reset', chance: freshChance });

  const labels = { play: '연주', select: '카드 선택', reroll: '다시 연주', reset: `초기화${resetCost() ? ' · 250 다이아' : ' · 무료'}` };
  const recommendation = actions.sort((a, b) => b.chance - a.chance)[0];
  if (!recommendation) {
    aiRecommendedAction.textContent = '판단 보류';
    aiMessage.textContent = '이 악장에서는 더 진행할 수 없어요. 악장을 초기화하거나 새 악장을 시작하세요.';
    return null;
  }
  aiCurrentChance.textContent = formatChance(recommendation.chance);
  const comparisons = actions.map(action => `${labels[action.action]} ${formatChance(action.chance)}`).join(' · ');
  const context = `${notes.length}/12현 · 최근 ${trailingRun(stats)}연속 · 남은 연주 ${remaining}회`;
  if (actions.every(action => action.chance === 0)) {
    aiRecommendedAction.textContent = '판단 보류';
    aiMessage.textContent = `${context} 상태예요. 현재 시뮬레이션 표본에서는 성공 경로가 관측되지 않아 행동 간 우위를 계산하지 못했어요. 0%를 최적 행동으로 오해하지 않도록 버튼 추천은 표시하지 않습니다. 행동별 목표 ${target}연속 달성 예상: ${comparisons}.`;
    return null;
  }
  const advice = {
    play: `현재 ${context} 상태에서는 `,
    select: choices && notes.length && choices.some(choice => choice.stat === notes.at(-1).stat)
      ? `${context} 상태예요. 연결을 확정하는 `
      : `${context} 상태예요. 세 카드 중 확률상 우위는 없으니 `,
    reroll: `${context} 상태에서 목표 달성 예상이 가장 높아요. `,
    reset: `${context} 상태에서는 새 악장으로 초기화하는 편이 목표 달성 확률이 가장 높아요. `
  }[recommendation.action];
  const actionText = recommendation.action === 'select' ? '원하는 스탯을 선택' : labels[recommendation.action];
  aiRecommendedAction.textContent = labels[recommendation.action].replace(/ · .*/, '');
  const after = recommendation.action === 'play' ? '해서 선택지를 확인하세요.'
    : recommendation.action === 'select' ? '하는 거예요.'
      : recommendation.action === 'reroll' ? '하는 거예요. 현재 세 장을 바꿉니다.'
        : `하는 거예요. ${labels.reset}이 필요해요.`;
  renderAiMessage(`${advice}추천 행동은 `, actionText, `${after} 행동별 목표 ${target}연속 달성 예상: ${comparisons}.`);
  return recommendation;
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
      if ((index > 0 && notes[index].stat === notes[index - 1].stat)
        || (index < notes.length - 1 && notes[index].stat === notes[index + 1].stat)) item.classList.add('is-linked');
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
  playButton.hidden = hasChoices || done || Boolean(manualSession);
  playButton.disabled = Boolean(manualSession) || !activeOptions.length || performances >= MAX_PERFORMANCES || MAX_PERFORMANCES - performances < MAX_STRINGS - notes.length;
  songSelect.disabled = !activeOptions.length || notes.length > 0 || hasChoices;
  rerollButton.hidden = !hasChoices || done || Boolean(manualSession);
  rerollButton.disabled = Boolean(manualSession) || availableRerolls() <= 0;
  newActButton.hidden = !done || Boolean(manualSession);
  resetButton.hidden = Boolean(manualSession);
  playButton.classList.toggle('is-recommended', !manualSession && aiMode.checked && recommendation?.action === 'play');
  rerollButton.classList.toggle('is-recommended', !manualSession && aiMode.checked && recommendation?.action === 'reroll');
  resetButton.classList.toggle('is-recommended', !manualSession && aiMode.checked && recommendation?.action === 'reset');
  choicesBox.replaceChildren();
  if (hasChoices && !done) {
    choices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'epic-choice';
      button.classList.add(`grade-${choice.gradeClass}`);
      const sameStatCount = choices.filter(candidate => candidate.stat === choice.stat).length;
      if (sameStatCount > 1 || (notes.length && choice.stat === notes.at(-1).stat)) button.classList.add('is-linked');
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
  resetButton.disabled = Boolean(manualSession) || (!notes.length && !hasChoices);
  resetButton.querySelector('span').textContent = resetCost() ? `악장 초기화 · ${RESET_COST} 다이아` : '악장 초기화 · 무료';
  manualOpen.textContent = manualSession ? '수동 세팅 수정' : '수동 세팅해서 질문하기';
  manualReturn.hidden = !manualSession;
}

manualOpen.addEventListener('click', () => {
  const step = manualSession?.step ?? Math.min(notes.length + 1, MAX_STRINGS);
  manualStep.value = String(step);
  refreshManualChainOptions();
  manualChain.value = String(manualSession?.chain ?? Math.min(trailingRun(notes.map(note => note.stat)), step - 1));
  manualDialog.showModal();
});

document.getElementById('epic-manual-cancel').addEventListener('click', () => manualDialog.close());

manualForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!activeOptions.length) return;
  const step = Number(manualStep.value);
  const chain = Number(manualChain.value);
  const backup = manualSession?.backup ?? { notes, choices, performances, rerollsUsed, feedback: feedback.textContent, upgraded: feedback.classList.contains('is-upgraded') };
  const statNames = [...statOdds().keys()];
  const runStat = statNames.at(-1);
  const prefixLength = step - 1 - chain;
  const prefixStats = [];
  for (let index = 0; index < prefixLength; index += 1) {
    const candidates = statNames.filter(stat => stat !== prefixStats.at(-1) && (!chain || stat !== runStat));
    prefixStats.push(candidates[index % candidates.length]);
  }
  const exampleStats = [...prefixStats, ...Array.from({ length: chain }, () => runStat)];
  notes = exampleStats.map(stat => ({ stat, label: stat, grade: '수동 예시', gradeClass: 'manual' }));
  choices = null;
  performances = step - 1;
  rerollsUsed = 0;
  manualSession = { step, chain, backup };
  feedback.textContent = '수동 예시 상태예요. 실제 연습 기록에는 반영되지 않습니다.';
  feedback.classList.remove('is-upgraded');
  manualDialog.close();
  render();
});

manualReturn.addEventListener('click', () => {
  if (!manualSession) return;
  ({ notes, choices, performances, rerollsUsed } = manualSession.backup);
  feedback.textContent = manualSession.backup.feedback;
  feedback.classList.toggle('is-upgraded', manualSession.backup.upgraded);
  manualSession = null;
  render();
});

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
