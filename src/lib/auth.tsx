import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { Profile } from './types';

type Auth = { loading: boolean; profile: Profile | null; refresh: () => Promise<void> };
const Ctx = createContext<Auth>({ loading: true, profile: null, refresh: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const refresh = useCallback(async () => {
    try {
      setProfile(await api.currentProfile());
    } catch {
      // bağlantı hatasında mevcut oturum bilgisi korunur
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return api.onAuthChange(refresh);
  }, [refresh]);

  // Yönetici onay verdiğinde bekleyen kullanıcının ekranı kendiliğinden açılsın.
  const id = profile?.id;
  useEffect(() => (id ? api.subscribe(['profiles'], refresh) : undefined), [id, refresh]);

  return <Ctx.Provider value={{ loading, profile, refresh }}>{children}</Ctx.Provider>;
}
