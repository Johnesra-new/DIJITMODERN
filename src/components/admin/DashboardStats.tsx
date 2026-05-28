import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  Layers, 
  Activity, 
  CalendarClock 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { db, User, Exam, StudentSession } from '../../utils/supabaseDb';

export const DashboardStats: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const u = await db.getUsers();
        const e = await db.getExams();
        const s = await db.getSessions();
        setUsers(u);
        setExams(e);
        setSessions(s);
      } catch (err) {
        console.error("Gagal mengambil data statistik:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium font-mono uppercase tracking-wider">Memuat Statistik...</p>
      </div>
    );
  }

  const totalTeachers = users.filter(u => u.role === 'guru').length;
  const totalStudents = users.filter(u => u.role === 'siswa').length;
  const totalExams = exams.length;

  const examsInProgress = exams.filter(e => e.status === 'berlangsung').length;
  const examsScheduled = exams.filter(e => e.status === 'terjadwal').length;
  const examsCompleted = exams.filter(e => e.status === 'selesai').length;

  const activeTestingStudents = sessions.filter(s => s.status === 'mengerjakan').length;

  // Chart data for student class distribution
  const classCountMap: Record<string, number> = {};
  users.filter(u => u.role === 'siswa' && u.kelas).forEach(u => {
    classCountMap[u.kelas!] = (classCountMap[u.kelas!] || 0) + 1;
  });

  const chartData = Object.keys(classCountMap).map(cls => ({
    name: cls,
    'Jumlah Siswa': classCountMap[cls]
  }));

  const statCards = [
    {
      title: 'Total Guru Pengajar',
      value: totalTeachers,
      desc: 'Mengampu berbagai mapel',
      icon: Users,
      color: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/10'
    },
    {
      title: 'Total Siswa Terdaftar',
      value: totalStudents,
      desc: 'Aktif di kelas MIPA/IPS',
      icon: GraduationCap,
      color: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-500/10'
    },
    {
      title: 'Siswa Sedang Ujian (Live)',
      value: activeTestingStudents,
      desc: 'Terpantau kamera anti-contek',
      icon: Activity,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/10',
      animatePulse: activeTestingStudents > 0
    },
    {
      title: 'Total Jadwal Ujian',
      value: totalExams,
      desc: `Aktif: ${examsInProgress} | Jadwal: ${examsScheduled} | Selesai: ${examsCompleted}`,
      icon: CalendarClock,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/10'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
          Ringkasan Statistik Instansi
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Pantau seluruh aktivitas operasional sekolah, ujian aktif, dan data guru/siswa secara real-time.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i}
              className={`p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md shadow-lg ${card.shadow} flex justify-between items-start hover:scale-[1.02] hover:border-slate-300/60 transition-all duration-300 relative overflow-hidden`}
            >
              {card.animatePulse && (
                <div className="absolute top-0 right-0 p-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </div>
              )}
              <div className="space-y-2.5">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">{card.title}</span>
                <span className="text-3xl font-bold font-mono text-slate-900 tracking-tight block">{card.value}</span>
                <span className="text-[11px] text-slate-400 block leading-tight">{card.desc}</span>
              </div>
              <div className={`p-3 bg-gradient-to-tr ${card.color} rounded-xl shadow-lg shrink-0 text-slate-900`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Class Chart & Ongoing Exams */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Card: Student Distribution Chart */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md lg:col-span-3 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Distribusi Siswa per Kelas</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Jumlah persebaran akun siswa yang terdaftar di masing-masing rombongan belajar.</p>
          </div>

          <div className="w-full h-64 font-mono text-xs">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">Tidak ada data siswa.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontFamily: 'monospace'
                    }} 
                  />
                  <Bar dataKey="Jumlah Siswa" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Card: Ongoing Exams Watch list */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white backdrop-blur-md lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-cyan-600" />
              <span>Status Ujian Terkini</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Jadwal ujian terdekat yang terdaftar dalam database ekosistem.</p>
          </div>

          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {exams.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">Belum ada ujian terdaftar.</p>
            ) : (
              exams.map((exam) => {
                const totalJoined = sessions.filter(s => s.ujian_id === exam.id).length;
                const activeSess = sessions.filter(s => s.ujian_id === exam.id && s.status === 'mengerjakan').length;

                return (
                  <div 
                    key={exam.id} 
                    className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-200 flex justify-between items-center gap-3 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-cyan-600 font-semibold uppercase">
                          {exam.mapel}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${
                          exam.status === 'berlangsung' 
                            ? 'bg-emerald-500 animate-pulse'
                            : exam.status === 'terjadwal' 
                            ? 'bg-cyan-500'
                            : 'bg-slate-500'
                        }`}></span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-xs truncate" title={exam.judul}>{exam.judul}</h4>
                      <p className="text-[10px] text-slate-400 leading-none flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(exam.waktu_mulai).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        exam.status === 'berlangsung'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                          : exam.status === 'terjadwal'
                          ? 'bg-cyan-50 border-cyan-900 text-cyan-600'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}>
                        {exam.status === 'berlangsung' ? `Live: ${activeSess}/${totalJoined}` : exam.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
