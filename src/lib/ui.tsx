import { LucideIcon } from 'lucide-react-native';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { C } from './theme';
import { Importance } from './types';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

type BtnProps = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'primary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};
export function Btn({ label, onPress, icon: Icon, variant = 'default', loading, disabled, style }: BtnProps) {
  const bg = variant === 'primary' ? C.seg : variant === 'danger' ? C.redBg : C.cardHi;
  const fg = variant === 'danger' ? C.red : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : Icon ? <Icon color={fg} size={18} /> : null}
      <Text style={[s.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, style, ...rest }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#6b6b73"
        style={[s.input, rest.multiline && { minHeight: 110, textAlignVertical: 'top' }, style]}
        {...rest}
      />
    </View>
  );
}

export const IMPORTANCE: Record<Importance, { label: string; short: string; fg: string; bg: string }> = {
  normal: { label: 'Bilgilendirme / Normal', short: 'Normal', fg: C.green, bg: C.greenBg },
  onemli: { label: 'Uyarı / Önemli', short: 'Önemli', fg: C.amber, bg: C.amberBg },
  acil: { label: 'Kritik / Acil', short: 'Acil', fg: C.red, bg: C.redBg },
};

export function Badge({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </View>
  );
}

/** Yan yana seçenekler (filtreler için); sığmazsa yana kayar. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.segWrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.label} style={[s.segItem, on && { backgroundColor: C.bg, borderColor: C.border }]}>
            <Text style={{ color: on ? C.text : C.muted, fontSize: 15, fontWeight: '700' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  return children ? <Text style={{ color: C.red, fontSize: 14 }}>{children}</Text> : null;
}

/** Onay penceresi (web önizlemesinde de çalışır). */
export function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Evet', onPress: onYes },
  ]);
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 18 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 14,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { color: C.muted, fontSize: 14 },
  input: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 16,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  segWrap: { backgroundColor: C.cardHi, borderRadius: 14, padding: 4, gap: 2 },
  segItem: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: 'transparent' },
  h1: { color: C.text, fontSize: 26, fontWeight: '800' },
  h2: { color: C.text, fontSize: 21, fontWeight: '800' },
  muted: { color: C.muted, fontSize: 15, lineHeight: 21 },
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, gap: 16 },
});
