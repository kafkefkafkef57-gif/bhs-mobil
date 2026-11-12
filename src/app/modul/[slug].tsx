import { Stack, useLocalSearchParams } from 'expo-router';
import { OPERASYON, TEKNIK } from '../../lib/modules';
import { Placeholder } from '../../lib/Placeholder';

export default function Modul() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const title = [...OPERASYON, ...TEKNIK].find((m) => m.slug === slug)?.title ?? 'Bölüm';
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Placeholder title={title} note={slug === 'veriler' ? 'Günlük şirket verileri bu alana ileride eklenecek.' : undefined} />
    </>
  );
}
