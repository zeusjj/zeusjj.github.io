import { parseOptions, drawOption, groupOptions, statOdds as calculateStatOdds, lowestFrequencyStats, gradeBonusIncrease } from './epic-probability-model.js?v=20261121-connected-grade';
import { explainEpicSituation } from './epic-advice.js?v=20261122-reason-first';
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
const aiReason = document.getElementById('epic-ai-reason');
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
let catBlinkTimer;

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
  window.clearTimeout(catBlinkTimer);
  if (!catPortrait || document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  catBlinkTimer = window.setTimeout(() => {
    catPortrait.classList.add('is-blinking');
    window.setTimeout(() => catPortrait.classList.remove('is-blinking'), 260);
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
  if (!state.notes.length || !candidateStats.includes(state.notes.at(-1))) {
    const odds = statOdds();
    const bestOdds = Math.max(...candidateStats.map(stat => odds.get(stat) || 0));
    const commonCandidates = candidateStats.filter(stat => Math.abs((odds.get(stat) || 0) - bestOdds) <= bestOdds * 0.0001);
    const outcome = estimatedOutcome({ ...state, choices: null, preselectedStat: commonCandidates[0] }, target, 'first-select-equal-frequency');
    return { ...outcome, stat: null, equalFirstStats: commonCandidates, statChance: bestOdds };
  }
  const matchingStat = state.notes.at(-1);
  const candidates = candidateStats.includes(matchingStat) ? [matchingStat] : candidateStats;
  return candidates.reduce((best, stat, index) => {
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
  const bonusKind = candidates[0].label.endsWith('%') ? 'rate' : 'main';
  return candidates.sort((a, b) => {
    const countA = gradeCounts.get(a.grade) || 0;
    const countB = gradeCounts.get(b.grade) || 0;
    const bonusA = gradeBonusIncrease(a.grade, countA, bonusKind);
    const bonusB = gradeBonusIncrease(b.grade, countB, bonusKind);
    return bonusB - bonusA || gradeRank.get(b.grade) - gradeRank.get(a.grade);
  })[0];
}

function formatChance(chance) {
  return chance > 0 && chance < 0.0005 ? '<0.1%' : `${(chance * 100).toFixed(1)}%`;
}

function renderAiMessage(beforeAction, action, afterAction, reason) {
  aiMessage.replaceChildren();
  aiReason.textContent = reason ? beforeAction + reason : beforeAction;
  if (!action) {
    aiMessage.textContent = beforeAction;
    aiReason.textContent = '';
    return;
  }
  const strong = document.createElement('strong');
  strong.textContent = action;
  aiMessage.append(strong, document.createTextNode(afterAction));
}

const freshOutcomeCache = new Map();

function renderAi() {
  const target = Number(aiTarget.value);
  const stats = notes.map(note => note.stat);
  const run = trailingRun(stats), bestRun = maximumRun(stats);
  const remaining = MAX_PERFORMANCES - performances;
  aiState.textContent = manualSession
    ? `수동 예시 · ${manualSession.step}번째 현 진행 전 · ${manualSession.chain}현 연속 · 남은 연주 ${remaining}회`
    : `현재 악장 · ${notes.length}/12현 · 최고 ${bestRun}연속 · 남은 연주 ${remaining}회`;
  choicesBox.classList.toggle('epic-ai-mode-off', !aiMode.checked);
  delete aiMessage.dataset.scenario;
  aiReason.textContent = '';
  if (!aiMode.checked || !activeOptions.length) {
    aiRecommendedAction.textContent = aiCurrentChance.textContent = aiCostPerSuccess.textContent = '-';
    aiMessage.textContent = !aiMode.checked ? 'AI 모드를 껐어요. 연주판은 그대로 직접 진행할 수 있어요.' : '공식 옵션 확률을 불러오지 못해 추천을 잠시 멈췄어요.';
    return null;
  }
  const state = { notes: stats, performances, rerollsUsed, choices: choices?.map(choice => choice.stat) ?? null };
  const matching = choices?.filter(choice => choice.stat === stats.at(-1)) ?? [];
  const freshKey = `${songSelect.value}|${target}`;
  if (!freshOutcomeCache.has(freshKey)) freshOutcomeCache.set(freshKey,
    estimatedOutcome({ notes: [], performances: 0, rerollsUsed: 0, choices: null }, target, 'fresh'));
  const fresh = freshOutcomeCache.get(freshKey);
  aiCostPerSuccess.textContent = formatExpectedCost(costPerSuccess(fresh));
  const unselected = choices ? 1 : 0;
  const future = unselected + Math.min(MAX_STRINGS - notes.length - unselected, remaining);
  const maxReachable = Math.max(bestRun, choices && !matching.length && availableRerolls() === 0 ? future : run + future);
  const actions = [];
  if (choices) {
    const estimate = estimateSelectionOutcome(state, target);
    const exact = estimate?.stat ? recommendedChoice(estimate.stat) : null;
    actions.push({ ...estimate, action: 'select', grade: exact?.grade });
    if (availableRerolls() > 0) actions.push({ action: 'reroll', ...estimatedOutcome({ ...state, rerollFirst: true }, target, 'reroll') });
  } else if (notes.length < MAX_STRINGS && remaining >= MAX_STRINGS - notes.length) {
    actions.push({ action: 'play', ...estimatedOutcome(state, target, 'continue') });
  }
  if (notes.length) actions.push({ action: 'reset', ...fresh, resetFee: resetCost() });
  for (const action of actions) action.expectedCost = expectedDiamondCost(action, action.resetFee || 0);
  actions.sort((a, b) => costPerSuccess(a, a.resetFee || 0) - costPerSuccess(b, b.resetFee || 0) || b.chance - a.chance);
  // A visible matching choice preserves progress without spending a performance.
  let selected = matching.length ? actions.find(action => action.action === 'select') : actions[0];
  if (maxReachable < target) selected = actions.find(action => action.action === 'reset');
  if (bestRun >= target) selected = null;
  const alternative = actions.find(action => action !== selected);
  const rare = lowestFrequencyStats(activeOptions);
  const matchingBonuses = matching.map(choice => {
    const count = notes.slice(-run).filter(note => note.grade === choice.grade).length;
    return gradeBonusIncrease(choice.grade, count, choice.label.endsWith('%') ? 'rate' : 'main');
  });
  const advice = explainEpicSituation({
    target, run, bestRun, maxReachable, filled: notes.length, stringsLeft: MAX_STRINGS - notes.length,
    rerolls: availableRerolls(), matchingCount: matching.length, selected, alternative,
    hasChoices: Boolean(choices), resetFee: resetCost(), lastStat: stats.at(-1), manual: Boolean(manualSession),
    rerollOutcome: actions.find(action => action.action === 'reroll'),
    rareStats: [...new Set((choices || []).filter(choice => rare.has(choice.stat)).map(choice => choice.stat))],
    equivalentCards: matching.length > 1 && matching.every(choice => choice.grade === matching[0].grade),
    gradeAdvantage: matchingBonuses.length > 1 && Math.max(...matchingBonuses) > Math.min(...matchingBonuses),
  });
  aiMessage.dataset.scenario = String(advice.scenario);
  renderAiMessage(advice.before, advice.action, advice.after, advice.reason);
  aiRecommendedAction.textContent = advice.scenario === 1 ? '목표 달성' : advice.scenario === 18 ? '판단 보류' : advice.action;
  aiCurrentChance.textContent = advice.scenario === 1 ? '100%' : selected?.chance > 0 ? formatChance(selected.chance) : '달성 표본 없음';
  return advice.scenario === 18 ? null : selected;
}

function formatExpectedCost(cost) {
  return Number.isFinite(cost) ? `${cost.toFixed(1)} 다이아` : '달성 표본 없음';
}

function render() {
  renderGlobalStats();
  const recommendation = renderAi();
  stringsList.replaceChildren();
  for (let index = 0; index < MAX_STRINGS; index += 1) {
    const item = document.createElement('li');
    item.className = 'epic-string';
    item.dataset.position = String(index + 1);
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
  document.getElementById('epic-remaining-performances').textContent = String(MAX_PERFORMANCES - performances);
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
      button.style.setProperty('--choice-font-desktop', `${labelLength > 10 ? 18 : 22}px`);
      button.style.setProperty('--choice-font-mobile', `${labelLength > 10 ? 13 : 15}px`);
      if (notes.length && choice.stat === notes.at(-1).stat) button.classList.add('is-linked');
      const recommended = !manualSession && aiMode.checked && recommendation?.action === 'select'
        && ((recommendation.stat === choice.stat && recommendation.grade === choice.grade)
          || recommendation.equalFirstStats?.includes(choice.stat));
      if (recommended) {
        button.classList.add('is-recommended');
        button.setAttribute('aria-describedby', 'epic-ai-message epic-ai-reason');
      }
      button.innerHTML = `<span class="epic-choice-grade">${choice.grade}</span><strong>${choice.label}</strong><span class="epic-choice-probability" title="공식 등급별 옵션 노출 확률 · 선택 시 등급 상승 전">${choice.probability}</span>`;
      button.setAttribute('aria-label', `${choice.grade} ${choice.stat} 선택`);
      button.addEventListener('click', () => applyChoice(choice));
      choicesBox.append(button);
    });
  } else {
    for (let index = 0; index < 3; index += 1) {
      const placeholder = document.createElement('div');
      placeholder.className = 'epic-choice-placeholder';
      placeholder.textContent = done ? '악장 완성' : '연주 준비';
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
