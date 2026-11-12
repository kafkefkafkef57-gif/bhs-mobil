import { router, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { DateField } from '../lib/DateField';
import { fromDay, toDay } from '../lib/format';
import { PhotoField, PhotoItem, uploadAll } from '../lib/PhotoField';
import { KIND_ORDER, KINDS, saveShiftPrefs } from '../lib/shiftReport';
import { ShiftPicker } from '../lib/ShiftPicker';
import { Department, EntryKind, Shift } from '../lib/types';
import { Btn, ErrorText, Field, s, Segmented } from '../lib/ui';

const TEAMS: { value: Department; label: string }[] = [
  { value: 'Operasyon', label: 'Operasyon' },
  { value: 'Teknik', label: 'Teknik' },
];
type NewKind = Exclude<EntryKind, 'ariza'>;
const KIND_OPTIONS = KIND_ORDER.filter((k): k is NewKind => k !== 'ariza').map((k) => ({ value: k, label: KINDS[k].label }));

/** Vardiyaya bildirim, not, rutin ya da devir notu ekleme. */
export default function VardiyaPaylasim() {
  const p = useLocalSearchParams<{ day?: string; shift?: Shift; team?: Department }>();
  const { profile } = useAuth();
  const [kind, setKind] = useState<NewKind>('bildirim');
  const [date, setDate] = useState(() => (p.day ? fromDay(p.day) : new Date()));
  const [shift, setShift] = useState<Shift>(p.shift ?? 'A');
  const [team, setTeam] = useState<Department>(p.team ?? 'Operasyon');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return setError('Başlık girin.');
    setBusy(true);
    setError(null);
    try {
      const [photo_url = null] = await uploadAll(photos, 'vardiya');
      await api.saveShiftEntry({ day: toDay(date), shift, team, kind, title: title.trim(), body: body.trim(), photo_url });
      saveShiftPrefs({ shift, team });
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.muted}>Paylaşan: {profile?.full_name}</Text>
        <View style={{ gap: 6 }}>
          <Text style={s.label}>Tür</Text>
          <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={s.label}>Vardiya</Text>
          <ShiftPicker value={shift} onChange={setShift} />
        </View>
        <DateField label="Tarih" value={date} onChange={setDate} />
        <View style={{ gap: 6 }}>
          <Text style={s.label}>Ekip</Text>
          <Segmented options={TEAMS} value={team} onChange={setTeam} />
        </View>
        <Field label="Başlık" value={title} onChangeText={setTitle} placeholder={kind === 'devir' ? 'Örn. Vardiya devir notu' : 'Kısa başlık'} maxLength={100} />
        <Field label="Açıklama" value={body} onChangeText={setBody} placeholder="Paylaşılacak bilgileri ve yapılan işleri yazın" multiline />
        <PhotoField label="Fotoğraf (isteğe bağlı)" value={photos} onChange={setPhotos} />
        <ErrorText>{error}</ErrorText>
        <Btn label="Paylaş" icon={Send} variant="primary" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
