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
  /** Kişinin vardiyası ve ekibi; girdiği kayıtlar bunlarla işaretlenir. Eski hesaplarda boş olabilir. */
  shift: Shift | null;
  team: Department | null;
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
  /** Uygulamanın kendiliğinden oluşturduğu bildirilerde dolu (ör. hava uyarısı). */
  auto_key?: string | null;
  created_at: string;
  completed_at: string | null;
};

export type NoticeInput = Pick<Notice, 'title' | 'body' | 'importance' | 'photo_url'>;
export type Photo = { uri: string; base64?: string | null; mimeType?: string | null };
export type SignUpInput = { full_name: string; phone: string; email: string; password: string; shift: Shift; team: Department };
export type Table = 'profiles' | 'notices' | 'faults' | 'fault_zones' | 'inventory_items' | 'equipment' | 'maintenance_records' | 'daily_works' | 'customs_flights' | 'reports' | 'tasks' | 'staff_assignments' | 'shift_entries' | 'shift_reports';

/** Depodaki malzeme / yedek parça. */
export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  shelf: string;
  quantity: number;
  unit: string;
  /** Stok bu seviyeye ya da altına düşünce "kritik stok" sayılır. */
  critical_level: number;
  updated_at: string;
};
export type InventoryInput = Omit<InventoryItem, 'id' | 'updated_at'>;
export const isCritical = (i: Pick<InventoryItem, 'quantity' | 'critical_level'>) => i.quantity <= i.critical_level;

/** Bakımı yapılan ekipman (konveyör bandı / motor); numarası "101.2.7" gibidir, ilk bölüm hattır. */
export type Equipment = { id: string; code: string; line: string; kind: string; location: string };
/** Bir bakımda kullanılan yedek parça. item_id, malzeme sonradan depodan silindiyse boştur. */
export type MaintenancePart = { item_id: string | null; item_name: string; quantity: number; unit: string };
export type MaintenanceRecord = {
  id: string;
  equipment_id: string;
  technician: string;
  work: string;
  note: string;
  /** Kullanılan yedek parçalar (depodan düşülür); parça kullanılmadıysa boş liste. */
  parts: MaintenancePart[];
  shift?: Shift | null;
  team?: Department | null;
  /** Vardiya akışı için: ekipman numarası (yalnızca tarih aralığı sorgusunda dolu). */
  equipment_code?: string;
  created_by?: string;
  created_at: string;
};
/** id verilirse mevcut kayıt düzeltilir. */
export type MaintenanceInput = Pick<MaintenanceRecord, 'equipment_id' | 'technician' | 'work' | 'note' | 'parts'> & { id?: string; shift: Shift | null; team: Department | null };

export const WORK_CATEGORIES = ['Köprü bakımı', 'Bant / konveyör', 'Arıza giderme', 'Sistem', 'Diğer'] as const;
/** Teknisyenin gün içinde yaptığı iş (köprü bakımı, bant, arıza giderme ...). */
export type DailyWork = {
  id: string;
  category: string;
  place: string;
  work: string;
  note: string;
  photo_url: string | null;
  shift: Shift | null;
  team: Department | null;
  created_by: string;
  author_name?: string;
  created_at: string;
};
export type DailyWorkInput = Pick<DailyWork, 'category' | 'place' | 'work' | 'note' | 'photo_url' | 'shift' | 'team'>;
/** "101.2.7" -> "101" */
export const lineOf = (code: string) => code.split('.')[0];
/** Ekipman numaralarını sayısal sıralar: 101.2.7 < 101.26.1 < 1001.2.1 */
export const compareCodes = (a: string, b: string) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? -1) !== (y[i] ?? -1)) return (x[i] ?? -1) - (y[i] ?? -1);
  return 0;
};

export const CUSTOMS_ARRIVALS = [1, 3, 4] as const;
/** Gümrük talebiyle bir arrival bandına atanan uçuş. */
export type CustomsFlight = {
  id: string;
  day: string; // YYYY-MM-DD
  arrival: number;
  flight: string;
  origin: string;
  note: string;
  shift: Shift | null;
  team: Department | null;
  created_by: string;
  author_name?: string;
  created_at: string;
};
export type CustomsFlightInput = Pick<CustomsFlight, 'day' | 'arrival' | 'flight' | 'origin' | 'note' | 'shift' | 'team'>;

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

/** 'ariza' ve 'bakim' elle eklenmez; arıza bildirimleri ile teknik işler / bakım kayıtları akışa bu türlerle düşer. */
export type EntryKind = 'ariza' | 'bakim' | 'bildirim' | 'not' | 'rutin' | 'devir';
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
export type ShiftEntryInput = Pick<ShiftEntry, 'day' | 'shift' | 'team' | 'title' | 'body' | 'photo_url'> & { kind: Exclude<EntryKind, 'ariza' | 'bakim'> };
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
