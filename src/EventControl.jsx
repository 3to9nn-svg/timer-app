import { CalendarDays, Flag, Plus } from 'lucide-react';

export function EventControl({ event, name, onNameChange, onStart, onEnd, connected, pending, runningCount }) {
  return (
    <section className="panel event-control" aria-labelledby="event-control-heading">
      <div className="panel-heading">
        <div><span className="eyebrow orange-text">EVENT CONTROL</span><h2 id="event-control-heading">イベントの開始・終了</h2></div>
        <CalendarDays size={24} className="orange-text" />
      </div>
      <div className="event-control-body">
        {event?.status === 'active' ? <>
          <div className="event-control-description"><strong>{event.name}</strong><p>エントリー・走行中の計測・リザルトは自動保存されます。終了後も記録を確認できます。</p></div>
          <button className="button secondary-button" onClick={onEnd} disabled={!connected || pending || runningCount > 0}><Flag size={19} />{pending ? '保存しています…' : 'イベントを終了'}</button>
          {runningCount > 0 && <p className="form-hint">走行中の{runningCount}台をフィニッシュまたは計測取消してから終了してください。</p>}
        </> : <form className="event-start-form" onSubmit={onStart}>
          <label htmlFor="event-name">イベント名</label>
          <div className="event-start-fields"><input id="event-name" value={name} onChange={e => onNameChange(e.target.value)} maxLength={100} placeholder="例：秋の走行会" required disabled={!connected || pending} /><button className="button primary-button" disabled={!connected || pending || !name.trim()}><Plus size={20} />{pending ? '保存しています…' : 'イベントを開始'}</button></div>
          <p className="form-hint">{event ? '前のイベントの記録を残したまま、新しいイベントを開始します。' : 'イベントを開始してから、車両を登録してください。'}</p>
        </form>}
      </div>
    </section>
  );
}
