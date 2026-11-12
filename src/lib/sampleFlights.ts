/**
 * ÖRNEK uçuş verisi. Gerçek uçuş bilgi ekranı (FIDS) bağlantısı kurulana kadar
 * ekranın nasıl görüneceğini göstermek için günün saatlerine yayılmış uydurma uçuşlar üretir.
 */
export type Flight = {
  id: string;
  airline: string;
  code: string;
  city: string;
  direction: 'gelen' | 'giden';
  line: 'ic' | 'dis';
  time: Date;
  /** Gelen uçuşta bagaj bandı, giden uçuşta şut. */
  belt: string | null;
  status: 'Planlandı' | 'Bagaj Veriliyor' | 'Yükleniyor' | 'Tamamlandı';
};

const ROUTES: [string, string, string, 'ic' | 'dis'][] = [
  ['Pegasus', 'PC', 'Ankara Esenboğa', 'ic'],
  ['AJet', 'VF', 'İzmir Adnan Menderes', 'ic'],
  ['Pegasus', 'PC', 'Antalya', 'ic'],
  ['KLM', 'KL', 'Amsterdam Schiphol', 'dis'],
  ['AJet', 'VF', 'Trabzon', 'ic'],
  ['Pegasus', 'PC', 'Londra Stansted', 'dis'],
  ['Flynas', 'XY', 'Riyad', 'dis'],
  ['Pegasus', 'PC', 'Adana', 'ic'],
  ['AJet', 'VF', 'Bakü', 'dis'],
  ['Pegasus', 'PC', 'Berlin', 'dis'],
  ['AJet', 'VF', 'Gaziantep', 'ic'],
  ['Qatar Airways', 'QR', 'Doha', 'dis'],
];

export function sampleFlights(now = new Date()): Flight[] {
  const base = new Date(now);
  base.setMinutes(Math.floor(base.getMinutes() / 5) * 5, 0, 0);
  // Şu andan 2,5 saat öncesinden 5 saat sonrasına, 25 dakikada bir uçuş.
  return Array.from({ length: 19 }, (_, i) => {
    const [airline, prefix, city, line] = ROUTES[i % ROUTES.length];
    const direction = i % 2 === 1 ? 'giden' : 'gelen';
    const time = new Date(base.getTime() + (i * 25 - 150) * 60000);
    const mins = (time.getTime() - now.getTime()) / 60000;
    const n = 1 + ((i * 5) % 8);
    const belt = mins > 90 ? null : direction === 'gelen' ? `Carousel CAR${n}` : `Şut ${n + 10}`;
    const status = mins > 0 ? (direction === 'giden' && mins < 60 ? 'Yükleniyor' : 'Planlandı') : direction === 'gelen' && mins > -45 ? 'Bagaj Veriliyor' : 'Tamamlandı';
    return { id: String(i), airline, code: `${prefix}${2100 + i * 37}`, city, direction, line, time, belt, status };
  });
}
