import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Edit, 
  RotateCcw, 
  Check, 
  X, 
  Mail, 
  BookOpen
} from 'lucide-react';
import { db, User } from '../../utils/supabaseDb';

export const GuruManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<User | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [nip, setNip] = useState('');
  const [email, setEmail] = useState('');
  const [mapel, setMapel] = useState('');
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{title: string, body: string} | null>(null);

  const handleRefreshList = async () => {
    try {
      const allUsers = await db.getUsers();
      setTeachers(allUsers.filter(u => u.role === 'guru'));
    } catch (err) {
      console.error("Gagal memuat daftar guru:", err);
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
    setNip('');
    setEmail('');
    setMapel('');
    setStatus('aktif');
    setIsAddModalOpen(true);
  };

  const openEditModal = (teacher: User) => {
    setCurrentTeacher(teacher);
    setName(teacher.name);
    setUsername(teacher.username);
    setNip(teacher.nip_nis);
    setEmail(teacher.email);
    setMapel(teacher.mapel ? teacher.mapel.join(', ') : '');
    setStatus(teacher.status);
    setIsEditModalOpen(true);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !nip.trim() || !email.trim()) {
      alert('Semua field wajib diisi!');
      return;
    }

    const mapelList = mapel.split(',').map(m => m.trim()).filter(m => m.length > 0);

    try {
      const newUser = await db.addUser({
        username,
        name,
        nip_nis: nip,
        email,
        role: 'guru',
        status,
        mapel: mapelList,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
      });

      setSuccessDialog({
        title: 'Guru Berhasil Didaftarkan!',
        body: `Akun guru atas nama ${newUser.name} telah dibuat.\nUsername: ${newUser.username}\nKata Sandi Acak: [Telah digenerate & dikirim via email]\n\nHarap simpan kredensial ini.`
      });

      setIsAddModalOpen(false);
      await handleRefreshList();
    } catch (err) {
      alert("Gagal menambahkan pengajar baru.");
      console.error(err);
    }
  };

  const handleEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeacher) return;

    if (!name.trim() || !username.trim() || !nip.trim() || !email.trim()) {
      alert('Semua field wajib diisi!');
      return;
    }

    const mapelList = mapel.split(',').map(m => m.trim()).filter(m => m.length > 0);

    try {
      await db.updateUser({
        id: currentTeacher.id,
        name,
        username,
        nip_nis: nip,
        email,
        status,
        mapel: mapelList
      });

      setIsEditModalOpen(false);
      setCurrentTeacher(null);
      await handleRefreshList();
    } catch (err) {
      alert("Gagal memperbarui data pengajar.");
      console.error(err);
    }
  };

  const handleResetPassword = async (teacher: User) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#';
    let newPassword = '';
    for (let i = 0; i < 8; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      await db.addLog("user-guru", "Pengajar Ujian", "guru", "Reset Password Guru", `Melakukan reset kata sandi untuk guru ${teacher.name}.`);

      setSuccessDialog({
        title: 'Reset Password Berhasil!',
        body: `Kata sandi untuk ${teacher.name} (NIP: ${teacher.nip_nis}) telah di-reset secara otomatis.\n\nKata Sandi Baru: ${newPassword}\n\nSilakan salin password ini dan berikan secara aman kepada yang bersangkutan.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (teacher: User) => {
    const updatedStatus = teacher.status === 'aktif' ? 'nonaktif' as const : 'aktif' as const;
    try {
      await db.updateUser({
        id: teacher.id,
        status: updatedStatus
      });
      await db.addLog(
        "user-guru",
        "Pengajar Ujian",
        "guru",
        "Ubah Status Guru", 
        `Mengubah status guru ${teacher.name} menjadi ${updatedStatus.toUpperCase()}.`
      );
      await handleRefreshList();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.nip_nis || '').includes(search) ||
    (t.email || '').toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Data Pengajar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            Manajemen Akun Guru
          </h1>
          <p className="text-slate-400 text-sm mt-1">Daftarkan akun pengajar, atur penugasan mata pelajaran, dan lakukan kontrol akses.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-550 hover:to-cyan-450 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/15 transition-all duration-200 cursor-pointer animate-fade-in"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {/* Table Container card */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
        
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari guru berdasarkan nama / NIP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50/70 border border-slate-200 focus:border-blue-500 rounded-xl py-2 px-10 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          {filteredTeachers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Tidak ada data guru yang cocok.</div>
          ) : (
            <table className="w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Guru / Pengajar</th>
                  <th className="pb-3 font-semibold">NIP / Identitas</th>
                  <th className="pb-3 font-semibold">Mata Pelajaran</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={teacher.avatar} 
                          alt={teacher.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-50 shrink-0" 
                        />
                        <div>
                          <p className="font-semibold text-slate-800">{teacher.name}</p>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-600 shrink-0" />
                            {teacher.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-slate-450">
                      {teacher.nip_nis}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {teacher.mapel && teacher.mapel.length > 0 ? (
                          teacher.mapel.map((mp, index) => (
                            <span 
                              key={index} 
                              className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-[10px] text-slate-400 rounded-md font-mono"
                            >
                              {mp}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-600 italic text-[11px]">Belum di-assign</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => toggleStatus(teacher)}
                        className={`px-2.5 py-0.5 text-[10px] rounded-full border font-semibold transition-colors cursor-pointer inline-block ${
                          teacher.status === 'aktif'
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600'
                            : 'bg-rose-100 border-rose-300 text-rose-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600'
                        }`}
                        title="Klik untuk mengubah status aktif"
                      >
                        {teacher.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="py-3.5 pl-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-455 hover:text-slate-900 transition-all cursor-pointer"
                          title="Edit Guru"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(teacher)}
                          className="p-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-slate-455 hover:text-blue-600 transition-all cursor-pointer"
                          title="Reset Password"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
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
              <div className="p-2 bg-emerald-100 border border-emerald-350 rounded-xl text-emerald-600">
                <Check className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{successDialog.title}</h3>
            </div>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-200">
              {successDialog.body}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setSuccessDialog(null)}
                className="px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Tutup / Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD GURU MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Pendaftaran Guru Baru</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTeacher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Budi Santoso, S.Pd."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nomor Induk Pegawai (NIP)</label>
                  <input
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="198005122005011003"
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
                    placeholder="budi_santoso"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Email Sekolah</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi@sman1mks.sch.id"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 block">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mata Pelajaran (Pisahkan dengan koma)</span>
                </label>
                <input
                  type="text"
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  placeholder="Matematika, Fisika, Astronomi..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-550"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Status Akun Awal</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="add_status" 
                      checked={status === 'aktif'} 
                      onChange={() => setStatus('aktif')}
                      className="accent-blue-500"
                    />
                    <span>Aktif (Dapat Login)</span>
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
                  Simpan & Generate Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GURU MODAL */}
      {isEditModalOpen && currentTeacher && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <span>Edit Data Pengajar</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTeacher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nomor Induk Pegawai (NIP)</label>
                  <input
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
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
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 block">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mata Pelajaran (Pisahkan dengan koma)</span>
                </label>
                <input
                  type="text"
                  value={mapel}
                  onChange={(e) => setMapel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                />
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
