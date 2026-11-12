import { Info, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Flight, sampleFlights } from '../lib/sampleFlights';
import { C } from '../lib/theme';
import { Badge, Card, s, Segmented } from '../lib/ui';

type Dir = 'all' | Flight['direction'];
type Line = 'all' | Flight['line'];
const DIRS: { value: Dir; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'gelen', label: 'Gelen' },
  { value: 'giden', label: 'Giden' },
];
const LINES: { value: Line; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'ic', label: 'İç Hat' },
  { value: 'dis', label: 'Dış Hat' },
];
const STATUS: Record<Flight['status'], { fg: string; bg: string }> = {
  Planlandı: { fg: '#7fb0ff', bg: '#22335a' },
  'Bagaj Veriliyor': { fg: C.green, bg: C.greenBg },
  Yükleniyor: { fg: C.amber, bg: C.amberBg },
  Tamamlandı: { fg: C.muted, bg: C.cardHi },
};
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const norm = (t: string) => t.toLocaleLowerCase('tr');

export default function UcusTrafigi() {
  const flights = useMemo(() => sampleFlights(), []);
  const [q, setQ] = useState('');
  const [dir, setDir] = useState<Dir>('all');
  const [line, setLine] = useState<Line>('all');
  const shown = flights.filter(
    (f) => (dir === 'all' || f.direction === dir) && (line === 'all' || f.line === line) && (!q.trim() || norm(`${f.code} ${f.airline} ${f.city}`).includes(norm(q.trim()))),
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={s.muted}>Genel Bakış</Text>
        <Text style={s.h1}>Uçuş Trafiği</Text>
      </View>
      <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center', borderColor: C.amber, padding: 12 }}>
        <Info color={C.amber} size={18} />
        <Text style={[s.muted, { flex: 1, fontSize: 13 }]}>Bu uçuşlar örnektir. Gerçek uçuş bilgi ekranı bağlantısı kurulduğunda canlı veriler burada görünecek.</Text>
      </Card>

      <View style={{ gap: 6 }}>
        <Text style={s.label}>Uçuş ara</Text>
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 }]}>
          <Search color={C.muted} size={18} />
          <TextInput value={q} onChangeText={setQ} placeholder="Uçuş kodu, havayolu veya şehir" placeholderTextColor="#6b6b73" accessibilityLabel="Uçuş ara" style={{ flex: 1, color: C.text, fontSize: 16, paddingVertical: 12 }} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Yön</Text>
        <Segmented options={DIRS} value={dir} onChange={setDir} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={s.label}>Hat türü</Text>
        <Segmented options={LINES} value={line} onChange={setLine} />
      </View>

      {shown.length === 0 && (
        <Card>
          <Text style={s.muted}>Aramaya uyan uçuş yok.</Text>
        </Card>
      )}
      {shown.map((f) => (
        <Card key={f.id} style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>
                {f.airline} · {f.code}
              </Text>
              <Text style={s.muted} numberOfLines={1}>
                {f.city} · {f.direction === 'gelen' ? 'Gelen' : 'Giden'} · {f.line === 'ic' ? 'İç Hat' : 'Dış Hat'}
              </Text>
            </View>
            <Badge label={f.status} {...STATUS[f.status]} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Text style={[s.muted, { fontSize: 13 }]}>Saat</Text>
              <Text style={{ color: C.text, fontSize: 19, fontWeight: '800' }}>{hhmm(f.time)}</Text>
            </View>
            <View style={{ flex: 1.4 }}>
              <Text style={[s.muted, { fontSize: 13 }]}>{f.direction === 'gelen' ? 'Bagaj bandı' : 'Şut'}</Text>
              <Text style={{ color: f.belt ? C.text : C.muted, fontSize: 19, fontWeight: '800' }}>{f.belt ?? 'Bekleniyor'}</Text>
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
