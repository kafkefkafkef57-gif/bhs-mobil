import { Text, View } from 'react-native';
import { ShiftPicker } from './ShiftPicker';
import { Department, Shift } from './types';
import { s, Segmented } from './ui';

const TEAMS: { value: Department; label: string }[] = [
  { value: 'Operasyon', label: 'Operasyon' },
  { value: 'Teknik', label: 'Teknik' },
];

type Props = { shift: Shift | null; team: Department | null; onShift: (v: Shift) => void; onTeam: (v: Department) => void };

/** Kişinin vardiyası (A-D) ve ekibi (Operasyon / Teknik). */
export function ShiftTeamPicker({ shift, team, onShift, onTeam }: Props) {
  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>Vardiyanız</Text>
        <ShiftPicker value={(shift ?? '') as Shift} onChange={onShift} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>Ekibiniz</Text>
        <Segmented options={TEAMS} value={(team ?? '') as Department} onChange={onTeam} />
      </View>
    </>
  );
}
