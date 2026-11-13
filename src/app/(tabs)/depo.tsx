import { Package, Plus, Search, Trash2, TriangleAlert, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardPad } from '../../lib/KeyboardPad';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { PageHeader } from '../../lib/MenuButton';
import { C } from '../../lib/theme';
import { InventoryItem, isCritical } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Badge, Btn, Card, confirm, ErrorText, Field, s, Segmented } from '../../lib/ui';

const UNITS = ['Adet', 'Metre', 'Kg', 'Litre', 'Kutu', 'Takım'];
const FILTERS: { value: 'all' | 'critical'; label: string }[] = [
  { value: 'all', label: 'Tüm malzemeler' },
  { value: 'critical', label: 'Kritik stok' },
];
const norm = (t: string) => t.toLocaleLowerCase('tr');
/** 12 -> "12", 2.5 -> "2,5" */
const fmt = (n: number) => String(n).replace('.', ',');
const parseNum = (t: string) => Number(t.trim().replace(',', '.'));

export default function Depo() {
  const items = useLive(() => api.listInventory(), ['inventory_items'], [] as InventoryItem[]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'critical'>('all');
  // undefined: form kapalı, null: yeni malzeme, kayıt: düzenleme
  const [editing, setEditing] = useState<InventoryItem | null | undefined>(undefined);

  const critical = items.data.filter(isCritical);
  const shown = items.data
    .filter((i) => (filter === 'all' || isCritical(i)) && (!q.trim() || norm(`${i.name} ${i.code} ${i.shelf} ${i.category}`).includes(norm(q.trim()))))
    .sort((a, b) => Number(isCritical(b)) - Number(isCritical(a)));

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]} keyboardShouldPersistTaps="handled">
        <PageHeader title="Depo Envanter Takibi" />
        <Btn label="Malzeme Ekle" icon={Plus} variant="primary" onPress={() => setEditing(null)} style={{ alignSelf: 'flex-start' }} />

        {critical.length > 0 && (
          <Pressable onPress={() => setFilter('critical')} accessibilityRole="button" accessibilityLabel={`${critical.length} malzeme kritik stok seviyesinde. Göstermek için dokunun`}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#3a1818', borderColor: '#7a2e2e' }}>
              <TriangleAlert color={C.red} size={24} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.red, fontSize: 16, fontWeight: '800' }}>{critical.length} malzeme kritik stokta</Text>
                <Text style={[s.muted, { fontSize: 13 }]} numberOfLines={2}>
                  {critical.map((i) => i.name).join(', ')}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}

        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 }]}>
          <Search color={C.muted} size={18} />
          <TextInput value={q} onChangeText={setQ} placeholder="Malzeme adı, kodu veya raf" placeholderTextColor="#6b6b73" accessibilityLabel="Malzeme ara" style={{ flex: 1, color: C.text, fontSize: 16, paddingVertical: 12 }} />
        </View>
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
        <Text style={s.muted}>
          {items.data.length} malzeme · {critical.length} kritik stok
        </Text>
        <ErrorText>{items.error}</ErrorText>

        {shown.length === 0 && !items.error && (
          <Card>
            <Text style={s.muted}>{items.data.length === 0 ? 'Depoda kayıtlı malzeme yok. "Malzeme Ekle" ile başlayın.' : 'Aramaya uyan malzeme yok.'}</Text>
          </Card>
        )}
        {shown.map((i) => {
          const crit = isCritical(i);
          return (
            <Pressable key={i.id} onPress={() => setEditing(i)} accessibilityRole="button" accessibilityLabel={`${i.name}, ${fmt(i.quantity)} ${i.unit}${crit ? ', kritik stok' : ''}. Düzenle`}>
              <Card style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, crit && { borderColor: '#7a2e2e', backgroundColor: '#2a1717' }]}>
                <Package color={crit ? C.red : C.muted} size={22} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>{i.name}</Text>
                  <Text style={[s.muted, { fontSize: 13 }]}>
                    {[i.code, i.category, i.shelf && `Raf ${i.shelf}`, `Kritik seviye ${fmt(i.critical_level)} ${i.unit}`].filter(Boolean).join(' · ')}
                  </Text>
                  {crit && <Badge label={i.quantity === 0 ? 'Stok tükendi' : 'Kritik stok'} fg={C.red} bg={C.redBg} />}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: crit ? C.red : C.text, fontSize: 20, fontWeight: '800' }}>{fmt(i.quantity)}</Text>
                  <Text style={[s.muted, { fontSize: 13 }]}>{i.unit}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
      <Modal visible={editing !== undefined} transparent animationType="slide" onRequestClose={() => setEditing(undefined)}>
        {editing !== undefined && <ItemForm item={editing} onClose={() => setEditing(undefined)} />}
      </Modal>
    </SafeAreaView>
  );
}

