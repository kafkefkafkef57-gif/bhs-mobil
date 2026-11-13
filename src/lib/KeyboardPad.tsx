import { ReactNode, useEffect, useState } from 'react';
import { Keyboard, Platform, StyleProp, View, ViewStyle } from 'react-native';

/** Ekran klavyesinin o anki yüksekliği (kapalıyken 0). */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    // iOS'ta klavye açılırken, Android'de açıldıktan sonra haber verilir.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/**
 * Ekranı tam kaplayan kapsayıcı: klavye açılınca altına klavye yüksekliği kadar boşluk bırakır.
 * Böylece içindeki kaydırılabilir alan küçülür ve yazılan alan klavyenin üstünde kalır.
 * (Android'de uygulama ekranı uçtan uca kapladığı için pencere kendiliğinden küçülmüyor.)
 */
export function KeyboardPad({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const height = useKeyboardHeight();
  return <View style={[{ flex: 1 }, style, { paddingBottom: height }]}>{children}</View>;
}
