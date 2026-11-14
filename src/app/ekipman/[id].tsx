import { Stack, useLocalSearchParams } from 'expo-router';
import { Pencil, Search, Trash2, Wrench, X } from 'lucide-react-native';
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
import { Badge, Btn, Card, confirm, ErrorText, Field, s } from '../../lib/ui';

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
  const [editing, setEditing] = useState<MaintenanceRecord | undefined>(undefined); // düzeltilen bakım kaydı
  const [actionError, setActionError] = useState<string | null>(null);
  const openForm = (record?: MaintenanceRecord) => (setEditing(record), setSheet('bakim'));
  const eq = equipment.data.find((e) => e.id === id);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
      <Stack.Screen options={{ title: eq?.code ?? 'Ekipman' }} />
      <ErrorText>{equipment.error ?? history.error ?? actionError}</ErrorText>
      {eq && (
        <>
          <View>
            <Text style={s.muted}>Teknik Bakım ve Envanter</Text>
            <Text style={s.h1}>{eq.code}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Btn label="Ekipmanı Düzenle" icon={Pencil} onPress={() => setSheet('duzenle')} />
            <Btn label="Bakım Kaydı Ekle" icon={Wrench} variant="primary" onPress={() => openForm()} />
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
              {r.parts.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={[s.muted, { fontSize: 13 }]}>Kullanılan parçalar</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {r.parts.map((p, i) => (
                      <Badge key={`${p.item_name}-${i}`} label={`${p.item_name} · ${fmt(p.quantity)} ${p.unit}`} fg={C.amber} bg={C.amberBg} />
                    ))}
                  </View>
                </View>
              )}
              {!!r.note && <Text style={s.muted}>Not: {r.note}</Text>}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn label="Düzelt" icon={Pencil} style={{ flex: 1 }} onPress={() => openForm(r)} />
                <Btn
                  label="Sil"
                  icon={Trash2}
                  variant="danger"
                  style={{ flex: 1 }}
                  onPress={() =>
                    confirm('Bakım kaydı silinsin mi?', r.parts.some((p) => p.item_id) ? 'Kayıt silinecek ve kullanılan parçalar depo stokuna geri eklenecek.' : 'Kayıt kalıcı olarak silinecek.', () =>
                      api.deleteMaintenance(r.id).catch((e) => setActionError(e.message)),
                    )
                  }
                />
              </View>
            </Card>
          ))}

          <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
            {sheet === 'bakim' && <MaintenanceForm eq={eq} record={editing} onClose={() => setSheet(null)} />}
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

type PartRow = { item_id: string | null; item_name: string; unit: string; qty: string; available: number | null };

