import { useEffect, useRef, useState } from 'react';
import { Download, LockKeyhole, Trash2 } from 'lucide-react';
import { resultFilename } from './result-utils';
import { eventStages } from './stage-utils';

function saveEventCSV(event) {
  const stages = eventStages(event);
  const time = ms => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(Math.floor(ms / 10) % 100).padStart(2, '0')}`;
  const rows = [['イベント', '種別', '日時', 'カーナンバー', '車両名', 'タイム', 'SS'],
    ...event.entries.map(car => [event.name, 'エントリー', '', car.carNumber, car.vehicleName, '', '']),
    ...event.results.map(run => [event.name, 'リザルト', new Date(run.timestamp).toLocaleString('ja-JP'), run.carNumber, run.vehicleName, time(run.timeMs), stages.find(stage => stage.id === (run.stageId || stages[0]?.id))?.name || 'SS1'])];
  const csv = '\uFEFF' + rows.map(row => row.map(value => {
    let text = String(value);
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = resultFilename(event);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AdminMode({ socket, connected, events, supported }) {
  const [expiresAt, setExpiresAt] = useState(0);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [listing, setListing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const alive = useRef(true);
  const unlocked = expiresAt > 0 && connected;

  useEffect(() => {
    alive.current = true;
    const lock = () => { setExpiresAt(0); setPassword(''); setListing(null); };
    socket?.on('disconnect', lock);
    return () => { alive.current = false; socket?.off('disconnect', lock); if (socket?.connected) socket.emit('adminLock'); };
  }, [socket]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => { setExpiresAt(0); setListing(null); setError('管理者認証の有効期限が切れました。再確認してください。'); socket?.emit('adminLock'); }, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt, socket]);
  useEffect(() => {
    if (!unlocked) return;
    let cancelled = false;
    socket.timeout(20000).emitWithAck('adminListEvents', {}).then(response => {
      if (cancelled) return;
      if (!response.ok) { setError(response.message); setListing(null); if (response.code === 'ADMIN_REQUIRED') setExpiresAt(0); }
      else setListing({ events: response.events, source: events, refresh });
    }).catch(() => { if (!cancelled) { setListing(null); setError('一覧を取得できません。再読み込みしてください。'); } });
    return () => { cancelled = true; };
  }, [unlocked, socket, events, refresh]);

  const request = async (operation, data) => {
    if (busy || !socket?.connected) return null;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await socket.timeout(20000).emitWithAck(operation, data);
      if (!alive.current) return null;
      if (!response.ok) {
        if (response.code === 'ADMIN_REQUIRED') setExpiresAt(0);
        throw new Error(response.message || '操作を完了できませんでした。');
      }
      return response;
    } catch (failure) {
      if (alive.current) setError(failure.message === 'operation has timed out' ? '応答を確認できません。最新の一覧を再読み込みしてください。' : failure.message);
      return null;
    } finally { if (alive.current) setBusy(false); }
  };
  const unlock = async e => {
    e.preventDefault();
    const supplied = password;
    setPassword('');
    const response = await request('adminUnlock', supplied);
    if (response) setExpiresAt(response.expiresAt);
  };
  const exportEvent = async event => {
    if (!window.confirm(`「${event.name}」のエントリーとリザルトをCSV保存しますか？`)) return;
    const response = await request('adminExportEvent', { eventId: event.id, confirmed: true });
    if (response) { saveEventCSV(response.event); setNotice('CSVを保存しました。'); }
  };
  const remove = async (targets, all = false) => {
    const label = all ? `すべてのイベント（${targets.length}件）` : `「${targets[0].name}」`;
    if (!window.confirm(`${label}をサーバーから完全に削除しますか？ エントリー・出走順・リザルトも削除され、元に戻せません。開催中のイベントも対象です。`)) return;
    const response = await request('adminDeleteEvents', { eventIds: targets.map(event => event.id), all, confirmed: true });
    if (response) { setListing(null); setRefresh(value => value + 1); setNotice('削除しました。'); }
  };
  const currentList = listing?.source === events && listing.refresh === refresh ? listing.events : null;
  return <section className="panel admin-panel">
    <div className="panel-heading"><div><span className="eyebrow">ADMINISTRATOR</span><h2>イベント記録の管理</h2></div><LockKeyhole size={22} /></div>
    <div className="admin-body">
      {!supported && <p role="status">この機能にはサーバーの更新が必要です。</p>}
      {error && <p className="login-error" role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!unlocked ? <form className="admin-login" onSubmit={unlock}>
        <p>ログイン用パスワードをもう一度入力してください。</p>
        <label htmlFor="admin-password">管理者パスワード確認</label>
        <input id="admin-password" type="password" autoComplete="current-password" required maxLength={512} value={password} onChange={e => setPassword(e.target.value)} disabled={!supported || busy || !connected} />
        <button className="button primary-button" disabled={!supported || busy || !connected || !password}>管理者モードに入る</button>
      </form> : <>
        <p className="form-hint">再認証は15分間有効です。画面を離れるか接続が切れると、再度パスワード確認が必要です。CSVにはエントリーとリザルトを保存します。</p>
        <div className="toolbar"><button className="button secondary-button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>一覧を再読み込み</button><button className="button text-danger" disabled={busy || !currentList?.length || currentList.some(event => event.runningCount)} onClick={() => remove(currentList, true)}><Trash2 size={18} />全イベントを削除</button></div>
        {!currentList ? <p role="status">イベント一覧を読み込み中…</p> : !currentList.length ? <p>保存済みイベントはありません。</p> : <ul className="admin-events">{currentList.map(event => <li key={event.id}>
          <div><strong>{event.name}</strong><p>{new Date(event.startedAt).toLocaleString('ja-JP')} · {event.status === 'active' ? '開催中' : '終了'} · エントリー {event.entryCount}台 / リザルト {event.resultCount}件{event.runningCount > 0 && ' · 走行中のため削除不可'}</p></div>
          <div className="toolbar"><button className="button secondary-button" disabled={busy} onClick={() => exportEvent(event)} aria-label={`${event.name}をCSV保存`}><Download size={17} />CSV保存</button><button className="button text-danger" disabled={busy || event.runningCount > 0} onClick={() => remove([event])} aria-label={`${event.name}を削除`}><Trash2 size={17} />削除</button></div>
        </li>)}</ul>}
      </>}
    </div>
  </section>;
}
