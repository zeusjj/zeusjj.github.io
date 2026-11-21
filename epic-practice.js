import { parseOptions, drawOption, groupOptions, statOdds as calculateStatOdds, lowestFrequencyStats, gradeBonusIncrease } from './epic-probability-model.js?v=20261121-connected-grade';
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
const melodyCostSelect = document.getElementById('epic-melody-cost');
const aiMessage = document.getElementById('epic-ai-message');
const aiCurrentChance = document.getElementById('epic-ai-current-chance');
const aiCostPerSuccess = document.getElementById('epic-ai-cost-per-success');
const aiRecommendedAction = document.getElementById('epic-ai-recommended-action');
const aiState = document.getElementById('epic-ai-state');
const manualOpen = document.getElementById('epic-manual-open');
const manualReturn = document.getElementById('epic-manual-return');
const manualDialog = document.getElementById('epic-manual-dialog');
const manualForm = document.getElementById('epic-manual-form');
const manualStep = document.getElementById('epic-manual-step');
const manualChain = document.getElementById('epic-manual-chain');
const manualRemaining = document.getElementById('epic-manual-remaining');
const statsEndpoint = 'https://zeusjj-guild-tips.e049eed7-30f4-430d-991a-7eef07fecebb.chatgpt.site/api/epic-practice/stats';
const catPortrait = document.querySelector('.epic-cat-portrait');
const catMotionClasses = ['cat-tilt-left', 'cat-tilt-right', 'cat-nod', 'cat-peek-left', 'cat-peek-right', 'cat-bob'];

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
  const step = Number(manualStep.value), minRemaining = MAX_STRINGS - step + 1, maxRemaining = MAX_PERFORMANCES - step + 1;
  const previousRemaining = Number(manualRemaining.value) || maxRemaining;
  manualRemaining.replaceChildren();
  for (let count = minRemaining; count <= maxRemaining; count += 1) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = `${count}회`;
    manualRemaining.append(option);
  }
  manualRemaining.value = String(Math.max(minRemaining, Math.min(maxRemaining, previousRemaining)));
}

refreshManualChainOptions();
manualStep.addEventListener('change', refreshManualChainOptions);

function renderGlobalStats() {
  document.getElementById('epic-total-performances').textContent = globalStats?.performances.toLocaleString('ko-KR') ?? '불러오는 중';
  document.getElementById('epic-total-paid-resets').textContent = globalStats?.paidResets.toLocaleString('ko-KR') ?? '불러오는 중';
}

async function refreshGlobalStats() {
  try {
    const response = await fetch(statsEndpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error('Stats unavailable');
    const stats = await response.json();
    if (!Number.isSafeInteger(stats.performances) || !Number.isSafeInteger(stats.paidResets)) throw new Error('Invalid stats');
    globalStats = { performances: stats.performances, paidResets: stats.paidResets };
    renderGlobalStats();
  } catch {
    if (!globalStats) {
      document.getElementById('epic-total-performances').textContent = '잠시 후';
      document.getElementById('epic-total-paid-resets').textContent = '잠시 후';
    }
  }
}

async function recordGlobalAction(action, amount = 0) {
  try {
    const response = await fetch(statsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...window.GuildAuth?.headers() },
      body: JSON.stringify({ id: crypto.randomUUID(), action, amount })
    });
    if (!response.ok) throw new Error('Stats update failed');
    const stats = await response.json();
    if (Number.isSafeInteger(stats.performances) && Number.isSafeInteger(stats.paidResets)) {
      globalStats = { performances: stats.performances, paidResets: stats.paidResets };
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
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshGlobalStats();
    scheduleCatMotion();
  }
});

