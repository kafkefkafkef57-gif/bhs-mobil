import { Image, Text, View } from 'react-native';
import { KINDS, time } from './shiftReport';
import { C } from './theme';
import { ShiftEntry } from './types';
import { Badge, Card, s } from './ui';

export function EntryCard({ entry }: { entry: ShiftEntry }) {
  const k = KINDS[entry.kind];
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Badge label={k.label} fg={k.fg} bg={k.bg} />
        <Text style={[s.muted, { fontSize: 13 }]}>
          {time(entry.created_at)} · {entry.author_name ?? '—'} · {entry.team}
        </Text>
      </View>
      <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>{entry.title}</Text>
      {!!entry.body && <Text style={{ color: C.text, fontSize: 15, lineHeight: 22 }}>{entry.body}</Text>}
      {!!entry.photo_url && <Image source={{ uri: entry.photo_url }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" accessibilityLabel="Paylaşım fotoğrafı" />}
    </Card>
  );
}
