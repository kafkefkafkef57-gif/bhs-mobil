const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Örn. "11 Kas 2026 18:31" */
export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MONTHS_LONG = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const monthName = (m: number) => MONTHS_LONG[m];

/** Örn. "11 Kasım 2026 18:34" */
export function formatDateLong(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Date -> "YYYY-MM-DD" (yerel güne göre) */
export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "YYYY-MM-DD" -> yerel Date (gün başı) */
export const fromDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (day: string, n: number) => {
  const d = fromDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
};
/** Verilen anın haftasının başlangıcı (Pazartesi 00:00). */
export const weekStart = (d: Date) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
};
/** Örn. "02 Kas 2026" */
export const formatDayShort = (d: Date) => `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
/** "YYYY-MM-DD" -> "GG.AA.YYYY" */
export const formatDay = (day: string) => day.split('-').reverse().join('.');