function scheduleCatMotion() {
  if (!catPortrait || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  window.setTimeout(() => {
    const blink = Math.random() < 0.28;
    if (blink) {
      catPortrait.classList.add('is-blinking');
      window.setTimeout(() => catPortrait.classList.remove('is-blinking'), 260);
    } else {
      const motion = catMotionClasses[Math.floor(Math.random() * catMotionClasses.length)];
      catPortrait.classList.remove(...catMotionClasses);
      catPortrait.classList.add(motion);
      window.setTimeout(() => catPortrait.classList.remove(motion), 1050);
    }
    scheduleCatMotion();
  }, 3000 + Math.random() * 3000);
}

scheduleCatMotion();

function drawChoices() {
  return Array.from({ length: 3 }, () => drawOption(activeOptions));
}

function renderProbabilities() {
  const statsBody = document.getElementById('epic-stat-total-rows');
  const body = document.getElementById('epic-probability-rows');
  statsBody.replaceChildren();
  body.replaceChildren();
  const statWeights = new Map();
  let totalWeight = 0;
  for (const option of activeOptions) {
    statWeights.set(option.stat, (statWeights.get(option.stat) || 0) + option.weight);
    totalWeight += option.weight;
  }
  const rankedStats = [...statWeights].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'ko'));
  const rowsPerGroup = Math.ceil(rankedStats.length / 3);
  for (let rowIndex = 0; rowIndex < rowsPerGroup; rowIndex += 1) {
    const row = document.createElement('tr');
    for (let groupIndex = 0; groupIndex < 3; groupIndex += 1) {
      const entry = rankedStats[groupIndex * rowsPerGroup + rowIndex];
      const stat = document.createElement(entry ? 'th' : 'td');
      if (entry) {
        stat.scope = 'row';
        stat.textContent = entry[0];
        const probability = document.createElement('td');
        probability.textContent = `${(entry[1] / totalWeight * 100).toFixed(4)}%`;
        row.append(stat, probability);
      } else {
        row.append(stat, document.createElement('td'));
      }
    }
    statsBody.append(row);
  }
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
  return calculateStatOdds(activeOptions);
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

function simulateOutcomes(state, target, seed, iterations = 12000) {
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
  let totalAdditionalPerformances = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const random = seededRandom(seed, iteration);
    const filled = [...state.notes];
    let usedPerformances = state.performances;
    let usedRerolls = state.rerollsUsed;
    let additionalPerformances = 0;
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
      additionalPerformances += 1;
      hand = drawHand(random);
    }

    for (let guard = 0; filled.length < MAX_STRINGS && guard < 60; guard += 1) {
      if (!hand) {
        if (usedPerformances >= MAX_PERFORMANCES || MAX_PERFORMANCES - usedPerformances < MAX_STRINGS - filled.length) break;
        usedPerformances += 1;
        additionalPerformances += 1;
        hand = drawHand(random);
      }
      const previous = filled.at(-1);
      const matching = previous && hand.includes(previous);
      const run = trailingRun(filled);
      const canStillReachTarget = run < target && run + (MAX_STRINGS - filled.length) >= target;
      if (previous && !matching && canStillReachTarget && canReroll(usedPerformances, usedRerolls, filled.length, true)) {
        usedPerformances += 1;
        additionalPerformances += 1;
        usedRerolls += 1;
        hand = drawHand(random);
        continue;
      }
      const selected = matching ? previous : hand[Math.floor(random() * hand.length)];
      filled.push(selected);
      hand = null;
      if (maximumRun(filled) >= target) { wins += 1; break; }
    }
    totalAdditionalPerformances += additionalPerformances;
  }
  return { chance: wins / iterations, expectedPerformances: totalAdditionalPerformances / iterations };
}

function estimatedOutcome(state, target, label) {
  const fingerprint = `${target}|${state.notes.join(',')}|${state.performances}|${state.rerollsUsed}|${state.choices?.join(',') || ''}|${state.preselectedStat || ''}|${label}`;
  return simulateOutcomes(state, target, seedFrom(fingerprint));
}

function expectedDiamondCost(outcome, resetFee = 0) {
  return resetFee + outcome.expectedPerformances * Number(melodyCostSelect.value);
}

function costPerSuccess(outcome, resetFee = 0) {
  return outcome.chance > 0 ? expectedDiamondCost(outcome, resetFee) / outcome.chance : Infinity;
}

