import { Stack, useLocalSearchParams } from 'expo-router';
import { Pencil, Search, Wrench, X } from 'lucide-react-native';
import { ReactNode, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDateLong } from '../../lib/format';
import { KeyboardPad } from '../../lib/KeyboardPad';
import { C } from '../../lib/theme';
import { Equipment, InventoryItem, MaintenanceRecord } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Badge, Btn, Card, ErrorText, Field, s } from '../../lib/ui';

const fmt = (n: number) => String(n).replace('.', ',');
const parseNum = (t: string) => Number(t.trim().replace(',', '.'));

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

/** Bir ekipmanın bilgileri ve bakım / onarım geçmişi. */
export default function EkipmanDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const equipment = useLive(() => api.listEquipment(), ['equipment'], [] as Equipment[]);
  const history = useLive(() => api.listMaintenance(id), ['maintenance_records'], [] as MaintenanceRecord[]);
  const [sheet, setSheet] = useState<'bakim' | 'duzenle' | null>(null);
  const eq = equipment.data.find((e) => e.id === id);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
      <Stack.Screen options={{ title: eq?.code ?? 'Ekipman' }} />
      <ErrorText>{equipment.error ?? history.error}</ErrorText>
      {eq && (
        <>
          <View>
            <Text style={s.muted}>Teknik Bakım ve Envanter</Text>
            <Text style={s.h1}>{eq.code}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Btn label="Ekipmanı Düzenle" icon={Pencil} onPress={() => setSheet('duzenle')} />
            <Btn label="Bakım Kaydı Ekle" icon={Wrench} variant="primary" onPress={() => setSheet('bakim')} />
          </View>
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.h2}>Ekipman bilgileri</Text>
              <Badge label={`${history.data.length} bakım kaydı`} fg={history.data.length ? '#5eead4' : C.muted} bg={history.data.length ? '#1c3f3c' : C.cardHi} />
            </View>
            <Text style={s.muted}>
              Hat {eq.line} · {eq.kind}
            </Text>
            <Row label="Konum" value={eq.location || 'Belirtilmedi'} />
            <Row label="Son bakım" value={history.data[0] ? formatDateLong(history.data[0].created_at) : 'Henüz bakım kaydı yok'} />
          </Card>

          <View>
            <Text style={s.h2}>Bakım ve onarım geçmişi</Text>
            <Text style={s.muted}>{history.data.length} kayıt · en yeniden eskiye</Text>
          </View>
          {history.data.length === 0 && !history.error && (
            <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 28 }}>
              <Wrench color={C.muted} size={28} />
              <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>Bakım geçmişi henüz yok</Text>
              <Text style={[s.muted, { textAlign: 'center' }]}>İlk bakım veya onarım kaydını ekleyerek bu ekipmanın geçmişini oluşturun.</Text>
            </Card>
          )}
          {history.data.map((r) => (
            <Card key={r.id} style={{ gap: 8 }}>
              <Text style={[s.muted, { fontSize: 13 }]}>
                {formatDateLong(r.created_at)} · {r.technician || '—'}
              </Text>
              <Text style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>{r.work}</Text>
              {!!r.item_name && <Badge label={`Kullanılan parça: ${r.item_name} · ${fmt(r.quantity_used)} ${r.unit}`} fg={C.amber} bg={C.amberBg} />}
              {!!r.note && <Text style={s.muted}>Not: {r.note}</Text>}
            </Card>
          ))}

          <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
            {sheet === 'bakim' && <MaintenanceForm eq={eq} onClose={() => setSheet(null)} />}
            {sheet === 'duzenle' && <EditForm eq={eq} onClose={() => setSheet(null)} />}
          </Modal>
        </>
      )}
    </ScrollView>
  );
}

function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <KeyboardPad style={st.backdrop}>
      <SafeAreaView edges={['bottom']} style={st.sheet}>
        <View style={st.handle} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={s.h2}>{title}</Text>
          {!!subtitle && <Text style={[s.muted, { textAlign: 'center', fontSize: 13 }]}>{subtitle}</Text>}
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} style={{ position: 'absolute', right: 0, top: 0 }}>
            <X color={C.muted} size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </SafeAreaView>
    </KeyboardPad>
  );
}

