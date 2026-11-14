import { Stack, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { monthName, toDay } from '../../lib/format';
import { parseShift, shiftLabel, ShiftKind } from '../../lib/shift';
import { C } from '../../lib/theme';
import { Staff, StaffShift } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Card, ErrorText, s } from '../../lib/ui';

const DAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const KIND: Record<ShiftKind, { label: string; fg: string; bg: string }> = {
  gunduz: { label: 'Gündüz', fg: C.amber, bg: C.amberBg },
  gece: { label: 'Gece', fg: C.blue, bg: '#2f3350' },
  tatil: { label: 'Tatil (T)', fg: C.muted, bg: C.cardHi },
  izin: { label: 'İzin (Yİ, DGİ)', fg: C.red, bg: C.redBg },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{value || '—'}</Text>
    </View>
  );
}

export default function PersonelDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const staff = useLive(() => api.listStaff(), [], [] as Staff[]);
  const person = staff.data.find((x) => x.id === id);
  const today = toDay(new Date());
  const [view, setView] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [error, setError] = useState<string | null>(null);

  const count = new Date(view.y, view.m + 1, 0).getDate();
  const from = toDay(new Date(view.y, view.m, 1));
  const to = toDay(new Date(view.y, view.m, count));
  useEffect(() => {
    let alive = true;
    api
      .listShifts(from, to, id)
      .then((r) => alive && (setShifts(r), setError(null)))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [from, to, id]);

  const move = (step: number) => {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const byDay = new Map(shifts.map((x) => [x.day, x.value]));
  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => toDay(new Date(view.y, view.m, i + 1)))];
  const totals = { gunduz: 0, gece: 0, tatil: 0, izin: 0 } as Record<ShiftKind, number>;
  shifts.forEach((x) => totals[parseShift(x.value, x.day).kind]++);
  const todayValue = byDay.get(today);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
      <Stack.Screen options={{ title: person?.full_name ?? 'Personel' }} />
      <ErrorText>{staff.error ?? error}</ErrorText>
      {person && (
        <>
          <Text style={s.h1}>{person.full_name}</Text>
          <Card style={{ gap: 14 }}>
            <Text style={s.h2}>Personel bilgileri</Text>
            <Row label="Sicil numarası" value={person.sicil} />
            <Row label="Unvan" value={person.title} />
            <Row label="Departman" value={person.department} />
            {!!todayValue && <Row label="Bugün" value={shiftLabel(todayValue)} />}
          </Card>
        </>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="Önceki ay" style={st.nav}>
          <ChevronLeft color={C.text} size={22} />
        </Pressable>
        <Text style={s.h2}>
          {monthName(view.m)} {view.y}
        </Text>
        <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel="Sonraki ay" style={st.nav}>
          <ChevronRight color={C.text} size={22} />
        </Pressable>
      </View>

      <Card style={{ padding: 8 }}>
        <View style={st.grid}>
          {DAYS.map((d) => (
            <Text key={d} style={st.head}>
              {d}
            </Text>
          ))}
          {cells.map((day, i) => {
            if (!day) return <View key={`b${i}`} style={st.cell} />;
            const value = byDay.get(day);
            const k = value ? KIND[parseShift(value, day).kind] : null;
            const [a, b] = value?.includes('-') ? value.split('-') : [value ?? '', ''];
            return (
              <View key={day} style={st.cell} accessibilityLabel={`${Number(day.slice(8))} ${monthName(view.m)}: ${value ? shiftLabel(value) : 'plan yok'}`}>
                <View style={[st.inner, k && { backgroundColor: k.bg }, day === today && { borderColor: C.text, borderWidth: 2 }]}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '800' }}>{Number(day.slice(8))}</Text>
                  <Text style={{ color: k?.fg ?? C.muted, fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                    {a || '–'}
                  </Text>
                  <Text style={{ color: k?.fg ?? C.muted, fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                    {b}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </Card>
      {shifts.length === 0 && !error && <Text style={s.muted}>Bu ay için çalışma planı yüklenmemiş.</Text>}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(KIND) as ShiftKind[]).map((k) => (
          <View key={k} style={[st.legend, { backgroundColor: KIND[k].bg }]}>
            <Text style={{ color: KIND[k].fg, fontWeight: '700', fontSize: 13 }}>
              {KIND[k].label}: {totals[k]} gün
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  nav: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  head: { width: `${100 / 7}%`, textAlign: 'center', color: C.muted, fontSize: 13, paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, padding: 2 },
  inner: { height: 58, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  legend: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
