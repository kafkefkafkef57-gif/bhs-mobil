import { LogOut } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { ShiftTeamPicker } from '../lib/ShiftTeamPicker';
import { Department, Shift } from '../lib/types';
import { Btn, ErrorText, s } from '../lib/ui';

/** Vardiyası ya da ekibi kayıtlı olmayan (eski) hesaplar uygulamaya girmeden önce bunları seçer. */
export default function VardiyaSec() {
  const { profile, refresh } = useAuth();
  const [shift, setShift] = useState<Shift | null>(profile?.shift ?? null);
  const [team, setTeam] = useState<Department | null>(profile?.team ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!shift || !team) return setError('Vardiyanızı ve ekibinizi seçin.');
    setBusy(true);
    setError(null);
    try {
      await api.setMyShift(shift, team);
      await refresh();
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: 'center' }]}>
        <Text style={s.h1}>Vardiya ve ekibinizi seçin</Text>
        <Text style={s.muted}>Girdiğiniz arıza, bakım ve paylaşımlar bu vardiya ve ekibe işlenir. Daha sonra profilinizden değiştirebilirsiniz.</Text>
        <ShiftTeamPicker shift={shift} team={team} onShift={setShift} onTeam={setTeam} />
        <ErrorText>{error}</ErrorText>
        <Btn label="Devam Et" variant="primary" onPress={submit} loading={busy} />
        <Btn label="Çıkış Yap" icon={LogOut} onPress={() => api.signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
