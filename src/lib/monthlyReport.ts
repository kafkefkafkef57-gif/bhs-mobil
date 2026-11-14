import { api } from './api';
import { formatDate, formatDateLong, formatDay, monthName, toDay } from './format';
import { KINDS } from './shiftReport';
import { CustomsFlight, DailyWork, Fault, LINE_NAME, MaintenanceRecord, Notice, Report, ShiftEntry, Task } from './types';

export type MonthlyData = {
  year: number;
  month: number; // 0-11
  faults: Fault[];
  notices: Notice[];
  reports: Report[];
  works: DailyWork[];
  maintenance: MaintenanceRecord[];
  entries: ShiftEntry[];
  tasks: Task[];
  customs: CustomsFlight[];
};

/** Bir aya ait tüm kayıtları toplar. */
export async function loadMonth(year: number, month: number): Promise<MonthlyData> {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 1);
  const fromDay = toDay(from);
  const lastDay = toDay(new Date(year, month + 1, 0));
  const inMonth = (iso: string) => new Date(iso) >= from && new Date(iso) < to;
  const [faults, active, archived, reports, works, maintenance, entries, tasks, customs] = await Promise.all([
    api.listFaults(from, to),
    api.listNotices(false),
    api.listNotices(true),
    api.listReports(),
    api.listDailyWorks(from, to),
    api.listMaintenanceBetween(from, to),
    api.listShiftEntriesBetween(fromDay, lastDay),
    api.listTasks(),
    api.listCustomsFlights(fromDay, lastDay),
  ]);
  return {
    year,
    month,
    faults: [...faults].reverse(),
    notices: [...active, ...archived].filter((n) => inMonth(n.created_at)).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    reports: reports.filter((r) => inMonth(r.incident_at)).sort((a, b) => a.incident_at.localeCompare(b.incident_at)),
    works: [...works].reverse(),
    maintenance,
    entries,
    tasks: tasks.filter((t) => t.due_date >= fromDay && t.due_date <= lastDay),
    customs: [...customs].reverse(),
  };
}

export const monthTitle = (d: Pick<MonthlyData, 'year' | 'month'>) => `${monthName(d.month)} ${d.year}`;
/** Özet satırları: [başlık, adet] */
export const monthSummary = (d: MonthlyData): [string, number][] => [
  ['Arıza', d.faults.length],
  ['Bildiri', d.notices.length],
  ['Olay tutanağı', d.reports.length],
  ['Günlük teknik iş', d.works.length],
  ['Ekipman bakımı', d.maintenance.length],
  ['Vardiya paylaşımı', d.entries.length],
  ['Operasyon görevi', d.tasks.length],
  ['Gümrük uçuşu', d.customs.length],
];

const esc = (t: string) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
const table = (head: string[], rows: string[][]) =>
  rows.length ? `<table class="list"><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>` : '<p class="empty">Bu ay kayıt yok.</p>';
