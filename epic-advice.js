// Scenario IDs follow the 18 agreed situations. Structural facts precede estimates.
const names = { play: '연주', select: '카드 선택', reroll: '다시 연주', reset: '초기화' };
const percent = value => value > 0 && value < 0.0005 ? '0.1% 미만' : `${(value * 100).toFixed(1)}%`;
const cost = action => action?.chance > 0 ? action.expectedCost / action.chance : Infinity;
const result = (scenario, before, action = '', after = '', reason = '') => ({ scenario, before, action, after, reason });

export function explainEpicSituation(c) {
  const { target, run, bestRun, maxReachable, filled, stringsLeft, rerolls, matchingCount,
    selected, alternative, rareStats = [], manual = false } = c;
  const card = selected?.grade ? `${selected.grade} ${selected.stat} 선택` : `${selected?.stat} 선택`;
  const action = names[selected?.action] || '';
  if (bestRun >= target) return result(1, `목표 ${target}연속을 달성했어요.`);
  if (maxReachable < target) return result(2,
    `남은 현을 모두 연결해도 최대 ${maxReachable}연속이라 목표 ${target}연속을 만들 수 없어요. `,
    '초기화', c.resetFee === 0 ? '가 무료이니 새로 시작하세요.' : '를 추천해요.');
  if (matchingCount && run + 1 >= target) return result(3,
    `이 카드를 고르면 목표 ${target}연속이 완성돼요. `, card, '을 추천해요.');
  if (!filled && !c.hasChoices && selected?.action === 'play') return result(4, '', '연주', '해서 첫 선택지를 확인하세요.');

  if (matchingCount && selected?.action === 'select') {
    if (matchingCount === 1) return result(9,
      `${selected.stat}을 고르면 ${run + 1}연속이 돼요. `, card, '을 추천해요.');
    if (c.gradeAdvantage) return result(10,
      `같은 능력치라도 ${selected.grade}를 고르면 동일 등급 추가 보너스가 더 커요. `, card, '을 추천해요.');
    if (c.equivalentCards) return result(11,
      `${selected.stat} 카드들은 연결 결과와 등급 보너스가 같아요. `, `${selected.stat} 선택`, '으로 이어가세요.');
    return result(10, `연결 결과가 같으니 능력치 수치가 높은 카드를 고르세요. `, card, '을 추천해요.');
  }

  if (!selected || selected.chance === 0) return result(18,
    '현재 계산으로는 유리한 행동을 판단하기 어려워요. 목표 달성이 불가능하다는 뜻은 아니에요.');

  if (selected.action === 'select' && !filled) {
    if (rareStats.length) return result(8,
      `${rareStats.join(', ')}은 다른 능력치보다 덜 나와 연속 완성이 더 어려워요. `,
      '원하는 스탯 선택', ' 시 이 점을 고려하세요.');
    return result(7, '어느 능력치를 골라도 연결 확률은 같아요. ', '원하는 스탯 선택', '을 추천해요.');
  }

  // Compare only meaningful alternatives; sampling noise must not become a confident claim.
  if (alternative?.chance > 0 && Number.isFinite(cost(selected)) && Number.isFinite(cost(alternative))) {
    const difference = Math.abs(selected.chance - alternative.chance);
    const comparableCost = Math.abs(cost(selected) - cost(alternative)) / Math.max(1, cost(selected), cost(alternative)) <= 0.05;
    const comparison = `${action} 시 ${percent(selected.chance)}, ${names[alternative.action]} 시 ${percent(alternative.chance)}예요. `;
    if (difference <= 0.02 && comparableCost) return result(17,
      comparison, action, '를 추천하지만 차이가 작아 어느 쪽을 선택해도 괜찮아요.');
    if (selected.chance + 0.02 < alternative.chance && cost(selected) < cost(alternative)) return result(16,
      comparison, action, '는 예상 비용이 적고, 다른 선택은 성공 확률이 더 높아요.');
  }

  if (selected.action === 'reset') {
    const reason = target - run >= stringsLeft
      ? `남은 ${stringsLeft}현을 모두 연결해야 해요.`
      : rerolls <= 1
        ? `다시 연주 기회가 ${rerolls}회 남아 연결이 끊겼을 때 만회하기 어려워요.`
        : run <= 1
          ? '이어진 현이 없어 현재 악장을 계속할 이점이 적어요.'
          : `현재 ${run}연속에서 목표까지 ${target - run}개를 더 이어야 해요.`;
    const recovery = c.hasChoices && !matchingCount
      ? `지금 카드를 고르면 기존 연결이 끊기고, 새 연결은 남은 ${stringsLeft}현 안에서 만들어야 해요.`
      : rerolls === 0
        ? '다시 연주할 여유가 없어 다음 선택지에서 연결이 나오지 않으면 만회할 수 없어요.'
        : `현재 연결을 지키려면 ${target - run}개를 더 이어야 하고, 다시 연주해도 이미 확정한 현은 바꿀 수 없어요.`;
    const benefit = selected.expectedCost === 0
      ? '초기화하면 12현과 연주 24회로 다시 시작해 목표를 달성할 가능성이 높아져요.'
      : '초기화하면 12현과 연주 24회로 다시 시작해, 이 악장에 선율을 더 쓰는 것보다 목표 한 번을 달성하는 데 드는 예상 비용이 적어요.';
    return result(15, reason + ' ', '초기화', c.resetFee === 0 ? '를 추천해요. 지금은 무료예요.' : '를 추천해요.', `${recovery} ${benefit}`);
  }
  if (selected.action === 'reroll' && !filled) return result(12,
    '아직 첫 현을 확정하지 않은 상태예요. ', '다시 연주', '해서 다른 선택지를 확인하세요.',
    rareStats.length ? `${rareStats.join(', ')}은 다른 능력치보다 덜 나와 이후 연결이 어려워요. 첫 현이라 잃을 연결이 없으므로, 연결하기 쉬운 능력치로 시작하는 편이 유리해요.`
      : '첫 현이라 잃을 연결이 없어요. 현재 계산에서는 지금 확정하는 것보다 다시 연주한 뒤 시작하는 편이 유리하지만, 추정치에는 표본 오차가 있어요.');
  if (selected.action === 'reroll') return result(rerolls === 1 ? 13 : 12,
    rerolls === 1 ? `지금 선택하면 ${run}연속이 끊겨요. 마지막 ` : `지금 선택하면 ${run}연속이 끊겨요. `,
    '다시 연주', `로 ${c.lastStat}을 노려보세요.`,
    `새 연결을 시작하면 ${target}개를 다시 이어야 하지만, 지금 ${run}연속을 유지하면 ${target - run}개만 더 이으면 돼요. 남은 연주 기회를 현재 연결을 지키는 데 쓰는 편이 유리해요.`);
  if (selected.action === 'select' && rerolls === 0) return result(14,
    '다시 연주할 횟수가 남지 않았어요. ', selected.stat ? card : '카드 선택', ' 후 남은 현에서 연결을 노려보세요.');
  if (selected.action === 'play') {
    if (target - run >= stringsLeft) return result(6,
      `목표까지 남은 ${stringsLeft}현을 모두 연결해야 해요. `, '연주', '해서 연결을 이어가세요.');
    return result(5, `목표까지 ${target - run}개를 더 연결하면 돼요. `, '연주', '해서 이어가세요.');
  }
  // A nonmatching selection starts a new chain; it must not be described as preserving one.
  const reroll = c.rerollOutcome;
  const reason = run <= 1
    ? '아직 이어진 현이 없어 다시 연주로 지킬 연결이 없어요. 지금 한 현을 확정하고, 남은 연주는 다음 현을 연결하는 데 쓰는 편이 유리해요.'
    : reroll?.chance > selected.chance
      ? `남은 ${stringsLeft}현에서 새로 ${target}연속을 만들 수 있어요. 다시 연주하면 기존 ${run}연속을 지킬 가능성은 있지만, 그 확률을 높이는 데 선율을 더 쓰기보다 새 연결을 시작하는 편이 성공당 예상 비용이 적어요.`
      : `기존 ${run}연속을 지키려면 다시 연주에서 ${c.lastStat}이 나와야 해요. 남은 ${stringsLeft}현에서는 새로 ${target}연속을 만들 수 있으므로, 지금 한 현을 확정하고 이후 연결에 연주 횟수를 남기는 편이 유리해요.`;
  return result(7, manual ? '입력한 상태에서 계속 진행할 수 있어요. ' : '현재 선택지로는 기존 연결을 이어갈 수 없어요. ',
    '원하는 스탯 선택', '으로 새 연결을 시작하세요.', reason);
}
