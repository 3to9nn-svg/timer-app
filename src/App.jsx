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
  Plus,
  Gauge,
  Flag,
  Zap
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

// リアルタイムタイマー (WRCデジタルメーター風)
const LiveTimer = ({ startTime, size = 'normal' }) => {
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

  const textSizeClass = size === 'large' 
    ? 'text-3xl sm:text-4xl text-amber-400' 
    : 'text-2xl sm:text-3xl text-amber-400';

  return (
    <span 
      className={`font-mono italic font-black tracking-wider ${textSizeClass} drop-shadow-[0_0_12px_rgba(251,191,36,0.3)]`} 
      ref={timeRef}
    >
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
    link.setAttribute("download", `WRC_Timing_Results_${new Date().getTime()}.csv`);
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

  // ==========================================
  // 1. 役割選択画面 (WRC Select Mode)
  // ==========================================
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-orange-500 selection:text-white">
        {/* 背景装飾 */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 sm:space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-3.5 py-1.5 rounded-full text-orange-400 font-extrabold text-xs uppercase tracking-widest mb-4">
              <Zap size={14} className="animate-pulse" /> Official Timing System
            </div>
            <h1 className="text-3xl font-black italic tracking-wider uppercase text-white flex items-center justify-center gap-2">
              <span className="text-orange-500">RALLY</span> TIMING
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 font-medium">担当するコントロールモードを選択してください</p>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => setRole('viewer')}
              className="w-full py-4 px-5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 rounded-2xl font-black italic uppercase tracking-wider transition active:scale-[0.98] flex items-center justify-between group"
            >
              <span className="flex items-center gap-3"><Users size={20} className="text-slate-400 group-hover:text-white" /> 閲覧者モード</span>
              <span className="text-xs bg-slate-700/50 text-slate-400 px-2.5 py-1 rounded-md font-mono">LIVE</span>
            </button>
            <button 
              onClick={() => setRole('A')}
              className="w-full py-4 px-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-2xl font-black italic uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-orange-950/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-3"><Play size={20} /> 計測者 A (START)</span>
              <span className="text-xs bg-black/30 px-2 py-0.5 rounded font-mono">STAGE IN</span>
            </button>
            <button 
              onClick={() => setRole('B')}
              className="w-full py-4 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black italic uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-emerald-950/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-3"><Square size={20} /> 計測者 B (FINISH)</span>
              <span className="text-xs bg-black/30 px-2 py-0.5 rounded font-mono">STOP</span>
            </button>
          </div>

          <div className="pt-2 text-[11px] text-slate-500 font-mono tracking-tight">
            POWERED BY REALTIME SOCKET ENGINE
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. 閲覧者（Viewer）画面
  // ==========================================
  if (role === 'viewer') {
    const sortedResults = getSortedResults();

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 selection:bg-orange-500 selection:text-white">
        {/* ヘッダー */}
        <header className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800 shadow-xl">
          <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-orange-500 p-1.5 rounded-lg text-slate-950 font-black">
                <Trophy size={18} />
              </div>
              <h1 className="font-black italic text-lg sm:text-xl tracking-wider text-white uppercase">
                OFFICIAL <span className="text-orange-500">RESULTS</span>
              </h1>
            </div>
            <button 
              onClick={() => setRole(null)} 
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold border border-slate-700 transition"
            >
              MODE
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* パネルヘッダー */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <Flag size={18} className="text-orange-500" />
                  <h2 className="font-black italic text-slate-200 tracking-wider uppercase text-sm sm:text-base">STAGE CLASSIFICATION</h2>
                </div>
                <span className="text-xs bg-slate-800 border border-slate-700 text-orange-400 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  {results.length} FINISHED
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                {/* 並び替えスイッチ */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold flex-1 sm:flex-none justify-center">
                  <button 
                    onClick={() => setViewerSortOrder('time')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      viewerSortOrder === 'time' ? 'bg-orange-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Trophy size={13} /> FASTEST
                  </button>
                  <button 
                    onClick={() => setViewerSortOrder('latest')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      viewerSortOrder === 'latest' ? 'bg-orange-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUpDown size={13} /> LATEST
                  </button>
                </div>

                <button 
                  onClick={handleExportCSV}
                  disabled={results.length === 0}
                  className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl transition disabled:opacity-40 font-bold shrink-0"
                >
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>

            {/* モバイル用表示 (WRC カード形式) */}
            <div className="block sm:hidden divide-y divide-slate-800/60">
              {sortedResults.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm font-mono">NO STAGE TIMES RECORDED</div>
              ) : (
                sortedResults.map((r, index) => (
                  <div key={r.id} className="p-3.5 flex items-center justify-between gap-3 bg-slate-900/40">
                    <div className="flex items-center gap-3 min-w-0">
                      {viewerSortOrder === 'time' && (
                        <div className={`w-7 text-center font-black italic text-base ${
                          index === 0 ? 'text-amber-400 text-lg' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          P{index + 1}
                        </div>
                      )}
                      
                      {/* ゼッケン表示 */}
                      <div className="bg-amber-400 text-slate-950 font-black italic text-sm px-2 py-1 rounded shrink-0 shadow-md">
                        #{r.carNumber}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 text-sm truncate">{r.vehicleName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono font-black italic text-lg text-amber-400 shrink-0 tracking-wider">
                      {formatTime(r.timeMs)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* PC/タブレット用表示 (WRC テーブル形式) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-mono uppercase">
                  <tr>
                    {viewerSortOrder === 'time' && <th className="py-3 px-6 w-16">POS</th>}
                    <th className="py-3 px-6 w-28">TIME</th>
                    <th className="py-3 px-6 w-28">NO.</th>
                    <th className="py-3 px-6">ENTRY / CAR</th>
                    <th className="py-3 px-6 text-right">STAGE TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={viewerSortOrder === 'time' ? 5 : 4} className="py-12 text-center text-slate-500 text-sm font-mono">
                        NO STAGE TIMES RECORDED
                      </td>
                    </tr>
                  ) : (
                    sortedResults.map((r, index) => (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition">
                        {viewerSortOrder === 'time' && (
                          <td className="py-3.5 px-6 font-black italic text-base">
                            {index === 0 ? <span className="text-amber-400">P1</span> : index === 1 ? <span className="text-slate-300">P2</span> : index === 2 ? <span className="text-amber-600">P3</span> : <span className="text-slate-500">P{index + 1}</span>}
                          </td>
                        )}
                        <td className="py-3.5 px-6 text-xs text-slate-500 font-mono">
                          {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="bg-amber-400 text-slate-950 font-black italic text-xs px-2.5 py-1 rounded">
                            #{r.carNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 font-bold text-slate-200 text-sm">{r.vehicleName}</td>
                        <td className="py-3.5 px-6 text-right font-mono font-black italic text-xl text-amber-400 tracking-wider">
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

  // ==========================================
  // 3. 計測者 (A/B) 画面
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-orange-500 selection:text-white">
      {/* ヘッダー */}
      <header className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="text-orange-500 w-5 h-5 sm:w-6 sm:h-6 shrink-0 animate-pulse" />
            <h1 className="font-black italic text-base sm:text-xl tracking-wider text-white uppercase">
              RALLY <span className="text-orange-500">TIMING</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-black italic tracking-wider ${
              role === 'A' ? 'bg-orange-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
            }`}>
              {role === 'A' ? 'MARSHAL A (START)' : 'MARSHAL B (FINISH)'}
            </span>
            <button 
              onClick={() => setRole(null)} 
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg font-bold border border-slate-700 transition"
            >
              MODE
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* 【計測者A】スタートコントロールパネル */}
        {role === 'A' && (
          <section className="bg-slate-900 border-2 border-orange-500/50 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-orange-400">
              <Play size={18} />
              <h2 className="font-black italic text-base sm:text-lg tracking-wider uppercase">START LINE CONTROL</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={selectedCarId} 
                onChange={(e) => setSelectedCarId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-base font-bold text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="">-- 発進車両を選択 (SELECT CAR) --</option>
                {entries.map(e => {
                  const isRunning = activeRuns.some(r => r.carId === e.id);
                  return (
                    <option key={e.id} value={e.id} disabled={isRunning}>
                      #{e.carNumber} - {e.vehicleName} {isRunning ? ' [ON STAGE]' : ''}
                    </option>
                  );
                })}
              </select>

              <button 
                onClick={() => handleStartRun(selectedCarId)}
                disabled={!selectedCarId}
                className="w-full sm:w-auto px-8 py-4 sm:py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl font-black italic text-lg tracking-wider flex items-center justify-center gap-2 transition shadow-xl shadow-orange-950/80 shrink-0"
              >
                <Play size={22} /> START STAGE
              </button>
            </div>
          </section>
        )}

        {/* 【計測中・走行中車両一覧】 */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-black italic text-sm sm:text-base text-slate-200 tracking-wider flex items-center gap-2 uppercase">
              <Flame size={18} className="text-orange-500" /> LIVE ON STAGE
            </h2>
            <span className="bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
              {activeRuns.length} CARS
            </span>
          </div>

          <div className="p-3 sm:p-5">
            {activeRuns.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm font-mono">NO CARS ON STAGE</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {activeRuns.map(run => (
                  <div key={run.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 shadow-inner">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-400 text-slate-950 font-black italic text-xs px-2 py-0.5 rounded">
                          #{run.carNumber}
                        </span>
                        <span className="font-bold text-slate-200 text-sm truncate">{run.vehicleName}</span>
                      </div>
                      <div className="pt-1">
                        <LiveTimer startTime={run.startTime} size={role === 'B' ? 'large' : 'normal'} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {role === 'B' && (
                        <button 
                          onClick={() => handleStopRun(run.id)}
                          className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.97] text-white rounded-xl font-black italic text-base tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/80 transition"
                        >
                          <Square size={18} /> FINISH
                        </button>
                      )}
                      <button 
                        onClick={() => handleCancelRun(run.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center justify-center gap-1 py-1 font-bold"
                      >
                        <XCircle size={14} /> CANCEL
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 【エントリーリスト】 */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-black italic text-sm sm:text-base text-slate-200 tracking-wider flex items-center gap-2 uppercase">
              <ClipboardList size={18} className="text-slate-400" /> ENTRY LIST
            </h2>
            <span className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
              {entries.length} ENTRIES
            </span>
          </div>

          {/* エントリー追加フォーム */}
          <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/40">
            <form onSubmit={handleAddEntry} className="flex flex-col sm:flex-row gap-2.5">
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="No. (例: 101)" 
                value={newCarNumber}
                onChange={e => setNewCarNumber(e.target.value)}
                className="w-full sm:w-36 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-orange-500"
              />
              <input 
                type="text" 
                placeholder="車両名・チーム名 (DRIVER / CAR)" 
                value={newVehicleName}
                onChange={e => setNewVehicleName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-orange-500"
              />
              <button 
                type="submit" 
                disabled={!newCarNumber.trim() || !newVehicleName.trim()} 
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 rounded-xl text-xs font-black italic tracking-wider uppercase disabled:opacity-30 transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus size={16} /> ADD ENTRY
              </button>
            </form>
          </div>

          {/* モバイル表示 (カード) */}
          <div className="block sm:hidden divide-y divide-slate-800/60">
            {entries.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs font-mono">NO ENTRIES</div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="bg-amber-400 text-slate-950 font-black italic text-xs px-2 py-0.5 rounded shrink-0">
                      #{entry.carNumber}
                    </span>
                    <span className="font-bold text-slate-200 text-sm truncate">{entry.vehicleName}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 rounded bg-rose-950/40 border border-rose-900/60 shrink-0"
                  >
                    削除
                  </button>
                </div>
              ))
            )}
          </div>

          {/* PC表示 (テーブル) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-mono uppercase">
                <tr>
                  <th className="py-2.5 px-6 w-28">NO.</th>
                  <th className="py-2.5 px-6">DRIVER / CAR</th>
                  <th className="py-2.5 px-6 w-28 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500 text-sm font-mono">NO ENTRIES</td>
                  </tr>
                ) : (
                  entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-6">
                        <span className="bg-amber-400 text-slate-950 font-black italic text-xs px-2.5 py-0.5 rounded">
                          #{entry.carNumber}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-sm font-bold text-slate-200">{entry.vehicleName}</td>
                      <td className="py-3 px-6 text-right">
                        <button 
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold"
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
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-black italic text-sm sm:text-base text-slate-200 tracking-wider flex items-center gap-2 uppercase">
              <Save size={18} className="text-slate-400" /> TIMING LOGS
            </h2>
            <div className="flex items-center gap-2">
              {role === 'A' && (
                <button 
                  onClick={handleClearResults}
                  disabled={results.length === 0}
                  className="flex items-center gap-1 text-xs bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 px-2.5 py-1.5 rounded-xl transition disabled:opacity-30 font-bold"
                >
                  <Trash2 size={14} /> CLEAR LOG
                </button>
              )}
              <button 
                onClick={handleExportCSV}
                disabled={results.length === 0}
                className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-xl transition disabled:opacity-30 font-bold"
              >
                <Download size={14} /> CSV
              </button>
            </div>
          </div>

          {/* モバイル表示 (カード) */}
          <div className="block sm:hidden divide-y divide-slate-800/60">
            {results.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-mono">NO TIMING LOGS</div>
            ) : (
              results.map(r => (
                <div key={r.id} className="p-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="bg-amber-400 text-slate-950 font-black italic text-xs px-2 py-0.5 rounded shrink-0">
                      #{r.carNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 text-sm truncate">{r.vehicleName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-black italic text-base text-amber-400 shrink-0 tracking-wider">
                    {formatTime(r.timeMs)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PC表示 (テーブル) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs font-mono uppercase">
                <tr>
                  <th className="py-2.5 px-6 w-28">TIME</th>
                  <th className="py-2.5 px-6 w-28">NO.</th>
                  <th className="py-2.5 px-6">DRIVER / CAR</th>
                  <th className="py-2.5 px-6 text-right">STAGE TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 text-sm font-mono">NO TIMING LOGS</td>
                  </tr>
                ) : (
                  results.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-6 text-xs text-slate-500 font-mono">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </td>
                      <td className="py-3 px-6">
                        <span className="bg-amber-400 text-slate-950 font-black italic text-xs px-2.5 py-0.5 rounded">
                          #{r.carNumber}
                        </span>
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-200 text-sm">{r.vehicleName}</td>
                      <td className="py-3 px-6 text-right font-mono font-black italic text-lg text-amber-400 tracking-wider">
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