import { Maximize2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from './theme';
import { Line, LINE_NAME } from './types';
import { s } from './ui';

// Sabit hat şemaları (genişlik / yükseklik oranlarıyla).
const SCHEMAS: Record<Line, { source: number; ratio: number }> = {
  dogu: { source: require('../../assets/hat-dogu.jpg'), ratio: 2000 / 1162 },
  bati: { source: require('../../assets/hat-bati.jpg'), ratio: 2000 / 1258 },
};

/** Hat şeması; dokununca büyütülmüş, iki yöne kaydırılabilir hali açılır. */
export function LineSchema({ line }: { line: Line }) {
  const { source, ratio } = SCHEMAS[line];
  const [open, setOpen] = useState(false);
  const [boxWidth, setBoxWidth] = useState(0); // kutunun gerçek genişliği; yükseklik orana göre hesaplanır
  const { width, height } = useWindowDimensions();
  // Büyük görünüm: şema ekran yüksekliğinin çoğunu kaplasın, yana kaydırılarak gezilsin.
  const bigHeight = Math.max(height * 0.7, 320);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${LINE_NAME[line]} şeması, büyütmek için dokunun`}
        style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', height: boxWidth / ratio }}
      >
        <Image source={source} style={{ width: boxWidth, height: boxWidth / ratio }} resizeMode="contain" />
        <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10, padding: 6 }}>
          <Maximize2 color="#fff" size={16} />
        </View>
      </Pressable>
      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
            <Text style={s.h2}>{LINE_NAME[line]} şeması</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Kapat" hitSlop={12} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <X color={C.text} size={24} />
            </Pressable>
          </View>
          <ScrollView horizontal contentContainerStyle={{ alignItems: 'center', backgroundColor: '#fff', minWidth: width }}>
            <Image source={source} style={{ height: bigHeight, width: bigHeight * ratio }} resizeMode="contain" />
          </ScrollView>
          <Text style={[s.muted, { textAlign: 'center', padding: 12, fontSize: 13 }]}>Şemayı gezmek için yana kaydırın.</Text>
        </SafeAreaView>
      </Modal>
    </>
  );
}
