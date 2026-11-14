import { Text, View } from 'react-native';
import { C } from './theme';

/** Geliştirici imzası: K.Ç.K TECHNOLOGY */
export function Brand() {
  return (
    <View accessible accessibilityRole="text" accessibilityLabel="K.Ç.K Technology" style={{ alignItems: 'center', gap: 10, paddingVertical: 22, borderRadius: 18, borderWidth: 1, borderColor: '#2b3a55', backgroundColor: '#141a26' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 34, height: 2, backgroundColor: '#3b82f6' }} />
        <Text style={{ fontSize: 30, fontWeight: '900', letterSpacing: 4, color: C.text }}>
          K<Text style={{ color: '#3b82f6' }}>.</Text>Ç<Text style={{ color: '#ef4444' }}>.</Text>K
        </Text>
        <View style={{ width: 34, height: 2, backgroundColor: '#ef4444' }} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 7, color: '#8fb4ff' }}>TECHNOLOGY</Text>
    </View>
  );
}
