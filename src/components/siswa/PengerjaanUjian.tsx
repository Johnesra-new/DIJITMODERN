import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, ChevronRight, ChevronLeft, Check, X, HelpCircle, Send, Loader2, Lock, Megaphone, AlertCircle
} from 'lucide-react';
import { db, Exam, Question, User as SiswaType } from '../../utils/supabaseDb';
import { supabase } from '../../utils/supabaseClient';

interface PengerjaanUjianProps {
  siswa: SiswaType;
  examId: string;
  onFinish: () => void;
}

export const PengerjaanUjian: React.FC<PengerjaanUjianProps> = ({ siswa, examId, onFinish }) => {
  const [exam, setExam] = useState<Exam | undefined>(undefined);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [unsureQuestions, setUnsureQuestions] = useState<Set<string>>(new Set());
  
  // Timer State (in seconds)
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const questionAreaRef = useRef<HTMLDivElement>(null);

  // Live Real-Time & Broadcast States
  const [sessionWaktuMulai, setSessionWaktuMulai] = useState<string | null>(null);
  const [broadcastPopup, setBroadcastPopup] = useState<string | null>(null);
  const [lastBroadcastSeen, setLastBroadcastSeen] = useState<string>('');

  const sessionWaktuMulaiRef = useRef<string | null>(null);
  const lastBroadcastSeenRef = useRef<string>('');

  useEffect(() => {
    sessionWaktuMulaiRef.current = sessionWaktuMulai;
  }, [sessionWaktuMulai]);

  useEffect(() => {
    lastBroadcastSeenRef.current = lastBroadcastSeen;
  }, [lastBroadcastSeen]);

  const handleDismissBroadcast = () => {
    if (broadcastPopup) {
      setLastBroadcastSeen(broadcastPopup);
      setBroadcastPopup(null);
    }
  };

  // Load Exam & Questions, and create/retrieve Session
  useEffect(() => {
    const loadExamData = async () => {
      try {
        const allExams = await db.getExams();
        const foundExam = allExams.find(e => e.id === examId);
        setExam(foundExam);

        if (foundExam) {
          const allQuestions = await db.getQuestions();
          const filteredQ = allQuestions.filter(q => foundExam.soal_ids?.includes(q.id));
          setQuestions(filteredQ);

          // Retrieve or create Student Session
          let sess = await db.getSessionByStudentAndExam(siswa.id, examId);
          if (!sess) {
            // Create new session
            const newWaktuMulai = new Date().toISOString();
            sess = await db.addSession({
              siswa_id: siswa.id,
              siswa_name: siswa.name,
              siswa_nis: siswa.nip_nis,
              siswa_kelas: siswa.kelas || '',
              ujian_id: examId,
              waktu_mulai: newWaktuMulai,
              jawaban_siswa: {},
              status: 'mengerjakan',
              seed: Math.random(),
              log_pelanggaran: [],
              kamera_snapshots: [],
              kamera_status: 'aman'
            });
            setSessionWaktuMulai(newWaktuMulai);
            const totalDurasi = foundExam.durasi + (foundExam.extended_time || 0);
            setTimeLeft(totalDurasi * 60);
          } else if (sess.status === 'diblokir') {
            alert("Sesi ujian Anda diblokir. Silakan hubungi pengawas.");
            onFinish();
            return;
          } else if (sess.status === 'selesai') {
            alert("Anda sudah menyelesaikan ujian ini.");
            onFinish();
            return;
          } else {
            // Resume session
            setAnswers(sess.jawaban_siswa || {});
            if (sess.waktu_mulai) {
              setSessionWaktuMulai(sess.waktu_mulai);
              const elapsedSeconds = Math.floor((Date.now() - new Date(sess.waktu_mulai).getTime()) / 1000);
              const totalDurasi = foundExam.durasi + (foundExam.extended_time || 0);
              const remaining = Math.max(0, totalDurasi * 60 - elapsedSeconds);
              setTimeLeft(remaining);
            }
          }

          // Check broadcast message on load
          if (foundExam.broadcast_message && foundExam.broadcast_message.trim() !== '') {
            setBroadcastPopup(foundExam.broadcast_message.trim());
          }
        }
      } catch (err) {
        console.error("Gagal memuat ujian:", err);
      }
    };
    loadExamData();
  }, [examId, siswa.id, onFinish]);

  // Realtime WebSockets for Ujian Changes (Extended Time & Broadcasts)
  useEffect(() => {
    if (isLoading || !exam) return;

    const examSubscription = supabase
      .channel(`exam-realtime-${examId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exams',
          filter: `id=eq.${examId}`
        },
        (payload: any) => {
          console.log("Realtime exam update received:", payload);
          const updatedExam = payload.new as Exam;
          setExam(updatedExam);

          if (sessionWaktuMulaiRef.current) {
            const elapsedSeconds = Math.floor((Date.now() - new Date(sessionWaktuMulaiRef.current).getTime()) / 1000);
            const totalDurasiSeconds = (updatedExam.durasi + (updatedExam.extended_time || 0)) * 60;
            const remaining = Math.max(0, totalDurasiSeconds - elapsedSeconds);
            setTimeLeft(remaining);
          }

          if (updatedExam.broadcast_message) {
            const cleanMsg = updatedExam.broadcast_message.trim();
            if (cleanMsg !== '' && cleanMsg !== lastBroadcastSeenRef.current) {
              setBroadcastPopup(cleanMsg);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(examSubscription);
    };
  }, [isLoading, examId]);

  // Loading screen for 5 seconds (50 steps of 100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (isLoading) return;
    if (timeLeft <= 0 && !isSubmitting && exam) {
      handleSubmitExam();
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitting, isLoading, exam]);

  // Cheating detector (Visibility API to block student when leaving app/tab)
  useEffect(() => {
    if (isLoading || !exam) return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        try {
          const sess = await db.getSessionByStudentAndExam(siswa.id, examId);
          if (sess && sess.status === 'mengerjakan') {
            const violation = {
              waktu: new Date().toISOString(),
              tipe: 'keluar_aplikasi' as const,
              deskripsi: 'Siswa meninggalkan aplikasi ujian (pindah tab/aplikasi)'
            };
            const updatedSess = {
              id: sess.id,
              status: 'diblokir' as const,
              log_pelanggaran: [...(sess.log_pelanggaran || []), violation]
            };
            await db.updateSession(updatedSess);
            await db.addLog(siswa.id, siswa.name, siswa.role, "Ujian DIBLOKIR", `Siswa keluar dari ujian ${exam.judul}. Sesi diblokir otomatis.`);
            alert("Ujian Anda telah DIBLOKIR karena mendeteksi perpindahan aplikasi/tab! Hubungi pengawas.");
            onFinish();
          }
        } catch (err) {
          console.error("Gagal memblokir sesi siswa:", err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, examId, siswa.id, exam, onFinish]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const saveAnswerToDb = async (newAnswers: Record<string, any>) => {
    try {
      const sess = await db.getSessionByStudentAndExam(siswa.id, examId);
      if (sess) {
        await db.updateSession({
          id: sess.id,
          jawaban_siswa: newAnswers
        });
      }
    } catch (err) {
      console.error("Gagal menyimpan jawaban ke database:", err);
    }
  };

  // Answer handlers
  const handleAnswerPG = (qId: string, val: string) => {
    const newAns = { ...answers, [qId]: val };
    setAnswers(newAns);
    saveAnswerToDb(newAns);
  };

  const handleAnswerPGK = (qId: string, val: string) => {
    const current = (answers[qId] as string[]) || [];
    let updated: string[];
    if (current.includes(val)) updated = current.filter(item => item !== val);
    else updated = [...current, val];
    const newAns = { ...answers, [qId]: updated };
    setAnswers(newAns);
    saveAnswerToDb(newAns);
  };

  const handleAnswerBS = (qId: string, val: boolean) => {
    const newAns = { ...answers, [qId]: val };
    setAnswers(newAns);
    saveAnswerToDb(newAns);
  };

  const handleAnswerMenjodohkan = (qId: string, rIdx: string, cIdx: string) => {
    const current = (answers[qId] as Record<string, string>) || {};
    const newAns = { ...answers, [qId]: { ...current, [rIdx]: cIdx } };
    setAnswers(newAns);
    saveAnswerToDb(newAns);
  };

  const toggleUnsure = (qId: string) => {
    setUnsureQuestions(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  const isQuestionAnswered = (qId: string): boolean => {
    const ans = answers[qId];
    if (ans === undefined || ans === null || ans === '') return false;
    if (typeof ans === 'object' && !Array.isArray(ans)) return Object.keys(ans).length > 0;
    if (Array.isArray(ans)) return ans.length > 0;
    return true;
  };

  const navigateToQuestion = (idx: number) => {
    setCurrentIndex(idx);
    questionAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    if (!exam) return;

    // Earliest Submit Guard (Kumpul 15 Menit Sebelum Ujian Habis)
    const guardDurationSeconds = Math.min(15, exam.durasi) * 60;
    if (timeLeft > guardDurationSeconds) {
      alert(`Anda belum diperbolehkan mengumpulkan ujian! Tombol kumpulkan hanya akan aktif di 15 menit terakhir ujian.`);
      return;
    }

    setIsSubmitting(true);

    let jumlahBenar = 0;
    let maxScore = 0;
    let earnedScore = 0;

    questions.forEach(q => {
      maxScore += q.bobot;
      const ans = answers[q.id];
      const correct = q.jawaban_benar;
      let isBenar = false;

      if (q.tipe === 'pg' || q.tipe === 'gambar' || q.tipe === 'video') {
        isBenar = ans === correct;
      } else if (q.tipe === 'bs') {
        isBenar = ans === correct;
      } else if (q.tipe === 'pgk') {
        const arrAns = Array.isArray(ans) ? ans : [];
        const arrCorr = Array.isArray(correct) ? correct : [];
        isBenar = arrAns.length === arrCorr.length && arrAns.every(a => arrCorr.includes(a));
      } else if (q.tipe === 'menjodohkan') {
        const mapAns = ans as Record<string, string> || {};
        const mapCorr = correct as Record<string, string> || {};
        const rowKeys = Object.keys(mapCorr);
        isBenar = rowKeys.every(k => mapAns[k] === mapCorr[k]);
      }

      if (isBenar) {
        jumlahBenar++;
        earnedScore += q.bobot;
      }
    });

    const finalScore = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

    try {
      const sess = await db.getSessionByStudentAndExam(siswa.id, examId);
      if (sess) {
        await db.updateSession({
          id: sess.id,
          waktu_submit: new Date().toISOString(),
          nilai: finalScore,
          jumlah_benar: jumlahBenar,
          status: 'selesai'
        });
        await db.addLog(siswa.id, siswa.name, siswa.role, "Submit Ujian", `Menyelesaikan ujian ${exam.judul} dengan nilai ${finalScore}.`);

        // Real Google Sheets sync if enabled by teacher
        try {
          const instConfig = await db.getInstansi();
          if (instConfig && instConfig.gsheets_url) {
            await fetch(instConfig.gsheets_url, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                timestamp: new Date().toLocaleString('id-ID'),
                siswa_name: siswa.name,
                siswa_nis: siswa.nip_nis,
                siswa_kelas: siswa.kelas || '',
                ujian_judul: exam.judul,
                ujian_mapel: exam.mapel,
                jumlah_soal: questions.length,
                jumlah_benar: jumlahBenar,
                nilai: finalScore,
                kelulusan: finalScore >= (exam.passing_grade || 75) ? 'LULUS' : 'REMEDIAL'
              })
            });
            console.log("Google Sheets sync completed!");
          }
        } catch (gErr) {
          console.error("GSheets sync warning:", gErr);
        }
      }
    } catch (err) {
      console.error("Gagal melakukan submit:", err);
    }

    onFinish();
  };

  // === LOADING SCREEN ===
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans px-6">
        <div className="text-center space-y-6 max-w-sm w-full">
          <div className="relative w-20 h-20 mx-auto">
            <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Memuat Ujian...</h2>
            <p className="text-xs text-slate-400 mt-1">{exam?.judul || 'Ujian'} • {exam?.mapel}</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-100" 
              style={{ width: `${loadingProgress}%` }} 
            />
          </div>
          <p className="text-xs text-slate-400 font-mono">{loadingProgress}%</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  if (!exam || !currentQ) return <div className="p-8 text-center text-slate-500">Soal tidak ditemukan.</div>;

  const answeredCount = questions.filter(q => isQuestionAnswered(q.id)).length;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* === STICKY TOP BAR === */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0">
            CBT
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-800 text-xs truncate">{exam.judul}</h1>
            <p className="text-[10px] text-slate-400 truncate">{siswa.name} • {exam.mapel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${
            timeLeft < 300 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* === QUESTION AREA (scrollable) === */}
      <div ref={questionAreaRef} className="flex-1 overflow-y-auto px-4 py-5 pb-48">
        {/* Question Number & Type Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-lg">
            Soal {currentIndex + 1} / {questions.length}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
            {currentQ.tipe === 'pg' ? 'Pilihan Ganda' : 
             currentQ.tipe === 'bs' ? 'Benar / Salah' : 
             currentQ.tipe === 'menjodohkan' ? 'Menjodohkan' :
             currentQ.tipe === 'pgk' ? 'PG Kompleks' : 
             currentQ.tipe}
          </span>
        </div>

        {/* Media */}
        {currentQ.media_url && (
          <div className="mb-5 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
            {currentQ.tipe === 'video' ? (
              <video src={currentQ.media_url} controls className="w-full h-auto max-h-52" />
            ) : (
              <img src={currentQ.media_url} alt="Soal" className="w-full h-auto max-h-52 object-contain" />
            )}
          </div>
        )}

        {/* Question Text */}
        <div className="text-sm text-slate-800 leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: currentQ.pertanyaan }} />

        {/* === ANSWER OPTIONS === */}
        <div className="space-y-2.5">
          {/* PG */}
          {(currentQ.tipe === 'pg' || currentQ.tipe === 'gambar' || currentQ.tipe === 'video') && currentQ.pilihan?.map((pil, idx) => (
            <label key={idx} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all text-sm ${
              answers[currentQ.id] === idx.toString() 
                ? 'border-blue-500 bg-blue-50 text-blue-800' 
                : 'border-slate-100 bg-white hover:bg-slate-50'
            }`}>
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold ${
                answers[currentQ.id] === idx.toString() 
                  ? 'border-blue-500 bg-blue-600 text-white' 
                  : 'border-slate-300 text-slate-400'
              }`}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="flex-1" dangerouslySetInnerHTML={{ __html: pil }} />
              <input type="radio" name={`q-${currentQ.id}`} checked={answers[currentQ.id] === idx.toString()} onChange={() => handleAnswerPG(currentQ.id, idx.toString())} className="sr-only" />
            </label>
          ))}

          {/* PGK */}
          {currentQ.tipe === 'pgk' && currentQ.pilihan?.map((pil, idx) => (
            <label key={idx} className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all text-sm ${
              (answers[currentQ.id] || []).includes(idx.toString()) 
                ? 'border-blue-500 bg-blue-50 text-blue-800' 
                : 'border-slate-100 bg-white hover:bg-slate-50'
            }`}>
              <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 text-xs ${
                (answers[currentQ.id] || []).includes(idx.toString()) 
                  ? 'border-blue-500 bg-blue-600 text-white' 
                  : 'border-slate-300 text-slate-400'
              }`}>
                {(answers[currentQ.id] || []).includes(idx.toString()) ? <Check className="w-4 h-4" /> : String.fromCharCode(65 + idx)}
              </div>
              <span className="flex-1" dangerouslySetInnerHTML={{ __html: pil }} />
              <input type="checkbox" checked={(answers[currentQ.id] || []).includes(idx.toString())} onChange={() => handleAnswerPGK(currentQ.id, idx.toString())} className="sr-only" />
            </label>
          ))}

          {/* B/S */}
          {currentQ.tipe === 'bs' && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleAnswerBS(currentQ.id, true)} className={`p-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                answers[currentQ.id] === true ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}>
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>BENAR</span>
              </button>
              <button onClick={() => handleAnswerBS(currentQ.id, false)} className={`p-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                answers[currentQ.id] === false ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}>
                <X className="w-4 h-4 text-rose-600 shrink-0" />
                <span>SALAH</span>
              </button>
            </div>
          )}

          {/* Menjodohkan */}
          {currentQ.tipe === 'menjodohkan' && currentQ.matching_data && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="py-2 px-2 text-left text-slate-500 font-bold">Pernyataan</th>
                    {currentQ.matching_data.kolom.map((k, i) => (
                      <th key={i} className="py-2 px-1 text-center text-slate-500 font-semibold text-[10px]">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentQ.matching_data.baris.map((b, rIdx) => (
                    <tr key={rIdx} className="border-t border-slate-200">
                      <td className="py-2.5 px-2 font-medium text-slate-700">{b}</td>
                      {currentQ.matching_data!.kolom.map((_, cIdx) => {
                        const checked = (answers[currentQ.id] || {})[rIdx.toString()] === cIdx.toString();
                        return (
                          <td key={cIdx} className="py-2.5 px-1 text-center">
                            <button 
                              onClick={() => handleAnswerMenjodohkan(currentQ.id, rIdx.toString(), cIdx.toString())}
                              className={`w-7 h-7 rounded-full border-2 mx-auto flex items-center justify-center transition-all ${
                                checked ? 'border-blue-500 bg-blue-600' : 'border-slate-300 hover:border-blue-300'
                              }`}
                            >
                              {checked && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Kurang Yakin Toggle */}
        <button 
          onClick={() => toggleUnsure(currentQ.id)}
          className={`mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all w-full justify-center ${
            unsureQuestions.has(currentQ.id) 
              ? 'bg-amber-50 border-amber-300 text-amber-700' 
              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          {unsureQuestions.has(currentQ.id) ? 'Ditandai: Kurang Yakin' : 'Tandai Kurang Yakin'}
        </button>

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-4">
          <button 
            onClick={() => navigateToQuestion(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 bg-white text-slate-600 rounded-xl disabled:opacity-40 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </button>
          {currentIndex < questions.length - 1 ? (
            <button 
              onClick={() => navigateToQuestion(currentIndex + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-semibold"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            (() => {
              const guardDurationSeconds = Math.min(15, exam.durasi) * 60;
              const isLocked = timeLeft > guardDurationSeconds;

              if (isLocked) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl">
                    <div className="flex items-center gap-1 text-slate-700 font-bold text-xs">
                      <Lock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span>Tombol Kumpul Terkunci</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Aktif dalam {formatTime(timeLeft - guardDurationSeconds)}
                    </p>
                  </div>
                );
              }

              return (
                <button 
                  onClick={() => { if(window.confirm(`Kumpulkan ujian? ${answeredCount}/${questions.length} soal terjawab.`)) handleSubmitExam(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-md transition-all"
                >
                  <Send className="w-4 h-4" /> Kumpulkan
                </button>
              );
            })()
          )}
        </div>
      </div>

      {/* === BOTTOM FIXED: Question Number Grid === */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 z-40 safe-area-bottom">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Navigasi Soal</span>
          <span className="text-[10px] font-semibold text-slate-500">{answeredCount}/{questions.length} terjawab</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {questions.map((q, idx) => {
            const answered = isQuestionAnswered(q.id);
            const isUnsure = unsureQuestions.has(q.id);
            const isActive = idx === currentIndex;
            
            return (
              <button 
                key={q.id}
                onClick={() => navigateToQuestion(idx)}
                className={`w-9 h-9 rounded-lg text-xs font-bold font-mono shrink-0 flex items-center justify-center transition-all border-2 ${
                  isActive ? 'border-blue-600 bg-blue-50 text-blue-700 scale-110' :
                  answered && !isUnsure ? 'bg-emerald-500 border-emerald-600 text-white' :
                  isUnsure ? 'bg-amber-100 border-amber-400 text-amber-700' :
                  'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[9px] text-slate-400">
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div> Yakin</div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-amber-100 border border-amber-400 rounded-sm"></div> Kurang Yakin</div>
          <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 bg-slate-50 border border-slate-200 rounded-sm"></div> Belum</div>
        </div>
      </div>

      {/* === BROADCAST POPUP (Premium Overlay) === */}
      {broadcastPopup && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 w-full max-w-md rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] transform transition-all duration-300 scale-100">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
              <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
                <Megaphone className="w-7 h-7 text-white animate-bounce" />
              </div>
              <h3 className="text-white font-extrabold text-lg tracking-tight">PENGUMUMAN GURU PENGAWAS</h3>
              <p className="text-amber-100/90 text-[10px] font-bold mt-1 uppercase tracking-wider">Perhatian untuk Semua Siswa</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 text-center">
                <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                  "{broadcastPopup}"
                </p>
              </div>

              <button 
                onClick={handleDismissBroadcast} 
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
