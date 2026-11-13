import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { KeyboardPad } from '../../lib/KeyboardPad';
import { api } from '../../lib/api';
import { Btn, ErrorText, Field, s } from '../../lib/ui';

export default function Kayit() {
  const [f, setF] = useState({ first: '', last: '', phone: '', email: '', password: '', again: '' });
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!f.first.trim() || !f.last.trim() || !f.phone.trim() || !f.email.trim()) return setError('Tüm alanları doldurun.');
    if (f.password.length < 6) return setError('Şifre en az 6 karakter olmalı.');
    if (f.password !== f.again) return setError('Şifreler birbiriyle aynı değil.');
    setBusy(true);
    setError(null);
    try {
      await api.signUp({ full_name: `${f.first.trim()} ${f.last.trim()}`, phone: f.phone, email: f.email, password: f.password });
      // Oturum açıldıysa uygulama kendiliğinden "onay bekleniyor" ekranına geçer.
      setSent(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardPad style={s.screen}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.muted}>Kaydınız yönetici tarafından onaylandıktan sonra uygulamaya giriş yapabilirsiniz.</Text>
        <Field label="Ad" value={f.first} onChangeText={set('first')} autoComplete="given-name" />
        <Field label="Soyad" value={f.last} onChangeText={set('last')} autoComplete="family-name" />
        <Field label="Telefon" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" autoComplete="tel" />
        <Field label="E-posta" value={f.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Şifre" value={f.password} onChangeText={set('password')} secureTextEntry />
        <Field label="Şifre (tekrar)" value={f.again} onChangeText={set('again')} secureTextEntry />
        <ErrorText>{error}</ErrorText>
        {sent && <Text style={s.muted}>Kaydınız alındı. E-postanıza doğrulama bağlantısı geldiyse onaylayıp giriş yapın.</Text>}
        <Btn label="Kayıt Oluştur" variant="primary" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardPad>
  );
}
