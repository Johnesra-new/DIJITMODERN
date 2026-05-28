// Mock Database System using LocalStorage for "Sistem Ujian Digital Anti-Contek"
// This utility handles data persistence and mock API simulation in the frontend.

export interface User {
  id: string;
  username: string;
  name: string;
  nip_nis: string;
  email: string;
  role: 'admin' | 'guru' | 'siswa';
  status: 'aktif' | 'nonaktif';
  mapel?: string[]; // for guru
  kelas?: string;    // for siswa
  avatar?: string;
}

export interface Question {
  id: string;
  guruId: string;
  tipe: 'pg' | 'pgk' | 'bs' | 'video' | 'gambar' | 'menjodohkan';
  pertanyaan: string; // supports rich text / mathematical formulas
  pilihan?: string[]; // choices for pg, pgk, video, gambar
  matchingData?: { baris: string[], kolom: string[] }; // For menjodohkan type
  jawabanBenar: string | string[] | boolean | Record<string, string>; // PG: choice index, PGK: array of indices, B/S: boolean, Menjodohkan: map of rowIndex -> colIndex
  mediaUrl?: string; // image path or video path
  videoOptions?: {
    repeatLimit: number;
    showAnswersAfterFinish: boolean;
  };
  kesulitan: 'mudah' | 'sedang' | 'sulit';
  tags: string[];
  bobot: number;
}

export interface Exam {
  id: string;
  guruId: string;
  judul: string;
  mapel: string;
  kelasIds: string[]; // classes allowed
  deskripsi: string;
  waktuMulai: string; // ISO String
  waktuSelesai: string; // ISO String
  durasi: number; // in minutes
  soalIds: string[];
  acakSoal: boolean;
  acakPilihan: boolean;
  wajibKamera: boolean;
  tokenAktif: boolean;
  kalkulator: boolean;
  tampilkanJawaban: boolean;
  token: string; // 6 characters unique (e.g. UJI-7K2)
  passingGrade: number; // minimum score (e.g. 75)
  status: 'draft' | 'terjadwal' | 'berlangsung' | 'selesai' | 'diarsipkan';
}

export interface Violation {
  waktu: string;
  tipe: 'keluar_aplikasi' | 'wajah_hilang' | 'multi_wajah' | 'terputus';
  deskripsi: string;
}

export interface StudentSession {
  id: string;
  siswaId: string;
  siswaName: string;
  siswaNis: string;
  siswaKelas: string;
  ujianId: string;
  waktuMulai?: string;
  waktuSubmit?: string;
  jawabanSiswa: Record<string, any>;
  nilai?: number;
  jumlahBenar?: number;
  status: 'belum_mulai' | 'mengerjakan' | 'selesai' | 'terputus';
  seed: number;
  logPelanggaran: Violation[];
  kameraSnapshots: string[]; // base64 or mock images
  kameraStatus: 'aman' | 'tidak_aktif' | 'melanggar'; // green, yellow, red
}

export interface ActivityLog {
  id: string;
  waktu: string;
  penggunaId: string;
  namaPengguna: string;
  peran: 'admin' | 'guru' | 'siswa';
  aktivitas: string;
  detail: string;
}

export interface InstansiConfig {
  nama: string;
  logo: string;
  alamat: string;
  kodeInstansi: string; // TIPE-KOTA-UNIK (e.g. SMA-MKS-X7K2)
  zonaWaktu: string;
}

// Initial Seed Data
const DEFAULT_INSTANSI: InstansiConfig = {
  nama: "SMA Negeri 1 Makassar",
  logo: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=200&auto=format&fit=crop",
  alamat: "Jl. Baji Minasa No. 12, Makassar, Sulawesi Selatan",
  kodeInstansi: "SMA-MKS-X7K2",
  zonaWaktu: "WITA (Asia/Makassar)"
};

