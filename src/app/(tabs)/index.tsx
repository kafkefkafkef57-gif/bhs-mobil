import { Link, router } from 'expo-router';
import { Archive, Bell, Check, Compass, Plus, TriangleAlert, Wrench, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { DensityChip } from '../../lib/DensityChip';
import { MenuButton } from '../../lib/MenuButton';
import { Module, OPERASYON, TEKNIK } from '../../lib/modules';
import { NoticeCard } from '../../lib/NoticeCard';
import { C } from '../../lib/theme';
import { Notice, Profile } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { WeatherChip } from '../../lib/WeatherChip';
import { Badge, Btn, Card, confirm, ErrorText, s } from '../../lib/ui';

type Area = 'operasyon' | 'teknik';

export default function AnaEkran() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [area, setArea] = useState<Area>('operasyon');

  const notices = useLive(() => api.listNotices(false), ['notices'], [] as Notice[]);
  const faults = useLive(() => api.todayFaultCount(), ['faults'], 0);
  const users = useLive(() => (isAdmin ? api.listUsers() : Promise.resolve([] as Profile[])), ['profiles'], [] as Profile[]);
  const pending = users.data.filter((u) => u.status === 'pending');

  const modules = area === 'operasyon' ? OPERASYON : TEKNIK;
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <WeatherChip />
          <DensityChip />
          <View style={{ flex: 1 }} />
          <MenuButton />
        </View>
        <Text style={{ color: C.text, fontSize: 34, fontWeight: '900', textAlign: 'center' }}>BHS</Text>

        {/* Yöneticiye özel: yeni kayıt bildirimleri */}
        {pending.map((u) => (
          <Card key={u.id} style={{ gap: 10, borderColor: C.amber }}>
            <Text style={{ color: C.text, fontSize: 16, lineHeight: 22 }}>
              <Text style={{ fontWeight: '800' }}>{u.full_name}</Text> kayıt oluşturdu, onayınızı bekliyor.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label="Onayla" icon={Check} variant="primary" style={{ flex: 1 }} onPress={() => api.setUserStatus(u.id, 'approved')} />
              <Btn label="Reddet" icon={X} variant="danger" style={{ flex: 1 }} onPress={() => api.setUserStatus(u.id, 'rejected')} />
            </View>
          </Card>
        ))}

        {/* Ortak bildiri panosu */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Bell color={C.text} size={22} />
          <Text style={s.h1}>Ortak Bildiri Panosu</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn label="Yeni bildiri" icon={Plus} onPress={() => router.push('/bildiri/duzenle')} />
          <Btn label="Bildiri Arşivi" icon={Archive} onPress={() => router.push('/bildiri/arsiv')} />
        </View>
        <ErrorText>{notices.error}</ErrorText>
        {notices.data.length === 0 && !notices.error && (
          <Card>
            <Text style={s.muted}>Panoda aktif bildiri yok.</Text>
          </Card>
        )}
        {notices.data.map((n) => (
          <NoticeCard
            key={n.id}
            notice={n}
            onEdit={() => router.push({ pathname: '/bildiri/duzenle', params: { id: n.id } })}
            onComplete={() =>
              confirm('Bildiri tamamlandı mı?', `"${n.title}" panodan kaldırılıp arşive taşınacak.`, () => api.completeNotice(n.id))
            }
          />
        ))}

        {/* Bugünkü arıza sayacı */}
        <Link href="/arizalar" asChild>
          <Pressable accessibilityRole="button">
            <Card style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.muted}>Bugünkü Arıza</Text>
                <TriangleAlert color={C.muted} size={20} />
              </View>
              <Text style={{ color: C.text, fontSize: 32, fontWeight: '800' }}>{faults.data}</Text>
              <Text style={s.muted}>Bugün kaydedilen</Text>
            </Card>
          </Pressable>
        </Link>

        {/* Çalışma alanı */}
        <Text style={[s.h1, { marginTop: 8 }]}>Çalışma Alanı</Text>
        <View style={st.seg}>
          {(['operasyon', 'teknik'] as Area[]).map((a) => {
            const on = a === area;
            const Icon = a === 'operasyon' ? Compass : Wrench;
            return (
              <Pressable key={a} onPress={() => setArea(a)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[st.segItem, on && { backgroundColor: C.seg }]}>
                <Icon color={C.text} size={18} />
                <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{a === 'operasyon' ? 'Operasyon' : 'Teknik'}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={s.muted}>{area === 'operasyon' ? 'Operasyon ekranları' : 'Teknik ekranları'}</Text>
        {modules.map((m) => (
          <ModuleCard key={m.slug} m={m} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ModuleCard({ m }: { m: Module }) {
  const Icon = m.icon;
  const badge = m.badge === 'Veriler' ? { fg: C.violet, bg: C.violetBg } : m.badge === 'Teknik' ? { fg: '#5eead4', bg: '#1c3f3c' } : { fg: C.amber, bg: C.amberBg };
  return (
    <Link href={m.href} asChild>
      <Pressable accessibilityRole="button">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={[st.icon, { backgroundColor: m.iconBg }]}>
            <Icon color={m.color} size={22} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', flex: 1 }}>{m.title}</Text>
              <Badge label={m.badge} {...badge} />
            </View>
            <Text style={s.muted}>{m.desc}</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

const st = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 8, padding: 5, borderRadius: 18, borderWidth: 1, borderColor: C.border, backgroundColor: '#1b1b1d' },
  segItem: { flex: 1, flexDirection: 'row', gap: 8, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: C.cardHi },
  icon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
