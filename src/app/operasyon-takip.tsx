import { Check, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { DateField } from '../lib/DateField';
import { formatDay, toDay } from '../lib/format';
import { PhotoField, PhotoItem, uploadAll } from '../lib/PhotoField';
import { C } from '../lib/theme';
import { Shift, Task, TaskStatus } from '../lib/types';
import { useLive } from '../lib/useLive';
import { Badge, Btn, Card, ErrorText, Field, s } from '../lib/ui';

const SHIFTS: Shift[] = ['A', 'B', 'C', 'D'];
const OPTIONS: { value: TaskStatus; label: string; icon: typeof Check; fg: string; bg: string }[] = [
  { value: 'yapildi', label: 'Yapıldı', icon: Check, fg: C.green, bg: C.greenBg },
  { value: 'yapilmadi', label: 'Yapılmadı', icon: X, fg: C.red, bg: C.redBg },
];

export default function OperasyonTakip() {
  const { data, error } = useLive(() => api.listTasks(), ['tasks'], [] as Task[]);
  const [adding, setAdding] = useState(false);
  // İşaretlenmemiş görevler tarihe göre üstte, işaretlenenler altta.
  const tasks = [...data.filter((t) => !t.status), ...data.filter((t) => t.status).reverse()];

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={s.h1}>Operasyon Takip</Text>
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" accessibilityLabel="Yeni görev" style={st.add}>
            <Plus color={C.text} size={22} />
          </Pressable>
        </View>
        <ErrorText>{error}</ErrorText>
        {tasks.length === 0 && !error && (
          <Card>
            <Text style={s.muted}>Henüz görev yok. Sağ üstteki + ile ekleyin.</Text>
          </Card>
        )}
        {tasks.map((t) => {
          const badge = t.status === 'yapildi' ? { label: 'Yapıldı', fg: C.green, bg: C.greenBg } : t.status === 'yapilmadi' ? { label: 'Yapılmadı', fg: C.red, bg: C.redBg } : { label: 'Bekliyor', fg: C.amber, bg: C.amberBg };
          return (
            <Card key={t.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[{ color: C.text, fontSize: 17, fontWeight: '700' }, t.status === 'yapildi' && { textDecorationLine: 'line-through', color: C.muted }]}>{t.title}</Text>
                  <Text style={s.muted}>
                    {formatDay(t.due_date)} · {t.shift} Vardiyası
                  </Text>
                </View>
                <Badge {...badge} />
              </View>
              {!!t.description && <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{t.description}</Text>}
              {!!t.photo_url && <Image source={{ uri: t.photo_url }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" accessibilityLabel="Görev fotoğrafı" />}
              {/* Seçili olana tekrar dokunmak işareti kaldırır. */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {OPTIONS.map((o) => {
                  const on = t.status === o.value;
                  const Icon = o.icon;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => api.setTaskStatus(t.id, on ? null : o.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${t.title}: ${o.label}`}
                      style={[st.option, on && { backgroundColor: o.bg, borderColor: o.fg }]}
                    >
                      <Icon color={on ? o.fg : C.muted} size={18} />
                      <Text style={{ color: on ? o.fg : C.text, fontSize: 15, fontWeight: '700' }}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </ScrollView>
      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        {adding && <NewTask onClose={() => setAdding(false)} />}
      </Modal>
    </View>
  );
}

function NewTask({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [shift, setShift] = useState<Shift | null>(null);
  const [date, setDate] = useState(() => new Date());
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return setError('Görev adını girin.');
    if (!shift) return setError('Sorumlu vardiyayı seçin.');
    setBusy(true);
    setError(null);
    try {
      const [photo_url = null] = await uploadAll(photos, 'gorev');
      await api.saveTask({ title: title.trim(), shift, due_date: toDay(date), description: description.trim(), photo_url });
      onClose();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={st.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView edges={['bottom']} style={st.sheet}>
        <View style={st.handle} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={s.h2}>Yeni görev</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} style={{ position: 'absolute', right: 0 }}>
            <X color={C.muted} size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          <Field label="Görev Adı" value={title} onChangeText={setTitle} placeholder="Örn. Check-in hattı temizliği" />
          <View style={{ gap: 6 }}>
            <Text style={s.label}>Sorumlu Vardiya</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SHIFTS.map((v) => {
                const on = v === shift;
                return (
                  <Pressable key={v} onPress={() => setShift(v)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${v} Vardiyası`} style={[st.shift, on && { backgroundColor: C.seg, borderColor: C.seg }]}>
                    <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <DateField label="Tarih" value={date} onChange={setDate} />
          <Field label="Açıklama" value={description} onChangeText={setDescription} placeholder="Görevle ilgili not" multiline />
          <PhotoField label="Görsel (isteğe bağlı)" value={photos} onChange={setPhotos} />
          <ErrorText>{error}</ErrorText>
          <Btn label="Kaydet" variant="primary" onPress={submit} loading={busy} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  add: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  option: { flex: 1, flexDirection: 'row', gap: 8, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 14, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: C.border },
  shift: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
});
