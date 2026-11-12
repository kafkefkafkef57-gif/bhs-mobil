import { Check, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { DateField } from '../lib/DateField';
import { formatDay, toDay } from '../lib/format';
import { PhotoField, PhotoItem, uploadAll } from '../lib/PhotoField';
import { C } from '../lib/theme';
import { Shift, Task } from '../lib/types';
import { useLive } from '../lib/useLive';
import { Badge, Btn, Card, ErrorText, Field, s } from '../lib/ui';

const SHIFTS: Shift[] = ['A', 'B', 'C', 'D'];

export default function OperasyonTakip() {
  const { data, error } = useLive(() => api.listTasks(), ['tasks'], [] as Task[]);
  const [adding, setAdding] = useState(false);
  // Bekleyenler tarihe göre üstte, tamamlananlar altta.
  const tasks = [...data.filter((t) => !t.done_at), ...data.filter((t) => t.done_at).reverse()];
  const today = toDay(new Date());

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
          const done = !!t.done_at;
          const late = !done && t.due_date < today;
          return (
            <Card key={t.id} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => api.setTaskDone(t.id, !done)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`${t.title} tamamlandı`}
                  hitSlop={10}
                  style={[st.check, done && { backgroundColor: C.seg, borderColor: C.seg }]}
                >
                  {done && <Check color={C.text} size={18} />}
                </Pressable>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[{ color: C.text, fontSize: 17, fontWeight: '700' }, done && { textDecorationLine: 'line-through', color: C.muted }]}>{t.title}</Text>
                  <Text style={s.muted}>
                    {formatDay(t.due_date)} · {t.shift} Vardiyası
                  </Text>
                </View>
                {done ? <Badge label="Tamamlandı" fg={C.green} bg={C.greenBg} /> : late ? <Badge label="Gecikti" fg={C.red} bg={C.redBg} /> : <Badge label="Bekliyor" fg={C.amber} bg={C.amberBg} />}
              </View>
              {!!t.description && <Text style={{ color: C.text, fontSize: 15, lineHeight: 21 }}>{t.description}</Text>}
              {!!t.photo_url && <Image source={{ uri: t.photo_url }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" accessibilityLabel="Görev fotoğrafı" />}
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
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 14, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: C.border },
  shift: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
});
