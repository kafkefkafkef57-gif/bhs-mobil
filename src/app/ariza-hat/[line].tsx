import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { zoneTone } from '../../lib/faults';
import { LineSchema } from '../../lib/LineSchema';
import { formatDate, weekStart } from '../../lib/format';
import { C } from '../../lib/theme';
import { Fault, FaultZone, Line, LINE_NAME } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Btn, Card, confirm, ErrorText, Field, s } from '../../lib/ui';

/** Hat şeması ve bölge seçimi: bölgeye dokununca arıza bildirim formu açılır. */
export default function ArizaHat() {
  const { line } = useLocalSearchParams<{ line: Line }>();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const zones = useLive(() => api.listZones(line), ['fault_zones'], [] as FaultZone[]);
  // Bölge renkleri ve sayaçları bu haftanın arızalarına göre; yeni hafta başlayınca kendiliğinden sıfırlanır.
  const faults = useLive(() => api.listFaults(weekStart(new Date())), ['faults'], [] as Fault[]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stats = (z: FaultZone) => {
    const mine = faults.data.filter((f) => f.zone_id === z.id);
    return { count: mine.length, last: mine[0]?.created_at };
  };
  const add = async () => {
    if (!name.trim()) return setError('Bölge adını girin.');
    try {
      await api.addZone(line, name.trim());
      setName('');
      setError(null);
      setAdding(false);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
      <Stack.Screen options={{ title: LINE_NAME[line] }} />
      <Text style={s.h1}>{LINE_NAME[line]} Arıza Bildirimi</Text>

      <Text style={s.h2}>Hat şeması</Text>
      <LineSchema line={line} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={s.h2}>Bölge seçin</Text>
        <Text style={s.muted}>{zones.data.length} bölge</Text>
      </View>
      <Text style={s.muted}>Arıza bildirmek için ilgili bölgeye dokunun. Renk bu haftaki arıza sayısını gösterir: 0–10 yeşil, 11–19 turuncu, 20 ve üstü kırmızı.</Text>
      <ErrorText>{zones.error ?? faults.error}</ErrorText>

      {zones.data.map((z) => {
        const { count, last } = stats(z);
        const tone = zoneTone(count);
        return (
          <View key={z.id} style={[st.zone, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <Pressable
              onPress={() => router.push({ pathname: '/ariza-yeni', params: { line, zoneId: z.id, zoneName: z.name } })}
              accessibilityRole="button"
              accessibilityLabel={`${z.name}, bu hafta ${count} arıza. Arıza bildir`}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: tone.fg, fontSize: 18, fontWeight: '800' }}>{z.name}</Text>
                <Text style={s.muted}>{last ? `Son arıza: ${formatDate(last)}` : 'Bu hafta arıza yok'}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: tone.fg, fontSize: 26, fontWeight: '800' }}>{count}</Text>
                <Text style={{ color: tone.fg, fontSize: 12 }}>arıza</Text>
              </View>
            </Pressable>
            {isAdmin && (
              <Pressable
                onPress={() => confirm('Bölge silinsin mi?', `"${z.name}" listeden kaldırılacak. Bu bölgenin eski arıza kayıtları arşivde kalır.`, () => api.deleteZone(z.id).catch((e) => setError(e.message)))}
                accessibilityRole="button"
                accessibilityLabel={`${z.name} bölgesini sil`}
                style={{ width: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 color={C.muted} size={18} />
              </Pressable>
            )}
          </View>
        );
      })}
      {zones.data.length === 0 && !zones.error && (
        <Card>
          <Text style={s.muted}>Bu hat için henüz bölge eklenmemiş.</Text>
        </Card>
      )}
      <Btn label="Bölge ekle" icon={Plus} onPress={() => setAdding(true)} />

      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        <View style={st.backdrop}>
          <View style={st.box}>
            <Text style={s.h2}>{LINE_NAME[line]} · Yeni bölge</Text>
            <Field label="Bölge adı" value={name} onChangeText={setName} placeholder={line === 'dogu' ? 'Örn. Doğu 4 Vertisorter' : 'Örn. Batı 4 Vertisorter'} autoFocus />
            <ErrorText>{error}</ErrorText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label="Vazgeç" style={{ flex: 1 }} onPress={() => (setAdding(false), setError(null))} />
              <Btn label="Ekle" variant="primary" style={{ flex: 1 }} onPress={add} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  zone: { flexDirection: 'row', borderRadius: 16, borderWidth: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' },
});
