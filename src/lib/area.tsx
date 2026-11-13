import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

export type Area = 'operasyon' | 'teknik';
const KEY = 'calisma-alani';
const Ctx = createContext<{ area: Area; setArea: (a: Area) => void }>({ area: 'operasyon', setArea: () => {} });
export const useArea = () => useContext(Ctx);

/** Seçili çalışma alanı (Operasyon / Teknik): ana ekrandaki kartları ve alt sekme çubuğunu belirler; son seçim hatırlanır. */
export function AreaProvider({ children }: { children: ReactNode }) {
  const [area, set] = useState<Area>('operasyon');
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'teknik' || v === 'operasyon') && set(v))
      .catch(() => {});
  }, []);
  const setArea = useCallback((a: Area) => {
    set(a);
    AsyncStorage.setItem(KEY, a).catch(() => {});
  }, []);
  return <Ctx.Provider value={{ area, setArea }}>{children}</Ctx.Provider>;
}
