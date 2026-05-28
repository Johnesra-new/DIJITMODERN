import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Edit, 
  X, 
  Mail, 
  GraduationCap, 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle, 
  Check, 
  Download,
  Building2
} from 'lucide-react';
import { db, User, InstansiConfig } from '../../utils/supabaseDb';
import * as XLSX from 'xlsx';

const AVAILABLE_CLASSES = [
  ...Array.from({ length: 10 }, (_, i) => `X-${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `XI-${i + 1}`),
  ...Array.from({ length: 10 }, (_, i) => `XII-${i + 1}`)
];

interface SiswaManagementProps {
  currentUser?: User;
}

export const SiswaManagement: React.FC<SiswaManagementProps> = ({ currentUser }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [instansiList, setInstansiList] = useState<InstansiConfig[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<User | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [nis, setNis] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [kelas, setKelas] = useState('X-1');
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [studentInstansiId, setStudentInstansiId] = useState<string>('');

  // Bulk Import File States
  const [dragOver, setDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{title: string, body: string, actionText?: string, actionFn?: () => void} | null>(null);

  const handleRefreshList = async () => {
    try {
      const allUsers = await db.getUsers();
      let filtered = allUsers.filter(u => u.role === 'siswa');
      
      // If current user is Guru, filter to only show their instansi's students
      if (currentUser && currentUser.role === 'guru') {
        filtered = filtered.filter(u => u.instansi_id === currentUser.instansi_id);
      }
      setStudents(filtered);

      const list = await db.getAllInstansi();
      setInstansiList(list);
    } catch (err) {
      console.error("Gagal mengambil data siswa:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleRefreshList();
  }, []);

  const openAddModal = () => {
    setName('');
    setUsername('');
    setNis('');
    setEmail('');
    setPassword('');
    setKelas('XII MIPA 1');
    setStatus('aktif');
    setStudentInstansiId(instansiList[0]?.id || '');
    setIsAddModalOpen(true);
  };

  const openEditModal = (student: User) => {
    setCurrentStudent(student);
    setName(student.name);
    setUsername(student.username);
    setNis(student.nip_nis);
    setEmail(student.email || '');
    setPassword(student.password_hash || '');
    setKelas(student.kelas || 'X-1');
    setStatus(student.status);
    setStudentInstansiId(student.instansi_id || '');
    setIsEditModalOpen(true);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !nis.trim() || !password.trim()) {
      alert('Nama, Username, NIS, dan Password wajib diisi!');
      return;
    }

    try {
      let finalInstansiId = null;
      if (currentUser && currentUser.role === 'guru') {
        finalInstansiId = currentUser.instansi_id;
      } else if (currentUser && currentUser.role === 'admin') {
        finalInstansiId = studentInstansiId || null;
      }

      const studentEmail = email.trim() || `${username.trim()}@siswa.dijit`;

      const newUser = await db.addUser({
        username: username.trim(),
        name: name.trim(),
        nip_nis: nis.trim(),
        email: studentEmail,
        password_hash: password.trim(),
        role: 'siswa',
        status,
        kelas,
        instansi_id: finalInstansiId,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      });

      setSuccessDialog({
        title: 'Siswa Berhasil Didaftarkan!',
        body: `Akun siswa atas nama ${newUser.name} telah dibuat.\nNIS: ${newUser.nip_nis}\nKelas: ${newUser.kelas}\nKata Sandi: ${password.trim()}`
      });

      setIsAddModalOpen(false);
      await handleRefreshList();
    } catch (err) {
      alert("Gagal menambahkan siswa baru.");
      console.error(err);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    if (!name.trim() || !username.trim() || !nis.trim() || !password.trim()) {
      alert('Nama, Username, NIS, dan Password wajib diisi!');
      return;
    }

    try {
      await db.updateUser({
        id: currentStudent.id,
        name: name.trim(),
        username: username.trim(),
        nip_nis: nis.trim(),
        email: email.trim() || `${username.trim()}@siswa.dijit`,
        password_hash: password.trim(),
        status,
        kelas,
        instansi_id: currentUser?.role === 'admin' ? (studentInstansiId || null) : currentStudent.instansi_id
      });

      setIsEditModalOpen(false);
      setCurrentStudent(null);
      await handleRefreshList();
    } catch (err) {
      alert("Gagal memperbarui data siswa.");
      console.error(err);
    }
  };

  const toggleStatus = async (student: User) => {
    const updatedStatus = student.status === 'aktif' ? 'nonaktif' as const : 'aktif' as const;
    try {
      await db.updateUser({
        id: student.id,
        status: updatedStatus
      });
      await db.addLog(
        "user-guru",
        "Pengajar Ujian",
        "guru",
        "Ubah Status Siswa", 
        `Mengubah status siswa ${student.name} menjadi ${updatedStatus.toUpperCase()}.`
      );
      await handleRefreshList();
    } catch (err) {
      console.error(err);
    }
  };

  // Unduh Templat Excel (.xlsx)
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["Nama", "NIS", "Kelas", "Email"],
      ["Budi Gunawan", "24010", "XII MIPA 1", "budi.gunawan@siswa.sch.id"],
      ["Siti Rahayu", "24011", "XII MIPA 2", "siti.rahayu@siswa.sch.id"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Siswa");
    XLSX.writeFile(wb, "Templat_Import_Siswa.xlsx");
  };

  // CSV & Excel Bulk Importer Logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragOver(true);
    } else if (e.type === "dragleave") {
      setDragOver(false);
    }
  };

  const parseExcelOrCSV = (file: File) => {
    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (e) => {
      try {
        let results: any[] = [];
        let errors: string[] = [];

        if (isExcel) {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            setImportErrors(["File Excel kosong."]);
            return;
          }

          // Read headers
          const headers = jsonData[0].map((h: any) => String(h).trim().toLowerCase());
          
          if (!headers.includes('nama') || !headers.includes('nis') || !headers.includes('kelas')) {
            setImportErrors(["Format header Excel tidak valid. Wajib berisi kolom: Nama, NIS, Kelas"]);
            return;
          }

          for (let i = 1; i < jsonData.length; i++) {
            const cols = jsonData[i];
            if (!cols || cols.length === 0) continue;

            const rowData: Record<string, string> = {};
            headers.forEach((h: string, idx: number) => {
              rowData[h] = cols[idx] !== undefined ? String(cols[idx]).trim() : '';
            });

            const nama = rowData['nama'];
            const nisVal = rowData['nis'];
            const kelasVal = rowData['kelas'];
            const emailVal = rowData['email'] || `${nisVal}@siswa.sch.id`;

            if (!nama || !nisVal || !kelasVal) {
              errors.push(`Baris ${i + 1}: Data Nama, NIS, atau Kelas tidak boleh kosong.`);
              continue;
            }

            if (results.some(r => r.nis === nisVal)) {
              errors.push(`Baris ${i + 1}: Duplikasi NIS '${nisVal}' di dalam file Excel.`);
              continue;
            }

            if (students.some(u => u.nip_nis === nisVal)) {
              errors.push(`Baris ${i + 1}: NIS '${nisVal}' sudah terdaftar dalam sistem.`);
              continue;
            }

            results.push({
              nama,
              nis: nisVal,
              kelas: kelasVal,
              email: emailVal,
              username: `siswa_${nisVal}`
            });
          }
        } else {
          // Parse CSV
          const text = e.target?.result as string;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          if (!headers.includes('nama') || !headers.includes('nis') || !headers.includes('kelas')) {
            setImportErrors(["Format header CSV tidak valid. Wajib berisi kolom: Nama, NIS, Kelas"]);
            return;
          }

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cols = line.split(',').map(c => c.trim());
            if (cols.length < 3) {
              errors.push(`Baris ${i + 1}: Kolom tidak lengkap.`);
              continue;
            }

            const rowData: Record<string, string> = {};
            headers.forEach((h, idx) => {
              rowData[h] = cols[idx] || '';
            });

            const nama = rowData['nama'];
            const nisVal = rowData['nis'];
            const kelasVal = rowData['kelas'];
            const emailVal = rowData['email'] || `${nisVal}@siswa.sch.id`;

            if (!nama || !nisVal || !kelasVal) {
              errors.push(`Baris ${i + 1}: Data Nama, NIS, atau Kelas tidak boleh kosong.`);
              continue;
            }

            if (results.some(r => r.nis === nisVal)) {
              errors.push(`Baris ${i + 1}: Duplikasi NIS '${nisVal}' di dalam file CSV.`);
              continue;
            }

            if (students.some(u => u.nip_nis === nisVal)) {
              errors.push(`Baris ${i + 1}: NIS '${nisVal}' sudah terdaftar dalam sistem.`);
              continue;
            }

            results.push({
              nama,
              nis: nisVal,
              kelas: kelasVal,
              email: emailVal,
              username: `siswa_${nisVal}`
            });
          }
        }

        setImportPreview(results);
        setImportErrors(errors);
      } catch (err) {
        console.error("Gagal membaca file:", err);
        setImportErrors(["Gagal memproses file. Pastikan format file benar."]);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseExcelOrCSV(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseExcelOrCSV(e.target.files[0]);
    }
  };

  const confirmImport = async () => {
    if (importPreview.length === 0) return;

    // Generate random passwords and import users
    const importedCredentials: string[] = [];
    const usersToUpsert: User[] = [];
    
    importPreview.forEach(row => {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let randPassword = '';
      for (let i = 0; i < 6; i++) {
        randPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      let finalInstansiId = null;
      if (currentUser && currentUser.role === 'guru') {
        finalInstansiId = currentUser.instansi_id;
      } else if (currentUser && currentUser.role === 'admin') {
        finalInstansiId = studentInstansiId || null;
      }

      usersToUpsert.push({
        id: crypto.randomUUID(),
        username: row.username,
        name: row.nama,
        nip_nis: row.nis,
        email: row.email,
        password_hash: randPassword,
        role: 'siswa',
        status: 'aktif',
        kelas: row.kelas,
        instansi_id: finalInstansiId,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(row.nama)}`
      });

      importedCredentials.push(`Nama: ${row.nama} | Kelas: ${row.kelas} | NIS: ${row.nis} | Password: ${randPassword}`);
    });

    try {
      await db.saveUsers(usersToUpsert);
      setIsImportModalOpen(false);
      await handleRefreshList();

      // Show export credentials dialog
      const textContent = importedCredentials.join('\n');
      setSuccessDialog({
        title: `Sukses Mengimpor ${importPreview.length} Siswa!`,
        body: `Seluruh akun siswa berhasil didaftarkan ke sistem.\n\nKata sandi acak telah digenerate otomatis. Silakan unduh daftar akun & password di bawah ini untuk didistribusikan.`,
        actionText: 'Unduh Daftar Password (.txt)',
        actionFn: () => {
          const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `Daftar_Siswa_Password_${Date.now()}.txt`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      });
    } catch (err) {
      alert("Gagal mengimpor siswa.");
      console.error(err);
    }

    setImportPreview([]);
    setImportErrors([]);
  };

  const filteredStudents = students.filter(s => 
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.nip_nis || '').includes(search) ||
    (s.kelas && s.kelas.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Data Siswa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            Manajemen Akun Siswa
          </h1>
          <p className="text-slate-400 text-sm mt-1">Daftarkan akun peserta ujian, atur pembagian kelas, dan lakukan import data massal.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-xl transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Siswa (CSV)</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/15 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa Manual</span>
          </button>
        </div>
      </div>

      {/* Table Container Card */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
        
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari siswa berdasarkan nama / NIS / kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50/70 border border-slate-200 focus:border-blue-500 rounded-xl py-2 px-10 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Tidak ada data siswa yang cocok.</div>
          ) : (
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Nama / NIS</th>
                  <th className="pb-3 font-semibold">Kelas</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={student.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.name)}`} 
                          alt={student.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 shrink-0" 
                        />
                        <div>
                          <p className="font-semibold text-slate-800">{student.name}</p>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{student.nip_nis}</span>
                            <span>•</span>
                            <span className="text-slate-500">{student.email}</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-0.5 bg-slate-50 border border-slate-200 text-[10px] text-blue-700 rounded font-semibold uppercase tracking-wider">
                        {student.kelas || 'Belum Masuk Kelas'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => toggleStatus(student)}
                        className={`px-2.5 py-0.5 text-[10px] rounded-full border font-semibold transition-colors cursor-pointer inline-block ${
                          student.status === 'aktif'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600'
                            : 'bg-rose-100 border-rose-300 text-rose-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600'
                        }`}
                        title="Klik untuk mengubah status aktif"
                      >
                        {student.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-455 hover:text-slate-900 transition-all cursor-pointer"
                          title="Edit Siswa"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* Success Dialog Popup */}
      {successDialog && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-emerald-500 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
              <div className="p-2 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-600">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{successDialog.title}</h3>
            </div>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-60 overflow-y-auto">
              {successDialog.body}
            </p>
            <div className="flex justify-end gap-3.5">
              {successDialog.actionFn && (
                <button
                  onClick={successDialog.actionFn}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-550 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{successDialog.actionText || 'Download'}</span>
                </button>
              )}
              <button
                onClick={() => setSuccessDialog(null)}
                className="px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Import Siswa Secara Massal</span>
              </h3>
              <button 
                onClick={() => { setIsImportModalOpen(false); setImportPreview([]); setImportErrors([]); }} 
                className="text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop Area */}
            {importPreview.length === 0 && (
              <div className="space-y-4">
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    dragOver 
                      ? 'border-emerald-500 bg-emerald-100/10' 
                      : 'border-slate-200 hover:border-slate-350 bg-slate-50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv, .xlsx, .xls"
                    className="hidden" 
                  />
                  <UploadCloud className="w-12 h-12 text-slate-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Seret & taruh file Excel atau CSV Anda di sini</p>
                    <p className="text-xs text-slate-400 mt-1">atau klik untuk memilih file dari komputer (.xlsx, .xls, .csv)</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 rounded-xl bg-white border border-slate-200">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400">Gunakan templat file standar kami:</p>
                    <p className="text-[10px] text-slate-455">Header: Nama, NIS, Kelas, Email (Opsional)</p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                    <span>Unduh Templat Excel</span>
                  </button>
                </div>
              </div>
            )}

            {/* Errors Panel */}
            {importErrors.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Kesalahan Validasi Data File:</span>
                </div>
                <ul className="list-disc pl-5 text-[11px] text-rose-600 space-y-1 max-h-36 overflow-y-auto">
                  {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            {/* Preview Panel */}
            {importPreview.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Pratinjau Data: Terdeteksi <strong className="text-emerald-650 font-mono">{importPreview.length}</strong> siswa siap diimpor.</span>
                  <button 
                    onClick={() => { setImportPreview([]); setImportErrors([]); }} 
                    className="text-xs text-rose-600 hover:text-rose-500 cursor-pointer"
                  >
                    Ganti File
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Nama</th>
                        <th className="py-2 px-3">NIS</th>
                        <th className="py-2 px-3">Kelas</th>
                        <th className="py-2 px-3">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {importPreview.slice(0, 20).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{row.nama}</td>
                          <td className="py-2 px-3">{row.nis}</td>
                          <td className="py-2 px-3">{row.kelas}</td>
                          <td className="py-2 px-3 text-slate-400 text-[11px]">{row.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importPreview.length > 20 && (
                    <div className="py-2 px-3 text-center text-[10px] text-slate-455 border-t border-slate-200 bg-slate-50">
                      Menampilkan 20 dari {importPreview.length} baris data...
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3.5">
                  <button
                    type="button"
                    onClick={() => { setImportPreview([]); setImportErrors([]); }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-655 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmImport}
                    disabled={importErrors.length > 0}
                    className={`px-4 py-2.5 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer ${
                      importErrors.length > 0 
                        ? 'bg-slate-200 text-slate-455 cursor-not-allowed border border-slate-300' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400'
                    }`}
                  >
                    Simpan & Generate Kata Sandi Siswa
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ADD SISWA MANUAL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Pendaftaran Siswa Baru</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Aditya Pratama"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nomor Induk Siswa (NIS)</label>
                  <input
                    type="text"
                    required
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    placeholder="24005"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Username Unik</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    placeholder="aditya_pratama"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Email (Opsional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="aditya@siswa.sch.id"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Kata Sandi (Password)</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sandi login siswa..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550 font-mono"
                  />
                </div>
              </div>

              {currentUser?.role === 'admin' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Instansi / Lembaga Pendidikan</span>
                  </label>
                  <select
                    value={studentInstansiId}
                    onChange={(e) => setStudentInstansiId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none font-medium cursor-pointer"
                  >
                    <option value="">-- Pilih Instansi (Global/Umum) --</option>
                    {instansiList.map((inst) => (
                      <option key={inst.id} value={inst.id}>{inst.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kelas / Rombongan Belajar</span>
                </label>
                <select
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none font-medium cursor-pointer"
                >
                  {AVAILABLE_CLASSES.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Status Akun</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="add_status" 
                      checked={status === 'aktif'} 
                      onChange={() => setStatus('aktif')}
                      className="accent-blue-500"
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="add_status" 
                      checked={status === 'nonaktif'} 
                      onChange={() => setStatus('nonaktif')}
                      className="accent-blue-500"
                    />
                    <span>Nonaktif (Blokir Akses)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-655 text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Daftarkan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SISWA MODAL */}
      {isEditModalOpen && currentStudent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <span>Edit Data Siswa</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStudent} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nomor Induk Siswa (NIS)</label>
                  <input
                    type="text"
                    required
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Username Unik</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Email (Opsional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Kata Sandi (Password)</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none font-mono"
                  />
                </div>
              </div>

              {currentUser?.role === 'admin' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Instansi / Lembaga Pendidikan</span>
                  </label>
                  <select
                    value={studentInstansiId}
                    onChange={(e) => setStudentInstansiId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none font-medium cursor-pointer"
                  >
                    <option value="">-- Pilih Instansi (Global/Umum) --</option>
                    {instansiList.map((inst) => (
                      <option key={inst.id} value={inst.id}>{inst.nama}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>Kelas / Rombongan Belajar</span>
                </label>
                <select
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none cursor-pointer"
                >
                  {AVAILABLE_CLASSES.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Status Akun</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="edit_status" 
                      checked={status === 'aktif'} 
                      onChange={() => setStatus('aktif')}
                      className="accent-blue-500"
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="edit_status" 
                      checked={status === 'nonaktif'} 
                      onChange={() => setStatus('nonaktif')}
                      className="accent-blue-500"
                    />
                    <span>Nonaktif (Blokir Akses)</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-655 text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
