import { Hammer } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { C } from './theme';
import { s } from './ui';

export function Placeholder({ title }: { title: string }) {
  return (
    <View style={[s.screen, s.content, { justifyContent: 'center', alignItems: 'center' }]}>
      <Hammer color={C.muted} size={40} />
      <Text style={[s.h2, { textAlign: 'center' }]}>{title}</Text>
      <Text style={[s.muted, { textAlign: 'center' }]}>Bu bölüm bir sonraki adımda eklenecek.</Text>
    </View>
  );
}
