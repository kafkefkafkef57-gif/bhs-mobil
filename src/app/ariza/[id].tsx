import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { formatDateLong } from '../../lib/format';
import { C } from '../../lib/theme';
import { Fault, LINE_NAME } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Card, ErrorText, s } from '../../lib/ui';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{value || '—'}</Text>
    </View>
  );
}

export default function ArizaDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: f, error } = useLive(() => api.getFault(id), [], null as Fault | null);
  if (!f) {
    return (
      <View style={[s.screen, s.content]}>
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
      <Text style={s.h1}>{f.zone_name} arızası</Text>
      <Card style={{ gap: 14 }}>
        <Row label="Hat" value={LINE_NAME[f.line]} />
        <Row label="Bölge" value={f.zone_name} />
        <Row label="Arızaya sebep olan bagajın firması" value={f.company} />
        <Row label="Kayıt tarihi" value={formatDateLong(f.created_at)} />
        <Row label="Bildiren" value={f.author_name ?? ''} />
        <Row label="Vardiya / Ekip" value={`${f.shift} Vardiyası · ${f.team}`} />
      </Card>
      <Text style={s.h2}>Açıklama</Text>
      <Card>
        <Text style={{ color: f.description ? C.text : C.muted, fontSize: 16, lineHeight: 23 }}>{f.description || 'Açıklama yazılmamış.'}</Text>
      </Card>
      {!!f.photo_url && (
        <>
          <Text style={s.h2}>Görsel</Text>
          <Image source={{ uri: f.photo_url }} style={{ width: '100%', height: 260, borderRadius: 14 }} resizeMode="cover" accessibilityLabel="Arıza görseli" />
        </>
      )}
    </ScrollView>
  );
}