function estimateSelectionOutcome(state, target) {
  const candidateStats = [...new Set((state.choices || []).map(choice => typeof choice === 'string' ? choice : choice.stat))];
  if (!candidateStats.length) return null;
  if (!state.notes.length) {
    const odds = statOdds(), rareOdds = lowestFrequencyStats(activeOptions);
    const rareCandidates = candidateStats.filter(stat => rareOdds.has(stat));
    if (rareCandidates.length) {
      return rareCandidates.reduce((best, stat, index) => {
        const outcome = estimatedOutcome({ ...state, choices: null, preselectedStat: stat }, target, `first-select-rare-${index}-${stat}`);
        const candidate = { ...outcome, stat, lowFrequencyStat: true, statChance: odds.get(stat) };
        return !best || costPerSuccess(candidate) < costPerSuccess(best) ? candidate : best;
      }, null);
    }
    const bestOdds = Math.max(...candidateStats.map(stat => odds.get(stat) || 0));
    const commonCandidates = candidateStats.filter(stat => Math.abs((odds.get(stat) || 0) - bestOdds) <= bestOdds * 0.0001);
    const outcome = estimatedOutcome({ ...state, choices: null, preselectedStat: commonCandidates[0] }, target, 'first-select-equal-frequency');
    return { ...outcome, stat: null, equalFirstStats: commonCandidates, statChance: bestOdds };
  }
  return candidateStats.reduce((best, stat, index) => {
    const outcome = estimatedOutcome({ ...state, choices: null, preselectedStat: stat }, target, `select-card-${index}-${stat}`);
    const candidate = { ...outcome, stat };
    if (!best) return candidate;
    const score = costPerSuccess(candidate);
    const bestScore = costPerSuccess(best);
    return score < bestScore || (score === bestScore && candidate.chance > best.chance) ? candidate : best;
  }, null);
}

