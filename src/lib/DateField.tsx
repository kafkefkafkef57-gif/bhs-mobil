import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardPad } from './KeyboardPad';
import { formatDateLong, formatDay, monthName, toDay } from './format';
import { C } from './theme';
import { Btn, s } from './ui';

const DAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const clamp = (v: string, max: number) => Math.min(max, Math.max(0, parseInt(v, 10) || 0));

type Props = { label: string; value: Date; onChange: (d: Date) => void; withTime?: boolean };

/** Takvimden tarih (ve istenirse saat) seçme alanı. */
export function DateField({ label, value, onChange, withTime }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [view, setView] = useState({ y: value.getFullYear(), m: value.getMonth() });
  const [hh, setHh] = useState('');
  const [mm, setMm] = useState('');

  const show = () => {
    setDraft(value);
    setView({ y: value.getFullYear(), m: value.getMonth() });
    setHh(String(value.getHours()).padStart(2, '0'));
    setMm(String(value.getMinutes()).padStart(2, '0'));
    setOpen(true);
  };
  const move = (step: number) => {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const done = () => {
    const d = new Date(draft);
    if (withTime) d.setHours(clamp(hh, 23), clamp(mm, 59), 0, 0);
    onChange(d);
    setOpen(false);
  };

  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // haftanın ilk günü Pazartesi
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const isPicked = (day: number) => draft.getFullYear() === view.y && draft.getMonth() === view.m && draft.getDate() === day;

  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable onPress={show} accessibilityRole="button" accessibilityLabel={label} style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={{ color: C.text, fontSize: 16 }}>{withTime ? formatDateLong(value.toISOString()) : formatDay(toDay(value))}</Text>
        <CalendarDays color={C.muted} size={18} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <KeyboardPad style={st.backdrop}>
          <View style={st.box}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable onPress={() => move(-1)} accessibilityLabel="Önceki ay" style={st.nav}>
                <ChevronLeft color={C.text} size={22} />
              </Pressable>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>
                {monthName(view.m)} {view.y}
              </Text>
              <Pressable onPress={() => move(1)} accessibilityLabel="Sonraki ay" style={st.nav}>
                <ChevronRight color={C.text} size={22} />
              </Pressable>
            </View>
            <View style={st.grid}>
              {DAYS.map((d) => (
                <Text key={d} style={[st.cell, { color: C.muted, fontSize: 13, lineHeight: 40 }]}>
                  {d}
                </Text>
              ))}
              {cells.map((day, i) =>
                day === null ? (
                  <View key={`b${i}`} style={st.cell} />
                ) : (
                  <Pressable key={day} onPress={() => setDraft(new Date(view.y, view.m, day))} accessibilityLabel={`${day} ${monthName(view.m)}`} style={st.cell}>
                    <View style={[st.day, isPicked(day) && { backgroundColor: C.seg }]}>
                      <Text style={{ color: C.text, fontSize: 15, fontWeight: isPicked(day) ? '800' : '400' }}>{day}</Text>
                    </View>
                  </Pressable>
                ),
              )}
            </View>
            {withTime && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={s.label}>Saat</Text>
                <TextInput value={hh} onChangeText={setHh} keyboardType="number-pad" maxLength={2} accessibilityLabel="Saat" style={[s.input, st.time]} />
                <Text style={{ color: C.text, fontSize: 18 }}>:</Text>
                <TextInput value={mm} onChangeText={setMm} keyboardType="number-pad" maxLength={2} accessibilityLabel="Dakika" style={[s.input, st.time]} />
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label="Vazgeç" onPress={() => setOpen(false)} style={{ flex: 1 }} />
              <Btn label="Tamam" variant="primary" onPress={done} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardPad>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 16, gap: 14, maxWidth: 420, width: '100%', alignSelf: 'center' },
  nav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  time: { width: 64, textAlign: 'center' },
});
