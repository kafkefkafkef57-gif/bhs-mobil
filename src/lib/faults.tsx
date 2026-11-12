import { Text, View } from 'react-native';
import { formatDate } from './format';
import { C } from './theme';
import { Fault, LINE_NAME } from './types';
import { Badge, s } from './ui';

/** Haftalık arıza sayısına göre bölge rengi: 0–10 yeşil, 11–19 turuncu, 20 ve üstü kırmızı. */
export function zoneTone(count: number) {
  if (count >= 20) return { fg: C.red, bg: '#3a1818', border: '#7a2e2e' };
  if (count > 10) return { fg: '#ff9f43', bg: '#3a2a12', border: '#7a5520' };
  return { fg: C.green, bg: '#14301f', border: '#24553a' };
}

/** Arıza listelerinde kullanılan satır içeriği. */
export function FaultRow({ fault }: { fault: Fault }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', flex: 1 }}>{fault.zone_name} arızası</Text>
        <Badge label={fault.company} fg="#34d399" bg="#1d4238" />
      </View>
      <Text style={s.muted}>
        {formatDate(fault.created_at)} · {fault.author_name ?? '—'}
      </Text>
      <Text style={[s.muted, { fontSize: 13 }]}>
        {LINE_NAME[fault.line]} · {fault.shift} Vardiyası · {fault.team}
      </Text>
      {!!fault.description && (
        <Text style={{ color: C.text, fontSize: 15 }} numberOfLines={2}>
          {fault.description}
        </Text>
      )}
    </View>
  );
}