function recommendedChoice(stat) {
  const candidates = choices?.filter(choice => choice.stat === stat) ?? [];
  if (!candidates.length) return null;
  const group = [];
  for (let index = notes.length - 1; index >= 0 && notes[index].stat === stat; index -= 1) group.push(notes[index]);
  const gradeCounts = new Map();
  for (const note of group) gradeCounts.set(note.grade, (gradeCounts.get(note.grade) || 0) + 1);
  const gradeRank = new Map(GRADE_OPTIONS.map((grade, index) => [grade.name, index]));
  const bonusKind = /피해|증폭|감소|저항|관통/.test(stat) ? 'rate' : 'main';
  return candidates.sort((a, b) => {
    const countA = gradeCounts.get(a.grade) || 0;
    const countB = gradeCounts.get(b.grade) || 0;
    const bonusA = gradeBonusIncrease(a.grade, countA, bonusKind);
    const bonusB = gradeBonusIncrease(b.grade, countB, bonusKind);
    return bonusB - bonusA || countB - countA || gradeRank.get(b.grade) - gradeRank.get(a.grade);
  })[0];
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

const freshOutcomeCache = new Map();

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
    aiCostPerSuccess.textContent = '-';
    aiMessage.textContent = 'AI 모드를 껐어요. 연주판은 그대로 직접 진행할 수 있어요.';
    return null;
  }
  if (!activeOptions.length) {
    aiRecommendedAction.textContent = '-';
    aiCurrentChance.textContent = '-';
    aiCostPerSuccess.textContent = '-';
    aiMessage.textContent = '공식 옵션 확률을 불러오지 못해 추천을 잠시 멈췄어요.';
    return null;
  }

  const targetMet = chain >= target;
  const currentState = { notes: stats, performances, rerollsUsed, choices: choices?.map(choice => choice.stat) ?? null };
  const selectionEstimate = choices ? estimateSelectionOutcome(currentState, target) : null;
  const currentOutcome = choices
    ? selectionEstimate ?? { chance: 0, expectedPerformances: 0 }
    : estimatedOutcome(currentState, target, 'continue');
  const freshKey = `${songSelect.value}|${target}`;
  if (!freshOutcomeCache.has(freshKey)) {
    freshOutcomeCache.set(freshKey, estimatedOutcome({ notes: [], performances: 0, rerollsUsed: 0, choices: null }, target, 'fresh'));
  }
  const freshOutcome = freshOutcomeCache.get(freshKey);
  aiCurrentChance.textContent = formatChance(currentOutcome.chance);
  aiCostPerSuccess.textContent = formatExpectedCost(costPerSuccess(freshOutcome));

  if (targetMet) {
    const matching = choices?.find(choice => choice.stat === notes.at(-1)?.stat);
    aiRecommendedAction.textContent = matching ? '카드 선택' : '목표 달성';
    aiCurrentChance.textContent = '100%';
    const exactChoice = matching ? recommendedChoice(matching.stat) : null;
    renderAiMessage(
      matching ? `목표 ${target}연속을 달성했어요. 더 이어가려면 직전 현과 연결되는 ` : `목표 ${target}연속을 달성했어요. 더 연주하려면 `,
      matching ? `${exactChoice.grade} ${matching.stat} 선택` : '원하는 스탯 선택',
      '하세요.'
    );
    return matching ? { action: 'select', stat: matching.stat, grade: exactChoice.grade } : null;
  }

  const currentUnselected = choices ? 1 : 0;
  const futureStrings = MAX_STRINGS - notes.length - currentUnselected;
  const completableStrings = currentUnselected + Math.min(futureStrings, MAX_PERFORMANCES - performances);
  const maxReachableRun = Math.max(longestRun(stats), trailingRun(stats) + completableStrings);
  if (notes.length && maxReachableRun < target) {
    aiRecommendedAction.textContent = '초기화';
    aiCurrentChance.textContent = formatChance(freshOutcome.chance);
    renderAiMessage(
      `현재 상태에서 남은 현을 모두 이어도 최대 ${maxReachableRun}연속이라 목표 ${target}연속은 수학적으로 불가능해요. `,
      '악장 초기화',
      '를 추천해요.'
    );
    return { action: 'reset', chance: freshOutcome.chance, expectedPerformances: freshOutcome.expectedPerformances, resetFee: resetCost() };
  }

  const actions = [];
  if (choices) {
    const matching = notes.length ? choices.find(choice => choice.stat === notes.at(-1).stat) : null;
    const selectedStat = selectionEstimate?.stat ?? matching?.stat;
    const exactChoice = selectedStat ? recommendedChoice(selectedStat) : null;
    actions.push({ ...currentOutcome, ...selectionEstimate, action: 'select', stat: selectedStat, grade: exactChoice?.grade });
    if (availableRerolls() > 0) actions.push({ action: 'reroll', ...estimatedOutcome({ ...currentState, rerollFirst: true }, target, 'reroll') });
  } else if (notes.length < MAX_STRINGS && MAX_PERFORMANCES - performances >= MAX_STRINGS - notes.length) {
    actions.push({ action: 'play', ...currentOutcome });
  }
  if (notes.length) actions.push({ action: 'reset', ...freshOutcome, resetFee: resetCost() });

  const labels = { play: '연주', select: recommendationLabelForSelect(choices ? selectionEstimate : null), reroll: '다시 연주', reset: '초기화' };
  const recommendation = actions.sort((a, b) => {
    const scoreA = costPerSuccess(a, a.resetFee || 0);
    const scoreB = costPerSuccess(b, b.resetFee || 0);
    return scoreA - scoreB || b.chance - a.chance;
  })[0];
  if (!recommendation) {
    aiRecommendedAction.textContent = '판단 보류';
    aiMessage.textContent = '이 악장에서는 더 진행할 수 없어요. 악장을 초기화하거나 새 악장을 시작하세요.';
    return null;
  }
  aiCurrentChance.textContent = formatChance(recommendation.chance);
  const context = `${notes.length}/12현 · 최근 ${trailingRun(stats)}연속 · 남은 연주 ${remaining}회`;
  if (actions.every(action => action.chance === 0)) {
    aiRecommendedAction.textContent = '판단 보류';
    aiMessage.textContent = `${context} 상태예요. 시뮬레이션에서 목표 달성 경로가 관측되지 않아 추천을 보류해요.`;
    return null;
  }
  const actionText = recommendation.action === 'select'
    ? (recommendation.stat ? `${recommendation.grade} ${recommendation.stat} 선택` : '원하는 스탯 선택')
    : labels[recommendation.action];
  aiRecommendedAction.textContent = labels[recommendation.action].replace(/ · .*/, '');
  const alternative = actions.filter(action => action !== recommendation)
    .sort((a, b) => costPerSuccess(a, a.resetFee || 0) - costPerSuccess(b, b.resetFee || 0) || b.chance - a.chance)[0];
  const comparison = alternative
    ? `${actionRouteName(recommendation.action)} 경로의 목표 달성 예상은 ${formatChance(recommendation.chance)}, ${actionRouteName(alternative.action)} 경로는 ${formatChance(alternative.chance)}예요. ${compareActionCosts(recommendation, alternative)} `
    : `현재 비교할 수 있는 다른 행동이 없어요. 목표 달성 예상은 ${formatChance(recommendation.chance)}예요. `;
  const reason = explainRecommendedAction(recommendation, target, remaining);
  renderAiMessage(comparison + reason + ' ', actionText, recommendation.action === 'select' ? '을 추천해요.' : '를 추천해요.');
  return recommendation;
}

