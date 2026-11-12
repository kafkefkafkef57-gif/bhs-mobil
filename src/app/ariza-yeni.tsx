import { router, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../lib/api';
import { PhotoField, PhotoItem, uploadAll } from '../lib/PhotoField';
import { loadShiftPrefs, saveShiftPrefs } from '../lib/shiftReport';
import { ShiftPicker } from '../lib/ShiftPicker';
import { C } from '../lib/theme';
import { COMPANIES, Department, Line, LINE_NAME, Shift } from '../lib/types';
import { Btn, Card, ErrorText, Field, s, Segmented } from '../lib/ui';

const TEAMS: { value: Department; label: string }[] = [
  { value: 'Operasyon', label: 'Operasyon' },
  { value: 'Teknik', label: 'Teknik' },
];

/** Seçilen bölge için arıza bildirimi. */
export default function ArizaYeni() {
  const p = useLocalSearchParams<{ line: Line; zoneId: string; zoneName: string }>();
  const [company, setCompany] = useState('');
  const [shift, setShift] = useState<Shift>('A');
  const [team, setTeam] = useState<Department>('Operasyon');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vardiya ve ekip, en son seçilenle hazır gelir.
  useEffect(() => {
    loadShiftPrefs().then((x) => x && (setShift(x.shift), setTeam(x.team)));
  }, []);

  const submit = async () => {
    if (!company) return setError('Arızaya sebep olan bagajın firmasını seçin.');
    setBusy(true);
    setError(null);
    try {
      const [photo_url = null] = await uploadAll(photos, 'ariza');
      await api.saveFault({ line: p.line, zone_id: p.zoneId, zone_name: p.zoneName, company, description: description.trim(), photo_url, shift, team });
      saveShiftPrefs({ shift, team });
      router.dismissTo('/arizalar');
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 2 }}>
          <Text style={s.muted}>{LINE_NAME[p.line]}</Text>
          <Text style={s.h2}>{p.zoneName}</Text>
        </Card>
        <View style={{ gap: 6 }}>
          <Text style={s.label}>Arızaya sebep olan bagajın firması</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {COMPANIES.map((c) => {
              const on = c === company;
              return (
                <Pressable key={c} onPress={() => (setCompany(c), setError(null))} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={c} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: on ? C.seg : C.border, backgroundColor: on ? C.seg : C.card }}>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 15 }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={s.label}>Vardiya</Text>
          <ShiftPicker value={shift} onChange={setShift} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={s.label}>Ekip</Text>
          <Segmented options={TEAMS} value={team} onChange={setTeam} />
        </View>
        <Field label="Açıklama (isteğe bağlı)" value={description} onChangeText={setDescription} multiline />
        <PhotoField label="Görsel (isteğe bağlı)" value={photos} onChange={setPhotos} />
        <ErrorText>{error}</ErrorText>
        <Btn label="Arızayı Bildir" icon={Send} variant="primary" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
