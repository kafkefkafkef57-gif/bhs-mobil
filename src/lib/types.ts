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
export type Table = 'profiles' | 'notices' | 'faults' | 'fault_zones' | 'reports' | 'tasks' | 'staff_assignments' | 'shift_entries' | 'shift_reports';

export type Line = 'dogu' | 'bati';
export const LINE_NAME: Record<Line, string> = { dogu: 'Doğu Hattı', bati: 'Batı Hattı' };
export const COMPANIES = ['PCYH', 'TGS', 'ÇELEBİ'] as const;
/** Hat üzerindeki arıza bölgesi (ör. "Doğu 2 Vertisorter"). */
export type FaultZone = { id: string; line: Line; name: string; sort_no: number };
export type Fault = {
  id: string;
  line: Line;
  zone_id: string | null;
  zone_name: string;
  /** Arızaya sebep olan bagajın firması. */
  company: string;
  description: string;
  photo_url: string | null;
  shift: Shift;
  team: Department;
  created_by: string;
  author_name?: string;
  created_at: string;
};
export type FaultInput = Pick<Fault, 'line' | 'zone_id' | 'zone_name' | 'company' | 'description' | 'photo_url' | 'shift' | 'team'>;

/** 'ariza' elle eklenmez; Arıza Bildirimi'nden girilen arızalar akışa bu türle düşer. */
export type EntryKind = 'ariza' | 'bildirim' | 'not' | 'rutin' | 'devir';
/** Bir vardiyanın gün içindeki paylaşımı (bildirim, not, rutin, devir notu). */
export type ShiftEntry = {
  id: string;
  day: string; // YYYY-MM-DD
  shift: Shift;
  team: Department;
  kind: EntryKind;
  title: string;
  body: string;
  photo_url: string | null;
  created_by: string;
  author_name?: string;
  created_at: string;
};
export type ShiftEntryInput = Pick<ShiftEntry, 'day' | 'shift' | 'team' | 'title' | 'body' | 'photo_url'> & { kind: Exclude<EntryKind, 'ariza'> };
export type ReportTeam = Department | 'Tümü';
/** Oluşturulmuş vardiya raporu; içerik o andaki kayıtların kopyasıdır. */
export type ShiftReport = {
  id: string;
  day: string;
  shift: Shift;
  team: ReportTeam;
  entry_count: number;
  content: ShiftEntry[];
  created_by: string;
  author_name?: string;
  created_at: string;
};

export type Department = 'Operasyon' | 'Teknik';
/** Çalışma planındaki personel (uygulama kullanıcısından bağımsız). */
export type Staff = {
  id: string;
  sicil: string;
  full_name: string;
  title: string;
  department: Department;
  sort_no: number;
};
/** Bir personelin bir gündeki plan değeri: "08:30-20:30", "T", "Yİ" ... */
export type StaffShift = { staff_id: string; day: string; value: string };
export const LOCATIONS = ['T1', 'T2', 'Yeni Şut Altı'] as const;
export type Location = (typeof LOCATIONS)[number];
export type StaffAssignment = { staff_id: string; day: string; location: Location };

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
