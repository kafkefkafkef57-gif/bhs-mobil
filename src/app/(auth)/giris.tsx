import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { KeyboardPad } from '../../lib/KeyboardPad';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { isDemo } from '../../lib/supabase';
import { C } from '../../lib/theme';
import { Btn, ErrorText, Field, s } from '../../lib/ui';

export default function Giris() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return setError('E-posta ve şifrenizi girin.');
    setBusy(true);
    setError(null);
    try {
      await api.signIn(email, password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardPad style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Text style={{ color: C.text, fontSize: 44, fontWeight: '900', letterSpacing: 1 }}>BHS</Text>
            <Text style={s.muted}>Hesabınıza giriş yapın</Text>
          </View>
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
          <ErrorText>{error}</ErrorText>
          <Btn label="Giriş Yap" variant="primary" onPress={submit} loading={busy} />
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <Text style={s.muted}>Hesabınız yok mu?</Text>
            <Link href="/kayit" style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>
              Kayıt Ol
            </Link>
          </View>
          {isDemo && (
            <Text style={[s.muted, { textAlign: 'center', fontSize: 13, marginTop: 12 }]}>
              Demo modu — yönetici girişi: admin@bhs.app / 123456
            </Text>
          )}
        </ScrollView>
      </KeyboardPad>
    </SafeAreaView>
  );
}
