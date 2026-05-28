import React, { useState, useEffect } from 'react';
import { Shield, Key, User as UserIcon, AlertCircle, RefreshCw } from 'lucide-react';
import { db, User } from '../../utils/supabaseDb';

interface LoginPortalProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate a simple 5-character Captcha Code
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  // Lock account simulation timer
  useEffect(() => {
    if (isLocked && lockTimeLeft > 0) {
      const timer = setTimeout(() => {
        setLockTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isLocked && lockTimeLeft === 0) {
      setIsLocked(false);
      setFailedAttempts(0);
      setShowCaptcha(false);
    }
  }, [isLocked, lockTimeLeft]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      setErrorMsg(`Akun terkunci. Silakan tunggu ${lockTimeLeft} detik lagi.`);
      return;
    }

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan password harus diisi.');
      return;
    }

    // Verify Captcha if triggered
    if (showCaptcha && captchaInput.toUpperCase() !== captchaCode) {
      setErrorMsg('Kode Keamanan (CAPTCHA) tidak valid!');
      generateCaptcha();
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Search user in Supabase DB by username, email, or NIP/NIS
      const foundUser = await db.getUserByLogin(username.trim());

      // Verifikasi password asli: jika kolom password_hash ada di DB, bandingkan langsung.
      // Jika kosong atau tidak ada (misalnya untuk demo), maka perbolehkan string apa saja (kecuali "salah")
      const isPasswordCorrect = foundUser && foundUser.password_hash 
        ? password === foundUser.password_hash 
        : password !== 'salah';

      if (foundUser && isPasswordCorrect) {
        if (foundUser.status === 'nonaktif') {
          setErrorMsg('Akun Anda telah dinonaktifkan oleh administrator.');
          await db.addLog(foundUser.id, foundUser.name, foundUser.role, "Gagal Login", "Mencoba masuk namun status akun dinonaktifkan.");
          setIsSubmitting(false);
          return;
        }

        // Success
        setErrorMsg('');
        setFailedAttempts(0);
        setShowCaptcha(false);
        
        await db.addLog(foundUser.id, foundUser.name, foundUser.role, "Login", `Berhasil masuk sebagai ${foundUser.role}.`);
        onLoginSuccess(foundUser);
      } else {
        // Failed login attempt
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (nextAttempts >= 10) {
          setIsLocked(true);
          setLockTimeLeft(60); // 60s for easier testing
          setErrorMsg('Terlalu banyak kegagalan! Akun Anda terkunci selama 30 menit.');
          if (foundUser) {
            await db.addLog(foundUser.id, foundUser.name, foundUser.role, "Kunci Akun", "Akun terkunci otomatis akibat 10x gagal login.");
          }
        } else if (nextAttempts >= 5) {
          setShowCaptcha(true);
          generateCaptcha();
          setErrorMsg('Username atau password salah. Silakan selesaikan CAPTCHA.');
        } else {
          setErrorMsg(`Username atau password salah! (${nextAttempts}/5 percobaan sebelum CAPTCHA)`);
        }
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan sistem saat menghubungi database.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center relative overflow-hidden font-sans">
      {/* Background Neon Glowing Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/20 blur-[150px] rounded-full"></div>

      <div className="w-full max-w-md p-8 rounded-2xl border border-slate-200 bg-white/60 backdrop-blur-xl shadow-2xl relative z-10 mx-4">
        {/* Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-purple-600 to-cyan-500 rounded-2xl shadow-lg shadow-cyan-500/20 mb-4 animate-pulse">
            <Shield className="w-10 h-10 text-slate-900" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            DIJIT - Ujian Digital
          </h1>
          <p className="text-slate-400 text-sm mt-1 text-center">
            Pusat Kendali Ujian Nasional & Instansi Anti-Contek
          </p>
        </div>

        {/* Lock Screen overlay */}
        {isLocked ? (
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-semibold text-rose-600">Akun Terkunci Sementara</h3>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">
              Anda telah salah memasukkan password sebanyak 10 kali.<br />
              Demi alasan keamanan, sistem mengunci login selama 30 menit.
            </p>
            <div className="mt-6 px-6 py-3 bg-slate-50/80 rounded-xl border border-rose-950/50 inline-block font-mono text-lg text-rose-600">
              Sisa Waktu: {Math.floor(lockTimeLeft / 60)}m {lockTimeLeft % 60}s
            </div>
            <button
              onClick={() => { setIsLocked(false); setFailedAttempts(0); setShowCaptcha(false); setErrorMsg(''); }}
              className="mt-6 text-xs text-cyan-600 hover:text-cyan-300 underline cursor-pointer block mx-auto"
            >
              Simulasi Reset Kunci (Demo Dev)
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl flex items-start gap-2.5 text-rose-300 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                Username / NIP / NIS
              </label>
              <div className="relative">
                <UserIcon className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username/NIP/NIS..."
                  className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-350 focus:border-cyan-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-500/10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
                  Kata Sandi
                </label>
                <a href="#lupa" onClick={() => alert('Fitur pemulihan kata sandi dapat dilakukan melalui Admin Instansi.')} className="text-xs text-cyan-600 hover:text-cyan-300 transition-colors">
                  Lupa Password?
                </a>
              </div>
              <div className="relative">
                <Key className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-350 focus:border-cyan-500/80 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-600 focus:ring-2 focus:ring-cyan-500/10"
                />
              </div>
            </div>

            {/* Captcha */}
            {showCaptcha && (
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center gap-4">
                  <div className="px-4 py-2 bg-gradient-to-r from-purple-950 to-slate-900 rounded-lg border border-purple-800/40 select-none tracking-widest font-mono text-xl text-center text-blue-600 font-bold italic shadow-inner w-2/3">
                    {captchaCode}
                  </div>
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-5 h-5 animate-spin-slow" />
                  </button>
                </div>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Ketik kode keamanan di atas..."
                  className="w-full bg-slate-50/70 border border-slate-200 focus:border-cyan-500 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-slate-900 font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/10 hover:shadow-blue-500/30 active:scale-[0.99] transition-all cursor-pointer text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
            </button>
          </form>
        )}

        {/* Demo Helper Guide */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-400 text-center uppercase tracking-wider mb-2">Panduan Akun Uji Coba</p>
          <div className="space-y-2 text-[10px]">
            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-center font-mono">
              <span className="font-semibold text-purple-600 block text-xs">Super Admin (Owner)</span>
              username: <code className="text-slate-900 font-bold">STIVENJOSH</code><br/>
              password: <code className="text-slate-900 font-bold">STIVENJGJGA123</code>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-center">
                <span className="font-semibold text-cyan-600 block text-xs">Guru (Super User)</span>
                username: <code className="text-slate-700">budi</code>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-center">
                <span className="font-semibold text-emerald-600 block text-xs">Siswa</span>
                username: <code className="text-slate-700">siswa1</code>
              </div>
            </div>
          </div>
          <p className="text-center text-[9px] text-slate-500 italic mt-2">
            *Untuk Guru & Siswa, ketik password apa saja (kecuali "salah").
          </p>
        </div>
      </div>
    </div>
  );
};