function recommendationLabelForSelect(estimate) {
  if (estimate?.stat) {
    const choice = recommendedChoice(estimate.stat);
    return choice ? `${choice.grade} ${choice.stat} 선택` : `${estimate.stat} 선택`;
  }
  return '원하는 스탯 선택';
}

function formatExpectedCost(cost) {
  return Number.isFinite(cost) ? `${cost.toFixed(1)} 다이아` : '달성 표본 없음';
}

function actionRouteName(action) {
  return ({ play: '현재 악장 계속', select: '현재 카드 선택', reroll: '다시 연주', reset: '악장 초기화' })[action] || action;
}

function explainRecommendedAction(action, target, remaining) {
  const lastStat = notes.at(-1)?.stat;
  const run = trailingRun(notes.map(note => note.stat));
  const runNeeded = Math.max(0, target - Math.max(1, run));
  const stringsLeft = MAX_STRINGS - notes.length;
  const rerollsLeft = availableRerolls();

  if (action.action === 'select') {
    if (action.equalFirstStats) return `첫 현은 연결할 능력치가 아직 없고, 지금 손패에는 공식 확률이 같은 일반 능력치만 있어요. 막기를 포함한 선택지의 기본 출현 확률이 같으므로 막기 하나를 더 유리하다고 추천할 근거는 없어요. 원하는 스탯을 선택하세요.`;
    if (!notes.length && action.lowFrequencyStat) return `첫 현이라 연결 확률의 이점은 아직 없어요. ${action.stat}은 공식 확률표에서 전체 출현 확률이 ${(action.statChance * 100).toFixed(2)}%로 가장 낮은 희귀 능력치예요. 이 능력치의 효과를 노릴 수 있지만, 다시 나와 연속으로 완성될 가능성도 일반 능력치보다 낮아져요. 낮은 완성 확률을 감수하고 희귀 효과를 노리는 선택이에요.`;
    if (!notes.length && action.statChance) return `첫 현은 앞서 연결할 능력치가 없어요. ${action.stat}의 출현 확률은 ${(action.statChance * 100).toFixed(2)}%로 현재 선택지 중 가장 높아, 목표 연속을 완성하는 확률을 우선할 때 유리해요.`;
    if (lastStat && action.stat === lastStat) {
      const group = [];
      for (let index = notes.length - 1; index >= 0 && notes[index].stat === lastStat; index -= 1) group.push(notes[index]);
      const sameGradeCount = group.filter(note => note.grade === action.grade).length;
      const bonusKind = /피해|증폭|감소|저항|관통/.test(lastStat) ? 'rate' : 'main';
      const bonus = gradeBonusIncrease(action.grade, sameGradeCount, bonusKind);
      const bonusText = bonus > 0
        ? `동일 등급 보너스도 ${bonusKind === 'rate' ? `+${bonus}%` : `+${bonus}`} 늘어요.`
        : '이 등급을 더 연결하면 등급별 누적 보너스도 계산에 반영돼요.';
      return `직전 현과 같은 ${lastStat}를 이으면 현재 ${run}연속이 유지돼요. 손패 중 ${action.grade} ${lastStat}를 선택하면 연결 그룹의 ${action.grade} 등급이 ${sameGradeCount}개에서 ${sameGradeCount + 1}개가 되고, ${bonusText} 다음 현에서 연결이 끊기면 목표 연속도 끊기므로 이 연결 카드를 고르세요.`;
    }
    return `현재 세 카드 중 ${action.stat}을 고르는 경로가 남은 현에서 목표 연속을 만들 가능성이 가장 높아요. 지금 선택지로 한 현을 확정해 연주 기회를 목표 달성에 쓸 수 있어요.`;
  }

  if (action.action === 'reroll') {
    if (lastStat && !choices?.some(choice => choice.stat === lastStat)) {
      return `지금 세 카드에는 직전 ${lastStat}가 없어 하나를 확정하면 ${run}연속이 끊겨요. 다시 연주하면 카드 세 장을 새로 뽑아 연결을 다시 노릴 수 있고, 남은 다시 연주 ${rerollsLeft}회 중 한 번을 쓰게 돼요.`;
    }
    return `현재 카드 중 연결되는 카드가 있지만, 그 카드를 확정하는 것보다 다시 연주해 다음 현에서 목표로 이어질 선택지를 다시 얻는 편이 성공당 예상 비용을 낮춰요. 다시 연주 기회를 써 더 나은 연결을 노리는 판단이에요.`;
  }

  if (action.action === 'play') {
    if (!notes.length) return `아직 확정한 현이 없고 남은 연주 ${remaining}회로 12현을 시작할 수 있어요. 지금 악장을 유지하면 새 카드 세 장에서 첫 능력치를 고르고 목표 연속을 쌓아갈 기회가 생겨요.`;
    const recovery = remaining <= stringsLeft
      ? `남은 연주가 채워야 할 현 수와 같아 다시 연주할 여유가 없어요. 지금 카드에서 연결을 만드는 게 중요해요.`
      : `남은 ${stringsLeft}현을 채울 연주 여유가 있고, 다음 세 카드에서 직전 능력치를 찾으면 현재 연속을 이어갈 수 있어요.`;
    return `현재 ${notes.length}/12현, 최근 ${run}연속에서 목표까지 ${runNeeded}번 더 이어야 해요. ${recovery}`;
  }

  if (action.action === 'reset') {
    const tightRun = runNeeded >= Math.max(1, stringsLeft - 1);
    const scarceRerolls = rerollsLeft <= 2 || remaining <= stringsLeft;
    const pressure = tightRun
      ? `목표까지 ${runNeeded}번 더 이어야 하는데 남은 현은 ${stringsLeft}개뿐이라, 다음 선택을 거의 연달아 맞혀야 해요.`
      : `현재 ${notes.length}/12현, 최근 ${run}연속이라 남은 현에서 목표까지 가는 경로가 좁아졌어요.`;
    const retries = scarceRerolls
      ? `남은 연주 ${remaining}회와 다시 연주 ${rerollsLeft}회로는 빗나간 카드를 만회하기 어려워, 낮은 성공 가능성에 추가 비용을 쓰기보다 악장을 초기화하는 편이 나아요.`
      : `다시 연주해도 이미 확정한 현과 끊긴 연속은 되돌아오지 않아요. 남은 다시 연주를 현재 악장에 더 써도 회복 폭이 제한적이라 악장을 초기화하고 새로 시작하는 편이 유리해요.`;
    return `${pressure} ${retries}`;
  }

  return '';
}

