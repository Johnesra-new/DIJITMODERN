// Supabase Database Layer — drop-in replacement for mockDb
// All methods are now async and talk to Supabase PostgreSQL.

import { supabase } from './supabaseClient';

// Re-export interfaces (same as mockDb, but with UUID ids)
export interface User {
  id: string;
  username: string;
  name: string;
  nip_nis: string;
  email: string;
  password_hash?: string;
  role: 'admin' | 'guru' | 'siswa';
  status: 'aktif' | 'nonaktif';
  mapel?: string[];
  kelas?: string;
  avatar?: string;
}

export interface Question {
  id: string;
  guru_id: string;
  tipe: 'pg' | 'pgk' | 'bs' | 'video' | 'gambar' | 'menjodohkan';
  pertanyaan: string;
  pilihan?: string[];
  matching_data?: { baris: string[]; kolom: string[] };
  jawaban_benar: string | string[] | boolean | Record<string, string>;
  media_url?: string;
  video_options?: { repeatLimit: number; showAnswersAfterFinish: boolean };
  kesulitan: 'mudah' | 'sedang' | 'sulit';
  tags: string[];
  bobot: number;
}

export interface Exam {
  id: string;
  guru_id: string;
  judul: string;
  mapel: string;
  kelas_ids: string[];
  deskripsi: string;
  waktu_mulai: string;
  waktu_selesai: string;
  durasi: number;
  soal_ids: string[];
  acak_soal: boolean;
  acak_pilihan: boolean;
  wajib_kamera: boolean;
  token_aktif: boolean;
  kalkulator: boolean;
  tampilkan_jawaban: boolean;
  token: string;
  passing_grade: number;
  status: 'draft' | 'terjadwal' | 'berlangsung' | 'selesai' | 'diarsipkan';
}

export interface Violation {
  waktu: string;
  tipe: 'keluar_aplikasi' | 'wajah_hilang' | 'multi_wajah' | 'terputus';
  deskripsi: string;
}

export interface StudentSession {
  id: string;
  siswa_id: string;
  siswa_name: string;
  siswa_nis: string;
  siswa_kelas: string;
  ujian_id: string;
  waktu_mulai?: string;
  waktu_submit?: string;
  jawaban_siswa: Record<string, any>;
  nilai?: number;
  jumlah_benar?: number;
  status: 'belum_mulai' | 'mengerjakan' | 'selesai' | 'terputus' | 'diblokir';
  seed: number;
  log_pelanggaran: Violation[];
  kamera_snapshots: string[];
  kamera_status: 'aman' | 'tidak_aktif' | 'melanggar';
}

export interface ActivityLog {
  id: string;
  waktu: string;
  pengguna_id: string;
  nama_pengguna: string;
  peran: 'admin' | 'guru' | 'siswa';
  aktivitas: string;
  detail: string;
}

export interface InstansiConfig {
  id?: string;
  nama: string;
  logo: string;
  alamat: string;
  kode_instansi: string;
  zona_waktu: string;
  gsheets_url?: string;
}

// ========== SUPABASE DB LAYER ==========
export const db = {
  // --- UPLOAD MEDIA TO STORAGE ---
  async uploadMedia(file: File, path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('dijit-media')
      .upload(path, file, { cacheControl: '3600', upsert: true });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('dijit-media')
      .getPublicUrl(data.path);
      
    return publicUrl;
  },

  // --- INSTANSI ---
  async getInstansi(): Promise<InstansiConfig> {
    const { data } = await supabase.from('instansi').select('*').limit(1).single();
    return data || { nama: '', logo: '', alamat: '', kode_instansi: '', zona_waktu: '', gsheets_url: '' };
  },
  async updateInstansi(config: Partial<InstansiConfig> & { id?: string }) {
    if (config.id) {
      const { data, error } = await supabase.from('instansi').update(config).eq('id', config.id).select().single();
      if (error) throw error;
      return data;
    }
    return config;
  },

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    const { data } = await supabase.from('users').select('*').order('created_at');
    return data || [];
  },
  async getUserByLogin(identifier: string): Promise<User | null> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${identifier},email.eq.${identifier},nip_nis.eq.${identifier}`)
      .limit(1)
      .single();
    return data;
  },
  async addUser(user: Omit<User, 'id'>): Promise<User> {
    const { data } = await supabase.from('users').insert(user).select().single();
    return data!;
  },
  async updateUser(user: Partial<User> & { id: string }): Promise<User> {
    const { data } = await supabase.from('users').update(user).eq('id', user.id).select().single();
    return data!;
  },
  async saveUsers(users: User[]) {
    // For bulk operations, upsert
    await supabase.from('users').upsert(users);
  },

  // --- QUESTIONS ---
  async getQuestions(): Promise<Question[]> {
    const { data } = await supabase.from('questions').select('*').order('created_at');
    return data || [];
  },
  async addQuestion(q: Omit<Question, 'id'>): Promise<Question> {
    const { data } = await supabase.from('questions').insert(q).select().single();
    return data!;
  },
  async updateQuestion(q: Partial<Question> & { id: string }): Promise<Question> {
    const { data } = await supabase.from('questions').update(q).eq('id', q.id).select().single();
    return data!;
  },
  async deleteQuestion(id: string) {
    await supabase.from('questions').delete().eq('id', id);
  },

  // --- EXAMS ---
  async getExams(): Promise<Exam[]> {
    const { data } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  async addExam(exam: Omit<Exam, 'id'>): Promise<Exam> {
    const { data } = await supabase.from('exams').insert(exam).select().single();
    return data!;
  },
  async updateExam(exam: Partial<Exam> & { id: string }): Promise<Exam> {
    const { data } = await supabase.from('exams').update(exam).eq('id', exam.id).select().single();
    return data!;
  },
  async deleteExam(id: string) {
    await supabase.from('exams').delete().eq('id', id);
  },

  // --- SESSIONS ---
  async getSessions(): Promise<StudentSession[]> {
    const { data } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    return data || [];
  },
  async getSessionsByExam(examId: string): Promise<StudentSession[]> {
    const { data } = await supabase.from('sessions').select('*').eq('ujian_id', examId);
    return data || [];
  },
  async getSessionByStudentAndExam(studentId: string, examId: string): Promise<StudentSession | null> {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('siswa_id', studentId)
      .eq('ujian_id', examId)
      .limit(1)
      .maybeSingle();
    return data;
  },
  async addSession(session: Omit<StudentSession, 'id'>): Promise<StudentSession> {
    const { data } = await supabase.from('sessions').insert(session).select().single();
    return data!;
  },
  async updateSession(session: Partial<StudentSession> & { id: string }): Promise<StudentSession> {
    const { data } = await supabase.from('sessions').update(session).eq('id', session.id).select().single();
    return data!;
  },
  async saveSessions(sessions: StudentSession[]) {
    await supabase.from('sessions').upsert(sessions);
  },

  // --- ACTIVITY LOGS ---
  async getLogs(): Promise<ActivityLog[]> {
    const { data } = await supabase.from('activity_logs').select('*').order('waktu', { ascending: false }).limit(100);
    return data || [];
  },
  async addLog(userId: string, userName: string, peran: string, aktivitas: string, detail: string) {
    await supabase.from('activity_logs').insert({
      pengguna_id: userId,
      nama_pengguna: userName,
      peran,
      aktivitas,
      detail
    });
  },
};
