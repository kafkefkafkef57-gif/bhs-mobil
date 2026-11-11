import { Clock, LogOut, RefreshCw, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { C } from '../lib/theme';
import { Btn, s } from '../lib/ui';

export default function OnayBekleniyor() {
  const { profile, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const rejected = profile?.status === 'rejected';
  const Icon = rejected ? XCircle : Clock;

  return (
    <SafeAreaView style={s.screen}>
      <View style={[s.content, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <Icon color={rejected ? C.red : C.amber} size={56} />
        <Text style={[s.h1, { textAlign: 'center' }]}>{rejected ? 'Kaydınız reddedildi' : 'Onay bekleniyor'}</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>
          {rejected
            ? 'Yönetici kaydınızı onaylamadı. Bir yanlışlık olduğunu düşünüyorsanız yöneticinizle görüşün.'
            : `Merhaba ${profile?.full_name ?? ''}, kaydınız yöneticiye iletildi. Onaylandığında uygulama kendiliğinden açılacak.`}
        </Text>
        {!rejected && (
          <Btn
            label="Durumu Yenile"
            icon={RefreshCw}
            loading={busy}
            onPress={async () => {
              setBusy(true);
              await refresh();
              setBusy(false);
            }}
            style={{ alignSelf: 'stretch' }}
          />
        )}
        <Btn label="Çıkış Yap" icon={LogOut} onPress={() => api.signOut()} style={{ alignSelf: 'stretch' }} />
      </View>
    </SafeAreaView>
  );
}
