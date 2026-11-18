export const GRADE_NAMES = ['일반', '고급', '희귀', '영웅', '전설'];
const GRADE_CLASSES = ['normal', 'advanced', 'rare', 'hero', 'legend'];

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
