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
  Save
} from 'lucide-react';

// RenderのバックエンドURLを設定してください
const SOCKET_SERVER_URL = 'https://timer-server.onrender.com';
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

// 各走行中車両のリアルタイムタイマー表示
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
    <span className="font-mono text-2xl font-bold text-blue-600" ref={timeRef}>
      00:00.00
    </span>
  );
};

export default function App() {
  const [role, setRole] = useState(null); // 'viewer', 'A' (スタート), 'B' (ストップ)
  
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

  // 役割選択画面
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-8">
          <div>
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">オンラインタイム計測</h1>
            <p className="text-slate-500 mt-2">担当する役割を選択してください</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={() => setRole('viewer')}
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              <Users size={18} /> 閲覧者（結果のみ表示）
            </button>
            <button 
              onClick={() => setRole('A')}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
              <Play size={18} /> 計測者A (スタート担当)
            </button>
            <button 
              onClick={() => setRole('B')}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
            >
              <Square size={18} /> 計測者B (ストップ/ゴール担当)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 閲覧者（Viewer）画面
  if (role === 'viewer') {
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="text-blue-600 w-6 h-6" />
              <h1 className="font-bold text-lg text-slate-800">計測ログ (閲覧専用)</h1>
            </div>
            <button onClick={() => setRole(null)} className="text-sm text-slate-500 hover:text-slate-800 underline">
              役割を変更
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* 現在走行中の車両 */}
          {activeRuns.length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-amber-800 font-bold flex items-center gap-2 mb-4">
                <Flame className="text-amber-500" size={20} /> 現在走行中の車両 ({activeRuns.length}台)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRuns.map(run => (
                  <div key={run.id} className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">No.{run.carNumber}</span>
                      <div className="font-bold text-slate-800 mt-1">{run.vehicleName}</div>
                    </div>
                    <LiveTimer startTime={run.startTime} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 計測結果ログ */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-bold text-slate-700 flex items-center gap-2">
                <Save size={18} className="text-slate-500" /> 計測結果ログ
              </h2>
              <button 
                onClick={handleExportCSV}
                disabled={results.length === 0}
                className="flex items-center gap-2 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50 font-medium border border-indigo-100"
              >
                <Download size={16} /> CSV出力
              </button>
            </div>

            <div className="overflow-x-auto">
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
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-sm">
                        まだ記録されたタイムはありません
                      </td>
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

  // 計測者 (A/B) 画面
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-blue-600 w-6 h-6" />
            <h1 className="font-bold text-lg text-slate-800">オンラインタイム計測</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              role === 'A' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {role === 'A' ? '計測者A (スタート担当)' : '計測者B (ストップ担当)'}
            </span>
            <button onClick={() => setRole(null)} className="text-sm text-slate-500 hover:text-slate-800 underline">
              役割変更
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* 【計測者A】スタートコントロールパネル */}
        {role === 'A' && (
          <section className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6 space-y-4">
            <h2 className="font-bold text-lg text-blue-900 flex items-center gap-2">
              <Play className="text-blue-600" size={20} /> スタート計測パネル
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <select 
                value={selectedCarId} 
                onChange={(e) => setSelectedCarId(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium outline-none focus:border-blue-400"
              >
                <option value="">-- 発進する車両を選択 --</option>
                {entries.map(e => (
                  <option key={e.id} value={e.id}>No.{e.carNumber} - {e.vehicleName}</option>
                ))}
              </select>
              <button 
                onClick={() => handleStartRun(selectedCarId)}
                disabled={!selectedCarId}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-md shadow-blue-200"
              >
                <Play size={20} /> スタート発進
              </button>
            </div>
          </section>
        )}

        {/* 【計測中・走行中車両一覧】 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Flame size={18} className="text-amber-500" /> 現在計測中（走行中）の車両
            </h2>
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {activeRuns.length} 台走行中
            </span>
          </div>

          <div className="p-6">
            {activeRuns.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">走行中の車両はありません</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeRuns.map(run => (
                  <div key={run.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Car size={18} className="text-slate-500" />
                        <span className="font-black text-xl text-slate-800">No.{run.carNumber}</span>
                      </div>
                      <div className="text-sm text-slate-600 font-medium mt-0.5">{run.vehicleName}</div>
                      <div className="mt-2">
                        <LiveTimer startTime={run.startTime} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {role === 'B' && (
                        <button 
                          onClick={() => handleStopRun(run.id)}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition"
                        >
                          <Square size={16} /> ゴール (ストップ)
                        </button>
                      )}
                      <button 
                        onClick={() => handleCancelRun(run.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 flex items-center justify-center gap-1 py-1"
                      >
                        <XCircle size={14} /> 計測キャンセル
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 【エントリーリスト（表形式）】 */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <ClipboardList size={18} className="text-slate-500" /> エントリーリスト
            </h2>
            <span className="bg-slate-200 text-slate-600 text-xs px-2.5 py-1 rounded-full font-bold">{entries.length} 台</span>
          </div>

          <div className="p-6 border-b border-slate-100">
            <form onSubmit={handleAddEntry} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="カーナンバー (例: 101)" 
                value={newCarNumber}
                onChange={e => setNewCarNumber(e.target.value)}
                className="w-full sm:w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
              />
              <input 
                type="text" 
                placeholder="車両名・チーム名" 
                value={newVehicleName}
                onChange={e => setNewVehicleName(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
              />
              <button 
                type="submit" 
                disabled={!newCarNumber.trim() || !newVehicleName.trim()} 
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
              >
                エントリー追加
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
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
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="font-bold text-slate-700 flex items-center gap-2">
              <Save size={18} className="text-slate-500" /> 計測結果ログ
            </h2>
            <button 
              onClick={handleExportCSV}
              disabled={results.length === 0}
              className="flex items-center gap-2 text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50 font-medium border border-indigo-100"
            >
              <Download size={16} /> CSV出力
            </button>
          </div>

          <div className="overflow-x-auto">
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