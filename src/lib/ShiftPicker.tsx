import { Pressable, Text, View } from 'react-native';
import { SHIFTS } from './shiftReport';
import { C } from './theme';
import { Shift } from './types';

/** A-B-C-D vardiya seçimi; allowAll verilirse başa "Tümü" eklenir. */
export function ShiftPicker<T extends Shift | 'all'>({ value, onChange, allowAll }: { value: T; onChange: (v: T) => void; allowAll?: boolean }) {
  const options = (allowAll ? ['all', ...SHIFTS] : SHIFTS) as T[];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((v) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={v === 'all' ? 'Tüm vardiyalar' : `${v} Vardiyası`}
            style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: on ? C.seg : C.border, backgroundColor: on ? C.seg : C.card }}
          >
            <Text style={{ color: C.text, fontSize: v === 'all' ? 14 : 17, fontWeight: '800' }}>{v === 'all' ? 'Tümü' : v}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
