import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Save, 
  Download, 
  Users, 
  Car, 
  Clock, 
  ClipboardList,
  Monitor,
  Smartphone,
  MonitorSmartphone,
  LayoutDashboard
} from 'lucide-react';

// Socket.io サーバーへの接続URL
const SOCKET_SERVER_URL = 'https://timer-server-qf32.onrender.com/';
let socket;

// 時間フォーマット関数 (ミリ秒 -> MM:SS.ms)
const formatTime = (ms) => {
  if (ms < 0) ms = 0;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const hundredths = Math.floor((ms % 1000) / 10);
  
  const pad = (num, size = 2) => num.toString().padStart(size, '0');
  
  return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
};

// リアルタイムタイマー表示コンポーネント
const LiveTimerDisplay = ({ isRunning, startTime, offset }) => {
  const timeRef = useRef(null);

useEffect(() => {
    socket = io(SOCKET_SERVER_URL);

    // ★ 接続成功ログ
    socket.on('connect', () => {
      console.log('✅ Socket.io サーバーに接続成功！ ID:', socket.id);
    });

    // ★ 接続エラーログ
    socket.on('connect_error', (err) => {
      console.error('❌ Socket.io 接続エラー:', err.message);
    });

    // ★ 初期データ受領ログ
    socket.on('init', (data) => {
      console.log('📦 初期データ受信:', data);
      if (data.timersState) setTimersState(data.timersState);
      if (data.entries) setEntries(data.entries);
      if (data.results) setResults(data.results);
    });

    socket.on('timersUpdated', (updatedTimers) => {
      setTimersState(updatedTimers);
    });

    socket.on('entriesUpdated', (updatedEntries) => {
      console.log('📋 エントリーリストが更新されました:', updatedEntries);
      setEntries(updatedEntries);
    });

    socket.on('resultsUpdated', (updatedResults) => {
      setResults(updatedResults);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="font-mono text-5xl md:text-6xl font-bold tracking-wider text-slate-800" ref={timeRef}>
      00:00.00
    </div>
  );
};

export default function App() {
  const [role, setRole] = useState(null); // 'viewer', 'A', 'B'
  const [layoutMode, setLayoutMode] = useState('auto'); // 'auto', 'mobile', 'pc'
  
  // データステート
  const [timersState, setTimersState] = useState({
    A: { isRunning: false, startTime: 0, offset: 0, carId: '' },
    B: { isRunning: false, startTime: 0, offset: 0, carId: '' }
  });
  const [entries, setEntries] = useState([]);
  const [results, setResults] = useState([]);

  // フォームステート
  const [newCarNumber, setNewCarNumber] = useState('');
  const [newVehicleName, setNewVehicleName] = useState('');

  // Socket.io 接続およびイベントリスナーの設定
  useEffect(() => {
    socket = io(SOCKET_SERVER_URL);

    // 初期状態の受領
    socket.on('init', (data) => {
      if (data.timersState) setTimersState(data.timersState);
      if (data.entries) setEntries(data.entries);
      if (data.results) setResults(data.results);
    });

    // 各状態の更新イベント受信
    socket.on('timersUpdated', (updatedTimers) => {
      setTimersState(updatedTimers);
    });

    socket.on('entriesUpdated', (updatedEntries) => {
      setEntries(updatedEntries);
    });

    socket.on('resultsUpdated', (updatedResults) => {
      setResults(updatedResults);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 操作アクション (Socket.io エミット)
  const updateTimerState = (timerId, updates) => {
    socket.emit('updateTimer', { timerId, updates });
  };

  const handleStart = (timerId) => {
    const currentState = timersState[timerId];
    if (currentState.isRunning || !currentState.carId) return;
    
    updateTimerState(timerId, {
      ...currentState,
      isRunning: true,
      startTime: Date.now()
    });
  };

  const handleStop = (timerId) => {
    const currentState = timersState[timerId];
    if (!currentState.isRunning) return;
    
    const elapsed = Date.now() - currentState.startTime;
    updateTimerState(timerId, {
      ...currentState,
      isRunning: false,
      offset: currentState.offset + elapsed
    });
  };

  const handleReset = (timerId) => {
    const currentState = timersState[timerId];
    updateTimerState(timerId, {
      ...currentState,
      isRunning: false,
      startTime: 0,
      offset: 0
    });
  };

  const handleCarSelect = (timerId, carId) => {
    const currentState = timersState[timerId];
    updateTimerState(timerId, {
      ...currentState,
      carId: carId
    });
  };

  const handleAddEntry = (e) => {
    e.preventDefault();
    if (!newCarNumber.trim() || !newVehicleName.trim()) return;
    
    socket.emit('addEntry', {
      carNumber: newCarNumber.trim(),
      vehicleName: newVehicleName.trim()
    });

    setNewCarNumber('');
    setNewVehicleName('');
  };

  const handleDeleteEntry = (entryId) => {
    socket.emit('deleteEntry', entryId);
  };

  const handleRecordTime = (timerId) => {
    const currentState = timersState[timerId];
    if (currentState.isRunning || currentState.offset === 0 || !currentState.carId) return;

    const car = entries.find(e => e.id === currentState.carId);
    if (!car) return;

    socket.emit('recordTime', {
      carNumber: car.carNumber,
      vehicleName: car.vehicleName,
      timeMs: currentState.offset,
      measurer: `計測者${timerId}`
    });

    // 記録後に自動リセット
    handleReset(timerId);
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = ['日時', '計測者', 'カーナンバー', '車両名', 'タイム'];
    const rows = results.map(r => [
      new Date(r.timestamp).toLocaleString(),
      r.measurer,
      r.carNumber,
      r.vehicleName,
      formatTime(r.timeMs)
    ]);
    
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `計測結果_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-8">
          <div>
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">オンラインタイム計測</h1>
            <p className="text-slate-500 mt-2">役割を選択して参加してください</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => setRole('viewer')}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Users size={18} /> 閲覧者として参加
            </button>
            <button 
              onClick={() => setRole('A')}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              <Play size={18} /> 計測者Aとして参加
            </button>
            <button 
              onClick={() => setRole('B')}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
            >
              <Play size={18} /> 計測者Bとして参加
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="bg-white shadow-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-600 w-6 h-6" />
          <h1 className="font-bold text-lg text-slate-800 hidden sm:block">オンラインタイム計測</h1>
        </div>
        
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setLayoutMode('auto')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition ${layoutMode === 'auto' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              title="自動レイアウト (Auto)"
            >
              <MonitorSmartphone size={16} /> <span className="hidden md:inline">Auto</span>
            </button>
            <button 
              onClick={() => setLayoutMode('mobile')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition ${layoutMode === 'mobile' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              title="スマホ用レイアウト (Mobile)"
            >
              <Smartphone size={16} /> <span className="hidden md:inline">Mobile</span>
            </button>
            <button 
              onClick={() => setLayoutMode('pc')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition ${layoutMode === 'pc' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              title="PC用レイアウト (PC)"
            >
              <Monitor size={16} /> <span className="hidden md:inline">PC</span>
            </button>
          </div>

          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-6">
            <div className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users size={14} />
              {role === 'viewer' ? '閲覧者' : `計測者 ${role}`}
            </div>
            <button onClick={() => setRole(null)} className="text-sm text-slate-500 hover:text-slate-800 transition underline underline-offset-2">
              変更
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  const renderTimerCard = (timerId) => {
    const isMyTimer = role === timerId;
    const canControl = isMyTimer;
    const state = timersState[timerId] || { isRunning: false, startTime: 0, offset: 0, carId: '' };
    const selectedCar = entries.find(e => e.id === state.carId);

    const themeColorClass = timerId === 'A' ? 'blue' : 'emerald';
    const isRunningBg = state.isRunning ? (timerId === 'A' ? 'bg-blue-50 border-blue-400' : 'bg-emerald-50 border-emerald-400') : 'bg-slate-50 border-slate-200';
    const isRunningText = state.isRunning ? (timerId === 'A' ? 'text-blue-700' : 'text-emerald-700') : 'text-slate-700';
    const isRunningIcon = state.isRunning ? (timerId === 'A' ? 'text-blue-500' : 'text-emerald-500') : 'text-slate-400';

    return (
      <div className={`bg-white rounded-2xl shadow-sm border ${isMyTimer ? `border-${themeColorClass}-300 ring-2 ring-${themeColorClass}-50` : 'border-slate-200'} overflow-hidden flex flex-col min-w-[320px]`}>
        <div className={`px-4 py-3 border-b text-white flex justify-between items-center ${timerId === 'A' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
          <h2 className="font-bold flex items-center gap-2">
            <Clock size={18} /> 計測器 {timerId}
          </h2>
          {isMyTimer && <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium tracking-wide">あなたの担当</span>}
        </div>

        <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-6">
          <div className="w-full space-y-3 min-h-[140px] flex flex-col justify-center">
            {canControl && !state.isRunning && state.offset === 0 && (
              <select 
                value={state.carId || ''} 
                onChange={(e) => handleCarSelect(timerId, e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-slate-700 font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition shadow-sm"
              >
                <option value="">-- エントリーを選択 --</option>
                {entries.map(e => (
                  <option key={e.id} value={e.id}>No.{e.carNumber} - {e.vehicleName}</option>
                ))}
              </select>
            )}
            
            <div className={`w-full rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-300 border-2 ${isRunningBg} shadow-inner flex-1`}>
              {selectedCar ? (
                <>
                  <div className="flex items-center gap-3">
                    <Car size={32} className={isRunningIcon} />
                    <span className={`text-4xl md:text-5xl font-black tracking-tight ${isRunningText}`}>
                      No.{selectedCar.carNumber}
                    </span>
                  </div>
                  <span className={`mt-2 text-lg font-bold truncate max-w-full px-4 py-1 rounded-full ${
                    state.isRunning ? (timerId === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800') : 'bg-slate-200 text-slate-600'
                  }`}>
                    {selectedCar.vehicleName}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-400 py-4">
                  <Car size={32} className="mb-2 opacity-50" />
                  <span className="font-bold text-lg">車両未選択</span>
                  <span className="text-sm mt-1 text-center">計測前にエントリーを選択してください</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 w-full py-8 rounded-xl flex justify-center items-center shadow-inner border border-slate-100">
            <LiveTimerDisplay 
              isRunning={state.isRunning} 
              startTime={state.startTime} 
              offset={state.offset} 
            />
          </div>

          {canControl && (
            <div className="w-full grid grid-cols-2 gap-3">
              {!state.isRunning ? (
                <button 
                  onClick={() => handleStart(timerId)}
                  disabled={!state.carId}
                  className={`col-span-2 py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all
                    ${!state.carId ? 'bg-slate-300 cursor-not-allowed' : timerId === 'A' ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-200' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-200'}`}
                >
                  <Play size={20} /> スタート
                </button>
              ) : (
                <button 
                  onClick={() => handleStop(timerId)}
                  className="col-span-2 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-rose-200"
                >
                  <Square size={20} /> ストップ
                </button>
              )}
              
              <button 
                onClick={() => handleReset(timerId)}
                disabled={state.isRunning || state.offset === 0}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium flex items-center justify-center gap-2 transition"
              >
                <RotateCcw size={18} /> リセット
              </button>

              <button 
                onClick={() => handleRecordTime(timerId)}
                disabled={state.isRunning || state.offset === 0 || !state.carId}
                className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium flex items-center justify-center gap-2 transition shadow-sm shadow-indigo-200"
              >
                <Save size={18} /> 記録
              </button>
            </div>
          )}
          {!canControl && (
             <div className="w-full py-4 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
               操作権限がありません
             </div>
          )}
        </div>
      </div>
    );
  };

  const getTimerSectionClass = () => {
    if (layoutMode === 'mobile') return 'flex flex-col gap-6';
    if (layoutMode === 'pc') return 'grid grid-cols-2 gap-6 min-w-[700px]';
    return 'grid grid-cols-1 md:grid-cols-2 gap-6';
  };

  const getBottomSectionClass = () => {
    if (layoutMode === 'mobile') return 'flex flex-col gap-6';
    if (layoutMode === 'pc') return 'grid grid-cols-3 gap-6 min-w-[1000px]';
    return 'grid grid-cols-1 lg:grid-cols-3 gap-6';
  };

  const getBottomEntryClass = () => {
    if (layoutMode === 'mobile') return 'w-full';
    if (layoutMode === 'pc') return 'col-span-1';
    return 'lg:col-span-1';
  };

  const getBottomResultClass = () => {
    if (layoutMode === 'mobile') return 'w-full';
    if (layoutMode === 'pc') return 'col-span-2';
    return 'lg:col-span-2';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {renderHeader()}

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {layoutMode !== 'auto' && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2 justify-center">
            <LayoutDashboard size={16} />
            {layoutMode === 'mobile' ? 'スマホ用レイアウト (縦並び) に固定中' : 'PC用レイアウト (横並び) に固定中'}。必要に応じて横スクロールしてください。
          </div>
        )}

        <div className={layoutMode === 'pc' ? 'overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0' : ''}>
          <section className={getTimerSectionClass()}>
            {renderTimerCard('A')}
            {renderTimerCard('B')}
          </section>
        </div>

        <div className={layoutMode === 'pc' ? 'overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0' : ''}>
          <div className={getBottomSectionClass()}>
            <section className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px] ${getBottomEntryClass()}`}>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50 shrink-0">
                <ClipboardList size={18} className="text-slate-500" />
                <h2 className="font-bold text-slate-700">エントリーリスト</h2>
                <span className="ml-auto bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{entries.length}</span>
              </div>
              
              {role !== 'viewer' && (
                <form onSubmit={handleAddEntry} className="p-4 border-b border-slate-100 bg-white shrink-0">
                  <div className="space-y-3">
                    <div>
                      <input 
                        type="text" 
                        placeholder="カーナンバー (例: 101)" 
                        value={newCarNumber}
                        onChange={e => setNewCarNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 transition"
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        placeholder="車両名・チーム名" 
                        value={newVehicleName}
                        onChange={e => setNewVehicleName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400 transition"
                      />
                    </div>
                    <button type="submit" disabled={!newCarNumber.trim() || !newVehicleName.trim()} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition">
                      追加する
                    </button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">エントリーがありません</div>
                ) : (
                  entries.map(entry => (
                    <div key={entry.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="bg-slate-100 font-bold text-slate-600 w-10 h-10 flex items-center justify-center rounded-lg shrink-0">
                          {entry.carNumber}
                        </div>
                        <div className="truncate text-sm font-medium text-slate-700" title={entry.vehicleName}>
                          {entry.vehicleName}
                        </div>
                      </div>
                      {role !== 'viewer' && (
                        <button 
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-slate-300 hover:text-red-500 transition lg:opacity-0 lg:group-hover:opacity-100 p-2 shrink-0"
                          title="削除"
                        >
                           &times;
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px] ${getBottomResultClass()}`}>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                  <Save size={18} className="text-slate-500" />
                  <h2 className="font-bold text-slate-700">計測結果ログ</h2>
                </div>
                <button 
                  onClick={handleExportCSV}
                  disabled={results.length === 0}
                  className="flex items-center gap-2 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium border border-indigo-100"
                >
                  <Download size={16} />
                  CSV出力
                </button>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-white sticky top-0 shadow-sm border-b border-slate-200 z-10">
                    <tr>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 w-24 sm:w-32">時刻</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 w-20 sm:w-24">カーNo</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500">車両名</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 w-24 sm:w-32 text-right">タイム</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 w-20 sm:w-24">担当</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                          まだ記録されたタイムはありません
                        </td>
                      </tr>
                    ) : (
                      results.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                            {r.carNumber}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600 truncate max-w-[150px] sm:max-w-[200px]" title={r.vehicleName}>
                            {r.vehicleName}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-base sm:text-lg text-slate-800 whitespace-nowrap">
                            {formatTime(r.timeMs)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              r.measurer === '計測者A' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {r.measurer}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}