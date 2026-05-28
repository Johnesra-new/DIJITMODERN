import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Database, 
  Tv, 
  BarChart4, 
  LogOut, 
  Menu, 
  X, 
  GraduationCap,
  Users,
  UserCheck,
  BookOpen,
  Settings,
  Activity,
  User as UserIcon
} from 'lucide-react';
import { db, User } from '../../utils/supabaseDb';
import { BankUjianMapel } from './BankUjianMapel';
import { LiveMonitor } from './LiveMonitor';
import { RekapNilai } from './RekapNilai';
import { SiswaManagement } from '../admin/SiswaManagement';
import { KelasManagement } from '../admin/KelasManagement';
import { ProfileSettings } from '../profile/ProfileSettings';

interface GuruLayoutProps {
  guruUser: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const GuruLayout: React.FC<GuruLayoutProps> = ({ guruUser, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'bank_ujian_mapel' | 'monitor' | 'rekap' | 'siswa' | 'kelas' | 'profile'
  >('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [instansi, setInstansi] = useState<{ nama: string; logo: string }>({ nama: 'DIJIT Ujian Digital', logo: '' });
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [activeExamsCount, setActiveExamsCount] = useState(0);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const inst = await db.getInstansi();
        setInstansi({ nama: inst.nama, logo: inst.logo });

        const questions = await db.getQuestions();
        const filteredQ = questions.filter(q => q.guru_id === guruUser.id);
        setTotalQuestions(filteredQ.length);

        const exams = await db.getExams();
        const filteredE = exams.filter(e => e.guru_id === guruUser.id && e.status === 'berlangsung');
        setActiveExamsCount(filteredE.length);
      } catch (err) {
        console.error("Gagal memuat statistik dasbor:", err);
      }
    };
    loadStats();
  }, [guruUser.id, activeTab]);

  interface MenuItem {
    id: 'dashboard' | 'bank_ujian_mapel' | 'monitor' | 'rekap' | 'siswa' | 'kelas' | 'profile';
    label: string;
    icon: any;
    isLive?: boolean;
    isDividerBefore?: boolean;
  }

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Ringkasan Kelas', icon: LayoutDashboard },
    { id: 'bank_ujian_mapel', label: 'Bank Ujian Mapel', icon: Database },
    { id: 'monitor', label: 'Monitor Live', icon: Tv, isLive: true },
    { id: 'rekap', label: 'Rekap Nilai', icon: BarChart4 },
    
    // Kelompok Siswa & Rombel (Dipindahkan ke Guru)
    { id: 'siswa', label: 'Manajemen Siswa', icon: UserCheck, isDividerBefore: true },
    { id: 'kelas', label: 'Rombongan Belajar', icon: BookOpen },
    { id: 'profile', label: 'Profil Saya', icon: UserIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
                Dasbor Guru Mata Pelajaran
              </h1>
              <p className="text-slate-400 text-sm mt-1">Selamat datang kembali, {guruUser.name}. Pantau dan kelola evaluasi belajar siswa.</p>
            </div>
            
            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mata Pelajaran diampu</span>
                <span className="text-xl font-bold text-slate-800 mt-2 block font-mono">
                  {guruUser.mapel ? guruUser.mapel.join(', ') : 'Belum di-assign'}
                </span>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Soal Bank Soal</span>
                <span className="text-3xl font-bold font-mono text-blue-600 mt-2 block">
                  {totalQuestions} Soal
                </span>
              </div>
              <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ujian Sedang Berlangsung</span>
                <span className="text-3xl font-bold font-mono text-cyan-400 mt-2 block">
                  {activeExamsCount} Aktif
                </span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-slate-800">Akses Cepat Pengelolaan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => setActiveTab('bank_ujian_mapel')}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-center transition-all cursor-pointer space-y-1.5"
                >
                  <p className="text-xs font-bold text-slate-700">Bank Ujian Mapel</p>
                  <p className="text-[10px] text-slate-400">Buat ujian & Kelola Soal</p>
                </button>
                <button 
                  onClick={() => setActiveTab('monitor')}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-center transition-all cursor-pointer space-y-1.5"
                >
                  <p className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5">
                    <span>Monitor Kamera Live</span>
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                  </p>
                  <p className="text-[10px] text-slate-400">Deteksi wajah & anti-cheat</p>
                </button>
                <button 
                  onClick={() => setActiveTab('rekap')}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-center transition-all cursor-pointer space-y-1.5"
                >
                  <p className="text-xs font-bold text-slate-700">Unduh Rekap Excel</p>
                  <p className="text-[10px] text-slate-400">Ekspor nilai siswa & log</p>
                </button>
              </div>
            </div>
          </div>
        );
      case 'bank_ujian_mapel':
        return <BankUjianMapel guruUser={guruUser} />;
      case 'monitor':
        return <LiveMonitor guruUser={guruUser} />;
      case 'rekap':
        return <RekapNilai guruUser={guruUser} />;
      case 'siswa':
        return <SiswaManagement currentUser={guruUser} />;
      case 'kelas':
        return <KelasManagement />;
      case 'profile':
        return <ProfileSettings currentUser={guruUser} onUpdate={onUserUpdate} />;
      default:
        return <BankUjianMapel guruUser={guruUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans relative overflow-hidden">
      {/* Background neon elements */}
      <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] bg-blue-200/40 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-30%] left-[-10%] w-[600px] h-[600px] bg-cyan-200/30 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Mobile Sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-white backdrop-blur-xl border-r border-slate-200 p-5 flex flex-col justify-between transition-transform duration-300 z-50 lg:translate-x-0 lg:static ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-6">
          {/* Logo / Brand Header */}
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30 shrink-0">
                G
              </div>
              <div>
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  DIJIT Guru
                </span>
                <span className="text-[9px] text-blue-600 block font-semibold tracking-widest uppercase">Pengawas Ujian</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-white lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <React.Fragment key={item.id}>
                  {item.isDividerBefore && (
                    <div className="pt-4 pb-1.5 border-t border-slate-200 mt-4 first:mt-0 first:pt-0 first:border-t-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block px-4">Administrasi</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 text-blue-800 shadow-md shadow-blue-500/10'
                        : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.isLive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
            <img 
              src={guruUser.avatar}
              alt="Guru Profile"
              className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{guruUser.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <GraduationCap className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="text-[9px] text-blue-600 font-medium tracking-wide uppercase">Pengajar Ujian</span>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-400 hover:text-rose-300 hover:bg-rose-50 border-l-4 border-transparent rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-400" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        
        {/* Top Navbar Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-400 hover:text-white lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm md:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>{instansi.nama}</span>
              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-full text-[9px] text-slate-400 font-mono tracking-wider">
                Guru Panel
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold tracking-wide bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span>GURU AKTIF</span>
          </div>
        </header>

        {/* Content Router Container */}
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto relative z-10">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
