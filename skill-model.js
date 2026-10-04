const rises = [1, .7, .55, .45, .35, .25, .2, .15, .12, .1];
const drops = {
  normal: [0, 0, 0, 0, 0, 0, 0, .35, .48, .6],
  advanced: [0, 0, 0, 0, 0, 0, .25, .35, .48, .6],
  rare: [0, 0, 0, 0, 0, .2, .25, .35, .48, .6],
};

export function skillRates(grade) {
  if (!Object.hasOwn(drops, grade)) throw new RangeError('Unknown skill grade');
  return rises.map((up, index) => ({target: index + 1, up, down: drops[grade][index], stay: 1 - up - drops[grade][index]}));
}

export function skillDistribution(grade, start, target) {
  if (!Number.isInteger(start) || target !== start + 1 || start < 0 || target > 10) throw new RangeError('Invalid skill target');
  const rates = skillRates(grade);
  // Crossing one level can include a drop, recovery to this level, and a fresh attempt.
  let mean = 0;
  for (let level = 0; level <= start; level++) mean = (1 + rates[level].down * mean) / rates[level].up;
  if (Math.abs(mean - Math.round(mean)) < 1e-10) mean = Math.round(mean);
  let states = new Float64Array(target);
  states[start] = 1;
  const cdf = [0], quantiles = [null, null, null], thresholds = [.25, .5, .75];
  let completed = 0;
  for (let count = 1; count <= 100000; count++) {
    const next = new Float64Array(target);
    for (let level = 0; level < target; level++) {
      const mass = states[level], rate = rates[level];
      next[level] += mass * rate.stay;
      if (level + 1 === target) completed += mass * rate.up;
      else next[level + 1] += mass * rate.up;
      if (level > 0) next[level - 1] += mass * rate.down;
    }
    cdf.push(Math.min(1, completed));
    thresholds.forEach((threshold, index) => {if (quantiles[index] === null && completed >= threshold) quantiles[index] = count;});
    states = next;
    if (states.reduce((sum, mass) => sum + mass, 0) < 1e-13) break;
    if (count === 100000) throw new Error('Skill distribution did not converge');
  }
  const probability = count => {
    if (!Number.isFinite(count) || count < 0) throw new RangeError('Invalid scroll count');
    return cdf[Math.min(Math.floor(count), cdf.length - 1)];
  };
  return {start, target, mean, quantiles, probability, overMean: 1 - probability(mean), overDoubleMean: 1 - probability(2 * mean)};
}
