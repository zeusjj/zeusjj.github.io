(() => {
  const weekdays = [
    { day: 1, label: '월요일', activities: ['침공', '성물 방어전'] },
    { day: 4, label: '목요일', activities: ['침공', '항아리 모임'] },
  ];
  function applyDefaults(text) {
    return text.split(/\r?\n(?=\[)/).map(part => {
      const match = part.match(/^\[시간\]\s*([\s\S]*)$/);
      if (!match) return part;
      const start = match[1].search(/(?:^|\n)성물 방어전\s*\r?\n/);
      if (start < 0) return part;
      const weekend = match[1].slice(0, start).trim();
      const weekdayText = weekdays.map(day => `${day.label}\n- ${day.activities.join(' → ')}`).join('\n\n');
      return `[시간]\n\n${weekend}\n\n${weekdayText}\n`;
    }).join('\n');
  }
  window.GuildSchedule = { weekdays, applyDefaults };
})();
