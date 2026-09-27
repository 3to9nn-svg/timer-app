export function resultFilename(event) {
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
  return `Result_${name}_${ended}.csv`;
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