const DEFAULT_USERS: User[] = [
  {
    id: "user-guru-1",
    username: "budi",
    name: "Budi Santoso, S.Pd., M.Si.",
    nip_nis: "198005122005011003",
    email: "budi.santoso@sman1mks.sch.id",
    role: "guru",
    status: "aktif",
    mapel: ["Matematika", "Fisika"],
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "user-guru-2",
    username: "siti",
    name: "Dra. Siti Aminah",
    nip_nis: "197509202000032001",
    email: "siti.aminah@sman1mks.sch.id",
    role: "guru",
    status: "aktif",
    mapel: ["Bahasa Indonesia", "Sastra"],
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "user-siswa-1",
    username: "siswa1",
    name: "Muhammad Fadhil",
    nip_nis: "24001",
    email: "fadhil.siswa@sman1mks.sch.id",
    role: "siswa",
    status: "aktif",
    kelas: "XII MIPA 1",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "user-siswa-2",
    username: "siswa2",
    name: "Amanda Putri",
    nip_nis: "24002",
    email: "amanda.siswa@sman1mks.sch.id",
    role: "siswa",
    status: "aktif",
    kelas: "XII MIPA 1",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "user-siswa-3",
    username: "siswa3",
    name: "Rian Hidayat",
    nip_nis: "24003",
    email: "rian.siswa@sman1mks.sch.id",
    role: "siswa",
    status: "aktif",
    kelas: "XII MIPA 1",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "user-siswa-4",
    username: "siswa4",
    name: "Siti Rahma",
    nip_nis: "24004",
    email: "rahma.siswa@sman1mks.sch.id",
    role: "siswa",
    status: "aktif",
    kelas: "XII MIPA 2",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop"
  },
  {
    id: "user-siswa-5",
    username: "siswa5",
    name: "Aditya Pratama",
    nip_nis: "24005",
    email: "aditya.siswa@sman1mks.sch.id",
    role: "siswa",
    status: "aktif",
    kelas: "XII MIPA 2",
    avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=150&auto=format&fit=crop"
  }
];

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: "q-1",
    guruId: "user-guru-1",
    tipe: "pg",
    pertanyaan: "<p>Tentukan turunan pertama dari fungsi <strong>f(x) = 3x<sup>2</sup> + 5x - 7</strong>.</p>",
    pilihan: [
      "f'(x) = 6x + 5",
      "f'(x) = 3x + 5",
      "f'(x) = 6x - 7",
      "f'(x) = 6x<sup>2</sup> + 5"
    ],
    jawabanBenar: "0",
    kesulitan: "mudah",
    tags: ["Kalkulus", "Turunan", "UTS"],
    bobot: 10
  },
  {
    id: "q-2",
    guruId: "user-guru-1",
    tipe: "pgk",
    pertanyaan: "<p>Manakah dari persamaan di bawah ini yang merupakan <strong>persamaan kuadrat</strong>? (Pilih semua yang benar)</p>",
    pilihan: [
      "x<sup>2</sup> + 5x + 6 = 0",
      "2x - 3 = 9",
      "y<sup>2</sup> - 16 = 0",
      "z<sup>3</sup> + z - 1 = 0"
    ],
    jawabanBenar: ["0", "2"],
    kesulitan: "sedang",
    tags: ["Aljabar", "Persamaan Kuadrat"],
    bobot: 15
  },
  {
    id: "q-3",
    guruId: "user-guru-1",
    tipe: "bs",
    pertanyaan: "<p>Fungsi eksponensial <strong>y = a<sup>x</sup></strong> dengan <strong>a > 1</strong> selalu merupakan fungsi monoton naik.</p>",
    jawabanBenar: true,
    kesulitan: "mudah",
    tags: ["Eksponen", "Fungsi"],
    bobot: 10
  },
  {
    id: "q-4",
    guruId: "user-guru-1",
    tipe: "gambar",
    pertanyaan: "<p>Perhatikan gambar grafik fungsi di bawah ini. Grafik tersebut merepresentasikan fungsi trigonometri apa?</p>",
    mediaUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?q=80&w=500&auto=format&fit=crop",
    pilihan: [
      "y = sin(x)",
      "y = cos(x)",
      "y = tan(x)",
      "y = sec(x)"
    ],
    jawabanBenar: "0",
    kesulitan: "sedang",
    tags: ["Trigonometri", "Grafik"],
    bobot: 15
  },
  {
    id: "q-5",
    guruId: "user-guru-1",
    tipe: "video",
    pertanyaan: "<p>Setelah memperhatikan video penjelasan gerak melingkar tersebut, tentukan hubungan antara kecepatan sudut (&omega;) dan kecepatan linear (v) pada radius R.</p>",
    mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4", // Free sample video
    videoOptions: {
      repeatLimit: 1,
      showAnswersAfterFinish: true
    },
    pilihan: [
      "v = &omega; &times; R",
      "v = &omega; / R",
      "&omega; = v &times; R",
      "v = &omega; &times; R<sup>2</sup>"
    ],
    jawabanBenar: "0",
    kesulitan: "sulit",
    tags: ["Fisika", "Gerak Melingkar", "Kinematika"],
    bobot: 20
  }
];

