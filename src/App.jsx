import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Play, 
  Square, 
  XCircle, 
  Download, 
  Users, 
  Save, 
  Trash2, 
  Trophy, 
  ArrowUpDown, 
  Plus, 
  Gauge, 
  Flag, 
  Zap,
  UserPlus,
  Flame,
  ClipboardList
} from 'lucide-react';

// RenderのバックエンドURL
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
    <span 
      className="font-mono italic font-black text-2xl sm:text-3xl text-amber-400 tracking-wider drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" 
      ref={timeRef}
    >
      00:00.00
    </span>
  );
};

export default function App() {
  const [role, setRole] = useState(null); // 'viewer', 'A', 'B', 'entry'
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

  // アクションハンドラ
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
    if (window.confirm('このエントリーを削除してもよろしいですか？')) {
      socket.emit('deleteEntry', entryId);
    }
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

  // 閲覧者用：ソート済み結果
  const getSortedResults = () => {
    const list = [...results];
    if (viewerSortOrder === 'time') {
      return list.sort((a, b) => a.timeMs - b.timeMs);
    }
    return list;
  };

  // ==========================================
  // 1. 役割選択画面 (Select Mode)
  // ==========================================
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 selection:bg-orange-500 selection:text-white">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        
        <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 sm:p-10 max-w-lg w-full text-center space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-4 py-2 rounded-full text-orange-400 font-extrabold text-sm uppercase tracking-widest mb-5">
              <Zap size={16} className="animate-pulse" /> Official Timing System
            </div>
            <h1 className="text-4xl sm:text-5xl font-black italic tracking-wider uppercase text-white flex items-center justify-center gap-2">
              <span className="text-orange-500">RALLY</span> TIMING
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mt-2 font-medium">担当するモードを選択してください</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => setRole('viewer')}
              className="w-full py-4.5 px-6 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-100 rounded-2xl font-black italic text-base sm:text-lg uppercase tracking-wider transition active:scale-[0.98] flex items-center justify-between group"
            >
              <span className="flex items-center gap-3"><Users size={22} className="text-slate-400 group-hover:text-white" /> 閲覧者モード</span>
              <span className="text-xs sm:text-sm bg-slate-700/50 text-slate-300 px-3 py-1 rounded-md font-mono">LIVE</span>
            </button>
            
            <button 
              onClick={() => setRole('A')}
              className="w-full py-4.5 px-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-2xl font-black italic text-base sm:text-lg uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-orange-950/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-3"><Play size={22} /> 計測者 A (START)</span>
              <span className="text-xs sm:text-sm bg-black/30 px-2.5 py-1 rounded font-mono">STAGE IN</span>
            </button>
            
            <button 
              onClick={() => setRole('B')}
              className="w-full py-4.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black italic text-base sm:text-lg uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-emerald-950/50 flex items-center justify-between"
            >
              <span className="flex items-center gap-3"><Square size={22} /> 計測者 B (FINISH)</span>
              <span className="text-xs sm:text-sm bg-black/30 px-2.5 py-1 rounded font-mono">STOP</span>
            </button>

            <button 
              onClick={() => setRole('entry')}
              className="w-full py-4.5 px-6 bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-400 rounded-2xl font-black italic text-base sm:text-lg uppercase tracking-wider transition active:scale-[0.98] flex items-center justify-between"
            >
              <span className="flex items-center gap-3"><UserPlus size={22} /> エントリー管理</span>
              <span className="text-xs sm:text-sm bg-amber-500/20 text-amber-300 px-3 py-1 rounded-md font-mono">EDIT</span>
            </button>
          </div>

          <div className="pt-2 text-xs sm:text-sm text-slate-500 font-mono tracking-tight">
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
        <header className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800 shadow-xl">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-xl text-slate-950 font-black">
                <Trophy size={22} />
              </div>
              <h1 className="font-black italic text-xl sm:text-2xl tracking-wider text-white uppercase">
                OFFICIAL <span className="text-orange-500">RESULTS</span>
              </h1>
            </div>
            <button 
              onClick={() => setRole(null)} 
              className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl font-bold border border-slate-700 transition"
            >
              MODE
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-5 bg-slate-900 border-b border-slate-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center gap-2.5">
                  <Flag size={22} className="text-orange-500" />
                  <h2 className="font-black italic text-slate-200 tracking-wider uppercase text-base sm:text-lg">STAGE CLASSIFICATION</h2>
                </div>
                <span className="text-xs sm:text-sm bg-slate-800 border border-slate-700 text-orange-400 px-3 py-1 rounded-full font-mono font-bold">
                  {results.length} FINISHED
                </span>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs sm:text-sm font-bold flex-1 sm:flex-none justify-center">
                  <button 
                    onClick={() => setViewerSortOrder('time')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                      viewerSortOrder === 'time' ? 'bg-orange-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Trophy size={16} /> FASTEST
                  </button>
                  <button 
                    onClick={() => setViewerSortOrder('latest')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                      viewerSortOrder === 'latest' ? 'bg-orange-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ArrowUpDown size={16} /> LATEST
                  </button>
                </div>

                <button 
                  onClick={handleExportCSV}
                  disabled={results.length === 0}
                  className="flex items-center gap-1.5 text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl transition disabled:opacity-40 font-bold shrink-0"
                >
                  <Download size={16} /> CSV
                </button>
              </div>
            </div>

            {/* 表形式 */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs sm:text-sm font-mono uppercase">
                  <tr>
                    {viewerSortOrder === 'time' && <th className="py-4 px-5 w-16 text-center">POS</th>}
                    <th className="py-4 px-5 w-24">NO.</th>
                    <th className="py-4 px-5">DRIVER / CAR</th>
                    <th className="py-4 px-5 w-32">PASS TIME</th>
                    <th className="py-4 px-5 text-right">STAGE TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {sortedResults.length === 0 ? (
                    <tr>
                      <td colSpan={viewerSortOrder === 'time' ? 5 : 4} className="py-14 text-center text-slate-500 text-base font-mono">
                        NO STAGE TIMES RECORDED
                      </td>
                    </tr>
                  ) : (
                    sortedResults.map((r, index) => (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition">
                        {viewerSortOrder === 'time' && (
                          <td className="py-4 px-5 font-black italic text-center text-lg sm:text-xl">
                            {index === 0 ? <span className="text-amber-400">P1</span> : index === 1 ? <span className="text-slate-300">P2</span> : index === 2 ? <span className="text-amber-600">P3</span> : <span className="text-slate-500">P{index + 1}</span>}
                          </td>
                        )}
                        <td className="py-4 px-5">
                          <span className="bg-amber-400 text-slate-950 font-black italic text-sm sm:text-base px-3 py-1 rounded-md">
                            #{r.carNumber}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-bold text-slate-200 text-base sm:text-lg">{r.vehicleName}</td>
                        <td className="py-4 px-5 text-xs sm:text-sm text-slate-500 font-mono">
                          {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                        </td>
                        <td className="py-4 px-5 text-right font-mono font-black italic text-xl sm:text-2xl text-amber-400 tracking-wider">
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
  // 3. エントリー管理画面 (Entry Mode)
  // ==========================================
  if (role === 'entry') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 selection:bg-orange-500 selection:text-white">
        <header className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800 shadow-xl">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-400 p-2 rounded-xl text-slate-950 font-black">
                <UserPlus size={22} />
              </div>
              <h1 className="font-black italic text-xl sm:text-2xl tracking-wider text-white uppercase">
                ENTRY <span className="text-amber-400">MANAGEMENT</span>
              </h1>
            </div>
            <button 
              onClick={() => setRole(null)} 
              className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl font-bold border border-slate-700 transition"
            >
              MODE
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 bg-slate-900 border-b border-slate-800">
              <h2 className="font-black italic text-base sm:text-lg text-slate-200 tracking-wider flex items-center gap-2 uppercase">
                <Plus size={22} className="text-amber-400" /> REGISTRATION FORM
              </h2>
            </div>
            
            <form onSubmit={handleAddEntry} className="p-5 flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="No. (例: 101)" 
                value={newCarNumber}
                onChange={e => setNewCarNumber(e.target.value)}
                className="w-full sm:w-44 px-5 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-bold text-white placeholder-slate-500 outline-none focus:border-amber-400"
              />
              <input 
                type="text" 
                placeholder="車両名・チーム名 (DRIVER / CAR)" 
                value={newVehicleName}
                onChange={e => setNewVehicleName(e.target.value)}
                className="flex-1 px-5 py-3.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-bold text-white placeholder-slate-500 outline-none focus:border-amber-400"
              />
              <button 
                type="submit" 
                disabled={!newCarNumber.trim() || !newVehicleName.trim()} 
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-base font-black italic tracking-wider uppercase disabled:opacity-30 transition flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-amber-950/40"
              >
                <Plus size={20} /> ADD ENTRY
              </button>
            </form>
          </section>

          <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-black italic text-base sm:text-lg text-slate-200 tracking-wider flex items-center gap-2 uppercase">
                <ClipboardList size={22} className="text-slate-400" /> REGISTERED ENTRIES
              </h2>
              <span className="bg-slate-800 border border-slate-700 text-slate-300 text-xs sm:text-sm px-3 py-1 rounded-full font-mono font-bold">
                {entries.length} ENTRIES
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[450px]">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs sm:text-sm font-mono uppercase">
                  <tr>
                    <th className="py-4 px-5 w-28">NO.</th>
                    <th className="py-4 px-5">DRIVER / CAR</th>
                    <th className="py-4 px-5 w-28 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-14 text-center text-slate-500 text-base font-mono">
                        NO ENTRIES REGISTERED
                      </td>
                    </tr>
                  ) : (
                    entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-4 px-5">
                          <span className="bg-amber-400 text-slate-950 font-black italic text-xs sm:text-sm px-3 py-1 rounded-md">
                            #{entry.carNumber}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-base font-bold text-slate-200">{entry.vehicleName}</td>
                        <td className="py-4 px-5 text-right">
                          <button 
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-xs sm:text-sm text-rose-400 hover:text-rose-300 font-bold px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-900/60 transition inline-flex items-center gap-1.5"
                          >
                            <Trash2 size={15} /> 削除
                          </button>
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
  // 4. 計測者 (A/B) 画面
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 selection:bg-orange-500 selection:text-white">
      {/* ヘッダー */}
      <header className="bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gauge className="text-orange-500 w-6 h-6 sm:w-8 sm:h-8 shrink-0 animate-pulse" />
            <h1 className="font-black italic text-lg sm:text-2xl tracking-wider text-white uppercase">
              RALLY <span className="text-orange-500">TIMING</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-black italic tracking-wider ${
              role === 'A' ? 'bg-orange-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
            }`}>
              {role === 'A' ? 'MARSHAL A (START)' : 'MARSHAL B (FINISH)'}
            </span>
            <button 
              onClick={() => setRole(null)} 
              className="text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-1.5 rounded-xl font-bold border border-slate-700 transition"
            >
              MODE
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

        {/* 【計測者A】スタートコントロールパネル */}
        {role === 'A' && (
          <section className="bg-slate-900 border-2 border-orange-500/50 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-orange-400">
              <Play size={22} />
              <h2 className="font-black italic text-lg sm:text-xl tracking-wider uppercase">START LINE CONTROL</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <select 
                value={selectedCarId} 
                onChange={(e) => setSelectedCarId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-5 py-4 text-lg font-bold text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
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
                className="w-full sm:w-auto px-9 py-4.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none text-white rounded-xl font-black italic text-xl tracking-wider flex items-center justify-center gap-2.5 transition shadow-xl shadow-orange-950/80 shrink-0"
              >
                <Play size={26} /> START STAGE
              </button>
            </div>
          </section>
        )}

        {/* 【走行中車両（LIVE ON STAGE）- 表形式】 */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-black italic text-base sm:text-lg text-slate-200 tracking-wider flex items-center gap-2.5 uppercase">
              <Flame size={22} className="text-orange-500" /> LIVE ON STAGE
            </h2>
            <span className="bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs sm:text-sm font-mono font-bold px-3 py-1 rounded-full">
              {activeRuns.length} CARS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[580px]">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs sm:text-sm font-mono uppercase">
                <tr>
                  <th className="py-4 px-5 w-24">NO.</th>
                  <th className="py-4 px-5">DRIVER / CAR</th>
                  <th className="py-4 px-5 w-44">LIVE TIME</th>
                  <th className="py-4 px-5 text-right w-44">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {activeRuns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500 text-base font-mono">
                      NO CARS ON STAGE
                    </td>
                  </tr>
                ) : (
                  activeRuns.map(run => (
                    <tr key={run.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-5 px-5">
                        <span className="bg-amber-400 text-slate-950 font-black italic text-sm sm:text-base px-3 py-1.5 rounded-md">
                          #{run.carNumber}
                        </span>
                      </td>
                      <td className="py-5 px-5 font-bold text-slate-200 text-base sm:text-lg">{run.vehicleName}</td>
                      <td className="py-5 px-5">
                        <LiveTimer startTime={run.startTime} />
                      </td>
                      <td className="py-5 px-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {role === 'B' && (
                            <button 
                              onClick={() => handleStopRun(run.id)}
                              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.97] text-white rounded-xl font-black italic text-base sm:text-lg tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/80 transition my-1"
                            >
                              <Square size={20} /> FINISH
                            </button>
                          )}
                          <button 
                            onClick={() => handleCancelRun(run.id)}
                            className="text-xs text-rose-400 hover:text-rose-300 font-bold p-1.5 rounded transition"
                            title="キャンセル"
                          >
                            <XCircle size={22} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 【計測結果ログ - 表形式】 */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-black italic text-base sm:text-lg text-slate-200 tracking-wider flex items-center gap-2.5 uppercase">
              <Save size={22} className="text-slate-400" /> TIMING LOGS
            </h2>
            <div className="flex items-center gap-3">
              {role === 'A' && (
                <button 
                  onClick={handleClearResults}
                  disabled={results.length === 0}
                  className="flex items-center gap-1.5 text-xs sm:text-sm bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 px-3.5 py-2 rounded-xl transition disabled:opacity-30 font-bold"
                >
                  <Trash2 size={16} /> CLEAR LOG
                </button>
              )}
              <button 
                onClick={handleExportCSV}
                disabled={results.length === 0}
                className="flex items-center gap-1.5 text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl transition disabled:opacity-30 font-bold"
              >
                <Download size={16} /> CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 text-xs sm:text-sm font-mono uppercase">
                <tr>
                  <th className="py-4 px-5 w-24">NO.</th>
                  <th className="py-4 px-5">DRIVER / CAR</th>
                  <th className="py-4 px-5 w-32">PASS TIME</th>
                  <th className="py-4 px-5 text-right">STAGE TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500 text-base font-mono">
                      NO TIMING LOGS
                    </td>
                  </tr>
                ) : (
                  results.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-5">
                        <span className="bg-amber-400 text-slate-950 font-black italic text-xs sm:text-sm px-3 py-1 rounded-md">
                          #{r.carNumber}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-200 text-base sm:text-lg">{r.vehicleName}</td>
                      <td className="py-4 px-5 text-xs sm:text-sm text-slate-500 font-mono">
                        {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-black italic text-xl sm:text-2xl text-amber-400 tracking-wider">
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