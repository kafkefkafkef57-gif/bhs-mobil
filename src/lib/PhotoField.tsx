import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { api } from './api';
import { C } from './theme';
import { Photo } from './types';
import { Btn, ErrorText, s } from './ui';

/** Daha önce yüklenmiş fotoğraf (adres) ya da yeni seçilmiş, henüz yüklenmemiş fotoğraf. */
export type PhotoItem = string | Photo;
const uriOf = (p: PhotoItem) => (typeof p === 'string' ? p : p.uri);

/** Yeni seçilenleri yükler, hepsinin adresini döndürür. */
export async function uploadAll(items: PhotoItem[], folder: string): Promise<string[]> {
  return Promise.all(items.map((p) => (typeof p === 'string' ? p : api.uploadPhoto(p, folder))));
}

type Props = { label: string; value: PhotoItem[]; onChange: (v: PhotoItem[]) => void; max?: number };

/** Galeriden veya kameradan fotoğraf ekleme alanı. */
export function PhotoField({ label, value, onChange, max = 1 }: Props) {
  const [error, setError] = useState<string | null>(null);

  const pick = async (fromCamera: boolean) => {
    setError(null);
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Kamera izni verilmedi.');
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled) onChange(max === 1 ? [res.assets[0]] : [...value, res.assets[0]].slice(0, max));
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      {value.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {value.map((p, i) => (
            <View key={`${uriOf(p)}-${i}`}>
              <Image source={{ uri: uriOf(p) }} style={max === 1 ? { width: 280, height: 180, borderRadius: 14 } : { width: 100, height: 100, borderRadius: 12 }} resizeMode="cover" accessibilityLabel="Seçilen fotoğraf" />
              <Pressable
                onPress={() => onChange(value.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel="Fotoğrafı kaldır"
                hitSlop={10}
                style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' }}
              >
                <X color={C.text} size={16} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {(max === 1 || value.length < max) && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn label="Galeri" icon={ImagePlus} onPress={() => pick(false)} />
          <Btn label="Kamera" icon={Camera} onPress={() => pick(true)} />
        </View>
      )}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