const DEFAULT_EXAMS: Exam[] = [
  {
    id: "exam-1",
    guruId: "user-guru-1",
    judul: "Penilaian Tengah Semester (PTS) Matematika",
    mapel: "Matematika",
    kelasIds: ["XII MIPA 1", "XII MIPA 2"],
    deskripsi: "PTS Matematika Semester Ganjil. Harap kerjakan dengan jujur. Segala bentuk pelanggaran akan dicatat oleh sistem keamanan kamera dan log pelacakan.",
    waktuMulai: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // started 30 mins ago
    waktuSelesai: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // ends in 90 mins
    durasi: 120,
    soalIds: ["q-1", "q-2", "q-3", "q-4", "q-5"],
    acakSoal: true,
    acakPilihan: true,
    wajibKamera: true,
    tokenAktif: true,
    kalkulator: true,
    tampilkanJawaban: false,
    token: "PTS-MAT",
    passingGrade: 75,
    status: "berlangsung"
  },
  {
    id: "exam-2",
    guruId: "user-guru-1",
    judul: "Kuis Aljabar Linear",
    mapel: "Matematika",
    kelasIds: ["XII MIPA 1"],
    deskripsi: "Kuis singkat materi aljabar linear dasar untuk menguji pemahaman bab 2.",
    waktuMulai: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // tomorrow
    waktuSelesai: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    durasi: 45,
    soalIds: ["q-2", "q-3"],
    acakSoal: false,
    acakPilihan: false,
    wajibKamera: false,
    tokenAktif: true,
    kalkulator: false,
    tampilkanJawaban: true,
    token: "ALJ-LIN",
    passingGrade: 70,
    status: "terjadwal"
  },
  {
    id: "exam-3",
    guruId: "user-guru-1",
    judul: "Ujian Akhir Semester Fisika Dasar",
    mapel: "Fisika",
    kelasIds: ["XII MIPA 1", "XII MIPA 2"],
    deskripsi: "UAS Fisika Semester Ganjil Tahun Ajaran 2025/2026.",
    waktuMulai: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    waktuSelesai: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString(),
    durasi: 120,
    soalIds: ["q-5"],
    acakSoal: true,
    acakPilihan: true,
    wajibKamera: true,
    tokenAktif: true,
    kalkulator: true,
    tampilkanJawaban: false,
    token: "UAS-FIS",
    passingGrade: 75,
    status: "selesai"
  }
];

