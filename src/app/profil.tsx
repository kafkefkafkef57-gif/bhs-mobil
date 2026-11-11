import { LogOut } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';
import { Badge, Btn, Card, s } from '../lib/ui';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 17 }}>{value || '—'}</Text>
    </View>
  );
}

export default function Profil() {
  const { profile } = useAuth();
  if (!profile) return null;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Card style={{ gap: 14 }}>
        {profile.role === 'admin' && <Badge label="Yönetici" fg={C.violet} bg={C.violetBg} />}
        <Row label="Ad Soyad" value={profile.full_name} />
        <Row label="Telefon" value={profile.phone} />
        <Row label="E-posta" value={profile.email} />
      </Card>
      <Btn label="Çıkış Yap" icon={LogOut} variant="danger" onPress={() => api.signOut()} />
    </ScrollView>
  );
}
