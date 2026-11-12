import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { C } from '../lib/theme';

function Nav() {
  const { loading, profile } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={C.text} />
      </View>
    );
  }
  const approved = profile?.status === 'approved';
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: C.bg },
      }}
    >
      <Stack.Protected guard={!profile}>
        <Stack.Screen name="(auth)/giris" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/kayit" options={{ title: 'Kayıt Ol' }} />
      </Stack.Protected>
      <Stack.Protected guard={!!profile && !approved}>
        <Stack.Screen name="onay-bekleniyor" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={approved}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="bildiri/duzenle" options={{ title: 'Bildiri' }} />
        <Stack.Screen name="bildiri/arsiv" options={{ title: 'Bildiri Arşivi' }} />
        <Stack.Screen name="modul/[slug]" options={{ title: '' }} />
        <Stack.Screen name="operasyon-takip" options={{ title: '' }} />
        <Stack.Screen name="ucus" options={{ title: '' }} />
        <Stack.Screen name="personel/[id]" options={{ title: 'Personel' }} />
        <Stack.Screen name="tutanak/[id]" options={{ title: 'Tutanak' }} />
        <Stack.Screen name="tutanak/duzenle" options={{ title: 'Tutanak' }} />
        <Stack.Screen name="profil" options={{ title: 'Kişisel Profil' }} />
        <Stack.Screen name="ayarlar" options={{ title: 'Ayarlar' }} />
        <Stack.Protected guard={profile?.role === 'admin'}>
          <Stack.Screen name="yonetici" options={{ title: 'Yönetici Paneli' }} />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Nav />
    </AuthProvider>
  );
}
