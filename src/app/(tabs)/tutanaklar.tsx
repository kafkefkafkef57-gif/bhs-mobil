import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { formatDateLong } from '../../lib/format';
import { PageHeader } from '../../lib/MenuButton';
import { C } from '../../lib/theme';
import { Report } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Btn, Card, ErrorText, s } from '../../lib/ui';

export default function Tutanaklar() {
  const { data, error } = useLive(() => api.listReports(), ['reports'], [] as Report[]);
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]}>
        <PageHeader title="Tutanaklar" />
        <Btn label="Yeni tutanak" icon={Plus} variant="primary" onPress={() => router.push('/tutanak/duzenle')} style={{ alignSelf: 'flex-start' }} />
        <ErrorText>{error}</ErrorText>
        {data.length === 0 && !error ? (
          <Card>
            <Text style={s.muted}>Henüz tutanak yok.</Text>
          </Card>
        ) : (
          <Card style={{ padding: 6 }}>
            {data.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push({ pathname: '/tutanak/[id]', params: { id: r.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [{ padding: 12, borderRadius: 12, gap: 4 }, pressed && { backgroundColor: C.cardHi }]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {r.staff_name}
                  </Text>
                  <Text style={s.muted}>{formatDateLong(r.incident_at)}</Text>
                </View>
                <Text style={s.muted} numberOfLines={1}>
                  #{r.no} · {r.company} · {r.officer} · {r.summary}
                </Text>
              </Pressable>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
