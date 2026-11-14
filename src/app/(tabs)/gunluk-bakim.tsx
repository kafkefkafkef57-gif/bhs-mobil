import { Pencil, Plus, Search, Trash2, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { DateField } from '../../lib/DateField';
import { addDays, formatDate, formatDay, fromDay, toDay } from '../../lib/format';
import { KeyboardPad } from '../../lib/KeyboardPad';
import { PageHeader } from '../../lib/MenuButton';
import { PhotoField, PhotoItem, uploadAll } from '../../lib/PhotoField';
import { C } from '../../lib/theme';
import { DailyWork, WORK_CATEGORIES } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Badge, Btn, Card, confirm, ErrorText, Field, s, Segmented } from '../../lib/ui';

type Tab = 'bugun' | 'arsiv';
const TABS: { value: Tab; label: string }[] = [
  { value: 'bugun', label: 'Bugün' },
  { value: 'arsiv', label: 'Arşiv' },
];
const CATEGORY_FILTERS = [{ value: 'all', label: 'Tümü' }, ...WORK_CATEGORIES.map((c) => ({ value: c as string, label: c as string }))];
const norm = (t: string) => t.toLocaleLowerCase('tr');

/** Teknisyenlerin gün içinde yaptığı işler: köprü bakımı, bant, arıza giderme vb. */
export default function GunlukBakim() {
  const [tab, setTab] = useState<Tab>('bugun');
  const [date, setDate] = useState(() => fromDay(addDays(toDay(new Date()), -1))); // arşivde bakılan gün
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  // undefined: form kapalı, null: yeni iş, kayıt: düzeltme
  const [editing, setEditing] = useState<DailyWork | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const day = tab === 'bugun' ? toDay(new Date()) : toDay(date);
  const works = useLive(() => api.listDailyWorks(fromDay(day), fromDay(addDays(day, 1))), ['daily_works'], [] as DailyWork[]);
  const { reload } = works;
  useEffect(() => {
    reload();
  }, [day, reload]);

  const shown = works.data.filter(
    (w) => (category === 'all' || w.category === category) && (!q.trim() || norm(`${w.place} ${w.work} ${w.note} ${w.author_name ?? ''} ${w.category}`).includes(norm(q.trim()))),
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]} keyboardShouldPersistTaps="handled">
        <PageHeader title="Günlük Köprü ve Arıza Bakım" />
        <Btn label="Yapılan iş ekle" icon={Plus} variant="primary" onPress={() => setEditing(null)} style={{ alignSelf: 'flex-start' }} />
        <Segmented options={TABS} value={tab} onChange={setTab} />
        {tab === 'arsiv' && <DateField label="Tarih" value={date} onChange={setDate} />}
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 0 }]}>
          <Search color={C.muted} size={18} />
          <TextInput value={q} onChangeText={setQ} placeholder="Yer, yapılan iş veya personel" placeholderTextColor="#6b6b73" accessibilityLabel="İş ara" style={{ flex: 1, color: C.text, fontSize: 16, paddingVertical: 12 }} />
        </View>
        <Segmented options={CATEGORY_FILTERS} value={category} onChange={setCategory} />
        <Text style={s.h2}>
          {tab === 'bugun' ? 'Bugün' : formatDay(day)} · {shown.length} iş
        </Text>
        <ErrorText>{works.error ?? error}</ErrorText>

        {shown.length === 0 && !works.error && (
          <Card style={{ alignItems: 'center', gap: 4, paddingVertical: 28 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{tab === 'bugun' ? 'Bugün girilmiş iş yok' : 'Bu tarihte girilmiş iş yok'}</Text>
            <Text style={[s.muted, { textAlign: 'center' }]}>Yapılan köprü bakımı, bant ve arıza giderme işlerini buraya kaydedin.</Text>
          </Card>
        )}
        {shown.map((w) => (
          <Card key={w.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={w.category} fg="#5eead4" bg="#1c3f3c" />
              {!!w.place && <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', flexShrink: 1 }}>{w.place}</Text>}
            </View>
            <Text style={{ color: C.text, fontSize: 16, lineHeight: 23 }}>{w.work}</Text>
            {!!w.note && <Text style={s.muted}>Not: {w.note}</Text>}
            {!!w.photo_url && <Image source={{ uri: w.photo_url }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" accessibilityLabel="İş fotoğrafı" />}
            <Text style={[s.muted, { fontSize: 13 }]}>
              {formatDate(w.created_at)} · {w.author_name ?? '—'}
              {w.shift ? ` · ${w.shift} Vardiyası` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label="Düzelt" icon={Pencil} style={{ flex: 1 }} onPress={() => setEditing(w)} />
              <Btn
                label="Sil"
                icon={Trash2}
                variant="danger"
                style={{ flex: 1 }}
                onPress={() => confirm('Kayıt silinsin mi?', 'Bu iş kaydı kalıcı olarak silinecek.', () => api.deleteDailyWork(w.id).catch((e) => setError(e.message)))}
              />
            </View>
          </Card>
        ))}
      </ScrollView>
      <Modal visible={editing !== undefined} transparent animationType="slide" onRequestClose={() => setEditing(undefined)}>
        {editing !== undefined && <WorkForm work={editing} onClose={() => setEditing(undefined)} />}
      </Modal>
    </SafeAreaView>
  );
}

function WorkForm({ work, onClose }: { work: DailyWork | null; onClose: () => void }) {
  const { profile } = useAuth();
  const [category, setCategory] = useState<string>(work?.category ?? WORK_CATEGORIES[0]);
  const [place, setPlace] = useState(work?.place ?? '');
  const [text, setText] = useState(work?.work ?? '');
  const [note, setNote] = useState(work?.note ?? '');
  const [photos, setPhotos] = useState<PhotoItem[]>(work?.photo_url ? [work.photo_url] : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!text.trim()) return setError('Yapılan işi yazın.');
    setBusy(true);
    setError(null);
    try {
      const [photo_url = null] = await uploadAll(photos, 'gunluk-is');
      await api.saveDailyWork({ category, place: place.trim(), work: text.trim(), note: note.trim(), photo_url, shift: profile?.shift ?? null, team: profile?.team ?? null }, work?.id);
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
          <Text style={s.h2}>{work ? 'Kaydı Düzelt' : 'Yapılan İş Ekle'}</Text>
          {!work && (
            <Text style={[s.muted, { fontSize: 13, textAlign: 'center' }]}>
              {profile?.full_name} · {profile?.shift} Vardiyası · {profile?.team} olarak kaydedilecek
            </Text>
          )}
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} style={{ position: 'absolute', right: 0, top: 0 }}>
            <X color={C.muted} size={22} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 6 }}>
            <Text style={s.label}>İş türü</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WORK_CATEGORIES.map((c) => {
                const on = c === category;
                return (
                  <Pressable key={c} onPress={() => setCategory(c)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`İş türü: ${c}`} style={[st.chip, on && { backgroundColor: C.seg, borderColor: C.seg }]}>
                    <Text style={{ color: C.text, fontWeight: '700' }}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Field label="Yer / ekipman" value={place} onChangeText={setPlace} placeholder="Örn. Köprü 205, Doğu 2 Vertisorter" />
          <Field label="Yapılan iş" value={text} onChangeText={setText} placeholder="Yapılan bakım, onarım ya da kontrolü yazın" multiline />
          <Field label="Açıklama / not (isteğe bağlı)" value={note} onChangeText={setNote} multiline />
          <PhotoField label="Fotoğraf (isteğe bağlı)" value={photos} onChange={setPhotos} />
          <ErrorText>{error}</ErrorText>
          <Btn label={work ? 'Değişiklikleri Kaydet' : 'Kaydet'} variant="primary" onPress={submit} loading={busy} />
          <Btn label="Vazgeç" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </KeyboardPad>
  );
}

const st = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 14, maxHeight: '92%' },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: C.border },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
});
