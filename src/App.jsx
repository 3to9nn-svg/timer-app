import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ArrowDownUp, ArrowRight, Check, ChevronRight, Download, Eye, EyeOff, Flag, LayoutGrid, LockKeyhole, LogOut, Plus, Radio, Timer, Trash2, Trophy, Users, X } from 'lucide-react';
import './App.css';

const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'https://timer-server-qf32.onrender.com/';
const SESSION_KEY = 'rally-timing-session';
function readSession() {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
function storeSession(token) {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* Private browsing may disable storage; this tab can still log in. */ }
}
const MODES = [
  { id: 'A', tag: 'MARSHAL A', title: 'スタート計測', short: 'スタート', english: 'START LINE', description: '車両を選んで、ステージへ送り出す。', icon: Timer, tone: 'orange' },
  { id: 'B', tag: 'MARSHAL B', title: 'フィニッシュ計測', short: 'フィニッシュ', english: 'FINISH LINE', description: 'ゴールの瞬間を、ワンタップで記録。', icon: Flag, tone: 'green' },
  { id: 'viewer', tag: 'SPECTATOR', title: 'リザルトを見る', short: 'リザルト', english: 'LIVE RESULTS', description: '走行状況とタイムをリアルタイムに。', icon: Trophy, tone: 'white' },
  { id: 'entry', tag: 'ORGANIZER', title: 'エントリー管理', short: 'エントリー', english: 'ENTRY LIST', description: '参加する車両・チームを登録する。', icon: Users, tone: 'muted' },
];

