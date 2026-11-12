import { CalendarDays, ClipboardCheck, Database, FileText, LucideIcon, MapPin, Plane, TriangleAlert } from 'lucide-react-native';
import { Href } from 'expo-router';
import { C } from './theme';

export type Module = {
  slug: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
  badge: 'Operasyon' | 'Veriler' | 'Teknik';
  href: Href;
};

export const OPERASYON: Module[] = [
  { slug: 'ucus', title: '✈️ Uçuş Trafiği FIDS', desc: 'Uçuş akışını ve bagaj yoğunluğunu takip edin.', icon: Plane, color: C.blue, iconBg: '#2f3350', badge: 'Operasyon', href: '/modul/ucus' },
  { slug: 'ariza', title: '🚨 Arıza Bildirimi', desc: 'Saha arızasını bildirin, kayıtları ve durumları izleyin.', icon: TriangleAlert, color: '#f5a524', iconBg: '#4a3516', badge: 'Operasyon', href: '/arizalar' },
  { slug: 'personel', title: '👷 Personel Takibi', desc: 'Ekiplerin bölge ve vardiya durumunu görün.', icon: MapPin, color: C.amber, iconBg: '#4a4220', badge: 'Operasyon', href: '/personel' },
  { slug: 'vardiya', title: '🕒 Vardiya Durumu', desc: 'Bugünkü aktif personeli ve vardiya notlarını açın.', icon: CalendarDays, color: '#fb7185', iconBg: '#4a2a30', badge: 'Operasyon', href: '/vardiya' },
  { slug: 'tutanak', title: '📝 Tutanaklar', desc: 'Olay tutanaklarını görüntüleyin veya yeni bildirim oluşturun.', icon: FileText, color: '#34d399', iconBg: '#1d4238', badge: 'Operasyon', href: '/tutanaklar' },
  { slug: 'operasyon-takip', title: '✅ Operasyon Takip', desc: 'Hat temizlikleri ve vardiya görevlerini ekleyin, işaretleyin.', icon: ClipboardCheck, color: '#22d3ee', iconBg: '#1c3f47', badge: 'Operasyon', href: '/operasyon-takip' },
  { slug: 'veriler', title: 'Veriler', desc: 'Günlük şirket verileri ileride bu alana eklenecek.', icon: Database, color: C.violet, iconBg: C.violetBg, badge: 'Veriler', href: '/modul/veriler' },
];

export const TEKNIK: Module[] = [];
