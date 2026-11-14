import { LogOut, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';
import { Brand } from '../lib/Brand';
import { ShiftTeamPicker } from '../lib/ShiftTeamPicker';
import { Department, Shift } from '../lib/types';
import { Badge, Btn, Card, confirm, ErrorText, s } from '../lib/ui';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 17 }}>{value || '—'}</Text>
    </View>
  );
}

export default function Profil() {
  const { profile, refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  if (!profile) return null;
  // Seçim yapılır yapılmaz kaydedilir; eksik olan taraf için mevcut değer (ya da varsayılan) kullanılır.
  const save = async (shift: Shift, team: Department) => {
    try {
      await api.setMyShift(shift, team);
      await refresh();
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Card style={{ gap: 14 }}>
        {profile.role === 'admin' && <Badge label="Yönetici" fg={C.violet} bg={C.violetBg} />}
        <Row label="Ad Soyad" value={profile.full_name} />
        <Row label="Telefon" value={profile.phone} />
        <Row label="E-posta" value={profile.email} />
      </Card>
      <Card style={{ gap: 14 }}>
        <Text style={s.h2}>Vardiya ve ekip</Text>
        <Text style={s.muted}>Girdiğiniz arıza, bakım ve paylaşımlar bu vardiya ve ekibe işlenir. Vardiyanız değişirse buradan güncelleyin.</Text>
        <ShiftTeamPicker shift={profile.shift} team={profile.team} onShift={(v) => save(v, profile.team ?? 'Operasyon')} onTeam={(v) => save(profile.shift ?? 'A', v)} />
        <ErrorText>{error}</ErrorText>
      </Card>
      <Btn label="Çıkış Yap" icon={LogOut} onPress={() => api.signOut()} />
      <Card style={{ gap: 10 }}>
        <Text style={s.h2}>Hesabı sil</Text>
        <Text style={s.muted}>Hesabınız ve kişisel bilgileriniz (ad, telefon, e-posta) kalıcı olarak silinir; bu işlem geri alınamaz. Daha önce girdiğiniz kayıtlar "Silinen kullanıcı" adıyla kalır.</Text>
        <Btn
          label="Hesabımı Sil"
          icon={Trash2}
          variant="danger"
          onPress={() => confirm('Hesabınız silinsin mi?', 'Hesabınız ve kişisel bilgileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.', () => api.deleteMyAccount().catch((e) => setError(e.message)))}
        />
      </Card>
      <Brand />
    </ScrollView>
  );
}
