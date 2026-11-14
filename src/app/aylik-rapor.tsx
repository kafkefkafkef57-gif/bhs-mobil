import { ChevronLeft, ChevronRight, FileDown } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { loadMonth, MonthlyData, monthlyHtml, monthSummary, monthTitle } from '../lib/monthlyReport';
import { shareHtmlAsPdf } from '../lib/shiftReport';
import { C } from '../lib/theme';
import { Btn, Card, ErrorText, s } from '../lib/ui';

/** Yönetici: seçilen ayın tüm kayıtlarını tek PDF'te toplar. */
export default function AylikRapor() {
  const { profile } = useAuth();
  const [view, setView] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() }));
  const [data, setData] = useState<MonthlyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    loadMonth(view.y, view.m)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [view]);

  const move = (step: number) => {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.muted}>Seçilen ayda girilen tüm arızalar, bildiriler, tutanaklar, bakımlar, vardiya paylaşımları, görevler ve gümrük uçuşları tek bir PDF'te toplanır.</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="Önceki ay" style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft color={C.text} size={22} />
        </Pressable>
        <Text style={s.h1}>{monthTitle({ year: view.y, month: view.m })}</Text>
        <Pressable onPress={() => move(1)} accessibilityRole="button" accessibilityLabel="Sonraki ay" style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight color={C.text} size={22} />
        </Pressable>
      </View>
      <ErrorText>{error}</ErrorText>
      {!data && !error && <ActivityIndicator color={C.text} />}
      {data && (
        <>
          <Card style={{ gap: 8 }}>
            {monthSummary(data).map(([label, n]) => (
              <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.muted}>{label}</Text>
                <Text style={{ color: C.text, fontSize: 16, fontWeight: '800' }}>{n}</Text>
              </View>
            ))}
          </Card>
          <Btn
            label="PDF olarak paylaş"
            icon={FileDown}
            variant="primary"
            onPress={() => shareHtmlAsPdf(monthlyHtml(data, profile?.full_name ?? ''), `BHS aylık rapor ${monthTitle(data)}`).catch((e) => setError(e?.message ?? 'PDF oluşturulamadı.'))}
          />
        </>
      )}
    </ScrollView>
  );
}
