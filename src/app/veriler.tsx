import { FileSpreadsheet, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { DateField } from '../lib/DateField';
import { formatDay, fromDay, monthName, toDay } from '../lib/format';
import { KeyboardPad } from '../lib/KeyboardPad';
import { ShiftPicker } from '../lib/ShiftPicker';
import { C } from '../lib/theme';
import { CUSTOMS_ARRIVALS, CustomsFlight, Shift } from '../lib/types';
import { useLive } from '../lib/useLive';
import { Badge, Btn, Card, confirm, ErrorText, Field, s, Segmented } from '../lib/ui';

type Tab = 'gumruk' | 'excel';
const TABS: { value: Tab; label: string }[] = [
  { value: 'gumruk', label: 'Gümrük' },
  { value: 'excel', label: 'E-Excel' },
];

export default function Veriler() {
  const [tab, setTab] = useState<Tab>('gumruk');
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <Segmented options={TABS} value={tab} onChange={setTab} />
      {tab === 'gumruk' ? <Gumruk /> : <EExcel />}
    </ScrollView>
  );
}

/** Gümrük talebiyle Arrival 1, 3 ve 4'e atanan uçuşlar; ay ay listelenir. */
function Gumruk() {
  const [view, setView] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const [arrival, setArrival] = useState('all');
  const [shift, setShift] = useState<Shift | 'all'>('all');
  // undefined: form kapalı, null: yeni kayıt, kayıt: düzeltme
  const [editing, setEditing] = useState<CustomsFlight | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const from = toDay(new Date(view.y, view.m, 1));
  const to = toDay(new Date(view.y, view.m + 1, 0));
  const flights = useLive(() => api.listCustomsFlights(from, to), ['customs_flights'], [] as CustomsFlight[]);
  const { reload } = flights;
  useEffect(() => {
    reload();
  }, [from, reload]);
  const shown = flights.data.filter((c) => (arrival === 'all' || String(c.arrival) === arrival) && (shift === 'all' || c.shift === shift));
  const move = (step: number) => {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <>
      <Text style={s.muted}>Gümrük talebiyle Arrival 1, 3 ve 4'e atanan uçakları buraya yazın. Kayıt, giren kişinin vardiyasıyla işaretlenir.</Text>
      <Btn label="Uçuş ekle" icon={Plus} variant="primary" onPress={() => setEditing(null)} style={{ alignSelf: 'flex-start' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Btn label="‹" onPress={() => move(-1)} style={{ width: 46 }} />
        <Text style={s.h2}>
          {monthName(view.m)} {view.y}
        </Text>
        <Btn label="›" onPress={() => move(1)} style={{ width: 46 }} />
      </View>
      <Segmented options={[{ value: 'all', label: 'Tüm arrivallar' }, ...CUSTOMS_ARRIVALS.map((a) => ({ value: String(a), label: `Arrival ${a}` }))]} value={arrival} onChange={setArrival} />
      <ShiftPicker value={shift} onChange={setShift} allowAll />
      <Text style={s.muted}>{shown.length} uçuş</Text>
      <ErrorText>{flights.error ?? error}</ErrorText>
      {shown.length === 0 && !flights.error && (
        <Card>
          <Text style={s.muted}>Bu ay için kayıtlı gümrük uçuşu yok.</Text>
        </Card>
      )}
      {shown.map((c) => (
        <Card key={c.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge label={`Arrival ${c.arrival}`} fg="#7fb0ff" bg="#22335a" />
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{c.flight}</Text>
            {!!c.origin && <Text style={s.muted}>· {c.origin}</Text>}
          </View>
          <Text style={s.muted}>
            {formatDay(c.day)} · {c.shift ? `${c.shift} Vardiyası` : 'Vardiya belirtilmemiş'} · {c.author_name ?? '—'}
          </Text>
          {!!c.note && <Text style={{ color: C.text, fontSize: 15 }}>{c.note}</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn label="Düzelt" icon={Pencil} style={{ flex: 1 }} onPress={() => setEditing(c)} />
            <Btn label="Sil" icon={Trash2} variant="danger" style={{ flex: 1 }} onPress={() => confirm('Kayıt silinsin mi?', `${c.flight} gümrük kaydı silinecek.`, () => api.deleteCustomsFlight(c.id).catch((e) => setError(e.message)))} />
          </View>
        </Card>
      ))}
      <Modal visible={editing !== undefined} transparent animationType="slide" onRequestClose={() => setEditing(undefined)}>
        {editing !== undefined && <CustomsForm flight={editing} onClose={() => setEditing(undefined)} />}
      </Modal>
    </>
  );
}

function CustomsForm({ flight, onClose }: { flight: CustomsFlight | null; onClose: () => void }) {
  const { profile } = useAuth();
  const [date, setDate] = useState(() => (flight ? fromDay(flight.day) : new Date()));
  const [arrival, setArrival] = useState<number | null>(flight?.arrival ?? null);
  const [code, setCode] = useState(flight?.flight ?? '');
  const [origin, setOrigin] = useState(flight?.origin ?? '');
  const [note, setNote] = useState(flight?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!arrival) return setError('Arrival numarasını seçin.');
    if (!code.trim()) return setError('Uçuş kodunu yazın.');
    setBusy(true);
    setError(null);
    try {
      await api.saveCustomsFlight({ day: toDay(date), arrival, flight: code.trim().toLocaleUpperCase('tr'), origin: origin.trim(), note: note.trim(), shift: profile?.shift ?? null, team: profile?.team ?? null }, flight?.id);
      onClose();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardPad style={st.backdrop}>
      <SafeAreaView edges={['bottom']} style={st.sheet}>
        <View style={st.handle} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={s.h2}>{flight ? 'Kaydı Düzelt' : 'Gümrük Uçuşu Ekle'}</Text>
          {!flight && <Text style={[s.muted, { fontSize: 13 }]}>{profile?.shift} Vardiyası olarak kaydedilecek</Text>}
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} style={{ position: 'absolute', right: 0, top: 0 }}>
            <X color={C.muted} size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          <DateField label="Tarih" value={date} onChange={setDate} />
          <View style={{ gap: 6 }}>
            <Text style={s.label}>Arrival</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {CUSTOMS_ARRIVALS.map((a) => {
                const on = a === arrival;
                return (
                  <Pressable key={a} onPress={() => (setArrival(a), setError(null))} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`Arrival ${a} seç`} style={[st.choice, on && { backgroundColor: C.seg, borderColor: C.seg }]}>
                    <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>Arrival {a}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Field label="Uçuş kodu" value={code} onChangeText={setCode} placeholder="Örn. PC 1234" autoCapitalize="characters" />
          <Field label="Nereden (isteğe bağlı)" value={origin} onChangeText={setOrigin} placeholder="Örn. Dubai" />
          <Field label="Not (isteğe bağlı)" value={note} onChangeText={setNote} multiline />
          <ErrorText>{error}</ErrorText>
          <Btn label={flight ? 'Değişiklikleri Kaydet' : 'Kaydet'} variant="primary" onPress={submit} loading={busy} />
          <Btn label="Vazgeç" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardPad>
  );
}

// Göstermelik örnek satırlar; gerçek veri bağlanınca kaldırılacak.
const SAMPLE_ROWS = [
  ['01.11', 'A', '18.420', '214', '3'],
  ['02.11', 'B', '19.105', '221', '5'],
  ['03.11', 'C', '17.880', '208', '2'],
  ['04.11', 'D', '20.340', '236', '4'],
];

/** Günlük şirket verileri: şimdilik göstermelik. */
function EExcel() {
  return (
    <>
      <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center', borderColor: C.amber }}>
        <FileSpreadsheet color={C.amber} size={24} />
        <Text style={[s.muted, { flex: 1 }]}>Bu bölüm göstermeliktir. Günlük veriler şu an kapalı bir Excel'de tutuluyor; şirket izin verdiğinde E-Excel'e bağlanıp burada canlı görünecek.</Text>
      </Card>
      <Text style={s.h2}>Günlük veriler (örnek)</Text>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {[['Tarih', 'Vardiya', 'İşlenen bagaj', 'Uçuş', 'Arıza'], ...SAMPLE_ROWS].map((row, i) => (
          <View key={i} style={{ flexDirection: 'row', backgroundColor: i === 0 ? C.cardHi : 'transparent', borderTopWidth: i ? 1 : 0, borderTopColor: C.border }}>
            {row.map((cell, j) => (
              <Text key={j} style={{ flex: j === 2 ? 1.6 : 1, color: i === 0 ? C.muted : C.text, fontSize: 13, fontWeight: i === 0 ? '700' : '500', paddingVertical: 10, paddingHorizontal: 8 }}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </Card>
      <Text style={[s.muted, { fontSize: 13 }]}>Tablodaki sayılar gerçek değildir.</Text>
    </>
  );
}

const st = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 14, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: C.border },
  choice: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
});
