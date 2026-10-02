import { totalResults, formatStageTime } from './stage-utils';

export function TotalResults({ entries, results, stages, carNumber }) {
  const all = totalResults(entries, results, stages);
  const best = all.find(row => row.complete)?.timeMs;
  const rows = all.filter(row => !carNumber || row.carNumber === carNumber);
  return <div className="total-results ranked-results">
    <p className="results-scope">各SSのベストタイムを合計。全{stages.length}SSの計測済み車両のみ順位を付けます。車両を絞り込んでも総合順位・タイム差は全車両基準です。</p>
    {!rows.length ? <p className="archive-status">エントリー・計測結果はありません。</p> : <div className="total-table-scroll" tabIndex={0} aria-label="SS別タイムと総合順位"><table>
      <thead><tr><th>順位</th><th>車両</th>{stages.map((stage, index) => <th key={stage.id}>SS{index + 1}<br />{stage.name}</th>)}<th>合計</th><th>1位との差</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} className={row.rank === 1 ? 'leader' : undefined}>
        <td><span className="position">{row.rank === null ? '—' : String(row.rank).padStart(2, '0')}</span></td>
        <th scope="row"><div className="result-car"><span className="result-number">#{row.carNumber}</span><strong title={row.vehicleName}>{row.vehicleName}</strong></div></th>
        {row.times.map((time, index) => <td key={stages[index].id}>{time === null ? '未計測' : <span className="result-time"><strong>{formatStageTime(time)}</strong></span>}</td>)}
        <td>{row.complete ? <span className="result-time"><strong>{formatStageTime(row.timeMs)}</strong></span> : <strong>未計測SSあり ({row.completed}/{stages.length})</strong>}</td>
        <td><span className="time-gap">{row.complete ? `+${formatStageTime(row.timeMs - best)}` : '—'}</span></td>
      </tr>)}</tbody>
    </table></div>}
  </div>;
}
