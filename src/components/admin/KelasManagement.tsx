import React, { useState, useEffect } from 'react';
import { BookOpen, UserCheck, Users, Plus, X } from 'lucide-react';
import { db, User } from '../../utils/supabaseDb';

export const KelasManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [customClasses, setCustomClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("XII MIPA 1");
  const [newClassName, setNewClassName] = useState('');
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const allUsers = await db.getUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error("Gagal memuat data rombel:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const teachers = users.filter(u => u.role === 'guru');
  const students = users.filter(u => u.role === 'siswa');

  // Group classes dynamically from students and any newly added custom classes
  const classes = Array.from(new Set([
    ...customClasses,
    ...(students.map(s => s.kelas).filter(Boolean) as string[])
  ]));
  if (classes.length === 0) {
    classes.push("XII MIPA 1", "XII MIPA 2", "XII IPS 1", "XII IPS 2");
  }

  // Filter students in active class
  const classStudents = students.filter(s => s.kelas === selectedClass);
  
  // Get primary teacher/homeroom teacher for the class dynamically from teachers list
  const getClassTeacher = (className: string) => {
    if (teachers.length === 0) return null;
    const index = classes.indexOf(className);
    return teachers[index >= 0 ? index % teachers.length : 0] || null;
  };

  const activeTeacher = getClassTeacher(selectedClass);

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const upperName = newClassName.trim().toUpperCase();
    if (classes.includes(upperName)) {
      alert(`Kelas '${upperName}' sudah ada!`);
      return;
    }
    setCustomClasses(prev => [...prev, upperName]);
    setSelectedClass(upperName);
    setNewClassName('');
    setIsAddClassOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">Memuat Rombongan Belajar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
            Manajemen Rombongan Belajar (Kelas)
          </h1>
          <p className="text-slate-400 text-sm mt-1">Kelola pembagian kelas, assign wali kelas / pengajar, serta pantau siswa di masing-masing rombel.</p>
        </div>
        <button
          onClick={() => setIsAddClassOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Kelas Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left column: list of classes */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Daftar Rombel</h3>
          <div className="space-y-2">
            {classes.map((cls, i) => {
              const isActive = selectedClass === cls;
              const count = students.filter(s => s.kelas === cls).length;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedClass(cls)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-500 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>{cls}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md font-mono text-xs text-slate-400">
                    {count} Siswa
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right columns: class details */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Class Summary card */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span>Rombel {selectedClass}</span>
              </h2>
              <p className="text-xs text-slate-400">Materi pengajaran disesuaikan dengan jurusan program peminatan.</p>
              <div className="flex gap-4 pt-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <strong>{classStudents.length}</strong> Siswa Terdaftar
                </span>
              </div>
            </div>

            {/* Assigned Teacher Card */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center gap-3.5">
              {activeTeacher ? (
                <>
                  <img 
                    src={activeTeacher.avatar} 
                    alt={activeTeacher.name} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div>
                    <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider block">Wali Kelas / Pengajar Utama</span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{activeTeacher.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIP: {activeTeacher.nip_nis}</p>
                  </div>
                </>
              ) : (
                <p className="text-slate-650 text-xs italic">Belum ada pengajar ditugaskan ke kelas ini.</p>
              )}
            </div>
          </div>

          {/* Student List in Class card */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-500" />
              <span>Daftar Siswa Rombel {selectedClass}</span>
            </h3>

            <div className="overflow-x-auto max-h-96 overflow-y-auto pr-1">
              {classStudents.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-8">Tidak ada siswa yang terdaftar di kelas ini.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider pb-2">
                      <th className="pb-2 font-semibold">Nama Siswa</th>
                      <th className="pb-2 font-semibold">NIS</th>
                      <th className="pb-2 font-semibold">Email</th>
                      <th className="pb-2 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((stud) => (
                      <tr key={stud.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 pr-2 font-semibold text-slate-800">{stud.name}</td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-slate-405">{stud.nip_nis}</td>
                        <td className="py-2.5 px-2 text-slate-500">{stud.email}</td>
                        <td className="py-2.5 pl-2 text-right">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                            stud.status === 'aktif' ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-slate-400'
                          }`} title={stud.status === 'aktif' ? 'Aktif' : 'Nonaktif'}></span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Add Class Modal */}
      {isAddClassOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Buat Rombel Baru</span>
              </h3>
              <button onClick={() => setIsAddClassOpen(false)} className="text-slate-400 hover:text-slate-900 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Nama Kelas / Rombongan Belajar</label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value.toUpperCase())}
                  placeholder="XII MIPA 3"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-655 text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  Buat Rombel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
