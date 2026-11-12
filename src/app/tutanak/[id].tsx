import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { Image, ScrollView, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { formatDateLong } from '../../lib/format';
import { C } from '../../lib/theme';
import { Report } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Badge, Btn, Card, ErrorText, s } from '../../lib/ui';

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ color: C.text, fontSize: big ? 22 : 17, fontWeight: '700' }}>{value || '—'}</Text>
    </View>
  );
}

export default function TutanakDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: r, error } = useLive(() => api.getReport(id), ['reports'], null as Report | null);
  if (!r) {
    return (
      <View style={[s.screen, s.content]}>
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Stack.Screen options={{ title: `Tutanak #${r.no}` }} />
      <Text style={s.h1}>Olay tutanağı · {r.staff_name}</Text>
      <Btn label="Tutanağı düzenle" icon={Pencil} variant="primary" onPress={() => router.push({ pathname: '/tutanak/duzenle', params: { id: r.id } })} style={{ alignSelf: 'flex-start' }} />

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Row label="Tutanak numarası" value={`#${r.no}`} big />
          {!!r.company && <Badge label={r.company} fg="#34d399" bg="#1d4238" />}
        </View>
        <Row label="Olay tarihi ve saati" value={formatDateLong(r.incident_at)} />
        <Row label="Tutanağı tutan yetkili" value={r.officer} />
        <Row label="Kaza yapan personel" value={r.staff_name} />
        <Row label="Personelin firması" value={r.company} />
      </Card>

      <Text style={s.h2}>Olay Özeti / Kaza Nasıl Oldu?</Text>
      <Card>
        <Text style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>{r.summary || '—'}</Text>
      </Card>

      <Text style={s.h2}>Olay Yeri Görseli / Fotoğrafı</Text>
      {r.photo_urls.length === 0 ? (
        <Card>
          <Text style={s.muted}>Fotoğraf eklenmemiş.</Text>
        </Card>
      ) : (
        r.photo_urls.map((u) => <Image key={u} source={{ uri: u }} style={{ width: '100%', height: 240, borderRadius: 14 }} resizeMode="cover" accessibilityLabel="Olay yeri fotoğrafı" />)
      )}
    </ScrollView>
  );
}
