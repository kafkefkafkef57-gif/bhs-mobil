import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { formatDateLong, formatDay, toDay } from './format';
import { C } from './theme';
import { DailyWork, EntryKind, Fault, LINE_NAME, MaintenanceRecord, Shift, ShiftEntry, ShiftReport } from './types';

export const SHIFTS: Shift[] = ['A', 'B', 'C', 'D'];
export const KINDS: Record<EntryKind, { label: string; plural: string; fg: string; bg: string }> = {
  ariza: { label: 'Arıza', plural: 'Arızalar', fg: C.red, bg: C.redBg },
  bakim: { label: 'Teknik iş', plural: 'Teknik İşler ve Bakımlar', fg: '#5eead4', bg: '#1c3f3c' },
  bildirim: { label: 'Bildirim', plural: 'Bildirimler', fg: '#7fb0ff', bg: '#22335a' },
  not: { label: 'Not', plural: 'Notlar', fg: C.amber, bg: C.amberBg },
  rutin: { label: 'Vardiya rutini', plural: 'Vardiya Rutinleri', fg: '#34d399', bg: '#1d4238' },
  devir: { label: 'Devir notu', plural: 'Devir Notları', fg: C.violet, bg: C.violetBg },
};
export const KIND_ORDER: EntryKind[] = ['ariza', 'bakim', 'bildirim', 'not', 'rutin', 'devir'];

/** Arıza kaydını vardiya akışında ve raporda gösterilecek kayda çevirir. */
export const faultToEntry = (f: Fault): ShiftEntry => ({
  id: f.id,
  day: toDay(new Date(f.created_at)),
  shift: f.shift,
  team: f.team,
  kind: 'ariza',
  title: `${f.zone_name} arızası`,
  body: [`${LINE_NAME[f.line]} · Bagaj firması: ${f.company}`, f.description].filter(Boolean).join('\n'),
  photo_url: f.photo_url,
  created_by: f.created_by,
  author_name: f.author_name,
  created_at: f.created_at,
});
/** Günlük teknik işi vardiya akışında ve raporda gösterilecek kayda çevirir (vardiyası belli olmayanlar alınmaz). */
export const workToEntry = (w: DailyWork): ShiftEntry | null =>
  w.shift && w.team
    ? { id: w.id, day: toDay(new Date(w.created_at)), shift: w.shift, team: w.team, kind: 'bakim', title: [w.category, w.place].filter(Boolean).join(' · '), body: [w.work, w.note && `Not: ${w.note}`].filter(Boolean).join('\n'), photo_url: w.photo_url, created_by: w.created_by, author_name: w.author_name, created_at: w.created_at }
    : null;

/** Ekipman bakım kaydını vardiya akışında ve raporda gösterilecek kayda çevirir. */
export const maintenanceToEntry = (r: MaintenanceRecord): ShiftEntry | null =>
  r.shift && r.team
    ? {
        id: r.id,
        day: toDay(new Date(r.created_at)),
        shift: r.shift,
        team: r.team,
        kind: 'bakim',
        title: `Ekipman bakımı · ${r.equipment_code ?? ''}`,
        body: [r.work, r.parts.length ? `Kullanılan parçalar: ${r.parts.map((p) => `${p.item_name} (${String(p.quantity).replace('.', ',')} ${p.unit})`).join(', ')}` : '', r.note && `Not: ${r.note}`].filter(Boolean).join('\n'),
        photo_url: null,
        created_by: r.created_by ?? '',
        author_name: r.technician,
        created_at: r.created_at,
      }
    : null;

export const time = (iso: string) => formatDateLong(iso).slice(-5);
export const reportTitle = (r: Pick<ShiftReport, 'day' | 'shift' | 'team'>) => `${formatDay(r.day)} · ${r.shift} Vardiyası · ${r.team === 'Tümü' ? 'Tüm ekipler' : r.team}`;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Raporun yazdırılabilir (PDF'e çevrilecek) HTML hali. */
export function reportHtml(r: ShiftReport): string {
  const section = (kind: EntryKind) => {
    const items = r.content.filter((e) => e.kind === kind);
    if (!items.length) return '';
    return `<h2>${KINDS[kind].plural} (${items.length})</h2>${items.map(entry).join('')}`;
  };
  const entry = (e: ShiftEntry) => `<div class="entry">
    <div class="meta">${time(e.created_at)} · ${esc(e.author_name ?? '')} · ${e.team}</div>
    <div class="title">${esc(e.title)}</div>
    ${e.body ? `<div class="body">${esc(e.body).replace(/\n/g, '<br>')}</div>` : ''}
    ${e.photo_url ? `<img src="${esc(e.photo_url)}">` : ''}
  </div>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 32px; font-size: 13px; }
    h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 2px solid #111; padding-bottom: 4px; }
    table { border-collapse: collapse; margin-top: 12px; } td { padding: 3px 18px 3px 0; } td:first-child { color: #555; }
    .entry { border: 1px solid #ccc; border-radius: 6px; padding: 10px; margin-bottom: 8px; page-break-inside: avoid; }
    .meta { color: #555; font-size: 11px; } .title { font-weight: 700; font-size: 14px; margin: 2px 0; } .body { line-height: 1.45; }
    img { max-width: 60%; max-height: 260px; margin-top: 8px; border-radius: 4px; } .empty { color: #555; margin-top: 18px; }
  </style></head><body>
    <h1>BHS Vardiya Raporu</h1>
    <table>
      <tr><td>Tarih</td><td><b>${formatDay(r.day)}</b></td></tr>
      <tr><td>Vardiya</td><td><b>${r.shift} Vardiyası</b></td></tr>
      <tr><td>Ekip</td><td><b>${r.team === 'Tümü' ? 'Tüm ekipler' : r.team}</b></td></tr>
      <tr><td>Kayıt sayısı</td><td><b>${r.content.length}</b></td></tr>
      <tr><td>Oluşturan</td><td><b>${esc(r.author_name ?? '')}</b> · ${formatDateLong(r.created_at)}</td></tr>
    </table>
    ${r.content.length ? KIND_ORDER.map(section).join('') : '<p class="empty">Bu vardiyada kayıt girilmemiş.</p>'}
  </body></html>`;
}

export const shareReportPdf = (r: ShiftReport) => shareHtmlAsPdf(reportHtml(r), `Vardiya raporu ${reportTitle(r)}`);

/** Verilen HTML'i PDF'e çevirip paylaşım penceresini açar (web önizlemesinde yazdırma penceresi). */
export async function shareHtmlAsPdf(html: string, title: string) {
  if (Platform.OS === 'web') {
    // Web önizlemesi: raporu yeni pencerede açıp tarayıcının yazdır / PDF kaydet penceresini göster.
    const w = window.open('', '_blank');
    if (!w) throw new Error('Rapor penceresi açılamadı.');
    w.document.write(html);
    w.document.close();
    w.print();
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}
