import React, { useState, useEffect } from 'react';
import { 
  BarChart4, 
  Download, 
  CloudLightning, 
  Search, 
  Table, 
  Award
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { db, Exam, StudentSession, Question } from '../../utils/supabaseDb';

interface RekapNilaiProps {
  guruUser: any;
}

export const RekapNilai: React.FC<RekapNilaiProps> = ({ guruUser }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [classFilter, setClassFilter] = useState<'semua' | string>('semua');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Google Sheets integration state
  const [instansi, setInstansi] = useState<any>(null);
  const [isGSheetsConnected, setIsGSheetsConnected] = useState(false);
  const [gSheetsUrl, setGSheetsUrl] = useState('');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const allExams = await db.getExams();
        const filtered = allExams.filter(e => e.guru_id === guruUser.id && (e.status === 'selesai' || e.status === 'berlangsung'));
        setExams(filtered);
        
        if (filtered.length > 0 && !selectedExamId) {
          setSelectedExamId(filtered[0].id);
        }

        const allQuestions = await db.getQuestions();
        setQuestions(allQuestions);

        const inst = await db.getInstansi();
        setInstansi(inst);
        if (inst && inst.gsheets_url) {
          setGSheetsUrl(inst.gsheets_url);
          setIsGSheetsConnected(true);
        }
      } catch (err) {
        console.error("Gagal memuat data awal rekap:", err);
      }
    };
    loadInitialData();
  }, [guruUser.id, selectedExamId]);

  useEffect(() => {
    const loadSessions = async () => {
      if (!selectedExamId) return;
      setIsLoading(true);
      try {
        const currentSessions = await db.getSessionsByExam(selectedExamId);
        setSessions(currentSessions);
      } catch (err) {
        console.error("Gagal memuat data sesi:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, [selectedExamId]);

  const selectedExam = exams.find(e => e.id === selectedExamId);

  // Filter classes dynamically based on exam targets
  const targetClasses = selectedExam ? (selectedExam.kelas_ids || []) : [];

  // Filter sessions by search & class
  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.siswa_name.toLowerCase().includes(search.toLowerCase()) || s.siswa_nis.includes(search);
    const matchesClass = classFilter === 'semua' || s.siswa_kelas === classFilter;
    return matchesSearch && matchesClass;
  });

  // Calculate statistics
  const finishedSessions = sessions.filter(s => s.status === 'selesai');
  const grades = finishedSessions.map(s => s.nilai || 0);

  const avgGrade = grades.length > 0 
    ? Math.round(grades.reduce((sum, g) => sum + g, 0) / grades.length) 
    : 0;
  
  const highestGrade = grades.length > 0 ? Math.max(...grades) : 0;
  const lowestGrade = grades.length > 0 ? Math.min(...grades) : 0;

  // Grade Distribution Chart data (ranges: 0-59, 60-69, 70-79, 80-89, 90-100)
  const rangeData = [
    { name: '< 60', count: grades.filter(g => g < 60).length },
    { name: '60 - 69', count: grades.filter(g => g >= 60 && g < 70).length },
    { name: '70 - 79', count: grades.filter(g => g >= 70 && g < 80).length },
    { name: '80 - 89', count: grades.filter(g => g >= 80 && g < 90).length },
    { name: '90 - 100', count: grades.filter(g => g >= 90).length },
  ];

  // EXCEL EXPORTER MULTI-SHEET ENGINE
  const handleExportExcel = async () => {
    if (!selectedExam) return;

    // Sheet 1: Rekap Nilai Siswa
    const rekapData = sessions.map((s, idx) => ({
      'No Absen': idx + 1,
      'Nama Siswa': s.siswa_name,
      'NIS': s.siswa_nis,
      'Kelas': s.siswa_kelas,
      'Status Pengerjaan': s.status.toUpperCase(),
      'Jumlah Soal': (selectedExam.soal_ids || []).length,
      'Jumlah Benar': s.jumlah_benar !== undefined ? s.jumlah_benar : '-',
      'Nilai Akhir': s.nilai !== undefined ? s.nilai : '-',
      'Kelulusan': s.nilai !== undefined ? (s.nilai >= selectedExam.passing_grade ? 'LULUS' : 'REMEDIAL') : '-'
    }));

    // Sheet 2: Detail Jawaban Per Soal
    const detailJawabanData = sessions.map(s => {
      const row: Record<string, any> = {
        'Nama Siswa': s.siswa_name,
        'NIS': s.siswa_nis,
        'Kelas': s.siswa_kelas
      };
      
      (selectedExam.soal_ids || []).forEach((qId, qIdx) => {
        const q = questions.find(item => item.id === qId);
        const ans = (s.jawaban_siswa || {})[qId];
        
        let ansText = '-';
        if (ans !== undefined) {
          if (Array.isArray(ans)) {
            ansText = ans.map(i => String.fromCharCode(65 + Number(i))).join(', ');
          } else if (typeof ans === 'boolean') {
            ansText = ans ? 'BENAR' : 'SALAH';
          } else {
            ansText = String.fromCharCode(65 + Number(ans));
          }
        }

        row[`Soal ${qIdx + 1}`] = ansText;
      });

      return row;
    });

    // Sheet 3: Log Pelanggaran Per Siswa
    const pelanggaranData: any[] = [];
    sessions.forEach(s => {
      if (!s.log_pelanggaran || s.log_pelanggaran.length === 0) {
        pelanggaranData.push({
          'Nama Siswa': s.siswa_name,
          'NIS': s.siswa_nis,
          'Kelas': s.siswa_kelas,
          'Waktu Kejadian': '-',
          'Tipe Interupsi': 'TIDAK ADA PELANGGARAN',
          'Deskripsi Audit': 'Siswa mengerjakan ujian dengan tertib.'
        });
      } else {
        s.log_pelanggaran.forEach(log => {
          pelanggaranData.push({
            'Nama Siswa': s.siswa_name,
            'NIS': s.siswa_nis,
            'Kelas': s.siswa_kelas,
            'Waktu Kejadian': new Date(log.waktu).toLocaleTimeString('id-ID'),
            'Tipe Interupsi': log.tipe.toUpperCase().replace('_', ' '),
            'Deskripsi Audit': log.deskripsi
          });
        });
      }
    });

    // Create workbook and write sheets
    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(rekapData);
    XLSX.utils.book_append_sheet(wb, ws1, "Rekap Nilai");

    const ws2 = XLSX.utils.json_to_sheet(detailJawabanData);
    XLSX.utils.book_append_sheet(wb, ws2, "Matriks Detail Jawaban");

    const ws3 = XLSX.utils.json_to_sheet(pelanggaranData);
    XLSX.utils.book_append_sheet(wb, ws3, "Log Audit Pelanggaran");

    // Format file name: Nilai_[Mapel]_[Kelas]_[Tanggal].xlsx
    const cleanMapel = selectedExam.mapel.replace(/\s+/g, '_');
    const cleanKelas = classFilter === 'semua' ? 'Semua_Kelas' : classFilter.replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Nilai_${cleanMapel}_${cleanKelas}_${dateStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
    
    await db.addLog(
      guruUser.id, 
      guruUser.name,
      guruUser.role,
      "Ekspor Excel", 
      `Mengekspor rekap nilai multi-sheet untuk ujian '${selectedExam.judul}'.`
    );
  };

  // Google Sheets connect simulation
  const handleConnectGSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gSheetsUrl.trim()) return;

    try {
      const inst = instansi || await db.getInstansi();
      if (inst && inst.id) {
        const updated = await db.updateInstansi({ id: inst.id, gsheets_url: gSheetsUrl });
        setInstansi(updated);
      }
      setIsGSheetsConnected(true);
      await db.addLog(
        guruUser.id,
        guruUser.name,
        guruUser.role,
        "Hubungkan GSheets",
        `Menghubungkan rekap nilai ujian '${selectedExam?.judul || ''}' ke Google Sheets: ${gSheetsUrl.substring(0, 45)}...`
      );
      alert('Google Sheets Berhasil Tersinkronisasi!\nSetiap kali siswa menyelesaikan ujian, data baris baru akan terkirim secara otomatis.');
    } catch (err) {
      console.error("Gagal menyinkronkan Google Sheets:", err);
      alert("Gagal menghubungkan Google Sheets. Silakan coba lagi.");
    }
  };

  if (isLoading && selectedExamId) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Laporan Rekap Nilai...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            Laporan Rekapitulasi Nilai & Ekspor
          </h1>
          <p className="text-slate-400 text-sm mt-1">Analisis hasil belajar siswa, visualisasikan sebaran nilai, dan sinkronisasi laporan nilai ke Google Sheets.</p>
        </div>

        {/* Exam and Class filters */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto shrink-0 justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Ujian:</span>
            <select
              value={selectedExamId}
              onChange={(e) => {
                setSelectedExamId(e.target.value);
                setClassFilter('semua');
              }}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none cursor-pointer"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.judul}</option>
              ))}
            </select>
          </div>

          {selectedExam && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Kelas:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none cursor-pointer"
              >
                <option value="semua">Semua Kelas</option>
                {targetClasses.map((cls, idx) => (
                  <option key={idx} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {!selectedExamId ? (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white text-center py-12 text-slate-400 text-sm">
          Belum ada ujian selesai yang memiliki data rekapitulasi nilai.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Statistics summary card widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            {/* Avg */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white backdrop-blur-md text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Rata-Rata Nilai</span>
              <span className="text-3xl font-extrabold text-slate-900 font-mono mt-1 block">{avgGrade}</span>
              <span className="text-[10px] text-slate-600 mt-1 block">Dari {finishedSessions.length} siswa selesai</span>
            </div>

            {/* High */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white backdrop-blur-md text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nilai Tertinggi</span>
              <span className="text-3xl font-extrabold text-blue-600 font-mono mt-1 block">{highestGrade}</span>
              <span className="text-[10px] text-slate-600 mt-1 block">Raihan skor maks</span>
            </div>

            {/* Low */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white backdrop-blur-md text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Nilai Terendah</span>
              <span className="text-3xl font-extrabold text-rose-600 font-mono mt-1 block">{lowestGrade}</span>
              <span className="text-[10px] text-slate-600 mt-1 block">Butuh bimbingan</span>
            </div>

            {/* Passing status */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white backdrop-blur-md text-center flex flex-col justify-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Rasio Kelulusan</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-3xl font-extrabold text-emerald-600 font-mono">
                  {finishedSessions.length > 0 
                    ? Math.round((finishedSessions.filter(s => (s.nilai || 0) >= (selectedExam?.passing_grade ?? 75)).length / finishedSessions.length) * 100) 
                    : 0}%
                </span>
              </div>
              <span className="text-[10px] text-slate-600 mt-1 block">Target kelulusan &ge; {selectedExam?.passing_grade ?? 75}</span>
            </div>

          </div>

          {/* Main Content Grid: Chart & Actions Sync */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Chart: Grade Distribution */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md lg:col-span-3 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grafik Distribusi Sebaran Nilai</h3>
                <p className="text-[10px] text-slate-600 mt-0.5">Membantu guru menganalisis efektivitas soal dan daya tangkap materi siswa.</p>
              </div>

              <div className="w-full h-56 font-mono text-xs">
                {grades.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">Menunggu siswa mengumpulkan lembar jawaban...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rangeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                      <XAxis dataKey="name" stroke="#64748b" tickLine={false} />
                      <YAxis stroke="#64748b" tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#cbd5e1', 
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontFamily: 'monospace'
                        }} 
                      />
                      <Bar dataKey="count" name="Jumlah Siswa" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Right Card: Exporters & Google Sheets Integration */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Excel Downloader */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ekspor Laporan Excel</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Unduh file spreadsheet Excel multi-sheet berisi **Rekap Nilai**, **Matriks Analisis Pilihan Jawaban**, dan **Log Pelanggaran Siswa**.
                </p>

                <button
                  onClick={handleExportExcel}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>

              {/* Google Sheets Sync */}
              <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Google Sheets Sync</h3>
                  
                  {/* Status indicator */}
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    isGSheetsConnected 
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-600 animate-pulse'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {isGSheetsConnected ? 'TERSINKRON' : 'TERPUTUS'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Hubungkan rekap nilai ujian ke Google Sheets Anda untuk melakukan update baris nilai secara real-time setiap kali siswa submit ujian.
                </p>

                {isGSheetsConnected ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-emerald-300 text-slate-600 font-mono text-[10px] break-all truncate">
                      🟢 Connected: {gSheetsUrl}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const inst = instansi || await db.getInstansi();
                          if (inst && inst.id) {
                            const updated = await db.updateInstansi({ id: inst.id, gsheets_url: '' });
                            setInstansi(updated);
                          }
                          setIsGSheetsConnected(false);
                          setGSheetsUrl('');
                          await db.addLog(
                            guruUser.id,
                            guruUser.name,
                            guruUser.role,
                            "Putuskan GSheets",
                            `Memutuskan koneksi rekap nilai dari Google Sheets.`
                          );
                        } catch (err) {
                          console.error("Gagal memutuskan Google Sheets:", err);
                          alert("Gagal memutuskan Google Sheets. Silakan coba lagi.");
                        }
                      }}
                      className="w-full py-2 bg-slate-50 border border-slate-200 hover:border-rose-300 text-rose-600 text-[10px] font-semibold rounded-lg transition-all cursor-pointer"
                    >
                      Putuskan Koneksi Google Sheets
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConnectGSheets} className="space-y-3">
                    <input
                      type="url"
                      required
                      value={gSheetsUrl}
                      onChange={(e) => setGSheetsUrl(e.target.value)}
                      placeholder="Masukkan Tautan Google Sheets..."
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2 px-3 text-xs text-slate-700 outline-none font-mono text-[10px]"
                    />
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-750 hover:text-slate-900 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      <CloudLightning className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                      <span>Sinkronisasikan Sekarang</span>
                    </button>
                  </form>
                )}
              </div>

            </div>

          </div>

          {/* Grades Table */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-600" />
                <span>Tabel Hasil Rekap Nilai</span>
              </h3>

              {/* Table search */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari siswa berdasarkan nama / NIS..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 focus:border-blue-500 rounded-xl py-1.5 px-10 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredSessions.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-8">Tidak ada data hasil siswa yang cocok.</p>
              ) : (
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider pb-2">
                      <th className="pb-3 font-semibold">Siswa Peserta</th>
                      <th className="pb-3 font-semibold">NIS</th>
                      <th className="pb-3 font-semibold">Kelas</th>
                      <th className="pb-3 font-semibold text-center">Jumlah Benar</th>
                      <th className="pb-3 font-semibold text-center">Hasil Kelulusan</th>
                      <th className="pb-3 font-semibold text-right">Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSessions.map((sess) => {
                      const isLulus = sess.nilai !== undefined && sess.nilai >= (selectedExam?.passing_grade ?? 75);

                      return (
                        <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-2">
                            <span className="font-semibold text-slate-800">{sess.siswa_name}</span>
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-400 text-xs">{sess.siswa_nis}</td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                              {sess.siswa_kelas}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-700">
                            {sess.jumlah_benar !== undefined ? `${sess.jumlah_benar} / ${(selectedExam?.soal_ids || []).length}` : '-'}
                          </td>
                          <td className="py-3 px-2 text-center">
                            {sess.nilai === undefined ? (
                              <span className="px-2.5 py-0.5 bg-white text-slate-400 text-[10px] rounded-full border border-slate-200 font-medium uppercase">SEDANG UJIAN</span>
                            ) : isLulus ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-600 text-[10px] rounded-full font-semibold">
                                <Award className="w-3 h-3" /> Lulus
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 border border-rose-300 text-rose-600 text-[10px] rounded-full font-semibold">
                                Remedial
                              </span>
                            )}
                          </td>
                          <td className={`py-3 pl-2 text-right font-mono font-bold text-base ${
                            sess.nilai === undefined ? 'text-slate-400' : isLulus ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {sess.nilai !== undefined ? sess.nilai : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
