import { strFromU8, unzipSync } from 'fflate';
import { Department } from './types';

/** Excel'den okunan bir personel satırı ve o aya ait günlük plan değerleri. */
export type PlanRow = { sicil: string; full_name: string; title: string; department: Department; sort_no: number; shifts: { day: string; value: string }[] };
export type Plan = { year: number; month: number; days: number; rows: PlanRow[]; skipped: string[] };

const MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
const decode = (t: string) =>
  t.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');
const colIndex = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const pad = (n: number) => String(n).padStart(2, '0');

/** .xlsx dosyasının ilk sayfasını { satır no -> { sütun no -> metin } } olarak okur. */
function readFirstSheet(bytes: Uint8Array): { title: string; cells: Map<number, Map<number, string>> } {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(f.name) });
  } catch {
    throw new Error('Dosya okunamadı. Lütfen .xlsx biçiminde bir Excel dosyası seçin.');
  }
  const read = (name: string) => (files[name] ? strFromU8(files[name]) : '');
  const sheet = /<sheet\b[^>]*>/.exec(read('xl/workbook.xml'))?.[0];
  if (!sheet) throw new Error('Excel dosyasında sayfa bulunamadı.');
  const title = decode(/\bname="([^"]*)"/.exec(sheet)?.[1] ?? '');
  const rid = /\br:id="([^"]*)"/.exec(sheet)?.[1];
  const rel = [...read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${rid}"`));
  const target = /\bTarget="([^"]*)"/.exec(rel ?? '')?.[1] ?? 'worksheets/sheet1.xml';
  const xml = read(target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));

  const cells = new Map<number, Map<number, string>>();
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = /\br="([A-Z]+)(\d+)"/.exec(m[1]);
    if (!ref || m[2] === undefined) continue;
    const type = /\bt="([^"]*)"/.exec(m[1])?.[1];
    const v = /<v>([\s\S]*?)<\/v>/.exec(m[2])?.[1];
    const value = type === 's' ? shared[Number(v)] : type === 'inlineStr' ? texts(m[2]) : v !== undefined ? decode(v) : '';
    if (!value?.trim()) continue;
    const row = Number(ref[2]);
    if (!cells.has(row)) cells.set(row, new Map());
    cells.get(row)!.set(colIndex(ref[1]), value.trim());
  }
  return { title, cells };
}

/**
 * Aylık çalışma planı Excel'ini çözer. Beklenen düzen:
 * sayfa adı "Kasım 2026" gibi; "SİCİL" başlıklı satırda NO, SİCİL, İSİM, SOYİSİM, ÜNVAN sütunları,
 * bir üst satırda gün numaraları (1..31), altındaki satırlarda her personelin günlük planı.
 */
export function parsePlan(bytes: Uint8Array): Plan {
  const { title, cells } = readFirstSheet(bytes);
  const tm = /^\s*(\S+)\s+(\d{4})/.exec(title);
  const month = tm ? MONTHS.indexOf(tm[1].toLocaleLowerCase('tr')) + 1 : 0;
  if (!tm || !month) throw new Error(`Sayfa adından ay ve yıl anlaşılamadı ("${title}"). Sayfa adı "Kasım 2026" gibi olmalı.`);
  const year = Number(tm[2]);

  const up = (t: string) => t.toLocaleUpperCase('tr');
  const headRow = [...cells.entries()].find(([, r]) => [...r.values()].some((v) => up(v) === 'SİCİL'))?.[0];
  if (!headRow) throw new Error('"SİCİL" başlıklı satır bulunamadı; dosya beklenen çalışma planı düzeninde değil.');
  const head = cells.get(headRow)!;
  const col = (...names: string[]) => [...head.entries()].find(([, v]) => names.includes(up(v)))?.[0];
  const cNo = col('NO'), cSicil = col('SİCİL')!, cAd = col('İSİM', 'AD'), cSoyad = col('SOYİSİM', 'SOYAD'), cUnvan = col('ÜNVAN', 'UNVAN');
  if (!cAd || !cSoyad || !cUnvan) throw new Error('İSİM, SOYİSİM ve ÜNVAN sütunları bulunamadı.');

  // Gün sütunları: başlığın bir üst satırındaki 1..31 sayıları.
  const dayCols = [...(cells.get(headRow - 1) ?? new Map<number, string>()).entries()].filter(([c, v]) => c > cUnvan && /^\d{1,2}(\.0+)?$/.test(v)).map(([c, v]) => [c, Number(v)] as const);
  if (dayCols.length < 28) throw new Error('Gün sütunları (1–31) bulunamadı.');

  const raw = [...cells.entries()]
    .filter(([r, row]) => r > headRow && /^\d+(\.0+)?$/.test(row.get(cSicil) ?? '') && row.get(cAd))
    .sort((a, b) => a[0] - b[0])
    .map(([, row], i) => ({
      sicil: String(Number(row.get(cSicil))),
      full_name: `${row.get(cAd)} ${row.get(cSoyad) ?? ''}`.replace(/\s+/g, ' ').trim(),
      title: row.get(cUnvan) ?? '',
      sort_no: cNo && row.get(cNo) ? Number(row.get(cNo)) : i + 1,
      shifts: dayCols.filter(([c]) => row.get(c)).map(([c, d]) => ({ day: `${year}-${pad(month)}-${pad(d)}`, value: row.get(c)! })),
    }));

  // Departman: Operatör -> Operasyon, Teknisyen -> Teknik. Ekip sorumluları kendilerinden sonra gelen
  // ilk ekip üyesine göre atanır; altında ekip bulunmayanlar (ör. gündüz mesaisindeki idari personel) alınmaz.
  const deptAt = (i: number): Department | null => {
    for (const r of raw.slice(i)) {
      if (/operatör/i.test(r.title)) return 'Operasyon';
      if (/teknisyen/i.test(r.title)) return 'Teknik';
    }
    return null;
  };
  const rows: PlanRow[] = [];
  const skipped: string[] = [];
  raw.forEach((r, i) => {
    const department = deptAt(i);
    if (department) rows.push({ ...r, department });
    else skipped.push(r.full_name);
  });
  if (rows.length === 0) throw new Error('Dosyada personel satırı bulunamadı.');
  return { year, month, days: dayCols.length, rows, skipped };
}
