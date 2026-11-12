import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { PhotoField, PhotoItem, uploadAll } from '../../lib/PhotoField';
import { C } from '../../lib/theme';
import { Importance } from '../../lib/types';
import { Btn, ErrorText, Field, IMPORTANCE, s } from '../../lib/ui';

const LEVELS: Importance[] = ['normal', 'onemli', 'acil'];

/** Yeni bildiri oluşturma ve (id verilirse) mevcut bildiriyi düzenleme ekranı. */
export default function BildiriDuzenle() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [importance, setImportance] = useState<Importance>('normal');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getNotice(id).then((n) => {
      if (!n) return;
      setTitle(n.title);
      setBody(n.body);
      setImportance(n.importance);
      setPhotos(n.photo_url ? [n.photo_url] : []);
    });
  }, [id]);

  const submit = async () => {
    if (!title.trim()) return setError('Başlık girin.');
    setBusy(true);
    setError(null);
    try {
      const [photo_url = null] = await uploadAll(photos, 'bildiri');
      await api.saveNotice({ title: title.trim(), body: body.trim(), importance, photo_url }, id);
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: id ? 'Bildiriyi Düzenle' : 'Yeni Bildiri' }} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Field label="Başlık" value={title} onChangeText={setTitle} maxLength={80} />
        <Field label="Bildiri içeriği" value={body} onChangeText={setBody} multiline />

        <View style={{ gap: 6 }}>
          <Text style={s.label}>Önem derecesi</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {LEVELS.map((lv) => {
              const on = lv === importance;
              const m = IMPORTANCE[lv];
              return (
                <Pressable
                  key={lv}
                  onPress={() => setImportance(lv)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={{
                    flex: 1,
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: on ? m.fg : C.border,
                    backgroundColor: on ? m.bg : C.card,
                  }}
                >
                  <Text style={{ color: on ? m.fg : C.muted, fontWeight: '700', fontSize: 15 }}>{m.short}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <PhotoField label="Fotoğraf (isteğe bağlı)" value={photos} onChange={setPhotos} />

        <ErrorText>{error}</ErrorText>
        <Btn label={id ? 'Değişiklikleri Kaydet' : 'Bildiriyi Yayınla'} icon={Send} variant="primary" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
