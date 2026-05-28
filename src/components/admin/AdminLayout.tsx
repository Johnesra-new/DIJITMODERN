import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Activity, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';
import { db, User, InstansiConfig } from '../../utils/supabaseDb';
import { DashboardStats } from './DashboardStats';
import { GuruManagement } from './GuruManagement';
import { InstansiSettings } from './InstansiSettings';
import { ActivityLogs } from './ActivityLogs';
import { ProfileSettings } from '../profile/ProfileSettings';

interface AdminLayoutProps {
  adminUser: User;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ adminUser, onLogout, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'guru' | 'instansi' | 'logs' | 'profile'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [instansi, setInstansi] = useState<InstansiConfig>({
    nama: 'DIJIT Ujian Digital',
    logo: '',
    alamat: '',
    kode_instansi: '',
    zona_waktu: ''
  });

  useEffect(() => {
    const fetchInstansi = async () => {
      try {
        const inst = await db.getInstansi();
        if (inst) {
          setInstansi(inst);
        }
      } catch (err) {
        console.error("Gagal mengambil profil sekolah:", err);
      }
    };
    fetchInstansi();
  }, [activeTab]);

  const menuItems = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'instansi', label: 'Manajemen Instansi', icon: Settings },
    { id: 'logs', label: 'Log Aktivitas', icon: Activity },
    { id: 'profile', label: 'Profil Saya', icon: UserIcon },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardStats />;
      case 'instansi':
        return <InstansiSettings />;
      case 'logs':
        return <ActivityLogs />;
      case 'profile':
        return <ProfileSettings currentUser={adminUser} onUpdate={onUserUpdate} />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans relative overflow-hidden">
      {/* Dynamic Background Neon Effects */}
      <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] bg-blue-200/40 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-30%] left-[-10%] w-[600px] h-[600px] bg-cyan-900/10 blur-[150px] rounded-full pointer-events-none"></div>

      {/* Mobile Sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/30 shrink-0">
                S
              </div>
              <div>
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  DIJIT Super
                </span>
                <span className="text-[9px] text-purple-600 block font-semibold tracking-widest uppercase">Pusat Kendali</span>
              </div>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-900 lg:hidden cursor-pointer"
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
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 text-blue-800 shadow-md shadow-blue-500/10'
                      : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100 border-l-4 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
            <img 
              src={adminUser.avatar || "https://api.dicebear.com/7.x/adventurer/svg?seed=StivenJosh"}
              alt="Admin Profile"
              className="w-9 h-9 rounded-full object-cover border border-slate-300 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{adminUser.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
                <span className="text-[9px] text-purple-600 font-medium tracking-wide uppercase">Super Admin</span>
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-400 hover:text-rose-300 hover:bg-rose-50 border-l-4 border-transparent rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-600" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        
        {/* Top Navbar Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-400 hover:text-slate-900 lg:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm md:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>Pusat Kendali Sistem</span>
              <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-full text-[9px] text-purple-600 font-mono tracking-wider font-bold">
                GLOBAL
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold tracking-wide bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>SISTEM AKTIF</span>
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
