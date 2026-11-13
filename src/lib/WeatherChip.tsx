import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from './api';
import { toDay } from './format';
import { C } from './theme';
import { fetchWeather, PRECIP_NOTICE, Weather } from './weather';

const REFRESH_MS = 10 * 60 * 1000;
/** Bu oturumda zaten gönderilmiş otomatik uyarılar (her yenilemede tekrar denenmesin). */
const sent = new Set<string>();

/**
 * Ana ekranın sol üstündeki küçük hava durumu göstergesi: simge + derece (Pendik / Kurtköy).
 * Yağmur ya da kar varsa bildiri panosuna günde bir kez otomatik uyarı düşürür.
 */
export function WeatherChip() {
  const [w, setW] = useState<Weather | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchWeather();
      setW(next);
      if (next.precip) {
        // Anahtar gün + yağış türü: aynı gün kaç kişi uygulamayı açarsa açsın tek bildiri oluşur.
        const key = `hava-${next.precip}-${toDay(new Date())}`;
        if (!sent.has(key)) {
          sent.add(key);
          api.createAutoNotice(key, { ...PRECIP_NOTICE[next.precip], importance: 'onemli', photo_url: null }).catch(() => sent.delete(key));
        }
      }
    } catch {
      // Bağlantı yoksa son bilinen değer ekranda kalır.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  if (!w) return <View style={{ height: 46 }} />;
  const Icon = w.icon;
  const tint = w.precip === 'kar' ? '#bfe3ff' : w.precip === 'yagmur' ? '#7fb0ff' : w.isDay && w.code <= 2 ? C.amber : C.muted;
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`Kurtköy hava durumu: ${w.temp} derece, ${w.label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 46 }}>
      <Icon color={tint} size={22} />
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{w.temp}°</Text>
    </View>
  );
}
