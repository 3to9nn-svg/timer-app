import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, SkipForward, Trash2 } from 'lucide-react';

export function RallyControl({ entries, order, revision, send, disabled }) {
  const [carId, setCarId] = useState('');
  const pending = order.filter(item => item.status === 'pending');
  const skipped = order.filter(item => item.status === 'skipped');
  const edit = (item, action) => send('editRunOrder', { itemId: item.id, action, orderRevision: revision });
  return <section className="panel rally-order">
    <div className="panel-heading"><div><span className="eyebrow">RALLY RUN ORDER</span><h2>ランオーダー <span className="count">待機 {pending.length}台</span></h2></div></div>
    <div className="rally-order-body">
      <p className="form-hint">上から順番にスタートします。スキップした車両は末尾に戻せます。同じ車両を複数回登録することもできます。</p>
      <form className="order-add" onSubmit={async e => { e.preventDefault(); if (carId && await send('appendRunOrder', { carIds: [carId], orderRevision: revision })) setCarId(''); }}>
        <label htmlFor="order-car">出走順に追加する車両</label><div><select id="order-car" value={entries.some(car => car.id === carId) ? carId : ''} onChange={e => setCarId(e.target.value)} disabled={disabled}><option value="">車両を選択</option>{entries.map(car => <option key={car.id} value={car.id}>#{car.carNumber} — {car.vehicleName}</option>)}</select><button className="button secondary-button" disabled={disabled || !entries.some(car => car.id === carId)}><Plus size={17} />追加</button></div>
      </form>
      <button className="button secondary-button" disabled={disabled || !entries.length || entries.length > 500} onClick={() => { if (window.confirm('全エントリーをカーナンバー順で出走順の末尾に追加しますか？')) send('appendRunOrder', { carIds: entries.map(car => car.id), orderRevision: revision }); }}>全車両を番号順で追加</button>
      {!pending.length && <p>出走待ちの車両はありません。</p>}
      <ol className="order-list">{pending.map((item, index) => <li key={item.id}><span className="order-position">{index + 1}</span><div className="order-car"><strong>#{item.carNumber} {item.vehicleName}</strong>{index === 0 && <small>次のスタート</small>}</div><div className="toolbar">
        <button className="button secondary-button icon-button" disabled={disabled || index === 0} onClick={() => edit(item, 'up')} aria-label={`出走順${index + 1}を上へ`}><ArrowUp size={18} /></button><button className="button secondary-button icon-button" disabled={disabled || index === pending.length - 1} onClick={() => edit(item, 'down')} aria-label={`出走順${index + 1}を下へ`}><ArrowDown size={18} /></button><button className="button secondary-button" disabled={disabled} onClick={() => edit(item, 'skip')} aria-label={`出走順${index + 1}をスキップ`}><SkipForward size={17} />スキップ</button><button className="button text-danger icon-button" disabled={disabled} onClick={() => { if (window.confirm(`#${item.carNumber} を出走順から外しますか？`)) edit(item, 'remove'); }} aria-label={`出走順${index + 1}を削除`}><Trash2 size={17} /></button>
      </div></li>)}</ol>
      <details><summary>スキップ済み（{skipped.length}台）・スタート済み（{order.filter(item => item.status === 'started').length}台）</summary><ul className="order-list">{skipped.map(item => <li key={item.id}><strong className="order-car">#{item.carNumber} {item.vehicleName}</strong><button className="button secondary-button" disabled={disabled} onClick={() => edit(item, 'restore')}>末尾に戻す</button></li>)}</ul><p className="form-hint">スタート済み車両を再出走させる場合は、出走順へもう一度追加してください。</p></details>
    </div>
  </section>;
}
