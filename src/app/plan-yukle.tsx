import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api } from '../lib/api';
import { monthName } from '../lib/format';
import { parsePlan, Plan } from '../lib/planImport';
import { C } from '../lib/theme';
import { Btn, Card, ErrorText, s } from '../lib/ui';

/** Yönetici: aylık çalışma planı Excel'ini seçer, özetini görür ve yükler. */
export default function PlanYukle() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setError(null);
    setDone(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
      if (res.canceled) return;
      const asset = res.assets[0];
      const buffer = asset.file ? await asset.file.arrayBuffer() : await new File(asset.uri).arrayBuffer();
      setPlan(parsePlan(new Uint8Array(buffer)));
      setFileName(asset.name);
    } catch (e: any) {
      setPlan(null);
      setError(e?.message ?? 'Dosya okunamadı.');
    }
  };

  const upload = async () => {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      await api.importPlan(plan.rows);
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const counts = plan && { op: plan.rows.filter((r) => r.department === 'Operasyon').length, tk: plan.rows.filter((r) => r.department === 'Teknik').length };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.muted}>
        Her ay gönderilen çalışma planı Excel dosyasını (.xlsx) seçin. Sayfa adı “Kasım 2026” gibi ay ve yılı içermeli. Aynı ay tekrar yüklenirse plan güncellenir.
      </Text>
      <Btn label={plan ? 'Başka dosya seç' : 'Excel dosyası seç'} icon={FileSpreadsheet} onPress={pick} />
      <ErrorText>{error}</ErrorText>

      {plan && counts && (
        <Card style={{ gap: 10 }}>
          <Text style={s.h2}>
            {monthName(plan.month - 1)} {plan.year}
          </Text>
          <Text style={s.muted} numberOfLines={1}>
            {fileName}
          </Text>
          <Text style={{ color: C.text, fontSize: 16, lineHeight: 24 }}>
            {plan.rows.length} personel · {plan.days} gün{'\n'}
            {counts.op} Operasyon · {counts.tk} Teknik
          </Text>
          {plan.skipped.length > 0 && <Text style={s.muted}>Altında ekip bulunmadığı için alınmayan: {plan.skipped.join(', ')}</Text>}
          {done ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 color={C.green} size={20} />
              <Text style={{ color: C.green, fontSize: 16, fontWeight: '700' }}>Çalışma programı yüklendi.</Text>
            </View>
          ) : (
            <Btn label="Programı Yükle" icon={Upload} variant="primary" onPress={upload} loading={busy} />
          )}
        </Card>
      )}
    </ScrollView>
  );
}