const DEFAULT_SESSIONS: StudentSession[] = [
  {
    id: "session-1",
    siswaId: "user-siswa-1",
    siswaName: "Muhammad Fadhil",
    siswaNis: "24001",
    siswaKelas: "XII MIPA 1",
    ujianId: "exam-1",
    waktuMulai: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    jawabanSiswa: {
      "q-1": "0", // correct
      "q-3": true  // correct
    },
    status: "mengerjakan",
    seed: 4567,
    kameraStatus: "aman",
    kameraSnapshots: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
    ],
    logPelanggaran: []
  },
  {
    id: "session-2",
    siswaId: "user-siswa-2",
    siswaName: "Amanda Putri",
    siswaNis: "24002",
    siswaKelas: "XII MIPA 1",
    ujianId: "exam-1",
    waktuMulai: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    jawabanSiswa: {
      "q-1": "1", // incorrect
      "q-2": ["0"], // incomplete
      "q-3": false // incorrect
    },
    status: "mengerjakan",
    seed: 1234,
    kameraStatus: "melanggar",
    kameraSnapshots: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop"
    ],
    logPelanggaran: [
      {
        waktu: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        tipe: "keluar_aplikasi",
        deskripsi: "Membuka browser chrome / meminimalkan window ujian."
      },
      {
        waktu: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        tipe: "multi_wajah",
        deskripsi: "Terdeteksi dua wajah pada layar pengawasan."
      }
    ]
  },
  {
    id: "session-3",
    siswaId: "user-siswa-3",
    siswaName: "Rian Hidayat",
    siswaNis: "24003",
    siswaKelas: "XII MIPA 1",
    ujianId: "exam-1",
    waktuMulai: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    jawabanSiswa: {
      "q-1": "0",
      "q-2": ["0", "2"],
      "q-3": true
    },
    status: "terputus",
    seed: 9876,
    kameraStatus: "tidak_aktif",
    kameraSnapshots: [],
    logPelanggaran: [
      {
        waktu: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        tipe: "terputus",
        deskripsi: "Koneksi jaringan terputus lebih dari 60 detik. Ujian dipause."
      }
    ]
  },
  {
    id: "session-4",
    siswaId: "user-siswa-4",
    siswaName: "Siti Rahma",
    siswaNis: "24004",
    siswaKelas: "XII MIPA 2",
    ujianId: "exam-1",
    waktuMulai: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
    jawabanSiswa: {},
    status: "mengerjakan",
    seed: 5543,
    kameraStatus: "aman",
    kameraSnapshots: [
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=150&auto=format&fit=crop"
    ],
    logPelanggaran: []
  },
  {
    // Finished exam 3
    id: "session-5",
    siswaId: "user-siswa-1",
    siswaName: "Muhammad Fadhil",
    siswaNis: "24001",
    siswaKelas: "XII MIPA 1",
    ujianId: "exam-3",
    waktuMulai: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    waktuSubmit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    jawabanSiswa: {
      "q-5": "0" // correct
    },
    status: "selesai",
    nilai: 100,
    jumlahBenar: 1,
    seed: 9988,
    kameraStatus: "aman",
    kameraSnapshots: [],
    logPelanggaran: []
  },
  {
    // Finished exam 3
    id: "session-6",
    siswaId: "user-siswa-2",
    siswaName: "Amanda Putri",
    siswaNis: "24002",
    siswaKelas: "XII MIPA 1",
    ujianId: "exam-3",
    waktuMulai: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    waktuSubmit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 50 * 60 * 1000).toISOString(),
    jawabanSiswa: {
      "q-5": "1" // incorrect
    },
    status: "selesai",
    nilai: 0,
    jumlahBenar: 0,
    seed: 7766,
    kameraStatus: "aman",
    kameraSnapshots: [],
    logPelanggaran: [
      {
        waktu: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
        tipe: "wajah_hilang",
        deskripsi: "Wajah tidak terdeteksi di kamera lebih dari 10 detik."
      }
    ]
  }
];

const DEFAULT_LOGS: ActivityLog[] = [
  {
    id: "log-1",
    waktu: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    penggunaId: "user-admin",
    namaPengguna: "Drs. H. Andi Mulyadi, M.Pd.",
    peran: "admin",
    aktivitas: "Login",
    detail: "Melakukan masuk ke sistem administrator instansi."
  },
  {
    id: "log-2",
    waktu: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    penggunaId: "user-admin",
    namaPengguna: "Drs. H. Andi Mulyadi, M.Pd.",
    peran: "admin",
    aktivitas: "Tambah Guru",
    detail: "Mendaftarkan Dra. Siti Aminah sebagai guru Bahasa Indonesia."
  },
  {
    id: "log-3",
    waktu: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    penggunaId: "user-guru-1",
    namaPengguna: "Budi Santoso, S.Pd., M.Si.",
    peran: "guru",
    aktivitas: "Buat Ujian",
    detail: "Membuat ujian baru 'Penilaian Tengah Semester (PTS) Matematika'."
  },
  {
    id: "log-4",
    waktu: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    penggunaId: "user-guru-1",
    namaPengguna: "Budi Santoso, S.Pd., M.Si.",
    peran: "guru",
    aktivitas: "Aktifkan Token",
    detail: "Mengaktifkan token ujian PTS Matematika: PTS-MAT."
  }
];

