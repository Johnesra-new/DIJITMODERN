import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Search, Database, Tag, Trash2, Edit, X, Check, HelpCircle, 
  ChevronDown, Settings, Clock, Layers, Calendar, MoreVertical, ArrowLeft, Key,
  UploadCloud, FileSpreadsheet, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, Exam, Question } from '../../utils/supabaseDb';

interface BankUjianMapelProps {
  guruUser: any;
}

export const BankUjianMapel: React.FC<BankUjianMapelProps> = ({ guruUser }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation State: 'list' (shows all exams) | 'detail' (shows exam builder)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  // New Exam Modal State
  const [isNewExamModalOpen, setIsNewExamModalOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamMapel, setNewExamMapel] = useState('IPS');

  // Question Form Modal State
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [tipe, setTipe] = useState<'pg' | 'pgk' | 'bs' | 'video' | 'gambar' | 'menjodohkan'>('pg');
  const [pertanyaan, setPertanyaan] = useState('');
  const [pilihan, setPilihan] = useState<string[]>(['', '', '', '']);
  const [jawabanPG, setJawabanPG] = useState<string>('0');
  const [jawabanPGK, setJawabanPGK] = useState<string[]>([]);
  const [jawabanBS, setJawabanBS] = useState<boolean>(true);
  const [matchingBaris, setMatchingBaris] = useState<string[]>(['Pernyataan 1', 'Pernyataan 2']);
  const [matchingKolom, setMatchingKolom] = useState<string[]>(['Jawaban A', 'Jawaban B']);
  const [jawabanMenjodohkan, setJawabanMenjodohkan] = useState<Record<string, string>>({});
  const [mediaUrl, setMediaUrl] = useState('');
  const [kesulitan, setKesulitan] = useState<'mudah' | 'sedang' | 'sulit'>('sedang');
  const [tagsInput, setTagsInput] = useState('');
  const [bobot, setBobot] = useState<number>(10);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Local state for editing token & duration manually before clicking 'Oke'
  const [tokenInput, setTokenInput] = useState('');
  const [durasiInput, setDurasiInput] = useState<number>(90);

  // States for Excel Question Bulk Import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const questionExcelInputRef = useRef<HTMLInputElement>(null);

  const activeExam = exams.find(e => e.id === activeExamId);
  const activeQuestions = questions.filter(q => activeExam?.soal_ids?.includes(q.id));

  useEffect(() => {
    if (activeExam) {
      setTokenInput(activeExam.token);
      setDurasiInput(activeExam.durasi);
    }
  }, [activeExamId, activeExam?.id]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const ex = await db.getExams();
      const qu = await db.getQuestions();
      setExams(ex);
      setQuestions(qu);
    } catch (err) {
      console.error("Gagal mengambil data dari Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // 6-Character Unique Token Generator
  const generateRandomToken = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let tok = '';
    for (let i = 0; i < 6; i++) {
      tok += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return tok;
  };

  const handleCreateNewExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const threeHoursLater = new Date(now.getTime() + 180 * 60 * 1000);

    const payload: Omit<Exam, 'id'> = {
      guru_id: guruUser.id,
      judul: newExamTitle,
      mapel: newExamMapel,
      kelas_ids: ["XII MIPA 1", "XII MIPA 2", "XII IPS 1", "XII IPS 2"], // Universal default
      deskripsi: '',
      waktu_mulai: oneHourLater.toISOString(),
      waktu_selesai: threeHoursLater.toISOString(),
      durasi: 90,
      soal_ids: [],
      acak_soal: true,
      acak_pilihan: true,
      wajib_kamera: true,
      token_aktif: true,
      kalkulator: false,
      tampilkan_jawaban: false,
      token: generateRandomToken(),
      passing_grade: 75,
      status: 'terjadwal'
    };

    try {
      const created = await db.addExam(payload);
      await refreshData();
      setIsNewExamModalOpen(false);
      setNewExamTitle('');
      setActiveExamId(created.id);
      setViewMode('detail');
    } catch (err) {
      alert("Gagal membuat ujian baru.");
      console.error(err);
    }
  };

  const handleUpdateExam = async (field: keyof Exam, value: any) => {
    if (!activeExam) return;
    const updated = { ...activeExam, [field]: value };
    try {
      await db.updateExam(updated);
      // Update local state without full reload for smoothness
      setExams(prev => prev.map(e => e.id === activeExam.id ? { ...e, [field]: value } : e));
    } catch (err) {
      console.error("Gagal update ujian:", err);
    }
  };

  const handleSaveTokenAndDurasi = async () => {
    if (!activeExam) return;
    const cleanToken = tokenInput.trim().toUpperCase();
    if (!cleanToken) {
      alert("Token tidak boleh kosong!");
      return;
    }
    if (durasiInput <= 0) {
      alert("Durasi harus lebih dari 0 menit!");
      return;
    }
    
    try {
      const updated = { 
        ...activeExam, 
        token: cleanToken, 
        durasi: Number(durasiInput) 
      };
      await db.updateExam(updated);
      setExams(prev => prev.map(e => e.id === activeExam.id ? { ...e, token: cleanToken, durasi: Number(durasiInput) } : e));
      await db.addLog(
        guruUser.id,
        guruUser.name,
        guruUser.role,
        "Update Token & Waktu",
        `Mengubah token ujian '${activeExam.judul}' menjadi '${cleanToken}' dan durasi menjadi ${durasiInput} menit.`
      );
      alert("Pengaturan Token & Durasi Ujian berhasil disimpan!");
    } catch (err) {
      console.error("Gagal menyimpan konfigurasi:", err);
      alert("Gagal menyimpan pengaturan.");
    }
  };

  // === EXCEL SOAL BULK IMPORTER FUNCTIONS ===
  const downloadQuestionTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["Pertanyaan", "Tipe (pg/bs)", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Kunci Jawaban", "Bobot", "Kesulitan"],
      ["Siapakah presiden pertama Indonesia?", "pg", "Soekarno", "Soeharto", "B.J. Habibie", "Abdurrahman Wahid", "0", "10", "mudah"],
      ["Ibukota Indonesia saat ini adalah Jakarta.", "bs", "", "", "", "", "BENAR", "10", "mudah"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, "Template_Import_Soal.xlsx");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragOver(true);
    } else if (e.type === "dragleave") {
      setDragOver(false);
    }
  };

  const parseQuestionExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
          setImportErrors(["File Excel kosong."]);
          return;
        }

        // Headers
        const headers = jsonData[0].map((h: any) => String(h).trim().toLowerCase());
        const required = ['pertanyaan', 'tipe (pg/bs)', 'kunci jawaban'];
        const missing = required.filter(r => !headers.includes(r));
        if (missing.length > 0) {
          setImportErrors([`Format header Excel tidak valid. Kolom wajib: Pertanyaan, Tipe (pg/bs), Kunci Jawaban`]);
          return;
        }

        const parsedQuestions: any[] = [];
        const errors: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const cols = jsonData[i];
          if (!cols || cols.length === 0) continue;

          const rowData: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            rowData[h] = cols[idx] !== undefined ? String(cols[idx]).trim() : '';
          });

          const pertanyaan = rowData['pertanyaan'];
          const tipeRaw = rowData['tipe (pg/bs)'];
          const keyRaw = rowData['kunci jawaban'];
          const bobotRaw = rowData['bobot'] || '10';
          const kesulitanRaw = rowData['kesulitan'] || 'sedang';

          if (!pertanyaan || !tipeRaw || keyRaw === '') {
            errors.push(`Baris ${i + 1}: Data Pertanyaan, Tipe, dan Kunci Jawaban tidak boleh kosong.`);
            continue;
          }

          const tipe = tipeRaw.toLowerCase() === 'bs' ? 'bs' : 'pg';
          let bobot = Number(bobotRaw);
          if (isNaN(bobot)) bobot = 10;
          
          let kesulitan = kesulitanRaw.toLowerCase() as 'mudah' | 'sedang' | 'sulit';
          if (kesulitan !== 'mudah' && kesulitan !== 'sedang' && kesulitan !== 'sulit') {
            kesulitan = 'sedang';
          }

          let pilihan: string[] | undefined = undefined;
          let jawaban_benar: any = '';

          if (tipe === 'pg') {
            const opA = rowData['opsi a'] || '';
            const opB = rowData['opsi b'] || '';
            const opC = rowData['opsi c'] || '';
            const opD = rowData['opsi d'] || '';
            pilihan = [opA, opB, opC, opD];
            
            if (keyRaw === '0' || keyRaw === '1' || keyRaw === '2' || keyRaw === '3') {
              jawaban_benar = keyRaw;
            } else if (keyRaw.toUpperCase() === 'A') jawaban_benar = '0';
            else if (keyRaw.toUpperCase() === 'B') jawaban_benar = '1';
            else if (keyRaw.toUpperCase() === 'C') jawaban_benar = '2';
            else if (keyRaw.toUpperCase() === 'D') jawaban_benar = '3';
            else {
              errors.push(`Baris ${i + 1}: Kunci jawaban Pilihan Ganda harus 0, 1, 2, 3 atau A, B, C, D.`);
              continue;
            }
          } else if (tipe === 'bs') {
            const upperKey = keyRaw.toUpperCase();
            if (upperKey === 'BENAR' || upperKey === 'TRUE' || upperKey === '1' || upperKey === 'Y') {
              jawaban_benar = true;
            } else if (upperKey === 'SALAH' || upperKey === 'FALSE' || upperKey === '0' || upperKey === 'N') {
              jawaban_benar = false;
            } else {
              errors.push(`Baris ${i + 1}: Kunci jawaban Benar/Salah harus berupa BENAR atau SALAH.`);
              continue;
            }
          }

          parsedQuestions.push({
            tipe,
            pertanyaan,
            pilihan,
            jawaban_benar,
            bobot,
            kesulitan,
            tags: ['import-excel']
          });
        }

        setImportPreview(parsedQuestions);
        setImportErrors(errors);
      } catch (err) {
        console.error("Gagal membaca file Excel:", err);
        setImportErrors(["Gagal memproses file Excel. Pastikan formatnya benar."]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveImportedQuestions = async () => {
    if (importPreview.length === 0 || !activeExam) return;

    try {
      let updatedExamSoalIds = [...(activeExam.soal_ids || [])];
      
      for (const q of importPreview) {
        const payload = {
          guru_id: guruUser.id,
          tipe: q.tipe as 'pg' | 'pgk' | 'bs' | 'video' | 'gambar' | 'menjodohkan',
          pertanyaan: q.pertanyaan,
          pilihan: q.pilihan,
          jawaban_benar: q.jawaban_benar,
          bobot: q.bobot,
          kesulitan: q.kesulitan as 'mudah' | 'sedang' | 'sulit',
          tags: q.tags
        };
        const newQ = await db.addQuestion(payload);
        updatedExamSoalIds.push(newQ.id);
      }

      const updatedExam = { ...activeExam, soal_ids: updatedExamSoalIds };
      await db.updateExam(updatedExam);
      
      await db.addLog(
        guruUser.id,
        guruUser.name,
        guruUser.role,
        "Impor Soal Excel",
        `Mengimpor ${importPreview.length} soal secara massal dari Excel ke ujian '${activeExam.judul}'.`
      );

      setIsImportModalOpen(false);
      setImportPreview([]);
      setImportErrors([]);
      await refreshData();
      alert(`Berhasil mengimpor ${importPreview.length} soal ke dalam ujian!`);
    } catch (err) {
      console.error("Gagal menyimpan soal hasil impor:", err);
      alert("Terjadi kesalahan saat menyimpan soal ke database.");
    }
  };

  const handleDeleteExam = async (id: string) => {
    if(window.confirm("Yakin ingin menghapus ujian/mapel ini beserta seluruh soalnya?")) {
      try {
        await db.deleteExam(id);
        await refreshData();
      } catch (err) {
        alert("Gagal menghapus ujian.");
        console.error(err);
      }
    }
  };

  // === QUESTION BUILDER METHODS ===
  const openAddQuestionModal = () => {
    setTipe('pg');
    setPertanyaan('');
    setPilihan(['', '', '', '']);
    setJawabanPG('0');
    setJawabanPGK([]);
    setJawabanBS(true);
    setMatchingBaris(['Pernyataan 1', 'Pernyataan 2']);
    setMatchingKolom(['Jawaban A', 'Jawaban B']);
    setJawabanMenjodohkan({});
    setMediaUrl('');
    setKesulitan('sedang');
    setTagsInput('');
    setBobot(10);
    setIsAddQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pertanyaan.trim() || !activeExam) return;

    let jawaban_benar: any = '';
    if (tipe === 'pg' || tipe === 'video' || tipe === 'gambar') jawaban_benar = jawabanPG;
    else if (tipe === 'pgk') jawaban_benar = jawabanPGK;
    else if (tipe === 'bs') jawaban_benar = jawabanBS;
    else if (tipe === 'menjodohkan') jawaban_benar = jawabanMenjodohkan;

    const questionPayload: Omit<Question, 'id'> = {
      guru_id: guruUser.id,
      tipe, pertanyaan, kesulitan, bobot: Number(bobot), jawaban_benar,
      tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
      media_url: (tipe === 'video' || tipe === 'gambar') ? mediaUrl : undefined,
      pilihan: (tipe === 'pg' || tipe === 'pgk' || tipe === 'video' || tipe === 'gambar') ? pilihan : undefined,
      matching_data: (tipe === 'menjodohkan') ? { baris: matchingBaris, kolom: matchingKolom } : undefined
    };

    try {
      const newQ = await db.addQuestion(questionPayload);
      
      // Auto attach to current exam
      const examSoalIds = activeExam.soal_ids || [];
      const updatedExam = { ...activeExam, soal_ids: [...examSoalIds, newQ.id] };
      await db.updateExam(updatedExam);
      
      await refreshData();
      setIsAddQuestionModalOpen(false);
    } catch (err) {
      alert("Gagal menyimpan soal.");
      console.error(err);
    }
  };

  const handleRemoveQuestionFromExam = async (qId: string) => {
    if (!activeExam) return;
    if (window.confirm("Hapus soal ini dari ujian?")) {
      try {
        const updatedExam = { 
          ...activeExam, 
          soal_ids: (activeExam.soal_ids || []).filter(id => id !== qId) 
        };
        await db.updateExam(updatedExam);
        await db.deleteQuestion(qId);
        await refreshData();
      } catch (err) {
        alert("Gagal menghapus soal.");
        console.error(err);
      }
    }
  };

  // === RENDERERS ===

  if (isLoading && viewMode === 'list') {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Bank Ujian Mapel...</p>
      </div>
    );
  }

  if (viewMode === 'detail' && activeExam) {
    return (
      <div className="space-y-6 animate-fade-in font-sans">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
          <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{activeExam.judul}</h1>
            <p className="text-slate-500 text-xs mt-0.5">Pengaturan Ujian & Manajemen Soal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Pengaturan Ujian */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 sticky top-6">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" />
                Konfigurasi Ujian
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Judul Ujian</label>
                  <input type="text" value={activeExam.judul} onChange={e => handleUpdateExam('judul', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-700 outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Durasi (Menit)</label>
                  <input type="number" value={durasiInput} onChange={e => setDurasiInput(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-700 outline-none focus:border-blue-500 font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                  <select value={activeExam.status} onChange={e => handleUpdateExam('status', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-700 outline-none focus:border-blue-500">
                    <option value="draft">Draft</option>
                    <option value="terjadwal">Terjadwal</option>
                    <option value="berlangsung">Berlangsung</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={activeExam.acak_soal} onChange={e => handleUpdateExam('acak_soal', e.target.checked)} className="accent-blue-600" />
                  Acak Urutan Soal
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={activeExam.wajib_kamera} onChange={e => handleUpdateExam('wajib_kamera', e.target.checked)} className="accent-blue-600" />
                  Wajib Kamera Pengawas
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={activeExam.tampilkan_jawaban !== false} onChange={e => handleUpdateExam('tampilkan_jawaban', e.target.checked)} className="accent-blue-600" />
                  Tampilkan Nilai & Hasil ke Siswa
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 bg-blue-50/50 -mx-5 -mb-5 p-5 rounded-b-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Token Akses Ujian</label>
                  <button 
                    onClick={() => {
                      const newToken = generateRandomToken();
                      setTokenInput(newToken);
                    }} 
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Regenerate
                  </button>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={tokenInput} 
                    onChange={e => setTokenInput(e.target.value.toUpperCase())} 
                    className="flex-1 bg-white border border-slate-200 rounded-lg py-2 px-3 text-center text-sm font-mono font-bold text-blue-700 tracking-wider outline-none focus:border-blue-500 uppercase"
                    placeholder="TOKEN"
                    maxLength={15}
                  />
                  <button 
                    onClick={handleSaveTokenAndDurasi}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Oke
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Panel Daftar Soal */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Daftar Soal</h3>
                <p className="text-xs text-slate-500">Total {activeQuestions.length} soal dalam ujian ini.</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-slate-500" /> Impor Excel
                </button>
                <button onClick={openAddQuestionModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer">
                  <Plus className="w-4 h-4" /> Tambah Soal
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {activeQuestions.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-400 text-sm">
                  Belum ada soal. Klik tombol "Tambah Soal" untuk mulai.
                </div>
              ) : (
                activeQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex gap-4">
                    <div className="font-mono text-sm font-bold text-slate-400 shrink-0 mt-0.5">{idx + 1}.</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{q.tipe}</span>
                        <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Bobot: {q.bobot}</span>
                      </div>
                      <div className="text-sm text-slate-800 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: q.pertanyaan }} />
                      
                      {q.tipe === 'menjodohkan' && q.matching_data && (
                        <div className="mt-3 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="font-bold text-slate-500 block mb-1">Preview Menjodohkan:</span>
                          {q.matching_data.baris.length} Baris x {q.matching_data.kolom.length} Kolom
                        </div>
                      )}
                      {q.pilihan && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.pilihan.map((pil, pIdx) => (
                            <div key={pIdx} className={`p-1.5 rounded border ${
                              (Array.isArray(q.jawaban_benar) ? q.jawaban_benar.includes(pIdx.toString()) : q.jawaban_benar === pIdx.toString())
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium' : 'bg-white border-slate-200 text-slate-600'
                            }`}>
                              {String.fromCharCode(65 + pIdx)}. {pil}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleRemoveQuestionFromExam(q.id)} className="shrink-0 p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer self-start">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* MODAL TAMBAH SOAL */}
        {isAddQuestionModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Buat Soal Baru</h3>
                <button onClick={() => setIsAddQuestionModalOpen(false)} className="text-slate-400 hover:text-slate-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipe Soal</label>
                    <select value={tipe} onChange={(e) => setTipe(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
                      <option value="pg">Pilihan Ganda</option>
                      <option value="menjodohkan">Menjodohkan</option>
                      <option value="bs">Benar/Salah</option>
                      <option value="gambar">Gambar</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bobot</label>
                    <input type="number" value={bobot} onChange={e => setBobot(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pertanyaan</label>
                  <textarea value={pertanyaan} onChange={e => setPertanyaan(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs min-h-[100px]" placeholder="Ketik soal disini..."></textarea>
                </div>

                {tipe === 'gambar' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Unggah Gambar Soal</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      disabled={isUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setIsUploading(true);
                          try {
                            const path = `soal/${Date.now()}_${file.name}`;
                            const url = await db.uploadMedia(file, path);
                            setMediaUrl(url);
                            alert("Gambar berhasil diunggah ke Supabase Storage!");
                          } catch (err) {
                            alert("Gagal mengunggah gambar.");
                            console.error(err);
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      }}
                      className="bg-white border border-slate-200 rounded-lg p-2 text-xs w-full cursor-pointer"
                    />
                    {isUploading && <p className="text-xs text-blue-600 animate-pulse font-medium">Sedang mengunggah ke cloud...</p>}
                    {mediaUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-white p-2">
                        <img src={mediaUrl} alt="Preview Upload" className="max-h-40 mx-auto object-contain" />
                      </div>
                    )}
                  </div>
                )}

                {(tipe === 'pg' || tipe === 'gambar') && (
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {pilihan.map((pil, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-500">Opsi {String.fromCharCode(65 + idx)}</span>
                          <input type="radio" checked={jawabanPG === idx.toString()} onChange={() => setJawabanPG(idx.toString())} className="w-3.5 h-3.5 accent-blue-600" />
                        </div>
                        <input type="text" value={pil} onChange={(e) => { const newP = [...pilihan]; newP[idx] = e.target.value; setPilihan(newP); }} className="w-full p-2 text-xs border border-slate-200 rounded-lg" />
                      </div>
                    ))}
                  </div>
                )}

                {/* MENJODOHKAN SIMPLE BUILDER */}
                {tipe === 'menjodohkan' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-500">BARIS (Pernyataan)</span>
                          <button onClick={() => setMatchingBaris([...matchingBaris, `Baris ${matchingBaris.length + 1}`])} className="text-[10px] text-blue-600 font-bold">+ Tambah</button>
                        </div>
                        {matchingBaris.map((b, i) => (
                          <input key={i} type="text" value={b} onChange={e => {const nb=[...matchingBaris]; nb[i]=e.target.value; setMatchingBaris(nb);}} className="w-full mb-1 p-1.5 text-xs border rounded-md" />
                        ))}
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-500">KOLOM (Jawaban)</span>
                          <button onClick={() => setMatchingKolom([...matchingKolom, `Kolom ${matchingKolom.length + 1}`])} className="text-[10px] text-blue-600 font-bold">+ Tambah</button>
                        </div>
                        {matchingKolom.map((k, i) => (
                          <input key={i} type="text" value={k} onChange={e => {const nk=[...matchingKolom]; nk[i]=e.target.value; setMatchingKolom(nk);}} className="w-full mb-1 p-1.5 text-xs border rounded-md" />
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-200 overflow-x-auto">
                      <span className="text-[10px] font-bold text-slate-500 block mb-2">PILIH KUNCI JAWABAN</span>
                      <table className="w-full text-xs">
                        <thead><tr><th></th>{matchingKolom.map((k,i)=><th key={i} className="p-1 font-normal text-slate-500 truncate max-w-[80px]">{k}</th>)}</tr></thead>
                        <tbody>
                          {matchingBaris.map((b, rIdx) => (
                            <tr key={rIdx}>
                              <td className="p-1 font-medium">{b}</td>
                              {matchingKolom.map((_, cIdx) => (
                                <td key={cIdx} className="text-center">
                                  <input type="radio" checked={jawabanMenjodohkan[rIdx.toString()] === cIdx.toString()} onChange={() => setJawabanMenjodohkan({...jawabanMenjodohkan, [rIdx.toString()]: cIdx.toString()})} className="accent-blue-600" />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setIsAddQuestionModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">Batal</button>
                <button onClick={handleSaveQuestion} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md">Simpan Soal</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL IMPOR SOAL */}
        {isImportModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Impor Soal dari Excel / CSV</span>
                </h3>
                <button onClick={() => { setIsImportModalOpen(false); setImportPreview([]); setImportErrors([]); }} className="text-slate-400 hover:text-slate-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                
                {/* Download Template & Drag-drop area */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 font-sans">Gunakan Templat Excel</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Unduh templat standar agar sistem dapat mendeteksi format soal dengan benar.</p>
                  </div>
                  <button 
                    onClick={downloadQuestionTemplate} 
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh Templat
                  </button>
                </div>

                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) parseQuestionExcel(file);
                  }}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragOver ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-xs font-semibold text-slate-700">Drag & Drop file Excel (.xlsx) disini</p>
                  <p className="text-[10px] text-slate-500 mt-1">atau klik tombol di bawah untuk memilih file</p>
                  <input 
                    type="file"
                    ref={questionExcelInputRef}
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) parseQuestionExcel(file);
                    }}
                  />
                  <button 
                    onClick={() => questionExcelInputRef.current?.click()}
                    className="mt-4 px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Pilih File Excel
                  </button>
                </div>

                {/* Parsing errors */}
                {importErrors.length > 0 && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Kesalahan Parsing:</span>
                    <ul className="list-disc list-inside text-[10px] text-rose-600 space-y-1">
                      {importErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                  </div>
                )}

                {/* Question Import Preview */}
                {importPreview.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pratinjau ({importPreview.length} Soal Terdeteksi):</span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Format Valid</span>
                      </span>
                    </div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {importPreview.map((q, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                            <span>SOAL {idx + 1} ({q.tipe.toUpperCase()})</span>
                            <span>Bobot: {q.bobot} • {q.kesulitan.toUpperCase()}</span>
                          </div>
                          <p className="text-slate-800 font-medium">{q.pertanyaan}</p>
                          {q.pilihan && (
                            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 pl-2">
                              {q.pilihan.map((pil: string, pIdx: number) => (
                                <div key={pIdx} className={q.jawaban_benar === pIdx.toString() ? 'text-emerald-600 font-bold' : ''}>
                                  {String.fromCharCode(65 + pIdx)}. {pil || '-'}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.tipe === 'bs' && (
                            <p className="text-[10px] text-slate-500">
                              Kunci Jawaban: <span className="font-bold text-blue-600">{q.jawaban_benar ? 'BENAR' : 'SALAH'}</span>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button 
                  onClick={() => { setIsImportModalOpen(false); setImportPreview([]); setImportErrors([]); }} 
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={handleSaveImportedQuestions}
                  disabled={importPreview.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-md cursor-pointer transition-colors"
                >
                  Simpan {importPreview.length} Soal ke Ujian
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === LIST MODE ===
  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bank Ujian Mapel</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola pembuatan ujian, soal, dan pengaturan akses siswa dari satu tempat.</p>
        </div>
        <button onClick={() => setIsNewExamModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Buat Wadah Ujian
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {exams.length === 0 ? (
          <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-500">
            Belum ada ujian/mapel. Klik "Buat Wadah Ujian" untuk memulai.
          </div>
        ) : (
          exams.map((exam) => (
            <div key={exam.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{exam.mapel}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    exam.status === 'berlangsung' ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'
                  }`}>
                    {exam.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 truncate">{exam.judul}</h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                  <div className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> {(exam.soal_ids || []).length} Soal</div>
                  <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {exam.durasi} Menit</div>
                  <div className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> {exam.token_aktif ? exam.token : 'Tanpa Token'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setActiveExamId(exam.id); setViewMode('detail'); }} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer">
                  Masuk & Edit
                </button>
                <button onClick={() => handleDeleteExam(exam.id)} className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors cursor-pointer" title="Hapus Ujian">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isNewExamModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Buat Wadah Ujian Baru</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mata Pelajaran</label>
                <input type="text" value={newExamMapel} onChange={e => setNewExamMapel(e.target.value)} placeholder="IPS, Matematika..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Judul Ujian</label>
                <input type="text" value={newExamTitle} onChange={e => setNewExamTitle(e.target.value)} placeholder="Contoh: UTS Ganjil IPS 2026..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <button onClick={() => setIsNewExamModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
              <button onClick={handleCreateNewExam} className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow">Buat & Lanjut Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
