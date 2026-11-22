// Scenario IDs follow the 18 agreed situations. Structural facts precede estimates.
const names = { play: '연주', select: '카드 선택', reroll: '다시 연주', reset: '초기화' };
const percent = value => value > 0 && value < 0.0005 ? '0.1% 미만' : `${(value * 100).toFixed(1)}%`;
const cost = action => action?.chance > 0 ? action.expectedCost / action.chance : Infinity;
const result = (scenario, before, action = '', after = '') => ({ scenario, before, action, after });

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
    const advantage = selected.expectedCost === 0 ? '새로 시작하는 편이 목표 달성 가능성이 높아 ' : '새로 시작하는 편이 예상 비용이 적어 ';
    return result(15, `${reason} ${advantage}`,
      '초기화', c.resetFee === 0 ? '를 추천해요. 지금은 무료예요.' : '를 추천해요.');
  }
  if (selected.action === 'reroll') return result(rerolls === 1 ? 13 : 12,
    rerolls === 1 ? `지금 선택하면 ${run}연속이 끊겨요. 마지막 ` : `지금 선택하면 ${run}연속이 끊겨요. `,
    '다시 연주', `로 ${c.lastStat}을 노려보세요.`);
  if (selected.action === 'select' && rerolls === 0) return result(14,
    '다시 연주할 횟수가 남지 않았어요. ', selected.stat ? card : '카드 선택', ' 후 남은 현에서 연결을 노려보세요.');
  if (selected.action === 'play') {
    if (target - run >= stringsLeft) return result(6,
      `목표까지 남은 ${stringsLeft}현을 모두 연결해야 해요. `, '연주', '해서 연결을 이어가세요.');
    return result(5, `목표까지 ${target - run}개를 더 연결하면 돼요. `, '연주', '해서 이어가세요.');
  }
  // A nonmatching selection starts a new chain; it must not be described as preserving one.
  return result(7, manual ? '입력한 상태에서 계속 진행할 수 있어요. ' : '현재 선택지로는 기존 연결을 이어갈 수 없어요. ',
    '원하는 스탯 선택', '으로 새 연결을 시작하세요.');
}