function ItemForm({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const [code, setCode] = useState(item?.code ?? '');
  const [name, setName] = useState(item?.name ?? '');
  const [category, setCategory] = useState(item?.category ?? '');
  const [shelf, setShelf] = useState(item?.shelf ?? '');
  const [quantity, setQuantity] = useState(item ? fmt(item.quantity) : '0');
  const [unit, setUnit] = useState(item?.unit ?? 'Adet');
  const [critical, setCritical] = useState(item ? fmt(item.critical_level) : '0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const qty = parseNum(quantity);
    const crit = parseNum(critical);
    if (!code.trim()) return setError('Malzeme kodunu girin.');
    if (!name.trim()) return setError('Malzeme / parça adını girin.');
    if (!Number.isFinite(qty) || qty < 0) return setError('Stok miktarı 0 veya daha büyük bir sayı olmalı.');
    if (!Number.isFinite(crit) || crit < 0) return setError('Kritik stok seviyesi 0 veya daha büyük bir sayı olmalı.');
    setBusy(true);
    setError(null);
    try {
      await api.saveInventoryItem({ code: code.trim(), name: name.trim(), category: category.trim(), shelf: shelf.trim(), quantity: qty, unit, critical_level: crit }, item?.id);
      onClose();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };
  const remove = () =>
    confirm('Malzeme silinsin mi?', `"${item!.name}" depo listesinden kaldırılacak.`, async () => {
      try {
        await api.deleteInventoryItem(item!.id);
        onClose();
      } catch (e: any) {
        setError(e.message);
      }
    });

  return (
    <KeyboardPad style={st.backdrop}>
      <SafeAreaView edges={['bottom']} style={st.sheet}>
        <View style={st.handle} />
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={s.h2}>{item ? 'Malzemeyi Düzenle' : 'Malzeme Ekle'}</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} style={{ position: 'absolute', right: 0 }}>
            <X color={C.muted} size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          <Field label="Malzeme Kodu" value={code} onChangeText={setCode} autoCapitalize="characters" />
          <Field label="Malzeme / Parça Adı" value={name} onChangeText={setName} />
          <Field label="Kategori" value={category} onChangeText={setCategory} placeholder="Sensör, Motor, Bant, Pnömatik..." />
          <Field label="Bulunduğu Raf" value={shelf} onChangeText={setShelf} placeholder="Örn. A-03-2" autoCapitalize="characters" />
          <Field label="Stok Miktarı" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" selectTextOnFocus />
          <View style={{ gap: 6 }}>
            <Text style={s.label}>Birim</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {UNITS.map((u) => {
                const on = u === unit;
                return (
                  <Pressable key={u} onPress={() => setUnit(u)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={u} style={[st.unit, on && { backgroundColor: C.seg, borderColor: C.seg }]}>
                    <Text style={{ color: C.text, fontWeight: '700' }}>{u}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Field label="Kritik Stok Seviyesi" value={critical} onChangeText={setCritical} keyboardType="decimal-pad" selectTextOnFocus />
          <Text style={[s.muted, { fontSize: 13 }]}>Stok bu seviyeye ya da altına düştüğünde malzeme kritik stok olarak işaretlenir.</Text>
          <ErrorText>{error}</ErrorText>
          <Btn label={item ? 'Değişiklikleri Kaydet' : 'Malzemeyi Kaydet'} variant="primary" onPress={submit} loading={busy} />
          {item && <Btn label="Malzemeyi Sil" icon={Trash2} variant="danger" onPress={remove} />}
          <Btn label="Vazgeç" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardPad>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 14, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: C.border },
  unit: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
});
