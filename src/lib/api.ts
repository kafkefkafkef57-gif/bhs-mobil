import { isDemo, supabase } from './supabase';
import { compareCodes, DailyWork, DailyWorkInput, Department, Equipment, Fault, FaultInput, FaultZone, InventoryInput, InventoryItem, Line, lineOf, MaintenanceInput, MaintenanceRecord, Location, ReportTeam, Shift, ShiftEntry, ShiftEntryInput, ShiftReport, Notice, NoticeInput, Photo, Profile, Report, ReportInput, SignUpInput, Staff, StaffAssignment, StaffShift, Status, Table, Task, TaskInput, TaskStatus } from './types';
import { addDays, toDay } from './format';
import { PlanRow } from './planImport';
import { EQUIPMENT_CODES } from './equipmentSeed';

export interface Api {
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<void>;
  signOut(): Promise<void>;
  /** Giriş yapan kişinin vardiya ve ekibini kaydeder. */
  setMyShift(shift: Shift, team: Department): Promise<void>;
  currentProfile(): Promise<Profile | null>;
  onAuthChange(cb: () => void): () => void;
  listUsers(): Promise<Profile[]>;
  setUserStatus(id: string, status: Status): Promise<void>;
  listNotices(archived: boolean): Promise<Notice[]>;
  getNotice(id: string): Promise<Notice | null>;
  saveNotice(input: NoticeInput, id?: string): Promise<void>;
  completeNotice(id: string): Promise<void>;
  /** Otomatik bildiri: aynı anahtarla daha önce oluşturulmuşsa hiçbir şey yapmaz. */
  createAutoNotice(key: string, input: NoticeInput): Promise<void>;
  uploadPhoto(photo: Photo, folder?: string): Promise<string>;
  listReports(): Promise<Report[]>;
  getReport(id: string): Promise<Report | null>;
  saveReport(input: ReportInput, id?: string): Promise<void>;
  listTasks(): Promise<Task[]>;
  saveTask(input: TaskInput): Promise<void>;
  setTaskStatus(id: string, status: TaskStatus | null): Promise<void>;
  todayFaultCount(): Promise<number>;
  listZones(line: Line): Promise<FaultZone[]>;
  addZone(line: Line, name: string): Promise<void>;
  deleteZone(id: string): Promise<void>;
  /** from (dahil) – to (hariç) aralığında kaydedilen arızalar, yeniden eskiye. */
  listFaults(from: Date, to?: Date): Promise<Fault[]>;
  getFault(id: string): Promise<Fault | null>;
  saveFault(input: FaultInput): Promise<void>;
  listStaff(): Promise<Staff[]>;
  /** from–to (dahil) aralığındaki plan; staffId verilirse yalnızca o kişi. */
  listShifts(from: string, to: string, staffId?: string): Promise<StaffShift[]>;
  listAssignments(day: string): Promise<StaffAssignment[]>;
  setAssignment(staffId: string, day: string, location: Location | null): Promise<void>;
  listInventory(): Promise<InventoryItem[]>;
  saveInventoryItem(input: InventoryInput, id?: string): Promise<void>;
  deleteInventoryItem(id: string): Promise<void>;
  listEquipment(): Promise<Equipment[]>;
  addEquipment(code: string, location: string): Promise<void>;
  updateEquipment(id: string, patch: Pick<Equipment, 'kind' | 'location'>): Promise<void>;
  /** Her ekipmanın bakım kaydı sayısı (kaydı olmayanlar listede yer almaz). */
  maintenanceCounts(): Promise<Record<string, number>>;
  listMaintenance(equipmentId: string): Promise<MaintenanceRecord[]>;
  /** Bakım kaydını ekler ya da düzeltir; parçalar aynı işlemde depo stokundan düşer (düzeltmede eski parçalar önce depoya geri eklenir). */
  saveMaintenance(input: MaintenanceInput): Promise<void>;
  /** Bakım kaydını siler; kullanılan parçalar depoya geri eklenir. */
  deleteMaintenance(id: string): Promise<void>;
  /** Tüm ekipmanların from (dahil) – to (hariç) aralığındaki bakım kayıtları (vardiya akışı için). */
  listMaintenanceBetween(from: Date, to: Date): Promise<MaintenanceRecord[]>;
  /** from (dahil) – to (hariç) aralığında girilen günlük teknik işler, yeniden eskiye. */
  listDailyWorks(from: Date, to: Date): Promise<DailyWork[]>;
  saveDailyWork(input: DailyWorkInput, id?: string): Promise<void>;
  deleteDailyWork(id: string): Promise<void>;
  /** team verilmezse tüm ekipler. */
  listShiftEntries(day: string, shift: Shift, team?: ShiftEntry['team']): Promise<ShiftEntry[]>;
  saveShiftEntry(input: ShiftEntryInput): Promise<void>;
  /** Aynı gün/vardiya/ekip için rapor varsa yenisiyle değiştirir. */
  saveShiftReport(day: string, shift: Shift, team: ReportTeam, content: ShiftEntry[]): Promise<void>;
  listShiftReports(): Promise<ShiftReport[]>;
  getShiftReport(id: string): Promise<ShiftReport | null>;
  /** Excel'den okunan aylık planı kaydeder (yalnızca yönetici). Aynı sicil/gün varsa günceller. */
  importPlan(rows: PlanRow[]): Promise<void>;
  subscribe(tables: Table[], cb: () => void): () => void;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ----------------------------- Supabase ----------------------------- */

const ERRORS: [string, string][] = [
  ['STOK_YETERSIZ', 'Depoda bu parçadan yeterli stok yok.'],
  ['Invalid login credentials', 'E-posta veya şifre hatalı.'],
  ['User already registered', 'Bu e-posta ile zaten bir kayıt var.'],
  ['Email not confirmed', 'E-posta adresiniz henüz doğrulanmadı.'],
  ['Password should be at least', 'Şifre en az 6 karakter olmalı.'],
  ['Unable to validate email', 'Geçerli bir e-posta adresi girin.'],
  ['Network request failed', 'İnternet bağlantısı kurulamadı.'],
];
function fail(e: { message: string } | null): void {
  if (!e) return;
  const hit = ERRORS.find(([k]) => e.message.includes(k));
  throw new Error(hit ? hit[1] : e.message);
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const NOTICE_COLS = '*, author:profiles!notices_created_by_fkey(full_name)';
const FAULT_COLS = '*, author:profiles!faults_created_by_fkey(full_name)';
const withAuthorName = (r: any) => ({ ...r, author_name: r.author?.full_name, author: undefined });
const toNotice = (r: any): Notice => withAuthorName(r);

const supaApi: Api = {
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    fail(error);
  },
  async signUp({ full_name, phone, email, password, shift, team }) {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: full_name.trim(), phone: phone.trim(), shift, team } },
    });
    fail(error);
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  async setMyShift(shift, team) {
    const { error } = await supabase.rpc('set_my_shift', { p_shift: shift, p_team: team });
    fail(error);
  },
  async currentProfile() {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return null;
    const { data: p, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    fail(error);
    return p as Profile | null;
  },
  onAuthChange(cb) {
    // setTimeout: auth geri çağrısı içinde doğrudan sorgu atmak kilitlenmeye yol açabiliyor.
    const { data } = supabase.auth.onAuthStateChange(() => setTimeout(cb, 0));
    return () => data.subscription.unsubscribe();
  },
  async listUsers() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    fail(error);
    return (data ?? []) as Profile[];
  },
  async setUserStatus(id, status) {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    fail(error);
  },
  async listNotices(archived) {
    let q = supabase.from('notices').select(NOTICE_COLS);
    q = archived
      ? q.not('completed_at', 'is', null).order('completed_at', { ascending: false })
      : q.is('completed_at', null).order('created_at', { ascending: false });
    const { data, error } = await q;
    fail(error);
    return (data ?? []).map(toNotice);
  },
  async getNotice(id) {
    const { data, error } = await supabase.from('notices').select(NOTICE_COLS).eq('id', id).maybeSingle();
    fail(error);
    return data ? toNotice(data) : null;
  },
  async saveNotice(input, id) {
    const { error } = id
      ? await supabase.from('notices').update(input).eq('id', id)
      : await supabase.from('notices').insert(input);
    fail(error);
  },
  async createAutoNotice(key, input) {
    const { error } = await supabase.from('notices').upsert({ ...input, auto_key: key }, { onConflict: 'auto_key', ignoreDuplicates: true });
    fail(error);
  },
  async completeNotice(id) {
    const { error } = await supabase.from('notices').update({ completed_at: new Date().toISOString() }).eq('id', id);
    fail(error);
  },
  async uploadPhoto(photo, folder = 'bildiri') {
    const type = photo.mimeType ?? 'image/jpeg';
    const body = photo.base64 ? decodeBase64(photo.base64) : await (await fetch(photo.uri)).arrayBuffer();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${type.split('/')[1] ?? 'jpg'}`;
    const { error } = await supabase.storage.from('photos').upload(path, body, { contentType: type });
    fail(error);
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  },
  async listZones(line) {
    const { data, error } = await supabase.from('fault_zones').select('*').eq('line', line).order('sort_no').order('name');
    fail(error);
    return (data ?? []) as FaultZone[];
  },
  async addZone(line, name) {
    const { error } = await supabase.from('fault_zones').insert({ line, name, sort_no: Math.floor(Date.now() / 1000) });
    if (error?.code === '23505') throw new Error('Bu hatta aynı adda bir bölge zaten var.');
    fail(error);
  },
  async deleteZone(id) {
    const { error } = await supabase.from('fault_zones').delete().eq('id', id);
    fail(error);
  },
  async listFaults(from, to) {
    let q = supabase.from('faults').select(FAULT_COLS).gte('created_at', from.toISOString());
    if (to) q = q.lt('created_at', to.toISOString());
    const { data, error } = await q.order('created_at', { ascending: false }).limit(2000);
    fail(error);
    return (data ?? []).map(withAuthorName) as Fault[];
  },
  async getFault(id) {
    const { data, error } = await supabase.from('faults').select(FAULT_COLS).eq('id', id).maybeSingle();
    fail(error);
    return data ? (withAuthorName(data) as Fault) : null;
  },
  async saveFault(input) {
    const { error } = await supabase.from('faults').insert(input);
    fail(error);
  },
  async todayFaultCount() {
    const { count, error } = await supabase
      .from('faults')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfToday().toISOString());
    fail(error);
    return count ?? 0;
  },
  async listReports() {
    const { data, error } = await supabase.from('reports').select('*').order('incident_at', { ascending: false });
    fail(error);
    return (data ?? []) as Report[];
  },
  async getReport(id) {
    const { data, error } = await supabase.from('reports').select('*').eq('id', id).maybeSingle();
    fail(error);
    return data as Report | null;
  },
  async saveReport(input, id) {
    const { error } = id ? await supabase.from('reports').update(input).eq('id', id) : await supabase.from('reports').insert(input);
    fail(error);
  },
  async listTasks() {
    const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true });
    fail(error);
    return (data ?? []) as Task[];
  },
  async saveTask(input) {
    const { error } = await supabase.from('tasks').insert(input);
    fail(error);
  },
  async setTaskStatus(id, status) {
    const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
    fail(error);
  },
  async listStaff() {
    const { data, error } = await supabase.from('staff').select('*').order('sort_no');
    fail(error);
    return (data ?? []) as Staff[];
  },
  async listShifts(from, to, staffId) {
    let q = supabase.from('staff_shifts').select('staff_id, day, value').gte('day', from).lte('day', to);
    if (staffId) q = q.eq('staff_id', staffId);
    const { data, error } = await q.limit(5000);
    fail(error);
    return (data ?? []) as StaffShift[];
  },
  async listAssignments(day) {
    const { data, error } = await supabase.from('staff_assignments').select('staff_id, day, location').eq('day', day);
    fail(error);
    return (data ?? []) as StaffAssignment[];
  },
  async setAssignment(staffId, day, location) {
    const { error } = location
      ? await supabase.from('staff_assignments').upsert({ staff_id: staffId, day, location })
      : await supabase.from('staff_assignments').delete().eq('staff_id', staffId).eq('day', day);
    fail(error);
  },
  async listInventory() {
    const { data, error } = await supabase.from('inventory_items').select('*').order('name').limit(5000);
    fail(error);
    return (data ?? []).map((r) => ({ ...r, quantity: Number(r.quantity), critical_level: Number(r.critical_level) })) as InventoryItem[];
  },
  async saveInventoryItem(input, id) {
    const row = { ...input, updated_at: new Date().toISOString() };
    const { error } = id ? await supabase.from('inventory_items').update(row).eq('id', id) : await supabase.from('inventory_items').insert(row);
    if (error?.code === '23505') throw new Error('Bu malzeme kodu zaten kayıtlı.');
    fail(error);
  },
  async deleteInventoryItem(id) {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    fail(error);
  },
  async listEquipment() {
    const { data, error } = await supabase.from('equipment').select('id, code, line, kind, location').limit(10000);
    fail(error);
    return ((data ?? []) as Equipment[]).sort((a, b) => compareCodes(a.code, b.code));
  },
  async addEquipment(code, location) {
    const { error } = await supabase.from('equipment').insert({ code, line: lineOf(code), location });
    if (error?.code === '23505') throw new Error('Bu numarayla bir ekipman zaten kayıtlı.');
    fail(error);
  },
  async updateEquipment(id, patch) {
    const { error } = await supabase.from('equipment').update(patch).eq('id', id);
    fail(error);
  },
  async maintenanceCounts() {
    const { data, error } = await supabase.from('maintenance_records').select('equipment_id').limit(20000);
    fail(error);
    const out: Record<string, number> = {};
    for (const r of data ?? []) out[r.equipment_id] = (out[r.equipment_id] ?? 0) + 1;
    return out;
  },
  async listMaintenance(equipmentId) {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('id, equipment_id, technician, work, note, created_at, parts:maintenance_parts(item_id, item_name, quantity, unit)')
      .eq('equipment_id', equipmentId)
      .order('created_at', { ascending: false });
    fail(error);
    return (data ?? []).map((r: any) => ({ ...r, parts: (r.parts ?? []).map((p: any) => ({ ...p, quantity: Number(p.quantity) })) })) as MaintenanceRecord[];
  },
  async saveMaintenance(input) {
    const { error } = await supabase.rpc('save_maintenance_record', {
      p_id: input.id ?? null,
      p_equipment: input.equipment_id,
      p_technician: input.technician,
      p_work: input.work,
      p_note: input.note,
      p_parts: input.parts,
      p_shift: input.shift,
      p_team: input.team,
    });
    fail(error);
  },
  async deleteMaintenance(id) {
    const { error } = await supabase.rpc('delete_maintenance_record', { p_id: id });
    fail(error);
  },
  async listMaintenanceBetween(from, to) {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('id, equipment_id, technician, work, note, shift, team, created_by, created_at, equipment:equipment(code), parts:maintenance_parts(item_id, item_name, quantity, unit)')
      .gte('created_at', from.toISOString())
      .lt('created_at', to.toISOString())
      .order('created_at');
    fail(error);
    return (data ?? []).map((r: any) => ({ ...r, equipment_code: r.equipment?.code, equipment: undefined, parts: (r.parts ?? []).map((p: any) => ({ ...p, quantity: Number(p.quantity) })) })) as MaintenanceRecord[];
  },
  async listDailyWorks(from, to) {
    const { data, error } = await supabase
      .from('daily_works')
      .select('*, author:profiles!daily_works_created_by_fkey(full_name)')
      .gte('created_at', from.toISOString())
      .lt('created_at', to.toISOString())
      .order('created_at', { ascending: false });
    fail(error);
    return (data ?? []).map(withAuthorName) as DailyWork[];
  },
  async saveDailyWork(input, id) {
    // Düzeltmede vardiya/ekip ilk girildiği gibi kalır.
    const { shift: _s, team: _t, ...editable } = input;
    const { error } = id ? await supabase.from('daily_works').update(editable).eq('id', id) : await supabase.from('daily_works').insert(input);
    fail(error);
  },
  async deleteDailyWork(id) {
    const { error } = await supabase.from('daily_works').delete().eq('id', id);
    fail(error);
  },
  async listShiftEntries(day, shift, team) {
    let q = supabase.from('shift_entries').select('*, author:profiles!shift_entries_created_by_fkey(full_name)').eq('day', day).eq('shift', shift);
    if (team) q = q.eq('team', team);
    const { data, error } = await q.order('created_at');
    fail(error);
    return (data ?? []).map(withAuthorName) as ShiftEntry[];
  },
  async saveShiftEntry(input) {
    const { error } = await supabase.from('shift_entries').insert(input);
    fail(error);
  },
  async saveShiftReport(day, shift, team, content) {
    const { data } = await supabase.auth.getSession();
    const row = { day, shift, team, content, entry_count: content.length, created_by: data.session?.user.id, created_at: new Date().toISOString() };
    const { error } = await supabase.from('shift_reports').upsert(row, { onConflict: 'day,shift,team' });
    fail(error);
  },
  async listShiftReports() {
    const { data, error } = await supabase.from('shift_reports').select('*, author:profiles!shift_reports_created_by_fkey(full_name)').order('day', { ascending: false }).order('created_at', { ascending: false });
    fail(error);
    return (data ?? []).map(withAuthorName) as ShiftReport[];
  },
  async getShiftReport(id) {
    const { data, error } = await supabase.from('shift_reports').select('*, author:profiles!shift_reports_created_by_fkey(full_name)').eq('id', id).maybeSingle();
    fail(error);
    return data ? (withAuthorName(data) as ShiftReport) : null;
  },
  async importPlan(rows) {
    const { error } = await supabase.from('staff').upsert(rows.map(({ shifts: _s, ...st }) => st), { onConflict: 'sicil' });
    fail(error);
    const { data, error: e2 } = await supabase.from('staff').select('id, sicil');
    fail(e2);
    const idOf = new Map((data ?? []).map((x) => [x.sicil as string, x.id as string]));
    const shifts = rows.flatMap((r) => r.shifts.map((x) => ({ staff_id: idOf.get(r.sicil)!, day: x.day, value: x.value })));
    for (let i = 0; i < shifts.length; i += 500) {
      const { error: e3 } = await supabase.from('staff_shifts').upsert(shifts.slice(i, i + 500));
      fail(e3);
    }
  },
  subscribe(tables, cb) {
    let ch = supabase.channel(`live-${Math.random().toString(36).slice(2)}`);
    for (const table of tables) ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, cb);
    ch.subscribe();
    return () => void supabase.removeChannel(ch);
  },
};

/* ------------------------------- Demo ------------------------------- */
// Supabase bağlanana kadar ekranları denemek için bellekte tutulan örnek veriler.
// Uygulama kapatılınca sıfırlanır.

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2);
const demo = {
  me: null as string | null,
  users: [
    { id: 'admin', full_name: 'Demo Yönetici', phone: '0500 000 00 00', email: 'admin@bhs.app', role: 'admin', status: 'approved', shift: 'A', team: 'Teknik', created_at: now(), password: '123456' },
    { id: 'u1', full_name: 'Ahmet Buruk', phone: '0555 111 22 33', email: 'ahmet@bhs.app', role: 'user', status: 'pending', shift: null, team: null, created_at: now(), password: '123456' },
  ] as (Profile & { password: string })[],
  notices: [
    { id: 'n1', title: 'Test Bildirisi', body: 'Sistem planlı bakımda', importance: 'normal', photo_url: null, created_by: 'admin', created_at: now(), completed_at: null },
  ] as Notice[],
  zones: [
    ...['Doğu 1 Vertisorter', 'Doğu 2 Vertisorter', 'Doğu 3 Vertisorter', 'Doğu Check-in 1-3'].map((name, i) => ({ id: `zd${i}`, line: 'dogu', name, sort_no: i })),
    ...['Batı 1 Vertisorter', 'Batı 2 Vertisorter', 'Batı 3 Vertisorter'].map((name, i) => ({ id: `zb${i}`, line: 'bati', name, sort_no: i })),
  ] as FaultZone[],
  // Bugün 3, geçen hafta 13 örnek arıza (renk eşiklerini ve arşivi göstermek için).
  faults: Array.from({ length: 16 }, (_, i): Fault => {
    const old = i >= 3;
    const zone = old ? (i < 15 ? 1 : 0) : i;
    return {
      id: `f${i}`, line: 'dogu', zone_id: `zd${zone}`, zone_name: ['Doğu 1 Vertisorter', 'Doğu 2 Vertisorter', 'Doğu 3 Vertisorter'][zone], company: ['PCYH', 'TGS', 'ÇELEBİ'][i % 3],
      description: i === 0 ? 'Bagaj sıkışması, bant 2 dakika durdu.' : '', photo_url: null, shift: 'A', team: 'Operasyon', created_by: 'admin',
      created_at: new Date(Date.now() - (old ? 7 * 86400000 : i * 60000)).toISOString(),
    };
  }),
  reports: [
    { id: 'r1', no: 1, incident_at: now(), officer: 'Demo Yönetici', staff_name: 'Ali Kaya', company: 'PCYH', summary: 'Konveyör bandında ufak sıkışma meydana geldi', photo_urls: [], created_by: 'admin', created_at: now() },
  ] as Report[],
  tasks: [
    { id: 't1', title: 'Temizlik', shift: 'A', due_date: now().slice(0, 10), description: '', photo_url: null, status: 'yapildi', created_by: 'admin', created_at: now() },
  ] as Task[],
  listeners: new Set<() => void>(),
};

// Uydurma personel ve içinde bulunulan ay için tatil / gündüz / gece döngüsüyle örnek plan.
const DEMO_STAFF: [string, string, Staff['department']][] = [
  ['Deniz Aksoy', 'Ekip Sorumlusu', 'Operasyon'], ['Ece Yıldız', 'Operatör', 'Operasyon'], ['Burak Şahin', 'Operatör', 'Operasyon'],
  ['Selin Koç', 'Uzm. Operatör', 'Operasyon'], ['Onur Çelik', 'Kd. Ekip Sorumlusu', 'Teknik'], ['Zeynep Arslan', 'Teknisyen', 'Teknik'],
  ['Emre Doğan', 'Teknisyen', 'Teknik'], ['Merve Kılıç', 'Operatör', 'Operasyon'], ['Can Öztürk', 'Kd. Teknisyen', 'Teknik'],
  ['Elif Aydın', 'Operatör', 'Operasyon'], ['Kaan Polat', 'Ekip Sorumlusu', 'Teknik'], ['Aslı Güler', 'Operatör', 'Operasyon'],
];
let demoStaff: Staff[] = DEMO_STAFF.map(([full_name, title, department], i) => ({ id: `s${i}`, sicil: String(3100 + i * 7), full_name, title, department, sort_no: i }));
let demoShifts: StaffShift[] = (() => {
  const first = new Date();
  first.setDate(1);
  const start = addDays(toDay(first), -1); // bir önceki ayın son günü de olsun (gece vardiyası devri)
  const cycle = ['T', '08:30-20:30', '20:30-08:30', 'T'];
  return demoStaff.flatMap((st, i) => Array.from({ length: 33 }, (_, d) => ({ staff_id: st.id, day: addDays(start, d), value: i === 3 && d === 9 ? 'Yİ' : cycle[(d + i) % 4] })));
})();
const demoAssignments: StaffAssignment[] = [];
let demoEquipment: Equipment[] = EQUIPMENT_CODES.map((code, i) => ({ id: `q${i}`, code, line: lineOf(code), kind: 'Konveyör / Motor', location: '' }));
const demoMaintenance: MaintenanceRecord[] = [];
let demoWorks: DailyWork[] = [
  { id: 'w1', category: 'Köprü bakımı', place: 'Köprü 205', work: 'Körük ve tekerlek kontrolü yapıldı, yağlama tamamlandı.', note: '', photo_url: null, shift: 'A', team: 'Teknik', created_by: 'admin', created_at: now() },
];
let demoInventory: InventoryItem[] = [
  { id: 'i1', code: 'SNS-014', name: 'Fotosel sensör', category: 'Sensör', shelf: 'A-03-2', quantity: 12, unit: 'Adet', critical_level: 5, updated_at: now() },
  { id: 'i2', code: 'MTR-220', name: 'Redüktörlü motor 0,75 kW', category: 'Motor', shelf: 'B-01-1', quantity: 2, unit: 'Adet', critical_level: 2, updated_at: now() },
  { id: 'i3', code: 'BNT-600', name: 'Konveyör bandı 600 mm', category: 'Bant', shelf: 'C-02-4', quantity: 40, unit: 'Metre', critical_level: 15, updated_at: now() },
];
const demoEntries: ShiftEntry[] = [
  { id: 'e1', day: toDay(new Date()), shift: 'A', team: 'Operasyon', kind: 'bildirim', title: 'Hat 3 yoğunluğu', body: 'Sabah 09:00-11:00 arası hat 3 yoğun çalıştı, ek personel yönlendirildi.', photo_url: null, created_by: 'admin', created_at: now() },
];
let demoReports: ShiftReport[] = [];
const demoName = (id: string) => demo.users.find((u) => u.id === id)?.full_name;

const emit = () => demo.listeners.forEach((l) => l());
const listen = (cb: () => void) => {
  const l = () => cb(); // aynı fonksiyon iki kez kaydedilse de abonelikler birbirinden bağımsız kalsın
  demo.listeners.add(l);
  return () => void demo.listeners.delete(l);
};
const withAuthor = (n: Notice): Notice => ({ ...n, author_name: demo.users.find((u) => u.id === n.created_by)?.full_name });

const demoApi: Api = {
  async signIn(email, password) {
    const u = demo.users.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new Error('E-posta veya şifre hatalı.');
    demo.me = u.id;
    emit();
  },
  async signUp({ password, ...rest }) {
    const email = rest.email.trim().toLowerCase();
    if (demo.users.some((u) => u.email === email)) throw new Error('Bu e-posta ile zaten bir kayıt var.');
    const id = uid();
    demo.users.unshift({ ...rest, email, id, role: 'user', status: 'pending', created_at: now(), password });
    demo.me = id;
    emit();
  },
  async signOut() {
    demo.me = null;
    emit();
  },
  async setMyShift(shift, team) {
    const u = demo.users.find((x) => x.id === demo.me);
    if (u) Object.assign(u, { shift, team });
    emit();
  },
  async currentProfile() {
    const u = demo.users.find((x) => x.id === demo.me);
    if (!u) return null;
    const { password: _pw, ...profile } = u;
    return profile;
  },
  onAuthChange: listen,
  async listUsers() {
    return demo.users.map(({ password: _pw, ...p }) => p);
  },
  async setUserStatus(id, status) {
    const u = demo.users.find((x) => x.id === id);
    if (u) u.status = status;
    emit();
  },
  async listNotices(archived) {
    return demo.notices.filter((n) => !!n.completed_at === archived).map(withAuthor);
  },
  async getNotice(id) {
    const n = demo.notices.find((x) => x.id === id);
    return n ? withAuthor(n) : null;
  },
  async saveNotice(input, id) {
    const old = demo.notices.find((x) => x.id === id);
    if (old) Object.assign(old, input);
    else demo.notices.unshift({ ...input, id: uid(), created_by: demo.me!, created_at: now(), completed_at: null });
    emit();
  },
  async createAutoNotice(key, input) {
    if (demo.notices.some((n) => n.auto_key === key)) return;
    demo.notices.unshift({ ...input, auto_key: key, id: uid(), created_by: demo.me!, created_at: now(), completed_at: null });
    emit();
  },
  async completeNotice(id) {
    const n = demo.notices.find((x) => x.id === id);
    if (n) n.completed_at = now();
    emit();
  },
  async uploadPhoto(photo) {
    return photo.uri;
  },
  async listReports() {
    return [...demo.reports].sort((a, b) => b.incident_at.localeCompare(a.incident_at));
  },
  async getReport(id) {
    const r = demo.reports.find((x) => x.id === id);
    return r ? { ...r } : null; // kopya: yerinde değişen nesne ekranı yenilemez
  },
  async saveReport(input, id) {
    const old = demo.reports.find((r) => r.id === id);
    if (old) Object.assign(old, input);
    else demo.reports.push({ ...input, id: uid(), no: Math.max(0, ...demo.reports.map((r) => r.no)) + 1, created_by: demo.me!, created_at: now() });
    emit();
  },
  async listTasks() {
    return demo.tasks.map((t) => ({ ...t })).sort((a, b) => a.due_date.localeCompare(b.due_date));
  },
  async saveTask(input) {
    demo.tasks.push({ ...input, id: uid(), status: null, created_by: demo.me!, created_at: now() });
    emit();
  },
  async setTaskStatus(id, status) {
    const t = demo.tasks.find((x) => x.id === id);
    if (t) t.status = status;
    emit();
  },
  async listZones(line) {
    return demo.zones.filter((z) => z.line === line);
  },
  async addZone(line, name) {
    if (demo.zones.some((z) => z.line === line && z.name === name)) throw new Error('Bu hatta aynı adda bir bölge zaten var.');
    demo.zones.push({ id: uid(), line, name, sort_no: demo.zones.length });
    emit();
  },
  async deleteZone(id) {
    demo.zones = demo.zones.filter((z) => z.id !== id);
    emit();
  },
  async listFaults(from, to) {
    return demo.faults
      .filter((f) => new Date(f.created_at) >= from && (!to || new Date(f.created_at) < to))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((f) => ({ ...f, author_name: demo.users.find((u) => u.id === f.created_by)?.full_name }));
  },
  async getFault(id) {
    const f = demo.faults.find((x) => x.id === id);
    return f ? { ...f, author_name: demo.users.find((u) => u.id === f.created_by)?.full_name } : null;
  },
  async saveFault(input) {
    demo.faults.push({ ...input, id: uid(), created_by: demo.me!, created_at: now() });
    emit();
  },
  async todayFaultCount() {
    const t = startOfToday().getTime();
    return demo.faults.filter((f) => new Date(f.created_at).getTime() >= t).length;
  },
  async listStaff() {
    return demoStaff;
  },
  async listShifts(from, to, staffId) {
    return demoShifts.filter((x) => x.day >= from && x.day <= to && (!staffId || x.staff_id === staffId));
  },
  async listAssignments(day) {
    return demoAssignments.filter((a) => a.day === day);
  },
  async setAssignment(staffId, day, location) {
    const i = demoAssignments.findIndex((a) => a.staff_id === staffId && a.day === day);
    if (i >= 0) demoAssignments.splice(i, 1);
    if (location) demoAssignments.push({ staff_id: staffId, day, location });
    emit();
  },
  async listInventory() {
    return demoInventory.map((i) => ({ ...i })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  },
  async saveInventoryItem(input, id) {
    if (demoInventory.some((i) => i.code === input.code && i.id !== id)) throw new Error('Bu malzeme kodu zaten kayıtlı.');
    demoInventory = id ? demoInventory.map((i) => (i.id === id ? { ...i, ...input, updated_at: now() } : i)) : [...demoInventory, { ...input, id: uid(), updated_at: now() }];
    emit();
  },
  async deleteInventoryItem(id) {
    demoInventory = demoInventory.filter((i) => i.id !== id);
    emit();
  },
  async listEquipment() {
    return [...demoEquipment].sort((a, b) => compareCodes(a.code, b.code));
  },
  async addEquipment(code, location) {
    if (demoEquipment.some((e) => e.code === code)) throw new Error('Bu numarayla bir ekipman zaten kayıtlı.');
    demoEquipment = [...demoEquipment, { id: uid(), code, line: lineOf(code), kind: 'Konveyör / Motor', location }];
    emit();
  },
  async updateEquipment(id, patch) {
    demoEquipment = demoEquipment.map((e) => (e.id === id ? { ...e, ...patch } : e));
    emit();
  },
  async maintenanceCounts() {
    const out: Record<string, number> = {};
    for (const r of demoMaintenance) out[r.equipment_id] = (out[r.equipment_id] ?? 0) + 1;
    return out;
  },
  async listMaintenance(equipmentId) {
    return demoMaintenance.filter((r) => r.equipment_id === equipmentId).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((r) => ({ ...r, parts: [...r.parts] }));
  },
  async saveMaintenance({ id, ...input }) {
    const old = demoMaintenance.find((r) => r.id === id);
    // Önce eski parçaları depoya geri ekle, sonra yenilerini düş; yetmezse hiçbir şey değişmesin.
    const stock = new Map(demoInventory.map((i) => [i.id, i.quantity]));
    for (const p of old?.parts ?? []) if (p.item_id && stock.has(p.item_id)) stock.set(p.item_id, stock.get(p.item_id)! + p.quantity);
    for (const p of input.parts) {
      if (!p.item_id) continue;
      const left = (stock.get(p.item_id) ?? 0) - p.quantity;
      if (left < 0) throw new Error(`Depoda yeterli stok yok: ${p.item_name}.`);
      stock.set(p.item_id, left);
    }
    demoInventory = demoInventory.map((i) => ({ ...i, quantity: stock.get(i.id)! }));
    if (old) Object.assign(old, input);
    else demoMaintenance.push({ ...input, id: uid(), created_by: demo.me!, created_at: new Date(Date.now() + demoMaintenance.length).toISOString() });
    emit();
  },
  async deleteMaintenance(id) {
    const i = demoMaintenance.findIndex((r) => r.id === id);
    if (i < 0) return;
    for (const p of demoMaintenance[i].parts) demoInventory = demoInventory.map((x) => (x.id === p.item_id ? { ...x, quantity: x.quantity + p.quantity } : x));
    demoMaintenance.splice(i, 1);
    emit();
  },
  async listMaintenanceBetween(from, to) {
    return demoMaintenance
      .filter((r) => new Date(r.created_at) >= from && new Date(r.created_at) < to)
      .map((r) => ({ ...r, equipment_code: demoEquipment.find((e) => e.id === r.equipment_id)?.code }));
  },
  async listDailyWorks(from, to) {
    return demoWorks
      .filter((w) => new Date(w.created_at) >= from && new Date(w.created_at) < to)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((w) => ({ ...w, author_name: demoName(w.created_by) }));
  },
  async saveDailyWork(input, id) {
    const { shift: _s, team: _t, ...editable } = input;
    demoWorks = id ? demoWorks.map((w) => (w.id === id ? { ...w, ...editable } : w)) : [...demoWorks, { ...input, id: uid(), created_by: demo.me!, created_at: now() }];
    emit();
  },
  async deleteDailyWork(id) {
    demoWorks = demoWorks.filter((w) => w.id !== id);
    emit();
  },
  async listShiftEntries(day, shift, team) {
    return demoEntries.filter((e) => e.day === day && e.shift === shift && (!team || e.team === team)).map((e) => ({ ...e, author_name: demoName(e.created_by) }));
  },
  async saveShiftEntry(input) {
    demoEntries.push({ ...input, id: uid(), created_by: demo.me!, created_at: now() });
    emit();
  },
  async saveShiftReport(day, shift, team, content) {
    demoReports = [{ id: uid(), day, shift, team, content, entry_count: content.length, created_by: demo.me!, created_at: now() }, ...demoReports.filter((r) => !(r.day === day && r.shift === shift && r.team === team))];
    emit();
  },
  async listShiftReports() {
    return demoReports.map((r) => ({ ...r, author_name: demoName(r.created_by) }));
  },
  async getShiftReport(id) {
    const r = demoReports.find((x) => x.id === id);
    return r ? { ...r, author_name: demoName(r.created_by) } : null;
  },
  async importPlan(rows) {
    for (const { shifts, ...st } of rows) {
      const old = demoStaff.find((x) => x.sicil === st.sicil);
      const id = old?.id ?? `x${st.sicil}`;
      demoStaff = [...demoStaff.filter((x) => x.sicil !== st.sicil), { ...st, id }];
      const days = new Set(shifts.map((x) => x.day));
      demoShifts = [...demoShifts.filter((x) => x.staff_id !== id || !days.has(x.day)), ...shifts.map((x) => ({ staff_id: id, ...x }))];
    }
    demoStaff.sort((a, b) => a.sort_no - b.sort_no);
    emit();
  },
  subscribe: (_tables, cb) => listen(cb),
};

export const api: Api = isDemo ? demoApi : supaApi;
