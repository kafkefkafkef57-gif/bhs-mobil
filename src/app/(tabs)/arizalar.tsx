import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { FaultRow } from '../../lib/faults';
import { formatDayShort, weekStart } from '../../lib/format';
import { PageHeader } from '../../lib/MenuButton';
import { C } from '../../lib/theme';
import { Fault, Line, LINE_NAME } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Btn, Card, ErrorText, s, Segmented } from '../../lib/ui';

type Tab = 'bugun' | 'hafta' | 'arsiv';
const TABS: { value: Tab; label: string }[] = [
  { value: 'bugun', label: 'Bugün' },
  { value: 'hafta', label: 'Bu Hafta' },
  { value: 'arsiv', label: 'Haftalık Arşiv' },
];
const LINES: { value: Line | 'all'; label: string }[] = [
  { value: 'all', label: 'Tüm hatlar' },
  { value: 'dogu', label: LINE_NAME.dogu },
  { value: 'bati', label: LINE_NAME.bati },
];
const ARCHIVE_WEEKS = 12;
const norm = (t: string) => t.toLocaleLowerCase('tr');

export default function Arizalar() {
  const [tab, setTab] = useState<Tab>('bugun');
  const [line, setLine] = useState<Line | 'all'>('all');
  const [q, setQ] = useState('');
  const [openWeek, setOpenWeek] = useState<number | null>(null);

  // Arşiv dahil son haftaların tüm arızaları tek seferde alınır, sekmeler bunu süzer.
  const faults = useLive(
    () => {
      const from = weekStart(new Date());
      from.setDate(from.getDate() - 7 * ARCHIVE_WEEKS);
      return api.listFaults(from);
    },
    ['faults'],
    [] as Fault[],
  );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const thisWeek = weekStart(now).getTime();
  const match = (f: Fault) => (line === 'all' || f.line === line) && (!q.trim() || norm(`${f.zone_name} ${f.description} ${f.company} ${f.author_name ?? ''} ${f.shift} vardiyası`).includes(norm(q.trim())));
  const filtered = faults.data.filter(match);
  const list = filtered.filter((f) => new Date(f.created_at).getTime() >= (tab === 'bugun' ? today : thisWeek));

  // Tamamlanan haftalar: hafta başlangıcına göre gruplanır.
  const weeks = useMemo(() => {
    const map = new Map<number, Fault[]>();
    for (const f of filtered) {
      const w = weekStart(new Date(f.created_at)).getTime();
      if (w < thisWeek) map.set(w, [...(map.get(w) ?? []), f]);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faults.data, line, q, thisWeek]);

  const open = (f: Fault) => router.push({ pathname: '/ariza/[id]', params: { id: f.id } });

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]} keyboardShouldPersistTaps="handled">
        <PageHeader title="🚨 Arıza Kayıtları" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label="Doğu Hattı" icon={Plus} variant="primary" style={{ flex: 1 }} onPress={() => router.push('/ariza-hat/dogu')} />
          <Btn label="Batı Hattı" icon={Plus} variant="primary" style={{ flex: 1 }} onPress={() => router.push('/ariza-hat/bati')} />
        </View>
        <Segmented options={TABS} value={tab} onChange={setTab} />
        <Text style={s.muted}>
          {tab === 'bugun' ? 'Yalnızca bugün kaydedilen arızalar listelenir.' : tab === 'hafta' ? 'Bu hafta (Pazartesi–Pazar) kaydedilen arızalar, yeniden eskiye.' : 'Tamamlanan haftaların arızaları; hafta bitince buraya taşınır.'}
        </Text>
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 }]}>
          <Search color={C.muted} size={18} />
          <TextInput value={q} onChangeText={setQ} placeholder="Bölge, açıklama, firma, personel veya vardiya" placeholderTextColor="#6b6b73" accessibilityLabel="Arıza ara" style={{ flex: 1, color: C.text, fontSize: 16, paddingVertical: 12 }} />
        </View>
        <Segmented options={LINES} value={line} onChange={setLine} />
        <ErrorText>{faults.error}</ErrorText>

        {tab !== 'arsiv' && (
          <>
            <Text style={s.h2}>
              {tab === 'bugun' ? 'Bugün' : 'Bu hafta'} · {list.length} arıza
            </Text>
            {list.length === 0 && !faults.error && (
              <Card style={{ alignItems: 'center', gap: 4, paddingVertical: 28 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{tab === 'bugun' ? 'Bugün arıza kaydı yok' : 'Bu hafta arıza kaydı yok'}</Text>
                <Text style={[s.muted, { textAlign: 'center' }]}>Arıza bildirmek için yukarıdan hattı seçin.</Text>
              </Card>
            )}
            {list.map((f) => (
              <Pressable key={f.id} onPress={() => open(f)} accessibilityRole="button">
                <Card>
                  <FaultRow fault={f} />
                </Card>
              </Pressable>
            ))}
          </>
        )}

        {tab === 'arsiv' && (
          <>
            {weeks.length === 0 && !faults.error && (
              <Card>
                <Text style={s.muted}>Arşivde tamamlanmış hafta yok.</Text>
              </Card>
            )}
            {weeks.map(([start, items]) => {
              const end = new Date(start);
              end.setDate(end.getDate() + 6);
              const isOpen = openWeek === start;
              const zones = [...items.reduce((m, f) => m.set(f.zone_name, (m.get(f.zone_name) ?? 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);
              return (
                <Card key={start} style={{ gap: 12 }}>
                  <Pressable onPress={() => setOpenWeek(isOpen ? null : start)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>
                        {formatDayShort(new Date(start))} – {formatDayShort(end)}
                      </Text>
                      <Text style={s.muted}>{zones.length} bölge</Text>
                    </View>
                    <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>{items.length} arıza</Text>
                    {isOpen ? <ChevronUp color={C.muted} size={20} /> : <ChevronDown color={C.muted} size={20} />}
                  </Pressable>
                  {isOpen && (
                    <>
                      <View style={{ gap: 6 }}>
                        {zones.map(([name, n]) => (
                          <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: C.text, fontSize: 15 }}>{name}</Text>
                            <Text style={{ color: C.text, fontSize: 15, fontWeight: '800' }}>{n}</Text>
                          </View>
                        ))}
                      </View>
                      {items.map((f) => (
                        <Pressable key={f.id} onPress={() => open(f)} accessibilityRole="button" style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
                          <FaultRow fault={f} />
                        </Pressable>
                      ))}
                    </>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
