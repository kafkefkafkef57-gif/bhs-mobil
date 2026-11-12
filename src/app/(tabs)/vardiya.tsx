import { router } from 'expo-router';
import { FileDown, FileText, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { DateField } from '../../lib/DateField';
import { EntryCard } from '../../lib/EntryCard';
import { formatDateLong, toDay } from '../../lib/format';
import { PageHeader } from '../../lib/MenuButton';
import { KIND_ORDER, KINDS, loadShiftPrefs, reportTitle, saveShiftPrefs, shareReportPdf } from '../../lib/shiftReport';
import { ShiftPicker } from '../../lib/ShiftPicker';
import { C } from '../../lib/theme';
import { Department, EntryKind, ReportTeam, Shift, ShiftEntry, ShiftReport } from '../../lib/types';
import { useLive } from '../../lib/useLive';
import { Btn, Card, confirm, ErrorText, s, Segmented } from '../../lib/ui';

type Tab = 'akis' | 'arsiv';
const TABS: { value: Tab; label: string }[] = [
  { value: 'akis', label: 'Vardiya Akışı' },
  { value: 'arsiv', label: 'Rapor Arşivi' },
];
const TEAMS: { value: ReportTeam; label: string }[] = [
  { value: 'Operasyon', label: 'Operasyon' },
  { value: 'Teknik', label: 'Teknik' },
  { value: 'Tümü', label: 'Tüm ekipler' },
];
const KIND_FILTERS: { value: EntryKind | 'all'; label: string }[] = [{ value: 'all', label: 'Tümü' }, ...KIND_ORDER.map((k) => ({ value: k, label: KINDS[k].plural }))];

export default function Vardiya() {
  const [tab, setTab] = useState<Tab>('akis');
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]}>
        <PageHeader title="Vardiya Durumu" />
        <Segmented options={TABS} value={tab} onChange={setTab} />
        {tab === 'akis' ? <Akis onReport={() => setTab('arsiv')} /> : <Arsiv />}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Seçilen gün, vardiya ve ekibin gün içindeki tüm paylaşımları. */
function Akis({ onReport }: { onReport: () => void }) {
  const [date, setDate] = useState(() => new Date());
  const [shift, setShift] = useState<Shift>('A');
  const [team, setTeam] = useState<ReportTeam>('Operasyon');
  const [kind, setKind] = useState<EntryKind | 'all'>('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = toDay(date);

  // Son seçilen vardiya ve ekip hatırlanır.
  useEffect(() => {
    loadShiftPrefs().then((p) => p && (setShift(p.shift), setTeam(p.team)));
  }, []);
  useEffect(() => {
    if (team !== 'Tümü') saveShiftPrefs({ shift, team });
  }, [shift, team]);

  const entries = useLive(() => api.listShiftEntries(day, shift, team === 'Tümü' ? undefined : team), ['shift_entries'], [] as ShiftEntry[]);
  useEffect(() => {
    entries.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, shift, team]);
  const shown = entries.data.filter((e) => kind === 'all' || e.kind === kind);
  const label = reportTitle({ day, shift, team });

  const createReport = () =>
    confirm('Vardiya raporu oluşturulsun mu?', `${label}\n${entries.data.length} kayıt rapora eklenecek ve rapor arşive kaydedilecek. Aynı vardiya için önceki rapor varsa yenisiyle değişir.`, async () => {
      setBusy(true);
      setError(null);
      try {
        await api.saveShiftReport(day, shift, team, entries.data);
        onReport();
      } catch (e: any) {
        setError(e.message);
      } finally {
        setBusy(false);
      }
    });

  return (
    <>
      <DateField label="Vardiya tarihi" value={date} onChange={setDate} />
      <View style={{ gap: 6 }}>
        <Text style={s.label}>Vardiya</Text>
        <ShiftPicker value={shift} onChange={setShift} />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={s.label}>Ekip</Text>
        <Segmented options={TEAMS} value={team} onChange={setTeam} />
      </View>

      <Btn
        label="Yeni vardiya paylaşımı"
        icon={Plus}
        variant="primary"
        onPress={() => router.push({ pathname: '/vardiya-paylasim', params: { day, shift, team: team === 'Tümü' ? 'Operasyon' : team } })}
      />

      <Text style={[s.h2, { marginTop: 4 }]}>
        {shift} Vardiyası · {entries.data.length} kayıt
      </Text>
      <Segmented options={KIND_FILTERS} value={kind} onChange={setKind} />
      <ErrorText>{entries.error ?? error}</ErrorText>
      {shown.length === 0 && !entries.error && (
        <Card style={{ alignItems: 'center', gap: 4, paddingVertical: 28 }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>Bu vardiyada kayıt yok</Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>Yeni vardiya paylaşımı ekleyerek ekibinizi bilgilendirin.</Text>
        </Card>
      )}
      {shown.map((e) => (
        <EntryCard key={e.id} entry={e} />
      ))}

      <Btn label="Vardiya Raporu Oluştur" icon={FileText} onPress={createReport} loading={busy} />
    </>
  );
}

/** Oluşturulmuş vardiya raporları. */
function Arsiv() {
  const reports = useLive(() => api.listShiftReports(), ['shift_reports'], [] as ShiftReport[]);
  const [shift, setShift] = useState<Shift | 'all'>('all');
  const [team, setTeam] = useState<Department | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const shown = reports.data.filter((r) => (shift === 'all' || r.shift === shift) && (team === 'all' || r.team === team || r.team === 'Tümü'));

  return (
    <>
      <Text style={s.muted}>Oluşturulan vardiya raporlarını vardiya ve ekibe göre bulun.</Text>
      <ShiftPicker value={shift} onChange={setShift} allowAll />
      <Segmented
        options={[
          { value: 'all', label: 'Tüm ekipler' },
          { value: 'Operasyon', label: 'Operasyon' },
          { value: 'Teknik', label: 'Teknik' },
        ]}
        value={team}
        onChange={setTeam}
      />
      <ErrorText>{reports.error ?? error}</ErrorText>
      {shown.length === 0 && !reports.error && (
        <Card>
          <Text style={s.muted}>Henüz vardiya raporu yok.</Text>
        </Card>
      )}
      {shown.map((r) => (
        <Card key={r.id} style={{ gap: 10 }}>
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '800' }}>{reportTitle(r)}</Text>
          <Text style={s.muted}>
            {r.entry_count} kayıt · {formatDateLong(r.created_at)}
            {r.author_name ? ` · ${r.author_name}` : ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn label="Raporu aç" icon={FileText} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/vardiya-raporu/[id]', params: { id: r.id } })} />
            <Btn label="PDF" icon={FileDown} style={{ flex: 1 }} onPress={() => shareReportPdf(r).catch((e) => setError(e?.message ?? 'PDF oluşturulamadı.'))} />
          </View>
        </Card>
      ))}
    </>
  );
}
