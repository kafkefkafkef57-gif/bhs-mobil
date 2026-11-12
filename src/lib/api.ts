import { isDemo, supabase } from './supabase';
import { Notice, NoticeInput, Photo, Profile, Report, ReportInput, SignUpInput, Status, Table, Task, TaskInput, TaskStatus } from './types';

export interface Api {
  signIn(email: string, password: string): Promise<void>;
  signUp(input: SignUpInput): Promise<void>;
  signOut(): Promise<void>;
  currentProfile(): Promise<Profile | null>;
  onAuthChange(cb: () => void): () => void;
  listUsers(): Promise<Profile[]>;
  setUserStatus(id: string, status: Status): Promise<void>;
  listNotices(archived: boolean): Promise<Notice[]>;
  getNotice(id: string): Promise<Notice | null>;
  saveNotice(input: NoticeInput, id?: string): Promise<void>;
  completeNotice(id: string): Promise<void>;
  uploadPhoto(photo: Photo, folder?: string): Promise<string>;
  listReports(): Promise<Report[]>;
  getReport(id: string): Promise<Report | null>;
  saveReport(input: ReportInput, id?: string): Promise<void>;
  listTasks(): Promise<Task[]>;
  saveTask(input: TaskInput): Promise<void>;
  setTaskStatus(id: string, status: TaskStatus | null): Promise<void>;
  todayFaultCount(): Promise<number>;
  subscribe(tables: Table[], cb: () => void): () => void;
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ----------------------------- Supabase ----------------------------- */

const ERRORS: [string, string][] = [
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
const toNotice = (r: any): Notice => ({ ...r, author_name: r.author?.full_name, author: undefined });

const supaApi: Api = {
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    fail(error);
  },
  async signUp({ full_name, phone, email, password }) {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: full_name.trim(), phone: phone.trim() } },
    });
    fail(error);
  },
  async signOut() {
    await supabase.auth.signOut();
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
    { id: 'admin', full_name: 'Demo Yönetici', phone: '0500 000 00 00', email: 'admin@bhs.app', role: 'admin', status: 'approved', created_at: now(), password: '123456' },
    { id: 'u1', full_name: 'Ahmet Buruk', phone: '0555 111 22 33', email: 'ahmet@bhs.app', role: 'user', status: 'pending', created_at: now(), password: '123456' },
  ] as (Profile & { password: string })[],
  notices: [
    { id: 'n1', title: 'Test Bildirisi', body: 'Sistem planlı bakımda', importance: 'normal', photo_url: null, created_by: 'admin', created_at: now(), completed_at: null },
  ] as Notice[],
  faults: [now(), now(), now()],
  reports: [
    { id: 'r1', no: 1, incident_at: now(), officer: 'Demo Yönetici', staff_name: 'Ali Kaya', company: 'PCYH', summary: 'Konveyör bandında ufak sıkışma meydana geldi', photo_urls: [], created_by: 'admin', created_at: now() },
  ] as Report[],
  tasks: [
    { id: 't1', title: 'Temizlik', shift: 'A', due_date: now().slice(0, 10), description: '', photo_url: null, status: 'yapildi', created_by: 'admin', created_at: now() },
  ] as Task[],
  listeners: new Set<() => void>(),
};
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
  async todayFaultCount() {
    const t = startOfToday().getTime();
    return demo.faults.filter((f) => new Date(f).getTime() >= t).length;
  },
  subscribe: (_tables, cb) => listen(cb),
};

export const api: Api = isDemo ? demoApi : supaApi;
