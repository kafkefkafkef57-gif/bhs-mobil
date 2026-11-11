import { Tabs } from 'expo-router';
import { CalendarDays, FileText, LayoutGrid, LucideIcon, MapPin, TriangleAlert } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../../lib/theme';

const TABS: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: '🏠 Ana Ekran', icon: LayoutGrid },
  personel: { label: '👷 Personel', icon: MapPin },
  vardiya: { label: '🕒 Vardiya', icon: CalendarDays },
  arizalar: { label: '🚨 Arızalar', icon: TriangleAlert },
  tutanaklar: { label: '📝 Tutanaklar', icon: FileText },
};

/** Ekranın altında yüzen, yana kaydırılabilen sekme çubuğu. */
function TabBar({ state, navigateToTab }: { state: any; navigateToTab: (routeKey: string) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.wrap, { bottom: insets.bottom + 12 }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.row}>
        {state.routes.map((route: any, i: number) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const active = state.index === i;
          const Icon = tab.icon;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => navigateToTab(route.key)}
              style={[st.item, active && st.active]}
            >
              <Icon color={active ? '#a9b4c6' : C.muted} size={24} />
              <Text numberOfLines={1} style={[st.label, active && { color: '#c3ccda' }]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="personel" />
      <Tabs.Screen name="vardiya" />
      <Tabs.Screen name="arizalar" />
      <Tabs.Screen name="tutanaklar" />
    </Tabs>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#1b1b1d',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 36,
    overflow: 'hidden',
  },
  row: { padding: 5, gap: 2 },
  item: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 14, height: 60, borderRadius: 30, minWidth: 84 },
  active: { backgroundColor: '#30343b' },
  label: { color: C.muted, fontSize: 12, fontWeight: '600' },
});
