import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Camera, ImagePlus, Send, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { C } from '../../lib/theme';
import { Importance, Photo } from '../../lib/types';
import { Btn, ErrorText, Field, IMPORTANCE, s } from '../../lib/ui';

const LEVELS: Importance[] = ['normal', 'onemli', 'acil'];

/** Yeni bildiri oluşturma ve (id verilirse) mevcut bildiriyi düzenleme ekranı. */
export default function BildiriDuzenle() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [importance, setImportance] = useState<Importance>('normal');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null); // daha önce yüklenmiş fotoğraf
  const [picked, setPicked] = useState<Photo | null>(null); // yeni seçilen, henüz yüklenmemiş
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getNotice(id).then((n) => {
      if (!n) return;
      setTitle(n.title);
      setBody(n.body);
      setImportance(n.importance);
      setPhotoUrl(n.photo_url);
    });
  }, [id]);

  const pick = async (fromCamera: boolean) => {
    setError(null);
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Kamera izni verilmedi.');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled) setPicked(res.assets[0]);
  };

  const submit = async () => {
    if (!title.trim()) return setError('Başlık girin.');
    setBusy(true);
    setError(null);
    try {
      const photo_url = picked ? await api.uploadPhoto(picked) : photoUrl;
      await api.saveNotice({ title: title.trim(), body: body.trim(), importance, photo_url }, id);
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const preview = picked?.uri ?? photoUrl;
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

        <View style={{ gap: 8 }}>
          <Text style={s.label}>Fotoğraf (isteğe bağlı)</Text>
          {preview && <Image source={{ uri: preview }} style={{ width: '100%', height: 200, borderRadius: 14 }} resizeMode="cover" accessibilityLabel="Seçilen fotoğraf" />}
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Btn label="Galeri" icon={ImagePlus} onPress={() => pick(false)} />
            <Btn label="Kamera" icon={Camera} onPress={() => pick(true)} />
            {preview && (
              <Btn
                label="Kaldır"
                icon={Trash2}
                variant="danger"
                onPress={() => {
                  setPicked(null);
                  setPhotoUrl(null);
                }}
              />
            )}
          </View>
        </View>

        <ErrorText>{error}</ErrorText>
        <Btn label={id ? 'Değişiklikleri Kaydet' : 'Bildiriyi Yayınla'} icon={Send} variant="primary" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
