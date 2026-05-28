import React from 'react';
import { LogOut, Camera, Play, Clock, BookOpen, CheckCircle2, XCircle, Key, Shield, AlertTriangle } from 'lucide-react';
import { db, User as SiswaType, Exam, StudentSession } from '../../utils/supabaseDb';
import { supabase } from '../../utils/supabaseClient';
import { PengerjaanUjian } from './PengerjaanUjian';

interface SiswaPortalProps {
  siswa: SiswaType;
  onLogout: () => void;
}

export const SiswaPortal: React.FC<SiswaPortalProps> = ({ siswa, onLogout }) => {
  const [exams, setExams] = React.useState<Exam[]>([]);
  const [sessions, setSessions] = React.useState<StudentSession[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // States
  const [isTakingExam, setIsTakingExam] = React.useState(false);
  const [activeExamId, setActiveExamId] = React.useState<string | null>(null);
  const [tokenModalExam, setTokenModalExam] = React.useState<Exam | null>(null);
  const [tokenInput, setTokenInput] = React.useState('');
  const [cameraChecked, setCameraChecked] = React.useState(false);
  const [showCameraModal, setShowCameraModal] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const refreshData = React.useCallback(async () => {
    try {
      const ex = await db.getExams();
      const sess = await db.getSessions();
      setExams(ex);
      setSessions(sess.filter(s => s.siswa_id === siswa.id));
    } catch (err) {
      console.error("Gagal mengambil data siswa dari Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  }, [siswa.id]);

  React.useEffect(() => {
    refreshData();

    // Subscribe to realtime updates for this student's sessions
    const sessionChannel = supabase
      .channel(`student-sessions-${siswa.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `siswa_id=eq.${siswa.id}`
        },
        (payload) => {
          console.log("Realtime update for student session:", payload);
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to realtime updates for exams (so new/updated exams appear immediately)
    const examChannel = supabase
      .channel('all-exams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams'
        },
        (payload) => {
          console.log("Realtime update for exams:", payload);
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(examChannel);
    };
  }, [siswa.id, refreshData]);

  const studentExams = exams.filter(exam => {
    if (!siswa.kelas) return false;
    const cls = siswa.kelas.toUpperCase();
    const isGrade10 = cls.startsWith('X-') || cls === 'X' || cls === '10';
    const isGrade11 = cls.startsWith('XI-') || cls === 'XI' || cls === '11';
    const isGrade12 = cls.startsWith('XII-') || cls === 'XII' || cls === '12';

    return exam.kelas_ids?.some(k => {
      const target = k.toUpperCase();
      if (target === cls) return true;
      if (isGrade10 && (target === 'X' || target === '10' || target === 'KELAS 10' || target === 'KELAS X')) return true;
      if (isGrade11 && (target === 'XI' || target === '11' || target === 'KELAS 11' || target === 'KELAS XI')) return true;
      if (isGrade12 && (target === 'XII' || target === '12' || target === 'KELAS 12' || target === 'KELAS XII')) return true;
      return false;
    });
  });
  const activeExams = studentExams.filter(e => e.status === 'berlangsung');
  const completedSessions = sessions.filter(s => s.status === 'selesai');

  const handleStartExamClick = (exam: Exam) => {
    setTokenModalExam(exam);
    setTokenInput('');
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenModalExam) return;

    try {
      // Fetch the latest exam details directly from database to get the fresh token
      const allExams = await db.getExams();
      const freshExam = allExams.find(e => e.id === tokenModalExam.id);

      if (!freshExam) {
        alert("Ujian tidak ditemukan!");
        setTokenModalExam(null);
        return;
      }

      const cleanInput = tokenInput.trim().toUpperCase();
      const cleanDbToken = (freshExam.token || '').trim().toUpperCase();

      if (cleanInput === cleanDbToken) {
        // Cek keterlambatan (late limit)
        // Cari sesi aktif siswa
        const existingSession = sessions.find(s => s.ujian_id === freshExam.id);
        const isResuming = existingSession && (existingSession.status === 'mengerjakan' || existingSession.status === 'terputus');

        if (!isResuming) {
          // Pertama kali mulai ujian
          if (freshExam.waktu_mulai) {
            const startTime = new Date(freshExam.waktu_mulai).getTime();
            const currentTime = Date.now();
            const lateLimitMinutes = freshExam.late_limit ?? 15;
            const diffMinutes = (currentTime - startTime) / (60 * 1000);

            if (diffMinutes > lateLimitMinutes) {
              alert(`Waktu toleransi keterlambatan masuk ujian (${lateLimitMinutes} menit) telah habis. Anda terlambat ${Math.floor(diffMinutes)} menit dari waktu mulai (${new Date(freshExam.waktu_mulai).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}). Silakan hubungi pengawas.`);
              setTokenModalExam(null);
              return;
            }
          }
        }

        setTokenModalExam(null);
        setActiveExamId(freshExam.id);
        setIsTakingExam(true);
      } else {
        alert('Token ujian salah! Silakan hubungi guru pengawas.');
      }
    } catch (err) {
      console.error("Gagal memverifikasi token:", err);
      alert("Terjadi kesalahan koneksi saat memverifikasi token.");
    }
  };

  const handleFinishExam = () => {
    setIsTakingExam(false);
    setActiveExamId(null);
    refreshData();
  };

  const handleCameraCheck = async () => {
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraChecked(true);
    } catch (err) {
      alert('Kamera tidak terdeteksi atau akses ditolak. Pastikan izin kamera aktif.');
    }
  };

  const handleCloseCameraModal = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCameraModal(false);
  };

  if (isTakingExam && activeExamId) {
    return <PengerjaanUjian siswa={siswa} examId={activeExamId} onFinish={handleFinishExam} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center items-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 mt-4 tracking-wider uppercase font-semibold">Memuat Portal Siswa...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Simple Top Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              {siswa.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{siswa.name}</p>
              <p className="text-[10px] text-slate-400">{siswa.kelas} • NIS: {siswa.nip_nis}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Camera Check Button */}
        <button
          onClick={handleCameraCheck}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
            cameraChecked 
              ? 'border-emerald-200 bg-emerald-50' 
              : 'border-slate-200 bg-white hover:border-blue-300'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            cameraChecked ? 'bg-emerald-500' : 'bg-blue-600'
          }`}>
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-slate-800">Cek Kamera</p>
             <p className="text-[10px] text-slate-400">
              {cameraChecked ? 'Kamera terdeteksi & siap' : 'Periksa kamera sebelum ujian'}
            </p>
          </div>
          {cameraChecked && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        </button>

        {/* Active Exams Section */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Ujian Tersedia</h2>
          
          {activeExams.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Tidak ada ujian yang berlangsung saat ini.</p>
            </div>
          ) : (
            activeExams.map(exam => {
              const existingSession = sessions.find(s => s.ujian_id === exam.id);
              const isFinished = existingSession?.status === 'selesai';
              const isBlocked = existingSession?.status === 'diblokir';
              
              return (
                <div key={exam.id} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">{exam.mapel}</span>
                          {!isFinished && !isBlocked && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm">{exam.judul}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.durasi} Menit</span>
                      <span>{(exam.soal_ids || []).length} Soal</span>
                    </div>
                  </div>
                  
                  {isFinished ? (
                    <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="text-xs font-semibold">
                        {exam?.tampilkan_jawaban !== false 
                          ? `Selesai • Nilai: ${existingSession.nilai}` 
                          : 'Selesai (Skor Ditahan)'}
                      </span>
                    </div>
                  ) : isBlocked ? (
                    <div className="px-4 py-3.5 bg-rose-50 border-t border-rose-100 flex items-center justify-center gap-2 text-rose-600 font-bold text-xs">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>AKUN BLOKIR: Hubungi Pengawas Guru untuk Unblock</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleStartExamClick(exam)}
                      className="w-full px-4 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Play className="w-4 h-4" /> Mulai Ujian
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* All Scheduled (non-active) exams */}
        {studentExams.filter(e => e.status !== 'berlangsung' && e.status !== 'selesai').length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Jadwal Mendatang</h2>
            {studentExams.filter(e => e.status !== 'berlangsung' && e.status !== 'selesai').map(exam => (
              <div key={exam.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">{exam.mapel}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">{exam.judul}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{exam.durasi} menit • {(exam.soal_ids || []).length} soal</p>
                </div>
                <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">{exam.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Completed History */}
        {completedSessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Riwayat Nilai</h2>
            {completedSessions.map(sess => {
              const exam = exams.find(e => e.id === sess.ujian_id);
              const isLulus = (sess.nilai || 0) >= (exam?.passing_grade || 75);
              return (
                <div key={sess.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-slate-700">{exam?.judul || 'Ujian'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {sess.waktu_submit ? new Date(sess.waktu_submit).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                   <div className="text-right">
                    {exam?.tampilkan_jawaban !== false ? (
                      <>
                        <span className="text-lg font-bold font-mono text-slate-800">{sess.nilai}</span>
                        <span className={`block text-[10px] font-bold ${isLulus ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {isLulus ? 'LULUS' : 'REMEDIAL'}
                        </span>
                      </>
                    ) : (
                      <span className="inline-block text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                        Selesai (Skor Ditahan)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* === CAMERA CHECK MODAL === */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-center">Cek Kamera</h3>
            </div>
            <div className="aspect-[4/3] bg-black relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {cameraChecked && (
                <div className="absolute bottom-3 left-3 right-3 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  <span>Kamera Terdeteksi & Berfungsi</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <button 
                onClick={handleCloseCameraModal} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {cameraChecked ? 'Tutup — Kamera Siap' : 'Tutup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === TOKEN MODAL (Premium Glassmorphism Center Screen) === */}
      {tokenModalExam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 border border-slate-100 w-full max-w-md rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(37,99,235,0.15)] transform transition-all duration-300">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
                <Key className="w-7 h-7 text-white animate-pulse" />
              </div>
              <h3 className="text-white font-extrabold text-xl tracking-tight">Verifikasi Token Ujian</h3>
              <p className="text-blue-100/90 text-xs font-medium mt-1 uppercase tracking-wider">{tokenModalExam.mapel}</p>
            </div>
            
            <form onSubmit={handleVerifyToken} className="p-6 space-y-6">
              {/* Exam Specs Box */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Ujian:</span>
                  <span className="text-slate-700 font-bold text-right truncate max-w-[200px]">{tokenModalExam.judul}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Durasi:</span>
                  <span className="text-slate-700 font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-500" /> {tokenModalExam.durasi} Menit</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Batas Telat:</span>
                  <span className="text-slate-700 font-bold flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-indigo-500" /> {tokenModalExam.late_limit ?? 15} Menit</span>
                </div>
              </div>

              {/* Input Area */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block text-center">MASUKKAN TOKEN AKTIF</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  maxLength={10}
                  value={tokenInput} 
                  onChange={e => setTokenInput(e.target.value)} 
                  placeholder="••••••" 
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-2xl py-4 px-4 text-center text-3xl font-mono font-bold tracking-[0.4em] text-slate-800 uppercase outline-none transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setTokenModalExam(null)} 
                  className="flex-1 py-3.5 border-2 border-slate-100 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-sm font-bold rounded-2xl transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-[0_4px_14px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-1"
                >
                  Masuk Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
