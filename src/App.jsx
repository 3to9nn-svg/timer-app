import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, 
  Square, 
  XCircle, 
  Download, 
  Users, 
  Car, 
  Clock, 
  ClipboardList,
  Flame,
  Save,
  Trash2,
  Trophy,
  ArrowUpDown,
  Plus
} from 'lucide-react';

// RenderのバックエンドURLを設定してください
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

// リアルタイムタイマー
const LiveTimer = ({ startTime }) => {
  const timeRef = useRef(null);

  useEffect(() => {
    let animationFrameId;

    const updateDisplay = () => {
      if (timeRef.current) {
        const currentMs = Date.now() - startTime;
        timeRef.current.textContent = formatTime(currentMs);
      }
      animationFrameId = requestAnimationFrame(updateDisplay);
    };

    animationFrameId = requestAnimationFrame(updateDisplay);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [startTime]);

  return (
    <span className="font-mono text-2xl sm:text-3xl font-black text-blue-600 tracking-tight" ref={timeRef}>
      00:00.00
    </span>
  );
};

export default function App() {
  const [role, setRole] = useState(null); // 'viewer', 'A', 'B'
  const [viewerSortOrder, setViewerSortOrder] = useState('time'); // 'latest' or 'time'
  
  // データステート
  const [entries, setEntries] = useState([]);
  const [activeRuns, setActiveRuns] = useState([]);
  const [results, setResults] = useState([]);

  // フォームステート
  const [selectedCarId, setSelectedCarId] = useState('');
  const [newCarNumber, setNewCarNumber] = useState('');
  const [newVehicleName, setNewVehicleName] = useState('');

  // Socket.io 接続
  useEffect(() => {
    socket = io(SOCKET_SERVER_URL);

    socket.on('init', (data) => {
      if (data.entries) setEntries(data.entries);
      if (data.activeRuns) setActiveRuns(data.activeRuns);
      if (data.results) setResults(data.results);
    });

    socket.on('entriesUpdated', (updatedEntries) => {
      setEntries(updatedEntries);
    });

    socket.on('activeRunsUpdated', (updatedRuns) => {
      setActiveRuns(updatedRuns);
    });

    socket.on('resultsUpdated', (updatedResults) => {
      setResults(updatedResults);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 操作アクション
  const handleStartRun = (carId) => {
    if (!carId) return;
    socket.emit('startRun', { carId });
    setSelectedCarId('');
  };

  const handleStopRun = (runId) => {
    socket.emit('stopRun', runId);
  };

  const handleCancelRun = (runId) => {
    socket.emit('cancelRun', runId);
  };

  const handleClearResults = () => {
    if (window.confirm('計測結果ログをすべて削除します。よろしいですか？')) {
      socket.emit('clearResults');
    }
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

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = ['日時', 'カーナンバー', '車両名', 'タイム'];
    const rows = results.map(r => [
      new Date(r.timestamp).toLocaleString(),
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

  // 閲覧者用：ソート済み結果データ生成
  const getSortedResults = () => {
    const list = [...results];
    if (viewerSortOrder === 'time') {
      return list.sort((a, b) => a.timeMs - b.timeMs);
    }
    return list;
  };

  // 役割選択画面
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 sm:space-y-8">
          <div>
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">オンラインタイム計測</h1>
            <p className="text-slate-500 text-sm mt-1">担当する役割を選択してください</p>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => setRole('viewer')}
              className="w-full py-4 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-2xl font-bold transition flex items-center justify-center gap-2 text-base"
            >
              <Users size={20} /> 閲覧者（結果ログのみ）
            </button>
            <button 
              onClick={() => setRole('A')}
              className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl font-bold transition flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-200"
            >
              <Play size={20} /> 計測者A (スタート担当)
            </button>
            <button 
              onClick={() => setRole('B')}
              className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold transition flex items-center justify-center gap-2 text-base shadow-lg shadow-emerald-200"
            >
              <Square size={20} /> 計測者B (ストップ担当)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 閲覧者（Viewer）画面
  if (role === 'viewer') {
    const sortedResults = getSortedResults();

    return (
      <div className="min-h-screen bg-slate-100 pb-12">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <h1 className="font-bold text-base sm:text-lg text-slate-800 tracking-tight">リザルトボード</h1>
            </div>
            <button 
              onClick={() => setRole(null)} 
              className="text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition"
            >
              役割を変更
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* パネルヘッダー */}
            <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-2">
                  <Save size={18} className="text-slate-500" />
                  <h2 className="font-bold text-slate-700">計測結果</h2>
                </div>
                <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                  {results.length} 件
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                {/* 並び替えスイッチ */}
                <div className="flex items-center bg-slate-200 p-1 rounded-xl text-xs font-bold flex-1 sm:flex-none justify-center">
                  <button 
                    onClick={() => setViewerSortOrder('time')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                      viewerSortOrder === 'time' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600'
                    }`}
                  >
                    <Trophy size={14} /> タイム順
                  </button>
                  <button 
                    onClick={() => setViewerSortOrder('latest')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                      viewerSortOrder === 'latest' ? 'bg-white shadow text-blue-600 font-bold' : 'text-slate-600'
                    }`}
                  >
                    <ArrowUpDown size={14} /> 新着順
                  </button>
                </div>

                <button 
                  onClick={handleExportCSV}
                  disabled={results.length === 0}
                  className="flex items-center gap-1 text-xs sm:text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl transition disabled:opacity-50 font-bold border border-indigo-100 shrink-0"
                >
                  <Download size={15} /> CSV
                </button>
              </div>
            </div>

            {/* モバイル用表示 (カード形式) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {sortedResults.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">記録されたタイムはありません</div>
              ) : (
                sortedResults.map((r, index) => (
                  <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {viewerSortOrder === 'time' && (
                        <div className="w-8 shrink-0 text-center font-black text-sm">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-800 text-base">No.{r.carNumber}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate font-medium mt-0.5">{r.vehicleName}</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-lg text-slate-900 shrink-0">
                      {formatTime(r.timeMs)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* PC/タブレット用表示 (テーブル形式) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {viewerSortOrder === 'time' && <th className="py-3 px-6 text-xs font-semibold text-slate-500 w-16">順位</th>}
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500">時刻</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500">カーNo</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500">車両名</th>
                    <th className="py-3 px-6 text-xs font-semibold text-slate-500 text-right">タイム</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={viewerSortOrder === 'time' ? 5 : 4} className="py-12 text-center text-slate-400 text-sm">
                        まだ記録されたタイムはありません
                      </td>
                    </tr>
                  ) : (
                    sortedResults.map((r, index) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition">
                        {viewerSortOrder === 'time' && (
                          <td className="py-3 px-6 font-bold text-slate-500">
                            {index === 0 ? <span className="text-amber-500 font-black">🥇 1</span> : index === 1 ? <span className="text-slate-400 font-black">🥈 2</span> : index === 2 ? <span className="text-amber-700 font-black">🥉 3</span> : index + 1}
                          </td>
                        )}
                        <td className="py-3 px-6 text-xs text-slate-400">
                          {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                        </td>
                        <td className="py-3 px-6 font-bold text-slate-700">No.{r.carNumber}</td>
                        <td className="py-3 px-6 text-sm text-slate-600">{r.vehicleName}</td>
                        <td className="py-3 px-6 text-right font-mono font-bold text-lg text-slate-800">
                          {formatTime(r.timeMs)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // 計測者 (A/B) 画面
  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <h1 className="font-bold text-base sm:text-lg text-slate-800 tracking-tight">タイム計測</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              role === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {role === 'A' ? '計測者A' : '計測者B'}
            </span>
            <button 
              onClick={() => setRole(null)} 
              className="text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-lg font-medium transition"
            >
              変更
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">

        {/* 【計測者A】スタートコントロールパネル */}
        {role === 'A' && (
          <section className="bg-white rounded-2xl shadow-sm border border-blue-200 p-4 sm:p-6 space-y-3 sm:space-y-4">
            <h2 className="font-bold text-base sm:text-lg text-blue-900 flex items-center gap-2">
              <Play className="text-blue-600" size={18} /> スタート計測パネル
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={selectedCarId} 
                onChange={(e) => setSelectedCarId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-800 font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">-- 発進する車両を選択 --</option>
                {entries.map(e => {
                  const isRunning = activeRuns.some(r => r.carId === e.id);
                  return (
                    <option key={e.id} value={e.id} disabled={isRunning}>
                      No.{e.carNumber} - {e.vehicleName} {isRunning ? ' (走行中)' : ''}
                    </option>
                  );
                })}
              </select>
              <button 
                onClick={() => handleStartRun(selectedCarId)}
                disabled={!selectedCarId}
                className="w-full sm:w-auto px-8 py-3.5 sm:py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 transition shadow-lg shadow-blue-200 shrink-0"
              >
                <Play size={20} /> スタート発進
              </button>
            </div>
          </section>
        )}

        {/* 【計測中・走行中車両一覧】 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-sm sm:text-base text-slate-700 flex items-center gap-2">
              <Flame size={18} className="text-amber-500" /> 現在計測中（走行中）の車両
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {activeRuns.length} 台
            </span>
          </div>

          <div className="p-3 sm:p-6">
            {activeRuns.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">走行中の車両はありません</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {activeRuns.map(run => (
                  <div key={run.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Car size={16} className="text-slate-400 shrink-0" />
                        <span className="font-black text-lg sm:text-xl text-slate-800">No.{run.carNumber}</span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 font-medium truncate mt-0.5">{run.vehicleName}</div>
                      <div className="mt-1">
                        <LiveTimer startTime={run.startTime} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {role === 'B' && (
                        <button 
                          onClick={() => handleStopRun(run.id)}
                          className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shadow-md shadow-emerald-100 transition"
                        >
                          <Square size={16} /> ゴール
                        </button>
                      )}
                      <button 
                        onClick={() => handleCancelRun(run.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 active:text-rose-800 flex items-center justify-center gap-1 py-1 font-medium"
                      >
                        <XCircle size={14} /> キャンセル
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 【エントリーリスト】 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-sm sm:text-base text-slate-700 flex items-center gap-2">
              <ClipboardList size={18} className="text-slate-500" /> エントリーリスト
            </h2>
            <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">{entries.length} 台</span>
          </div>

          {/* 追加フォーム */}
          <div className="p-3 sm:p-6 border-b border-slate-100 bg-white">
            <form onSubmit={handleAddEntry} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="カーNo (例: 101)" 
                value={newCarNumber}
                onChange={e => setNewCarNumber(e.target.value)}
                className="w-full sm:w-40 px-3.5 py-2.5 border border-slate-300 rounded-xl text-base text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <input 
                type="text" 
                placeholder="車両名・チーム名" 
                value={newVehicleName}
                onChange={e => setNewVehicleName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-base text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button 
                type="submit" 
                disabled={!newCarNumber.trim() || !newVehicleName.trim()} 
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-40 transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus size={16} /> 追加
              </button>
            </form>
          </div>

          {/* モバイル用表示 (カード形式) */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {entries.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">エントリーされている車両はありません</div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 text-base">No.{entry.carNumber}</span>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{entry.vehicleName}</div>
                  </div>
                  <button 
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-lg font-bold bg-rose-50 border border-rose-100 shrink-0"
                  >
                    削除
                  </button>
                </div>
              ))
            )}
          </div>

          {/* PC/タブレット用表示 (テーブル形式) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 w-32">カーNo</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500">車両名・チーム名</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 w-32 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-sm">エントリーされている車両はありません</td>
                  </tr>
                ) : (
                  entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-6 font-bold text-slate-800">No.{entry.carNumber}</td>
                      <td className="py-3 px-6 text-sm text-slate-700">{entry.vehicleName}</td>
                      <td className="py-3 px-6 text-right">
                        <button 
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 underline font-medium"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 【計測結果ログ】 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="font-bold text-sm sm:text-base text-slate-700 flex items-center gap-2">
              <Save size={18} className="text-slate-500" /> 計測結果ログ
            </h2>
            <div className="flex items-center gap-2">
              {role === 'A' && (
                <button 
                  onClick={handleClearResults}
                  disabled={results.length === 0}
                  className="flex items-center gap-1 text-xs sm:text-sm bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl transition disabled:opacity-50 font-bold border border-rose-100"
                >
                  <Trash2 size={15} /> 初期化
                </button>
              )}
              <button 
                onClick={handleExportCSV}
                disabled={results.length === 0}
                className="flex items-center gap-1 text-xs sm:text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl transition disabled:opacity-50 font-bold border border-indigo-100"
              >
                <Download size={15} /> CSV
              </button>
            </div>
          </div>

          {/* モバイル用表示 (カード形式) */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {results.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">記録されたタイムはありません</div>
            ) : (
              results.map(r => (
                <div key={r.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-base">No.{r.carNumber}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">{r.vehicleName}</div>
                  </div>
                  <div className="font-mono font-bold text-base text-slate-800 shrink-0">
                    {formatTime(r.timeMs)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PC/タブレット用表示 (テーブル形式) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500">時刻</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500">カーNo</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500">車両名</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 text-right">タイム</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">まだ記録されたタイムはありません</td>
                  </tr>
                ) : (
                  results.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-6 text-xs text-slate-400">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-700">No.{r.carNumber}</td>
                      <td className="py-3 px-6 text-sm text-slate-600">{r.vehicleName}</td>
                      <td className="py-3 px-6 text-right font-mono font-bold text-lg text-slate-800">
                        {formatTime(r.timeMs)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}