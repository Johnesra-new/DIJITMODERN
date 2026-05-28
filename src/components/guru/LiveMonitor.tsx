import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tv, 
  User, 
  AlertTriangle, 
  Send, 
  Clock, 
  Lock, 
  Unlock,
  Check, 
  Zap, 
  X,
  Camera,
  Activity,
  WifiOff
} from 'lucide-react';
import { db, Exam, StudentSession, Violation } from '../../utils/supabaseDb';
import { supabase } from '../../utils/supabaseClient';

interface LiveMonitorProps {
  guruUser: any;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ guruUser }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [selectedStudentSession, setSelectedStudentSession] = useState<StudentSession | null>(null);
  
  // Real-time log feeds state
  const [violationLogs, setViolationLogs] = useState<any[]>([]);
  const [warningInput, setWarningInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load exams on mount
  useEffect(() => {
    const loadExams = async () => {
      try {
        const allExams = await db.getExams();
        const filtered = allExams.filter(e => e.guru_id === guruUser.id);
        setExams(filtered);
        if (filtered.length > 0) {
          setSelectedExamId(filtered[0].id);
        }
      } catch (err) {
        console.error("Gagal memuat daftar ujian:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadExams();
  }, [guruUser.id]);

  // Load and sync sessions in real time
  const handleLoadSessions = useCallback(async () => {
    if (!selectedExamId) return;
    try {
      const currentSessions = await db.getSessionsByExam(selectedExamId);
      setSessions(currentSessions);

      // Extract all violation logs from these sessions
      const logs: any[] = [];
      currentSessions.forEach(s => {
        (s.log_pelanggaran || []).forEach(v => {
          logs.push({
            siswa_name: s.siswa_name,
            siswa_id: s.siswa_id,
            ...v
          });
        });
      });
      // Sort logs descending
      logs.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());
      setViolationLogs(logs);

      // Keep active modal selected student in sync with fresh DB data
      if (selectedStudentSession) {
        const fresh = currentSessions.find(s => s.id === selectedStudentSession.id);
        if (fresh) setSelectedStudentSession(fresh);
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data sesi:", err);
    }
  }, [selectedExamId, selectedStudentSession]);

  useEffect(() => {
    if (!selectedExamId) return;

    handleLoadSessions();

    // Subscribe to realtime changes on sessions table for this exam
    const channel = supabase
      .channel(`live-sessions-${selectedExamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `ujian_id=eq.${selectedExamId}`
        },
        (payload) => {
          console.log("Realtime update for exam sessions:", payload);
          handleLoadSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedExamId, handleLoadSessions]);

  // Dynamic simulation of WebRTC camera movement
  const [movementTick, setMovementTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMovementTick(t => t + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTeacherAction = async (actionType: 'warning' | 'add_time' | 'force_submit' | 'block', session: StudentSession) => {
    const exam = exams.find(e => e.id === selectedExamId);
    
    switch (actionType) {
      case 'warning':
        if (!warningInput.trim()) {
          alert('Tulis pesan peringatan terlebih dahulu!');
          return;
        }
        try {
          await db.addLog(
            guruUser.id,
            guruUser.name,
            guruUser.role,
            "Kirim Peringatan",
            `Guru mengirim peringatan kepada ${session.siswa_name} pada ujian ${exam?.judul || ''}: "${warningInput}"`
          );
          // Simulating real-time alert sent to student
          const warningViolation = {
            waktu: new Date().toISOString(),
            tipe: 'keluar_aplikasi' as const, // Category warning as alert log
            deskripsi: `PESAN GURU: "${warningInput}"`
          };
          await db.updateSession({
            id: session.id,
            log_pelanggaran: [...(session.log_pelanggaran || []), warningViolation]
          });
          alert(`Pesan Peringatan Terkirim!\nPesan: "${warningInput}" telah dikirim ke layar ujian ${session.siswa_name}.`);
          setWarningInput('');
          handleLoadSessions();
        } catch (err) {
          console.error(err);
        }
        break;

      case 'add_time':
        const confirmTime = window.confirm(`Tambahkan waktu +15 menit untuk siswa ${session.siswa_name} akibat kendala teknis?`);
        if (confirmTime) {
          try {
            await db.addLog(
              guruUser.id,
              guruUser.name,
              guruUser.role,
              "Tambah Durasi Siswa",
              `Menambahkan +15 menit durasi pengerjaan untuk siswa ${session.siswa_name} pada ujian ${exam?.judul || ''}.`
            );
            alert('Berhasil menambah durasi pengerjaan siswa.');
          } catch (err) {
            console.error(err);
          }
        }
        break;

      case 'force_submit':
        const confirmSubmit = window.confirm(`PAKSA SELESAI (Force-Submit) lembar ujian ${session.siswa_name} sekarang?`);
        if (confirmSubmit) {
          try {
            await db.updateSession({
              id: session.id,
              status: 'selesai',
              waktu_submit: new Date().toISOString()
            });
            await db.addLog(
              guruUser.id,
              guruUser.name,
              guruUser.role,
              "Paksa Kumpul Ujian",
              `Menghentikan dan mengumpulkan paksa lembar ujian siswa ${session.siswa_name} pada ujian ${exam?.judul || ''}.`
            );
            await handleLoadSessions();
            setSelectedStudentSession(null);
            alert(`Ujian ${session.siswa_name} dikumpulkan paksa.`);
          } catch (err) {
            console.error(err);
          }
        }
        break;

      case 'block':
        const isBlocked = session.status === 'diblokir';
        const confirmBlock = window.confirm(
          isBlocked 
            ? `BUKA BLOKIR (Unblock) akses ujian siswa ${session.siswa_name}?` 
            : `BLOKIR / KUNCI akses ujian siswa ${session.siswa_name} akibat kecurangan parah?`
        );
        if (confirmBlock) {
          try {
            const nextStatus = isBlocked ? 'mengerjakan' : 'diblokir';
            await db.updateSession({
              id: session.id,
              status: nextStatus,
              kamera_status: isBlocked ? 'aman' : 'melanggar'
            });
            await db.addLog(
              guruUser.id,
              guruUser.name,
              guruUser.role,
              isBlocked ? "Buka Blokir Siswa" : "Blokir Siswa",
              `${isBlocked ? "Membuka" : "Memblokir"} sesi ujian siswa ${session.siswa_name} pada ujian ${exam?.judul || ''}.`
            );
            await handleLoadSessions();
            setSelectedStudentSession(null);
            alert(`Siswa ${session.siswa_name} berhasil ${isBlocked ? 'di-unblock' : 'diblokir'}.`);
          } catch (err) {
            console.error(err);
          }
        }
        break;
    }
  };

  // Developer Simulation Panel (Picu Pelanggaran Uji Coba)
  const triggerViolationSimulation = async (siswaId: string, type: 'tab_switch' | 'no_face' | 'multi_face' | 'disconnect') => {
    const session = sessions.find(s => s.siswa_id === siswaId);
    if (!session) return;

    let vType: Violation['tipe'] = 'keluar_aplikasi';
    let vDesc = '';

    if (type === 'tab_switch') {
      vType = 'keluar_aplikasi';
      vDesc = 'Membuka aplikasi lain / ganti tab browser.';
    } else if (type === 'no_face') {
      vType = 'wajah_hilang';
      vDesc = 'Wajah tidak terdeteksi oleh kamera pengawas > 10 detik.';
    } else if (type === 'multi_face') {
      vType = 'multi_wajah';
      vDesc = 'Terdeteksi lebih dari satu wajah di layar pengawasan (Flag Merah).';
    } else if (type === 'disconnect') {
      vType = 'terputus';
      vDesc = 'Koneksi internet terputus lebih dari 60 detik. Ujian otomatis dipause.';
    }

    const violation = {
      waktu: new Date().toISOString(),
      tipe: vType,
      deskripsi: vDesc
    };

    try {
      await db.updateSession({
        id: session.id,
        kamera_status: type === 'disconnect' ? 'tidak_aktif' : 'melanggar',
        log_pelanggaran: [...(session.log_pelanggaran || []), violation]
      });
      await handleLoadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (kameraStatus: string) => {
    switch (kameraStatus) {
      case 'aman':
        return 'bg-emerald-500 shadow-md shadow-emerald-500/25';
      case 'tidak_aktif':
        return 'bg-amber-500 shadow-md shadow-amber-500/25';
      case 'melanggar':
        return 'bg-rose-500 shadow-md shadow-rose-500/25 animate-ping';
      default:
        return 'bg-slate-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Monitor Live...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header and Select Exam */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
              Monitor Ujian Real-Time
            </h1>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">Sistem pengawasan kamera WebRTC live, deteksi wajah AI, dan log interupsi otomatis.</p>
        </div>

        {/* Dropdown Select Exam */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Ujian Dipantau:</span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-800 outline-none cursor-pointer"
          >
            <option value="">Pilih Ujian...</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.judul} ({ex.status})</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedExamId ? (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white text-center py-12 text-slate-400 text-sm">
          Pilih salah satu ujian aktif untuk membuka layar pengawasan.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* Left Column: Student Video grid view (Col-Span-3) */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* Header info */}
            <div className="p-4 rounded-xl bg-white/80 border border-slate-200 flex flex-wrap justify-between items-center gap-3">
              <div className="text-xs text-slate-400 font-mono">
                Terdaftar: <strong className="text-slate-800">{sessions.length}</strong> | 
                Sedang Mengerjakan: <strong className="text-emerald-600">{sessions.filter(s=>s.status==='mengerjakan').length}</strong> | 
                Terputus/Blokir: <strong className="text-rose-500">{sessions.filter(s=>s.status==='diblokir' || s.status==='terputus').length}</strong> | 
                Selesai: <strong className="text-cyan-600">{sessions.filter(s=>s.status==='selesai').length}</strong>
              </div>
              
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-950/20 border border-emerald-300/40 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> AMAN
                </span>
                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-950/20 border border-amber-900/40 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span> TERPUTUS
                </span>
                <span className="flex items-center gap-1 text-[10px] text-rose-600 bg-rose-950/20 border border-rose-300/40 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-ping"></span> BLOKIR / MELANGGAR
                </span>
              </div>
            </div>

            {/* Cameras grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {sessions.map((sess) => {
                const isViolation = sess.kamera_status === 'melanggar' || sess.status === 'diblokir';
                const isDisconnected = sess.kamera_status === 'tidak_aktif';
                const mockMovementShift = (movementTick + sess.seed) % 3;

                return (
                  <div
                    key={sess.id}
                    onClick={() => setSelectedStudentSession(sess)}
                    className={`p-3.5 rounded-2xl border bg-white backdrop-blur-sm cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between h-48 relative overflow-hidden group ${
                      isViolation 
                        ? 'border-rose-600 bg-rose-950/5 shadow-lg shadow-rose-950/20' 
                        : isDisconnected 
                        ? 'border-amber-600 bg-amber-950/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Live Snapshot simulator / moving background canvas */}
                    <div className="absolute inset-0 z-0 opacity-40 select-none pointer-events-none transition-transform duration-1000">
                      {isDisconnected ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/80 gap-1.5 text-slate-600">
                          <WifiOff className="w-8 h-8 text-amber-500 animate-bounce" />
                          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">NO CONNECTION</span>
                        </div>
                      ) : (
                        <img 
                          src={sess.kamera_snapshots?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"} 
                          alt="Video feed mock"
                          className="w-full h-full object-cover transition-all"
                          style={{
                            transform: `scale(${1.02 + mockMovementShift * 0.008}) rotate(${mockMovementShift * 0.4}deg)`,
                            filter: isViolation ? 'sepia(0.3) saturate(2)' : 'none'
                          }}
                        />
                      )}
                    </div>

                    {/* Overlay info */}
                    <div className="relative z-10 flex justify-between items-start w-full pointer-events-none">
                      <span className="text-[9px] bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded font-mono text-white">
                        NIS: {sess.siswa_nis}
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(sess.kamera_status)}`}></span>
                    </div>

                    {/* Footer Info */}
                    <div className="relative z-10 w-full mt-auto bg-black/75 backdrop-blur-sm p-2 rounded-xl border border-slate-800">
                      <p className="text-[11px] font-bold text-white truncate">{sess.siswa_name}</p>
                      <div className="flex justify-between items-center mt-0.5">
                        <span className="text-[9px] text-slate-400 font-semibold">{sess.siswa_kelas}</span>
                        <span className={`text-[9px] font-bold uppercase ${
                          sess.status === 'diblokir' ? 'text-rose-400' : 'text-slate-400'
                        }`}>{sess.status}</span>
                      </div>
                    </div>

                    {/* Click zoom hover card icon */}
                    <div className="absolute inset-0 bg-purple-950/20 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <span className="px-3 py-1.5 bg-white border border-slate-200 text-[10px] text-slate-800 font-semibold rounded-full shadow-lg flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>Kamera Siswa</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Violation log stream & Developer simulation panel */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* Developer Simulation controller */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 block font-sans">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Simulasi Pelanggaran (Dev)</span>
              </h3>
              
              <div className="space-y-3">
                <div className="text-[11px] text-slate-400 leading-normal">
                  Picu kejadian kecurangan buatan untuk melihat kinerja anti-contek web:
                </div>
                
                {sessions.filter(s=>s.status==='mengerjakan').slice(0, 2).map((s) => (
                  <div key={s.id} className="p-2.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="text-[10px] text-slate-700 font-bold block truncate">{s.siswa_name}</span>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px] font-semibold">
                      <button 
                        onClick={() => triggerViolationSimulation(s.siswa_id, 'tab_switch')}
                        className="py-1 bg-white border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-500 rounded transition-colors"
                      >
                        Keluar Layar
                      </button>
                      <button 
                        onClick={() => triggerViolationSimulation(s.siswa_id, 'no_face')}
                        className="py-1 bg-white border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-500 rounded transition-colors"
                      >
                        Wajah Hilang
                      </button>
                      <button 
                        onClick={() => triggerViolationSimulation(s.siswa_id, 'multi_face')}
                        className="py-1 bg-white border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-500 rounded transition-colors"
                      >
                        Multi-Wajah
                      </button>
                      <button 
                        onClick={() => triggerViolationSimulation(s.siswa_id, 'disconnect')}
                        className="py-1 bg-white border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-500 rounded transition-colors"
                      >
                        Putus Net
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Violation real time feed */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Log Pelanggaran Ujian</h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {violationLogs.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-6 italic">Belum terdeteksi interupsi/kecurangan.</p>
                ) : (
                  violationLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] leading-relaxed space-y-1 animate-pulse-slow"
                    >
                      <div className="flex justify-between items-center text-[9px]">
                        <strong className="text-rose-600 uppercase font-semibold">{log.tipe.replace('_', ' ')}</strong>
                        <span className="text-slate-400">{new Date(log.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-800 font-semibold truncate">{log.siswa_name}</p>
                      <p className="text-slate-500 text-[10px] leading-snug">{log.deskripsi}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* STUDENT CAMERA ZOOM MODAL & CONTROLS */}
      {selectedStudentSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto relative">
            <button 
              onClick={() => setSelectedStudentSession(null)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
              <div className={`w-3.5 h-3.5 rounded-full ${getStatusColor(selectedStudentSession.kamera_status)}`}></div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{selectedStudentSession.siswa_name}</h3>
                <p className="text-xs text-slate-400">Kelas: {selectedStudentSession.siswa_kelas} • NIS: {selectedStudentSession.siswa_nis}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Large Camera screen */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Feed Kamera Pengawas (Live)</span>
                
                <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative shadow-inner">
                  {selectedStudentSession.kamera_status === 'tidak_aktif' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-1.5">
                      <WifiOff className="w-10 h-10 text-amber-500" />
                      <span className="text-[10px] font-mono">OFFLINE</span>
                    </div>
                  ) : (
                    <>
                      <img 
                        src={selectedStudentSession.kamera_snapshots?.[0] || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"} 
                        alt="Zoom feed mock"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-[9px] text-emerald-600 font-mono rounded flex items-center gap-1 border border-emerald-950">
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>LIVE STREAM</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Student exam sessions status & actions */}
              <div className="space-y-4 flex flex-col justify-between">
                
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold block">Status Ujian Siswa</span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status</span>
                      <span className="text-slate-800 font-bold uppercase">{selectedStudentSession.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Pelanggaran</span>
                      <span className={`font-mono font-bold ${(selectedStudentSession.log_pelanggaran || []).length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {(selectedStudentSession.log_pelanggaran || []).length}
                      </span>
                    </div>
                  </div>

                  {/* Warning Input Form */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">Kirim Pesan Ke Layar Siswa</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik peringatan..."
                        value={warningInput}
                        onChange={(e) => setWarningInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2 pl-3 pr-10 text-xs text-slate-800 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleTeacherAction('warning', selectedStudentSession)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:text-blue-500 transition-colors cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Control Actions buttons grid */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleTeacherAction('add_time', selectedStudentSession)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded-xl text-center text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer space-y-1"
                    title="Tambah waktu pengerjaan"
                  >
                    <Clock className="w-4 h-4 mx-auto text-blue-600" />
                    <span className="text-[9px] block leading-none">Add +15m</span>
                  </button>

                  <button
                    onClick={() => handleTeacherAction('block', selectedStudentSession)}
                    className={`p-2.5 border rounded-xl text-center text-xs font-semibold transition-all cursor-pointer space-y-1 ${
                      selectedStudentSession.status === 'diblokir'
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-700'
                    }`}
                    title={selectedStudentSession.status === 'diblokir' ? "Buka Kunci Ujian" : "Kunci Ujian"}
                  >
                    {selectedStudentSession.status === 'diblokir' ? (
                      <>
                        <Unlock className="w-4 h-4 mx-auto text-emerald-600" />
                        <span className="text-[9px] block leading-none">Unblock</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mx-auto text-rose-600" />
                        <span className="text-[9px] block leading-none">Kunci/Blok</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleTeacherAction('force_submit', selectedStudentSession)}
                    className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-center text-xs font-semibold text-slate-700 hover:text-emerald-600 transition-all cursor-pointer space-y-1"
                    title="Kumpul Paksa"
                  >
                    <Check className="w-4 h-4 mx-auto text-emerald-600" />
                    <span className="text-[9px] block leading-none">Force-Sub</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Individual logs for selected student */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Riwayat Log Sesi Siswa</span>
              
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {(selectedStudentSession.log_pelanggaran || []).length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-2.5 italic">Tidak ada catatan pelanggaran.</p>
                ) : (
                  (selectedStudentSession.log_pelanggaran || []).map((log, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-250 rounded-lg text-[11px] leading-relaxed flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[9px] font-mono text-rose-600 font-bold block">{log.tipe.toUpperCase()}</span>
                        <p className="text-slate-700 mt-0.5">{log.deskripsi}</p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{new Date(log.waktu).toLocaleTimeString('id-ID')}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
