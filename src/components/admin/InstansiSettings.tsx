import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Copy, Check, ShieldAlert, Plus, Edit, X, Globe, MapPin, Link2, UploadCloud, Key, Mail, User as UserIcon } from 'lucide-react';
import { db, InstansiConfig, User } from '../../utils/supabaseDb';

export const InstansiSettings: React.FC = () => {
  const [instansiList, setInstansiList] = useState<InstansiConfig[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form Mode: 'list' | 'add' | 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedInstansi, setSelectedInstansi] = useState<InstansiConfig | null>(null);

  // Form Fields
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [logo, setLogo] = useState('');
  const [zonaWaktu, setZonaWaktu] = useState('WITA (Asia/Makassar)');
  const [kodeInstansi, setKodeInstansi] = useState('');
  const [gsheetsUrl, setGsheetsUrl] = useState('');
  
  // Instansi Guru Account Fields
  const [teachers, setTeachers] = useState<User[]>([]);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar!');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `instansi/logo_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const publicUrl = await db.uploadMedia(file, fileName);
      setLogo(publicUrl);
    } catch (err) {
      console.error("Gagal mengunggah logo:", err);
      alert("Gagal mengunggah gambar. Pastikan bucket 'dijit-media' sudah dibuat dan memiliki izin publik di Supabase.");
    } finally {
      setIsUploading(false);
    }
  };

  const loadInstansi = async () => {
    try {
      const list = await db.getAllInstansi();
      setInstansiList(list);
      
      const allUsers = await db.getUsers();
      setTeachers(allUsers.filter(u => u.role === 'guru'));
    } catch (err) {
      console.error("Gagal mengambil daftar instansi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInstansi();
  }, []);

  const generateCode = (namaSekolah: string) => {
    if (!namaSekolah.trim()) return '';
    const cleanName = namaSekolah.toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    const words = cleanName.split(/\s+/).filter(Boolean);
    let prefix = 'SCH';
    if (words.length >= 2) {
      prefix = `${words[0].substring(0, 3)}-${words[1].substring(0, 3)}`;
    } else if (words.length === 1) {
      prefix = words[0].substring(0, 4);
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${rand}`.toUpperCase();
  };

  const handleOpenAdd = () => {
    setNama('');
    setAlamat('');
    setLogo('https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200&auto=format&fit=crop');
    setZonaWaktu('WITA (Asia/Makassar)');
    setKodeInstansi('');
    setGsheetsUrl('');
    setAccountUsername('');
    setAccountPassword('');
    setAccountEmail('');
    setSelectedInstansi(null);
    setViewMode('add');
  };

  const handleOpenEdit = (inst: InstansiConfig) => {
    setSelectedInstansi(inst);
    setNama(inst.nama);
    setAlamat(inst.alamat || '');
    setLogo(inst.logo || '');
    setZonaWaktu(inst.zona_waktu || 'WITA (Asia/Makassar)');
    setKodeInstansi(inst.kode_instansi || '');
    setGsheetsUrl(inst.gsheets_url || '');
    
    // Find the associated main guru account
    const instUser = teachers.find(u => u.instansi_id === inst.id);
    if (instUser) {
      setAccountUsername(instUser.username || '');
      setAccountPassword(instUser.password_hash || '');
      setAccountEmail(instUser.email || '');
    } else {
      setAccountUsername('');
      setAccountPassword('');
      setAccountEmail('');
    }
    
    setViewMode('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !alamat.trim()) {
      alert('Nama instansi dan alamat wajib diisi!');
      return;
    }

    if (!accountUsername.trim() || !accountPassword.trim()) {
      alert('Username dan Password untuk Akun Guru Utama wajib diisi!');
      return;
    }

    try {
      const finalCode = kodeInstansi || generateCode(nama);
      
      if (viewMode === 'add') {
        const payload: Omit<InstansiConfig, 'id'> = {
          nama,
          alamat,
          logo,
          zona_waktu: zonaWaktu,
          kode_instansi: finalCode,
          gsheets_url: gsheetsUrl
        };
        // 1. Add Instansi first
        const newInst = await db.addInstansi(payload);
        
        // 2. Add associated teacher/guru account automatically
        await db.addUser({
          username: accountUsername.trim(),
          name: `Guru ${nama}`,
          nip_nis: `GURU-${finalCode}`,
          email: accountEmail.trim() || `${accountUsername.trim()}@dijit.sch.id`,
          password_hash: accountPassword.trim(),
          role: 'guru',
          status: 'aktif',
          instansi_id: newInst.id,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nama)}`
        });
        
        alert('Instansi baru & Akun Guru berhasil ditambahkan!');
      } else if (viewMode === 'edit' && selectedInstansi?.id) {
        // 1. Update Instansi
        await db.updateInstansi({
          id: selectedInstansi.id,
          nama,
          alamat,
          logo,
          zona_waktu: zonaWaktu,
          kode_instansi: finalCode,
          gsheets_url: gsheetsUrl
        });
        
        // 2. Update or Create associated teacher/guru account
        const existingUser = teachers.find(u => u.instansi_id === selectedInstansi.id);
        if (existingUser) {
          await db.updateUser({
            id: existingUser.id,
            username: accountUsername.trim(),
            email: accountEmail.trim() || existingUser.email,
            password_hash: accountPassword.trim(),
            name: `Guru ${nama}`
          });
        } else {
          await db.addUser({
            username: accountUsername.trim(),
            name: `Guru ${nama}`,
            nip_nis: `GURU-${finalCode}`,
            email: accountEmail.trim() || `${accountUsername.trim()}@dijit.sch.id`,
            password_hash: accountPassword.trim(),
            role: 'guru',
            status: 'aktif',
            instansi_id: selectedInstansi.id,
            avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(nama)}`
          });
        }
        
        alert('Informasi instansi & Akun Guru berhasil diperbarui!');
      }
      setViewMode('list');
      await loadInstansi();
    } catch (err) {
      alert('Gagal menyimpan data instansi. Pastikan Kode Instansi unik.');
      console.error(err);
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateCode = () => {
    const code = generateCode(nama);
    setKodeInstansi(code);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Pengaturan Lembaga...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            Manajemen Instansi / Sekolah
          </h1>
          <p className="text-slate-400 text-sm mt-1">Daftarkan lembaga baru, atur kode instansi unik untuk APK Android, dan konfigurasikan lembar sinkronisasi Google Sheets.</p>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Instansi Baru</span>
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instansiList.length === 0 ? (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-400 text-sm">
              Belum ada instansi terdaftar. Silakan tambahkan instansi baru.
            </div>
          ) : (
            instansiList.map((inst) => (
              <div key={inst.id} className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md shadow-lg flex flex-col justify-between hover:scale-[1.02] hover:border-slate-350 transition-all duration-300">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <img 
                      src={inst.logo || "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200&auto=format&fit=crop"} 
                      alt={inst.nama} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200&auto=format&fit=crop";
                      }}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-md bg-slate-50 shrink-0"
                    />
                    <button
                      onClick={() => handleOpenEdit(inst)}
                      className="p-2 bg-slate-50 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-455 hover:text-slate-900 transition-all cursor-pointer shrink-0"
                      title="Edit Instansi"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{inst.nama}</h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                      <Globe className="w-3.5 h-3.5 text-cyan-600" />
                      <span>{inst.zona_waktu}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-start gap-1 mt-1.5 leading-relaxed line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{inst.alamat}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Kode Instansi (APK)</span>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs tracking-widest text-blue-700 select-all">
                    <span>{inst.kode_instansi}</span>
                    <button
                      onClick={() => handleCopyCode(inst.kode_instansi, inst.id!)}
                      className="p-1 bg-white border border-slate-200 hover:border-slate-350 text-slate-400 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedId === inst.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  
                  {/* Account Information for Guru */}
                  {(() => {
                    const instUser = teachers.find(u => u.instansi_id === inst.id);
                    return (
                      <div className="p-3 bg-gradient-to-tr from-slate-50 to-blue-50/25 border border-slate-200 rounded-xl space-y-1.5 mt-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Akun Instansi (Guru/Pengawas)</span>
                        <div className="text-[11px] text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Username:</span>
                            <span className="font-bold font-mono text-slate-805 bg-slate-100 px-1 rounded">{instUser?.username || 'Belum dibuat'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Password:</span>
                            <span className="font-bold font-mono text-slate-805 bg-slate-100 px-1 rounded">{instUser?.password_hash || 'Belum dibuat'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Form view: Add / Edit Instansi */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Form fields */}
          <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-blue-600" />
                <span>{viewMode === 'add' ? 'Tambah Instansi Baru' : 'Ubah Informasi Instansi'}</span>
              </h3>
              <button 
                onClick={() => setViewMode('list')}
                className="p-1 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Resmi Lembaga / Sekolah</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="SMA Negeri 1 Makassar"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Lengkap</label>
                <textarea
                  required
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Jl. Baji Minasa No. 12, Makassar..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Logo Instansi</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={logo}
                      onChange={(e) => setLogo(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none font-mono text-[10px]"
                    />
                    <label className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 border border-slate-200 hover:border-slate-350 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-200 cursor-pointer shrink-0 transition-all">
                      {isUploading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{isUploading ? 'Uploading...' : 'Pilih File'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5 col-span-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Zona Waktu Sistem</label>
                  <select
                    value={zonaWaktu}
                    onChange={(e) => setZonaWaktu(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-xs text-slate-800 outline-none"
                  >
                    <option value="WIB (Asia/Jakarta)">WIB (Asia/Jakarta)</option>
                    <option value="WITA (Asia/Makassar)">WITA (Asia/Makassar)</option>
                    <option value="WIT (Asia/Jayapura)">WIT (Asia/Jayapura)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Integrasi Google Sheets URL (Opsional)</label>
                <div className="relative">
                  <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={gsheetsUrl}
                    onChange={(e) => setGsheetsUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-slate-800 outline-none font-mono text-[10px]"
                  />
                </div>
              </div>

              {/* Akun Guru Utama Section */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/10 space-y-4">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                  <UserIcon className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800">Konfigurasi Akun Guru Utama</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Username Akun</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={accountUsername}
                      onChange={(e) => setAccountUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="guru_sman1"
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kata Sandi (Password)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Masukkan password guru..."
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Guru / Pengawas (Opsional)</span>
                  </label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    placeholder="guru@sman1.sch.id"
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-655 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  {viewMode === 'add' ? 'Tambahkan Instansi' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Side: Preview & Instance Code Info */}
          <div className="space-y-6 lg:col-span-1 animate-fade-in">
            {/* Instance Code Configuration Card */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-blue-600" />
                <span>Kode Instansi Unik</span>
              </h3>

              <p className="text-slate-400 text-[11px] leading-relaxed">
                Kode ini merupakan identitas unik instansi untuk dimasukkan ke APK Android siswa. Jika dikosongkan, sistem akan meng-generate kode secara otomatis.
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  value={kodeInstansi}
                  onChange={(e) => setKodeInstansi(e.target.value.toUpperCase())}
                  placeholder="AUTO GENERATED"
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 px-4 font-mono font-bold text-sm tracking-widest text-center text-blue-600 outline-none"
                />

                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-250 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Buat Ulang Kode Acak</span>
                </button>
              </div>
            </div>

            {/* School logo preview */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md text-center space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pratinjau Logo Instansi</h3>
              <img 
                src={logo || "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200&auto=format&fit=crop"} 
                alt="Logo Preview" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200&auto=format&fit=crop";
                }}
                className="w-28 h-28 rounded-2xl mx-auto object-cover border border-slate-200 shadow-xl"
              />
              <p className="text-[10px] text-slate-400 font-semibold uppercase">{nama || 'Nama Instansi'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
