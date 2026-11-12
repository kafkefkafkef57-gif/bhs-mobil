import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { formatDateLong, formatDay } from './format';
import { C } from './theme';
import { Department, EntryKind, Shift, ShiftEntry, ShiftReport } from './types';

export const SHIFTS: Shift[] = ['A', 'B', 'C', 'D'];
export const KINDS: Record<EntryKind, { label: string; plural: string; fg: string; bg: string }> = {
  bildirim: { label: 'Bildirim', plural: 'Bildirimler', fg: '#7fb0ff', bg: '#22335a' },
  not: { label: 'Not', plural: 'Notlar', fg: C.amber, bg: C.amberBg },
  rutin: { label: 'Vardiya rutini', plural: 'Vardiya Rutinleri', fg: '#34d399', bg: '#1d4238' },
  devir: { label: 'Devir notu', plural: 'Devir Notları', fg: C.violet, bg: C.violetBg },
};
export const KIND_ORDER: EntryKind[] = ['bildirim', 'not', 'rutin', 'devir'];
export const time = (iso: string) => formatDateLong(iso).slice(-5);
export const reportTitle = (r: Pick<ShiftReport, 'day' | 'shift' | 'team'>) => `${formatDay(r.day)} · ${r.shift} Vardiyası · ${r.team === 'Tümü' ? 'Tüm ekipler' : r.team}`;

/** Kullanıcının son seçtiği vardiya ve ekip; bir sonraki açılışta hazır gelsin. */
export type ShiftPrefs = { shift: Shift; team: Department };
const PREFS_KEY = 'vardiya-tercihi';
export async function loadShiftPrefs(): Promise<ShiftPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as ShiftPrefs) : null;
  } catch {
    return null;
  }
}
export const saveShiftPrefs = (p: ShiftPrefs) => AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p)).catch(() => {});

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

/** Raporu PDF'e çevirip paylaşım penceresini açar (web önizlemesinde yazdırma penceresi). */
export async function shareReportPdf(r: ShiftReport) {
  const html = reportHtml(r);
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
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Vardiya raporu ${reportTitle(r)}` });
}
