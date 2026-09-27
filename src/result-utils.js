export function resultFilename(event, sortOrder = 'latest') {
  const name = (event?.name || 'イベント').replace(/[<>:"/\\|?*\p{Cc}]/gu, '_').replace(/[. ]+$/g, '') || 'イベント';
  let ended = '開催中';
  if (event?.endedAt != null && Number.isFinite(new Date(event.endedAt).getTime())) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(event.endedAt));
    const part = type => parts.find(item => item.type === type).value;
    ended = `${part('year')}-${part('month')}-${part('day')}_${part('hour')}-${part('minute')}-${part('second')}`;
  } else if (event?.status === 'ended') ended = '終了日時未設定';
  const selection = { time: 'Time', latest: 'history', overall: 'Overall' }[sortOrder] || 'history';
  return `Result_${name}_${ended}_${selection}.csv`;
}

export function resultCSVRows(event, results, sortOrder) {
  const sorted = selectResults(results, sortOrder);
  const ranked = sortOrder === 'time' || sortOrder === 'overall';
  const format = ms => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(Math.floor(ms / 10) % 100).padStart(2, '0')}`;
  return [[...(ranked ? ['順位'] : []), 'イベント', '日時', 'カーナンバー', '車両名', 'タイム', ...(ranked ? ['1位との差'] : [])],
    ...sorted.map((result, index) => [...(ranked ? [index + 1] : []), event?.name || '', new Date(result.timestamp).toLocaleString('ja-JP'), result.carNumber, result.vehicleName, format(result.timeMs), ...(ranked ? [`+${format(result.timeMs - sorted[0].timeMs)}`] : [])])];
}

export function summarizeResults(results) {
  const bestByCar = new Map();
  let latest = null;
  for (const result of results) {
    const best = bestByCar.get(result.carNumber);
    if (!best || result.timeMs < best.timeMs || (result.timeMs === best.timeMs && result.timestamp > best.timestamp)) bestByCar.set(result.carNumber, result);
    if (!latest || result.timestamp > latest.timestamp) latest = result;
  }
  return { bestByCar, latest };
}

export function classifyArrivals(previous, next) {
  const known = new Set(previous.map(result => result.id));
  const best = new Map([...summarizeResults(previous).bestByCar].map(([car, result]) => [car, result.timeMs]));
  let overall = previous.length ? Math.min(...previous.map(result => result.timeMs)) : null;
  const arrivals = {};
  for (const result of [...next].reverse().filter(result => !known.has(result.id)).sort((a, b) => a.timestamp - b.timestamp)) {
    const personal = best.get(result.carNumber);
    arrivals[result.id] = overall !== null && result.timeMs < overall ? 'global'
      : personal !== undefined && result.timeMs < personal ? 'personal' : 'normal';
    best.set(result.carNumber, Math.min(personal ?? Infinity, result.timeMs));
    overall = Math.min(overall ?? Infinity, result.timeMs);
  }
  return arrivals;
}

export function selectResults(results, sortOrder, carNumber = '') {
  const source = sortOrder === 'overall' ? [...summarizeResults(results).bestByCar.values()] : results;
  return source.filter(result => !carNumber || result.carNumber === carNumber).sort((a, b) => sortOrder === 'latest'
    ? b.timestamp - a.timestamp
    : a.timeMs - b.timeMs || b.timestamp - a.timestamp || a.carNumber.localeCompare(b.carNumber, 'ja', { numeric: true }));
}

export function resultCarOptions(entries, results) {
  const cars = new Map(entries.map(car => [car.carNumber, car.vehicleName]));
  for (const result of [...results].sort((a, b) => b.timestamp - a.timestamp)) {
    if (!cars.has(result.carNumber)) cars.set(result.carNumber, result.vehicleName);
  }
  return [...cars].sort(([a], [b]) => a.localeCompare(b, 'ja', { numeric: true }));
}
