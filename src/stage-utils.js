export function eventStages(event) {
  if (!event) return [];
  return event.stages?.length ? event.stages : [{ id: `${event.id}:ss1`, name: 'SS1', sessionMode: event.sessionMode || 'free', runOrder: event.runOrder || [], orderRevision: event.orderRevision || 0 }];
}

export function stageRecords(records, stageId, stages) {
  return records.filter(record => (record.stageId || stages[0]?.id) === stageId);
}

export function totalResults(entries, results, stages) {
  const cars = new Map(entries.map(car => [car.carNumber, { carNumber: car.carNumber, vehicleName: car.vehicleName }]));
  for (const run of results) if (!cars.has(run.carNumber)) cars.set(run.carNumber, { carNumber: run.carNumber, vehicleName: run.vehicleName });
  const best = new Map();
  for (const run of results) {
    const key = JSON.stringify([run.carNumber, run.stageId || stages[0]?.id]);
    best.set(key, Math.min(best.get(key) ?? Infinity, run.timeMs));
  }
  const rows = [...cars.values()].map(car => {
    const times = stages.map(stage => best.get(JSON.stringify([car.carNumber, stage.id])) ?? null);
    const completed = times.filter(time => time !== null).length;
    return { ...car, id: car.carNumber, times, completed, complete: stages.length > 0 && completed === stages.length, timeMs: times.reduce((sum, time) => sum + (time ?? 0), 0) };
  }).sort((a, b) => Number(b.complete) - Number(a.complete) || (a.complete ? a.timeMs - b.timeMs : 0) || a.carNumber.localeCompare(b.carNumber, 'ja', { numeric: true }));
  let rank = 0;
  return rows.map(row => ({ ...row, rank: row.complete ? ++rank : null }));
}

export const formatStageTime = ms => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(Math.floor(ms / 10) % 100).padStart(2, '0')}`;

export function totalCSVRows(event, entries, results, stages, carNumber = '') {
  const all = totalResults(entries, results, stages);
  const fastest = all.find(row => row.complete)?.timeMs;
  return [['順位', 'イベント', 'カーナンバー', '車両名', ...stages.map((stage, index) => `SS${index + 1} ${stage.name}`), '合計タイム', '1位との差', '計測済みSS数', '状態'],
    ...all.filter(row => !carNumber || row.carNumber === carNumber).map(row => [row.rank ?? '', event?.name || '', row.carNumber, row.vehicleName, ...row.times.map(time => time === null ? '' : formatStageTime(time)), row.complete ? formatStageTime(row.timeMs) : '', row.complete ? `+${formatStageTime(row.timeMs - fastest)}` : '', `${row.completed}/${stages.length}`, row.complete ? '全SS計測済み' : '未計測SSあり'])];
}
