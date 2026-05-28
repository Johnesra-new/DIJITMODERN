import React, { useState, useEffect } from 'react';
import { Activity, Search, ShieldCheck, User, Users } from 'lucide-react';
import { db, ActivityLog } from '../../utils/supabaseDb';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'semua' | 'admin' | 'guru' | 'siswa'>('semua');
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = async () => {
    try {
      const allLogs = await db.getLogs();
      setLogs(allLogs);
    } catch (err) {
      console.error("Gagal memuat log aktivitas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />;
      case 'guru':
        return <Users className="w-3.5 h-3.5 text-blue-600" />;
      case 'siswa':
        return <User className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.nama_pengguna || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.aktivitas || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.detail || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'semua' || log.peran === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Log Audit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            Log Aktivitas & Audit Sistem
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pantau seluruh catatan kejadian penting, riwayat masuk pengguna, kecurangan ujian, dan ekspor data.</p>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
        
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari log berdasarkan nama / detail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2 px-10 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Role Filter */}
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            {(['semua', 'admin', 'guru', 'siswa'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  roleFilter === role
                    ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500 text-blue-800 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-700'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Timeline */}
        <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <p className="text-slate-400 text-xs text-center py-12">Tidak ada log aktivitas terdaftar.</p>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-350 transition-colors flex flex-col sm:flex-row justify-between items-start gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-50 border border-slate-200 rounded font-semibold text-[10px] uppercase text-slate-700">
                      {getRoleIcon(log.peran)}
                      <span>{log.nama_pengguna}</span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded font-mono text-[9px] font-semibold border ${
                      log.aktivitas.includes('Gagal') || log.aktivitas.includes('Pelanggaran') || log.aktivitas.includes('Kunci') || log.aktivitas.includes('DIBLOKIR')
                        ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      {log.aktivitas}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{log.detail}</p>
                </div>

                <div className="shrink-0 text-[10px] text-slate-400 font-mono mt-1 sm:mt-0">
                  🕒 {new Date(log.waktu).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Audit Disclaimer */}
        <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center font-medium italic">
          *Sistem audit trail mencatat seluruh aktivitas pengawasan dan perubahan database untuk menjaga akuntabilitas ujian secara permanen.
        </div>
      </div>
    </div>
  );
};
