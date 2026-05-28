import { useState, useEffect } from 'react';
import { LoginPortal } from './components/auth/LoginPortal';
import { SiswaPortal } from './components/siswa/SiswaPortal';
import { GuruLayout } from './components/guru/GuruLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { db, User } from './utils/supabaseDb';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user session already exists in localStorage (auto login)
    const storedUser = localStorage.getItem('ujdit_session_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('ujdit_session_user');
      }
    }
    setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center font-sans text-slate-100">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 mt-4 tracking-wider uppercase font-semibold">Memuat Sistem DIJIT...</p>
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
