import { router } from 'expo-router';
import { LogOut, LucideIcon, MoreHorizontal, Settings, ShieldCheck, User } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from './api';
import { useAuth } from './auth';
import { C } from './theme';
import { Profile } from './types';
import { useLive } from './useLive';
import { s } from './ui';

/** Sağ üstteki üç nokta düğmesi ve açtığı menü (profil, ayarlar, yönetici paneli, çıkış). */
export function MenuButton() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [open, setOpen] = useState(false);
  const users = useLive(() => (isAdmin ? api.listUsers() : Promise.resolve([] as Profile[])), ['profiles'], [] as Profile[]);
  const pending = users.data.filter((u) => u.status === 'pending').length;

  const go = (href: Parameters<typeof router.push>[0]) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Menü" style={st.btn}>
        <MoreHorizontal color={C.text} size={22} />
        {pending > 0 && <View style={st.dot} />}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Menüyü kapat">
          <SafeAreaView>
            <View style={st.menu}>
              <Text style={[s.muted, { paddingHorizontal: 14, paddingVertical: 8 }]} numberOfLines={1}>
                {profile?.full_name}
              </Text>
              <Item icon={User} label="Kişisel Profil" onPress={() => go('/profil')} />
              <Item icon={Settings} label="Ayarlar" onPress={() => go('/ayarlar')} />
              {isAdmin && <Item icon={ShieldCheck} label={`Yönetici Paneli${pending ? ` (${pending})` : ''}`} onPress={() => go('/yonetici')} />}
              <Item
                icon={LogOut}
                label="Çıkış Yap"
                danger
                onPress={() => {
                  setOpen(false);
                  api.signOut();
                }}
              />
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}

function Item({ icon: Icon, label, onPress, danger }: { icon: LucideIcon; label: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? C.red : C.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="menuitem" style={({ pressed }) => [st.item, pressed && { backgroundColor: C.cardHi }]}>
      <Icon color={color} size={20} />
      <Text style={{ color, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  btn: { width: 46, height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: C.amber },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-end' },
  menu: { marginTop: 66, marginRight: 18, minWidth: 230, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 16, padding: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 46, borderRadius: 10 },
});

/** Sekme ekranlarının üst kısmı: solda başlık, sağda menü düğmesi. */
export function PageHeader({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[s.h1, { flex: 1 }]}>{title}</Text>
      <MenuButton />
    </View>
  );
}
