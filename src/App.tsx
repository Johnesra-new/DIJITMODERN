import { useState, useEffect } from 'react';
import { LoginPortal } from './components/auth/LoginPortal';
import { SiswaPortal } from './components/siswa/SiswaPortal';
import { GuruLayout } from './components/guru/GuruLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { db, User } from './utils/supabaseDb';
import { ShieldAlert, Smartphone, Laptop, KeyRound, Sparkles } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Security container validation states
  const [isSecureApp, setIsSecureApp] = useState(false);
  const [bypassSecureApp, setBypassSecureApp] = useState(false);
  const [showBypassInput, setShowBypassInput] = useState(false);
  const [bypassPassword, setBypassPassword] = useState('');
  const [bypassError, setBypassError] = useState('');

  useEffect(() => {
    // 1. Check if user session already exists in localStorage (auto login)
    const storedUser = localStorage.getItem('ujdit_session_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('ujdit_session_user');
      }
    }
    
    // 2. Check if developer bypass is already set
    const savedBypass = localStorage.getItem('dijit_bypass_secure');
    if (savedBypass === 'true') {
      setBypassSecureApp(true);
    }

    // 3. Security validation logic
    const checkSecurityContainer = () => {
      const isLocalhost = 
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.startsWith('192.168.');
      
      const hasSecureUserAgent = navigator.userAgent.includes('DIJIT-SECURE-APP');
      const hasSecureBridge = !!(window as any).isDijitSecureApp;
      
      // If running locally, or within the secure app container, pass the check
      if (isLocalhost || hasSecureUserAgent || hasSecureBridge) {
        setIsSecureApp(true);
      } else {
        setIsSecureApp(false);
      }
    };

    checkSecurityContainer();
    // Run an interval check in case the webview bridge is injected slightly later
    const interval = setInterval(checkSecurityContainer, 1000);
    
    setIsLoading(false);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('ujdit_session_user', JSON.stringify(user));
  };

  const handleUserUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('ujdit_session_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    if (currentUser) {
      db.addLog(currentUser.id, currentUser.name, currentUser.role, "Logout", "Keluar dari sesi sistem.").catch(console.error);
    }
    setCurrentUser(null);
    localStorage.removeItem('ujdit_session_user');
  };

  const handleDeveloperBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bypassPassword === 'STIVENJGJGA123') {
      setBypassSecureApp(true);
      localStorage.setItem('dijit_bypass_secure', 'true');
      setBypassError('');
      setShowBypassInput(false);
    } else {
      setBypassError('Password Super Admin tidak valid!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center font-sans text-slate-100">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-4 tracking-wider uppercase font-semibold">Memuat Sistem DIJIT...</p>
      </div>
    );
  }

  // Anti-Cheat Secure Guard Page (Blocks regular browsers outside localhost/app)
  if (!isSecureApp && !bypassSecureApp) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center relative overflow-hidden font-sans p-4">
        {/* Background Ambient Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/10 blur-[180px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/10 blur-[180px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-xl p-8 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl relative z-10 text-center space-y-6">
          
          {/* Header Secure Shield */}
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-tr from-amber-500 to-rose-600 rounded-3xl shadow-xl shadow-rose-950/40 relative animate-pulse">
              <ShieldAlert className="w-12 h-12 text-slate-950" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent uppercase tracking-wider">
              Portal Ujian DIJIT Terkunci
            </h1>
            <div className="h-0.5 w-24 bg-gradient-to-r from-amber-500 to-rose-600 mx-auto rounded-full"></div>
            <p className="text-rose-400 font-semibold text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-1.5">
              <span>Sistem Proteksi Anti-Cheat Aktif</span>
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            </p>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            Demi menjaga integritas, keamanan, dan mencegah kecurangan (anti-contek) saat ujian berlangsung, Anda 
            <span className="text-white font-bold"> WAJIB </span> mengakses website ini melalui 
            <span className="text-amber-400 font-bold"> Aplikasi Resmi DIJIT (APK Android / EXE Desktop)</span>.
          </p>

          {/* Setup / Instructions Carousel for APK Developers */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/80 text-left space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Panduan Hubungkan APK / EXE Anda</span>
            </h3>
            
            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-cyan-400 shrink-0">1</div>
                <p className="leading-relaxed">
                  <span className="text-slate-200 font-bold block mb-0.5">Atur Custom User-Agent</span>
                  Tambahkan string <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-bold text-amber-400">DIJIT-SECURE-APP</code> ke dalam header User-Agent WebView pada aplikasi Android/EXE Anda.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-cyan-400 shrink-0">2</div>
                <p className="leading-relaxed">
                  <span className="text-slate-200 font-bold block mb-0.5">Injeksi Global Script (Alternatif)</span>
                  Injeksi kode javascript <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded font-bold text-cyan-400">window.isDijitSecureApp = true;</code> sesaat setelah halaman web dimuat dalam WebView.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Min. SDK 21 (Android 5.0)</span>
              </div>
              <div className="w-1 h-1 bg-slate-700 rounded-full my-auto"></div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <Laptop className="w-3.5 h-3.5" />
                <span>Windows WebView2 Runtime</span>
              </div>
            </div>

            {/* Hidden developer bypass logic */}
            <div className="w-full">
              {!showBypassInput ? (
                <button
                  onClick={() => setShowBypassInput(true)}
                  className="text-[10px] text-slate-600 hover:text-cyan-400 underline transition-colors cursor-pointer"
                >
                  Masuk sebagai Developer (Bypass Sandbox)
                </button>
              ) : (
                <form onSubmit={handleDeveloperBypassSubmit} className="max-w-xs mx-auto mt-2 p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3 animate-fade-in">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Verifikasi Akun Super Admin</span>
                  {bypassError && (
                    <p className="text-[10px] text-rose-500 font-semibold">{bypassError}</p>
                  )}
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      value={bypassPassword}
                      onChange={(e) => setBypassPassword(e.target.value)}
                      placeholder="Sandi Super Admin..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs outline-none text-white focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-[10px]">
                    <button 
                      type="button" 
                      onClick={() => { setShowBypassInput(false); setBypassError(''); setBypassPassword(''); }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 rounded text-slate-400 font-medium cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-slate-950 font-bold rounded hover:opacity-90 cursor-pointer"
                    >
                      Bypass
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Routing based on user role (PRD Bagian 3.1)
  if (!currentUser) {
    return <LoginPortal onLoginSuccess={handleLoginSuccess} />;
  }

  switch (currentUser.role) {
    case 'admin':
      return <AdminLayout adminUser={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
    case 'guru':
      return <GuruLayout guruUser={currentUser} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
    case 'siswa':
      return <SiswaPortal siswa={currentUser} onLogout={handleLogout} />;
    default:
      return <LoginPortal onLoginSuccess={handleLoginSuccess} />;
  }
}

export default App;