function formatTime(ms) {
  const safeMs = Math.max(0, ms);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(Math.floor(safeMs / 60000))}:${pad(Math.floor(safeMs / 1000) % 60)}.${pad(Math.floor(safeMs / 10) % 100)}`;
}

function LiveTimer({ startTime }) {
  const ref = useRef(null);
  useEffect(() => {
    let frame;
    const update = () => {
      if (ref.current) ref.current.textContent = formatTime(Date.now() - startTime);
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [startTime]);
  return <span className="live-time" ref={ref}>00:00.00</span>;
}

function EmptyState({ icon: Icon, title, description }) {
  return <div className="empty-state"><Icon size={28} strokeWidth={1.4} /><strong>{title}</strong><p>{description}</p></div>;
}

function StageGraphic() {
  return (
    <div className="stage-graphic" aria-hidden="true">
      <div className="graphic-heading"><span><i className="status-dot" /> STAGE TELEMETRY</span><span>R / T</span></div>
      <svg viewBox="0 0 520 260" fill="none">
        <g className="contours" stroke="currentColor">
          <path d="M-40 180C80 90 40 5 200 20S300 170 540 30M-40 202C90 100 60 25 200 40S315 200 550 52M-40 224C100 125 90 50 210 65S320 225 550 78M-30 250C105 145 105 75 212 90S350 245 560 108M-30 276C110 175 125 105 218 118S360 260 555 140M-20 298C130 210 138 132 225 143S350 290 550 178" />
          <path d="M100-30C140 5 235-10 300 40S350 100 530-20M135-35C180-5 240-30 320 22S370 70 540-40M150 275C195 185 240 180 285 215S360 260 430 280" />
        </g>
        <path d="M72 199L117 173Q127 167 125 153L122 140Q120 129 135 125L204 108Q218 106 227 116L252 145Q263 158 278 149L309 129Q321 120 311 109L294 92Q285 80 301 74L352 56Q366 51 377 61L416 93L450 75" stroke="#ff692e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="72" cy="199" r="12" fill="#10222d" stroke="#ff692e" strokeWidth="2" /><circle cx="72" cy="199" r="4" fill="#ff692e" />
        <circle cx="450" cy="75" r="12" fill="#10222d" stroke="#e9eeed" strokeWidth="2" /><rect x="446" y="71" width="8" height="8" fill="#e9eeed" />
        <text x="45" y="235">START</text><text x="418" y="46">FINISH</text>
        <path d="M30 30h15m-7.5-7.5v15M480 230h15m-7.5-7.5v15" stroke="#647681" />
      </svg>
      <div className="graphic-footer"><span>EVERY SECOND COUNTS.</span><span className="checkered" /></div>
    </div>
  );
}

export default function App() {
  const [accessState, setAccessState] = useState(() => readSession() ? 'checking' : 'locked');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [role, setRole] = useState(null);
  const [sortOrder, setSortOrder] = useState('time');
  const [entries, setEntries] = useState([]);
  const [activeRuns, setActiveRuns] = useState([]);
  const [results, setResults] = useState([]);
  const [connection, setConnection] = useState('connecting');
  const [selectedCarId, setSelectedCarId] = useState('');
  const [newCarNumber, setNewCarNumber] = useState('');
  const [newVehicleName, setNewVehicleName] = useState('');
  const [notice, setNotice] = useState('');
  const socketRef = useRef(null);
  const accessGrantedRef = useRef(false);
  const connected = connection === 'connected';
  const currentMode = MODES.find((mode) => mode.id === role);

  const lockApp = useCallback((message = '') => {
    accessGrantedRef.current = false;
    if (socketRef.current) {
      socketRef.current.auth = {};
      socketRef.current.disconnect();
    }
    storeSession(null);
    setAccessState('locked');
    setConnection('offline');
    setLoginError(message);
    setPassword('');
    setShowPassword(false);
    setRole(null);
    setEntries([]);
    setActiveRuns([]);
    setResults([]);
    setSelectedCarId('');
    setNewCarNumber('');
    setNewVehicleName('');
    setNotice('');
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL, { autoConnect: false, timeout: 15000 });
    socketRef.current = socket;
    let verified = false;
    socket.on('connect', () => { verified = false; });
    socket.on('authenticated', ({ token }) => {
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return;
      verified = true;
      socket.auth = { token };
      storeSession(token);
    });
    socket.on('init', (data) => {
      if (!verified) {
        lockApp('サーバーのパスワード認証が有効になっていません。管理者に確認してください。');
        return;
      }
      accessGrantedRef.current = true;
      setAccessState('granted');
      setLoginError('');
      setEntries(data.entries || []);
      setActiveRuns(data.activeRuns || []);
      setResults(data.results || []);
      setConnection('connected');
    });
    socket.on('disconnect', (reason) => {
      setConnection('offline');
      if (reason === 'io server disconnect' && accessGrantedRef.current) {
        lockApp('接続が終了しました。パスワードを入力して入り直してください。');
      }
    });
    socket.on('connect_error', (error) => {
      setConnection('offline');
      const code = error.data?.code;
      if (code) {
        const messages = {
          INVALID_PASSWORD: 'パスワードが違います。もう一度入力してください。',
          AUTH_REQUIRED: 'パスワードを入力してください。',
          SESSION_EXPIRED: 'ログインの有効期限が切れました。パスワードを入力してください。',
          RATE_LIMITED: '試行回数が多すぎます。1分ほど待ってからお試しください。',
        };
        lockApp(messages[code] || 'ログインできませんでした。もう一度お試しください。');
      } else if (!accessGrantedRef.current) {
        lockApp('サーバーに接続できません。少し待ってから再度お試しください。');
      }
    });
    socket.on('sessionExpired', () => lockApp('ログインが終了しました。パスワードを入力してください。'));
    socket.on('entriesUpdated', setEntries);
    socket.on('activeRunsUpdated', setActiveRuns);
    socket.on('resultsUpdated', setResults);
    const token = readSession();
    if (token) { socket.auth = { token }; socket.connect(); }
    return () => { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; };
  }, [lockApp]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const login = (event) => {
    event.preventDefault();
    if (!password || accessState === 'checking' || !socketRef.current) return;
    setLoginError('');
    setAccessState('checking');
    setConnection('connecting');
    socketRef.current.auth = { password };
    setPassword('');
    setShowPassword(false);
    socketRef.current.connect();
  };

  const logout = () => {
    if (socketRef.current?.connected) socketRef.current.emit('logout');
    lockApp();
  };

  if (accessState !== 'granted') {
    return (
      <main className="login-page">
        <section className="login-panel" aria-labelledby="login-heading">
          <div className="login-brand"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>RALLY TIMING</span></div>
          <div className="login-icon"><LockKeyhole size={28} /></div>
          <span className="eyebrow orange-text">STAGE ACCESS</span>
          <h1 id="login-heading">パスワードを入力</h1>
          <p className="login-description">共有されたパスワードで<br />計測アプリにログインしてください。</p>
          <form className="login-form" onSubmit={login}>
            <label htmlFor="access-password">パスワード</label>
            <div className="password-field">
              <input id="access-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" autoCapitalize="none" spellCheck={false} maxLength={512} required disabled={accessState === 'checking'} aria-describedby={loginError ? 'login-error' : undefined} aria-invalid={Boolean(loginError)} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
            {loginError && <p className="login-error" id="login-error" role="alert">{loginError}</p>}
            <button className="button primary-button login-submit" disabled={!password || accessState === 'checking'}><LockKeyhole size={19} />{accessState === 'checking' ? '確認しています…' : 'ログイン'}<ArrowRight size={19} /></button>
            <p className="login-hint" role="status">{accessState === 'checking' ? 'サーバーに接続しています。しばらくお待ちください。' : 'ログインはこのタブで最大12時間有効です。'}</p>
          </form>
        </section>
      </main>
    );
  }

  const changeMode = (nextRole) => {
    setRole(nextRole);
    setSelectedCarId('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Never buffer timing actions during a disconnection and replay them later.
  const send = (event, data) => {
    if (!socketRef.current?.connected || !connected) return false;
    socketRef.current.emit(event, data);
    return true;
  };

  const startRun = () => {
    if (!selectedCarId || activeRuns.some((run) => run.carId === selectedCarId)) return;
    if (send('startRun', { carId: selectedCarId })) setSelectedCarId('');
  };

  const addEntry = (event) => {
    event.preventDefault();
    if (!newCarNumber.trim() || !newVehicleName.trim()) return;
    if (send('addEntry', { carNumber: newCarNumber.trim(), vehicleName: newVehicleName.trim() })) {
      setNewCarNumber('');
      setNewVehicleName('');
    }
  };

  const exportCSV = () => {
    if (!results.length) return;
    const rows = [['日時', 'カーナンバー', '車両名', 'タイム'], ...results.map((result) => [
      new Date(result.timestamp).toLocaleString('ja-JP'), result.carNumber, result.vehicleName, formatTime(result.timeMs),
    ])];
    const csv = '\uFEFF' + rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rally_Timing_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('計測結果のCSVを保存しました');
  };

  const sortedResults = [...results].sort((a, b) => role === 'viewer' && sortOrder === 'time' ? a.timeMs - b.timeMs : b.timestamp - a.timestamp);
  const selectedCar = entries.find((entry) => entry.id === selectedCarId);
  const canStart = connected && selectedCar && !activeRuns.some((run) => run.carId === selectedCarId);
  const fastest = results.length ? Math.min(...results.map((result) => result.timeMs)) : null;

  const renderRuns = () => (
    <section className="panel" aria-labelledby="live-heading">
      <div className="panel-heading"><div><span className="eyebrow"><i className="status-dot" /> ON STAGE</span><h2 id="live-heading">走行中の車両 <span className="count">{activeRuns.length}</span></h2></div><Radio size={22} className="subtle-icon" /></div>
      {!activeRuns.length ? <EmptyState icon={Flag} title="スタートを待っています" description={role === 'A' ? '車両を選択して計測を開始してください。' : 'スタートした車両がここに表示されます。'} /> : (
        <div className="run-grid">{activeRuns.map((run) => (
          <article className="run-card" key={run.id}>
            <div className="run-car"><span className="car-number">#{run.carNumber}</span><div><span className="eyebrow">DRIVER / CAR</span><h3>{run.vehicleName}</h3></div><span className="running-label">走行中</span></div>
            <div className="run-clock"><span className="eyebrow">ELAPSED TIME</span><LiveTimer startTime={run.startTime} /></div>
            {role !== 'viewer' && <div className="run-actions">
              {role === 'B' && <button className="button finish-button" disabled={!connected} onClick={() => send('stopRun', run.id)} aria-label={`車両 ${run.carNumber} のフィニッシュを記録`}><Flag size={24} /><span>FINISH <small>ゴールを記録</small></span></button>}
              <button className="button cancel-button" disabled={!connected} onClick={() => { if (window.confirm(`#${run.carNumber} の計測を取り消しますか？ タイムは記録されません。`)) send('cancelRun', run.id); }} aria-label={`車両 ${run.carNumber} の計測を取り消す`}><X size={18} />計測取消</button>
            </div>}
          </article>
        ))}</div>
      )}
    </section>
  );

  const renderResults = () => (
    <section className="panel" aria-labelledby="results-heading">
      <div className="panel-heading results-heading"><div><span className="eyebrow">{role === 'viewer' ? 'STAGE CLASSIFICATION' : 'TIMING LOG'}</span><h2 id="results-heading">{role === 'viewer' ? 'ステージリザルト' : '計測ログ'} <span className="count">{results.length}</span></h2></div><div className="toolbar">
        {role === 'A' && <button className="button text-danger" disabled={!connected || !results.length} onClick={() => { if (window.confirm('計測結果ログをすべて削除します。よろしいですか？')) send('clearResults'); }}><Trash2 size={16} />全件削除</button>}
        <button className="button secondary-button" disabled={!results.length} onClick={exportCSV}><Download size={17} />CSV保存</button>
      </div></div>
      {role === 'viewer' && <div className="results-options"><div className="segmented-control" aria-label="結果の並び順"><button aria-pressed={sortOrder === 'time'} onClick={() => setSortOrder('time')}><Trophy size={16} />タイム順</button><button aria-pressed={sortOrder === 'latest'} onClick={() => setSortOrder('latest')}><ArrowDownUp size={16} />新着順</button></div><span className="eyebrow">TIME / MM:SS.00</span></div>}
      {!results.length ? <EmptyState icon={Trophy} title="まだ計測結果はありません" description="フィニッシュした車両のタイムがここに表示されます。" /> : (
        <ol className={`result-list ${role === 'viewer' && sortOrder === 'time' ? 'ranked-results' : ''}`}>{sortedResults.map((result, index) => (
          <li className={`result-row ${role === 'viewer' && sortOrder === 'time' && index === 0 ? 'leader' : ''}`} key={result.id}>
            {role === 'viewer' && sortOrder === 'time' && <span className="position">{String(index + 1).padStart(2, '0')}</span>}
            <div className="result-car"><span className="result-number">#{result.carNumber}</span><strong>{result.vehicleName}</strong><span className="result-date">{new Date(result.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} フィニッシュ</span></div>
            <div className="result-time"><strong>{formatTime(result.timeMs)}</strong>{role === 'viewer' && sortOrder === 'time' && <span className={index === 0 ? 'best-label' : 'time-gap'}>{index === 0 ? 'BEST TIME' : `+${formatTime(result.timeMs - fastest)}`}</span>}</div>
          </li>
        ))}</ol>
      )}
    </section>
  );

  return (
    <div className={`app ${role ? 'in-mode' : 'home'}`}>
      <header className="site-header"><div className="header-inner">
        <button className="brand" onClick={() => changeMode(null)} aria-label="Rally Timing ホームへ"><span className="brand-mark"><span /><span /><span /></span><span>RALLY<span className="brand-light">TIMING</span><small>PRECISION IN EVERY STAGE</small></span></button>
        <div className={`connection ${connection}`} role="status"><i className="status-dot" /><span>{connected ? 'LIVE 接続中' : connection === 'connecting' ? '接続しています' : '再接続しています'}</span></div>
        {role && <button className="home-button" onClick={() => changeMode(null)} aria-label="モード選択へ"><LayoutGrid size={19} /><span>モード選択</span></button>}
      </div></header>

      <main className="main-content" id="main">
        {connection === 'offline' && <div className="connection-banner" role="status"><Radio size={18} /><span>サーバーへの接続を待っています。接続が戻ると、計測・登録を操作できます。</span></div>}
        {!role ? <>
          <section className="hero"><div className="hero-copy"><span className="eyebrow hero-kicker"><span /> RALLY STAGE TIMING</span><h1>CHASE THE<br /><em>SECONDS.</em></h1><p className="hero-japanese">その一瞬を、記録する。</p><p className="hero-description">スタートからフィニッシュまで。<br />すべてのタイムを、ひとつにつなぐ。</p><div className="hero-bottom"><span className="mini-rule" /> READY FOR THE NEXT STAGE</div></div><StageGraphic /></section>
          <section className="session-stats" aria-label="計測状況"><div><Users size={19} /><span>エントリー<small>ENTRIES</small></span><strong>{String(entries.length).padStart(2, '0')}</strong></div><div><Radio size={19} /><span>走行中<small>ON STAGE</small></span><strong className="orange-text">{String(activeRuns.length).padStart(2, '0')}</strong></div><div><Flag size={19} /><span>計測完了<small>FINISHED</small></span><strong>{String(results.length).padStart(2, '0')}</strong></div></section>
          <section className="mode-section" aria-labelledby="mode-heading"><div className="section-title"><div><span className="eyebrow">YOUR POSITION. YOUR CONTROL.</span><h2 id="mode-heading">担当するモードを選択</h2></div><span className="section-index">01 — 04</span></div><div className="mode-grid">{MODES.map((mode, index) => {
            const Icon = mode.icon;
            return <button key={mode.id} className={`mode-card ${mode.tone}`} onClick={() => changeMode(mode.id)}><div className="mode-card-top"><Icon size={26} strokeWidth={1.6} /><span>0{index + 1}</span></div><span className="mode-tag">{mode.tag}</span><h3>{mode.english}</h3><strong>{mode.title}</strong><p>{mode.description}</p><span className="mode-card-bottom">モードを開く<ArrowRight size={20} /></span></button>;
          })}</div></section>
          <div className="home-note"><Radio size={16} /><span>各端末の計測データをリアルタイムで共有</span><span className="note-rule" /><span className="eyebrow">BUILT FOR THE STAGE.</span></div>
        </> : <>
          <div className="page-heading"><div><span className="eyebrow orange-text">{currentMode.tag} <ChevronRight size={12} /> {currentMode.english}</span><h1>{currentMode.title}</h1><p>{role === 'A' ? '車両を選択し、スタートの瞬間にタップ。' : role === 'B' ? '車両番号を確認し、ゴールの瞬間にタップ。' : role === 'viewer' ? 'ステージの動きを、リアルタイムで。' : '計測する車両を、事前に登録。'}</p></div><span className={`page-icon ${currentMode.tone}`}><currentMode.icon size={30} strokeWidth={1.5} /></span></div>
          {role === 'entry' ? <div className="entry-layout">
            <section className="panel entry-form-panel"><div className="panel-heading"><div><span className="eyebrow">NEW ENTRY</span><h2>車両を登録</h2></div><Plus size={22} className="subtle-icon" /></div><form onSubmit={addEntry} className="entry-form"><label htmlFor="car-number">車両番号 <span>CAR NO.</span></label><input id="car-number" inputMode="numeric" placeholder="例：101" required value={newCarNumber} onChange={(event) => setNewCarNumber(event.target.value)} /><label htmlFor="vehicle-name">車両名・チーム名 <span>DRIVER / CAR</span></label><input id="vehicle-name" placeholder="例：GR YARIS / Rally Team" required value={newVehicleName} onChange={(event) => setNewVehicleName(event.target.value)} /><button className="button primary-button" disabled={!connected || !newCarNumber.trim() || !newVehicleName.trim()}><Plus size={21} />エントリーを追加</button><p className="form-hint">登録した車両は、スタート画面で選択できます。</p></form></section>
            <section className="panel"><div className="panel-heading"><div><span className="eyebrow">REGISTERED CARS</span><h2>エントリーリスト <span className="count">{entries.length}</span></h2></div><Users size={22} className="subtle-icon" /></div>{!entries.length ? <EmptyState icon={Users} title="車両を登録しましょう" description="車両番号と車両名を入力して追加してください。" /> : <ul className="entry-list">{entries.map((entry) => <li key={entry.id}><span className="car-number">#{entry.carNumber}</span><strong>{entry.vehicleName}</strong><button className="button icon-button text-danger" aria-label={`車両 ${entry.carNumber} を削除`} disabled={!connected || activeRuns.some((run) => run.carId === entry.id)} onClick={() => { if (window.confirm(`#${entry.carNumber} のエントリーを削除しますか？`)) send('deleteEntry', entry.id); }}><Trash2 size={19} /></button></li>)}</ul>}</section>
          </div> : <div className="timing-layout">
            {role === 'A' && <section className="panel start-panel"><div className="panel-heading"><div><span className="eyebrow orange-text">START CONTROL</span><h2>次のスタート車両</h2></div><Timer size={23} className="orange-text" /></div><div className="start-controls"><label htmlFor="start-car">車両を選択</label><select id="start-car" value={selectedCarId} onChange={(event) => setSelectedCarId(event.target.value)}><option value="">車両番号・車両名を選択</option>{entries.map((entry) => <option key={entry.id} value={entry.id} disabled={activeRuns.some((run) => run.carId === entry.id)}>#{entry.carNumber} — {entry.vehicleName}{activeRuns.some((run) => run.carId === entry.id) ? '（走行中）' : ''}</option>)}</select><div className="start-preview">{selectedCar ? <><span className="car-number">#{selectedCar.carNumber}</span><strong>{selectedCar.vehicleName}</strong></> : <><Flag size={24} /><span>スタートする車両を選んでください</span></>}</div><button className="button primary-button start-button" onClick={startRun} disabled={!canStart}><Timer size={28} /><span>START<small>計測を開始</small></span><ArrowRight size={23} /></button>{!entries.length && <button className="inline-link" onClick={() => changeMode('entry')}>まずは車両を登録<ArrowRight size={16} /></button>}</div></section>}
            <div className="timing-content">{role === 'viewer' ? <>{renderResults()}{renderRuns()}</> : <>{renderRuns()}{renderResults()}</>}</div>
          </div>}
        </>}
      </main>
      <footer className="site-footer"><span>RALLY TIMING<span className="footer-slash"> /// </span>STAGE CONTROL</span><button className="logout-button" onClick={logout}><LogOut size={16} />ログアウト</button><span>1/100 SEC. DISPLAY</span></footer>
      {role && <nav className="bottom-nav" aria-label="担当モード">{MODES.map((mode) => { const Icon = mode.icon; return <button key={mode.id} aria-current={role === mode.id ? 'page' : undefined} onClick={() => changeMode(mode.id)}><Icon size={21} /><span>{mode.short}</span></button>; })}</nav>}
      {notice && <div className="toast" role="status"><Check size={18} />{notice}</div>}
    </div>
  );
}
