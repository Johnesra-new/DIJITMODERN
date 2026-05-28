import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Copy, Check, ShieldAlert } from 'lucide-react';
import { db, InstansiConfig } from '../../utils/supabaseDb';

export const InstansiSettings: React.FC = () => {
  const [config, setConfig] = useState<InstansiConfig | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form Fields
  const [nama, setNama] = useState('');
  const [alamat, setAlamat] = useState('');
  const [logo, setLogo] = useState('');
  const [zonaWaktu, setZonaWaktu] = useState('');

  const loadConfig = async () => {
    try {
      const inst = await db.getInstansi();
      setConfig(inst);
      setNama(inst.nama);
      setAlamat(inst.alamat);
      setLogo(inst.logo);
      setZonaWaktu(inst.zona_waktu);
    } catch (err) {
      console.error("Gagal mengambil konfigurasi instansi:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      const updated = await db.updateInstansi({
        id: config.id,
        nama,
        alamat,
        logo,
        zona_waktu: zonaWaktu
      });
      setConfig({ ...config, ...updated });
      alert('Informasi profil instansi berhasil diperbarui!');
    } catch (err) {
      alert('Gagal memperbarui profil instansi.');
      console.error(err);
    }
  };

  const handleCopyCode = () => {
    if (!config) return;
    navigator.clipboard.writeText(config.kode_instansi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate / Reset Kode Instansi
  const handleResetCode = async () => {
    if (!config) return;
    const isConfirm = window.confirm(
      "PERINGATAN KEAMANAN!\n\nApakah Anda yakin ingin me-reset kode instansi? Kode lama akan tidak berlaku lagi, dan seluruh perangkat Android yang terhubung saat ini harus dikonfigurasikan ulang dengan kode baru."
    );

    if (isConfirm) {
      // Format: [TIPE]-[KOTA]-[KODE_UNIK]
      const parts = (config.kode_instansi || "SMA-MKS-0000").split('-');
      const tipe = parts[0] || "SMA";
      const kota = parts[1] || "MKS";
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const newCode = `${tipe}-${kota}-${code}`;
      
      try {
        const updated = await db.updateInstansi({
          id: config.id,
          kode_instansi: newCode
        });
        setConfig({ ...config, ...updated });

        await db.addLog(
          "user-guru", 
          "Pengajar Ujian",
          "guru",
          "Reset Kode Instansi", 
          `Mengatur ulang kode instansi unik. Kode baru: ${newCode}.`
        );

        alert(`Kode instansi berhasil di-reset!\nKode Baru Anda: ${newCode}`);
      } catch (err) {
        alert('Gagal me-reset kode instansi.');
        console.error(err);
      }
    }
  };

  if (isLoading || !config) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Pengaturan Lembaga...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
          Pengaturan Lembaga / Sekolah
        </h1>
        <p className="text-slate-400 text-sm mt-1">Konfigurasikan detail profil sekolah, integrasi APK Android, dan pengamanan kode instansi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: General Profile Form */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-200">
            <Settings className="w-4.5 h-4.5 text-blue-600" />
            <span>Informasi Umum Instansi</span>
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Resmi Lembaga / Sekolah</label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Alamat Lengkap</label>
              <textarea
                required
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Tautan Gambar Logo Instansi</label>
                <input
                  type="text"
                  required
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none font-mono text-[10px]"
                />
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

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Instance Code & Security Warning Panel */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Instance Code Card */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-blue-600" />
              <span>Kode Instansi Unik</span>
            </h3>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Kode identitas unik lembaga ini wajib dimasukkan ke dalam **Aplikasi Android (APK)** agar siswa terhubung ke pangkalan data sekolah ini.
            </p>

            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center justify-between font-mono text-base tracking-widest text-blue-600 font-bold select-all relative group shadow-inner">
              <span>{config.kode_instansi}</span>
              <button
                onClick={handleCopyCode}
                className="p-1.5 bg-white border border-slate-200 hover:border-slate-350 text-slate-400 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                title="Salin Kode"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={handleResetCode}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset & Generate Kode Baru</span>
            </button>
          </div>

          {/* School logo preview */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md text-center space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pratinjau Logo Instansi</h3>
            <img 
              src={logo} 
              alt="Logo Preview" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200&auto=format&fit=crop";
              }}
              className="w-28 h-28 rounded-2xl mx-auto object-cover border border-slate-200 shadow-xl shadow-black/45"
            />
            <p className="text-[10px] text-slate-400 font-semibold uppercase">{nama}</p>
          </div>

        </div>

      </div>
    </div>
  );
};
