import { useLocalSearchParams } from 'expo-router';
import { FileDown } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../../lib/api';
import { EntryCard } from '../../lib/EntryCard';
import { formatDateLong, formatDay } from '../../lib/format';
import { KIND_ORDER, KINDS, shareReportPdf } from '../../lib/shiftReport';
import { C } from '../../lib/theme';
import { ShiftReport } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Btn, Card, ErrorText, s } from '../../lib/ui';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={s.muted}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export default function VardiyaRaporu() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: r, error } = useLive(() => api.getShiftReport(id), [], null as ShiftReport | null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  if (!r) {
    return (
      <View style={[s.screen, s.content]}>
        <ErrorText>{error}</ErrorText>
      </View>
    );
  }
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.content, { paddingBottom: 40 }]}>
      <Text style={s.h1}>BHS Vardiya Raporu</Text>
      <Card style={{ gap: 8 }}>
        <Row label="Tarih" value={formatDay(r.day)} />
        <Row label="Vardiya" value={`${r.shift} Vardiyası`} />
        <Row label="Ekip" value={r.team === 'Tümü' ? 'Tüm ekipler' : r.team} />
        <Row label="Kayıt sayısı" value={String(r.content.length)} />
        <Row label="Oluşturan" value={`${r.author_name ?? '—'} · ${formatDateLong(r.created_at)}`} />
      </Card>
      <Btn label="PDF olarak paylaş" icon={FileDown} variant="primary" onPress={() => shareReportPdf(r).catch((e) => setPdfError(e?.message ?? 'PDF oluşturulamadı.'))} />
      <ErrorText>{pdfError}</ErrorText>
      {r.content.length === 0 && <Text style={s.muted}>Bu vardiyada kayıt girilmemiş.</Text>}
      {KIND_ORDER.map((k) => {
        const items = r.content.filter((e) => e.kind === k);
        if (!items.length) return null;
        return (
          <View key={k} style={{ gap: 10 }}>
            <Text style={s.h2}>
              {KINDS[k].plural} ({items.length})
            </Text>
            {items.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}