const countBy = <T>(items: T[], key: (x: T) => string) => [...items.reduce((m, x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);

/** Aylık toplu raporun yazdırılabilir (PDF'e çevrilecek) HTML hali. */
export function monthlyHtml(d: MonthlyData, createdBy: string): string {
  const zones = countBy(d.faults, (f) => `${LINE_NAME[f.line]} · ${f.zone_name}`);
  const companies = countBy(d.faults, (f) => f.company || '—');
  const taskStatus = (t: Task) => (t.status === 'yapildi' ? 'Yapıldı' : t.status === 'yapilmadi' ? 'Yapılmadı' : 'Bekliyor');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 28px; font-size: 11px; }
    h1 { font-size: 22px; margin: 0 0 2px; } h2 { font-size: 14px; margin: 22px 0 6px; border-bottom: 2px solid #111; padding-bottom: 3px; }
    h3 { font-size: 12px; margin: 12px 0 4px; } .sub { color: #555; margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; } .list th { text-align: left; background: #eee; } .list th, .list td { border: 1px solid #bbb; padding: 4px 6px; vertical-align: top; }
    .summary { width: auto; } .summary td { padding: 3px 22px 3px 0; font-size: 12px; } .summary td:last-child { font-weight: 700; text-align: right; }
    .cols { display: flex; gap: 24px; } .cols > div { flex: 1; } .empty { color: #666; } tr { page-break-inside: avoid; }
    .foot { margin-top: 26px; color: #777; font-size: 10px; text-align: center; letter-spacing: 2px; }
  </style></head><body>
    <h1>BHS Aylık Rapor · ${monthTitle(d)}</h1>
    <div class="sub">Oluşturan: ${esc(createdBy)} · ${formatDateLong(new Date().toISOString())}</div>
    <h2>Özet</h2>
    <table class="summary">${monthSummary(d).map(([k, n]) => `<tr><td>${k}</td><td>${n}</td></tr>`).join('')}</table>

    <h2>Arızalar (${d.faults.length})</h2>
    <div class="cols">
      <div><h3>Bölgeye göre</h3>${table(['Bölge', 'Arıza'], zones.map(([k, n]) => [k, String(n)]))}</div>
      <div><h3>Bagaj firmasına göre</h3>${table(['Firma', 'Arıza'], companies.map(([k, n]) => [k, String(n)]))}</div>
    </div>
    <h3>Tüm arızalar</h3>
    ${table(['Tarih', 'Hat / Bölge', 'Firma', 'Vardiya', 'Bildiren', 'Açıklama'], d.faults.map((f) => [formatDate(f.created_at), `${LINE_NAME[f.line]} · ${f.zone_name}`, f.company, `${f.shift ?? '—'} · ${f.team ?? ''}`, f.author_name ?? '', f.description]))}

    <h2>Bildiriler (${d.notices.length})</h2>
    ${table(['Tarih', 'Başlık', 'İçerik', 'Yayınlayan', 'Durum'], d.notices.map((n) => [formatDate(n.created_at), n.title, n.body, n.auto_key ? 'Otomatik' : (n.author_name ?? ''), n.completed_at ? `Tamamlandı ${formatDate(n.completed_at)}` : 'Açık']))}

    <h2>Olay Tutanakları (${d.reports.length})</h2>
    ${table(['No', 'Olay tarihi', 'Personel', 'Firma', 'Yetkili', 'Özet'], d.reports.map((r) => [`#${r.no}`, formatDate(r.incident_at), r.staff_name, r.company, r.officer, r.summary]))}

    <h2>Günlük Köprü ve Arıza Bakım (${d.works.length})</h2>
    ${table(['Tarih', 'Tür', 'Yer', 'Yapılan iş', 'Vardiya', 'Yapan'], d.works.map((w) => [formatDate(w.created_at), w.category, w.place, [w.work, w.note && `Not: ${w.note}`].filter(Boolean).join('\n'), w.shift ?? '—', w.author_name ?? '']))}

    <h2>Ekipman Bakımları (${d.maintenance.length})</h2>
    ${table(['Tarih', 'Ekipman', 'Yapılan işlem', 'Kullanılan parçalar', 'Vardiya', 'Yapan'], d.maintenance.map((m) => [formatDate(m.created_at), m.equipment_code ?? '', [m.work, m.note && `Not: ${m.note}`].filter(Boolean).join('\n'), m.parts.map((p) => `${p.item_name} (${String(p.quantity).replace('.', ',')} ${p.unit})`).join(', '), m.shift ?? '—', m.technician]))}

    <h2>Vardiya Paylaşımları (${d.entries.length})</h2>
    ${table(['Tarih', 'Vardiya', 'Tür', 'Başlık', 'İçerik', 'Paylaşan'], d.entries.map((e) => [formatDate(e.created_at), `${e.shift} · ${e.team}`, KINDS[e.kind].label, e.title, e.body, e.author_name ?? '']))}

    <h2>Operasyon Takip Görevleri (${d.tasks.length})</h2>
    ${table(['Tarih', 'Görev', 'Vardiya', 'Durum', 'Açıklama'], d.tasks.map((t) => [formatDay(t.due_date), t.title, t.shift, taskStatus(t), t.description]))}

    <h2>Gümrük Uçuşları (${d.customs.length})</h2>
    ${table(['Tarih', 'Arrival', 'Uçuş', 'Nereden', 'Vardiya', 'Giren', 'Not'], d.customs.map((c) => [formatDay(c.day), String(c.arrival), c.flight, c.origin, c.shift ?? '—', c.author_name ?? '', c.note]))}

    <div class="foot">K.Ç.K TECHNOLOGY</div>
  </body></html>`;
}
