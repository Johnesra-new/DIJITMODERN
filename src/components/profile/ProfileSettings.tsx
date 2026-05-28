import React, { useState, useRef } from 'react';
import { User as UserIcon, Mail, Key, Shield, UploadCloud, CheckCircle2, UserCheck, Loader2 } from 'lucide-react';
import { db, User } from '../../utils/supabaseDb';

interface ProfileSettingsProps {
  currentUser: User;
  onUpdate: (user: User) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onUpdate }) => {
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [password, setPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instant avatar presets from Dicebear
  const avatarPresets = [
    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(currentUser.name)}`,
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.name)}`,
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser.username)}`,
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}`
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const path = `avatars/${currentUser.id}_${Date.now()}_${file.name}`;
      const url = await db.uploadMedia(file, path);
      setAvatar(url);
      setSuccessMsg("Foto profil berhasil diunggah!");
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal mengunggah foto profil.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim()) {
      setErrorMsg("Nama, Username, dan Email wajib diisi!");
      return;
    }

    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload: Partial<User> & { id: string } = {
        id: currentUser.id,
        name,
        username,
        email,
        avatar
      };

      if (password.trim()) {
        payload.password_hash = password; // updates password in database
      }

      const updatedUser = await db.updateUser(payload);
      
      // Log the profile update
      await db.addLog(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        "Update Profil",
        `Mengubah informasi profil pribadi.`
      );

      onUpdate(updatedUser);
      setSuccessMsg("Profil Anda berhasil diperbarui!");
      setPassword('');
    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal menyimpan profil. Kemungkinan username sudah terdaftar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto font-sans">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
          Pengaturan Profil Saya
        </h1>
        <p className="text-slate-400 text-sm mt-1">Kelola data pribadi, foto profil, dan kata sandi akses akun Anda.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Info Header Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8 flex flex-col sm:flex-row items-center gap-5 border-b border-slate-200">
          <div className="relative shrink-0 group">
            <img 
              src={avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop"} 
              alt="Avatar Profile" 
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md bg-slate-50"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-white font-bold text-lg">{currentUser.name}</h3>
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">{currentUser.role === 'admin' ? 'Administrator' : 'Guru Pengajar'}</p>
            <p className="text-blue-100 text-[10px] opacity-75">{currentUser.nip_nis ? `NIP: ${currentUser.nip_nis}` : `NIS: ${currentUser.nip_nis}`}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-medium">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
              <Shield className="w-4.5 h-4.5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Avatar selector options */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Foto Profil / Avatar</label>
            <div className="flex flex-wrap items-center gap-3">
              {avatarPresets.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setAvatar(preset)}
                  className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-all p-0.5 bg-slate-50 shrink-0 cursor-pointer ${
                    avatar === preset ? 'border-blue-500 scale-105 shadow-sm shadow-blue-500/20' : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  <img src={preset} alt={`Preset ${idx}`} className="w-full h-full rounded-full object-cover" />
                </button>
              ))}
              
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 text-[11px] font-bold shadow-sm transition-colors cursor-pointer bg-white shrink-0 disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                Unggah Foto
              </button>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Form input fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nama Lengkap</label>
              <div className="relative">
                <UserCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500/80 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-700 outline-none"
                  placeholder="Nama Lengkap..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500/80 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-700 outline-none"
                  placeholder="Username..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alamat Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500/80 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-700 outline-none"
                  placeholder="Alamat Email..."
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kata Sandi Baru (Opsional)</label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500/80 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-700 outline-none"
                  placeholder="Kosongkan jika tidak diubah..."
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
