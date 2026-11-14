import Constants from 'expo-constants';
import { Image, ScrollView, Text, View } from 'react-native';
import { Brand } from '../lib/Brand';
import { C } from '../lib/theme';
import { Card, s } from '../lib/ui';

export default function Ayarlar() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Image source={require('../../assets/logo.png')} style={{ width: 64, height: 64, borderRadius: 14 }} accessibilityLabel="BHS Mobil logosu" />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: C.text, fontSize: 19, fontWeight: '800' }}>BHS MOBİL</Text>
          <Text style={s.muted}>Sürüm {version}</Text>
        </View>
      </Card>
      <Text style={[s.muted, { fontSize: 13 }]}>Vardiya ve ekip bilginizi Kişisel Profil sayfasından değiştirebilirsiniz.</Text>
      <Brand />
    </ScrollView>
  );
}