function MaintenanceForm({ eq, onClose }: { eq: Equipment; onClose: () => void }) {
  const { profile } = useAuth();
  const inventory = useLive(() => api.listInventory(), [], [] as InventoryItem[]);
  const [technician, setTechnician] = useState(profile?.full_name ?? '');
  const [work, setWork] = useState('');
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [partQuery, setPartQuery] = useState('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needle = partQuery.trim().toLocaleLowerCase('tr');
  const matches = needle ? inventory.data.filter((i) => `${i.name} ${i.code} ${i.category}`.toLocaleLowerCase('tr').includes(needle)).slice(0, 6) : [];

  const submit = async () => {
    const used = parseNum(qty);
    if (!technician.trim()) return setError('Bakımı yapanı yazın.');
    if (!work.trim()) return setError('Yapılan işlemi yazın.');
    if (item && (!Number.isFinite(used) || used <= 0)) return setError('Kullanılan miktar sıfırdan büyük bir sayı olmalı.');
    if (item && used > item.quantity) return setError(`Depoda yeterli stok yok: ${item.name} için ${fmt(item.quantity)} ${item.unit} var.`);
    setBusy(true);
    setError(null);
    try {
      await api.addMaintenance({ equipment_id: eq.id, technician: technician.trim(), work: work.trim(), item_id: item?.id ?? null, quantity_used: item ? used : 0, note: note.trim() });
      onClose();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Sheet title="Bakım Kaydı Ekle" subtitle={`${eq.code} için yapılan işlemi ve kullanılan parçayı kaydedin.`} onClose={onClose}>
      <Field label="Bakımı yapan" value={technician} onChangeText={setTechnician} placeholder="Teknisyen adı" />
      <Field label="Yapılan işlem" value={work} onChangeText={setWork} placeholder="Bakım veya onarım açıklaması" multiline />

      <View style={{ gap: 8 }}>
        <Text style={s.label}>Kullanılan yedek parça</Text>
        {item ? (
          <>
            <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
                <Text style={[s.muted, { fontSize: 13 }]}>
                  {item.code} · Depoda {fmt(item.quantity)} {item.unit}
                </Text>
              </View>
              <Pressable onPress={() => setItem(null)} accessibilityRole="button" accessibilityLabel="Parçayı kaldır" hitSlop={12}>
                <X color={C.muted} size={20} />
              </Pressable>
            </View>
            <Field label={`Kullanılan miktar (${item.unit})`} value={qty} onChangeText={(v) => (setQty(v), setError(null))} keyboardType="decimal-pad" selectTextOnFocus />
            <Text style={[s.muted, { fontSize: 13 }]}>Kaydedince bu miktar depo stokundan düşer.</Text>
          </>
        ) : (
          <>
            <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 }]}>
              <Search color={C.muted} size={18} />
              <TextInput value={partQuery} onChangeText={setPartQuery} placeholder="Parça adı veya kodu ile arayın" placeholderTextColor="#6b6b73" accessibilityLabel="Yedek parça ara" style={{ flex: 1, color: C.text, fontSize: 16, paddingVertical: 12 }} />
            </View>
            {!needle && <Text style={[s.muted, { fontSize: 13 }]}>Parça kullanılmadıysa boş bırakın.</Text>}
            {needle && matches.length === 0 && <Text style={[s.muted, { fontSize: 13 }]}>Depoda bu aramaya uyan parça yok.</Text>}
            {matches.map((i) => (
              <Pressable
                key={i.id}
                onPress={() => (setItem(i), setPartQuery(''), setError(null))}
                disabled={i.quantity <= 0}
                accessibilityRole="button"
                accessibilityLabel={`${i.name} seç`}
                style={[st.match, i.quantity <= 0 && { opacity: 0.5 }]}
              >
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', flex: 1 }}>{i.name}</Text>
                <Text style={[s.muted, { fontSize: 13 }]}>{i.quantity <= 0 ? 'Stok yok' : `${fmt(i.quantity)} ${i.unit}`}</Text>
              </Pressable>
            ))}
          </>
        )}
      </View>

      <Field label="Ek not" value={note} onChangeText={setNote} placeholder="İsteğe bağlı" multiline />
      <ErrorText>{error ?? inventory.error}</ErrorText>
      <Btn label="Bakım Kaydını Kaydet" variant="primary" onPress={submit} loading={busy} />
      <Btn label="Vazgeç" onPress={onClose} />
    </Sheet>
  );
}

function EditForm({ eq, onClose }: { eq: Equipment; onClose: () => void }) {
  const [kind, setKind] = useState(eq.kind);
  const [location, setLocation] = useState(eq.location);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    try {
      await api.updateEquipment(eq.id, { kind: kind.trim() || 'Konveyör / Motor', location: location.trim() });
      onClose();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Sheet title="Ekipmanı Düzenle" subtitle={eq.code} onClose={onClose}>
      <Field label="Tür" value={kind} onChangeText={setKind} placeholder="Konveyör / Motor" />
      <Field label="Konum" value={location} onChangeText={setLocation} placeholder="Örn. Doğu 2 Vertisorter girişi" />
      <ErrorText>{error}</ErrorText>
      <Btn label="Değişiklikleri Kaydet" variant="primary" onPress={submit} loading={busy} />
      <Btn label="Vazgeç" onPress={onClose} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 14, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: C.border },
  match: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
});