/** Yeni bakım kaydı ya da (record verilirse) mevcut kaydın düzeltilmesi. */
function MaintenanceForm({ eq, record, onClose }: { eq: Equipment; record?: MaintenanceRecord; onClose: () => void }) {
  const { profile } = useAuth();
  const inventory = useLive(() => api.listInventory(), [], [] as InventoryItem[]);
  const [technician, setTechnician] = useState(record?.technician ?? profile?.full_name ?? '');
  const [work, setWork] = useState(record?.work ?? '');
  // Düzeltmede eski miktar depoya geri döneceği için kullanılabilir stok = depodaki + bu kayıtta kullanılmış olan.
  const [parts, setParts] = useState<PartRow[]>(() => (record?.parts ?? []).map((p) => ({ item_id: p.item_id, item_name: p.item_name, unit: p.unit, qty: fmt(p.quantity), available: null })));
  const [partQuery, setPartQuery] = useState('');
  const [note, setNote] = useState(record?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedBefore = (itemId: string | null) => record?.parts.find((p) => p.item_id === itemId)?.quantity ?? 0;
  const availableOf = (p: PartRow) => {
    if (!p.item_id) return null; // depodan silinmiş malzeme: stok denetimi yok
    const inStock = inventory.data.find((i) => i.id === p.item_id)?.quantity;
    return inStock === undefined ? p.available : inStock + usedBefore(p.item_id);
  };
  const needle = partQuery.trim().toLocaleLowerCase('tr');
  const matches = needle
    ? inventory.data.filter((i) => !parts.some((p) => p.item_id === i.id) && `${i.name} ${i.code} ${i.category}`.toLocaleLowerCase('tr').includes(needle)).slice(0, 6)
    : [];
  const setQty = (index: number, qty: string) => (setParts((list) => list.map((p, i) => (i === index ? { ...p, qty } : p))), setError(null));

  const submit = async () => {
    if (!technician.trim()) return setError('Bakımı yapanı yazın.');
    if (!work.trim()) return setError('Yapılan işlemi yazın.');
    for (const p of parts) {
      const used = parseNum(p.qty);
      const available = availableOf(p);
      if (!Number.isFinite(used) || used <= 0) return setError(`${p.item_name}: kullanılan miktar sıfırdan büyük bir sayı olmalı.`);
      if (available !== null && used > available) return setError(`Depoda yeterli stok yok: ${p.item_name} için ${fmt(available)} ${p.unit} var.`);
    }
    setBusy(true);
    setError(null);
    try {
      await api.saveMaintenance({
        id: record?.id,
        equipment_id: eq.id,
        technician: technician.trim(),
        work: work.trim(),
        note: note.trim(),
        parts: parts.map((p) => ({ item_id: p.item_id, item_name: p.item_name, unit: p.unit, quantity: parseNum(p.qty) })),
      });
      onClose();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <Sheet title={record ? 'Bakım Kaydını Düzelt' : 'Bakım Kaydı Ekle'} subtitle={`${eq.code} için yapılan işlemi ve varsa kullanılan parçaları kaydedin.`} onClose={onClose}>
      <Field label="Bakımı yapan" value={technician} onChangeText={setTechnician} placeholder="Teknisyen adı" />
      <Field label="Yapılan işlem" value={work} onChangeText={setWork} placeholder="Bakım veya onarım açıklaması" multiline />

      <View style={{ gap: 8 }}>
        <Text style={s.label}>Kullanılan yedek parçalar (isteğe bağlı)</Text>
        {parts.map((p, i) => {
          const available = availableOf(p);
          return (
            <View key={p.item_id ?? `${p.item_name}-${i}`} style={st.part}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{p.item_name}</Text>
                <Text style={[s.muted, { fontSize: 12 }]}>{available === null ? 'Depo kaydı yok' : `Kullanılabilir: ${fmt(available)} ${p.unit}`}</Text>
              </View>
              <TextInput value={p.qty} onChangeText={(v) => setQty(i, v)} keyboardType="decimal-pad" selectTextOnFocus accessibilityLabel={`${p.item_name} miktarı`} style={[s.input, { width: 72, textAlign: 'center', paddingVertical: 8 }]} />
              <Text style={[s.muted, { fontSize: 13, minWidth: 34 }]}>{p.unit}</Text>
              <Pressable onPress={() => setParts((list) => list.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`${p.item_name} parçasını çıkar`} hitSlop={10} style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <X color={C.muted} size={20} />
              </Pressable>
            </View>
          );
        })}
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 }]}>
          <Search color={C.muted} size={18} />
          <TextInput value={partQuery} onChangeText={setPartQuery} placeholder={parts.length ? 'Başka parça ekle' : 'Parça adı veya kodu ile arayın'} placeholderTextColor="#6b6b73" accessibilityLabel="Yedek parça ara" style={{ flex: 1, color: C.text, fontSize: 16, paddingVertical: 12 }} />
        </View>
        {!needle && parts.length === 0 && <Text style={[s.muted, { fontSize: 13 }]}>Parça kullanılmadıysa boş bırakın.</Text>}
        {parts.length > 0 && <Text style={[s.muted, { fontSize: 13 }]}>Kaydedince bu miktarlar depo stokundan düşer.</Text>}
        {!!needle && matches.length === 0 && <Text style={[s.muted, { fontSize: 13 }]}>Depoda bu aramaya uyan başka parça yok.</Text>}
        {matches.map((i) => {
          const none = i.quantity + usedBefore(i.id) <= 0;
          return (
            <Pressable
              key={i.id}
              onPress={() => (setParts((list) => [...list, { item_id: i.id, item_name: i.name, unit: i.unit, qty: '1', available: i.quantity }]), setPartQuery(''), setError(null))}
              disabled={none}
              accessibilityRole="button"
              accessibilityLabel={`${i.name} ekle`}
              style={[st.match, none && { opacity: 0.5 }]}
            >
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', flex: 1 }}>{i.name}</Text>
              <Text style={[s.muted, { fontSize: 13 }]}>{none ? 'Stok yok' : `${fmt(i.quantity)} ${i.unit}`}</Text>
            </Pressable>
          );
        })}
      </View>

      <Field label="Ek not" value={note} onChangeText={setNote} placeholder="İsteğe bağlı" multiline />
      <ErrorText>{error ?? inventory.error}</ErrorText>
      <Btn label={record ? 'Değişiklikleri Kaydet' : 'Bakım Kaydını Kaydet'} variant="primary" onPress={submit} loading={busy} />
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
  part: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 4, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  match: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
});
