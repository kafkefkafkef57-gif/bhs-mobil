import { ScrollView, Text } from 'react-native';
import { api } from '../../lib/api';
import { NoticeCard } from '../../lib/NoticeCard';
import { Notice } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { ErrorText, s } from '../../lib/ui';

export default function Arsiv() {
  const { data, error } = useLive(() => api.listNotices(true), ['notices'], [] as Notice[]);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <ErrorText>{error}</ErrorText>
      {data.length === 0 && !error && <Text style={s.muted}>Henüz tamamlanan bildiri yok.</Text>}
      {data.map((n) => (
        <NoticeCard key={n.id} notice={n} />
      ))}
    </ScrollView>
  );
}
