import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, LucideIcon, Moon, Sun } from 'lucide-react-native';

/** Pendik / Kurtköy (Sabiha Gökçen Havalimanı çevresi). */
const LAT = 40.9;
const LON = 29.31;
const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,is_day&timezone=Europe%2FIstanbul`;

export type Precip = 'yagmur' | 'kar' | null;
export type Weather = { temp: number; code: number; isDay: boolean; label: string; icon: LucideIcon; precip: Precip };

/** WMO hava kodunu simge, açıklama ve yağış türüne çevirir. */
function describe(code: number, isDay: boolean): Pick<Weather, 'label' | 'icon' | 'precip'> {
  if (code === 0) return { label: 'Açık', icon: isDay ? Sun : Moon, precip: null };
  if (code <= 2) return { label: 'Parçalı bulutlu', icon: isDay ? CloudSun : CloudMoon, precip: null };
  if (code === 3) return { label: 'Bulutlu', icon: Cloud, precip: null };
  if (code === 45 || code === 48) return { label: 'Sisli', icon: CloudFog, precip: null };
  if (code >= 51 && code <= 57) return { label: 'Çisenti', icon: CloudDrizzle, precip: 'yagmur' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Yağmurlu', icon: CloudRain, precip: 'yagmur' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Karlı', icon: CloudSnow, precip: 'kar' };
  if (code >= 95) return { label: 'Gök gürültülü sağanak', icon: CloudLightning, precip: 'yagmur' };
  return { label: 'Bulutlu', icon: Cloud, precip: null };
}

/** Anlık hava durumu (Open-Meteo; anahtar gerektirmez). */
export async function fetchWeather(): Promise<Weather> {
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Hava durumu alınamadı (${res.status})`);
  const cur = (await res.json())?.current;
  if (typeof cur?.temperature_2m !== 'number' || typeof cur?.weather_code !== 'number') throw new Error('Hava durumu yanıtı beklenen biçimde değil');
  const isDay = cur.is_day !== 0;
  return { temp: Math.round(cur.temperature_2m), code: cur.weather_code, isDay, ...describe(cur.weather_code, isDay) };
}

/** Yağışlı havada panoya düşecek otomatik bildiri metni. */
export const PRECIP_NOTICE: Record<Exclude<Precip, null>, { title: string; body: string }> = {
  yagmur: { title: 'Yağmurlu hava uyarısı', body: 'Kurtköy’de yağmur var. Mazgalları kontrol edin, otomat kontrolünü sağlayın.' },
  kar: { title: 'Karlı hava uyarısı', body: 'Kurtköy’de kar yağışı var. Mazgalları kontrol edin, otomat kontrolünü sağlayın.' },
};
