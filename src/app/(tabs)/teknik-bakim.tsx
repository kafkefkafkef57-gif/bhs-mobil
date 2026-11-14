import { router } from 'expo-router';
import { Package, Plus, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { KeyboardPad } from '../../lib/KeyboardPad';
import { PageHeader } from '../../lib/MenuButton';
import { C } from '../../lib/theme';
import { Equipment, lineOf } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Badge, Btn, Card, ErrorText, Field, s, Segmented } from '../../lib/ui';

/** Numara araması baştan ya da bir bölümün başından eşleşir: "101" yalnızca 101.x'leri bulur, 1101.x'leri değil. */
const matchesCode = (code: string, needle: string) => code.startsWith(needle) || code.includes(`.${needle}`);

export default function TeknikBakim() {
  const equipment = useLive(() => api.listEquipment(), ['equipment'], [] as Equipment[]);
  const counts = useLive(() => api.maintenanceCounts(), ['maintenance_records'], {} as Record<string, number>);
  const [q, setQ] = useState('');
  const [line, setLine] = useState('all');
  const [adding, setAdding] = useState(false);

  // Hat filtreleri: listedeki hat numaraları, küçükten büyüğe.
  const lines = useMemo(() => {
    const set = [...new Set(equipment.data.map((e) => e.line))].sort((a, b) => Number(a) - Number(b));
    return [{ value: 'all', label: 'Tüm Hatlar' }, ...set.map((l) => ({ value: l, label: `Hat ${l}` }))];
  }, [equipment.data]);
  const needle = q.trim().replace(/,/g, '.').toLocaleLowerCase('tr');
  const shown = equipment.data.filter((e) => (line === 'all' || e.line === line) && (!needle || matchesCode(e.code, needle) || e.location.toLocaleLowerCase('tr').includes(needle)));

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <FlatList
        data={shown}
        keyExtractor={(e) => e.id}
        numColumns={2}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={24}
        contentContainerStyle={{ padding: 18, paddingBottom: 120, gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 6 }}>
            <PageHeader title="Teknik Bakım ve Envanter" />
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Btn label="Yedek Parça Envanteri" icon={Package} onPress={() => router.push('/depo')} />
              <Btn label="Ekipman Ekle" icon={Plus} variant="primary" onPress={() => setAdding(true)} />
            </View>
            <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 }]}>
              <Search color={C.muted} size={18} />
              <TextInput value={q} onChangeText={setQ} placeholder="Ekipman numarası veya konum" placeholderTextColor="#6b6b73" accessibilityLabel="Ekipman ara" keyboardType="numbers-and-punctuation" style={{ flex: 1, color: C.text, fontSize: 16, paddingVertical: 12 }} />
            </View>
            <Segmented options={lines} value={line} onChange={setLine} />
            <Text style={s.muted}>
              {equipment.data.length} ekipman · {shown.length} gösteriliyor
            </Text>
            <ErrorText>{equipment.error ?? counts.error}</ErrorText>
            {shown.length === 0 && !equipment.error && (
              <Card>
                <Text style={s.muted}>{equipment.data.length === 0 ? 'Ekipman listesi henüz yüklenmemiş.' : 'Aramaya uyan ekipman yok.'}</Text>
              </Card>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const n = counts.data[item.id] ?? 0;
          return (
            <Pressable onPress={() => router.push({ pathname: '/ekipman/[id]', params: { id: item.id } })} accessibilityRole="button" accessibilityLabel={`Ekipman ${item.code}, ${n} bakım kaydı`} style={{ flex: 1, maxWidth: '50%' }}>
              <Card style={{ padding: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>{item.code}</Text>
                  {n > 0 ? <Badge label={`${n} bakım`} fg="#5eead4" bg="#1c3f3c" /> : <Badge label="0 bakım" fg={C.muted} bg={C.cardHi} />}
                </View>
                <Text style={[s.muted, { fontSize: 13 }]} numberOfLines={1}>
                  Hat {item.line}
                  {item.location ? ` · ${item.location}` : ''}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
      <Modal visible={adding} transparent animationType="fade" onRequestClose={() => setAdding(false)}>
        {adding && <AddEquipment onClose={() => setAdding(false)} />}
      </Modal>
    </SafeAreaView>
  );
}

function AddEquipment({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const clean = code.trim().replace(/,/g, '.');

  const submit = async () => {
    if (!/^\d+(\.\d+){1,3}$/.test(clean)) return setError('Numara "101.2.7" biçiminde olmalı (rakamlar ve nokta).');
    setBusy(true);
    setError(null);
    try {
      await api.addEquipment(clean, location.trim());
      onClose();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardPad style={{ backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
      <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 20, padding: 18, gap: 12, width: '100%', maxWidth: 420, alignSelf: 'center' }}>
        <Text style={s.h2}>Ekipman Ekle</Text>
        <Field label="Ekipman numarası" value={code} onChangeText={setCode} placeholder="Örn. 101.2.9" keyboardType="numbers-and-punctuation" autoFocus />
        {/^\d+/.test(clean) && <Text style={[s.muted, { fontSize: 13 }]}>Hat {lineOf(clean)} altında listelenecek.</Text>}
        <Field label="Konum (isteğe bağlı)" value={location} onChangeText={setLocation} />
        <ErrorText>{error}</ErrorText>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label="Vazgeç" style={{ flex: 1 }} onPress={onClose} />
          <Btn label="Ekle" variant="primary" style={{ flex: 1 }} onPress={submit} loading={busy} />
        </View>
      </View>
    </KeyboardPad>
  );
}
