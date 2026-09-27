import test from 'node:test';
import assert from 'node:assert/strict';
import { resultFilename, resultCSVRows, resultCarOptions, selectResults, summarizeResults } from '../src/result-utils.js';

const rows = [
  { id: 'a', carNumber: '100', vehicleName: 'Old name', timeMs: 61000, timestamp: 100 },
  { id: 'b', carNumber: '2', vehicleName: 'Car 2', timeMs: 55000, timestamp: 200 },
  { id: 'c', carNumber: '100', vehicleName: 'Car 100', timeMs: 60000, timestamp: 300 },
  { id: 'd', carNumber: '100', vehicleName: 'Car 100', timeMs: 60000, timestamp: 400 },
  { id: 'e', carNumber: '2', vehicleName: 'Car 2', timeMs: 65000, timestamp: 500 },
];
test('overall selects one best run per car, using newest on an equal time', () => {
  assert.deepEqual(selectResults(rows, 'overall').map(r => r.id), ['b', 'd']);
  assert.deepEqual(selectResults(rows, 'overall', '100').map(r => r.id), ['d']);
  assert.deepEqual(selectResults(rows, 'latest').map(r => r.id), ['e', 'd', 'c', 'b', 'a']);
  assert.deepEqual(selectResults(rows, 'time').map(r => r.id), ['b', 'd', 'c', 'a', 'e']);
  assert.deepEqual(rows.map(r => r.id), ['a', 'b', 'c', 'd', 'e']);
});
test('PB covers tied fastest times; latest is independent of sort/filter', () => {
  const { bestByCar, latest } = summarizeResults(rows);
  assert.equal(latest.id, 'e');
  assert.deepEqual(rows.filter(r => r.timeMs === bestByCar.get(r.carNumber).timeMs).map(r => r.id), ['b', 'c', 'd']);
  assert.equal(summarizeResults([]).latest, null);
});
test('options include names and deleted entries, sorted numerically', () => {
  assert.deepEqual(resultCarOptions([{ carNumber: '100', vehicleName: 'Current name' }, { carNumber: '30', vehicleName: 'Not started' }], rows), [['2', 'Car 2'], ['30', 'Not started'], ['100', 'Current name']]);
});
test('CSV filenames use event end in JST, safe characters, and explicit unfinished status', () => {
  assert.equal(resultFilename({ name: '秋のラリー', endedAt: Date.parse('2026-09-27T08:05:06Z') }), 'Result_秋のラリー_2026-09-27_17-05-06_history.csv');
  assert.equal(resultFilename({ name: '走行会', status: 'active' }, 'time'), 'Result_走行会_開催中_Time.csv');
  assert.equal(resultFilename({ name: 'A/B:C?\n', status: 'ended' }, 'overall'), 'Result_A_B_C___終了日時未設定_Overall.csv');
});

test('ranked CSV includes display ranks and gaps, history omits both', () => {
  const time = resultCSVRows({ name: 'Test' }, rows, 'time');
  assert.deepEqual(time[0], ['順位', 'イベント', '日時', 'カーナンバー', '車両名', 'タイム', '1位との差']);
  assert.deepEqual(time.slice(1).map(row => [row[0], row[3], row[6]]), [[1, '2', '+00:00.00'], [2, '100', '+00:05.00'], [3, '100', '+00:05.00'], [4, '100', '+00:06.00'], [5, '2', '+00:10.00']]);
  const overall = resultCSVRows({}, rows, 'overall');
  assert.equal(overall.length, 3);
  assert.deepEqual(overall.slice(1).map(row => row[6]), ['+00:00.00', '+00:05.00']);
  const filtered = resultCSVRows({}, rows.filter(row => row.carNumber === '100'), 'time');
  assert.deepEqual(filtered.slice(1).map(row => row[6]), ['+00:00.00', '+00:00.00', '+00:01.00']);
  const history = resultCSVRows({}, rows, 'latest');
  assert.deepEqual(history[0], ['イベント', '日時', 'カーナンバー', '車両名', 'タイム']);
  assert.equal(history[1][4], '01:05.00');
});
