import { useState } from 'react';
import { RallyControl } from './RallyControl';

function StageEditor({ stage, stages, entries, send, disabled }) {
  const [name, setName] = useState(stage.name);
  const [method, setMethod] = useState(stage.orderSource?.mode || 'manual');
  const [sourceId, setSourceId] = useState(stage.orderSource?.sourceStageId || stages[0]?.id || '');
  const [direction, setDirection] = useState(stage.orderSource?.direction || 'asc');
  const stageSend = (operation, data) => send(operation, { ...data, stageId: stage.id });
  return <div className="stage-editor">
    <form onSubmit={async e => { e.preventDefault(); await stageSend('renameStage', { name: name.trim() }); }} className="stage-name-form">
      <label htmlFor="stage-name">SS名</label><input id="stage-name" value={name} onChange={e => setName(e.target.value)} maxLength={100} disabled={disabled} required /><button className="button secondary-button" disabled={disabled || !name.trim() || name.trim() === stage.name}>名前を保存</button>
    </form>
    <div className="stage-order-settings">
      <label>出走順の作成方法<select value={method} onChange={e => setMethod(e.target.value)} disabled={disabled}><option value="number">エントリー番号順</option><option value="ss">指定したSSのタイム順</option><option value="manual">任意</option></select></label>
      {method === 'ss' && <><label>基準にするSS<select value={sourceId} onChange={e => setSourceId(e.target.value)} disabled={disabled}>{stages.map((ss, index) => <option value={ss.id} key={ss.id}>SS{index + 1} · {ss.name}</option>)}</select></label><label>タイムの並び<select value={direction} onChange={e => setDirection(e.target.value)} disabled={disabled}><option value="asc">速い順</option><option value="desc">遅い順</option></select></label></>}
      {method !== 'manual' ? <button className="button primary-button" disabled={disabled || !entries.length} onClick={() => {
        if (window.confirm(`「${stage.name}」の待機・スキップ済み出走順を作り直しますか？ 出走済みの車両は保持し、それ以外の全エントリーから作成します。`)) stageSend('buildRunOrder', { mode: method, sourceStageId: sourceId, direction, orderRevision: stage.orderRevision });
      }}>出走順を作成・再作成</button> : <p className="form-hint">下のランオーダーへ車両を追加し、上下ボタンで任意の順番に並べてください。</p>}
      <p className="form-hint">指定SSの各車両のベストを使用します。未計測車両は末尾に番号順で並びます。登録した出走順は自動更新されません。</p>
      {stage.orderSource && <p className="form-hint">最後の作成：{stage.orderSource.mode === 'number' ? '番号順' : `${stages.find(ss => ss.id === stage.orderSource.sourceStageId)?.name || '指定SS'}・${stage.orderSource.direction === 'desc' ? '遅い順' : '速い順'}`}（{new Date(stage.orderSource.generatedAt).toLocaleString('ja-JP')}）</p>}
    </div>
    <RallyControl entries={entries} order={stage.runOrder || []} revision={stage.orderRevision || 0} send={stageSend} disabled={disabled} />
  </div>;
}

export function StageManagement({ stages, entries, send, disabled, supported }) {
  const [newName, setNewName] = useState('');
  const [selected, setSelected] = useState('');
  const stage = stages.find(ss => ss.id === selected) || stages[0];
  return <section className="panel stage-management">
    <div className="panel-heading"><div><span className="eyebrow">SPECIAL STAGES</span><h2>SS・出走順の事前登録</h2></div></div>
    <div className="stage-management-body">
      {!supported ? <p>複数SS機能にはサーバーの更新が必要です。</p> : <>
        <form className="stage-name-form" onSubmit={async e => { e.preventDefault(); if (await send('addStage', { name: newName.trim() })) setNewName(''); }}><label htmlFor="new-stage-name">新しいSS名</label><input id="new-stage-name" value={newName} onChange={e => setNewName(e.target.value)} maxLength={100} placeholder="例：午後の林道" required disabled={disabled} /><button className="button primary-button" disabled={disabled || !newName.trim()}>SSを追加</button></form>
        {stage && <><label htmlFor="manage-stage">設定するSS</label><select id="manage-stage" value={stage.id} onChange={e => setSelected(e.target.value)}>{stages.map((ss, index) => <option value={ss.id} key={ss.id}>SS{index + 1} · {ss.name}</option>)}</select><StageEditor key={`${stage.id}:${stage.name}`} stage={stage} stages={stages} entries={entries} send={send} disabled={disabled} /></>}
      </>}
    </div>
  </section>;
}
