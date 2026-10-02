import test from 'node:test';
import assert from 'node:assert/strict';
import { eventStages, stageRecords, totalResults, totalCSVRows } from '../src/stage-utils.js';
import { resultFilename } from '../src/result-utils.js';

const stages = [{ id: 's1', name: '午前' }, { id: 's2', name: '午後' }];
const entries = ['2', '30', '100', '4'].map(carNumber => ({ carNumber, vehicleName: `Car ${carNumber}` }));
const results = [
  { carNumber: '2', stageId: 's1', timeMs: 15000 }, { carNumber: '2', stageId: 's1', timeMs: 10000 }, { carNumber: '2', stageId: 's2', timeMs: 20000 },
  { carNumber: '30', stageId: 's1', timeMs: 0 }, { carNumber: '30', stageId: 's2', timeMs: 15000 },
  { carNumber: '100', stageId: 's1', timeMs: 5000 },
];
test('total results sum each SS best, zero is valid, incomplete cars are unranked last', () => {
  const rows = totalResults(entries, results, stages);
  assert.deepEqual(rows.map(row => [row.carNumber, row.rank, row.complete]), [['30', 1, true], ['2', 2, true], ['4', null, false], ['100', null, false]]);
  assert.equal(rows[1].timeMs, 30000);
  assert.equal(rows[3].completed, 1);
  const csv = totalCSVRows({ name: 'Event' }, entries, results, stages);
  assert.equal(csv[1][6], '00:15.00');
  assert.equal(csv[2][7], '+00:15.00');
  assert.equal(csv[4][6], '');
  const filtered = totalCSVRows({}, entries, results, stages, '2');
  assert.equal(filtered[1][0], 2);
  assert.equal(filtered[1][7], '+00:15.00');
});
test('legacy and archived SS grouping is stable and export names distinguish stages', () => {
  const legacy = { id: 'old' };
  assert.equal(eventStages(legacy)[0].id, 'old:ss1');
  assert.equal(stageRecords([{ timeMs: 1 }], 'old:ss1', eventStages(legacy)).length, 1);
  assert.equal(stageRecords(results, 's2', stages).length, 2);
  assert.match(resultFilename({ name: 'Event' }, 'time', '午前/林道'), /_午前_林道_Time.csv$/);
  assert.match(resultFilename({ name: 'Event' }, 'total'), /_Total.csv$/);
  assert.deepEqual(totalResults(entries, [], []).map(row => row.rank), [null, null, null, null]);
});