export const initializeDatabase = () => {
  if (!localStorage.getItem("ujdit_instansi")) {
    localStorage.setItem("ujdit_instansi", JSON.stringify(DEFAULT_INSTANSI));
  }
  if (!localStorage.getItem("ujdit_users")) {
    localStorage.setItem("ujdit_users", JSON.stringify(DEFAULT_USERS));
  }
  if (!localStorage.getItem("ujdit_questions")) {
    localStorage.setItem("ujdit_questions", JSON.stringify(DEFAULT_QUESTIONS));
  }
  if (!localStorage.getItem("ujdit_exams")) {
    localStorage.setItem("ujdit_exams", JSON.stringify(DEFAULT_EXAMS));
  }
  if (!localStorage.getItem("ujdit_sessions")) {
    localStorage.setItem("ujdit_sessions", JSON.stringify(DEFAULT_SESSIONS));
  }
  if (!localStorage.getItem("ujdit_logs")) {
    localStorage.setItem("ujdit_logs", JSON.stringify(DEFAULT_LOGS));
  }
};

// Database Getter/Setter helpers
export const mockDb = {
  getInstansi: (): InstansiConfig => {
    initializeDatabase();
    return JSON.parse(localStorage.getItem("ujdit_instansi") || "{}");
  },
  updateInstansi: (config: InstansiConfig) => {
    localStorage.setItem("ujdit_instansi", JSON.stringify(config));
    mockDb.addLog("user-admin", "Update Instansi", "Mengubah pengaturan informasi instansi.");
    return config;
  },
  getUsers: (): User[] => {
    initializeDatabase();
    return JSON.parse(localStorage.getItem("ujdit_users") || "[]");
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem("ujdit_users", JSON.stringify(users));
  },
  addUser: (user: Omit<User, 'id'>): User => {
    const users = mockDb.getUsers();
    const newUser = { ...user, id: `user-${Date.now()}` };
    users.push(newUser);
    mockDb.saveUsers(users);
    mockDb.addLog(
      "user-admin", 
      user.role === 'guru' ? 'Tambah Guru' : 'Tambah Siswa', 
      `Mendaftarkan ${user.name} (${user.role}) ke dalam sistem.`
    );
    return newUser;
  },
  updateUser: (updatedUser: User) => {
    const users = mockDb.getUsers();
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx !== -1) {
      users[idx] = updatedUser;
      mockDb.saveUsers(users);
      mockDb.addLog("user-admin", "Update User", `Memperbarui profil ${updatedUser.name}.`);
    }
    return updatedUser;
  },
  getQuestions: (): Question[] => {
    initializeDatabase();
    return JSON.parse(localStorage.getItem("ujdit_questions") || "[]");
  },
  saveQuestions: (questions: Question[]) => {
    localStorage.setItem("ujdit_questions", JSON.stringify(questions));
  },
  addQuestion: (q: Omit<Question, 'id'>): Question => {
    const questions = mockDb.getQuestions();
    const newQ = { ...q, id: `q-${Date.now()}` };
    questions.push(newQ);
    mockDb.saveQuestions(questions);
    mockDb.addLog(q.guruId, "Tambah Soal", `Menambahkan soal baru berkategori ${q.tipe} (tags: ${q.tags.join(', ')}).`);
    return newQ;
  },
  updateQuestion: (updatedQ: Question) => {
    const questions = mockDb.getQuestions();
    const idx = questions.findIndex(q => q.id === updatedQ.id);
    if (idx !== -1) {
      questions[idx] = updatedQ;
      mockDb.saveQuestions(questions);
      mockDb.addLog(updatedQ.guruId, "Update Soal", `Memperbarui soal (${updatedQ.id}).`);
    }
    return updatedQ;
  },
  deleteQuestion: (id: string, guruId: string) => {
    const questions = mockDb.getQuestions();
    const filtered = questions.filter(q => q.id !== id);
    mockDb.saveQuestions(filtered);
    mockDb.addLog(guruId, "Hapus Soal", `Menghapus soal dengan ID ${id}.`);
  },
  getExams: (): Exam[] => {
    initializeDatabase();
    return JSON.parse(localStorage.getItem("ujdit_exams") || "[]");
  },
  saveExams: (exams: Exam[]) => {
    localStorage.setItem("ujdit_exams", JSON.stringify(exams));
  },
  addExam: (exam: Omit<Exam, 'id'>): Exam => {
    const exams = mockDb.getExams();
    const newExam = { ...exam, id: `exam-${Date.now()}` };
    exams.push(newExam);
    mockDb.saveExams(exams);
    mockDb.addLog(exam.guruId, "Buat Ujian", `Membuat jadwal ujian baru '${exam.judul}' Mapel ${exam.mapel}.`);
    return newExam;
  },
  updateExam: (updatedExam: Exam) => {
    const exams = mockDb.getExams();
    const idx = exams.findIndex(e => e.id === updatedExam.id);
    if (idx !== -1) {
      exams[idx] = updatedExam;
      mockDb.saveExams(exams);
      mockDb.addLog(updatedExam.guruId, "Update Ujian", `Memperbarui konfigurasi ujian '${updatedExam.judul}'.`);
    }
    return updatedExam;
  },
  getSessions: (): StudentSession[] => {
    initializeDatabase();
    return JSON.parse(localStorage.getItem("ujdit_sessions") || "[]");
  },
  saveSessions: (sessions: StudentSession[]) => {
    localStorage.setItem("ujdit_sessions", JSON.stringify(sessions));
  },
  updateSession: (updatedSession: StudentSession) => {
    const sessions = mockDb.getSessions();
    const idx = sessions.findIndex(s => s.id === updatedSession.id);
    if (idx !== -1) {
      sessions[idx] = updatedSession;
      mockDb.saveSessions(sessions);
    }
    return updatedSession;
  },
  addViolation: (sessionId: string, violation: Omit<Violation, 'waktu'>) => {
    const sessions = mockDb.getSessions();
    const idx = sessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      const v: Violation = {
        ...violation,
        waktu: new Date().toISOString()
      };
      sessions[idx].logPelanggaran.push(v);
      sessions[idx].kameraStatus = violation.tipe === 'terputus' ? 'tidak_aktif' : 'melanggar';
      mockDb.saveSessions(sessions);
      
      const exam = mockDb.getExams().find(e => e.id === sessions[idx].ujianId);
      mockDb.addLog(
        sessions[idx].siswaId,
        "Pelanggaran Ujian",
        `Siswa ${sessions[idx].siswaName} terdeteksi melakukan ${violation.tipe} pada ujian ${exam?.judul || ''}.`
      );
    }
  },
  getLogs: (): ActivityLog[] => {
    initializeDatabase();
    return JSON.parse(localStorage.getItem("ujdit_logs") || "[]");
  },
  addLog: (userId: string, aktivitas: string, detail: string) => {
    const logs = mockDb.getLogs();
    const users = mockDb.getUsers();
    
    // Resolve user-admin placeholder to active session user if available
    let activeUserId = userId;
    if (userId === "user-admin") {
      const stored = localStorage.getItem("ujdit_session_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) activeUserId = parsed.id;
        } catch(e) {}
      }
    }
    
    const user = users.find(u => u.id === activeUserId || u.username === activeUserId);
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      waktu: new Date().toISOString(),
      penggunaId: activeUserId,
      namaPengguna: user?.name || "System/Unknown",
      peran: user?.role || "guru",
      aktivitas,
      detail
    };
    logs.unshift(newLog); // newest first
    localStorage.setItem("ujdit_logs", JSON.stringify(logs.slice(0, 100))); // cap at 100 logs
    return newLog;
  },
  resetDatabase: () => {
    localStorage.removeItem("ujdit_instansi");
    localStorage.removeItem("ujdit_users");
    localStorage.removeItem("ujdit_questions");
    localStorage.removeItem("ujdit_exams");
    localStorage.removeItem("ujdit_sessions");
    localStorage.removeItem("ujdit_logs");
    initializeDatabase();
  }
};
