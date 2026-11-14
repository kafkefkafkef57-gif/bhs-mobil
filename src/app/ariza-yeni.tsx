import { router, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardPad } from '../lib/KeyboardPad';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PhotoField, PhotoItem, uploadAll } from '../lib/PhotoField';
import { C } from '../lib/theme';
import { COMPANIES, Line, LINE_NAME } from '../lib/types';
import { Btn, Card, ErrorText, Field, s } from '../lib/ui';

/** Seçilen bölge için arıza bildirimi. */
export default function ArizaYeni() {
  const p = useLocalSearchParams<{ line: Line; zoneId: string; zoneName: string }>();
  const [company, setCompany] = useState('');
  const { profile } = useAuth();
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!company) return setError('Arızaya sebep olan bagajın firmasını seçin.');
    setBusy(true);
    setError(null);
    try {
      const [photo_url = null] = await uploadAll(photos, 'ariza');
      await api.saveFault({ line: p.line, zone_id: p.zoneId, zone_name: p.zoneName, company, description: description.trim(), photo_url, shift: profile!.shift!, team: profile!.team! });
      router.dismissTo('/arizalar');
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <KeyboardPad style={s.screen}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 2 }}>
          <Text style={s.muted}>{LINE_NAME[p.line]}</Text>
          <Text style={s.h2}>{p.zoneName}</Text>
          <Text style={[s.muted, { fontSize: 13 }]}>
            {profile?.shift} Vardiyası · {profile?.team} olarak kaydedilecek
          </Text>
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
        <Field label="Açıklama (isteğe bağlı)" value={description} onChangeText={setDescription} multiline />
        <PhotoField label="Görsel (isteğe bağlı)" value={photos} onChange={setPhotos} />
        <ErrorText>{error}</ErrorText>
        <Btn label="Arızayı Bildir" icon={Send} variant="primary" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardPad>
  );
}