function compareActionCosts(recommendation, alternative) {
  const cost = action => costPerSuccess(action, action.action === 'reset' ? action.resetFee || 0 : 0);
  const recommendedCost = cost(recommendation);
  const alternativeCost = cost(alternative);
  if (!Number.isFinite(recommendedCost)) return '';
  if (!Number.isFinite(alternativeCost)) return `이번 시뮬레이션에서는 ${actionRouteName(alternative.action)} 경로로 목표를 달성한 표본이 없어요.`;
  if (Math.abs(recommendedCost - alternativeCost) < 0.05) {
    return `성공당 예상 비용은 두 경로가 비슷해 ${actionRouteName(recommendation.action)} 쪽의 확률과 현재 연결 상태를 우선했어요.`;
  }
  const relativeDifference = (1 - recommendedCost / alternativeCost) * 100;
  if (relativeDifference < 1) {
    return `성공당 예상 비용은 ${formatExpectedCost(recommendedCost)}와 ${formatExpectedCost(alternativeCost)}로 사실상 비슷해요. 비용 우위가 뚜렷하지 않으니 성공률과 현재 연결을 보고 추천했어요.`;
  }
  return `목표 한 번 달성당 예상 비용은 ${formatExpectedCost(recommendedCost)}로, ${actionRouteName(alternative.action)} 경로의 ${formatExpectedCost(alternativeCost)}보다 약 ${relativeDifference.toFixed(1)}% 낮아요.`;
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
  rerollButton.querySelector('span').textContent = `다시 연주 (${availableRerolls()}회 남음)`;
  newActButton.hidden = !done || Boolean(manualSession);
  resetButton.hidden = Boolean(manualSession);
  playButton.classList.toggle('is-recommended', !manualSession && aiMode.checked && recommendation?.action === 'play');
  rerollButton.classList.toggle('is-recommended', !manualSession && aiMode.checked && recommendation?.action === 'reroll');
  resetButton.classList.toggle('is-recommended', !manualSession && aiMode.checked && recommendation?.action === 'reset');
  choicesBox.querySelectorAll('.epic-choice').forEach(button => button.classList.remove('is-recommended'));
  choicesBox.replaceChildren();
  if (hasChoices && !done) {
    choices.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'epic-choice';
      button.classList.add(`grade-${choice.gradeClass}`);
      button.dataset.stat = choice.stat;
      button.dataset.grade = choice.grade;
      const labelLength = choice.label.length;
      button.style.setProperty('--choice-font-desktop', `${labelLength > 10 ? 12 : labelLength > 7 ? 14 : 16}px`);
      button.style.setProperty('--choice-font-mobile', `${labelLength > 10 ? 9 : labelLength > 7 ? 11 : 13}px`);
      if (notes.length && choice.stat === notes.at(-1).stat) button.classList.add('is-linked');
      if (!manualSession && aiMode.checked && recommendation?.action === 'select' && recommendation.stat === choice.stat && recommendation.grade === choice.grade) button.classList.add('is-recommended');
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
  const remaining = Number(manualRemaining.value);
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
  performances = MAX_PERFORMANCES - remaining;
  rerollsUsed = Math.min(MAX_STRINGS, Math.max(0, performances - (step - 1)));
  manualSession = { step, chain, remaining, backup };
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
  document.getElementById('epic-current-label').textContent = isReroll ? '다시 연주 결과' : '선택지를 고르세요';
  render();
  if (window.lucide) window.lucide.createIcons();
}

playButton.addEventListener('click', () => startPerformance());
rerollButton.addEventListener('click', () => startPerformance(true));
aiMode.addEventListener('change', render);
aiTarget.addEventListener('change', render);
melodyCostSelect.addEventListener('change', render);

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
