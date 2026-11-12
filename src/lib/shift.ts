import { addDays, fromDay } from './format';

export type ShiftKind = 'gunduz' | 'gece' | 'tatil' | 'izin';
export type ParsedShift = { kind: ShiftKind; start?: Date; end?: Date };

/** "08:30-20:30" gibi bir plan değerini o güne göre başlangıç/bitişe çevirir; bitiş başlangıçtan küçükse ertesi güne taşar. */
export function parseShift(value: string, day: string): ParsedShift {
  const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return { kind: value.trim().toUpperCase() === 'T' ? 'tatil' : 'izin' };
  const [sh, sm, eh, em] = m.slice(1).map(Number);
  const start = fromDay(day);
  start.setHours(sh, sm, 0, 0);
  const overnight = eh * 60 + em <= sh * 60 + sm;
  const end = fromDay(overnight ? addDays(day, 1) : day);
  end.setHours(eh, em, 0, 0);
  return { kind: sh < 12 ? 'gunduz' : 'gece', start, end };
}

/** Plan kodlarının açıklaması. */
const CODES: Record<string, string> = { T: 'Tatil', Yİ: 'Yıllık izin', DGİ: 'Doğum günü izni' };
/** "Yİ" -> "Yıllık izin"; saat aralığı ya da bilinmeyen kod olduğu gibi döner. */
export const shiftLabel = (value: string) => CODES[value.trim().toLocaleUpperCase('tr')] ?? value;

export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toLocaleUpperCase('tr');
};
