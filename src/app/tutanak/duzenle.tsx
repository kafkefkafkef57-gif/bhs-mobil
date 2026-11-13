import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { KeyboardPad } from '../../lib/KeyboardPad';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { DateField } from '../../lib/DateField';
import { PhotoField, PhotoItem, uploadAll } from '../../lib/PhotoField';
import { C } from '../../lib/theme';
import { COMPANIES } from '../../lib/types';
import { Btn, ErrorText, Field, s } from '../../lib/ui';


/** Yeni olay tutanağı oluşturma ve (id verilirse) düzenleme ekranı. */
export default function TutanakDuzenle() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile } = useAuth();
  const [incidentAt, setIncidentAt] = useState(() => new Date());
  const [officer, setOfficer] = useState(profile?.full_name ?? '');
  const [staff, setStaff] = useState('');
  const [company, setCompany] = useState('');
  const [summary, setSummary] = useState('');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getReport(id).then((r) => {
      if (!r) return;
      setIncidentAt(new Date(r.incident_at));
      setOfficer(r.officer);
      setStaff(r.staff_name);
      setCompany(r.company);
      setSummary(r.summary);
      setPhotos(r.photo_urls);
    });
  }, [id]);

  const submit = async () => {
    if (!staff.trim()) return setError('Kaza yapan personelin adını girin.');
    if (!company.trim()) return setError('Personelin firmasını seçin veya yazın.');
    if (!summary.trim()) return setError('Olay özetini yazın.');
    setBusy(true);
    setError(null);
    try {
      const photo_urls = await uploadAll(photos, 'tutanak');
      await api.saveReport(
        { incident_at: incidentAt.toISOString(), officer: officer.trim(), staff_name: staff.trim(), company: company.trim(), summary: summary.trim(), photo_urls },
        id,
      );
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardPad style={s.screen}>
      <Stack.Screen options={{ title: id ? 'Tutanağı Düzenle' : 'Yeni Tutanak' }} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {!id && <Text style={s.muted}>Tutanak numarası kaydedince otomatik verilir.</Text>}
        <DateField label="Olay tarihi ve saati" value={incidentAt} onChange={setIncidentAt} withTime />
        <Field label="Tutanağı tutan yetkili" value={officer} onChangeText={setOfficer} />
        <Field label="Kaza yapan personel" value={staff} onChangeText={setStaff} />
        <View style={{ gap: 8 }}>
          <Field label="Personelin firması" value={company} onChangeText={setCompany} autoCapitalize="characters" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {COMPANIES.map((c) => {
              const on = c === company;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCompany(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={{ paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: on ? C.seg : C.border, backgroundColor: on ? C.seg : C.card }}
                >
                  <Text style={{ color: C.text, fontWeight: '700' }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Field label="Olay özeti / Kaza nasıl oldu?" value={summary} onChangeText={setSummary} multiline />
        <PhotoField label="Olay yeri görseli / fotoğrafı (en fazla 6)" value={photos} onChange={setPhotos} max={6} />
        <ErrorText>{error}</ErrorText>
        <Btn label={id ? 'Değişiklikleri Kaydet' : 'Tutanağı Kaydet'} icon={Save} variant="primary" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardPad>
  );
}
