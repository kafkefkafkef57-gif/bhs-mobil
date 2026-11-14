import { router } from 'expo-router';
import { Check, FileDown, FileSpreadsheet, ShieldCheck, ShieldOff, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate } from '../lib/format';
import { C } from '../lib/theme';
import { Profile, Status } from '../lib/types';
import { useLive } from '../lib/useLive';
import { Badge, Btn, Card, confirm, ErrorText, s } from '../lib/ui';

const STATUS: Record<Status, { label: string; fg: string; bg: string }> = {
  pending: { label: 'Onay bekliyor', fg: C.amber, bg: C.amberBg },
  approved: { label: 'Onaylı', fg: C.green, bg: C.greenBg },
  rejected: { label: 'Reddedildi', fg: C.red, bg: C.redBg },
};

function UserCard({ user, isSelf, canSetRole }: { user: Profile; isSelf?: boolean; canSetRole?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const setRole = (role: Profile['role']) =>
    confirm(role === 'admin' ? 'Yöneticilik verilsin mi?' : 'Yöneticilik alınsın mı?', role === 'admin' ? `${user.full_name} kayıt onaylayabilecek, çalışma programı yükleyebilecek ve aylık rapor alabilecek.` : `${user.full_name} yönetici paneline artık erişemeyecek.`, () => api.setUserRole(user.id, role).catch((e) => setError(e.message)));
  const st = STATUS[user.status];
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', flex: 1 }}>{user.full_name}</Text>
        <Badge {...(user.role === 'admin' ? { label: 'Yönetici', fg: C.violet, bg: C.violetBg } : st)} />
      </View>
      <Text style={s.muted}>
        {user.email}
        {'\n'}
        {user.phone}
        {'\n'}Kayıt: {formatDate(user.created_at)}
      </Text>
      {!isSelf && user.role !== 'admin' && (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {user.status !== 'approved' && (
            <Btn label="Onayla" icon={Check} variant="primary" style={{ flex: 1 }} onPress={() => api.setUserStatus(user.id, 'approved')} />
          )}
          {user.status !== 'rejected' && (
            <Btn
              label={user.status === 'approved' ? 'Erişimi Kaldır' : 'Reddet'}
              icon={X}
              variant="danger"
              style={{ flex: 1 }}
              onPress={() => api.setUserStatus(user.id, 'rejected')}
            />
          )}
        </View>
      )}
      {canSetRole && !isSelf && user.status === 'approved' && (
        <Btn label={user.role === 'admin' ? 'Yöneticilikten Çıkar' : 'Yönetici Yap'} icon={user.role === 'admin' ? ShieldOff : ShieldCheck} onPress={() => setRole(user.role === 'admin' ? 'user' : 'admin')} />
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

export default function Yonetici() {
  const { profile } = useAuth();
  const { data: users, error } = useLive(() => api.listUsers(), ['profiles'], [] as Profile[]);
  const pending = users.filter((u) => u.status === 'pending');
  // Uygulama sahibi: ilk kayıt olan kişi. Yöneticilik verme / alma yalnızca onda görünür.
  const ownerId = [...users].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))[0]?.id;
  const isOwner = !!profile && profile.id === ownerId;
  const others = users.filter((u) => u.status !== 'pending');
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <ErrorText>{error}</ErrorText>
      <Btn label="Çalışma Programı Yükle (Excel)" icon={FileSpreadsheet} onPress={() => router.push('/plan-yukle')} />
      <Btn label="Aylık Rapor (PDF)" icon={FileDown} onPress={() => router.push('/aylik-rapor')} />
      <Text style={s.h2}>Onay Bekleyenler ({pending.length})</Text>
      {pending.length === 0 && <Text style={s.muted}>Onay bekleyen kayıt yok.</Text>}
      {pending.map((u) => (
        <UserCard key={u.id} user={u} />
      ))}
      <Text style={[s.h2, { marginTop: 8 }]}>Tüm Kullanıcılar ({others.length})</Text>
      {others.map((u) => (
        <UserCard key={u.id} user={u} isSelf={u.id === profile?.id} canSetRole={isOwner} />
      ))}
    </ScrollView>
  );
}
