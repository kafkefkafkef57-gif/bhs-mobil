export type Role = 'admin' | 'user';
export type Status = 'pending' | 'approved' | 'rejected';
export type Importance = 'normal' | 'onemli' | 'acil';

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: Role;
  status: Status;
  created_at: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  importance: Importance;
  photo_url: string | null;
  created_by: string;
  author_name?: string;
  created_at: string;
  completed_at: string | null;
};

export type NoticeInput = Pick<Notice, 'title' | 'body' | 'importance' | 'photo_url'>;
export type Photo = { uri: string; base64?: string | null; mimeType?: string | null };
export type SignUpInput = { full_name: string; phone: string; email: string; password: string };
export type Table = 'profiles' | 'notices' | 'faults' | 'reports' | 'tasks';

/** Olay tutanağı (yer hizmetleri kazaları). */
export type Report = {
  id: string;
  no: number;
  incident_at: string;
  officer: string;
  staff_name: string;
  company: string;
  summary: string;
  photo_urls: string[];
  created_by: string;
  created_at: string;
};
export type ReportInput = Pick<Report, 'incident_at' | 'officer' | 'staff_name' | 'company' | 'summary' | 'photo_urls'>;

export type Shift = 'A' | 'B' | 'C' | 'D';
export type TaskStatus = 'yapildi' | 'yapilmadi';
/** Operasyon takip görevi (hat temizliği vb.). */
export type Task = {
  id: string;
  title: string;
  shift: Shift;
  due_date: string; // YYYY-MM-DD
  description: string;
  photo_url: string | null;
  status: TaskStatus | null; // null: henüz işaretlenmedi
  created_by: string;
  created_at: string;
};
export type TaskInput = Pick<Task, 'title' | 'shift' | 'due_date' | 'description' | 'photo_url'>;
