export const ENHANCEMENT_PROBABILITIES = Object.freeze({
  equipment: Object.freeze([1, 1, 1, 1, 1, 0.65, 0.5, 0.35, 0.2, 0.05, 0.03, 0.01]),
  accessory: Object.freeze([1, 0.8, 0.65, 0.5, 0.35, 0.2, 0.1, 0.05, 0.04, 0.03, 0.02, 0.01]),
});

export function enhancementCosts(kind, itemPrice, scrollPrice) {
  const probabilities = ENHANCEMENT_PROBABILITIES[kind];
  if (!probabilities || !Number.isFinite(itemPrice) || itemPrice <= 0 || !Number.isFinite(scrollPrice) || scrollPrice <= 0) {
    throw new RangeError('Invalid enhancement parameters.');
  }
  let survival = 1;
  let failureCost = 0;
  let failureCostSquared = 0;
  return probabilities.map((probability, index) => {
    const target = index + 1;
    const attemptCost = itemPrice + target * scrollPrice;
    const failure = survival * (1 - probability);
    failureCost += failure * attemptCost;
    failureCostSquared += failure * attemptCost ** 2;
    survival *= probability;
    // A cycle ends at destruction or success. Failed cycles restart independently;
    // cycle cost and success are correlated, so their joint moments are retained.
    const cycleMean = failureCost + survival * attemptCost;
    const cycleSecondMoment = failureCostSquared + survival * attemptCost ** 2;
    const mean = cycleMean / survival;
    const variance = (cycleSecondMoment + 2 * failureCost * mean) / survival - mean ** 2;
    const standardDeviation = Math.sqrt(Math.max(0, variance));
    return {target, successProbability: survival, mean, standardDeviation};
  });
}
