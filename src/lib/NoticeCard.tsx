import { Check, Pencil } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';
import { formatDate } from './format';
import { C } from './theme';
import { Notice } from './types';
import { Badge, Btn, Card, IMPORTANCE, s } from './ui';

type Props = { notice: Notice; onEdit?: () => void; onComplete?: () => void };

export function NoticeCard({ notice, onEdit, onComplete }: Props) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Badge {...IMPORTANCE[notice.importance]} />
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', flexShrink: 1 }}>{notice.title}</Text>
      </View>
      {!!notice.body && <Text style={{ color: C.text, fontSize: 16, lineHeight: 22 }}>{notice.body}</Text>}
      {!!notice.photo_url && (
        <Image source={{ uri: notice.photo_url }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" accessibilityLabel="Bildiri fotoğrafı" />
      )}
      {(onEdit || onComplete) && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {onEdit && <Btn label="Düzenle" icon={Pencil} onPress={onEdit} />}
          {onComplete && <Btn label="Tamamlandı" icon={Check} onPress={onComplete} />}
        </View>
      )}
      <View>
        <Text style={s.muted}>
          Yayınlandı: <Text style={{ color: C.text }}>{formatDate(notice.created_at)}</Text>
          {notice.author_name ? ` · ${notice.author_name}` : ''}
        </Text>
        {notice.completed_at && (
          <Text style={s.muted}>
            Tamamlandı: <Text style={{ color: C.text }}>{formatDate(notice.completed_at)}</Text>
          </Text>
        )}
      </View>
    </Card>
  );
}
