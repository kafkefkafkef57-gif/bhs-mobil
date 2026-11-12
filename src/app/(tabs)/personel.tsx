import { router } from 'expo-router';
import { MapPin, Users, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { DateField } from '../../lib/DateField';
import { addDays, fromDay, toDay } from '../../lib/format';
import { PageHeader } from '../../lib/MenuButton';
import { initials, parseShift } from '../../lib/shift';
import { C } from '../../lib/theme';
import { Department, Location, LOCATIONS, Staff, StaffAssignment, StaffShift } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Badge, Btn, Card, ErrorText, s, Segmented } from '../../lib/ui';

type LocFilter = 'all' | Location | 'none';
type TeamFilter = 'all' | Department;
type Row = { staff: Staff; value: string; active: boolean; carried: boolean; location?: Location };

const LOC_OPTIONS: { value: LocFilter; label: string }[] = [
  { value: 'all', label: 'Tüm Alanlar' },
  ...LOCATIONS.map((l) => ({ value: l as LocFilter, label: l })),
  { value: 'none', label: 'Atanmadı' },
];
const TEAM_OPTIONS: { value: TeamFilter; label: string }[] = [
  { value: 'all', label: 'Tüm Ekipler' },
  { value: 'Teknik', label: 'Teknik' },
  { value: 'Operasyon', label: 'Operasyon' },
];
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export default function Personel() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [date, setDate] = useState(() => new Date());
  const [loc, setLoc] = useState<LocFilter>('all');
  const [team, setTeam] = useState<TeamFilter>('all');
  const [assigning, setAssigning] = useState<Row | null>(null);
  const day = toDay(date);

  // "Şu an görevde" bilgisinin güncel kalması için dakikada bir yenile.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const isToday = day === toDay(now);

  const staff = useLive(() => api.listStaff(), [], [] as Staff[]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    api
      .listShifts(addDays(day, -1), day) // önceki günün gece vardiyası sabaha kadar sürer
      .then((r) => alive && (setShifts(r), setLoadError(null)))
      .catch((e) => alive && setLoadError(e.message));
    return () => {
      alive = false;
    };
  }, [day]);
  const assignments = useLive(() => api.listAssignments(day), ['staff_assignments'], [] as StaffAssignment[]);
  useEffect(() => {
    assignments.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const rows = useMemo(() => {
    const locOf = new Map(assignments.data.map((a) => [a.staff_id, a.location]));
    const out: Row[] = [];
    for (const st of staff.data) {
      const own = shifts.find((x) => x.staff_id === st.id && x.day === day);
      const prev = shifts.find((x) => x.staff_id === st.id && x.day === addDays(day, -1));
      const p = own ? parseShift(own.value, day) : null;
      if (own && p?.start && p.end) {
        out.push({ staff: st, value: own.value, active: isToday && now >= p.start && now < p.end, carried: false, location: locOf.get(st.id) });
      } else if (isToday && prev) {
        // Dün akşam başlayan ve hâlâ süren gece vardiyası
        const pp = parseShift(prev.value, addDays(day, -1));
        if (pp.end && pp.start && pp.end > fromDay(day) && now < pp.end) out.push({ staff: st, value: prev.value, active: true, carried: true, location: locOf.get(st.id) });
      }
    }
    return out.sort((a, b) => Number(b.active) - Number(a.active) || a.value.localeCompare(b.value) || a.staff.sort_no - b.staff.sort_no);
  }, [staff.data, shifts, assignments.data, day, isToday, now]);

  const shown = rows.filter((r) => (team === 'all' || r.staff.department === team) && (loc === 'all' || (loc === 'none' ? !r.location : r.location === loc)));
  const activeCount = rows.filter((r) => r.active).length;
  const error = staff.error ?? loadError ?? assignments.error;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]}>
        <PageHeader title="Personel Lokasyon Takibi" />
        <DateField label="Görev tarihi" value={date} onChange={setDate} />
        <ErrorText>{error}</ErrorText>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.muted}>{isToday ? 'Bugün çalışan' : 'Çalışan'}</Text>
              <Users color={C.muted} size={18} />
            </View>
            <Text style={st.stat}>{rows.length}</Text>
            <Text style={[s.muted, { fontSize: 13 }]}>Gündüz + gece</Text>
          </Card>
          {isToday && (
            <Card style={{ flex: 1, gap: 4, borderColor: C.green }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.muted}>Şu an görevde</Text>
                <MapPin color={C.green} size={18} />
              </View>
              <Text style={st.stat}>{activeCount}</Text>
              <Text style={[s.muted, { fontSize: 13 }]}>Saat {hhmm(now)} itibarıyla</Text>
            </Card>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.h2}>Görev yeri</Text>
          <Segmented options={LOC_OPTIONS} value={loc} onChange={setLoc} />
        </View>
        <View style={{ gap: 8 }}>
          <Text style={s.h2}>Ekip türü</Text>
          <Segmented options={TEAM_OPTIONS} value={team} onChange={setTeam} />
        </View>
        {!isAdmin && <Text style={[s.muted, { fontSize: 13 }]}>Görev yeri atamasını yönetici yapar.</Text>}

        {shown.length === 0 && !error && (
          <Card>
            <Text style={s.muted}>{staff.data.length === 0 ? 'Personel listesi henüz yüklenmemiş.' : 'Bu tarih ve filtrelere uyan çalışan personel yok.'}</Text>
          </Card>
        )}
        {shown.map((r) => (
          <Card key={r.staff.id} style={[{ gap: 12 }, r.active && { backgroundColor: '#14301f', borderColor: C.green }]}>
            {/* Üst kısma dokununca personelin detayı ve aylık planı açılır. */}
            <Pressable onPress={() => router.push({ pathname: '/personel/[id]', params: { id: r.staff.id } })} accessibilityRole="button" accessibilityLabel={`${r.staff.full_name} detayı`} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[st.avatar, r.active && { backgroundColor: '#1f4a30' }]}>
                  <Text style={{ color: r.staff.department === 'Teknik' ? C.blue : C.amber, fontWeight: '800', fontSize: 15 }}>{initials(r.staff.full_name)}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>
                    {r.staff.full_name}
                  </Text>
                  <Text style={s.muted} numberOfLines={1}>
                    {r.staff.title} · Sicil {r.staff.sicil}
                  </Text>
                </View>
                {r.active ? <Badge label="Görevde" fg={C.green} bg={C.greenBg} /> : <Badge label="Vardiya dışı" fg={C.muted} bg={C.cardHi} />}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {r.staff.department === 'Teknik' ? <Badge label="Teknik" fg={C.blue} bg="#2f3350" /> : <Badge label="Operasyon" fg={C.amber} bg={C.amberBg} />}
                <Text style={s.muted}>
                  Vardiya {r.value}
                  {r.carried ? ' (dünden)' : ''}
                </Text>
              </View>
            </Pressable>
            <View style={[st.locRow, r.active && { borderTopColor: '#24553a' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.muted, { fontSize: 13 }]}>Görev yeri</Text>
                <Text style={{ color: r.location ? C.text : C.muted, fontSize: 18, fontWeight: '800' }}>{r.location ?? 'Atanmadı'}</Text>
              </View>
              {isAdmin && <Btn label={r.location ? 'Değiştir' : 'Görev ata'} onPress={() => setAssigning(r)} />}
            </View>
          </Card>
        ))}
      </ScrollView>

      <Modal visible={!!assigning} transparent animationType="fade" onRequestClose={() => setAssigning(null)}>
        <View style={st.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAssigning(null)} accessibilityLabel="Kapat" />
          <View style={st.box}>
            <Text style={s.h2}>{assigning?.staff.full_name}</Text>
            <Text style={s.muted}>Görev yerini seçin</Text>
            {LOCATIONS.map((l) => (
              <Btn
                key={l}
                label={l}
                icon={MapPin}
                variant={assigning?.location === l ? 'primary' : 'default'}
                onPress={() => {
                  api.setAssignment(assigning!.staff.id, day, l).catch(() => {});
                  setAssigning(null);
                }}
              />
            ))}
            {assigning?.location && (
              <Btn
                label="Atamayı kaldır"
                icon={X}
                variant="danger"
                onPress={() => {
                  api.setAssignment(assigning.staff.id, day, null).catch(() => {});
                  setAssigning(null);
                }}
              />
            )}
            <Btn label="Vazgeç" onPress={() => setAssigning(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  stat: { color: C.text, fontSize: 30, fontWeight: '800' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
});
