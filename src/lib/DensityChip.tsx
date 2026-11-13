import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { api } from './api';
import { C } from './theme';
import { Fault } from './types';
import { useLive } from './useLive';

const WINDOW_MS = 3 * 60 * 60 * 1000;

/** Son 3 saatteki toplam arıza sayısına göre yoğunluk seviyesi. */
export function densityLevel(count: number) {
  if (count >= 20) return { label: 'Çok Yoğun', color: C.red };
  if (count >= 16) return { label: 'Az Yoğun', color: '#ff9f43' };
  if (count >= 11) return { label: 'Normal', color: C.amber };
  if (count >= 5) return { label: 'Sakin', color: '#7ddc8a' };
  return { label: 'Çok Sakin', color: C.green };
}

/** Ana ekranın üstündeki yoğunluk göstergesi: renkli halka + seviye adı. */
export function DensityChip() {
  const faults = useLive(() => api.listFaults(new Date(Date.now() - WINDOW_MS)), ['faults'], [] as Fault[]);
  // Yeni arıza gelmese de eski arızalar 3 saatlik pencereden çıksın diye 5 dakikada bir yenile.
  const { reload } = faults;
  useEffect(() => {
    const t = setInterval(reload, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [reload]);

  const count = faults.data.length;
  const { label, color } = densityLevel(count);
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`Yoğunluk: ${label}. Son 3 saatte ${count} arıza`} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, height: 46 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 3.5, borderColor: color, backgroundColor: `${color}22` }} />
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}
