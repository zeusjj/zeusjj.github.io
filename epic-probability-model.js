export const GRADE_NAMES = ['일반', '고급', '희귀', '영웅', '전설'];
const GRADE_CLASSES = ['normal', 'advanced', 'rare', 'hero', 'legend'];
const GRADE_BONUSES = {
  고급: {
    main: [0, 0, 0, 1, 1, 2, 3, 4, 5, 6, 7, 8, 10],
    rate: [0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8]
  },
  희귀: {
    main: [0, 0, 2, 4, 6, 8, 10, 13, 16, 19, 22, 26, 30],
    rate: [0, 0, 0, 0.2, 0.4, 0.7, 1, 1.3, 1.6, 1.9, 2.3, 2.7, 3.1]
  },
  영웅: {
    main: [0, 0, 3, 7, 11, 15, 19, 24, 29, 35, 41, 47, 54],
    rate: [0, 0, 0.4, 0.8, 1.3, 1.9, 2.5, 3.1, 3.8, 4.5, 5.3, 6.2, 7.1]
  },
  전설: {
    main: [0, 0, 5, 10, 16, 23, 30, 38, 47, 56, 65, 75, 86],
    rate: [0, 0, 0.7, 1.5, 2.4, 3.3, 4.3, 5.5, 6.7, 8, 9.3, 10.8, 12.3]
  }
};

export function parseOptions(rows) {
  return rows.map(([grade, label, probability]) => {
    const match = /^(.*) ([\d.]+%?)$/.exec(label);
    const gradeIndex = GRADE_NAMES.indexOf(grade);
    const weight = Number(probability.replace('%', ''));
    if (!match || gradeIndex < 0 || !Number.isFinite(weight) || weight <= 0) throw new Error('Invalid epic probability row');
    return { grade, gradeClass: GRADE_CLASSES[gradeIndex], stat: match[1], label, probability, weight };
  });
}

export function drawOption(options, random = Math.random) {
  // Published joint probabilities include grade already; normalize rounding only.
  let roll = random() * options.reduce((sum, option) => sum + option.weight, 0);
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return { ...option };
  }
  return { ...options.at(-1) };
}

export function groupOptions(options) {
  const groups = new Map();
  for (const option of options) {
    if (!groups.has(option.probability)) groups.set(option.probability, []);
    groups.get(option.probability).push(option);
  }
  return [...groups].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
}

export function statOdds(options) {
  const total = options.reduce((sum, option) => sum + option.weight, 0), weights = new Map();
  for (const option of options) weights.set(option.stat, (weights.get(option.stat) || 0) + option.weight);
  return new Map([...weights].map(([stat, weight]) => [stat, weight / total]));
}

export function lowestFrequencyStats(options) {
  const odds = statOdds(options), values = [...odds.values()], minimum = Math.min(...values), maximum = Math.max(...values);
  if (maximum - minimum <= maximum * 0.0001) return new Map();
  return new Map([...odds].filter(([, chance]) => Math.abs(chance - minimum) <= minimum * 0.0001));
}

export function gradeBonusIncrease(grade, existingCount, kind = 'main') {
  const values = GRADE_BONUSES[grade]?.[kind];
  if (!values || existingCount >= 12) return 0;
  const count = Math.max(0, Math.min(12, existingCount));
  return values[count + 1] - values[count];
}
