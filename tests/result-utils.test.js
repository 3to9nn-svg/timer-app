import test from 'node:test';
import assert from 'node:assert/strict';
import { resultFilename, resultCarOptions, selectResults, summarizeResults } from '../src/result-utils.js';

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
  assert.equal(resultFilename({ name: '秋のラリー', endedAt: Date.parse('2026-09-27T08:05:06Z') }), 'Result_秋のラリー_2026-09-27_17-05-06.csv');
  assert.equal(resultFilename({ name: '走行会', status: 'active' }), 'Result_走行会_開催中.csv');
  assert.equal(resultFilename({ name: 'A/B:C?\n', status: 'ended' }), 'Result_A_B_C___終了日時未設定.csv');
});
